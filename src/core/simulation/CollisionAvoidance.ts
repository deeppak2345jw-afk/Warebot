import { Robot, GridCoord, NodeReservation } from '../types';
import { Graph } from './WarehouseGraph';

export interface CongestionData {
  level: 'Low' | 'Medium' | 'High';
  percentage: number;
  hotspots: GridCoord[];
  reservedCount: number;
}

export class CollisionAvoidance {
  private reservations: Map<string, NodeReservation> = new Map();
  private occupiedNodes: Map<string, string> = new Map();
  private nodeVisits: Map<string, number> = new Map();

  public static coordKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public updatePositions(robots: Robot[]): void {
    this.occupiedNodes.clear();
    for (const r of robots) {
      const key = CollisionAvoidance.coordKey(r.gridPosition.x, r.gridPosition.y);
      this.occupiedNodes.set(key, r.id);

      const visits = this.nodeVisits.get(key) || 0;
      this.nodeVisits.set(key, visits + 1);
    }
  }

  public updateReservations(robots: Robot[], graph: Graph, currentTime: number = 0): void {
    this.reservations.clear();

    for (const node of graph.getAllNodes()) {
      node.reservedBy = undefined;
    }

    const sortedRobots = [...robots].sort((a, b) => {
      const stateWeight = (r: Robot) =>
        r.cargoCount > 0 || r.state === 'moving_to_delivery' ? 2 : r.state === 'moving_to_pickup' ? 1 : 0;
      return stateWeight(b) - stateWeight(a);
    });

    for (const robot of sortedRobots) {
      const currCoord: GridCoord = { x: robot.gridPosition.x, y: robot.gridPosition.y };
      const currentKey = CollisionAvoidance.coordKey(currCoord.x, currCoord.y);

      if (robot.state === 'breakdown' || robot.state === 'maintenance') {
        const res: NodeReservation = {
          owner: robot.id,
          node: currCoord,
          createdAt: currentTime,
          ttl: 60.0,
          expectedRelease: currentTime + 60.0,
          purpose: 'current_position',
        };
        this.reservations.set(currentKey, res);
        const node = graph.getNodeByCoord(currCoord.x, currCoord.y);
        if (node) node.reservedBy = robot.id;
        continue;
      }

      const currentRes: NodeReservation = {
        owner: robot.id,
        node: currCoord,
        createdAt: currentTime,
        ttl: 2.0,
        expectedRelease: currentTime + 2.0,
        purpose: 'current_position',
      };
      this.reservations.set(currentKey, currentRes);
      const currNode = graph.getNodeByCoord(currCoord.x, currCoord.y);
      if (currNode) currNode.reservedBy = robot.id;

      const isHolding =
        robot.state === 'yielding' ||
        robot.state === 'waiting' ||
        robot.state === 'waiting_for_charger' ||
        robot.state === 'waiting_for_path' ||
        robot.waitingReason === 'WAITING_FOR_INTERSECTION' ||
        Boolean(robot.blockedReason && robot.blockedReason.startsWith('Holding before intersection')) ||
        Boolean(robot.blockedReason && robot.blockedReason.startsWith('Waiting at intersection')) ||
        Boolean(robot.blockedReason && robot.blockedReason.startsWith('WAITING FOR INTERSECTION')) ||
        Boolean(robot.blockedReason && robot.blockedReason.startsWith('Staging at entrance'));

      if (!isHolding && robot.currentRoute && robot.currentRoute.length > robot.currentRouteIndex) {
        const nextStep = robot.currentRoute[robot.currentRouteIndex];
        if (nextStep) {
          const nextKey = CollisionAvoidance.coordKey(nextStep.x, nextStep.y);
          if (!this.reservations.has(nextKey)) {
            const nextRes: NodeReservation = {
              owner: robot.id,
              node: { x: nextStep.x, y: nextStep.y },
              createdAt: currentTime,
              ttl: 2.0,
              expectedRelease: currentTime + 2.0,
              purpose: 'next_step',
            };
            this.reservations.set(nextKey, nextRes);
            const nextNode = graph.getNodeByCoord(nextStep.x, nextStep.y);
            if (nextNode && !nextNode.reservedBy) nextNode.reservedBy = robot.id;
          }
        }
      }
    }
  }

  public isConflict(x: number, y: number, queryingRobotId: string): boolean {
    const key = CollisionAvoidance.coordKey(x, y);

    const occupant = this.occupiedNodes.get(key);
    if (occupant && occupant !== queryingRobotId) {
      return true;
    }

    const res = this.reservations.get(key);
    if (res && res.owner !== queryingRobotId) {
      return true;
    }

    return false;
  }

  public getConflictInfo(
    x: number,
    y: number,
    queryingRobotId: string
  ): {
    isConflict: boolean;
    conflictingRobotId?: string;
    isOccupant: boolean;
    isReservation: boolean;
    reservation?: NodeReservation;
  } {
    const key = CollisionAvoidance.coordKey(x, y);

    const occupant = this.occupiedNodes.get(key);
    if (occupant && occupant !== queryingRobotId) {
      return { isConflict: true, conflictingRobotId: occupant, isOccupant: true, isReservation: false };
    }

    const res = this.reservations.get(key);
    if (res && res.owner !== queryingRobotId) {
      return { isConflict: true, conflictingRobotId: res.owner, isOccupant: false, isReservation: true, reservation: res };
    }

    return { isConflict: false, isOccupant: false, isReservation: false };
  }

  public isOccupied(x: number, y: number): boolean {
    return this.occupiedNodes.has(CollisionAvoidance.coordKey(x, y));
  }

  public getOccupant(x: number, y: number): string | undefined {
    return this.occupiedNodes.get(CollisionAvoidance.coordKey(x, y));
  }

  public getReservation(x: number, y: number): NodeReservation | undefined {
    return this.reservations.get(CollisionAvoidance.coordKey(x, y));
  }

  public getReserver(x: number, y: number): string | undefined {
    return this.reservations.get(CollisionAvoidance.coordKey(x, y))?.owner;
  }

  public releaseNode(x: number, y: number, robotId: string, graph?: Graph): void {
    const key = CollisionAvoidance.coordKey(x, y);
    const res = this.reservations.get(key);
    if (res && res.owner === robotId) {
      this.reservations.delete(key);
      if (graph) {
        const node = graph.getNodeByCoord(x, y);
        if (node && node.reservedBy === robotId) {
          node.reservedBy = undefined;
        }
      }
    }
  }

  public clearRobotReservation(robotId: string, graph?: Graph): void {
    for (const [key, res] of this.reservations.entries()) {
      if (res.owner === robotId) {
        this.reservations.delete(key);
        if (graph) {
          const [x, y] = key.split(',').map(Number);
          const node = graph.getNodeByCoord(x, y);
          if (node && node.reservedBy === robotId) {
            node.reservedBy = undefined;
          }
        }
      }
    }
  }

  public clearReservationAt(x: number, y: number, graph?: Graph): void {
    const key = CollisionAvoidance.coordKey(x, y);
    this.reservations.delete(key);
    if (graph) {
      const node = graph.getNodeByCoord(x, y);
      if (node) {
        node.reservedBy = undefined;
      }
    }
  }

  public reserveNode(x: number, y: number, robotId: string, graph?: Graph): void {
    const key = CollisionAvoidance.coordKey(x, y);
    this.reservations.set(key, {
      owner: robotId,
      node: { x, y },
      createdAt: Date.now(),
      ttl: 2.0,
      expectedRelease: Date.now() + 2.0,
      purpose: 'next_step',
    });
    if (graph) {
      const node = graph.getNodeByCoord(x, y);
      if (node) {
        node.reservedBy = robotId;
      }
    }
  }

  public checkHeadToHead(robotA: Robot, robotB: Robot): boolean {
    const aNext = robotA.currentRoute && robotA.currentRoute.length > robotA.currentRouteIndex
      ? robotA.currentRoute[robotA.currentRouteIndex]
      : undefined;
    const bNext = robotB.currentRoute && robotB.currentRoute.length > robotB.currentRouteIndex
      ? robotB.currentRoute[robotB.currentRouteIndex]
      : undefined;

    if (aNext && bNext) {
      const aWantsB = aNext.x === robotB.gridPosition.x && aNext.y === robotB.gridPosition.y;
      const bWantsA = bNext.x === robotA.gridPosition.x && bNext.y === robotA.gridPosition.y;
      if (aWantsB && bWantsA) return true;

      if (aNext.x === bNext.x && aNext.y === bNext.y) {
        const dxA = aNext.x - robotA.gridPosition.x;
        const dyA = aNext.y - robotA.gridPosition.y;
        const dxB = bNext.x - robotB.gridPosition.x;
        const dyB = bNext.y - robotB.gridPosition.y;

        const isOppositeAlongAxis =
          (dxA !== 0 && dxA === -dxB && dyA === 0 && dyB === 0) ||
          (dyA !== 0 && dyA === -dyB && dxA === 0 && dxB === 0);

        if (isOppositeAlongAxis) {
          return true;
        }
      }
    }

    const aBlockedByB = aNext && aNext.x === robotB.gridPosition.x && aNext.y === robotB.gridPosition.y;
    const bBlockedByA = bNext && bNext.x === robotA.gridPosition.x && bNext.y === robotA.gridPosition.y;
    return Boolean(aBlockedByB && bBlockedByA);
  }

  public getCongestion(totalAisleNodes: number): CongestionData {
    const reservedCount = this.reservations.size;
    const percentage = totalAisleNodes > 0 ? Math.min(100, Math.round((reservedCount / totalAisleNodes) * 100)) : 0;

    let level: 'Low' | 'Medium' | 'High' = 'Low';
    if (percentage > 35) level = 'High';
    else if (percentage > 15) level = 'Medium';

    const hotspots: GridCoord[] = Array.from(this.nodeVisits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });

    return {
      level,
      percentage,
      hotspots,
      reservedCount,
    };
  }

  public getReservedNodesSet(): Set<string> {
    return new Set(this.reservations.keys());
  }

  public getOccupiedNodesSet(): Set<string> {
    return new Set(this.occupiedNodes.keys());
  }

  public getNodeVisits(): Map<string, number> {
    return this.nodeVisits;
  }
}
