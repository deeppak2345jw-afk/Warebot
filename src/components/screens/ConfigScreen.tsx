import React, { useState } from 'react';
import {
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Bot,
  Zap,
  Cpu,
  Compass,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import {
  WarehouseConfig,
  PathfindingAlgorithmType,
  AllocationStrategyType,
} from '../../core/types';

export const ConfigScreen: React.FC = () => {
  const config = useSimulationStore((s) => s.config);
  const updateConfig = useSimulationStore((s) => s.updateConfig);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const [form, setForm] = useState<WarehouseConfig>({ ...config });
  const [isSaved, setIsSaved] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setActiveScreen('simulation');
  };

  const applyPreset = (
    preset: 'small' | 'medium' | 'large'
  ) => {
    if (preset === 'small') {
      setForm((prev) => ({
        ...prev,
        width: 12,
        length: 12,
        robotCount: 4,
        chargingStationCount: 2,
        packingStationCount: 2,
        taskGenerationRate: 6,
        robotSpeed: 2.0,
      }));
    } else if (preset === 'medium') {
      setForm((prev) => ({
        ...prev,
        width: 16,
        length: 16,
        robotCount: 6,
        chargingStationCount: 3,
        packingStationCount: 3,
        taskGenerationRate: 10,
        robotSpeed: 2.2,
      }));
    } else if (preset === 'large') {
      setForm((prev) => ({
        ...prev,
        width: 22,
        length: 22,
        robotCount: 12,
        chargingStationCount: 5,
        packingStationCount: 4,
        taskGenerationRate: 18,
        robotSpeed: 2.5,
      }));
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warehouse-border">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Warehouse Topology & Fleet Configuration</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Customize physical dimensions, AGV robot count, task generation pressure, and algorithmic dispatch strategies.
            </p>
          </div>

          {isSaved && (
            <div className="flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-mono animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Config Applied & Rebuilt!</span>
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-2">
          <div className="text-xs font-bold text-gray-300 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>QUICK PRESETS</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={() => applyPreset('small')}
              className="p-3 bg-warehouse-darker hover:bg-warehouse-border/60 rounded-lg border border-warehouse-border text-left transition"
            >
              <div className="font-bold text-cyan-300">Small Facility</div>
              <div className="text-[10px] text-gray-500 mt-0.5">12x12 Grid • 4 AGVs • 2 Docks</div>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('medium')}
              className="p-3 bg-warehouse-darker hover:bg-warehouse-border/60 rounded-lg border border-warehouse-border text-left transition"
            >
              <div className="font-bold text-cyan-300">Medium Warehouse</div>
              <div className="text-[10px] text-gray-500 mt-0.5">16x16 Grid • 6 AGVs • 3 Docks</div>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('large')}
              className="p-3 bg-warehouse-darker hover:bg-warehouse-border/60 rounded-lg border border-warehouse-border text-left transition"
            >
              <div className="font-bold text-cyan-300">Mega Fulfillment</div>
              <div className="text-[10px] text-gray-500 mt-0.5">22x22 Grid • 12 AGVs • 5 Docks</div>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleApply} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dimensions */}
            <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-4 font-mono text-xs">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                1. Physical Grid Dimensions
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>Width: {form.width} units</span>
                  <span className="text-gray-500">(10 - 26)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="26"
                  value={form.width}
                  onChange={(e) => setForm({ ...form, width: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>Length: {form.length} units</span>
                  <span className="text-gray-500">(10 - 26)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="26"
                  value={form.length}
                  onChange={(e) => setForm({ ...form, length: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>Charging Stations: {form.chargingStationCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={form.chargingStationCount}
                  onChange={(e) => setForm({ ...form, chargingStationCount: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Fleet & Dynamics */}
            <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-4 font-mono text-xs">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                2. Fleet & Dynamics
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>AGV Fleet Size: {form.robotCount} robots</span>
                  <span className="text-gray-500">(2 - 16)</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={form.robotCount}
                  onChange={(e) => setForm({ ...form, robotCount: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>Robot Max Speed: {form.robotSpeed.toFixed(1)} u/s</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.2"
                  value={form.robotSpeed}
                  onChange={(e) => setForm({ ...form, robotSpeed: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span>Task Generation Rate: {form.taskGenerationRate} tasks/min</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={form.taskGenerationRate}
                  onChange={(e) => setForm({ ...form, taskGenerationRate: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Algorithms & Allocation */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-4 font-mono text-xs">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              3. Algorithmic Coordination Strategy
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-400">PATHFINDING ALGORITHM</label>
                <select
                  value={form.pathfindingAlgorithm}
                  onChange={(e) =>
                    setForm({ ...form, pathfindingAlgorithm: e.target.value as PathfindingAlgorithmType })
                  }
                  className="w-full bg-warehouse-darker border border-warehouse-border rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="astar">A* Search (Admissible Manhattan Heuristic)</option>
                  <option value="dijkstra">Dijkstra's Algorithm (Uniform Cost)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400">TASK ALLOCATION STRATEGY</label>
                <select
                  value={form.allocationStrategy}
                  onChange={(e) =>
                    setForm({ ...form, allocationStrategy: e.target.value as AllocationStrategyType })
                  }
                  className="w-full bg-warehouse-darker border border-warehouse-border rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="cost_based_adaptive">Cost-Based Adaptive Allocation (Multi-factor)</option>
                  <option value="nearest_available">Nearest Available Robot</option>
                  <option value="highest_battery">Highest Battery Robot</option>
                  <option value="least_loaded">Least-Loaded Robot (Wear Leveling)</option>
                  <option value="fastest_completion">Fastest Estimated Completion</option>
                  <option value="priority_aware">Priority-Aware Allocation</option>
                  <option value="balanced_workload">Balanced Workload Distribution</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setForm({ ...config })}
              className="px-4 py-2 rounded-lg bg-warehouse-darker border border-warehouse-border text-gray-400 hover:text-white text-xs font-mono transition"
            >
              Reset to Current
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition shadow-lg shadow-cyan-500/20"
            >
              Apply & Rebuild Warehouse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
