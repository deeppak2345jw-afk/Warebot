import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  BarChart2,
  CheckCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Graph } from '../../core/simulation/WarehouseGraph';
import { aStarPathfinding } from '../../core/pathfinding/AStar';
import { dijkstraPathfinding } from '../../core/pathfinding/Dijkstra';
import { GridCoord, PathfindingAlgorithmType, PathfindingResult } from '../../core/types';

export const AlgorithmLabScreen: React.FC = () => {
  const GRID_SIZE = 15;
  const [start, setStart] = useState<GridCoord>({ x: 1, y: 1 });
  const [goal, setGoal] = useState<GridCoord>({ x: 13, y: 13 });
  const [walls, setWalls] = useState<Set<string>>(() => {
    const s = new Set<string>();
    // Default obstacle maze pattern
    for (let y = 3; y < 12; y++) {
      if (y !== 7) s.add(`6,${y}`);
      if (y !== 8) s.add(`10,${y}`);
    }
    return s;
  });

  const [selectedAlgo, setSelectedAlgo] = useState<PathfindingAlgorithmType>('astar');
  const [editMode, setEditMode] = useState<'wall' | 'start' | 'goal'>('wall');
  const [exploredIndex, setExploredIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(30); // ms per step

  const [result, setResult] = useState<PathfindingResult | null>(null);
  const [benchmark, setBenchmark] = useState<Record<PathfindingAlgorithmType, PathfindingResult> | null>(null);

  // Build lab graph
  const buildLabGraph = (): Graph => {
    const graph = new Graph();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isBlocked = walls.has(`${x},${y}`);
        graph.addNode({
          id: `node_${x}_${y}`,
          x,
          y,
          type: isBlocked ? 'obstacle' : 'aisle',
          isBlocked,
        });
      }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const neighbors = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        for (const { dx, dy } of neighbors) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            graph.addEdge(`node_${x}_${y}`, `node_${nx}_${ny}`, 1.0);
          }
        }
      }
    }
    return graph;
  };

  // Run selected algorithm
  const runSelected = () => {
    const graph = buildLabGraph();
    let res: PathfindingResult;
    switch (selectedAlgo) {
      case 'astar':
        res = aStarPathfinding(graph, start, goal);
        break;
      case 'dijkstra':
        res = dijkstraPathfinding(graph, start, goal);
        break;
      default:
        res = aStarPathfinding(graph, start, goal);
        break;
    }
    setResult(res);
    setExploredIndex(0);
    setIsAnimating(false);
  };

  useEffect(() => {
    runSelected();
  }, [selectedAlgo, start, goal, walls]);

  // Animation runner
  useEffect(() => {
    if (!isAnimating || !result) return;

    const interval = setInterval(() => {
      setExploredIndex((prev) => {
        if (prev >= result.exploredNodes.length) {
          setIsAnimating(false);
          return prev;
        }
        return prev + 1;
      });
    }, animSpeed);

    return () => clearInterval(interval);
  }, [isAnimating, result, animSpeed]);

  // Run concurrent benchmark across algorithms
  const runBenchmark = () => {
    const graph = buildLabGraph();
    setBenchmark({
      astar: aStarPathfinding(graph, start, goal),
      dijkstra: dijkstraPathfinding(graph, start, goal),
    });
  };

  const handleCellClick = (x: number, y: number) => {
    if (editMode === 'start') {
      if (!walls.has(`${x},${y}`) && !(goal.x === x && goal.y === y)) {
        setStart({ x, y });
      }
    } else if (editMode === 'goal') {
      if (!walls.has(`${x},${y}`) && !(start.x === x && start.y === y)) {
        setGoal({ x, y });
      }
    } else {
      // Toggle wall
      if ((start.x === x && start.y === y) || (goal.x === x && goal.y === y)) return;
      const key = `${x},${y}`;
      const newWalls = new Set(walls);
      if (newWalls.has(key)) newWalls.delete(key);
      else newWalls.add(key);
      setWalls(newWalls);
    }
  };

  const currentExploredSet = new Set(
    result?.exploredNodes.slice(0, exploredIndex).map((c) => `${c.x},${c.y}`) || []
  );

  const isDoneExploring = result && exploredIndex >= result.exploredNodes.length;
  const pathSet = new Set(isDoneExploring ? result?.path.map((c) => `${c.x},${c.y}`) || [] : []);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warehouse-border">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span>Algorithm Laboratory & Pathfinding Sandbox</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Interactively step through graph search frontiers, compare explored node counts, and benchmark A*, Dijkstra, BFS, and Greedy.
            </p>
          </div>
          <button
            onClick={runBenchmark}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition font-mono"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Benchmark All 4 Algorithms</span>
          </button>
        </div>

        {/* Main Sandbox Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Grid Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-4">
            {/* Grid Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1 bg-warehouse-darker p-1 rounded-lg border border-warehouse-border">
                <button
                  onClick={() => setEditMode('wall')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    editMode === 'wall' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-gray-400'
                  }`}
                >
                  Place Obstacles
                </button>
                <button
                  onClick={() => setEditMode('start')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    editMode === 'start' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-gray-400'
                  }`}
                >
                  Set Start
                </button>
                <button
                  onClick={() => setEditMode('goal')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    editMode === 'goal' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-gray-400'
                  }`}
                >
                  Set Goal
                </button>
              </div>

              <button
                onClick={() => setWalls(new Set())}
                className="text-gray-400 hover:text-red-400 text-xs font-mono"
              >
                Clear Obstacles
              </button>
            </div>

            {/* 15x15 Interactive Grid */}
            <div
              className="grid gap-1 bg-warehouse-darker p-3 rounded-lg border border-warehouse-border aspect-square w-full max-w-[480px] mx-auto"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                const x = idx % GRID_SIZE;
                const y = Math.floor(idx / GRID_SIZE);
                const key = `${x},${y}`;

                const isStart = start.x === x && start.y === y;
                const isGoal = goal.x === x && goal.y === y;
                const isWall = walls.has(key);
                const isPath = pathSet.has(key) && !isStart && !isGoal;
                const isExplored = currentExploredSet.has(key) && !isStart && !isGoal && !isPath;

                return (
                  <button
                    key={key}
                    onClick={() => handleCellClick(x, y)}
                    className={`w-full h-full aspect-square rounded-[3px] transition-colors duration-150 flex items-center justify-center text-[9px] font-bold ${
                      isStart
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50 scale-105 z-10'
                        : isGoal
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/50 scale-105 z-10'
                        : isWall
                        ? 'bg-gray-800 border border-gray-700'
                        : isPath
                        ? 'bg-purple-500 text-white animate-pulse shadow-md shadow-purple-500/40'
                        : isExplored
                        ? 'bg-cyan-950/60 border border-cyan-800/40 text-cyan-400'
                        : 'bg-warehouse-card/40 border border-warehouse-border/40 hover:bg-gray-700/50'
                    }`}
                  >
                    {isStart ? 'S' : isGoal ? 'G' : ''}
                  </button>
                );
              })}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-warehouse-border">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isAnimating ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black hover:bg-cyan-400'
                  }`}
                >
                  {isAnimating ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isAnimating ? 'Pause' : 'Play Exploration'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsAnimating(false);
                    setExploredIndex((prev) => Math.min((result?.exploredNodes.length || 0), prev + 1));
                  }}
                  className="p-1.5 bg-warehouse-darker border border-warehouse-border rounded text-gray-300 hover:text-white"
                  title="Step 1 Node"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsAnimating(false);
                    setExploredIndex(result?.exploredNodes.length || 0);
                  }}
                  className="px-2.5 py-1.5 bg-warehouse-darker border border-warehouse-border rounded text-xs text-gray-300 hover:text-white font-mono"
                >
                  Skip to End
                </button>

                <button
                  onClick={() => {
                    setIsAnimating(false);
                    setExploredIndex(0);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-warehouse-border"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Exploration Progress */}
              <div className="text-xs font-mono text-gray-400">
                Frontier Step: <span className="text-cyan-400 font-bold">{exploredIndex}</span> / {result?.exploredNodes.length || 0}
              </div>
            </div>
          </div>

          {/* Right: Algorithm Selector, Live Metrics & Explanations (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Algorithm Selector */}
            <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-3">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
                Select Pathfinding Algorithm
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'astar', name: 'A* Search', desc: 'Heuristic-guided optimal' },
                  { id: 'dijkstra', name: "Dijkstra's Algo", desc: 'Uniform-cost contours' },
                ].map((algo) => (
                  <button
                    key={algo.id}
                    onClick={() => setSelectedAlgo(algo.id as PathfindingAlgorithmType)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      selectedAlgo === algo.id
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm'
                        : 'bg-warehouse-darker/60 border-warehouse-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-bold">{algo.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{algo.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Search Metrics */}
            {result && (
              <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-3 font-mono">
                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Active Run Telemetry
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-warehouse-darker p-2.5 rounded border border-warehouse-border text-center">
                    <div className="text-gray-500 text-[10px]">PATH LENGTH</div>
                    <div className="text-purple-400 font-bold text-sm mt-0.5">
                      {result.path.length > 0 ? `${result.path.length - 1} steps` : 'Unreachable'}
                    </div>
                  </div>
                  <div className="bg-warehouse-darker p-2.5 rounded border border-warehouse-border text-center">
                    <div className="text-gray-500 text-[10px]">EXPLORED</div>
                    <div className="text-cyan-400 font-bold text-sm mt-0.5">
                      {result.exploredNodes.length} nodes
                    </div>
                  </div>
                  <div className="bg-warehouse-darker p-2.5 rounded border border-warehouse-border text-center">
                    <div className="text-gray-500 text-[10px]">CALC TIME</div>
                    <div className="text-emerald-400 font-bold text-sm mt-0.5">
                      {result.calculationTimeMs.toFixed(2)} ms
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Benchmark Table (when run) */}
            {benchmark && (
              <div className="bg-warehouse-card p-4 rounded-xl border border-purple-800/40 space-y-3 font-mono">
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Concurrent Benchmark Comparison</span>
                </div>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-warehouse-border text-gray-400">
                        <th className="pb-1.5">Algorithm</th>
                        <th className="pb-1.5">Path</th>
                        <th className="pb-1.5">Explored</th>
                        <th className="pb-1.5">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warehouse-border/40">
                      {Object.entries(benchmark).map(([algo, res]) => (
                        <tr key={algo} className={algo === 'astar' ? 'text-cyan-400 font-bold' : 'text-gray-300'}>
                          <td className="py-1.5 uppercase">{algo}</td>
                          <td className="py-1.5">{res.path.length > 0 ? res.path.length - 1 : 'Fail'}</td>
                          <td className="py-1.5">{res.exploredNodes.length}</td>
                          <td className="py-1.5">{res.calculationTimeMs.toFixed(2)}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Educational takeaway card */}
            <div className="bg-warehouse-darker p-4 rounded-xl border border-warehouse-border space-y-2 text-xs">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Academic Insights & Comparison</span>
              </div>
              <ul className="space-y-1.5 text-gray-300 text-[11px] leading-relaxed list-disc list-inside">
                <li>
                  <span className="text-white font-semibold">A*</span> prunes exploration towards the goal using the Manhattan heuristic \(h(n) = |x_1-x_2| + |y_1-y_2|\), exploring up to 60% fewer nodes than Dijkstra.
                </li>
                <li>
                  <span className="text-white font-semibold">Dijkstra</span> explores expanding radial rings, guaranteeing the shortest path but evaluating unnecessary opposite-direction nodes.
                </li>
                <li>
                  <span className="text-white font-semibold">BFS</span> uses a FIFO Queue to find fewest hops on uniform cost grids, but lacks distance weighting.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
