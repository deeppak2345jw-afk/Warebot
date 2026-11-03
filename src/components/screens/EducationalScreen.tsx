import React from 'react';
import {
  HelpCircle,
  Binary,
  Cpu,
  Zap,
  GitGraph,
  Layers,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const EducationalScreen: React.FC = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-warehouse-border">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>Academic & University Presentation Guide</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Comprehensive theoretical and practical breakdown of Data Structures, Algorithms, and Multi-Robot Coordination models implemented in this simulation.
          </p>
        </div>

        {/* Section 1: 10-Step Operational Pipeline */}
        <div className="bg-warehouse-card p-6 rounded-xl border border-warehouse-border space-y-4">
          <div className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <span>Warehouse Operational Lifecycle (10 Steps)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
            {[
              { step: '1', title: 'Task Creation', desc: 'Poisson arrival' },
              { step: '2', title: 'Prioritization', desc: 'Min-Heap queue' },
              { step: '3', title: 'Robot Selection', desc: 'Cost allocation' },
              { step: '4', title: 'Pathfinding', desc: 'A* heuristic' },
              { step: '5', title: 'Pickup Transit', desc: 'Node reservation' },
              { step: '6', title: 'Cargo Loading', desc: 'Lift activation' },
              { step: '7', title: 'Delivery Transit', desc: 'Loaded drain rate' },
              { step: '8', title: 'Dock Delivery', desc: 'Metrics logged' },
              { step: '9', title: 'Battery Arbitrate', desc: 'Auto recharge' },
              { step: '10', title: 'Reallocation', desc: 'Dynamic rescue' },
            ].map((s) => (
              <div key={s.step} className="bg-warehouse-darker p-2.5 rounded-lg border border-warehouse-border space-y-1">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold mx-auto flex items-center justify-center text-[10px]">
                  {s.step}
                </div>
                <div className="font-bold text-white text-[11px]">{s.title}</div>
                <div className="text-gray-500 text-[9px]">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Data Structures Rationale */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Binary className="w-4 h-4 text-purple-400" />
            <span>Data Structures Implementation & Asymptotic Complexity</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-2">
              <div className="flex justify-between text-cyan-400 font-bold">
                <span>Graph & Adjacency List</span>
                <span className="text-gray-500">Space: O(V + E)</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                The warehouse grid is modeled as an undirected weighted graph where nodes represent navigable aisle coordinates, charging bays, and storage racks. An <strong>Adjacency List</strong> is chosen over an Adjacency Matrix because grid graphs are sparse (maximum 4 neighbors per node), conserving memory from \(O(V^2)\) to \(O(V)\).
              </p>
            </div>

            <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-2">
              <div className="flex justify-between text-red-400 font-bold">
                <span>Priority Queue (Min-Heap)</span>
                <span className="text-gray-500">O(log N)</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                Implemented as a complete binary min-heap. Critical orders and A* search frontiers are extracted in \(O(1)\) time and inserted in \(O(\log N)\) time, ensuring zero starvation for emergency shipments.
              </p>
            </div>

            <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-2">
              <div className="flex justify-between text-amber-400 font-bold">
                <span>FIFO Queue</span>
                <span className="text-gray-500">O(1)</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                Maintains strict first-come-first-served fairness for standard stock replenishment tasks and charging dock queues, preventing battery starvation.
              </p>
            </div>

            <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border space-y-2">
              <div className="flex justify-between text-purple-400 font-bold">
                <span>Hash Map & Hash Set</span>
                <span className="text-gray-500">O(1) Avg</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                Provides instant \(O(1)\) lookups for robot telemetry by ID, active task records, and spatial conflict verification (detecting whether a coordinate is occupied or reserved by another AGV).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Adaptive Task Allocation Math */}
        <div className="bg-warehouse-card p-6 rounded-xl border border-warehouse-border space-y-4">
          <div className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Mathematical Model: Adaptive Multi-Factor Task Allocation</span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            Unlike naive FIFO assignment, our adaptive allocator computes an objective penalty score for each candidate robot \(R\) given task \(T\):
          </p>

          <div className="bg-warehouse-darker p-4 rounded-lg border border-warehouse-border text-center font-mono text-cyan-300 text-xs">
            {"Score(R, T) = w₁ · Dist(R, T.pickup) + w₂ · (100 - R.battery) + w₃ · R.workload + w₄ · WaitTime - w₅ · R.speed"}
          </div>

          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            The candidate with the minimal score is awarded the mission. For every dispatch, the orchestrator generates an explicit natural-language explanation (e.g. <em>"Robot AGV-02 selected: closest to pickup (4.2m), battery 88%, 0 active tasks"</em>).
          </p>
        </div>

        {/* Section 4: Pathfinding & Dynamic Rerouting */}
        <div className="bg-warehouse-card p-6 rounded-xl border border-warehouse-border space-y-4">
          <div className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Collision Avoidance & Dynamic Rerouting</span>
          </div>

          <div className="space-y-3 text-xs text-gray-300 font-sans leading-relaxed">
            <p>
              <strong>Space-Time Node Reservation:</strong> Each moving robot claims its current node and the next immediate waypoint in an atomic reservation set. If two robots encounter a conflict at an intersection:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-400 font-mono text-[11px]">
              <li>The lower-priority robot yields and enters a temporary waiting state.</li>
              <li>If the wait duration exceeds 2.0 seconds, the robot triggers an instant dynamic A* recalculation, seeking an alternative aisle around the contested node.</li>
              <li>If an aisle is obstructed by a physical obstacle or robot breakdown, all affected robots dynamically re-route without operator intervention.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
