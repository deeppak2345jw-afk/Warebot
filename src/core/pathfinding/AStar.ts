import { Graph } from '../simulation/WarehouseGraph';
import { PriorityQueue } from '../simulation/internalQueues';
import { GridCoord, PathfindingResult, NavigationMode } from '../types';

export interface PathfindingOptions {
  heuristic?: 'manhattan' | 'euclidean';
  ignoreBlocked?: boolean;
  ignoreReserved?: boolean;
  reservedForRobotId?: string;
  dynamicCongestionWeight?: number;
  goalCoord?: GridCoord;
  navigationMode?: NavigationMode;
  targetDockId?: string;
  allowOppositeLane?: boolean;
}

export function heuristic(
  a: GridCoord,
  b: GridCoord,
  type: 'manhattan' | 'euclidean' = 'manhattan'
): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (type === 'euclidean') {
    return Math.sqrt(dx * dx + dy * dy);
  }
  return dx + dy;
}
export function aStarPathfinding(
  graph: Graph,
  startCoord: GridCoord,
  goalCoord: GridCoord,
  options?: PathfindingOptions
): PathfindingResult {
  const startTime = performance.now();
  const startNode = graph.getNodeByCoord(startCoord.x, startCoord.y);
  const goalNode = graph.getNodeByCoord(goalCoord.x, goalCoord.y);

  if (!startNode || !goalNode) {
    return {
      path: [],
      exploredNodes: [],
      cost: 0,
      calculationTimeMs: performance.now() - startTime,
      algorithm: 'astar',
    };
  }

  const hType = options?.heuristic || 'manhattan';
  const openSet = new PriorityQueue<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const exploredCoords: GridCoord[] = [];
  const visitedSet = new Set<string>();

  gScore.set(startNode.id, 0);
  const initialF = heuristic(startCoord, goalCoord, hType);
  fScore.set(startNode.id, initialF);
  openSet.enqueue(startNode.id, initialF);

  while (!openSet.isEmpty()) {
    const currentId = openSet.dequeue()!;
    const currentNode = graph.getNode(currentId);
    if (!currentNode) continue;

    if (!visitedSet.has(currentId)) {
      visitedSet.add(currentId);
      exploredCoords.push({ x: currentNode.x, y: currentNode.y });
    }
    if (currentNode.x === goalCoord.x && currentNode.y === goalCoord.y) {
      const path: GridCoord[] = [];
      let curr: string | undefined = currentId;
      while (curr) {
        const n = graph.getNode(curr);
        if (n) path.unshift({ x: n.x, y: n.y });
        curr = cameFrom.get(curr);
      }

      return {
        path,
        exploredNodes: exploredCoords,
        cost: gScore.get(currentId) || 0,
        calculationTimeMs: performance.now() - startTime,
        algorithm: 'astar',
      };
    }

    const neighbors = graph.getNeighbors(currentId, {
      ignoreBlocked: options?.ignoreBlocked,
      ignoreReserved: options?.ignoreReserved,
      reservedForRobotId: options?.reservedForRobotId,
      goalCoord: options?.goalCoord || goalCoord,
      navigationMode: options?.navigationMode,
      targetDockId: options?.targetDockId,
      allowOppositeLane: options?.allowOppositeLane,
    });

    const currentG = gScore.get(currentId) ?? Infinity;

    for (const { node: neighbor, weight } of neighbors) {
      const tentativeG = currentG + weight;
      const neighborG = gScore.get(neighbor.id) ?? Infinity;

      if (tentativeG < neighborG) {
        cameFrom.set(neighbor.id, currentId);
        gScore.set(neighbor.id, tentativeG);
        const h = heuristic({ x: neighbor.x, y: neighbor.y }, goalCoord, hType);
        const f = tentativeG + h;
        fScore.set(neighbor.id, f);
        openSet.enqueue(neighbor.id, f);
      }
    }
  }
  return {
    path: [],
    exploredNodes: exploredCoords,
    cost: Infinity,
    calculationTimeMs: performance.now() - startTime,
    algorithm: 'astar',
  };
}
