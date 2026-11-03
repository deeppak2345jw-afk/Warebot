import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Terminal,
  ListOrdered,
  AlertCircle,
  Clock,
  Zap,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const BottomPanel: React.FC = () => {
  const isBottomPanelOpen = useUIStore((s) => s.isBottomPanelOpen);
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel);
  const selectTask = useUIStore((s) => s.selectTask);

  const events = useSimulationStore((s) => s.events);
  const urgentQueueTasks = useSimulationStore((s) => s.urgentQueueTasks);
  const normalQueueTasks = useSimulationStore((s) => s.normalQueueTasks);

  const [activeTab, setActiveTab] = useState<'events' | 'queue'>('events');
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'success'>('all');
  const [isMaximized, setIsMaximized] = useState(false);

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.severity === filter;
  });

  return (
    <footer
      className={`bg-warehouse-darker border-t border-warehouse-border transition-all duration-300 flex flex-col z-20 shrink-0 select-none ${
        !isBottomPanelOpen ? 'h-8' : isMaximized ? 'h-96' : 'h-52'
      }`}
    >
      {/* Header bar */}
      <div className="h-8 px-4 flex items-center justify-between bg-warehouse-card/70 border-b border-warehouse-border text-xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center space-x-1.5 py-1 px-2 rounded font-mono transition ${
              activeTab === 'events'
                ? 'text-cyan-400 bg-cyan-500/10 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>EVENT TIMELINE ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center space-x-1.5 py-1 px-2 rounded font-mono transition ${
              activeTab === 'queue'
                ? 'text-cyan-400 bg-cyan-500/10 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>
              TASK QUEUES ({urgentQueueTasks.length} Urgent / {normalQueueTasks.length} Standard)
            </span>
          </button>
        </div>

        {/* Right side of header: filters and collapse toggle */}
        <div className="flex items-center space-x-3">
          {activeTab === 'events' && isBottomPanelOpen && (
            <div className="flex items-center space-x-1 text-[11px] font-mono">
              {(['all', 'error', 'warning', 'success'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-1.5 py-0.5 rounded uppercase ${
                    filter === f ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {isBottomPanelOpen && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore Panel Height' : 'Maximize Panel Height'}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-warehouse-border transition"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={toggleBottomPanel}
            title={isBottomPanelOpen ? 'Collapse Bottom Panel' : 'Expand Bottom Panel'}
            className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-warehouse-border"
          >
            {isBottomPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Body */}
      {isBottomPanelOpen && (
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1.5 bg-warehouse-darker/60">
          {activeTab === 'events' ? (
            filteredEvents.length === 0 ? (
              <div className="text-gray-500 italic p-2">No matching events logged.</div>
            ) : (
              [...filteredEvents].reverse().map((event) => (
                <div
                  key={event.id}
                  className={`flex items-start space-x-2.5 p-1.5 rounded transition ${
                    event.severity === 'error'
                      ? 'bg-red-950/30 text-red-300 border-l-2 border-red-500'
                      : event.severity === 'warning'
                      ? 'bg-amber-950/30 text-amber-300 border-l-2 border-amber-500'
                      : event.severity === 'success'
                      ? 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500'
                      : 'bg-warehouse-card/40 text-gray-300 border-l-2 border-cyan-500'
                  }`}
                >
                  <span className="text-gray-500 text-[10px] shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold shrink-0 uppercase text-[10px] tracking-wider">
                    [{event.type.replace('_', ' ')}]
                  </span>
                  <span className="flex-1">{event.message}</span>
                </div>
              ))
            )
          ) : (
            /* Queue tab */
            <div className="grid grid-cols-2 gap-3 h-full">
              {/* Urgent Priority Queue */}
              <div className="bg-warehouse-card/60 p-2.5 rounded-lg border border-warehouse-border overflow-y-auto">
                <div className="flex items-center space-x-2 text-red-400 font-bold mb-2 pb-1 border-b border-warehouse-border">
                  <Zap className="w-3.5 h-3.5" />
                  <span>PRIORITY QUEUE (Min-Heap: {urgentQueueTasks.length})</span>
                </div>
                {urgentQueueTasks.length === 0 ? (
                  <div className="text-gray-500 italic">No urgent tasks waiting in heap.</div>
                ) : (
                  urgentQueueTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => selectTask(task.id)}
                      className="w-full text-left p-1.5 mb-1 rounded bg-red-950/20 border border-red-900/40 text-red-200 flex justify-between items-center hover:bg-red-900/30 transition"
                    >
                      <span>{task.id} ({task.payloadName})</span>
                      <span className="text-[9px] bg-red-500/30 px-1 py-0.5 rounded font-bold">
                        {task.priority.toUpperCase()}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Standard FIFO Queue */}
              <div className="bg-warehouse-card/60 p-2.5 rounded-lg border border-warehouse-border overflow-y-auto">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold mb-2 pb-1 border-b border-warehouse-border">
                  <Clock className="w-3.5 h-3.5" />
                  <span>STANDARD FIFO QUEUE ({normalQueueTasks.length})</span>
                </div>
                {normalQueueTasks.length === 0 ? (
                  <div className="text-gray-500 italic">Standard task queue is empty.</div>
                ) : (
                  normalQueueTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => selectTask(task.id)}
                      className="w-full text-left p-1.5 mb-1 rounded bg-cyan-950/20 border border-cyan-900/40 text-cyan-200 flex justify-between items-center hover:bg-cyan-900/30 transition"
                    >
                      <span>{task.id} ({task.payloadName})</span>
                      <span className="text-[9px] bg-cyan-500/30 px-1 py-0.5 rounded">
                        {task.priority.toUpperCase()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </footer>
  );
};
