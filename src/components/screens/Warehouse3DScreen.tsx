import React, { useState } from 'react';
import {
  Cuboid,
  Maximize2,
  Minimize2,
  Compass,
  Eye,
  Camera,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Zap,
  Bot,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Navigation,
  Crosshair,
  Columns2,
  Boxes,
} from 'lucide-react';
import { Warehouse3DScene } from '../3d/Warehouse3DScene';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore, CameraMode } from '../../store/useUIStore';

export const Warehouse3DScreen: React.FC = () => {
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
  const activeScenario = useSimulationStore((s) => s.activeScenario);
  const engine = useSimulationStore((s) => s.engine);
  const syncState = useSimulationStore((s) => s.syncState);

  const cameraMode = useUIStore((s) => s.cameraMode);
  const setCameraMode = useUIStore((s) => s.setCameraMode);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const selectRobot = useUIStore((s) => s.selectRobot);
  const isFreeView = useUIStore((s) => s.isFreeView);
  const toggleFreeView = useUIStore((s) => s.toggleFreeView);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);
  const layers = useUIStore((s) => s.layers);
  const toggleLayer = useUIStore((s) => s.toggleLayer);

  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedRobot = robots.find((r) => r.id === selectedRobotId);
  const activeRobotsCount = robots.filter((r) => r.state !== 'idle' && r.state !== 'breakdown').length;
  const pendingTasksCount = tasks.filter((t) => t.status === 'queued' || t.status === 'allocated' || t.status === 'in_progress').length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  const handleCameraChange = (mode: CameraMode) => {
    setCameraMode(mode);
    if (mode === 'top_down') {
      setViewMode('3d');
    }
  };

  const handleToggleHalt = () => {
    if (!selectedRobot) return;
    if (selectedRobot.state === 'breakdown') {
      useSimulationStore.getState().repairRobot(selectedRobot.id);
    } else {
      useSimulationStore.getState().triggerBreakdown(selectedRobot.id);
    }
  };

  const handleSendToHome = () => {
    if (!selectedRobot) return;
    engine.sendRobotToWaiting(selectedRobot);
    syncState();
  };

  const handleSendToCharge = () => {
    if (!selectedRobot) return;
    engine.sendRobotToHomeDock(selectedRobot);
    syncState();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#060B14] select-none text-[#E7F4FF]">
      {/* Top Floating Operations HUD */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: View Identity & Camera Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              WAREBOTS 3D // DIGITAL TWIN
            </span>
            <span className="text-[10px] bg-[#00E5FF]/10 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/20 font-mono">
              THREE.JS SPATIAL ENGINE
            </span>
          </div>

          {/* Camera Mode Pills */}
          <div className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] p-1 rounded-xl shadow-2xl flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => handleCameraChange('orbit')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                cameraMode === 'orbit' && viewMode !== 'isometric'
                  ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/30'
                  : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Orbit</span>
            </button>
            <button
              onClick={() => handleCameraChange('top_down')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                cameraMode === 'top_down'
                  ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/30'
                  : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Top-Down</span>
            </button>
            <button
              onClick={() => {
                setViewMode('isometric');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                viewMode === 'isometric'
                  ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/30'
                  : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
              }`}
            >
              <Cuboid className="w-3.5 h-3.5" />
              <span>Isometric</span>
            </button>
            <button
              onClick={() => {
                if (!selectedRobotId && robots.length > 0) {
                  selectRobot(robots[0].id);
                }
                handleCameraChange('follow_robot');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                cameraMode === 'follow_robot'
                  ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/30'
                  : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Follow AGV</span>
            </button>
          </div>

          {/* Quick AGV Selector if Follow Mode is active */}
          {cameraMode === 'follow_robot' && (
            <div className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1 text-xs font-mono">
              <Bot className="w-3.5 h-3.5 text-[#00E5FF]" />
              <select
                value={selectedRobotId || ''}
                onChange={(e) => selectRobot(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                {robots.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0B1220] text-white">
                    {r.name} ({r.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Quick Screen Switchers & Layer Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Layer Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsLayersOpen(!isLayersOpen)}
              className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 text-xs font-mono text-[#7F9BB8] hover:text-white hover:border-[#00E5FF]/40 transition"
            >
              <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Layers</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isLayersOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#0B1220]/98 backdrop-blur-md border border-[#1E2C42] rounded-xl p-2.5 shadow-2xl space-y-1.5 text-xs font-mono z-30">
                <div className="text-[10px] text-[#7F9BB8] px-2 py-1 font-bold uppercase tracking-wider">
                  3D Visualization Layers
                </div>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#101E32] cursor-pointer">
                  <span>Robot Paths</span>
                  <input
                    type="checkbox"
                    checked={layers.paths}
                    onChange={() => toggleLayer('paths')}
                    className="accent-[#00E5FF]"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#101E32] cursor-pointer">
                  <span>Floor Grid</span>
                  <input
                    type="checkbox"
                    checked={layers.grid}
                    onChange={() => toggleLayer('grid')}
                    className="accent-[#00E5FF]"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#101E32] cursor-pointer">
                  <span>Robots</span>
                  <input
                    type="checkbox"
                    checked={layers.robots}
                    onChange={() => toggleLayer('robots')}
                    className="accent-[#00E5FF]"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Quick Switch to 2D Tactical View */}
          <button
            onClick={() => setActiveScreen('simulation')}
            title="Switch to 2D Tactical Map"
            className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 text-xs font-mono text-[#7F9BB8] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2D Tactical</span>
          </button>

          {/* Quick Switch to Pane View */}
          <button
            onClick={() => setActiveScreen('pane_view')}
            title="Switch to Multi-Pane Workstation (2D + 3D Synchronized)"
            className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 text-xs font-mono text-[#7F9BB8] hover:text-[#00E5FF] hover:border-[#00E5FF]/40 transition"
          >
            <Columns2 className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="hidden sm:inline">Pane View</span>
          </button>
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div className="flex-1 w-full h-full relative">
        <Warehouse3DScene />
      </div>

      {/* Floating Selected AGV Telemetry Card (Bottom Left) */}
      {selectedRobot && (
        <div className="absolute bottom-16 left-4 z-20 w-80 bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] rounded-2xl p-4 shadow-2xl font-mono text-xs space-y-3 pointer-events-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2C42]">
            <div className="flex items-center space-x-2">
              <span
                className="w-3.5 h-3.5 rounded-full ring-2 ring-[#00E5FF]/50"
                style={{ backgroundColor: selectedRobot.color }}
              />
              <span className="font-bold text-white text-sm">{selectedRobot.name}</span>
              <span className="text-[10px] text-[#7F9BB8]">({selectedRobot.id})</span>
            </div>
            <button
              onClick={() => selectRobot(null)}
              className="text-[#7F9BB8] hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#101E32] p-2 rounded-xl">
              <div className="text-[#7F9BB8] text-[9px]">OPERATIONAL STATE</div>
              <div className="font-bold text-[#00E5FF] uppercase mt-0.5">
                {selectedRobot.state.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-[#101E32] p-2 rounded-xl">
              <div className="text-[#7F9BB8] text-[9px]">BATTERY CHARGE</div>
              <div className="font-bold text-white mt-0.5 flex items-center justify-between">
                <span>{selectedRobot.battery.toFixed(0)}%</span>
                <span className="text-[9px] text-[#00F5A0]">Normal</span>
              </div>
            </div>
          </div>

          <div className="bg-[#101E32] p-2 rounded-xl text-[11px] space-y-1">
            <div className="flex justify-between text-[#7F9BB8] text-[9px]">
              <span>COORDINATES</span>
              <span>CARGO</span>
            </div>
            <div className="flex justify-between text-white font-bold">
              <span>
                X: {selectedRobot.position.x.toFixed(1)} | Z: {selectedRobot.position.z.toFixed(1)}
              </span>
              <span>{selectedRobot.cargoCount} / 3 Crates</span>
            </div>
          </div>

          {/* Quick AGV Commands */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={handleToggleHalt}
              className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] transition ${
                selectedRobot.state === 'breakdown'
                  ? 'bg-[#00F5A0] text-black hover:bg-[#00F5A0]/80'
                  : 'bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/40 hover:bg-[#FF3D71]/30'
              }`}
            >
              {selectedRobot.state === 'breakdown' ? 'Repair & Release' : 'Emergency Stall'}
            </button>
            <button
              onClick={handleSendToCharge}
              className="flex-1 py-1.5 rounded-lg font-bold text-[10px] bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/40 hover:bg-[#FFB020]/30 transition"
            >
              Send to Charge
            </button>
            <button
              onClick={handleSendToHome}
              className="py-1.5 px-2.5 rounded-lg font-bold text-[10px] bg-[#101E32] text-[#7F9BB8] hover:text-white border border-[#1E2C42] transition"
            >
              Dock
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Operations Control Strip */}
      <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
        {/* Playback Controls & Sim Clock */}
        <div className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto font-mono text-xs">
          <button
            onClick={toggleRunning}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
              isRunning
                ? 'bg-[#FFB020] text-black shadow-md shadow-[#FFB020]/20'
                : 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Pause' : 'Play'}</span>
          </button>

          <div className="flex items-center space-x-1 bg-[#101E32] p-1 rounded-xl">
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

          <div className="text-[#7F9BB8] pl-2 border-l border-[#1E2C42] flex items-center gap-2">
            <span>CLOCK:</span>
            <span className="text-white font-bold">{formatTime(simulationTime)}</span>
          </div>
        </div>

        {/* Live Simulation Stats Pills */}
        <div className="hidden md:flex items-center gap-2 pointer-events-auto font-mono text-xs">
          <div className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-3 py-2 rounded-2xl shadow-2xl flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="text-[#7F9BB8]">ACTIVE AGVS:</span>
            <span className="text-white font-bold">{activeRobotsCount} / {robots.length}</span>
          </div>

          <div className="bg-[#0B1220]/95 backdrop-blur-md border border-[#1E2C42] px-3 py-2 rounded-2xl shadow-2xl flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#00F5A0]" />
            <span className="text-[#7F9BB8]">DELIVERIES:</span>
            <span className="text-[#00F5A0] font-bold">{metrics.tasksCompleted}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
