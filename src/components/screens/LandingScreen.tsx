import React from 'react';
import {
  Boxes,
  Play,
  Layers,
  Cpu,
  Binary,
  Bot,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSimulationStore } from '../../store/useSimulationStore';

export const LandingScreen: React.FC = () => {
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);
  const start = useSimulationStore((s) => s.start);
  const loadScenario = useSimulationStore((s) => s.loadScenario);

  const handleLaunchMain = () => {
    setActiveScreen('simulation');
    start();
  };

  const handleLaunchScenario = (scenId: string) => {
    loadScenario(scenId);
    setActiveScreen('simulation');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-warehouse-dark text-gray-200 select-none p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 pt-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>AUTONOMOUS AGV ORCHESTRATION PLATFORM</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Adaptive Multi-Robot Coordination & Task Scheduling
          </h1>

          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A futuristic 3D browser-based warehouse simulation demonstrating real Computer Science Data Structures, Graph Pathfinding Algorithms (A*, Dijkstra, BFS), and dynamic multi-agent task allocation under dynamic warehouse conditions.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4 font-mono text-xs">
            <button
              onClick={handleLaunchMain}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm shadow-xl shadow-cyan-500/25 transition transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch 3D Command Center</span>
            </button>

            <button
              onClick={() => setActiveScreen('three_d')}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-warehouse-card hover:bg-warehouse-border border border-warehouse-border text-white transition"
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Launch 3D Digital Twin</span>
            </button>
          </div>
        </div>

        {/* 4 Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-2">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white font-mono">Interactive 3D Simulation</div>
            <p className="text-xs text-gray-400">
              WebGL 3D warehouse with OrbitControls, top-down tactical view, AGV follow camera, and glowing neon path ribbons.
            </p>
          </div>

          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Binary className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white font-mono">Real CS Data Structures</div>
            <p className="text-xs text-gray-400">
              Graph, Adjacency List, Binary Min-Heap Priority Queue, FIFO Queue, Doubly Linked List, Stack, and Hash Sets.
            </p>
          </div>

          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white font-mono">Adaptive Task Allocation</div>
            <p className="text-xs text-gray-400">
              Multi-factor cost optimization combining transit distance, battery percentage, workload, and real-time path congestion.
            </p>
          </div>

          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white font-mono">Dynamic Failure Recovery</div>
            <p className="text-xs text-gray-400">
              Autonomous response to motor breakdowns, depleted batteries, blocked corridors, and sudden emergency shipments.
            </p>
          </div>
        </div>

        {/* Quick Launch Scenarios */}
        <div className="bg-warehouse-card p-6 rounded-2xl border border-warehouse-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-mono font-bold text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>QUICK SCENARIOS</span>
            </div>
            <button
              onClick={() => setActiveScreen('scenarios')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
            >
              <span>View all 10 Scenarios</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <button
              onClick={() => handleLaunchScenario('order_rush')}
              className="p-4 rounded-xl bg-warehouse-darker hover:border-cyan-500/50 border border-warehouse-border text-left transition space-y-1.5 group"
            >
              <div className="font-bold text-white group-hover:text-cyan-400 flex items-center justify-between">
                <span>High-Demand Order Rush</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">MEDIUM</span>
              </div>
              <p className="text-gray-400 text-[11px] font-sans">
                Process 25 rapid orders while optimizing robot allocation to prevent queue bottlenecks.
              </p>
            </button>

            <button
              onClick={() => handleLaunchScenario('breakdown_crisis')}
              className="p-4 rounded-xl bg-warehouse-darker hover:border-red-500/50 border border-warehouse-border text-left transition space-y-1.5 group"
            >
              <div className="font-bold text-white group-hover:text-red-400 flex items-center justify-between">
                <span>Robot Breakdown Crisis</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">HARD</span>
              </div>
              <p className="text-gray-400 text-[11px] font-sans">
                Handle sudden motor failures and verify automatic priority task rescue.
              </p>
            </button>

            <button
              onClick={() => handleLaunchScenario('large_warehouse_stress')}
              className="p-4 rounded-xl bg-warehouse-darker hover:border-purple-500/50 border border-warehouse-border text-left transition space-y-1.5 group"
            >
              <div className="font-bold text-white group-hover:text-purple-400 flex items-center justify-between">
                <span>Large Warehouse Stress Test</span>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">EXTREME</span>
              </div>
              <p className="text-gray-400 text-[11px] font-sans">
                Coordinate 14 robots across a massive 24x24 mega fulfillment center.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
