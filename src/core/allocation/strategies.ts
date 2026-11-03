import { Robot, WarehouseTask, AllocationStrategyType } from '../types';

export interface AllocationCandidate {
  robot: Robot;
  score: number;
  distanceToPickup: number;
  estimatedTotalTime: number;
  reasoning: string;
}

export function manhattanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculates allocation score and generates natural language reasoning
 * based on selected strategy.
 */
export function evaluateRobotForTask(
  robot: Robot,
  task: WarehouseTask,
  strategy: AllocationStrategyType,
  allRobots: Robot[]
): AllocationCandidate {
  const distToPickup = manhattanDistance(
    robot.gridPosition.x,
    robot.gridPosition.y,
    task.pickupCoord.x,
    task.pickupCoord.y
  );

  const distPickupToDest = manhattanDistance(
    task.pickupCoord.x,
    task.pickupCoord.y,
    task.destinationCoord.x,
    task.destinationCoord.y
  );

  const totalDist = distToPickup + distPickupToDest;
  const speed = Math.max(0.5, robot.maxSpeed);
  const estimatedTimeSec = totalDist / speed;

  let score = 0;
  let reasoning = '';

  // Baseline penalty for robots not idle or returning to base
  const statePenalty = (robot.state === 'idle' || robot.state === 'returning' || robot.state === 'returning_to_dock') ? 0 : 50;
  const batteryViable = robot.battery >= 20;

  switch (strategy) {
    case 'nearest_available': {
      score = distToPickup + statePenalty + (batteryViable ? 0 : 500);
      reasoning = `Robot ${robot.name} selected: closest to pickup (${distToPickup.toFixed(1)}m), battery ${robot.battery.toFixed(0)}%, state: ${robot.state}.`;
      break;
    }

    case 'highest_battery': {
      // Lower score is better
      score = (100 - robot.battery) * 2 + distToPickup * 0.5 + statePenalty;
      reasoning = `Robot ${robot.name} selected: highest battery reserve (${robot.battery.toFixed(0)}%), distance ${distToPickup.toFixed(1)}m.`;
      break;
    }

    case 'least_loaded': {
      score = robot.tasksCompleted * 10 + distToPickup + statePenalty;
      reasoning = `Robot ${robot.name} selected: lowest completed task count (${robot.tasksCompleted}), promoting fleet wear-leveling.`;
      break;
    }

    case 'fastest_completion': {
      score = estimatedTimeSec + statePenalty * 0.5;
      reasoning = `Robot ${robot.name} selected: fastest estimated mission completion (${estimatedTimeSec.toFixed(1)}s) at speed ${speed.toFixed(1)} units/s.`;
      break;
    }

    case 'priority_aware': {
      const priorityWeights = { low: 1, normal: 1.5, high: 2.5, critical: 4 };
      const pWeight = priorityWeights[task.priority];
      // For critical tasks, heavily penalize distance and favor top battery & high speed
      score = (distToPickup / speed) * pWeight + (100 - robot.battery) * 0.3 + statePenalty * 2;
      reasoning = `Robot ${robot.name} selected for ${task.priority.toUpperCase()} priority task: fast response time (${(distToPickup / speed).toFixed(1)}s), healthy battery (${robot.battery.toFixed(0)}%).`;
      break;
    }

    case 'balanced_workload': {
      const avgDistance =
        allRobots.reduce((sum, r) => sum + r.distanceTraveled, 0) / Math.max(1, allRobots.length);
      const workloadDeviation = robot.distanceTraveled - avgDistance;
      score = workloadDeviation * 0.5 + distToPickup * 0.8 + (100 - robot.battery) * 0.4 + statePenalty;
      reasoning = `Robot ${robot.name} selected: balanced workload distribution (${robot.distanceTraveled.toFixed(1)}m traveled vs ${avgDistance.toFixed(1)}m fleet avg).`;
      break;
    }

    case 'cost_based_adaptive':
    default: {
      // Comprehensive multi-factor cost function:
      // Cost = w1*dist + w2*(100-battery) + w3*tasksCompleted + w4*time - w5*health
      const wDist = 1.2;
      const wBat = 0.8;
      const wTasks = 1.5;
      const wState = statePenalty;
      const batteryPenalty = robot.battery < 25 ? 200 : 0;

      score =
        distToPickup * wDist +
        (100 - robot.battery) * wBat +
        robot.tasksCompleted * wTasks +
        wState +
        batteryPenalty;

      reasoning = `Robot ${robot.name} selected: optimal adaptive cost (${score.toFixed(1)}) combining distance (${distToPickup.toFixed(1)}m), battery (${robot.battery.toFixed(0)}%), and workload (${robot.tasksCompleted} tasks).`;
      break;
    }
  }

  return {
    robot,
    score,
    distanceToPickup: distToPickup,
    estimatedTotalTime: estimatedTimeSec,
    reasoning,
  };
}
