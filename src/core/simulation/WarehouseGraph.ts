import { WarehouseNode, GridCoord, NavigationMode, TrafficDirection } from '../types';

export interface Edge {
  fromId: string;
  toId: string;
  weight: number;
}

export class Graph {
  private nodes: Map<string, WarehouseNode> = new Map();
  private adjacencyList: Map<string, Edge[]> = new Map();
  private coordToId: Map<string, string> = new Map();

  constructor() {}

  public static coordKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public addNode(node: WarehouseNode): void {
    this.nodes.set(node.id, node);
    this.coordToId.set(Graph.coordKey(node.x, node.y), node.id);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  public addEdge(fromId: string, toId: string, weight: number = 1.0): void {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return;

    const fromEdges = this.adjacencyList.get(fromId) || [];
    if (!fromEdges.some(e => e.toId === toId)) {
      fromEdges.push({ fromId, toId, weight });
      this.adjacencyList.set(fromId, fromEdges);
    }
  }

  public addBidirectionalEdge(id1: string, id2: string, weight: number = 1.0): void {
    this.addEdge(id1, id2, weight);
    this.addEdge(id2, id1, weight);
  }

  public getNode(nodeId: string): WarehouseNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getNodeByCoord(x: number, y: number): WarehouseNode | undefined {
    const id = this.coordToId.get(Graph.coordKey(x, y));
    if (!id) return undefined;
    return this.nodes.get(id);
  }

  public getNeighbors(
    nodeId: string,
    options?: {
      ignoreBlocked?: boolean;
      ignoreReserved?: boolean;
      reservedForRobotId?: string;
      goalCoord?: GridCoord;
      navigationMode?: NavigationMode;
      targetDockId?: string;
      allowOppositeLane?: boolean;
    }
  ): { node: WarehouseNode; weight: number }[] {
    const edges = this.adjacencyList.get(nodeId) || [];
    const results: { node: WarehouseNode; weight: number }[] = [];
    const mode = options?.navigationMode || 'NORMAL_TASK';
    const currentNode = this.nodes.get(nodeId);

    for (const edge of edges) {
      const neighbor = this.nodes.get(edge.toId);
      if (!neighbor) continue;

      if (mode === 'NORMAL_TASK') {
        const currentNode = this.nodes.get(nodeId);

        if (currentNode && (currentNode.isDockingZone || currentNode.y < 2)) {
          if (neighbor.y < currentNode.y) {
            continue;
          }
          if (currentNode.y === 0 && (neighbor.y !== 1 || neighbor.x !== currentNode.x)) {
            continue;
          }
          if (currentNode.y === 1 && (neighbor.y !== 2 || neighbor.x !== currentNode.x)) {
            continue;
          }
        } else {
          if (
            neighbor.isDockingZone ||
            neighbor.navigationType === 'DOCK' ||
            neighbor.navigationType === 'DOCK_APPROACH' ||
            neighbor.navigationType === 'RESTRICTED'
          ) {
            continue;
          }
        }

        if (neighbor.navigationType === 'WAITING') {
          const isGoal =
            options?.goalCoord &&
            neighbor.x === options.goalCoord.x &&
            neighbor.y === options.goalCoord.y;
          if (!isGoal) {
            continue;
          }
        }
      } else if (mode === 'CHARGING_TASK') {
        if (neighbor.navigationType === 'RESTRICTED') {
          continue;
        }
        if (neighbor.navigationType === 'DOCK') {
          const isTargetDock =
            (options?.targetDockId && neighbor.id === options.targetDockId) ||
            (options?.goalCoord && neighbor.x === options.goalCoord.x && neighbor.y === options.goalCoord.y);
          if (!isTargetDock) {
            continue;
          }
        }
      } else if (mode === 'LEAVING_DOCK') {
        if (neighbor.navigationType === 'RESTRICTED') {
          continue;
        }
        if (neighbor.navigationType === 'DOCK') {
          const isGoal =
            options?.goalCoord &&
            neighbor.x === options.goalCoord.x &&
            neighbor.y === options.goalCoord.y;
          if (!isGoal) {
            continue;
          }
        }
      }

      if (!options?.ignoreBlocked && neighbor.isBlocked) {
        continue;
      }

      if (
        !options?.ignoreReserved &&
        neighbor.reservedBy &&
        neighbor.reservedBy !== options?.reservedForRobotId
      ) {
        const isGoal =
          options?.goalCoord &&
          neighbor.x === options.goalCoord.x &&
          neighbor.y === options.goalCoord.y;
        if (!isGoal) {
          continue;
        }
      }

      let edgeWeight = edge.weight || 1.0;

      if (currentNode && neighbor) {
        const isGoal = options?.goalCoord && neighbor.x === options.goalCoord.x && neighbor.y === options.goalCoord.y;

        if (currentNode.isTwoWayCorridor && neighbor.isTwoWayCorridor) {
          const dx = neighbor.x - currentNode.x;
          const dy = neighbor.y - currentNode.y;
          let stepDir: TrafficDirection = 'ANY';
          if (dx > 0) stepDir = 'EAST';
          else if (dx < 0) stepDir = 'WEST';
          else if (dy > 0) stepDir = 'SOUTH';
          else if (dy < 0) stepDir = 'NORTH';

          if (
            neighbor.trafficDirection &&
            neighbor.trafficDirection !== 'ANY' &&
            neighbor.trafficDirection !== 'BIDIRECTIONAL'
          ) {
            if (stepDir !== 'ANY' && neighbor.trafficDirection !== stepDir && !isGoal) {
              if (options?.allowOppositeLane) {
                edgeWeight += 25.0;
              } else {
                edgeWeight += 80.0;
              }
            }
          }

          if (
            currentNode.corridorId &&
            neighbor.corridorId &&
            currentNode.corridorId === neighbor.corridorId &&
            currentNode.laneId !== neighbor.laneId &&
            !currentNode.isIntersection &&
            !neighbor.isIntersection &&
            !isGoal
          ) {
            edgeWeight += 12.0;
          }
        }
      }

      results.push({ node: neighbor, weight: edgeWeight });
    }

    return results;
  }

  public setBlocked(nodeId: string, blocked: boolean): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isBlocked = blocked;
    }
  }

  public setReserved(nodeId: string, robotId?: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.reservedBy = robotId;
    }
  }

  public getAllNodes(): WarehouseNode[] {
    return Array.from(this.nodes.values());
  }

  public getAdjacencyList(): Map<string, Edge[]> {
    return this.adjacencyList;
  }

  public getMetrics() {
    let edgeCount = 0;
    let blockedCount = 0;
    let reservedCount = 0;

    for (const [, edges] of this.adjacencyList) {
      edgeCount += edges.length;
    }

    for (const [, node] of this.nodes) {
      if (node.isBlocked) blockedCount++;
      if (node.reservedBy) reservedCount++;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      blockedCount,
      reservedCount,
    };
  }

  public clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.coordToId.clear();
  }
}
