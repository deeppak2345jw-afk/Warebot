import React, { useState } from 'react';
import {
  AlertTriangle,
  Zap,
  BatteryWarning,
  Flame,
  ShieldAlert,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { EmergencyType } from '../../core/types';

export const EmergencyModal: React.FC = () => {
  const isEmergencyModalOpen = useUIStore((s) => s.isEmergencyModalOpen);
  const setEmergencyModalOpen = useUIStore((s) => s.setEmergencyModalOpen);
  const triggerEmergency = useSimulationStore((s) => s.triggerEmergency);

  if (!isEmergencyModalOpen) return null;

  const handleTrigger = (type: EmergencyType) => {
    triggerEmergency(type);
    setEmergencyModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-warehouse-card border border-red-500/50 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl shadow-red-500/20 animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-warehouse-border">
          <div className="flex items-center space-x-2 text-red-400 font-bold font-mono">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="text-base tracking-wide">EMERGENCY CONTROLS INJECTOR</span>
          </div>
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-warehouse-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-300">
          Inject real-time operational crises into the warehouse environment to test adaptive allocation, priority queue preemption, and autonomous dynamic rerouting.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <button
            onClick={() => handleTrigger('critical_request')}
            className="p-3.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-left space-y-1 transition group"
          >
            <div className="font-bold text-red-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-red-400" />
              <span>Critical Order Rush</span>
            </div>
            <div className="text-[11px] text-gray-400 font-sans">
              Injects emergency priority delivery into Min-Heap queue.
            </div>
          </button>

          <button
            onClick={() => handleTrigger('robot_breakdown')}
            className="p-3.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-left space-y-1 transition group"
          >
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Robot Motor Stall</span>
            </div>
            <div className="text-[11px] text-gray-400 font-sans">
              Halts an active AGV and automatically reassigns its cargo.
            </div>
          </button>

          <button
            onClick={() => handleTrigger('battery_failure')}
            className="p-3.5 rounded-xl bg-yellow-950/40 hover:bg-yellow-900/50 border border-yellow-800/60 text-left space-y-1 transition group"
          >
            <div className="font-bold text-yellow-300 flex items-center gap-1.5">
              <BatteryWarning className="w-4 h-4 text-yellow-400" />
              <span>Battery Power Failure</span>
            </div>
            <div className="text-[11px] text-gray-400 font-sans">
              Drains AGV battery to 8% to trigger autonomous charging route.
            </div>
          </button>

          <button
            onClick={() => handleTrigger('aisle_closure')}
            className="p-3.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-left space-y-1 transition group"
          >
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Aisle Obstruction</span>
            </div>
            <div className="text-[11px] text-gray-400 font-sans">
              Drops a physical barrier, forcing real-time A* dynamic detour.
            </div>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-warehouse-darker hover:bg-warehouse-border text-gray-400 text-xs font-mono"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
