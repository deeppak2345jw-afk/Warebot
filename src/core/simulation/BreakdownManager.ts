import { Robot, WarehouseTask, SimulationEvent } from '../types';

export class BreakdownManager {
  /**
   * Triggers a breakdown on a robot.
   * If robot was carrying an item or executing a task, returns the task
   * to be re-allocated with elevated priority.
   */
  public static triggerBreakdown(
    robot: Robot,
    activeTask: WarehouseTask | undefined,
    reason: string = 'Drive motor stall'
  ): { affectedTask?: WarehouseTask; event: SimulationEvent } {
    robot.state = 'breakdown';
    robot.health = Math.max(0, robot.health - 40);
    robot.currentRoute = [];
    robot.currentRouteIndex = 0;
    robot.breakdownHistory.push({ time: Date.now(), reason });

    let affectedTask: WarehouseTask | undefined = undefined;

    if (activeTask && activeTask.id === robot.currentTaskId) {
      if (robot.isCarrying && robot.cargoCount > 0) {
        // Case B: Robot breaks down WHILE CARRYING cargo
        // Cargo remains frozen on the broken robot. Mark task as ITEM_RECOVERY_REQUIRED.
        affectedTask = {
          ...activeTask,
          status: 'in_progress',
          phase: 'ITEM_RECOVERY_REQUIRED',
          priority: 'critical',
          recoveryLocation: { x: robot.gridPosition.x, y: robot.gridPosition.y },
          brokenRobotId: robot.id,
          reassignmentCount: (activeTask.reassignmentCount || 0) + 1,
        };
        // Keep cargo on robot
        robot.blockedReason = `BREAKDOWN: Frozen at (${robot.gridPosition.x}, ${robot.gridPosition.y}) holding cargo (${robot.carriedItemName}). Awaiting recovery robot.`;
      } else {
        // Case A: Robot breaks down BEFORE picking up item
        affectedTask = {
          ...activeTask,
          status: 'queued',
          phase: 'UNASSIGNED',
          priority: 'critical', // Elevate priority for re-enqueued task
          assignedRobotId: undefined,
          reassignmentCount: (activeTask.reassignmentCount || 0) + 1,
        };
        robot.currentTaskId = undefined;
        robot.isCarrying = false;
        robot.cargoCount = 0;
        robot.cargoItems = [];
        robot.carriedItemName = undefined;
        robot.blockedReason = `BREAKDOWN: Disabled at (${robot.gridPosition.x}, ${robot.gridPosition.y}). Task returned to queue.`;
      }
    } else {
      robot.blockedReason = `BREAKDOWN: Disabled at (${robot.gridPosition.x}, ${robot.gridPosition.y}) due to ${reason}.`;
    }

    const event: SimulationEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type: 'robot_breakdown',
      message: robot.isCarrying
        ? `CRITICAL ALERT: Robot ${robot.name} broken down while carrying cargo! Recovery robot required at (${robot.gridPosition.x}, ${robot.gridPosition.y}).`
        : `ALERT: Robot ${robot.name} experienced ${reason}! Active task returned to queue.`,
      severity: 'error',
      robotId: robot.id,
      taskId: affectedTask?.id,
    };

    return { affectedTask, event };
  }

  /**
   * Repairs a broken robot and restores it to idle state.
   */
  public static repairRobot(robot: Robot): SimulationEvent {
    robot.state = 'idle';
    robot.health = 100;

    return {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type: 'robot_repaired',
      message: `Maintenance completed: Robot ${robot.name} restored to active duty.`,
      severity: 'success',
      robotId: robot.id,
    };
  }
}
