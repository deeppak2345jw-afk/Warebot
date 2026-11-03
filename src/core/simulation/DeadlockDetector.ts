import { Robot, GridCoord, DeadlockCycle } from '../types';
import { Graph } from './WarehouseGraph';
import { CollisionAvoidance } from './CollisionAvoidance';

/**
 * DeadlockDetector
 * Models robot wait-for dependencies as a Directed Graph (Wait-For Graph)
 * and detects circular deadlocks (e.g. R1 -> R2 -> R3 -> R1 or R1 <-> R2).
 * Formulates backtrack recovery by selecting the lowest effective priority robot to yield.
 */
export class DeadlockDetector {
  private activeDeadlocks: DeadlockCycle[] = [];
  private totalDeadlocksDetected: number = 0;
  private totalRecoveriesExecuted: number = 0;

  constructor() {}

  /**
   * Calculates effective priority for a robot including Priority Aging to prevent starvation.
   */
  public calculateEffectivePriority(robot: Robot, taskPriority?: string): number {
    let score = 0;

    // 1. State weight
    if (robot.state === 'moving_to_delivery' || robot.state === 'delivering' || robot.cargoCount > 0) {
      score += 100; // Carrying cargo has highest priority to clear aisles
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

    // 2. Task priority
    if (taskPriority === 'critical') score += 40;
    else if (taskPriority === 'high') score += 25;
    else if (taskPriority === 'normal') score += 10;

    // 3. Priority Aging: +5 points per second spent waiting
    score += Math.min(150, Math.floor(robot.waitTime * 5.0));

    // 4. Tie-breaker based on ID hash
    const idNum = parseInt(robot.id.replace(/\D/g, ''), 10) || 0;
    score += (idNum % 10) * 0.1;

    robot.effectivePriority = Math.round(score * 10) / 10;
    return robot.effectivePriority;
  }

  /**
   * Constructs the Wait-For Graph (WFG) and checks for circular dependencies.
   * Returns a DeadlockCycle if a circular wait is detected, or null if traffic is progressing normally.
   */
  public detectDeadlock(
    robots: Robot[],
    collisionAvoidance: CollisionAvoidance,
    graph: Graph
  ): DeadlockCycle | null {
    // 1. Build Adjacency List for the Wait-For Graph
    // Key: Robot ID, Value: Array of Robot IDs that this robot is waiting on
    const wfg: Map<string, string[]> = new Map();
    const robotMap: Map<string, Robot> = new Map();

    for (const r of robots) {
      robotMap.set(r.id, r);
      wfg.set(r.id, []);
    }

    for (const r of robots) {
      // Robot must be waiting or blocked with an active route
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

      // Check who occupies or reserves this next target
      const conflict = collisionAvoidance.getConflictInfo(nextTarget.x, nextTarget.y, r.id);
      if (conflict.isConflict && conflict.conflictingRobotId && conflict.conflictingRobotId !== r.id) {
        const edges = wfg.get(r.id) || [];
        if (!edges.includes(conflict.conflictingRobotId)) {
          edges.push(conflict.conflictingRobotId);
          wfg.set(r.id, edges);
        }
      }
    }

    // 2. Cycle Detection using Depth-First Search (DFS)
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
          // Cycle found! Backtrack to trace cycle
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

    // 3. Formulate Deadlock Cycle Resolution
    const cycleRobots: Robot[] = cycle
      .map((id: string) => robotMap.get(id))
      .filter((r): r is Robot => r !== undefined);

    if (cycleRobots.length < 2) return null;

    // Rank robots in cycle by effective priority
    cycleRobots.sort((a, b) => this.calculateEffectivePriority(a) - this.calculateEffectivePriority(b));

    // Victim is the lowest effective priority robot
    const victim = cycleRobots[0];
    const highestPriorityRobot = cycleRobots[cycleRobots.length - 1];

    // Find safe clearance coordinate for victim
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

  /**
   * Finds a safe clearance cell for the deadlock victim that does not collide with the cycle.
   */
  private findDeadlockClearance(
    victim: Robot,
    priorityRobot: Robot,
    collisionAvoidance: CollisionAvoidance,
    graph: Graph
  ): GridCoord | undefined {
    const node = graph.getNodeByCoord(victim.gridPosition.x, victim.gridPosition.y);
    if (!node) return undefined;

    const neighbors = graph.getNeighbors(node.id, { ignoreBlocked: false, ignoreReserved: true });

    // Try direct adjacent neighbors that are free
    for (const { node: n } of neighbors) {
      if (n.isBlocked || n.type === 'shelf') continue;
      if (collisionAvoidance.isOccupied(n.x, n.y)) continue;

      // Do not step onto priority robot's current position
      if (n.x === priorityRobot.gridPosition.x && n.y === priorityRobot.gridPosition.y) continue;

      return { x: n.x, y: n.y };
    }

    // Fallback: BFS up to 4 steps
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
