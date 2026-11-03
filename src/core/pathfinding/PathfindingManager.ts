import { Graph } from '../simulation/WarehouseGraph';
import { GridCoord, PathfindingAlgorithmType, PathfindingResult } from '../types';
import { aStarPathfinding, PathfindingOptions } from './AStar';
import { dijkstraPathfinding } from './Dijkstra';

export class PathfindingManager {
  public static findPath(
    graph: Graph,
    startCoord: GridCoord,
    goalCoord: GridCoord,
    algorithm: PathfindingAlgorithmType = 'astar',
    options?: PathfindingOptions
  ): PathfindingResult {
    const runPathfinding = (opts?: PathfindingOptions): PathfindingResult => {
      switch (algorithm) {
        case 'astar':
          return aStarPathfinding(graph, startCoord, goalCoord, opts);
        case 'dijkstra':
          return dijkstraPathfinding(graph, startCoord, goalCoord, opts);
        default:
          return aStarPathfinding(graph, startCoord, goalCoord, opts);
      }
    };

    let result = runPathfinding(options);

    // Path Validation Check (Section 10):
    // For every normal task path, verify that no node belongs to the DOCKING_ZONE.
    const mode = options?.navigationMode || 'NORMAL_TASK';
    if (mode === 'NORMAL_TASK' && result.path && result.path.length > 0) {
      let hasExitedDockingZone = startCoord.y >= 2;
      let hasDockingZoneViolation = false;

      for (const coord of result.path) {
        if (coord.y >= 2) {
          hasExitedDockingZone = true;
        } else if (hasExitedDockingZone && coord.y < 2) {
          // Re-entering docking zone after being in the warehouse is a violation!
          hasDockingZoneViolation = true;
          break;
        } else if (!hasExitedDockingZone && coord.y < 2 && coord.x !== startCoord.x) {
          // Moving horizontally inside docking zone is a violation!
          hasDockingZoneViolation = true;
          break;
        }
      }

      if (hasDockingZoneViolation) {
        console.warn(`[PATH VALIDATION FAILED] start: (${startCoord.x}, ${startCoord.y}) goal: (${goalCoord.x}, ${goalCoord.y}) path:`, JSON.stringify(result.path));
        result = runPathfinding({
          ...options,
          navigationMode: 'NORMAL_TASK',
        });

        if (result.path && result.path.some((c, idx) => idx > 1 && (graph.getNodeByCoord(c.x, c.y)?.isDockingZone))) {
          result.path = [];
          result.cost = Infinity;
        }
      }
    }

    return result;
  }

  public static compareAllAlgorithms(
    graph: Graph,
    startCoord: GridCoord,
    goalCoord: GridCoord,
    options?: PathfindingOptions
  ): Record<PathfindingAlgorithmType, PathfindingResult> {
    return {
      astar: aStarPathfinding(graph, startCoord, goalCoord, options),
      dijkstra: dijkstraPathfinding(graph, startCoord, goalCoord, options),
    };
  }
}
