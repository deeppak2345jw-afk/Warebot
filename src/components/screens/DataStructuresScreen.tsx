import React from 'react';
import {
  Binary,
  GitGraph,
  ListOrdered,
  Zap,
  Layers,
  Hash,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

export const DataStructuresScreen: React.FC = () => {
  const engine = useSimulationStore((s) => s.engine);
  const graph = engine.graph;
  const graphMetrics = graph.getMetrics();
  const urgentQueue = engine.urgentTaskQueue.toArray();
  const normalQueue = engine.normalTaskQueue.toArray();
  const chargingQueue = engine.chargingQueue.toArray();
  const eventStack = engine.eventStack.toArray().slice(-10);
  const robotMap = engine.robotMap;
  const taskMap = engine.taskMap;
  const reservedSet = engine.collisionAvoidance.getReservedNodesSet();
  const occupiedSet = engine.collisionAvoidance.getOccupiedNodesSet();

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warehouse-border">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Binary className="w-5 h-5 text-cyan-400" />
              <span>Computer Science Data Structures Inspector</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Live inspection of the real TypeScript data structures powering warehouse navigation, task prioritization, and spatial arbitration.
            </p>
          </div>
          <div className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-3 py-1.5 rounded-lg">
            7 ACTIVE DATA STRUCTURES
          </div>
        </div>

        {/* 1. Graph & Adjacency List */}
        <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitGraph className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white font-mono">1. Graph & Adjacency List (Spatial Topology)</h2>
            </div>
            <span className="text-[10px] bg-warehouse-darker text-gray-400 font-mono px-2 py-0.5 rounded">
              O(V + E) Traversal
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
              <div className="text-gray-500 text-[10px]">TOTAL NODES (V)</div>
              <div className="text-cyan-400 font-bold text-base mt-0.5">{graphMetrics.nodeCount}</div>
            </div>
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
              <div className="text-gray-500 text-[10px]">TOTAL EDGES (E)</div>
              <div className="text-purple-400 font-bold text-base mt-0.5">{graphMetrics.edgeCount}</div>
            </div>
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
              <div className="text-gray-500 text-[10px]">OBSTACLE / BLOCKED NODES</div>
              <div className="text-red-400 font-bold text-base mt-0.5">{graphMetrics.blockedCount}</div>
            </div>
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
              <div className="text-gray-500 text-[10px]">CURRENTLY RESERVED NODES</div>
              <div className="text-amber-400 font-bold text-base mt-0.5">{graphMetrics.reservedCount}</div>
            </div>
          </div>
        </div>

        {/* 2 & 3. Priority Queue & FIFO Queue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Priority Queue */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-400">
                <Zap className="w-4 h-4" />
                <h2 className="text-sm font-bold font-mono">2. Priority Queue (Binary Min-Heap)</h2>
              </div>
              <span className="text-[10px] bg-red-500/10 text-red-300 font-mono px-2 py-0.5 rounded border border-red-500/20">
                O(log N) Insert/Extract
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Orders urgent missions and A* pathfinding open-set frontiers by minimum cost priority.
            </p>
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border font-mono text-xs max-h-48 overflow-y-auto space-y-1.5">
              {urgentQueue.length === 0 ? (
                <div className="text-gray-500 italic">Heap is currently empty.</div>
              ) : (
                urgentQueue.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center p-1.5 bg-warehouse-card/60 rounded text-red-300">
                    <span>Index {i}: {entry.item.id} ({entry.item.payloadName})</span>
                    <span className="font-bold text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded">
                      Weight: {entry.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FIFO Queue */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-cyan-400">
                <ListOrdered className="w-4 h-4" />
                <h2 className="text-sm font-bold font-mono">3. FIFO Queue (Standard Tasks & Charging)</h2>
              </div>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-500/20">
                O(1) Enqueue/Dequeue
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Guarantees strict First-In-First-Out fairness for standard fulfillment tasks and charging queues.
            </p>
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border font-mono text-xs max-h-48 overflow-y-auto space-y-1.5">
              <div className="text-gray-400 text-[10px] uppercase font-bold">Standard Task Queue: {normalQueue.length} items</div>
              {normalQueue.slice(0, 4).map((task, i) => (
                <div key={task.id} className="flex justify-between p-1 bg-warehouse-card/60 rounded text-cyan-200 text-[11px]">
                  <span>Head+{i}: {task.id}</span>
                  <span className="text-gray-500">{task.payloadName}</span>
                </div>
              ))}
              <div className="text-amber-400 text-[10px] uppercase font-bold pt-2 border-t border-warehouse-border">
                Charging Dock Queue: {chargingQueue.length} waiting
              </div>
              {chargingQueue.map((robotId, i) => (
                <div key={robotId} className="text-amber-300 text-[11px]">
                  Pos {i + 1}: AGV {robotId}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4 & 5. Hash Maps & Sets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hash Map */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-400">
                <Hash className="w-4 h-4" />
                <h2 className="text-sm font-bold font-mono">4. Hash Maps (O(1) Entity Lookups)</h2>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/20">
                O(1) Expected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
                <div className="text-gray-500 text-[10px]">ROBOT MAP SIZE</div>
                <div className="text-purple-300 font-bold text-base mt-0.5">{robotMap.size()} AGVs</div>
                <div className="text-gray-500 text-[10px] mt-1">Key: ID → Robot Record</div>
              </div>
              <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
                <div className="text-gray-500 text-[10px]">TASK MAP SIZE</div>
                <div className="text-purple-300 font-bold text-base mt-0.5">{taskMap.size()} Tasks</div>
                <div className="text-gray-500 text-[10px] mt-1">Key: ID → Task Record</div>
              </div>
            </div>
          </div>

          {/* Sets */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Database className="w-4 h-4" />
                <h2 className="text-sm font-bold font-mono">5. Hash Sets (Spatial Conflict Detection)</h2>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                O(1) Membership
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
                <div className="text-gray-500 text-[10px]">RESERVED NODES SET</div>
                <div className="text-emerald-300 font-bold text-base mt-0.5">{reservedSet.size} coordinates</div>
                <div className="text-gray-500 text-[10px] mt-1">Active time-space reservations</div>
              </div>
              <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border">
                <div className="text-gray-500 text-[10px]">OCCUPIED NODES SET</div>
                <div className="text-emerald-300 font-bold text-base mt-0.5">{occupiedSet.size} coordinates</div>
                <div className="text-gray-500 text-[10px] mt-1">Current physical footprint</div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 & 7. Doubly Linked List & Stack */}
        <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400">
              <Layers className="w-4 h-4" />
              <h2 className="text-sm font-bold font-mono">6 & 7. Doubly Linked List & LIFO Stack</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border space-y-2">
              <div className="text-amber-300 font-bold">Doubly Linked List (Route Waypoints)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Used in robot route execution. Nodes maintain <code className="text-amber-400">prev</code> and <code className="text-amber-400">next</code> pointers, enabling O(1) advancement and dynamic route splicing when avoiding dynamic obstacles.
              </p>
            </div>
            <div className="bg-warehouse-darker p-3 rounded-lg border border-warehouse-border space-y-2">
              <div className="text-amber-300 font-bold">LIFO Stack (Event History & Reversal)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Maintains reverse chronological order for incident rollbacks, audit logs, and path backtracking. Current stack depth: <span className="text-amber-400 font-bold">{eventStack.length} entries</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
