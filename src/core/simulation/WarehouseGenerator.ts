import { Graph } from './WarehouseGraph';
import {
  WarehouseConfig,
  WarehouseNode,
  ChargingStation,
  PackingStation,
  DeliveryNode,
  WaitingNode,
  Product,
  NodeType,
  NavigationType,
  GridCoord,
} from '../types';

import { TrafficManager } from './TrafficManager';

export interface GeneratedWarehouse {
  graph: Graph;
  nodes: WarehouseNode[];
  chargingStations: ChargingStation[];
  packingStations: PackingStation[];
  deliveryNodes: DeliveryNode[];
  waitingNodes: WaitingNode[];
  pickupStations: { id: string; nodeId: string; coord: GridCoord; name: string }[];
  shelfNodes: WarehouseNode[];
  aisleNodes: WarehouseNode[];
  initialProducts: Product[];
  shelfIdToFacingAisle: Map<string, GridCoord>;
  trafficManager: TrafficManager;
}

export class WarehouseGenerator {
  /**
   * Procedurally generates a realistic warehouse layout with aisles, shelves,
   * charging bays, delivery nodes, and receiving docks.
   */
  public static generate(config: WarehouseConfig): GeneratedWarehouse {
    const graph = new Graph();
    const nodes: WarehouseNode[] = [];
    const chargingStations: ChargingStation[] = [];
    const packingStations: PackingStation[] = [];
    const deliveryNodes: DeliveryNode[] = [];
    const waitingNodes: WaitingNode[] = [];
    const pickupStations: { id: string; nodeId: string; coord: GridCoord; name: string }[] = [];
    const shelfNodes: WarehouseNode[] = [];
    const aisleNodes: WarehouseNode[] = [];
    const shelfIdToFacingAisle: Map<string, GridCoord> = new Map();

    const { width, length } = config;

    // First pass: generate all nodes with types
    let shelfCounter = 0;

    for (let y = 0; y < length; y++) {
      let bayIndexInRow = 1;
      for (let x = 0; x < width; x++) {
        const id = `node_${x}_${y}`;
        let type: NodeType = 'aisle';
        let isBlocked = false;
        let zone = 'General Aisle';
        let shelfId: string | undefined = undefined;
        let deliveryNodeId: string | undefined = undefined;
        let waitingNodeId: string | undefined = undefined;

        let navigationType: NavigationType = 'NORMAL';
        let isDockingZone = false;

        if (y === 0) {
          // Row 0: Restricted Integrated Docking Row (100% Docking Zone)
          // Integrated Docks spaced with at least ONE EMPTY LOGICAL NODE: [BUFFER][DOCK-01][BUFFER][DOCK-02][BUFFER]...
          const targetDockCount = Math.max(config.chargingStationCount || 4, config.robotCount || 6);
          const dockSlots = [4, 6, 8, 10, 12, 14, 16, 18];
          const isDockSlot = dockSlots.includes(x) && chargingStations.length < targetDockCount;

          if (isDockSlot) {
            type = 'charging';
            navigationType = 'DOCK';
            isDockingZone = true;
            const dockIdx = chargingStations.length + 1;
            const chId = `DOCK-${String(dockIdx).padStart(2, '0')}`;
            const assignedRobot = `R-${dockIdx}`;
            zone = `Home Dock ${chId} (${assignedRobot})`;
            chargingStations.push({
              id: chId,
              nodeId: id,
              coord: { x, y },
              isOccupied: false,
              assignedRobotId: assignedRobot,
              dockState: 'AVAILABLE',
              queue: [],
              isOperational: true,
              totalEnergyDelivered: 0,
            });
          } else {
            type = 'aisle';
            navigationType = 'RESTRICTED';
            isDockingZone = true;
            zone = 'Restricted Docking Buffer';
          }
        } else if (y === 1) {
          // Row 1: Dedicated Dock Approach & Staging Lane (for docks at x=4,6,8,10,12,14,16,18)
          const isDockApproach = (x >= 4 && x <= 18);
          if (isDockApproach) {
            type = 'aisle';
            navigationType = 'DOCK_APPROACH';
            isDockingZone = true;
            zone = 'Dock Approach Lane';
          } else {
            type = 'aisle';
            navigationType = 'NORMAL';
            zone = 'North Crossway Approach';
          }
        } else if (y === 2) {
          // Row 2: North Crossway (high-speed bi-directional transit)
          type = 'aisle';
          navigationType = 'NORMAL';
          zone = 'North Crossway';
        } else if (y === length - 1) {
          // Bottom Row: Delivery Docks (D-01..D-03), Inbound Docks, and Dispatch Staging (SOUTH edge)
          const isDeliverySlot = (x === 4 || x === 10 || x === 16) && deliveryNodes.length < config.deliveryNodeCount;
          const isPickupSlot = (x === 2 || x === 18) && pickupStations.length < 2;

          if (isDeliverySlot) {
            type = 'delivery';
            navigationType = 'NORMAL';
            const dId = `D-0${deliveryNodes.length + 1}`;
            deliveryNodeId = dId;
            zone = `Delivery Node ${dId}`;
            deliveryNodes.push({
              id: dId,
              name: `Delivery Node ${dId}`,
              coord: { x, y },
              capacity: 10,
              currentQueue: [],
              completedDeliveries: 0,
              status: 'operational',
            });
          } else if (isPickupSlot) {
            type = 'pickup';
            navigationType = 'NORMAL';
            zone = 'Receiving Dock';
            pickupStations.push({
              id: `IN-${pickupStations.length + 1}`,
              nodeId: id,
              coord: { x, y },
              name: `Inbound Dock ${pickupStations.length + 1}`,
            });
          } else {
            type = 'dispatch';
            navigationType = 'NORMAL';
            zone = 'Dispatch Staging Area';
          }
        } else if (y === length - 2) {
          // Row length - 2: South Crossway (high-speed bi-directional transit)
          type = 'aisle';
          navigationType = 'NORMAL';
          zone = 'South Crossway';
        } else {
          // Rows y = 3 to length - 3: Check outer WEST (x=0) and EAST (x=width-1) edges for dedicated WAITING BAYS
          const isOuterEdge = (x === 0 || x === width - 1);
          const isWaitingSlot = isOuterEdge && (y % 2 === 1) && waitingNodes.length < 16;

          if (isWaitingSlot) {
            type = 'waiting';
            navigationType = 'WAITING';
            const wId = `W-${String(waitingNodes.length + 1).padStart(2, '0')}`;
            waitingNodeId = wId;
            zone = `Waiting Bay ${wId} (${x === 0 ? 'West' : 'East'})`;
            waitingNodes.push({
              id: wId,
              name: `Waiting Bay ${wId}`,
              coord: { x, y },
              isOccupied: false,
            });
          } else if (isOuterEdge) {
            // Buffer empty logical node between waiting bays [W1][EMPTY][W2][EMPTY][W3]
            type = 'aisle';
            navigationType = 'NORMAL';
            zone = x === 0 ? 'Outer West Buffer Aisle' : 'Outer East Buffer Aisle';
          } else if (y === 3) {
            // Interior North Crossway row 3
            type = 'aisle';
            navigationType = 'NORMAL';
            zone = 'North Crossway';
          } else if (y === length - 3) {
            // Interior South Crossway row length - 3
            type = 'aisle';
            navigationType = 'NORMAL';
            zone = 'South Crossway';
          } else {
            // Middle Storage Rows (y = 4 to length - 4): Storage racks separated by TWO-CELL-WIDE AISLES
            const midX = Math.floor(width / 2);
            // 2-cell vertical thoroughfares: Left (x=1), Right (x=width-2), Center (x=midX-1,midX), Intermediates (x=5,14)
            const isCrossAisle =
              x === 1 ||
              x === width - 2 ||
              x === midX ||
              x === midX - 1 ||
              x === 5 ||
              x === 14;

            // 2 shelf rows followed by 2 aisle rows
            const relY = y - 4;
            const isShelfRow = relY % 4 === 0 || relY % 4 === 1;

            if (isShelfRow && !isCrossAisle) {
              type = 'shelf';
              navigationType = 'RESTRICTED';
              isBlocked = true; // Physical shelf structure (solid)

              // Letters A, B, C, E, F, G, H, J, K, L, M, N, P, R, S, T (skipping D to avoid confusion with Delivery Node D-01)
              const aisleLetters = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];
              const bankIndex = Math.floor(relY / 4);
              const rowInBank = relY % 4; // 0 or 1
              const shelfRowIndex = bankIndex * 2 + rowInBank;
              const letterIdx = shelfRowIndex % aisleLetters.length;
              const tierSuffix = Math.floor(shelfRowIndex / aisleLetters.length);
              const aisleLetter = tierSuffix > 0 ? `${aisleLetters[letterIdx]}${tierSuffix}` : aisleLetters[letterIdx];

              const bayNumber = String(bayIndexInRow++).padStart(2, '0');
              shelfId = `${aisleLetter}-${bayNumber}`;
              zone = `Shelf ${shelfId}`;
              shelfCounter++;
            } else {
              type = 'aisle';
              navigationType = 'NORMAL';
              zone = 'Storage Aisle';
            }
          }
        }

        const node: WarehouseNode = {
          id,
          x,
          y,
          type,
          isBlocked,
          zone,
          shelfId,
          deliveryNodeId,
          waitingNodeId,
          navigationType,
          isDockingZone,
          shelfInfo:
            type === 'shelf' && shelfId
              ? {
                  category: `Aisle-${shelfId.charAt(0)}`,
                  inventoryLevel: 20,
                  maxCapacity: 50,
                }
              : undefined,
        };

        nodes.push(node);
        graph.addNode(node);

        if (type === 'shelf') {
          shelfNodes.push(node);
        } else {
          aisleNodes.push(node);
        }
      }
    }

    // Ensure at least 3 Delivery Nodes exist
    if (deliveryNodes.length === 0) {
      const d1Node = nodes.find(n => n.y === length - 1 && n.x === 2);
      if (d1Node) {
        d1Node.type = 'delivery';
        d1Node.deliveryNodeId = 'D-01';
        deliveryNodes.push({
          id: 'D-01',
          name: 'Delivery Node D-01',
          coord: { x: d1Node.x, y: d1Node.y },
          capacity: 10,
          currentQueue: [],
          completedDeliveries: 0,
          status: 'operational',
        });
      }
    }

    // Second pass: connect grid edges
    // CRITICAL: Docking Row (y=0) has NO horizontal edges! Robots cannot travel sideways through the docking row!
    for (const node of nodes) {
      const neighbors = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      for (const { dx, dy } of neighbors) {
        // Disallow horizontal movement in Row 0 (Docking Row)
        if (node.y === 0 && dy === 0) {
          continue;
        }

        // Disallow horizontal movement across docking approach lane in Row 1 to keep access lanes dedicated
        if (node.y === 1 && dy === 0 && node.isDockingZone) {
          continue;
        }

        // WAITING BAYS: Dedicated parking stalls along WEST (x=0) and EAST (x=width-1).
        // Only connect horizontally to the adjacent aisle (x=1 or x=width-2).
        // Vertical edges into/out of waiting bays are disallowed to prevent through-traffic.
        if (node.navigationType === 'WAITING' && dy !== 0) {
          continue;
        }

        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < length) {
          const neighborNode = nodes.find(n => n.x === nx && n.y === ny);
          // Disallow entering row 0 horizontally from anywhere
          if (ny === 0 && dy === 0) {
            continue;
          }
          // Disallow entering waiting bays vertically from anywhere
          if (neighborNode?.navigationType === 'WAITING' && dy !== 0) {
            continue;
          }
          if (neighborNode) {
            graph.addEdge(node.id, neighborNode.id, 1.0);
          }
        }
      }
    }

    // Third pass: For each shelf, find its adjacent accessible aisle coordinate
    for (const shelf of shelfNodes) {
      if (!shelf.shelfId) continue;

      const relY = shelf.y - 4;
      const isTopShelf = relY >= 0 && relY % 4 === 0;

      // Candidate adjacent coordinates: Top shelf faces North, bottom shelf faces South
      const candidates = isTopShelf
        ? [
            { x: shelf.x, y: shelf.y - 1 },
            { x: shelf.x, y: shelf.y + 1 },
            { x: shelf.x + 1, y: shelf.y },
            { x: shelf.x - 1, y: shelf.y },
          ]
        : [
            { x: shelf.x, y: shelf.y + 1 },
            { x: shelf.x, y: shelf.y - 1 },
            { x: shelf.x + 1, y: shelf.y },
            { x: shelf.x - 1, y: shelf.y },
          ];

      for (const c of candidates) {
        if (c.x >= 0 && c.x < width && c.y >= 0 && c.y < length) {
          const n = graph.getNodeByCoord(c.x, c.y);
          if (n && !n.isBlocked) {
            shelfIdToFacingAisle.set(shelf.shelfId, { x: c.x, y: c.y });
            break;
          }
        }
      }
    }

    // Seed realistic initial inventory products
    const initialProducts: Product[] = [
      {
        id: 'PRD-001',
        name: 'Laptop',
        category: 'Electronics',
        quantity: 12,
        weightKg: 2.2,
        shelfId: 'A-03',
        shelfCoord: { x: 0, y: 0 }, // will be mapped
        status: 'in_stock',
        color: '#3b82f6',
      },
      {
        id: 'PRD-002',
        name: 'Mechanical Keyboard',
        category: 'Peripherals',
        quantity: 20,
        weightKg: 0.9,
        shelfId: 'B-02',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#a855f7',
      },
      {
        id: 'PRD-003',
        name: 'Ultra-Wide Monitor',
        category: 'Displays',
        quantity: 8,
        weightKg: 4.5,
        shelfId: 'A-01',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#00f0ff',
      },
      {
        id: 'PRD-004',
        name: 'Wireless Mouse',
        category: 'Peripherals',
        quantity: 25,
        weightKg: 0.2,
        shelfId: 'B-01',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#10b981',
      },
      {
        id: 'PRD-005',
        name: 'Li-ion Battery Cell',
        category: 'Power',
        quantity: 40,
        weightKg: 0.5,
        shelfId: 'A-02',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#f59e0b',
      },
      {
        id: 'PRD-006',
        name: 'AI Microprocessor',
        category: 'Semiconductors',
        quantity: 30,
        weightKg: 0.1,
        shelfId: 'B-03',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#ec4899',
      },
      {
        id: 'PRD-007',
        name: 'Hydraulic Pump',
        category: 'Mechanical',
        quantity: 6,
        weightKg: 5.0,
        shelfId: 'C-01',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#f97316',
      },
      {
        id: 'PRD-008',
        name: 'Fiber Optic Transceiver',
        category: 'Networking',
        quantity: 18,
        weightKg: 0.3,
        shelfId: 'C-02',
        shelfCoord: { x: 0, y: 0 },
        status: 'in_stock',
        color: '#6366f1',
      },
    ];

    // Map physical shelf coordinates to products
    for (const prod of initialProducts) {
      const shelfNode = shelfNodes.find(s => s.shelfId === prod.shelfId) || shelfNodes[0];
      if (shelfNode) {
        prod.shelfCoord = { x: shelfNode.x, y: shelfNode.y };
        if (shelfNode.shelfInfo) {
          shelfNode.shelfInfo.inventoryLevel = prod.quantity;
        }
      }
    }

    const trafficManager = new TrafficManager();
    trafficManager.initializeLanes(
      nodes,
      graph,
      config,
      shelfIdToFacingAisle,
      deliveryNodes.map(d => ({ id: d.id, coord: d.coord }))
    );

    return {
      graph,
      nodes,
      chargingStations,
      packingStations,
      deliveryNodes,
      waitingNodes,
      pickupStations,
      shelfNodes,
      aisleNodes,
      initialProducts,
      shelfIdToFacingAisle,
      trafficManager,
    };
  }
}
