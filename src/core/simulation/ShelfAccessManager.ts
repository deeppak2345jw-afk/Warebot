import { GridCoord, WarehouseNode, ShelfAccessStatus } from '../types';
import { Graph } from './WarehouseGraph';

export interface ShelfResource {
  shelfId: string;
  shelfCoord: GridCoord;
  interactionCoord: GridCoord;
  status: ShelfAccessStatus;
  ownerRobotId?: string;
  waitingQueue: string[];
  stagingCoords: GridCoord[];
  exitReservedBy?: string;
  exitRouteCoords: GridCoord[];
}

export class ShelfAccessManager {
  private shelfMap: Map<string, ShelfResource> = new Map();

  constructor() {}

  public registerShelf(
    shelfId: string,
    shelfCoord: GridCoord,
    interactionCoord: GridCoord,
    graph: Graph,
    warehouseLength: number
  ): void {
    const stagingCoords = this.calculateStagingCoords(shelfCoord, interactionCoord, graph, warehouseLength);

    this.shelfMap.set(shelfId, {
      shelfId,
      shelfCoord: { ...shelfCoord },
      interactionCoord: { ...interactionCoord },
      status: 'AVAILABLE',
      ownerRobotId: undefined,
      waitingQueue: [],
      stagingCoords,
      exitReservedBy: undefined,
      exitRouteCoords: [],
    });
  }

  private calculateStagingCoords(
    shelfCoord: GridCoord,
    interactionCoord: GridCoord,
    graph: Graph,
    warehouseLength: number
  ): GridCoord[] {
    const candidates: GridCoord[] = [];
    const interactionKey = Graph.coordKey(interactionCoord.x, interactionCoord.y);

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0 && dy === 0) continue;
        const cx = interactionCoord.x + dx;
        const cy = interactionCoord.y + dy;
        const key = Graph.coordKey(cx, cy);

        if (key === interactionKey || cy === interactionCoord.y) continue;

        const node = graph.getNodeByCoord(cx, cy);
        if (!node || node.isBlocked || node.type === 'shelf') continue;

        const isBypassLane = Math.abs(cy - interactionCoord.y) === 1;
        const isCrossway = cy <= 2 || cy >= warehouseLength - 3;
        const isCrossAisle = cx <= 1 || cx >= 18 || cx === 5 || cx === 9 || cx === 10 || cx === 14;

        if (isBypassLane || isCrossway || isCrossAisle) {
          candidates.push({ x: cx, y: cy });
        }
      }
    }

    candidates.sort((a, b) => {
      const distA = Math.abs(a.x - interactionCoord.x) + Math.abs(a.y - interactionCoord.y);
      const distB = Math.abs(b.x - interactionCoord.x) + Math.abs(b.y - interactionCoord.y);
      return distA - distB;
    });

    return candidates.slice(0, 6);
  }

  public requestAccess(
    shelfId: string,
    robotId: string,
    occupiedCoords?: Set<string>
  ): { granted: boolean; status: ShelfAccessStatus; stagingCoord?: GridCoord } {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) {
      return { granted: true, status: 'AVAILABLE' };
    }

    if (resource.ownerRobotId === robotId) {
      return { granted: true, status: resource.status };
    }

    if (!resource.ownerRobotId && resource.waitingQueue.length === 0) {
      resource.ownerRobotId = robotId;
      resource.status = 'RESERVED';
      return { granted: true, status: 'RESERVED' };
    }

    if (!resource.waitingQueue.includes(robotId)) {
      resource.waitingQueue.push(robotId);
    }
    resource.status = resource.ownerRobotId ? 'OCCUPIED' : 'WAITING';

    const queueIndex = resource.waitingQueue.indexOf(robotId);
    let stagingCoord: GridCoord | undefined = undefined;

    for (let i = 0; i < resource.stagingCoords.length; i++) {
      const coord = resource.stagingCoords[(queueIndex + i) % resource.stagingCoords.length];
      const key = Graph.coordKey(coord.x, coord.y);
      const isExitCell = resource.exitRouteCoords.some(ec => ec.x === coord.x && ec.y === coord.y);
      if (!isExitCell && (!occupiedCoords || !occupiedCoords.has(key))) {
        stagingCoord = coord;
        break;
      }
    }

    if (!stagingCoord && resource.stagingCoords.length > 0) {
      stagingCoord = resource.stagingCoords.find(c => !resource.exitRouteCoords.some(ec => ec.x === c.x && ec.y === c.y)) ||
                     resource.stagingCoords[queueIndex % resource.stagingCoords.length];
    }

    return {
      granted: false,
      status: 'WAITING',
      stagingCoord,
    };
  }

  public reserveExitRoute(shelfId: string, robotId: string, exitCoords: GridCoord[]): void {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return;
    if (resource.ownerRobotId === robotId) {
      resource.exitReservedBy = robotId;
      resource.exitRouteCoords = exitCoords.slice(0, 3);
    }
  }

  public releaseExitRoute(shelfId: string, robotId: string): void {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return;
    if (resource.exitReservedBy === robotId) {
      resource.exitReservedBy = undefined;
      resource.exitRouteCoords = [];
    }
  }

  public occupyShelf(shelfId: string, robotId: string): boolean {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return false;

    if (resource.ownerRobotId === robotId) {
      resource.status = 'OCCUPIED';
      return true;
    }

    return false;
  }

  public releaseShelf(
    shelfId: string,
    robotId: string,
    currentRobotCoord?: GridCoord
  ): { released: boolean; nextRobotId?: string } {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return { released: true };

    if (resource.ownerRobotId !== robotId) {
      this.cancelRequest(shelfId, robotId);
      return { released: false };
    }

    if (
      currentRobotCoord &&
      currentRobotCoord.x === resource.interactionCoord.x &&
      currentRobotCoord.y === resource.interactionCoord.y
    ) {
      return { released: false };
    }

    if (resource.exitReservedBy === robotId) {
      resource.exitReservedBy = undefined;
      resource.exitRouteCoords = [];
    }

    if (resource.waitingQueue.length > 0) {
      const nextRobotId = resource.waitingQueue.shift()!;
      resource.ownerRobotId = nextRobotId;
      resource.status = 'RESERVED';
      return { released: true, nextRobotId };
    }

    resource.ownerRobotId = undefined;
    resource.status = 'AVAILABLE';
    return { released: true };
  }

  public cancelRequest(shelfId: string, robotId: string): void {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return;

    if (resource.exitReservedBy === robotId) {
      resource.exitReservedBy = undefined;
      resource.exitRouteCoords = [];
    }

    const idx = resource.waitingQueue.indexOf(robotId);
    if (idx !== -1) {
      resource.waitingQueue.splice(idx, 1);
    }

    if (resource.ownerRobotId === robotId) {
      if (resource.waitingQueue.length > 0) {
        resource.ownerRobotId = resource.waitingQueue.shift();
        resource.status = 'RESERVED';
      } else {
        resource.ownerRobotId = undefined;
        resource.status = 'AVAILABLE';
      }
    } else if (resource.waitingQueue.length === 0 && !resource.ownerRobotId) {
      resource.status = 'AVAILABLE';
    }
  }

  public getShelfResource(shelfId: string): ShelfResource | undefined {
    return this.shelfMap.get(shelfId);
  }

  public getAllShelfResources(): Map<string, ShelfResource> {
    return this.shelfMap;
  }

  public reset(): void {
    for (const resource of this.shelfMap.values()) {
      resource.ownerRobotId = undefined;
      resource.status = 'AVAILABLE';
      resource.waitingQueue = [];
    }
  }
}
