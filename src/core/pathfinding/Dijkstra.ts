import { Graph } from '../simulation/WarehouseGraph';
import { PriorityQueue } from '../simulation/internalQueues';
import { GridCoord, PathfindingResult } from '../types';
import { PathfindingOptions } from './AStar';
export function dijkstraPathfinding(
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
      algorithm: 'dijkstra',
    };
  }

  const pq = new PriorityQueue<string>();
  const cameFrom = new Map<string, string>();
  const dist = new Map<string, number>();
  const exploredCoords: GridCoord[] = [];
  const visited = new Set<string>();

  dist.set(startNode.id, 0);
  pq.enqueue(startNode.id, 0);

  while (!pq.isEmpty()) {
    const currentId = pq.dequeue()!;
    const currentNode = graph.getNode(currentId);
    if (!currentNode) continue;

    if (visited.has(currentId)) continue;
    visited.add(currentId);
    exploredCoords.push({ x: currentNode.x, y: currentNode.y });

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
        cost: dist.get(currentId) || 0,
        calculationTimeMs: performance.now() - startTime,
        algorithm: 'dijkstra',
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

    const currentDist = dist.get(currentId) ?? Infinity;

    for (const { node: neighbor, weight } of neighbors) {
      if (visited.has(neighbor.id)) continue;

      const newDist = currentDist + weight;
      const prevDist = dist.get(neighbor.id) ?? Infinity;

      if (newDist < prevDist) {
        dist.set(neighbor.id, newDist);
        cameFrom.set(neighbor.id, currentId);
        pq.enqueue(neighbor.id, newDist);
      }
    }
  }

  return {
    path: [],
    exploredNodes: exploredCoords,
    cost: Infinity,
    calculationTimeMs: performance.now() - startTime,
    algorithm: 'dijkstra',
  };
}
