import React, { useState } from 'react';
import {
  ListTodo,
  PlusCircle,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  Box,
  XCircle,
  RotateCcw,
  UserCheck,
  Eye,
  Layers,
  Search,
  Filter,
  Sparkles,
  Info,
  HelpCircle,
  Cpu,
  Award,
  X,
  Bot,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { TaskPriority, WarehouseTask, AllocationStrategyType } from '../../core/types';
import { TaskAllocator } from '../../core/allocation/TaskAllocator';
import { AllocationCandidate } from '../../core/allocation/strategies';

export const TaskBoardScreen: React.FC = () => {
  const tasks = useSimulationStore((s) => s.tasks);
  const robots = useSimulationStore((s) => s.robots);
  const config = useSimulationStore((s) => s.config);
  const updateConfig = useSimulationStore((s) => s.updateConfig);
  const spawnTask = useSimulationStore((s) => s.spawnTask);
  const cancelTask = useSimulationStore((s) => s.cancelTask);
  const reprioritizeTask = useSimulationStore((s) => s.reprioritizeTask);
  const reassignTask = useSimulationStore((s) => s.reassignTask);
  const retryTask = useSimulationStore((s) => s.retryTask);

  const selectTask = useUIStore((s) => s.selectTask);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);
  const setCreateTaskModalOpen = useUIStore((s) => s.setCreateTaskModalOpen);

  const [filterTab, setFilterTab] = useState<'all' | 'queued' | 'allocated' | 'in_progress' | 'completed' | 'cancelled_failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [explainTask, setExplainTask] = useState<WarehouseTask | null>(null);
  const strategyOptions: { id: AllocationStrategyType; label: string; desc: string }[] = [
    { id: 'cost_based_adaptive', label: 'Multi-Factor Intelligent', desc: 'Weighted score of distance, battery, speed, and workload' },
    { id: 'priority_aware', label: 'Priority-Aware', desc: 'Emergency/critical tasks claim fastest & top-battery AGVs' },
    { id: 'nearest_available', label: 'Nearest Available', desc: 'Shortest Manhattan distance from AGV to shelf' },
    { id: 'highest_battery', label: 'Highest Battery', desc: 'Dispatches AGVs with highest battery reserves first' },
    { id: 'least_loaded', label: 'Least Loaded (Wear-Leveling)', desc: 'Prioritizes AGVs with fewest completed tasks' },
    { id: 'fastest_completion', label: 'Fastest Completion', desc: 'Minimizes total estimated pickup + delivery transit time' },
    { id: 'balanced_workload', label: 'Balanced Workload', desc: 'Equalizes total distance traveled across fleet' },
  ];
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.payloadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedRobotId && t.assignedRobotId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.shelfId && t.shelfId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === 'all') return true;
    if (filterTab === 'queued') return t.status === 'queued';
    if (filterTab === 'allocated') return t.status === 'allocated';
    if (filterTab === 'in_progress') return t.status === 'in_progress';
    if (filterTab === 'completed') return t.status === 'completed';
    if (filterTab === 'cancelled_failed') return t.status === 'cancelled' || t.status === 'failed';
    return true;
  });

  const queuedTasks = filteredTasks.filter((t) => t.status === 'queued');
  const allocatedTasks = filteredTasks.filter((t) => t.status === 'allocated');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');
  const cancelledOrFailedTasks = filteredTasks.filter((t) => t.status === 'cancelled' || t.status === 'failed');

  const getNextPriority = (p: TaskPriority): TaskPriority => {
    if (p === 'normal') return 'high';
    if (p === 'high') return 'critical';
    return 'normal';
  };
  const candidatesRanking: AllocationCandidate[] = explainTask
    ? TaskAllocator.rankAllCandidates(explainTask, robots, config.allocationStrategy || 'cost_based_adaptive')
    : [];

  const renderTaskCard = (task: WarehouseTask) => (
    <div
      key={task.id}
      className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2C42] hover:border-[#00E5FF]/50 transition space-y-2 group shadow-lg"
    >
      {/* Top Header: ID & Priority */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-white text-xs group-hover:text-[#00E5FF] transition">
            {task.id}
          </span>
          {task.isSubtask && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#9B5CFF]/30 font-mono">
              Part {task.subtaskIndex! + 1}/{task.totalSubtasks}
            </span>
          )}
        </div>

        {/* Priority Cycle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            reprioritizeTask(task.id, getNextPriority(task.priority));
          }}
          title="Click to cycle priority (Normal -> High -> Critical)"
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase transition flex items-center gap-1 ${
            task.priority === 'critical'
              ? 'bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/30 hover:bg-[#FF3D71]/30'
              : task.priority === 'high'
              ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30 hover:bg-[#FFB020]/30'
              : 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/30'
          }`}
        >
          <span>{task.priority}</span>
          <span className="text-[8px] opacity-60">↻</span>
        </button>
      </div>

      {/* Payload info */}
      <div className="text-xs text-[#E7F4FF] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-[#FFB020] shrink-0" />
          <span className="font-medium truncate max-w-[130px]">{task.payloadName}</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20">
          Qty: {task.requestedQuantity || 1}
        </span>
      </div>

      {/* Subtask progress bar if parent */}
      {task.subtaskIds && task.subtaskIds.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[9px] font-mono text-[#7F9BB8]">
            <span>Subtasks Batch ({task.subtaskIds.length} parts)</span>
            <span>{task.deliveredQuantity} / {task.requestedQuantity} delivered</span>
          </div>
          <div className="w-full bg-[#060B14] h-1 rounded-full overflow-hidden border border-[#1E2C42]">
            <div
              className="bg-[#00E5FF] h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (task.deliveredQuantity / Math.max(1, task.requestedQuantity)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Route: Shelf -> Delivery */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#7F9BB8] pt-1 border-t border-[#1E2C42]/50">
        <div className="flex items-center gap-1">
          <span className="text-[#E7F4FF] font-semibold">{task.shelfId || `(${task.pickupCoord.x}, ${task.pickupCoord.y})`}</span>
          <ArrowRight className="w-3 h-3 text-[#00E5FF]" />
          <span className="text-[#00E5FF] font-semibold">{task.deliveryNodeId || `(${task.destinationCoord.x}, ${task.destinationCoord.y})`}</span>
        </div>

        {/* Allocation Explainability Button */}
        {task.assignedRobotId ? (
          <button
            onClick={() => setExplainTask(task)}
            title="Inspect why this robot was allocated"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/20 transition"
          >
            <Bot className="w-3 h-3" />
            <span className="font-bold">{task.assignedRobotId}</span>
            <Sparkles className="w-2.5 h-2.5 text-[#00E5FF]" />
          </button>
        ) : (
          <span className="text-gray-500 italic text-[9px]">Unassigned</span>
        )}
      </div>

      {/* Allocation Snippet / Notes */}
      {task.allocationReasoning ? (
        <div className="text-[9px] text-[#7F9BB8] font-sans truncate bg-[#101E32]/80 px-2 py-1 rounded border border-[#1E2C42]">
          <span className="text-[#00E5FF] font-mono font-bold mr-1">WHY:</span>
          {task.allocationReasoning}
        </div>
      ) : task.notes ? (
        <div className="text-[10px] text-[#7F9BB8] italic truncate border-t border-[#1E2C42]/30 pt-1">
          "{task.notes}"
        </div>
      ) : null}

      {/* Task Actions Toolbar */}
      <div className="pt-2 border-t border-[#1E2C42] flex items-center justify-between gap-1">
        {/* Inspect / View on Map */}
        <button
          onClick={() => {
            selectTask(task.id);
            setActiveScreen('simulation');
          }}
          title="Highlight route on 2D tactical map"
          className="flex-1 py-1 px-1.5 rounded-lg bg-[#101E32] hover:bg-[#00E5FF]/10 text-[#00E5FF] border border-[#1E2C42] hover:border-[#00E5FF]/40 text-[10px] font-mono flex items-center justify-center gap-1 transition"
        >
          <Eye className="w-3 h-3" />
          <span>Inspect</span>
        </button>

        {/* Explain Allocation */}
        <button
          onClick={() => setExplainTask(task)}
          title="Explain AGV selection decision"
          className="py-1 px-2 rounded-lg bg-[#101E32] hover:bg-[#9B5CFF]/10 text-[#9B5CFF] border border-[#1E2C42] hover:border-[#9B5CFF]/40 text-[10px] font-mono flex items-center justify-center gap-1 transition"
        >
          <HelpCircle className="w-3 h-3" />
          <span>Explain</span>
        </button>

        {/* Reassign (if assigned) */}
        {task.assignedRobotId && task.status !== 'completed' && task.status !== 'cancelled' && (
          <button
            onClick={() => reassignTask(task.id)}
            title="Reassign to dispatch queue"
            className="py-1 px-1.5 rounded-lg bg-[#101E32] hover:bg-[#267BFF]/20 text-[#267BFF] border border-[#1E2C42] hover:border-[#267BFF]/40 text-[10px] font-mono flex items-center justify-center gap-1 transition"
          >
            <UserCheck className="w-3 h-3" />
            <span>Reassign</span>
          </button>
        )}

        {/* Cancel (if active/queued) */}
        {task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'failed' && (
          <button
            onClick={() => cancelTask(task.id)}
            title="Cancel this task"
            className="py-1 px-1.5 rounded-lg bg-[#101E32] hover:bg-[#FF3D71]/20 text-[#FF3D71] border border-[#1E2C42] hover:border-[#FF3D71]/40 text-[10px] font-mono flex items-center justify-center gap-1 transition"
          >
            <XCircle className="w-3 h-3" />
            <span>Cancel</span>
          </button>
        )}

        {/* Retry (if cancelled or failed) */}
        {(task.status === 'cancelled' || task.status === 'failed') && (
          <button
            onClick={() => retryTask(task.id)}
            title="Retry and re-queue task"
            className="flex-1 py-1 px-1.5 rounded-lg bg-[#101E32] hover:bg-[#00F5A0]/20 text-[#00F5A0] border border-[#1E2C42] hover:border-[#00F5A0]/40 text-[10px] font-mono flex items-center justify-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#060B14] text-[#E7F4FF] select-none font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1E2C42] gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-mono mb-1.5">
              <span>WAREBOTS // SCHEDULING & ALLOCATION ENGINE</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
              <ListTodo className="w-5 h-5 text-[#00E5FF]" />
              <span>DYNAMIC TASK SCHEDULER & DISPATCH BOARD</span>
            </h1>
            <p className="text-xs text-[#7F9BB8] mt-1 leading-relaxed">
              Priority Queue ingestion, multi-factor AGV assignment, live execution tracking, and explainable decision telemetry.
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono">
            <button
              onClick={() => {
                for (let i = 0; i < 3; i++) spawnTask('critical', 'urgent_shipment');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FF3D71]/15 hover:bg-[#FF3D71]/25 text-[#FF3D71] border border-[#FF3D71]/40 text-xs font-bold transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Spawn 3 Urgent</span>
            </button>

            <button
              onClick={() => setCreateTaskModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black text-xs font-bold transition shadow-lg shadow-[#00E5FF]/20"
            >
              <PlusCircle className="w-3.5 h-3.5 fill-current" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Strategy Selector Strip (Phase 4 requirement) */}
        <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42] space-y-2 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-white font-bold">
              <Cpu className="w-4 h-4 text-[#00E5FF]" />
              <span>ACTIVE TASK ALLOCATION STRATEGY:</span>
            </div>
            <div className="text-[11px] text-[#7F9BB8] font-sans">
              Algorithms evaluate robot availability, battery, transit distance, and workload balance.
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 pt-1">
            {strategyOptions.map((strat) => {
              const isActive = (config.allocationStrategy || 'cost_based_adaptive') === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => updateConfig({ allocationStrategy: strat.id })}
                  title={strat.desc}
                  className={`px-2 py-2 rounded-xl text-left border transition flex flex-col justify-between ${
                    isActive
                      ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-white shadow-md shadow-[#00E5FF]/20 font-bold'
                      : 'bg-[#101E32] border-[#1E2C42] text-[#7F9BB8] hover:border-[#7F9BB8]/40 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] leading-tight truncate">{strat.label}</span>
                  {isActive && <span className="text-[8px] text-[#00E5FF] font-bold mt-1">ACTIVE</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0B1220] p-3.5 rounded-2xl border border-[#1E2C42]">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md font-mono">
            <Search className="w-4 h-4 text-[#7F9BB8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Task ID, item, robot, or shelf..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#101E32] border border-[#1E2C42] rounded-xl text-xs text-[#E7F4FF] placeholder-[#48627D] focus:outline-none focus:border-[#00E5FF] transition"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 font-mono">
            {[
              { id: 'all', label: 'All', count: tasks.length },
              { id: 'queued', label: 'Queued', count: tasks.filter((t) => t.status === 'queued').length },
              { id: 'allocated', label: 'En Route', count: tasks.filter((t) => t.status === 'allocated').length },
              { id: 'in_progress', label: 'Loaded', count: tasks.filter((t) => t.status === 'in_progress').length },
              { id: 'completed', label: 'Delivered', count: tasks.filter((t) => t.status === 'completed').length },
              { id: 'cancelled_failed', label: 'Cancelled', count: tasks.filter((t) => t.status === 'cancelled' || t.status === 'failed').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  filterTab === tab.id
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-bold'
                    : 'bg-[#101E32] text-[#7F9BB8] border border-[#1E2C42] hover:text-[#E7F4FF]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-[#7F9BB8]">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[#1E2C42] rounded-xl p-0.5 bg-[#101E32] shrink-0 font-mono text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-lg transition font-bold ${
                viewMode === 'kanban' ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20' : 'text-[#7F9BB8] hover:text-white'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition font-bold ${
                viewMode === 'list' ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20' : 'text-[#7F9BB8] hover:text-white'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Main Content: Kanban or List View */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Col 1: Queued */}
            <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42] space-y-3 flex flex-col font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2C42]">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Queued</span>
                </span>
                <span className="text-[10px] bg-[#101E32] text-[#00E5FF] px-2 py-0.5 rounded-full font-bold">
                  {queuedTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {queuedTasks.length === 0 ? (
                  <div className="text-center text-[#48627D] text-xs py-8 italic font-sans">No pending tasks.</div>
                ) : (
                  queuedTasks.map(renderTaskCard)
                )}
              </div>
            </div>

            {/* Col 2: Allocated */}
            <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42] space-y-3 flex flex-col font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2C42]">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#267BFF]" />
                  <span>En Route</span>
                </span>
                <span className="text-[10px] bg-[#101E32] text-[#267BFF] px-2 py-0.5 rounded-full font-bold">
                  {allocatedTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {allocatedTasks.length === 0 ? (
                  <div className="text-center text-[#48627D] text-xs py-8 italic font-sans">No robots en route.</div>
                ) : (
                  allocatedTasks.map(renderTaskCard)
                )}
              </div>
            </div>

            {/* Col 3: Carrying / Delivering */}
            <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42] space-y-3 flex flex-col font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2C42]">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-[#FFB020]" />
                  <span>Loaded</span>
                </span>
                <span className="text-[10px] bg-[#101E32] text-[#FFB020] px-2 py-0.5 rounded-full font-bold">
                  {inProgressTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {inProgressTasks.length === 0 ? (
                  <div className="text-center text-[#48627D] text-xs py-8 italic font-sans">No cargo in transit.</div>
                ) : (
                  inProgressTasks.map(renderTaskCard)
                )}
              </div>
            </div>

            {/* Col 4: Completed */}
            <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42] space-y-3 flex flex-col font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2C42]">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00F5A0]" />
                  <span>Delivered</span>
                </span>
                <span className="text-[10px] bg-[#101E32] text-[#00F5A0] px-2 py-0.5 rounded-full font-bold">
                  {completedTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {completedTasks.length === 0 ? (
                  <div className="text-center text-[#48627D] text-xs py-8 italic font-sans">No completed tasks.</div>
                ) : (
                  completedTasks.slice(-15).reverse().map(renderTaskCard)
                )}
              </div>
            </div>

            {/* Col 5: Cancelled / Failed */}
            <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42] space-y-3 flex flex-col font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2C42]">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-[#FF3D71]" />
                  <span>Cancelled</span>
                </span>
                <span className="text-[10px] bg-[#101E32] text-[#FF3D71] px-2 py-0.5 rounded-full font-bold">
                  {cancelledOrFailedTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {cancelledOrFailedTasks.length === 0 ? (
                  <div className="text-center text-[#48627D] text-xs py-8 italic font-sans">No cancelled tasks.</div>
                ) : (
                  cancelledOrFailedTasks.slice(-15).reverse().map(renderTaskCard)
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List / Table View */
          <div className="bg-[#0B1220] rounded-2xl border border-[#1E2C42] overflow-hidden font-mono text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#060B14] border-b border-[#1E2C42] text-[#7F9BB8] uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Task ID</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Payload</th>
                  <th className="p-3.5">Qty</th>
                  <th className="p-3.5">Pickup</th>
                  <th className="p-3.5">Delivery</th>
                  <th className="p-3.5">Assigned AGV</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C42]/50 text-[#E7F4FF]">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[#48627D] italic">
                      No tasks found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-[#101E32] transition">
                      <td className="p-3.5 font-bold text-white flex items-center gap-1.5">
                        <span>{t.id}</span>
                        {t.isSubtask && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#9B5CFF]/30">
                            P{t.subtaskIndex! + 1}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => reprioritizeTask(t.id, getNextPriority(t.priority))}
                          title="Click to cycle priority"
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase transition ${
                            t.priority === 'critical'
                              ? 'bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/30'
                              : t.priority === 'high'
                              ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30'
                              : 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30'
                          }`}
                        >
                          {t.priority}
                        </button>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                            t.status === 'completed'
                              ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                              : t.status === 'in_progress'
                              ? 'bg-[#FFB020]/20 text-[#FFB020]'
                              : t.status === 'allocated'
                              ? 'bg-[#267BFF]/20 text-[#267BFF]'
                              : t.status === 'cancelled' || t.status === 'failed'
                              ? 'bg-[#FF3D71]/20 text-[#FF3D71]'
                              : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-white font-medium">{t.payloadName}</td>
                      <td className="p-3.5">{t.requestedQuantity}</td>
                      <td className="p-3.5">{t.shelfId || `(${t.pickupCoord.x}, ${t.pickupCoord.y})`}</td>
                      <td className="p-3.5 text-[#00E5FF]">{t.deliveryNodeId || `(${t.destinationCoord.x}, ${t.destinationCoord.y})`}</td>
                      <td className="p-3.5">
                        {t.assignedRobotId ? (
                          <button
                            onClick={() => setExplainTask(t)}
                            className="text-[#00E5FF] font-bold bg-[#00E5FF]/10 px-2 py-0.5 rounded hover:bg-[#00E5FF]/20 transition flex items-center gap-1"
                          >
                            <span>{t.assignedRobotId}</span>
                            <Sparkles className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-gray-500 italic">None</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              selectTask(t.id);
                              setActiveScreen('simulation');
                            }}
                            title="Inspect on map"
                            className="p-1 rounded-lg bg-[#101E32] hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#1E2C42]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExplainTask(t)}
                            title="Explain allocation decision"
                            className="p-1 rounded-lg bg-[#101E32] hover:bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#1E2C42]"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                          {t.assignedRobotId && t.status !== 'completed' && t.status !== 'cancelled' && (
                            <button
                              onClick={() => reassignTask(t.id)}
                              title="Reassign task"
                              className="p-1 rounded-lg bg-[#101E32] hover:bg-[#267BFF]/20 text-[#267BFF] border border-[#1E2C42]"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'failed' && (
                            <button
                              onClick={() => cancelTask(t.id)}
                              title="Cancel task"
                              className="p-1 rounded-lg bg-[#101E32] hover:bg-[#FF3D71]/20 text-[#FF3D71] border border-[#1E2C42]"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(t.status === 'cancelled' || t.status === 'failed') && (
                            <button
                              onClick={() => retryTask(t.id)}
                              title="Retry task"
                              className="p-1 rounded-lg bg-[#101E32] hover:bg-[#00F5A0]/20 text-[#00F5A0] border border-[#1E2C42]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Allocation Explainability Modal (Phase 4 requirement) */}
      {explainTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none font-mono text-xs">
          <div className="w-full max-w-2xl bg-[#0B1220] border border-[#1E2C42] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#060B14] border-b border-[#1E2C42] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">
                    TASK ALLOCATION EXPLAINABILITY // {explainTask.id}
                  </div>
                  <div className="text-[10px] text-[#7F9BB8] font-sans">
                    Algorithmic candidate ranking and natural language decision rationale
                  </div>
                </div>
              </div>
              <button
                onClick={() => setExplainTask(null)}
                className="p-1 rounded-lg text-[#7F9BB8] hover:text-white hover:bg-[#101E32] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-[#E7F4FF]">
              {/* Task Summary Banner */}
              <div className="bg-[#101E32] p-3.5 rounded-xl border border-[#1E2C42] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <div className="text-[#7F9BB8] text-[9px]">PAYLOAD</div>
                  <div className="font-bold text-white mt-0.5">{explainTask.payloadName}</div>
                </div>
                <div>
                  <div className="text-[#7F9BB8] text-[9px]">QUANTITY</div>
                  <div className="font-bold text-[#FFB020] mt-0.5">{explainTask.requestedQuantity} units</div>
                </div>
                <div>
                  <div className="text-[#7F9BB8] text-[9px]">ROUTE</div>
                  <div className="font-bold text-[#00E5FF] mt-0.5">
                    {explainTask.shelfId} → {explainTask.deliveryNodeId}
                  </div>
                </div>
                <div>
                  <div className="text-[#7F9BB8] text-[9px]">ASSIGNED AGV</div>
                  <div className="font-bold text-[#00F5A0] mt-0.5">
                    {explainTask.assignedRobotId || 'None (In Queue)'}
                  </div>
                </div>
              </div>

              {/* Primary Decision Rationale */}
              {explainTask.allocationReasoning && (
                <div className="bg-[#00E5FF]/10 border border-[#00E5FF]/40 p-3.5 rounded-xl space-y-1">
                  <div className="text-[10px] text-[#00E5FF] font-bold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>WINNING ALLOCATION RATIONALE</span>
                  </div>
                  <p className="text-white text-xs font-sans leading-relaxed">
                    {explainTask.allocationReasoning}
                  </p>
                </div>
              )}

              {/* Candidate Fleet Ranking Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-[#00E5FF]" />
                    <span>CANDIDATE AGV FLEET EVALUATION</span>
                  </span>
                  <span className="text-[10px] text-[#7F9BB8]">
                    Strategy: {config.allocationStrategy || 'cost_based_adaptive'}
                  </span>
                </div>

                <div className="bg-[#060B14] rounded-xl border border-[#1E2C42] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101E32] text-[#7F9BB8] uppercase text-[9px] border-b border-[#1E2C42]">
                      <tr>
                        <th className="p-2.5">Rank</th>
                        <th className="p-2.5">AGV Unit</th>
                        <th className="p-2.5">Battery</th>
                        <th className="p-2.5">Dist to Pickup</th>
                        <th className="p-2.5">Est. Time</th>
                        <th className="p-2.5">Score</th>
                        <th className="p-2.5">Decision Factor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2C42]/50 text-[#E7F4FF]">
                      {candidatesRanking.map((cand, idx) => {
                        const isWinner = explainTask.assignedRobotId === cand.robot.id;
                        return (
                          <tr
                            key={cand.robot.id}
                            className={`transition ${
                              isWinner
                                ? 'bg-[#00E5FF]/10 border-l-2 border-[#00E5FF]'
                                : 'hover:bg-[#101E32]'
                            }`}
                          >
                            <td className="p-2.5 font-bold">
                              {isWinner ? (
                                <span className="bg-[#00E5FF] text-black px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  #1 WON
                                </span>
                              ) : (
                                `#${idx + 1}`
                              )}
                            </td>
                            <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: cand.robot.color }}
                              />
                              <span>{cand.robot.name}</span>
                            </td>
                            <td className="p-2.5">
                              <span
                                className={cand.robot.battery < 25 ? 'text-[#FF3D71]' : 'text-white'}
                              >
                                {cand.robot.battery.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-2.5">{cand.distanceToPickup.toFixed(1)}m</td>
                            <td className="p-2.5">{cand.estimatedTotalTime.toFixed(1)}s</td>
                            <td className="p-2.5 font-bold text-[#00E5FF]">{cand.score.toFixed(1)}</td>
                            <td className="p-2.5 text-[10px] text-[#7F9BB8] font-sans truncate max-w-[200px]" title={cand.reasoning}>
                              {cand.reasoning}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#060B14] border-t border-[#1E2C42] flex items-center justify-between">
              <div className="text-[10px] text-[#7F9BB8]">
                Scores re-calculated dynamically based on live AGV coordinates & battery telemetry
              </div>
              <button
                onClick={() => setExplainTask(null)}
                className="px-4 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
