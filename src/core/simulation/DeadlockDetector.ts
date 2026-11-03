import { Robot, GridCoord, DeadlockCycle } from '../types';
import { Graph } from './WarehouseGraph';
import { CollisionAvoidance } from './CollisionAvoidance';

export class DeadlockDetector {
  private activeDeadlocks: DeadlockCycle[] = [];
  private totalDeadlocksDetected: number = 0;
  private totalRecoveriesExecuted: number = 0;

  constructor() {}

  public calculateEffectivePriority(robot: Robot, taskPriority?: string): number {
    let score = 0;

    if (robot.state === 'moving_to_delivery' || robot.state === 'delivering' || robot.cargoCount > 0) {
      score += 100;
    } else if (robot.state === 'picking_up' || robot.state === 'aligning_pickup') {
      score += 80;
    } else if (robot.state === 'moving_to_pickup') {
      score += 50;
    } else if (robot.state === 'going_to_charge') {
      score += robot.battery < 20 ? 85 : 40;
    } else if (robot.state === 'returning') {
      score += 30;
    } else if (robot.state === 'idle') {
      score += 10;
    }

    if (taskPriority === 'critical') score += 40;
    else if (taskPriority === 'high') score += 25;
    else if (taskPriority === 'normal') score += 10;

    score += Math.min(150, Math.floor(robot.waitTime * 5.0));

    const idNum = parseInt(robot.id.replace(/\D/g, ''), 10) || 0;
    score += (idNum % 10) * 0.1;

    robot.effectivePriority = Math.round(score * 10) / 10;
    return robot.effectivePriority;
  }

  public detectDeadlock(
    robots: Robot[],
    collisionAvoidance: CollisionAvoidance,
    graph: Graph
  ): DeadlockCycle | null {
    const wfg: Map<string, string[]> = new Map();
    const robotMap: Map<string, Robot> = new Map();

    for (const r of robots) {
      robotMap.set(r.id, r);
      wfg.set(r.id, []);
    }

    for (const r of robots) {
      const isWaiting =
        r.waitTime >= 0.5 ||
        r.state === 'waiting_for_path' ||
        r.state === 'staged' ||
        Boolean(r.blockedReason);

      if (!isWaiting || !r.currentRoute || r.currentRoute.length <= r.currentRouteIndex) {
        continue;
      }

      const nextTarget = r.currentRoute[r.currentRouteIndex];
      if (!nextTarget) continue;

      const conflict = collisionAvoidance.getConflictInfo(nextTarget.x, nextTarget.y, r.id);
      if (conflict.isConflict && conflict.conflictingRobotId && conflict.conflictingRobotId !== r.id) {
        const edges = wfg.get(r.id) || [];
        if (!edges.includes(conflict.conflictingRobotId)) {
          edges.push(conflict.conflictingRobotId);
          wfg.set(r.id, edges);
        }
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parentMap = new Map<string, string>();

    let detectedCycle: string[] | null = null;

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = wfg.get(nodeId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          parentMap.set(neighborId, nodeId);
          if (dfs(neighborId)) return true;
        } else if (recStack.has(neighborId)) {
          const cycle: string[] = [neighborId];
          let curr = nodeId;
          while (curr !== neighborId) {
            cycle.unshift(curr);
            curr = parentMap.get(curr) || neighborId;
          }
          detectedCycle = cycle;
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const r of robots) {
      if (!visited.has(r.id)) {
        if (dfs(r.id)) break;
      }
    }

    const cycle = (detectedCycle as any) as string[] | null;
    if (!cycle || cycle.length < 2) {
      return null;
    }

    const cycleRobots: Robot[] = cycle
      .map((id: string) => robotMap.get(id))
      .filter((r): r is Robot => r !== undefined);

    if (cycleRobots.length < 2) return null;

    cycleRobots.sort((a, b) => this.calculateEffectivePriority(a) - this.calculateEffectivePriority(b));

    const victim = cycleRobots[0];
    const highestPriorityRobot = cycleRobots[cycleRobots.length - 1];

    const clearanceCoord = this.findDeadlockClearance(victim, highestPriorityRobot, collisionAvoidance, graph);
    if (!clearanceCoord) return null;

    const cycleDesc = cycle.join(' → ') + ` → ${cycle[0]}`;

    const deadlock: DeadlockCycle = {
      robotIds: cycle,
      cycleDescription: cycleDesc,
      timestamp: Date.now(),
      victimRobotId: victim.id,
      clearanceCoord,
    };

    this.activeDeadlocks.push(deadlock);
    this.totalDeadlocksDetected++;

    return deadlock;
  }

  private findDeadlockClearance(
    victim: Robot,
    priorityRobot: Robot,
    collisionAvoidance: CollisionAvoidance,
    graph: Graph
  ): GridCoord | undefined {
    const node = graph.getNodeByCoord(victim.gridPosition.x, victim.gridPosition.y);
    if (!node) return undefined;

    const neighbors = graph.getNeighbors(node.id, { ignoreBlocked: false, ignoreReserved: true });

    for (const { node: n } of neighbors) {
      if (n.isBlocked || n.type === 'shelf') continue;
      if (collisionAvoidance.isOccupied(n.x, n.y)) continue;

      if (n.x === priorityRobot.gridPosition.x && n.y === priorityRobot.gridPosition.y) continue;

      return { x: n.x, y: n.y };
    }

    const visited = new Set<string>();
    visited.add(Graph.coordKey(victim.gridPosition.x, victim.gridPosition.y));
    const queue: { coord: GridCoord; dist: number }[] = [{ coord: { ...victim.gridPosition }, dist: 0 }];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.dist >= 4) break;

      const currNode = graph.getNodeByCoord(curr.coord.x, curr.coord.y);
      if (!currNode) continue;
      const currNeighbors = graph.getNeighbors(currNode.id, { ignoreBlocked: false, ignoreReserved: true });

      for (const { node: n } of currNeighbors) {
        const key = Graph.coordKey(n.x, n.y);
        if (visited.has(key) || n.isBlocked || n.type === 'shelf' || collisionAvoidance.isOccupied(n.x, n.y)) continue;
        visited.add(key);

        if (n.x !== priorityRobot.gridPosition.x || n.y !== priorityRobot.gridPosition.y) {
          return { x: n.x, y: n.y };
        }

        queue.push({ coord: { x: n.x, y: n.y }, dist: curr.dist + 1 });
      }
    }

    return undefined;
  }

  public recordRecovery(): void {
    this.totalRecoveriesExecuted++;
    if (this.activeDeadlocks.length > 0) {
      this.activeDeadlocks.shift();
    }
  }

  public getStats() {
    return {
      activeDeadlocks: this.activeDeadlocks,
      totalDeadlocksDetected: this.totalDeadlocksDetected,
      totalRecoveriesExecuted: this.totalRecoveriesExecuted,
    };
  }

  public reset(): void {
    this.activeDeadlocks = [];
    this.totalDeadlocksDetected = 0;
    this.totalRecoveriesExecuted = 0;
  }
}
