import React, { useState } from 'react';
import {
  Bot,
  Battery,
  BatteryCharging,
  AlertOctagon,
  Wrench,
  Camera,
  Search,
  Filter,
  Activity,
  Zap,
  CheckCircle2,
  Boxes,
  Cuboid,
  Home,
  ArrowRight,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const FleetScreen: React.FC = () => {
  const robots = useSimulationStore((s) => s.robots);
  const chargingStations = useSimulationStore((s) => s.chargingStations);
  const repairRobot = useSimulationStore((s) => s.repairRobot);
  const triggerBreakdown = useSimulationStore((s) => s.triggerBreakdown);
  const engine = useSimulationStore((s) => s.engine);
  const syncState = useSimulationStore((s) => s.syncState);

  const selectRobot = useUIStore((s) => s.selectRobot);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);
  const setCameraMode = useUIStore((s) => s.setCameraMode);

  const [filterState, setFilterState] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredRobots = robots.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterState === 'all') return true;
    return r.state === filterState;
  });

  const activeCount = robots.filter((r) => r.state !== 'idle' && r.state !== 'breakdown').length;
  const chargingCount = robots.filter((r) => r.state === 'charging' || r.state === 'going_to_charge').length;
  const stalledCount = robots.filter((r) => r.state === 'breakdown').length;
  const avgBattery = Math.round(robots.reduce((acc, r) => acc + r.battery, 0) / Math.max(1, robots.length));

  const handleInspect2D = (robotId: string) => {
    selectRobot(robotId);
    setActiveScreen('simulation');
  };

  const handleFollow3D = (robotId: string) => {
    selectRobot(robotId);
    setCameraMode('follow_robot');
    setActiveScreen('three_d');
  };

  const handleSendToCharge = (robotId: string) => {
    const robot = engine.robotMap.get(robotId);
    if (!robot) return;
    engine.sendRobotToHomeDock(robot);
    syncState();
  };

  const handleSendToHome = (robotId: string) => {
    const robot = engine.robotMap.get(robotId);
    if (!robot) return;
    engine.sendRobotToWaiting(robot);
    syncState();
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#060B14] text-[#E7F4FF] select-none font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1E2C42] gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-mono mb-1.5">
              <span>WAREBOTS // AGV TELEMETRY & FLEET ROSTER</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
              <Bot className="w-5 h-5 text-[#00E5FF]" />
              <span>AUTONOMOUS GUIDED VEHICLE (AGV) FLEET MANAGEMENT</span>
            </h1>
            <p className="text-xs text-[#7F9BB8] mt-1 leading-relaxed">
              Real-time battery telemetry, spatial coordinates, payload status, motor health, and manual command override.
            </p>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            <button
              onClick={() => setActiveScreen('three_d')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#101E32] hover:bg-[#183653] border border-[#00E5FF]/40 text-[#00E5FF] font-bold transition"
            >
              <Cuboid className="w-3.5 h-3.5" />
              <span>3D Digital Twin</span>
            </button>
            <button
              onClick={() => setActiveScreen('simulation')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold transition shadow-lg shadow-[#00E5FF]/20"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>2D Tactical Map</span>
            </button>
          </div>
        </div>

        {/* 4 Fleet Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42]">
            <div className="flex items-center justify-between text-[#7F9BB8] text-[10px]">
              <span>ACTIVE IN TRANSIT</span>
              <Activity className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">
              {activeCount} <span className="text-xs font-normal text-[#7F9BB8]">/ {robots.length}</span>
            </div>
            <div className="text-[10px] text-[#00F5A0] mt-1">
              {robots.filter((r) => r.state === 'idle').length} idle in standby
            </div>
          </div>

          <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42]">
            <div className="flex items-center justify-between text-[#7F9BB8] text-[10px]">
              <span>FLEET AVG BATTERY</span>
              <BatteryCharging className="w-4 h-4 text-[#FFB020]" />
            </div>
            <div className="text-2xl font-extrabold text-[#FFB020] mt-1">
              {avgBattery}%
            </div>
            <div className="text-[10px] text-[#7F9BB8] mt-1">
              Discharge rate: 0.1%/m
            </div>
          </div>

          <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42]">
            <div className="flex items-center justify-between text-[#7F9BB8] text-[10px]">
              <span>CHARGING IN BAYS</span>
              <Zap className="w-4 h-4 text-[#00F5A0]" />
            </div>
            <div className="text-2xl font-extrabold text-[#00F5A0] mt-1">
              {chargingCount}
            </div>
            <div className="text-[10px] text-[#7F9BB8] mt-1">
              +2.0% charge/second
            </div>
          </div>

          <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#1E2C42]">
            <div className="flex items-center justify-between text-[#7F9BB8] text-[10px]">
              <span>MOTOR STALLS / FAILED</span>
              <AlertOctagon className="w-4 h-4 text-[#FF3D71]" />
            </div>
            <div className="text-2xl font-extrabold text-[#FF3D71] mt-1">
              {stalledCount}
            </div>
            <div className="text-[10px] text-[#7F9BB8] mt-1">
              {stalledCount === 0 ? 'All drivetrains nominal' : 'Attention required'}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0B1220] p-3.5 rounded-2xl border border-[#1E2C42]">
          <div className="relative flex-1 max-w-md font-mono">
            <Search className="w-4 h-4 text-[#7F9BB8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by AGV ID or Name..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#101E32] border border-[#1E2C42] rounded-xl text-xs text-[#E7F4FF] placeholder-[#48627D] focus:outline-none focus:border-[#00E5FF] transition"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[#101E32] p-1 rounded-xl border border-[#1E2C42] text-xs font-mono overflow-x-auto">
            {['all', 'idle', 'moving_to_pickup', 'carrying_item', 'charging', 'breakdown'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-3 py-1 rounded-lg capitalize transition font-bold shrink-0 ${
                  filterState === st
                    ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                    : 'text-[#7F9BB8] hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Fleet Roster Table */}
        <div className="bg-[#0B1220] rounded-2xl border border-[#1E2C42] overflow-hidden font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#060B14] border-b border-[#1E2C42] text-[#7F9BB8] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">AGV Unit</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Battery</th>
                  <th className="p-3.5">Position</th>
                  <th className="p-3.5">Payload</th>
                  <th className="p-3.5">Tasks Done</th>
                  <th className="p-3.5">Distance</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2C42]/50 text-[#E7F4FF]">
                {filteredRobots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-[#48627D] italic">
                      No matching AGV units found.
                    </td>
                  </tr>
                ) : (
                  filteredRobots.map((robot) => (
                    <tr key={robot.id} className="hover:bg-[#101E32] transition">
                      {/* Name & ID */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm ring-2 ring-[#1E2C42]"
                            style={{ backgroundColor: robot.color }}
                          />
                          <div>
                            <div className="font-bold text-white text-xs">{robot.name}</div>
                            <div className="text-[10px] text-[#7F9BB8]">{robot.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            robot.state === 'breakdown'
                              ? 'bg-[#FF3D71]/20 text-[#FF3D71] border-[#FF3D71]/30 animate-pulse'
                              : robot.state === 'charging'
                              ? 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30'
                              : robot.state === 'carrying_item' || robot.state === 'delivering'
                              ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/30'
                              : robot.state === 'moving_to_pickup'
                              ? 'bg-[#267BFF]/20 text-[#267BFF] border-[#267BFF]/30'
                              : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {robot.state.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Battery */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-[#060B14] rounded-full overflow-hidden border border-[#1E2C42]">
                            <div
                              className={`h-full ${
                                robot.battery < 25
                                  ? 'bg-[#FF3D71]'
                                  : robot.battery < 50
                                  ? 'bg-[#FFB020]'
                                  : 'bg-[#00E5FF]'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, robot.battery))}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-bold ${
                              robot.battery < 25 ? 'text-[#FF3D71]' : 'text-[#00E5FF]'
                            }`}
                          >
                            {robot.battery.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="p-3.5 text-[#7F9BB8]">
                        ({robot.gridPosition.x}, {robot.gridPosition.y})
                      </td>

                      {/* Payload */}
                      <td className="p-3.5">
                        {robot.isCarrying ? (
                          <span className="text-[#FFB020] bg-[#FFB020]/10 px-2 py-0.5 rounded border border-[#FFB020]/20 font-bold">
                            {robot.cargoCount} Crates
                          </span>
                        ) : (
                          <span className="text-[#48627D] italic">Empty</span>
                        )}
                      </td>

                      {/* Tasks Done */}
                      <td className="p-3.5 text-[#00F5A0] font-bold">{robot.tasksCompleted}</td>

                      {/* Distance */}
                      <td className="p-3.5 text-[#7F9BB8]">{robot.distanceTraveled.toFixed(1)} m</td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspect2D(robot.id)}
                            title="Inspect on 2D Tactical Map"
                            className="p-1.5 rounded-lg bg-[#101E32] hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#1E2C42] transition"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleFollow3D(robot.id)}
                            title="Follow Chase Cam in 3D Digital Twin"
                            className="p-1.5 rounded-lg bg-[#101E32] hover:bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#1E2C42] transition"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleSendToCharge(robot.id)}
                            title="Command to Nearest Charging Bay"
                            className="p-1.5 rounded-lg bg-[#101E32] hover:bg-[#FFB020]/20 text-[#FFB020] border border-[#1E2C42] transition"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleSendToHome(robot.id)}
                            title="Command to Return to Dock / Waiting Bay"
                            className="p-1.5 rounded-lg bg-[#101E32] hover:bg-white/20 text-[#7F9BB8] hover:text-white border border-[#1E2C42] transition"
                          >
                            <Home className="w-3.5 h-3.5" />
                          </button>

                          {robot.state === 'breakdown' ? (
                            <button
                              onClick={() => repairRobot(robot.id)}
                              title="Repair Motor & Resume"
                              className="p-1.5 rounded-lg bg-[#00F5A0]/20 hover:bg-[#00F5A0]/30 text-[#00F5A0] border border-[#00F5A0]/40 transition"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerBreakdown(robot.id)}
                              title="Simulate Motor Stall Failure"
                              className="p-1.5 rounded-lg bg-[#FF3D71]/20 hover:bg-[#FF3D71]/30 text-[#FF3D71] border border-[#FF3D71]/40 transition"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
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
        </div>
      </div>
    </div>
  );
};
