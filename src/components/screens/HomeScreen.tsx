import React from 'react';
import {
  Boxes,
  Play,
  Zap,
  ArrowDownToLine,
  ListTodo,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Bot,
  Package,
  Layers,
  Cpu,
  ArrowRight,
  Cuboid,
  Columns2,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSimulationStore } from '../../store/useSimulationStore';

export const HomeScreen: React.FC = () => {
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);
  const selectRobot = useUIStore((s) => s.selectRobot);

  const start = useSimulationStore((s) => s.start);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const robots = useSimulationStore((s) => s.robots);
  const tasks = useSimulationStore((s) => s.tasks);
  const chargingStations = useSimulationStore((s) => s.chargingStations);
  const deliveryNodes = useSimulationStore((s) => s.deliveryNodes);
  const metrics = useSimulationStore((s) => s.metrics);
  const events = useSimulationStore((s) => s.events);
  const isRunning = useSimulationStore((s) => s.isRunning);

  const activeRobots = robots.filter((r) => r.state !== 'idle' && r.state !== 'breakdown');
  const availableChargers = chargingStations.filter((c) => !c.isOccupied);
  const pendingTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'allocated' || t.status === 'in_progress');
  const recentAlerts = events.filter((e) => e.severity === 'error' || e.severity === 'warning').slice(-5);

  const handleLaunchSimulation = () => {
    setActiveScreen('simulation');
    if (!isRunning) start();
  };

  const handleLaunch3D = () => {
    setActiveScreen('three_d');
    if (!isRunning) start();
  };

  const handleLaunchPaneView = () => {
    setActiveScreen('pane_view');
    if (!isRunning) start();
  };

  const handleLaunchScenario = (scenId: string) => {
    loadScenario(scenId);
    setActiveScreen('simulation');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#050914] text-[#E7F4FF] select-none p-6 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#183653]">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono mb-2">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
            <span>WAREBOTS // AUTONOMOUS WAREHOUSE COMMAND v2.0</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight font-mono">
            OPERATIONS COMMAND CENTER
          </h1>
          <p className="text-xs md:text-sm text-[#7F9BB8] mt-1 font-sans max-w-2xl leading-relaxed">
            Real-time multi-agent autonomous warehouse simulation platform. Intelligent task scheduling, dynamic A* and Dijkstra pathfinding, spatial 3D digital twins, and collision-free fleet coordination.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <button
            onClick={handleLaunchSimulation}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold shadow-lg shadow-[#00E5FF]/20 transition transform hover:-translate-y-0.5"
          >
            <Boxes className="w-4 h-4" />
            <span>Main Warehouse (2D)</span>
          </button>

          <button
            onClick={handleLaunch3D}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#101E32] hover:bg-[#183653] border border-[#00E5FF]/40 text-[#00E5FF] font-bold shadow-lg transition transform hover:-translate-y-0.5"
          >
            <Cuboid className="w-4 h-4" />
            <span>3D Digital Twin</span>
          </button>

          <button
            onClick={handleLaunchPaneView}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#101E32] hover:bg-[#183653] border border-[#183653] text-white font-bold transition transform hover:-translate-y-0.5"
          >
            <Columns2 className="w-4 h-4 text-[#9B5CFF]" />
            <span>Pane View</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0B1728] p-4 rounded-2xl border border-[#183653] space-y-2">
          <div className="flex items-center justify-between text-[#7F9BB8] text-xs">
            <span>ACTIVE AGV FLEET</span>
            <Bot className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-2">
            <span>{activeRobots.length}</span>
            <span className="text-xs font-normal text-[#7F9BB8]">/ {robots.length} online</span>
          </div>
          <div className="text-[11px] text-[#00F5A0] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{robots.filter((r) => r.state === 'idle').length} idle & available</span>
          </div>
        </div>

        <div className="bg-[#0B1728] p-4 rounded-2xl border border-[#183653] space-y-2">
          <div className="flex items-center justify-between text-[#7F9BB8] text-xs">
            <span>CHARGING BAYS</span>
            <Zap className="w-4 h-4 text-[#FFB020]" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-2">
            <span>{availableChargers.length}</span>
            <span className="text-xs font-normal text-[#7F9BB8]">/ {chargingStations.length} open</span>
          </div>
          <div className="text-[11px] text-[#00E5FF]">
            Avg Fleet Battery: {metrics.averageBatteryLevel}%
          </div>
        </div>

        <div className="bg-[#0B1728] p-4 rounded-2xl border border-[#183653] space-y-2">
          <div className="flex items-center justify-between text-[#7F9BB8] text-xs">
            <span>TASK PIPELINE</span>
            <ListTodo className="w-4 h-4 text-[#9B5CFF]" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-2">
            <span>{pendingTasks.length}</span>
            <span className="text-xs font-normal text-[#7F9BB8]">active</span>
          </div>
          <div className="text-[11px] text-[#00F5A0]">
            {metrics.tasksCompleted} deliveries fulfilled
          </div>
        </div>

        <div className="bg-[#0B1728] p-4 rounded-2xl border border-[#183653] space-y-2">
          <div className="flex items-center justify-between text-[#7F9BB8] text-xs">
            <span>TRANSIT EFFICIENCY</span>
            <TrendingUp className="w-4 h-4 text-[#00F5A0]" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-2">
            <span>{metrics.totalDistanceTraveled.toFixed(0)}m</span>
            <span className="text-xs font-normal text-[#7F9BB8]">total dist</span>
          </div>
          <div className="text-[11px] text-[#7F9BB8]">
            Congestion: <span className="text-[#00E5FF]">{metrics.congestion.level}</span>
          </div>
        </div>
      </div>

      {/* Main Command Workstation Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div
          onClick={handleLaunchSimulation}
          className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] hover:border-[#00E5FF]/60 cursor-pointer transition space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#00E5FF] group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Launch</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <div className="text-white font-bold text-sm group-hover:text-[#00E5FF] transition">
              Main Warehouse
            </div>
            <p className="text-[#7F9BB8] text-[11px] font-sans mt-1 leading-relaxed">
              Tactical 2D bird's-eye view with live node coordinates, layer filters, real-time routing trails, and obstacle placement.
            </p>
          </div>
        </div>

        <div
          onClick={handleLaunch3D}
          className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] hover:border-[#00E5FF]/60 cursor-pointer transition space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
              <Cuboid className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#00E5FF] group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Launch</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <div className="text-white font-bold text-sm group-hover:text-[#00E5FF] transition">
              3D Digital Twin
            </div>
            <p className="text-[#7F9BB8] text-[11px] font-sans mt-1 leading-relaxed">
              Immersive spatial Three.js scene with dynamic shadows, orbit camera modes, Follow AGV mode, and live shelf inventory models.
            </p>
          </div>
        </div>

        <div
          onClick={handleLaunchPaneView}
          className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] hover:border-[#9B5CFF]/60 cursor-pointer transition space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#9B5CFF]/10 border border-[#9B5CFF]/30 flex items-center justify-center text-[#9B5CFF]">
              <Columns2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-[#9B5CFF] group-hover:translate-x-1 transition flex items-center gap-1">
              <span>Launch</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <div className="text-white font-bold text-sm group-hover:text-[#9B5CFF] transition">
              Pane View
            </div>
            <p className="text-[#7F9BB8] text-[11px] font-sans mt-1 leading-relaxed">
              Synchronized command workstation with simultaneous 2D Tactical and 3D Twin side-by-side or stacked in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Robots Roster + Live Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Fleet Monitor */}
        <div className="lg:col-span-2 bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Bot className="w-4 h-4 text-[#00E5FF]" />
              <span>ACTIVE FLEET TELEMETRY</span>
            </div>
            <button
              onClick={() => setActiveScreen('robots')}
              className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1"
            >
              <span>Manage Fleet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {robots.map((robot) => (
              <div
                key={robot.id}
                onClick={() => {
                  selectRobot(robot.id);
                  setActiveScreen('simulation');
                }}
                className="p-3 bg-[#101E32] hover:border-[#00E5FF]/50 border border-[#183653] rounded-xl cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: robot.color }}
                    />
                    <span className="font-bold text-white group-hover:text-[#00E5FF] transition">
                      {robot.name}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      robot.state === 'breakdown'
                        ? 'bg-[#FF3D71]/20 text-[#FF3D71]'
                        : robot.state === 'charging'
                        ? 'bg-[#FFB020]/20 text-[#FFB020]'
                        : robot.state === 'delivering'
                        ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                        : 'bg-[#267BFF]/20 text-[#267BFF]'
                    }`}
                  >
                    {robot.state.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7F9BB8]">
                  <span>Battery: {robot.battery.toFixed(0)}%</span>
                  <span>Cargo: {robot.cargoCount} / 3</span>
                </div>

                <div className="w-full h-1.5 bg-[#050914] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      robot.battery < 25
                        ? 'bg-[#FF3D71]'
                        : robot.battery < 50
                        ? 'bg-[#FFB020]'
                        : 'bg-[#00E5FF]'
                    }`}
                    style={{ width: `${robot.battery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live System Alerts */}
        <div className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-[#FFB020]" />
              <span>RECENT SYSTEM ALERTS</span>
            </div>
            <span className="text-[10px] text-[#7F9BB8]">Real-time Log</span>
          </div>

          <div className="space-y-2.5">
            {recentAlerts.length === 0 ? (
              <div className="text-[#48627D] italic text-xs py-6 text-center">
                All systems optimal. Zero operational errors.
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                    alert.severity === 'error'
                      ? 'bg-[#FF3D71]/10 border-[#FF3D71]/30 text-[#FF3D71]'
                      : 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold uppercase">[{alert.type}]</span>
                    <span className="text-[#7F9BB8]">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white text-[10px] font-sans leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Launch Scenarios Grid */}
      <div className="bg-[#0B1728] p-6 rounded-2xl border border-[#183653] space-y-4 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Layers className="w-4 h-4 text-[#9B5CFF]" />
            <span>OPERATIONAL SCENARIO PRESETS</span>
          </div>
          <button
            onClick={() => setActiveScreen('scenarios')}
            className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1"
          >
            <span>View All Scenarios</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <button
            onClick={() => handleLaunchScenario('order_rush')}
            className="p-4 rounded-xl bg-[#101E32] hover:border-[#00E5FF]/50 border border-[#183653] text-left transition space-y-2 group"
          >
            <div className="font-bold text-white group-hover:text-[#00E5FF] flex items-center justify-between">
              <span>High-Demand Order Rush</span>
              <span className="text-[10px] bg-[#267BFF]/20 text-[#267BFF] px-2 py-0.5 rounded">MEDIUM</span>
            </div>
            <p className="text-[#7F9BB8] text-[11px] font-sans leading-relaxed">
              Stress-test multi-robot task allocation under a burst of 25 simultaneous picking tasks.
            </p>
          </button>

          <button
            onClick={() => handleLaunchScenario('obstacle_storm')}
            className="p-4 rounded-xl bg-[#101E32] hover:border-[#FFB020]/50 border border-[#183653] text-left transition space-y-2 group"
          >
            <div className="font-bold text-white group-hover:text-[#FFB020] flex items-center justify-between">
              <span>Obstacle Heavy Maze</span>
              <span className="text-[10px] bg-[#FFB020]/20 text-[#FFB020] px-2 py-0.5 rounded">HARD</span>
            </div>
            <p className="text-[#7F9BB8] text-[11px] font-sans leading-relaxed">
              Verify real-time dynamic A* rerouting when multiple central warehouse corridors are blocked.
            </p>
          </button>

          <button
            onClick={() => handleLaunchScenario('breakdown_crisis')}
            className="p-4 rounded-xl bg-[#101E32] hover:border-[#FF3D71]/50 border border-[#183653] text-left transition space-y-2 group"
          >
            <div className="font-bold text-white group-hover:text-[#FF3D71] flex items-center justify-between">
              <span>Robot Breakdown Crisis</span>
              <span className="text-[10px] bg-[#FF3D71]/20 text-[#FF3D71] px-2 py-0.5 rounded">EXTREME</span>
            </div>
            <p className="text-[#7F9BB8] text-[11px] font-sans leading-relaxed">
              Simulate catastrophic drive motor stalls and automatic priority task rescue to standby robots.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
