import {
  GridCoord,
  WarehouseNode,
  TrafficDirection,
  Corridor,
  CorridorLane,
  QueueSlot,
  QueueSlotStatus,
  IntersectionZone,
  Robot,
  WarehouseConfig,
} from '../types';
import { Graph } from './WarehouseGraph';
import { CollisionAvoidance } from './CollisionAvoidance';

export class TrafficManager {
  private corridors: Map<string, Corridor> = new Map();
  private nodeToLane: Map<string, CorridorLane> = new Map();
  private intersections: Map<string, IntersectionZone> = new Map();
  private coordToIntersectionId: Map<string, string> = new Map();
  private resourceQueues: Map<string, QueueSlot[]> = new Map();
  private nodeCrossingRobots: Map<string, string> = new Map();

  constructor() {}

  public static coordKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Initializes and annotates all warehouse nodes with two-way traffic lanes,
   * directional flow, intersection boundaries, and safe queue slots.
   */
  public initializeLanes(
    nodes: WarehouseNode[],
    graph: Graph,
    config: WarehouseConfig,
    shelfFacingAisles: Map<string, GridCoord>,
    deliveryNodes: { id: string; coord: GridCoord }[]
  ): void {
    const { width, length } = config;
    const midX = Math.floor(width / 2);

    // 1. Identify Cross-Aisles (vertical corridors)
    // Vertical thoroughfares: Left (x=1,2), Center (x=midX-1, midX), Intermediate (x=5,6; x=13,14), Right (x=width-3, width-2)
    const verticalPairs: { xLeft: number; xRight: number; id: string; name: string }[] = [
      { xLeft: midX - 1, xRight: midX, id: 'CORR-V-CENTER', name: 'Central Vertical Thoroughfare' },
    ];

    if (width >= 20) {
      verticalPairs.push({ xLeft: 5, xRight: 6, id: 'CORR-V-WEST', name: 'West Intermediate Cross-Aisle' });
      verticalPairs.push({ xLeft: 13, xRight: 14, id: 'CORR-V-EAST', name: 'East Intermediate Cross-Aisle' });
    }

    // Outer transit thoroughfares
    verticalPairs.push({ xLeft: 1, xRight: 2, id: 'CORR-V-OUTER-WEST', name: 'Outer West Transit Aisle' });
    verticalPairs.push({ xLeft: width - 3, xRight: width - 2, id: 'CORR-V-OUTER-EAST', name: 'Outer East Transit Aisle' });

    // 2. Identify Horizontal Corridors
    // North Crossway: y=2 (Westbound), y=3 (Eastbound)
    // South Crossway: y=length-3 (Eastbound), y=length-2 (Westbound)
    const horizontalPairs: { yTop: number; yBottom: number; id: string; name: string; isCrossway: boolean }[] = [
      { yTop: 2, yBottom: 3, id: 'CORR-H-NORTH', name: 'North High-Speed Crossway', isCrossway: true },
      { yTop: length - 3, yBottom: length - 2, id: 'CORR-H-SOUTH', name: 'South High-Speed Crossway', isCrossway: true },
    ];

    // Storage Aisles between shelf rows
    for (let y = 4; y <= length - 4; y++) {
      const relY = y - 4;
      if (relY % 4 === 2) {
        // relY = 2 is y, relY = 3 is y+1
        const bankIdx = Math.floor(relY / 4) + 1;
        horizontalPairs.push({
          yTop: y,
          yBottom: y + 1,
          id: `CORR-H-AISLE-${bankIdx}`,
          name: `Storage Aisle Bank ${bankIdx}`,
          isCrossway: false,
        });
      }
    }

    // 3. Register Horizontal Corridors & Lanes
    for (const h of horizontalPairs) {
      const laneA: CorridorLane = {
        laneId: `${h.id}-LANE-WEST`,
        corridorId: h.id,
        direction: 'WEST', // Top lane travels West (Left <- Right)
        coords: [],
        adjacentLaneId: `${h.id}-LANE-EAST`,
      };
      const laneB: CorridorLane = {
        laneId: `${h.id}-LANE-EAST`,
        corridorId: h.id,
        direction: 'EAST', // Bottom lane travels East (Left -> Right)
        coords: [],
        adjacentLaneId: `${h.id}-LANE-WEST`,
      };

      for (let x = 0; x < width; x++) {
        const topNode = graph.getNodeByCoord(x, h.yTop);
        const bottomNode = graph.getNodeByCoord(x, h.yBottom);

        if (topNode && topNode.type !== 'shelf' && !topNode.isBlocked && topNode.navigationType !== 'WAITING') {
          topNode.corridorId = h.id;
          topNode.laneId = laneA.laneId;
          topNode.trafficDirection = 'WEST';
          topNode.isTwoWayCorridor = true;
          topNode.oppositeLaneCoord = { x, y: h.yBottom };
          laneA.coords.push({ x, y: h.yTop });
          this.nodeToLane.set(topNode.id, laneA);
        }

        if (bottomNode && bottomNode.type !== 'shelf' && !bottomNode.isBlocked && bottomNode.navigationType !== 'WAITING') {
          bottomNode.corridorId = h.id;
          bottomNode.laneId = laneB.laneId;
          bottomNode.trafficDirection = 'EAST';
          bottomNode.isTwoWayCorridor = true;
          bottomNode.oppositeLaneCoord = { x, y: h.yTop };
          laneB.coords.push({ x, y: h.yBottom });
          this.nodeToLane.set(bottomNode.id, laneB);
        }
      }

      this.corridors.set(h.id, {
        corridorId: h.id,
        name: h.name,
        type: h.isCrossway ? 'horizontal' : 'storage_aisle',
        laneA,
        laneB,
        directionA: 'WEST',
        directionB: 'EAST',
        entryNodes: [{ x: width - 1, y: h.yTop }, { x: 0, y: h.yBottom }],
        exitNodes: [{ x: 0, y: h.yTop }, { x: width - 1, y: h.yBottom }],
        intersectionNodes: [],
      });
    }

    // 4. Register Vertical Corridors & Lanes
    for (const v of verticalPairs) {
      const laneA: CorridorLane = {
        laneId: `${v.id}-LANE-SOUTH`,
        corridorId: v.id,
        direction: 'SOUTH', // Left lane travels South (Top -> Bottom)
        coords: [],
        adjacentLaneId: `${v.id}-LANE-NORTH`,
      };
      const laneB: CorridorLane = {
        laneId: `${v.id}-LANE-NORTH`,
        corridorId: v.id,
        direction: 'NORTH', // Right lane travels North (Bottom -> Top)
        coords: [],
        adjacentLaneId: `${v.id}-LANE-SOUTH`,
      };

      for (let y = 1; y < length - 1; y++) {
        const leftNode = graph.getNodeByCoord(v.xLeft, y);
        const rightNode = graph.getNodeByCoord(v.xRight, y);

        // Check if this cell is an intersection with a horizontal corridor
        const isHIntersection = horizontalPairs.some(h => y === h.yTop || y === h.yBottom);

        if (leftNode && leftNode.type !== 'shelf' && !leftNode.isBlocked && leftNode.navigationType !== 'WAITING') {
          if (!isHIntersection) {
            leftNode.corridorId = v.id;
            leftNode.laneId = laneA.laneId;
            leftNode.trafficDirection = 'SOUTH';
            leftNode.isTwoWayCorridor = true;
            leftNode.oppositeLaneCoord = { x: v.xRight, y };
            laneA.coords.push({ x: v.xLeft, y });
            this.nodeToLane.set(leftNode.id, laneA);
          }
        }

        if (rightNode && rightNode.type !== 'shelf' && !rightNode.isBlocked && rightNode.navigationType !== 'WAITING') {
          if (!isHIntersection) {
            rightNode.corridorId = v.id;
            rightNode.laneId = laneB.laneId;
            rightNode.trafficDirection = 'NORTH';
            rightNode.isTwoWayCorridor = true;
            rightNode.oppositeLaneCoord = { x: v.xLeft, y };
            laneB.coords.push({ x: v.xRight, y });
            this.nodeToLane.set(rightNode.id, laneB);
          }
        }
      }

      this.corridors.set(v.id, {
        corridorId: v.id,
        name: v.name,
        type: 'vertical',
        laneA,
        laneB,
        directionA: 'SOUTH',
        directionB: 'NORTH',
        entryNodes: [{ x: v.xLeft, y: 1 }, { x: v.xRight, y: length - 2 }],
        exitNodes: [{ x: v.xLeft, y: length - 2 }, { x: v.xRight, y: 1 }],
        intersectionNodes: [],
      });
    }

    // 5. Intersections: mark 2x2 grid junction zones where corridors cross
    let intCounter = 1;
    for (const h of horizontalPairs) {
      for (const v of verticalPairs) {
        const intId = `INT-${String(intCounter++).padStart(2, '0')}`;
        const intCoords: GridCoord[] = [
          { x: v.xLeft, y: h.yTop },
          { x: v.xRight, y: h.yTop },
          { x: v.xLeft, y: h.yBottom },
          { x: v.xRight, y: h.yBottom },
        ];

        for (const coord of intCoords) {
          const n = graph.getNodeByCoord(coord.x, coord.y);
          if (n && n.type !== 'shelf' && !n.isBlocked) {
            n.isIntersection = true;
            n.trafficDirection = 'BIDIRECTIONAL'; // multi-directional turning allowed
            const key = TrafficManager.coordKey(coord.x, coord.y);
            this.coordToIntersectionId.set(key, intId);
          }
        }

        this.intersections.set(intId, {
          intersectionId: intId,
          coords: intCoords,
          crossingRobotIds: [],
          waitingQueue: [],
        });
      }
    }

    // 6. Precompute Structured Queue Slots for Shared Resources (Shelves & Delivery Nodes)
    this.initializeQueueSlots(graph, shelfFacingAisles, deliveryNodes, width, length);
  }

  /**
   * Precomputes structured, non-overlapping queue slots for all shelves and delivery nodes.
   */
  private initializeQueueSlots(
    graph: Graph,
    shelfFacingAisles: Map<string, GridCoord>,
    deliveryNodes: { id: string; coord: GridCoord }[],
    width: number,
    length: number
  ): void {
    // 1. Shelf Queue Slots
    for (const [shelfId, facingAisle] of shelfFacingAisles.entries()) {
      const slots: QueueSlot[] = [];

      // Slot 0: Interaction Cell (the picking spot facing the shelf)
      slots.push({
        queueId: `Q-${shelfId}`,
        resourceId: shelfId,
        slotIndex: 0,
        coord: { ...facingAisle },
        status: 'AVAILABLE',
      });

      // Find staging / queue slots extending along the approach lane or perpendicular corridor
      const facingNode = graph.getNodeByCoord(facingAisle.x, facingAisle.y);
      const approachDir = facingNode?.trafficDirection || 'EAST';

      // Queue slots line up against the flow of the approach lane (so waiting robots queue behind the interaction cell)
      const queueDeltas = approachDir === 'EAST'
        ? [{ dx: -1, dy: 0 }, { dx: -2, dy: 0 }, { dx: -3, dy: 0 }]
        : [{ dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 3, dy: 0 }];

      let slotIdx = 1;
      for (const d of queueDeltas) {
        const qx = facingAisle.x + d.dx;
        const qy = facingAisle.y + d.dy;
        if (qx >= 1 && qx < width - 1 && qy >= 2 && qy < length - 2) {
          const n = graph.getNodeByCoord(qx, qy);
          if (n && n.type === 'aisle' && !n.isBlocked) {
            n.isStagingNode = true;
            slots.push({
              queueId: `Q-${shelfId}`,
              resourceId: shelfId,
              slotIndex: slotIdx++,
              coord: { x: qx, y: qy },
              status: 'AVAILABLE',
            });
          }
        }
      }

      this.resourceQueues.set(shelfId, slots);
    }

    // 2. Delivery Node Queue Slots
    for (const del of deliveryNodes) {
      const slots: QueueSlot[] = [];

      // Slot 0: Delivery interaction cell (at length - 1)
      slots.push({
        queueId: `Q-${del.id}`,
        resourceId: del.id,
        slotIndex: 0,
        coord: { ...del.coord },
        status: 'AVAILABLE',
      });

      // Queue slots line up North into South Crossway approach (y = length - 2, length - 3, etc.)
      const delQueueY = [del.coord.y - 1, del.coord.y - 2, del.coord.y - 3];
      let slotIdx = 1;
      for (const qy of delQueueY) {
        if (qy >= 2) {
          const n = graph.getNodeByCoord(del.coord.x, qy);
          if (n && !n.isBlocked && n.type !== 'shelf') {
            n.isStagingNode = true;
            slots.push({
              queueId: `Q-${del.id}`,
              resourceId: del.id,
              slotIndex: slotIdx++,
              coord: { x: del.coord.x, y: qy },
              status: 'AVAILABLE',
            });
          }
        }
      }

      this.resourceQueues.set(del.id, slots);
    }
  }

  // ==========================================
  // STRUCTURED QUEUING FOR SHARED RESOURCES
  // ==========================================

  /**
   * Requests an organized queue slot for a shared resource (shelf or delivery node).
   * Guarantees distinct queue slots; no two robots will target the same staging cell.
   */
  public requestQueueSlot(
    resourceId: string,
    robotId: string,
    effectivePriority: number = 0
  ): {
    slotIndex: number;
    coord: GridCoord;
    isFrontOfQueue: boolean;
    displayStatus: string;
    totalSlots: number;
  } | null {
    const slots = this.resourceQueues.get(resourceId);
    if (!slots || slots.length === 0) return null;

    // Check if robot already holds a slot in this queue
    const existing = slots.find(s => s.assignedRobotId === robotId);
    if (existing) {
      const isFront = existing.slotIndex === 0;
      return {
        slotIndex: existing.slotIndex,
        coord: existing.coord,
        isFrontOfQueue: isFront,
        displayStatus: isFront
          ? 'FRONT OF QUEUE'
          : `WAITING IN QUEUE (POS ${existing.slotIndex} OF ${slots.length - 1})`,
        totalSlots: slots.length,
      };
    }

    // Find first unoccupied and unassigned slot (starting from slot 0 for direct access)
    let assignedSlot: QueueSlot | undefined = undefined;

    // Check Slot 0 (Interaction cell)
    if (slots[0].status === 'AVAILABLE') {
      assignedSlot = slots[0];
      assignedSlot.status = 'RESERVED';
      assignedSlot.assignedRobotId = robotId;
      return {
        slotIndex: 0,
        coord: assignedSlot.coord,
        isFrontOfQueue: true,
        displayStatus: 'FRONT OF QUEUE',
        totalSlots: slots.length,
      };
    }

    // Resource is busy; assign next sequential staging slot (Slot 1, Slot 2, ...)
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].status === 'AVAILABLE') {
        assignedSlot = slots[i];
        assignedSlot.status = 'RESERVED';
        assignedSlot.assignedRobotId = robotId;
        return {
          slotIndex: i,
          coord: assignedSlot.coord,
          isFrontOfQueue: false,
          displayStatus: `WAITING IN QUEUE (POS ${i} OF ${slots.length - 1})`,
          totalSlots: slots.length,
        };
      }
    }

    // All predefined queue slots full: fallback to the last slot
    return null;
  }

  /**
   * Advances the queue when a robot completes access and vacates the resource.
   */
  public advanceQueue(resourceId: string, vacatingRobotId: string): {
    nextRobotId?: string;
    nextSlotIndex?: number;
    promotions?: { robotId: string; newSlotIndex: number; newCoord: GridCoord }[];
  } {
    const slots = this.resourceQueues.get(resourceId);
    if (!slots || slots.length === 0) return {};

    // Release slot held by vacating robot
    for (const slot of slots) {
      if (slot.assignedRobotId === vacatingRobotId) {
        slot.assignedRobotId = undefined;
        slot.status = 'AVAILABLE';
      }
    }

    const promotions: { robotId: string; newSlotIndex: number; newCoord: GridCoord }[] = [];

    // Collect all waiting robots from staging slots in order
    const waitingRobots: string[] = [];
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].assignedRobotId) {
        waitingRobots.push(slots[i].assignedRobotId!);
        slots[i].assignedRobotId = undefined;
        slots[i].status = 'AVAILABLE';
      }
    }

    // If Slot 0 is free and there are waiting robots, promote front robot to Slot 0!
    if (slots[0].status === 'AVAILABLE' && waitingRobots.length > 0) {
      const nextRobotId = waitingRobots.shift()!;
      slots[0].assignedRobotId = nextRobotId;
      slots[0].status = 'RESERVED';
      promotions.push({ robotId: nextRobotId, newSlotIndex: 0, newCoord: slots[0].coord });

      // Compact remaining waiting robots forward into Slot 1, Slot 2, ...
      for (let i = 0; i < waitingRobots.length; i++) {
        const slotIdx = i + 1;
        if (slotIdx < slots.length) {
          const rId = waitingRobots[i];
          slots[slotIdx].assignedRobotId = rId;
          slots[slotIdx].status = 'RESERVED';
          promotions.push({ robotId: rId, newSlotIndex: slotIdx, newCoord: slots[slotIdx].coord });
        }
      }

      return { nextRobotId, nextSlotIndex: 0, promotions };
    }

    return {};
  }

  /**
   * Releases any queue slot reserved or held by a robot.
   */
  public releaseQueueSlot(resourceId: string, robotId: string): void {
    const slots = this.resourceQueues.get(resourceId);
    if (!slots) return;

    for (const slot of slots) {
      if (slot.assignedRobotId === robotId) {
        slot.assignedRobotId = undefined;
        slot.status = 'AVAILABLE';
      }
    }
  }

  // ==========================================
  // CONTROLLED INTERSECTION MANAGEMENT
  // ==========================================

  public getIntersectionId(x: number, y: number): string | undefined {
    return this.coordToIntersectionId.get(TrafficManager.coordKey(x, y));
  }

  public getIntersectionZone(intId: string): IntersectionZone | undefined {
    return this.intersections.get(intId);
  }

  /**
   * Evaluates whether a robot can safely enter an intersection cell.
   * Guarantees that a robot only enters if:
   * 1. The specific intersection cell is NOT occupied or reserved by another robot.
   * 2. The EXIT node from the intersection is free of physical obstruction (prevents stopping in the center!).
   * Does NOT lock unrelated cells in the 2x2 junction, allowing parallel non-conflicting crossings.
   */
  public requestIntersectionEntry(
    robot: Robot,
    intersectionNode: GridCoord,
    exitNode: GridCoord,
    collisionAvoidance: CollisionAvoidance,
    simulationTime: number
  ): {
    canEnter: boolean;
    reason?: string;
  } {
    const key = TrafficManager.coordKey(intersectionNode.x, intersectionNode.y);
    const intId = this.coordToIntersectionId.get(key);
    if (!intId) {
      // Not a formal intersection zone, proceed
      return { canEnter: true };
    }

    const zone = this.intersections.get(intId);

    // 1. Is the target intersection node held by another crossing robot?
    const crossingRobot = this.nodeCrossingRobots.get(key);
    if (crossingRobot && crossingRobot !== robot.id) {
      return {
        canEnter: false,
        reason: `WAITING FOR INTERSECTION CLEARANCE — (${intersectionNode.x}, ${intersectionNode.y}) RESERVED BY ${crossingRobot}`,
      };
    }

    // 2. Is the target intersection node physically occupied by another robot?
    const occupant = collisionAvoidance.getOccupant(intersectionNode.x, intersectionNode.y);
    if (occupant && occupant !== robot.id) {
      return {
        canEnter: false,
        reason: `WAITING FOR INTERSECTION CLEARANCE — (${intersectionNode.x}, ${intersectionNode.y}) OCCUPIED BY ${occupant}`,
      };
    }

    // 3. Is the target intersection node reserved by another robot?
    const res = collisionAvoidance.getReservation(intersectionNode.x, intersectionNode.y);
    if (res && res.owner !== robot.id) {
      return {
        canEnter: false,
        reason: `WAITING FOR INTERSECTION CLEARANCE — (${intersectionNode.x}, ${intersectionNode.y}) RESERVED BY ${res.owner}`,
      };
    }

    // 4. CRITICAL: Is the EXIT node from the intersection physically clear?
    // A robot must NEVER enter an intersection unless it can completely clear it!
    const exitOccupant = collisionAvoidance.getOccupant(exitNode.x, exitNode.y);
    if (exitOccupant && exitOccupant !== robot.id) {
      return {
        canEnter: false,
        reason: `WAITING FOR INTERSECTION CLEARANCE — EXIT (${exitNode.x}, ${exitNode.y}) BLOCKED BY ${exitOccupant}`,
      };
    }

    this.nodeCrossingRobots.set(key, robot.id);
    if (zone && !zone.crossingRobotIds.includes(robot.id)) {
      zone.crossingRobotIds.push(robot.id);
    }

    return { canEnter: true };
  }

  /**
   * Releases intersection reservation once robot exits the zone.
   */
  public releaseIntersection(robotId: string): void {
    for (const [key, id] of this.nodeCrossingRobots.entries()) {
      if (id === robotId) {
        this.nodeCrossingRobots.delete(key);
      }
    }
    for (const zone of this.intersections.values()) {
      if (zone.reservedByRobotId === robotId) {
        zone.reservedByRobotId = undefined;
        zone.reservationExpiry = undefined;
      }
      zone.crossingRobotIds = zone.crossingRobotIds.filter(id => id !== robotId);
    }
  }

  // ==========================================
  // TEMPORARY OPPOSITE-LANE OVERTAKING (SECTION 16)
  // ==========================================

  /**
   * Evaluates whether a robot can temporarily use the opposite lane to bypass a blockage.
   * State flow:
   * NORMAL_LANE -> OWN_LANE_BLOCKED -> CHECK_OPPOSITE_LANE -> RESERVE_OPPOSITE_LANE -> TEMPORARY_OPPOSITE_LANE
   */
  public evaluateOppositeLaneOvertake(
    robot: Robot,
    blockedTarget: GridCoord,
    collisionAvoidance: CollisionAvoidance,
    graph: Graph,
    allRobots: Robot[]
  ): {
    canOvertake: boolean;
    oppositeCoord?: GridCoord;
    returnCoord?: GridCoord;
    reason?: string;
  } {
    const currentNode = graph.getNodeByCoord(robot.gridPosition.x, robot.gridPosition.y);
    if (!currentNode || !currentNode.oppositeLaneCoord || !currentNode.isTwoWayCorridor) {
      return { canOvertake: false, reason: 'Current corridor does not support two-way opposite-lane overtaking.' };
    }

    const oppCoord = currentNode.oppositeLaneCoord;
    const oppKey = TrafficManager.coordKey(oppCoord.x, oppCoord.y);

    // 1. Check if the adjacent opposite-lane node is physically occupied
    if (collisionAvoidance.isOccupied(oppCoord.x, oppCoord.y)) {
      return { canOvertake: false, reason: 'Opposite lane node is currently occupied.' };
    }

    // 2. Check if opposite-lane node is reserved
    const oppRes = collisionAvoidance.getReservation(oppCoord.x, oppCoord.y);
    if (oppRes && oppRes.owner !== robot.id) {
      return { canOvertake: false, reason: 'Opposite lane node is reserved by another robot.' };
    }

    // 3. Check for oncoming traffic in the opposite lane!
    // Must NOT enter opposite lane if oncoming traffic is approaching within 4 nodes!
    const oppNode = graph.getNodeByCoord(oppCoord.x, oppCoord.y);
    const oppDirection = oppNode?.trafficDirection;

    for (const other of allRobots) {
      if (other.id === robot.id) continue;
      // Is other robot in the opposite lane?
      const otherNode = graph.getNodeByCoord(other.gridPosition.x, other.gridPosition.y);
      if (otherNode?.laneId === oppNode?.laneId) {
        const dist = Math.abs(other.gridPosition.x - oppCoord.x) + Math.abs(other.gridPosition.y - oppCoord.y);
        if (dist <= 4) {
          // Check if moving towards us
          return { canOvertake: false, reason: `Oncoming robot ${other.name} detected in opposite lane (${dist} units away).` };
        }
      }
    }

    // 4. Find safe return merge coordinate back into original lane (past the blockage)
    // If blocked target was (x+1, y), return node would be (x+2, y)
    const dx = blockedTarget.x - robot.gridPosition.x;
    const dy = blockedTarget.y - robot.gridPosition.y;
    const returnCoord: GridCoord = {
      x: blockedTarget.x + dx,
      y: blockedTarget.y + dy,
    };

    const returnNode = graph.getNodeByCoord(returnCoord.x, returnCoord.y);
    if (!returnNode || returnNode.isBlocked || returnNode.type === 'shelf') {
      // Try adjacent crossway/intersection as return point
      return { canOvertake: true, oppositeCoord: oppCoord };
    }

    return {
      canOvertake: true,
      oppositeCoord: oppCoord,
      returnCoord,
      reason: `Opposite lane clear. Controlled bypass initiated past (${blockedTarget.x}, ${blockedTarget.y}).`,
    };
  }

  // ==========================================
  // GETTERS & UTILITIES
  // ==========================================

  public getCorridor(corridorId: string): Corridor | undefined {
    return this.corridors.get(corridorId);
  }

  public getAllCorridors(): Corridor[] {
    return Array.from(this.corridors.values());
  }

  public getIntersection(intersectionId: string): IntersectionZone | undefined {
    return this.intersections.get(intersectionId);
  }

  public getAllIntersections(): IntersectionZone[] {
    return Array.from(this.intersections.values());
  }

  public getQueueSlots(resourceId: string): QueueSlot[] {
    return this.resourceQueues.get(resourceId) || [];
  }

  public reset(): void {
    for (const zone of this.intersections.values()) {
      zone.reservedByRobotId = undefined;
      zone.reservationExpiry = undefined;
      zone.crossingRobotIds = [];
      zone.waitingQueue = [];
    }
    for (const slots of this.resourceQueues.values()) {
      for (const slot of slots) {
        slot.assignedRobotId = undefined;
        slot.reservedUntil = undefined;
        slot.status = 'AVAILABLE';
      }
    }
  }
}
