import React from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Package,
  TrendingUp,
  Clock,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const DeliveryNodesScreen: React.FC = () => {
  const deliveryNodes = useSimulationStore((s) => s.deliveryNodes);
  const tasks = useSimulationStore((s) => s.tasks);
  const robots = useSimulationStore((s) => s.robots);

  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex-1 overflow-y-auto bg-[#050914] text-[#E7F4FF] select-none p-6 md:p-8 space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#183653]">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[#00F5A0] text-xs mb-2">
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>DISPATCH & FULFILLMENT DOCKS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            OUTBOUND DELIVERY DOCKS
          </h1>
          <p className="text-xs text-[#7F9BB8] mt-1 font-sans">
            Outbound packing drop-off terminals receiving fulfilled orders from autonomous warehouse AGVs.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-[#0B1728] border border-[#183653] px-3 py-2 rounded-xl text-[#00F5A0]">
            <span>Total Delivered: </span>
            <span className="font-bold text-white">
              {deliveryNodes.reduce((acc, d) => acc + d.completedDeliveries, 0)} packages
            </span>
          </div>
        </div>
      </div>

      {/* 3 Dedicated Delivery Node Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {deliveryNodes.map((node) => {
          const incomingRobots = robots.filter(
            (r) => r.targetDeliveryNodeId === node.id && (r.state === 'moving_to_delivery' || r.state === 'delivering')
          );

          return (
            <div
              key={node.id}
              className="bg-[#0B1728] rounded-2xl border border-[#00F5A0]/30 p-5 space-y-4 shadow-lg shadow-[#00F5A0]/5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00F5A0]/20 text-[#00F5A0] flex items-center justify-center">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-base text-white">{node.name}</div>
                    <div className="text-[10px] text-[#7F9BB8]">
                      Node ({node.coord.x}, {node.coord.y})
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/40">
                  {node.status}
                </span>
              </div>

              {/* Total Deliveries Metric */}
              <div className="bg-[#101E32] p-3 rounded-xl border border-[#183653] space-y-1">
                <div className="text-[10px] text-[#7F9BB8]">DELIVERIES FULFILLED</div>
                <div className="text-2xl font-bold text-[#00F5A0]">
                  {node.completedDeliveries} packages
                </div>
              </div>

              {/* Incoming AGVs */}
              <div className="bg-[#101E32] p-3 rounded-xl border border-[#183653] space-y-2">
                <div className="text-[10px] text-[#7F9BB8] flex items-center justify-between">
                  <span>INCOMING AGV COURIERS</span>
                  <span className="text-[#00E5FF] font-bold">{incomingRobots.length} active</span>
                </div>

                {incomingRobots.length > 0 ? (
                  <div className="space-y-1.5">
                    {incomingRobots.map((rob) => (
                      <div
                        key={rob.id}
                        className="p-1.5 bg-[#0B1728] rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: rob.color }}
                          />
                          <span className="text-white">{rob.name}</span>
                        </div>
                        <span className="text-[#00F5A0] text-[10px]">
                          {rob.cargoCount} items
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#48627D] italic text-[11px] py-1">
                    No robots currently inbound.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Deliveries Feed */}
      <div className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#00F5A0]" />
            <span>RECENTLY FULFILLED ORDERS ({completedTasks.length})</span>
          </div>
          <span className="text-xs text-[#7F9BB8]">Audit Log</span>
        </div>

        {completedTasks.length === 0 ? (
          <div className="text-[#48627D] italic text-xs py-6 text-center">
            No deliveries completed yet. Create and dispatch picking tasks to see fulfillment logs.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {completedTasks.slice(-10).reverse().map((task) => (
              <div
                key={task.id}
                className="p-3 bg-[#101E32] rounded-xl border border-[#183653] flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{task.id}</span>
                    <span className="text-[#00E5FF]">{task.payloadName}</span>
                    {task.isSubtask && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#9B5CFF]/20 text-[#9B5CFF] rounded">
                        Subtask {task.subtaskIndex}/{task.totalSubtasks}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#7F9BB8]">
                    From Shelf {task.shelfId} → Delivered to {task.deliveryNodeId}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[#00F5A0] font-bold">Delivered</div>
                  <span className="text-[10px] text-[#7F9BB8]">
                    Courier: {task.assignedRobotId || 'AGV'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
