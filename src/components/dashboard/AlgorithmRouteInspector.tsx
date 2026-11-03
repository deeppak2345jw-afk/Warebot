import React, { useState, useMemo } from 'react';
import {
  Binary,
  X,
  Compass,
  Zap,
  Bot,
  Layers,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Cpu,
  BarChart2,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { PathfindingAlgorithmType, GridCoord, PathfindingResult } from '../../core/types';
import { PathfindingManager } from '../../core/pathfinding/PathfindingManager';

export const AlgorithmRouteInspector: React.FC = () => {
  const isAlgorithmInspectorOpen = useUIStore((s) => s.isAlgorithmInspectorOpen);
  const setAlgorithmInspectorOpen = useUIStore((s) => s.setAlgorithmInspectorOpen);
  const activeFrontierNodes = useUIStore((s) => s.activeFrontierNodes);
  const setActiveFrontierNodes = useUIStore((s) => s.setActiveFrontierNodes);
  const setCustomInspectedRoute = useUIStore((s) => s.setCustomInspectedRoute);

  const engine = useSimulationStore((s) => s.engine);
  const robots = useSimulationStore((s) => s.robots);
  const config = useSimulationStore((s) => s.config);
  const updateConfig = useSimulationStore((s) => s.updateConfig);
  const chargingStations = useSimulationStore((s) => s.chargingStations);
  const deliveryNodes = useSimulationStore((s) => s.deliveryNodes);
  const nodes = useSimulationStore((s) => s.nodes);

  const [selectedRobotId, setSelectedRobotId] = useState<string>(robots[0]?.id || 'R-1');
  const [showFrontier, setShowFrontier] = useState<boolean>(true);
  const [selectedAlgo, setSelectedAlgo] = useState<PathfindingAlgorithmType>(config.pathfindingAlgorithm || 'astar');

  const selectedRobot = robots.find((r) => r.id === selectedRobotId);
  const comparisonResults = useMemo(() => {
    if (!engine || !engine.graph) return null;

    let startCoord: GridCoord = { x: 2, y: 3 };
    let goalCoord: GridCoord = { x: 12, y: 15 };

    if (selectedRobot) {
      startCoord = {
        x: Math.round(selectedRobot.position.x),
        y: Math.round(selectedRobot.position.z),
      };

      if (selectedRobot.targetNode) {
        goalCoord = { x: selectedRobot.targetNode.x, y: selectedRobot.targetNode.y };
      } else if (selectedRobot.currentRoute && selectedRobot.currentRoute.length > 0) {
        goalCoord = selectedRobot.currentRoute[selectedRobot.currentRoute.length - 1];
      } else {
        const firstShelf = nodes.find((n) => n.type === 'shelf');
        if (firstShelf) {
          goalCoord = { x: firstShelf.x, y: firstShelf.y };
        }
      }
    }

    try {
      const astarRes = PathfindingManager.findPath(
        engine.graph,
        startCoord,
        goalCoord,
        'astar',
        { heuristic: 'manhattan' }
      );

      const dijkstraRes = PathfindingManager.findPath(
        engine.graph,
        startCoord,
        goalCoord,
        'dijkstra'
      );

      return {
        start: startCoord,
        goal: goalCoord,
        astar: astarRes,
        dijkstra: dijkstraRes,
      };
    } catch (e) {
      console.error('Failed to run path comparison:', e);
      return null;
    }
  }, [engine, selectedRobot, nodes]);

  const handleToggleFrontier = (enabled: boolean) => {
    setShowFrontier(enabled);
    if (!enabled) {
      setActiveFrontierNodes(null);
      setCustomInspectedRoute(null);
    } else if (comparisonResults) {
      const activeRes = selectedAlgo === 'dijkstra' ? comparisonResults.dijkstra : comparisonResults.astar;
      setActiveFrontierNodes(activeRes.exploredNodes);
      setCustomInspectedRoute(activeRes.path);
    }
  };

  const handleApplyAlgorithm = (algo: PathfindingAlgorithmType) => {
    setSelectedAlgo(algo);
    updateConfig({ pathfindingAlgorithm: algo });
    if (showFrontier && comparisonResults) {
      const activeRes = algo === 'dijkstra' ? comparisonResults.dijkstra : comparisonResults.astar;
      setActiveFrontierNodes(activeRes.exploredNodes);
      setCustomInspectedRoute(activeRes.path);
    }
  };

  const handleSelectRobot = (robotId: string) => {
    setSelectedRobotId(robotId);
  };

  if (!isAlgorithmInspectorOpen) return null;

  const astarExplored = comparisonResults?.astar.exploredNodes.length || 0;
  const dijkstraExplored = comparisonResults?.dijkstra.exploredNodes.length || 0;
  const reductionPct = dijkstraExplored > 0
    ? (((dijkstraExplored - astarExplored) / dijkstraExplored) * 100).toFixed(0)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none font-mono text-xs">
      <div className="w-full max-w-3xl bg-[#0B1220]/98 border border-[#1E2C42] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#060B14] border-b border-[#1E2C42] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Binary className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-wide">
                WAREBOTS // LIVE ROUTING ALGORITHM ENGINE
              </div>
              <div className="text-[10px] text-[#7F9BB8] font-sans">
                Real-time operational pathfinding benchmarking & graph exploration telemetry
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setAlgorithmInspectorOpen(false);
              setActiveFrontierNodes(null);
              setCustomInspectedRoute(null);
            }}
            className="p-1 rounded-lg text-[#7F9BB8] hover:text-white hover:bg-[#101E32] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-[#E7F4FF]">
          {/* Active Fleet Algorithm Deployment */}
          <div className="bg-[#101E32] p-4 rounded-xl border border-[#1E2C42] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00E5FF]" />
                <span>ACTIVE FLEET PATHFINDING ALGORITHM</span>
              </span>
              <span className="text-[10px] bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/30">
                APPLIES TO ALL AGVs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'astar', name: 'A* (Manhattan)', desc: 'Admissible grid heuristic. Minimal search space and optimal route.' },
                { id: 'dijkstra', name: 'Dijkstra', desc: 'Uniform-cost search. Explores all accessible directions to guarantee shortest distance.' },
              ].map((algo) => {
                const isActive = config.pathfindingAlgorithm === algo.id;
                return (
                  <button
                    key={algo.id}
                    onClick={() => handleApplyAlgorithm(algo.id as PathfindingAlgorithmType)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1.5 ${
                      isActive
                        ? 'bg-[#00E5FF]/15 border-[#00E5FF] shadow-md shadow-[#00E5FF]/20 text-white'
                        : 'bg-[#0B1220] border-[#1E2C42] text-[#7F9BB8] hover:border-[#7F9BB8]/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{algo.name}</span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF]" />}
                    </div>
                    <p className="text-[10px] font-sans text-[#7F9BB8] leading-tight">
                      {algo.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Robot Selection for Real-Time Comparison */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#060B14] p-3 rounded-xl border border-[#1E2C42]">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-[#00E5FF]" />
              <span className="text-white font-bold">Select Active Robot:</span>
              <select
                value={selectedRobotId}
                onChange={(e) => handleSelectRobot(e.target.value)}
                className="bg-[#101E32] text-white border border-[#1E2C42] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[#00E5FF]"
              >
                {robots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.id}) — State: {r.state.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer text-[#7F9BB8] hover:text-white text-xs">
                <input
                  type="checkbox"
                  checked={showFrontier}
                  onChange={(e) => handleToggleFrontier(e.target.checked)}
                  className="accent-[#00E5FF] rounded"
                />
                <span>Project Search Frontier on Floor</span>
              </label>
            </div>
          </div>

          {/* Side-by-Side Algorithm Benchmark Card */}
          {comparisonResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#00F5A0]" />
                  <span>ALGORITHM EFFICIENCY BENCHMARK</span>
                </span>
                <span className="text-[11px] text-[#7F9BB8]">
                  From: ({comparisonResults.start.x}, {comparisonResults.start.y}) → To: ({comparisonResults.goal.x}, {comparisonResults.goal.y})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A* Card */}
                <div className="bg-[#101E32] p-4 rounded-xl border border-[#00E5FF]/40 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5FF]/5 rounded-bl-full pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                      <span>A* Search (Manhattan)</span>
                    </span>
                    <span className="text-[10px] bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-0.5 rounded font-bold">
                      RECOMMENDED
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#0B1220] p-2 rounded-lg">
                      <div className="text-[9px] text-[#7F9BB8]">EXPLORED</div>
                      <div className="text-base font-extrabold text-[#00E5FF]">
                        {comparisonResults.astar.exploredNodes.length}
                      </div>
                      <div className="text-[8px] text-[#7F9BB8]">nodes</div>
                    </div>
                    <div className="bg-[#0B1220] p-2 rounded-lg">
                      <div className="text-[9px] text-[#7F9BB8]">PATH LENGTH</div>
                      <div className="text-base font-extrabold text-white">
                        {comparisonResults.astar.path.length}
                      </div>
                      <div className="text-[8px] text-[#7F9BB8]">cells</div>
                    </div>
                    <div className="bg-[#0B1220] p-2 rounded-lg">
                      <div className="text-[9px] text-[#7F9BB8]">LATENCY</div>
                      <div className="text-base font-extrabold text-[#00F5A0]">
                        {comparisonResults.astar.calculationTimeMs.toFixed(2)}ms
                      </div>
                      <div className="text-[8px] text-[#7F9BB8]">calc time</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#7F9BB8] font-sans leading-relaxed">
                    Evaluates nodes using <code className="text-[#00E5FF]">f(n) = g(n) + h(n)</code>. The admissible Manhattan heuristic steers exploration strictly toward the target corridor, discarding unpromising backward branches.
                  </p>
                </div>

                {/* Dijkstra Card */}
                <div className="bg-[#101E32] p-4 rounded-xl border border-[#1E2C42] space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#FFB020]" />
                      <span>Dijkstra's Algorithm</span>
                    </span>
                    <span className="text-[10px] bg-[#FFB020]/20 text-[#FFB020] px-2 py-0.5 rounded font-bold">
                      UNIFORM EXPANSION
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#0B1220] p-2 rounded-lg">
                      <div className="text-[9px] text-[#7F9BB8]">EXPLORED</div>
                      <div className="text-base font-extrabold text-[#FFB020]">
                        {comparisonResults.dijkstra.exploredNodes.length}
                      </div>
                      <div className="text-[8px] text-[#7F9BB8]">nodes</div>
                    </div>
                    <div className="bg-[#0B1220] p-2 rounded-lg">
                      <div className="text-[9px] text-[#7F9BB8]">PATH LENGTH</div>
                      <div className="text-base font-extrabold text-white">
                        {comparisonResults.dijkstra.path.length}
                      </div>
                      <div className="text-[8px] text-[#7F9BB8]">cells</div>
                    </div>
                    <div className="bg-[#0B1220] p-2 rounded-lg">
                      <div className="text-[9px] text-[#7F9BB8]">LATENCY</div>
                      <div className="text-base font-extrabold text-[#7F9BB8]">
                        {comparisonResults.dijkstra.calculationTimeMs.toFixed(2)}ms
                      </div>
                      <div className="text-[8px] text-[#7F9BB8]">calc time</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#7F9BB8] font-sans leading-relaxed">
                    Evaluates nodes using purely accumulated distance <code className="text-[#FFB020]">g(n)</code>. Expands in uniform concentric circles across all accessible corridors until reaching the target.
                  </p>
                </div>
              </div>

              {/* Efficiency Callout Banner */}
              <div className="bg-[#060B14] p-3 rounded-xl border border-[#1E2C42] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-[#00F5A0]" />
                  <span className="text-white font-bold">Search Space Reduction:</span>
                  <span className="text-[#00F5A0] font-bold">
                    A* searched {reductionPct}% fewer nodes than Dijkstra
                  </span>
                </div>
                <span className="text-[10px] text-[#7F9BB8]">
                  Both found optimal path length: {comparisonResults.astar.path.length} cells
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#060B14] border-t border-[#1E2C42] flex items-center justify-between">
          <div className="text-[10px] text-[#7F9BB8] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
            <span>Path decisions operate on live graph with dynamic obstacle avoidance</span>
          </div>

          <button
            onClick={() => {
              setAlgorithmInspectorOpen(false);
              setActiveFrontierNodes(null);
              setCustomInspectedRoute(null);
            }}
            className="px-4 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
