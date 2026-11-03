import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  PlusCircle,
  AlertTriangle,
  Zap,
  Activity,
  Box,
  Compass,
  ShieldAlert,
  Flame,
  Bug,
  Sliders,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { PathfindingAlgorithmType } from '../../core/types';
import { soundEffects } from '../../utils/soundEffects';

export const TopNavBar: React.FC = () => {
  const [isMuted, setIsMuted] = React.useState<boolean>(soundEffects.isMuted);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const toggleRunning = useSimulationStore((s) => s.toggleRunning);
  const speedMultiplier = useSimulationStore((s) => s.speedMultiplier);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const step = useSimulationStore((s) => s.step);
  const reset = useSimulationStore((s) => s.reset);
  const config = useSimulationStore((s) => s.config);
  const updateConfig = useSimulationStore((s) => s.updateConfig);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const simulationTime = useSimulationStore((s) => s.simulationTime);
  const activeScenario = useSimulationStore((s) => s.activeScenario);
  const scenarioStatus = useSimulationStore((s) => s.scenarioStatus);
  const events = useSimulationStore((s) => s.events);

  const isObstacleMode = useUIStore((s) => s.isObstacleMode);
  const toggleObstacleMode = useUIStore((s) => s.toggleObstacleMode);
  const isDebugMode = useUIStore((s) => s.isDebugMode);
  const toggleDebugMode = useUIStore((s) => s.toggleDebugMode);
  const setEmergencyModalOpen = useUIStore((s) => s.setEmergencyModalOpen);
  const setCreateTaskModalOpen = useUIStore((s) => s.setCreateTaskModalOpen);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };
  const errorCount = events.filter((e) => e.severity === 'error').length;
  let statusText = 'Simulation Running';
  let statusColor = 'bg-[#00F5A0]';

  if (scenarioStatus === 'won') {
    statusText = 'Simulation Complete';
    statusColor = 'bg-[#00E5FF]';
  } else if (scenarioStatus === 'lost') {
    statusText = 'Emergency Mode';
    statusColor = 'bg-[#FF3D71]';
  } else if (!isRunning) {
    statusText = 'Simulation Paused';
    statusColor = 'bg-[#FFB020]';
  } else if (errorCount > 0) {
    statusText = 'System Warning';
    statusColor = 'bg-[#FFB020]';
  }

  const handleScenarioSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setActiveScreen('scenarios');
    } else if (val) {
      loadScenario(val);
    }
  };

  const handleAlgorithmSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const algo = e.target.value as PathfindingAlgorithmType;
    updateConfig({ pathfindingAlgorithm: algo });
  };

  return (
    <header className="h-16 bg-[#060B14]/95 backdrop-blur-md border-b border-[#1E2C42] px-4 flex items-center justify-between z-30 shrink-0 select-none text-[#E7F4FF]">
      {/* Left: Branding & Status Dot */}
      <div className="flex items-center space-x-4">
        {/* Geometric Warebots Logo */}
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveScreen('home')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#267BFF] p-0.5 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#050914] rounded-[10px] flex items-center justify-center">
              <Box className="w-5 h-5 text-[#00E5FF]" />
            </div>
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-wider text-[#00E5FF] font-mono">
              WAREBOTS
            </div>
            <div className="text-[10px] text-[#7F9BB8] font-sans">Smart Warehouse Management</div>
          </div>
        </div>

        {/* Live Simulation Status */}
        <div className="hidden lg:flex items-center space-x-2 bg-[#0B1220] border border-[#1E2C42] px-3 py-1.5 rounded-lg font-mono text-xs">
          <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
          <span className="text-[#E7F4FF] font-semibold">{statusText}</span>
          <span className="text-[10px] text-[#7F9BB8] border-l border-[#1E2C42] pl-2">Autonomous</span>
        </div>

        {/* Sim Clock */}
        <div className="flex items-center space-x-2 bg-[#0B1220] border border-[#1E2C42] px-3 py-1.5 rounded-lg font-mono text-xs">
          <Activity className="w-3.5 h-3.5 text-[#00E5FF] animate-pulse" />
          <span className="text-[#7F9BB8]">TIME:</span>
          <span className="text-[#00E5FF] font-bold">{formatTime(simulationTime)}</span>
        </div>
      </div>

      {/* Center: Controls (Play, Pause, Step, Speeds, Scenario & Algo Dropdowns) */}
      <div className="flex items-center space-x-2">
        {/* Play/Pause & Step Controls */}
        <div className="flex items-center space-x-1.5 bg-[#0B1220] p-1 rounded-xl border border-[#1E2C42]">
          <button
            onClick={toggleRunning}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isRunning
                ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/40 hover:bg-[#FFB020]/30'
                : 'bg-[#00E5FF] text-black hover:bg-[#00E5FF]/80 shadow-md shadow-[#00E5FF]/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RESUME</span>
              </>
            )}
          </button>

          <button
            onClick={step}
            disabled={isRunning}
            title="Step One Tick"
            className="p-1.5 text-[#7F9BB8] hover:text-white disabled:opacity-30 hover:bg-[#101E32] rounded-lg transition"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Speed Selector: 0.5x, 1x, 2x, 4x, 8x */}
          <div className="flex items-center border-l border-[#183653] pl-2 space-x-1 text-xs">
            {[0.5, 1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded font-mono transition text-[11px] ${
                  speedMultiplier === s
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-bold'
                    : 'text-[#7F9BB8] hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={reset}
            title="Reset Simulation"
            className="p-1.5 text-[#7F9BB8] hover:text-[#FF3D71] hover:bg-[#101E32] rounded-lg transition ml-1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Scenario Dropdown */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-[#0B1728] border border-[#183653] px-2 py-1 rounded-xl text-xs font-mono">
          <Layers className="w-3.5 h-3.5 text-[#9B5CFF]" />
          <select
            value={activeScenario?.id || 'normal'}
            onChange={handleScenarioSelect}
            className="bg-transparent text-[#E7F4FF] focus:outline-none cursor-pointer"
          >
            <option value="normal" className="bg-[#0B1728]">Normal Operation</option>
            <option value="order_rush" className="bg-[#0B1728]">High Demand</option>
            <option value="obstacle_storm" className="bg-[#0B1728]">Obstacle Heavy</option>
            <option value="battery_stress" className="bg-[#0B1728]">Low Battery Stress</option>
            <option value="breakdown_crisis" className="bg-[#0B1728]">Emergency Scenario</option>
            <option value="custom" className="bg-[#0B1728]">Custom Scenario...</option>
          </select>
        </div>

        {/* Algorithm Dropdown */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-[#0B1728] border border-[#183653] px-2 py-1 rounded-xl text-xs font-mono">
          <Compass className="w-3.5 h-3.5 text-[#00E5FF]" />
          <select
            value={config.pathfindingAlgorithm}
            onChange={handleAlgorithmSelect}
            className="bg-transparent text-[#E7F4FF] focus:outline-none cursor-pointer"
          >
            <option value="astar" className="bg-[#0B1728]">A* Search</option>
            <option value="dijkstra" className="bg-[#0B1728]">Dijkstra</option>
          </select>
        </div>
      </div>

      {/* Right: Quick Actions, Obstacle Mode, Manual Task, Emergencies, Debug */}
      <div className="flex items-center space-x-2 text-xs font-mono">
        {/* Obstacle Placement Mode */}
        <button
          onClick={toggleObstacleMode}
          title="Toggle Obstacle Mode: click on warehouse aisles to place or remove obstacles"
          className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
            isObstacleMode
              ? 'bg-[#FFB020] text-black font-bold border-[#FFB020] shadow-md shadow-[#FFB020]/30'
              : 'bg-[#0B1728] border-[#183653] text-[#7F9BB8] hover:text-[#E7F4FF]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Obstacle Mode</span>
        </button>

        {/* Create Manual Task Button */}
        <button
          onClick={() => setCreateTaskModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold transition shadow-md shadow-[#00E5FF]/20"
        >
          <PlusCircle className="w-3.5 h-3.5 fill-current" />
          <span>Create Task</span>
        </button>

        {/* Developer Debug Mode Toggle */}
        <button
          onClick={toggleDebugMode}
          title="Toggle Developer Diagnostic Debug Panel"
          className={`p-1.5 rounded-xl border transition ${
            isDebugMode
              ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
              : 'bg-[#0B1728] border-[#183653] text-[#7F9BB8] hover:text-white'
          }`}
        >
          <Bug className="w-4 h-4" />
        </button>

        {/* Audio FX Mute / Unmute Toggle */}
        <button
          onClick={() => {
            const next = soundEffects.toggleMuted();
            setIsMuted(next);
            if (!next) soundEffects.playClick();
          }}
          title={isMuted ? 'Unmute Procedural Audio FX' : 'Mute Procedural Audio FX'}
          className={`p-1.5 rounded-xl border transition ${
            !isMuted
              ? 'bg-[#00E5FF]/15 border-[#00E5FF]/50 text-[#00E5FF]'
              : 'bg-[#0B1728] border-[#183653] text-[#48627D] hover:text-white'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Emergency Injector Button */}
        <button
          onClick={() => setEmergencyModalOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#FF3D71]/15 hover:bg-[#FF3D71]/25 text-[#FF3D71] border border-[#FF3D71]/40 transition"
        >
          <Flame className="w-3.5 h-3.5 text-[#FF3D71] animate-pulse" />
          <span className="hidden md:inline">Emergency</span>
        </button>
      </div>
    </header>
  );
};
