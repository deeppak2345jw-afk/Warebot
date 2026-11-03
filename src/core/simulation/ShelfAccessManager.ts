import { GridCoord, WarehouseNode, ShelfAccessStatus } from '../types';
import { Graph } from './WarehouseGraph';

export interface ShelfResource {
  shelfId: string;
  shelfCoord: GridCoord;
  interactionCoord: GridCoord; // Aisle cell facing the shelf where robot picks
  status: ShelfAccessStatus;
  ownerRobotId?: string;
  waitingQueue: string[]; // FIFO Queue of robot IDs waiting for this shelf
  stagingCoords: GridCoord[]; // Precomputed safe staging cells
  exitReservedBy?: string;
  exitRouteCoords: GridCoord[];
}

/**
 * ShelfAccessManager
 * Manages shared-resource synchronization for warehouse shelf interaction zones.
 * Prevents multiple robots from competing inside the same interaction cell by enforcing
 * mutual exclusion (Mutex), safe staging cells, and clean release conditions.
 */
export class ShelfAccessManager {
  private shelfMap: Map<string, ShelfResource> = new Map();

  constructor() {}

  /**
   * Registers a shelf and computes its interaction and safe staging cells.
   */
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

  /**
   * Calculates safe staging cells around a shelf.
   * Staging cells must be walkable, adjacent/near to the shelf area, but NOT the interaction cell
   * and NOT directly in the main exit path of the interaction cell.
   */
  private calculateStagingCoords(
    shelfCoord: GridCoord,
    interactionCoord: GridCoord,
    graph: Graph,
    warehouseLength: number
  ): GridCoord[] {
    const candidates: GridCoord[] = [];
    const interactionKey = Graph.coordKey(interactionCoord.x, interactionCoord.y);

    // Look at surrounding walkable nodes in a 1 to 4 cell radius
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0 && dy === 0) continue;
        const cx = interactionCoord.x + dx;
        const cy = interactionCoord.y + dy;
        const key = Graph.coordKey(cx, cy);

        // Skip the interaction cell and ANY cell in the same aisle row to keep the exit path clear
        if (key === interactionKey || cy === interactionCoord.y) continue;

        const node = graph.getNodeByCoord(cx, cy);
        if (!node || node.isBlocked || node.type === 'shelf') continue;

        // Give priority to bypass lanes, crossways, and cross-aisles
        const isBypassLane = Math.abs(cy - interactionCoord.y) === 1;
        const isCrossway = cy <= 2 || cy >= warehouseLength - 3;
        const isCrossAisle = cx <= 1 || cx >= 18 || cx === 5 || cx === 9 || cx === 10 || cx === 14;

        if (isBypassLane || isCrossway || isCrossAisle) {
          candidates.push({ x: cx, y: cy });
        }
      }
    }

    // Sort candidates by distance from interaction cell
    candidates.sort((a, b) => {
      const distA = Math.abs(a.x - interactionCoord.x) + Math.abs(a.y - interactionCoord.y);
      const distB = Math.abs(b.x - interactionCoord.x) + Math.abs(b.y - interactionCoord.y);
      return distA - distB;
    });

    return candidates.slice(0, 6); // Keep top 6 safe staging positions
  }

  /**
   * Requests access to a shelf interaction zone.
   * Returns granted = true if the robot claims the shelf, or granted = false with a safe staging cell.
   */
  public requestAccess(
    shelfId: string,
    robotId: string,
    occupiedCoords?: Set<string>
  ): { granted: boolean; status: ShelfAccessStatus; stagingCoord?: GridCoord } {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) {
      return { granted: true, status: 'AVAILABLE' };
    }

    // If this robot already owns the reservation
    if (resource.ownerRobotId === robotId) {
      return { granted: true, status: resource.status };
    }

    // If shelf is completely free and nobody is waiting
    if (!resource.ownerRobotId && resource.waitingQueue.length === 0) {
      resource.ownerRobotId = robotId;
      resource.status = 'RESERVED';
      return { granted: true, status: 'RESERVED' };
    }

    // Shelf is busy! Enqueue robot if not already in waiting queue
    if (!resource.waitingQueue.includes(robotId)) {
      resource.waitingQueue.push(robotId);
    }
    resource.status = resource.ownerRobotId ? 'OCCUPIED' : 'WAITING';

    // Select the first safe staging cell that is not currently occupied and not in the exit route
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

    // Fallback to first staging coordinate if all seem occupied
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

  /**
   * Reserves an exclusive exit route for the occupant robot departing the shelf.
   * Prevents waiting/staged robots from occupying or routing into these cells.
   */
  public reserveExitRoute(shelfId: string, robotId: string, exitCoords: GridCoord[]): void {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return;
    if (resource.ownerRobotId === robotId) {
      resource.exitReservedBy = robotId;
      resource.exitRouteCoords = exitCoords.slice(0, 3); // Reserve next 3 exit waypoints
    }
  }

  /**
   * Releases exit route reservation.
   */
  public releaseExitRoute(shelfId: string, robotId: string): void {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return;
    if (resource.exitReservedBy === robotId) {
      resource.exitReservedBy = undefined;
      resource.exitRouteCoords = [];
    }
  }

  /**
   * Called when the owner robot arrives at the interaction cell.
   */
  public occupyShelf(shelfId: string, robotId: string): boolean {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return false;

    if (resource.ownerRobotId === robotId) {
      resource.status = 'OCCUPIED';
      return true;
    }

    return false;
  }

  /**
   * Releases the shelf reservation.
   * If robots are queued, grants access to the next waiting robot.
   */
  public releaseShelf(
    shelfId: string,
    robotId: string,
    currentRobotCoord?: GridCoord
  ): { released: boolean; nextRobotId?: string } {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return { released: true };

    if (resource.ownerRobotId !== robotId) {
      // Robot wasn't the owner, but might be in the waiting queue (e.g. task reassigned or cancelled)
      this.cancelRequest(shelfId, robotId);
      return { released: false };
    }

    // Check release condition: If currentRobotCoord is given and robot is still in the interaction cell,
    // do not release until the robot has physically stepped out!
    if (
      currentRobotCoord &&
      currentRobotCoord.x === resource.interactionCoord.x &&
      currentRobotCoord.y === resource.interactionCoord.y
    ) {
      // Robot hasn't physically cleared the cell yet
      return { released: false };
    }

    // Clear exit route reservation when shelf is released
    if (resource.exitReservedBy === robotId) {
      resource.exitReservedBy = undefined;
      resource.exitRouteCoords = [];
    }

    // Clean handoff to next waiting robot
    if (resource.waitingQueue.length > 0) {
      const nextRobotId = resource.waitingQueue.shift()!;
      resource.ownerRobotId = nextRobotId;
      resource.status = 'RESERVED';
      return { released: true, nextRobotId };
    }

    // Nobody waiting: shelf is now AVAILABLE
    resource.ownerRobotId = undefined;
    resource.status = 'AVAILABLE';
    return { released: true };
  }

  /**
   * Cancels any reservation or waiting entry for a robot (e.g. if task is cancelled/reassigned).
   */
  public cancelRequest(shelfId: string, robotId: string): void {
    const resource = this.shelfMap.get(shelfId);
    if (!resource) return;

    // Clear exit route if held by this robot
    if (resource.exitReservedBy === robotId) {
      resource.exitReservedBy = undefined;
      resource.exitRouteCoords = [];
    }

    // Remove from waiting queue
    const idx = resource.waitingQueue.indexOf(robotId);
    if (idx !== -1) {
      resource.waitingQueue.splice(idx, 1);
    }

    // If owner, promote next
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

  /**
   * Returns current shelf resource state.
   */
  public getShelfResource(shelfId: string): ShelfResource | undefined {
    return this.shelfMap.get(shelfId);
  }

  /**
   * Returns all shelf resources for visualization and monitoring.
   */
  public getAllShelfResources(): Map<string, ShelfResource> {
    return this.shelfMap;
  }

  /**
   * Clears all shelf reservations.
   */
  public reset(): void {
    for (const resource of this.shelfMap.values()) {
      resource.ownerRobotId = undefined;
      resource.status = 'AVAILABLE';
      resource.waitingQueue = [];
    }
  }
}
