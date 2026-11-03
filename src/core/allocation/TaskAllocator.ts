import { Robot, WarehouseTask, AllocationStrategyType } from '../types';
import { evaluateRobotForTask, AllocationCandidate } from './strategies';

export class TaskAllocator {
  public static allocate(
    task: WarehouseTask,
    robots: Robot[],
    strategy: AllocationStrategyType
  ): AllocationCandidate | null {
    const eligibleRobots = robots.filter(
      r =>
        r.state !== 'breakdown' &&
        r.state !== 'maintenance' &&
        r.state !== 'charging' &&
        r.state !== 'going_to_charge' &&
        r.battery >= 20 &&
        !r.currentTaskId &&
        !r.isCarrying &&
        (r.state === 'idle' || r.state === 'returning' || r.state === 'returning_to_dock')
    );

    if (eligibleRobots.length === 0) {
      return null;
    }

    const candidates: AllocationCandidate[] = eligibleRobots.map(r =>
      evaluateRobotForTask(r, task, strategy, robots)
    );

    candidates.sort((a, b) => a.score - b.score);

    return candidates[0] || null;
  }
  public static rankAllCandidates(
    task: WarehouseTask,
    robots: Robot[],
    strategy: AllocationStrategyType
  ): AllocationCandidate[] {
    return robots.map(r => evaluateRobotForTask(r, task, strategy, robots)).sort((a, b) => a.score - b.score);
  }
}
