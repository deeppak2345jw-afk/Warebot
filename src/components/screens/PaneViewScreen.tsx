import React, { useState } from 'react';
import {
  Columns2,
  Rows2,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Zap,
  Bot,
  Package,
  Layers,
  ShieldAlert,
  PlusCircle,
  Activity,
  ArrowRightLeft,
  Boxes,
  Cuboid,
} from 'lucide-react';
import { Warehouse2DCanvas } from '../simulation/Warehouse2DCanvas';
import { Warehouse3DScene } from '../3d/Warehouse3DScene';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore, PaneLayoutMode } from '../../store/useUIStore';

export const PaneViewScreen: React.FC = () => {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const toggleRunning = useSimulationStore((s) => s.toggleRunning);
  const speedMultiplier = useSimulationStore((s) => s.speedMultiplier);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const step = useSimulationStore((s) => s.step);
  const reset = useSimulationStore((s) => s.reset);
  const simulationTime = useSimulationStore((s) => s.simulationTime);
  const robots = useSimulationStore((s) => s.robots);
  const tasks = useSimulationStore((s) => s.tasks);
  const metrics = useSimulationStore((s) => s.metrics);

  const paneLayout = useUIStore((s) => s.paneLayout);
  const setPaneLayout = useUIStore((s) => s.setPaneLayout);
  const setEmergencyModalOpen = useUIStore((s) => s.setEmergencyModalOpen);
  const setCreateTaskModalOpen = useUIStore((s) => s.setCreateTaskModalOpen);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const selectRobot = useUIStore((s) => s.selectRobot);
  const [pipSwapped, setPipSwapped] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  const activeRobots = robots.filter((r) => r.state !== 'idle' && r.state !== 'breakdown');
  const pendingTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'allocated' || t.status === 'in_progress');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060B14] select-none text-[#E7F4FF]">
      {/* Synchronized Workstation Top Bar */}
      <div className="h-12 bg-[#0B1220]/95 backdrop-blur-md border-b border-[#1E2C42] px-4 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        {/* Left: Branding & Multi-Pane Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <span className="font-bold text-white tracking-wider">
              WAREBOTS // MULTI-PANE COMMAND
            </span>
          </div>
          <span className="hidden sm:inline-block text-[10px] bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/20">
            SYNCHRONIZED DUAL-VIEW
          </span>
        </div>

        {/* Center: Layout Mode Switchers */}
        <div className="flex items-center space-x-1 bg-[#101E32] p-1 rounded-xl border border-[#1E2C42]">
          <button
            onClick={() => setPaneLayout('split_horizontal')}
            title="Split Horizontal (Side-by-Side: 2D Tactical + 3D Twin)"
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              paneLayout === 'split_horizontal'
                ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                : 'text-[#7F9BB8] hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Side-by-Side</span>
          </button>

          <button
            onClick={() => setPaneLayout('split_vertical')}
            title="Split Vertical (Top & Bottom: 2D Tactical + 3D Twin)"
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              paneLayout === 'split_vertical'
                ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                : 'text-[#7F9BB8] hover:text-white'
            }`}
          >
            <Rows2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Stacked</span>
          </button>

          <button
            onClick={() => setPaneLayout('pip')}
            title="Picture-in-Picture Mode"
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              paneLayout === 'pip'
                ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                : 'text-[#7F9BB8] hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Picture-in-Picture</span>
          </button>
        </div>

        {/* Right: Quick Telemetry Clock & Dispatch */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 text-[#7F9BB8]">
            <span>SIM CLOCK:</span>
            <span className="text-white font-bold">{formatTime(simulationTime)}</span>
          </div>

          <button
            onClick={() => setCreateTaskModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold shadow-md shadow-[#00E5FF]/20 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Dispatch Order</span>
          </button>
        </div>
      </div>

      {/* Main Dual Viewport Canvas Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Split Horizontal Layout */}
        {paneLayout === 'split_horizontal' && (
          <div className="flex-1 flex flex-col md:flex-row w-full h-full overflow-hidden">
            {/* Left Pane: 2D Tactical Map */}
            <div className="flex-1 h-1/2 md:h-full relative border-b md:border-b-0 md:border-r border-[#1E2C42]">
              <div className="absolute top-2 left-2 z-10 bg-[#0B1220]/90 backdrop-blur-md border border-[#1E2C42] px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#00E5FF] font-bold flex items-center gap-1.5 shadow-lg">
                <Boxes className="w-3 h-3" />
                <span>PANE 1: 2D TACTICAL GRID</span>
              </div>
              <Warehouse2DCanvas />
            </div>

            {/* Right Pane: 3D Spatial Digital Twin */}
            <div className="flex-1 h-1/2 md:h-full relative">
              <div className="absolute top-2 left-2 z-10 bg-[#0B1220]/90 backdrop-blur-md border border-[#1E2C42] px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#00E5FF] font-bold flex items-center gap-1.5 shadow-lg">
                <Cuboid className="w-3 h-3" />
                <span>PANE 2: 3D SPATIAL DIGITAL TWIN</span>
              </div>
              <Warehouse3DScene />
            </div>
          </div>
        )}

        {/* Split Vertical Layout */}
        {paneLayout === 'split_vertical' && (
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
            {/* Top Pane: 2D Tactical Map */}
            <div className="flex-1 h-1/2 relative border-b border-[#1E2C42]">
              <div className="absolute top-2 left-2 z-10 bg-[#0B1220]/90 backdrop-blur-md border border-[#1E2C42] px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#00E5FF] font-bold flex items-center gap-1.5 shadow-lg">
                <Boxes className="w-3 h-3" />
                <span>PANE 1: 2D TACTICAL GRID</span>
              </div>
              <Warehouse2DCanvas />
            </div>

            {/* Bottom Pane: 3D Spatial Digital Twin */}
            <div className="flex-1 h-1/2 relative">
              <div className="absolute top-2 left-2 z-10 bg-[#0B1220]/90 backdrop-blur-md border border-[#1E2C42] px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#00E5FF] font-bold flex items-center gap-1.5 shadow-lg">
                <Cuboid className="w-3 h-3" />
                <span>PANE 2: 3D SPATIAL DIGITAL TWIN</span>
              </div>
              <Warehouse3DScene />
            </div>
          </div>
        )}

        {/* Picture-in-Picture Layout */}
        {paneLayout === 'pip' && (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            {/* Primary View */}
            <div className="w-full h-full">
              {pipSwapped ? <Warehouse3DScene /> : <Warehouse2DCanvas />}
            </div>

            {/* Floating PiP View Window */}
            <div className="absolute bottom-16 right-4 w-96 h-64 bg-[#060B14] rounded-2xl border-2 border-[#00E5FF]/60 shadow-2xl overflow-hidden z-20 transition-all flex flex-col">
              <div className="bg-[#0B1220] px-3 py-1.5 border-b border-[#1E2C42] flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold text-[#00E5FF] flex items-center gap-1.5">
                  {pipSwapped ? <Boxes className="w-3 h-3" /> : <Cuboid className="w-3 h-3" />}
                  <span>{pipSwapped ? '2D Tactical PiP' : '3D Digital Twin PiP'}</span>
                </span>
                <button
                  onClick={() => setPipSwapped(!pipSwapped)}
                  title="Swap Main and PiP Views"
                  className="text-[#7F9BB8] hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#101E32]"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Swap</span>
                </button>
              </div>
              <div className="flex-1 relative">
                {pipSwapped ? <Warehouse2DCanvas /> : <Warehouse3DScene />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Bottom Telemetry Bar */}
      <div className="h-12 bg-[#0B1220]/95 backdrop-blur-md border-t border-[#1E2C42] px-4 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        {/* Playback Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleRunning}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl font-bold transition ${
              isRunning
                ? 'bg-[#FFB020] text-black shadow-md shadow-[#FFB020]/20'
                : 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Pause' : 'Play'}</span>
          </button>

          <div className="flex items-center space-x-1 bg-[#101E32] p-1 rounded-xl border border-[#1E2C42]">
            {[0.5, 1.0, 2.0, 4.0, 8.0].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  speedMultiplier === s
                    ? 'bg-[#00E5FF] text-black'
                    : 'text-[#7F9BB8] hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Fleet & Pipeline Metrics */}
        <div className="hidden sm:flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Bot className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="text-[#7F9BB8]">FLEET:</span>
            <span className="text-white font-bold">{activeRobots.length} active</span>
          </div>

          <div className="flex items-center space-x-2">
            <Package className="w-3.5 h-3.5 text-[#9B5CFF]" />
            <span className="text-[#7F9BB8]">PIPELINE:</span>
            <span className="text-white font-bold">{pendingTasks.length} queued</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#7F9BB8]">COMPLETED:</span>
            <span className="text-[#00F5A0] font-bold">{metrics.tasksCompleted}</span>
          </div>
        </div>

        {/* Emergency Stop Button */}
        <div>
          <button
            onClick={() => setEmergencyModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/40 hover:bg-[#FF3D71]/30 font-bold transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Protocol</span>
          </button>
        </div>
      </div>
    </div>
  );
};
