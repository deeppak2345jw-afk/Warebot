import React from 'react';
import {
  Zap,
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const ChargingStationsScreen: React.FC = () => {
  const chargingStations = useSimulationStore((s) => s.chargingStations);
  const chargingQueueRobotIds = useSimulationStore((s) => s.chargingQueueRobotIds);
  const robots = useSimulationStore((s) => s.robots);
  const engine = useSimulationStore((s) => s.engine);
  const syncState = useSimulationStore((s) => s.syncState);

  const selectRobot = useUIStore((s) => s.selectRobot);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const handleSendRobotToStation = (stationId: string, robotId: string) => {
    const station = chargingStations.find((c) => c.id === stationId);
    const robot = robots.find((r) => r.id === robotId);
    if (station && robot) {
      if (station.assignedRobotId && station.assignedRobotId !== robot.id && robot.home_dock_id !== station.id) {
        return;
      }
      engine.sendRobotToCharge(robot, station);
      syncState();
    }
  };

  const idleRobots = robots.filter((r) => r.state === 'idle');

  return (
    <div className="flex-1 overflow-y-auto bg-[#050914] text-[#E7F4FF] select-none p-6 md:p-8 space-y-6 font-mono">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#183653]">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>ENERGY INFRASTRUCTURE GRID</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            CHARGING BAYS & HOME DOCKS
          </h1>
          <p className="text-xs text-[#7F9BB8] mt-1 font-sans">
            High-rate automated inductive charging pads with automated battery threshold sensing and priority docking queues.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-[#0B1728] border border-[#183653] px-3 py-2 rounded-xl text-[#00E5FF]">
            <span>Active Bays: </span>
            <span className="font-bold text-white">
              {chargingStations.filter((c) => c.isOccupied).length} / {chargingStations.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chargingStations.map((station) => {
          const occupyingRobot = robots.find((r) => r.id === station.occupyingRobotId);

          return (
            <div
              key={station.id}
              className={`bg-[#0B1728] rounded-2xl border p-5 space-y-4 transition ${
                station.isOccupied
                  ? 'border-[#FFB020]/60 shadow-lg shadow-[#FFB020]/10'
                  : 'border-[#00E5FF]/40 shadow-lg shadow-[#00E5FF]/5'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      station.isOccupied
                        ? 'bg-[#FFB020]/20 text-[#FFB020]'
                        : 'bg-[#00E5FF]/20 text-[#00E5FF]'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-base text-white">{station.id}</div>
                    <div className="text-[10px] text-[#7F9BB8]">
                      Node ({station.coord.x}, {station.coord.y})
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    station.isOccupied
                      ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/40 animate-pulse'
                      : 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/40'
                  }`}
                >
                  {station.isOccupied ? 'CHARGING' : 'AVAILABLE'}
                </span>
              </div>

              <div className="bg-[#101E32] p-3 rounded-xl border border-[#183653] space-y-2">
                <div className="text-[#7F9BB8] text-xs">Docked AGV Unit</div>
                {occupyingRobot ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: occupyingRobot.color }}
                        />
                        <span className="font-bold text-white">{occupyingRobot.name}</span>
                      </div>
                      <span className="text-[#FFB020] font-bold text-sm">
                        {occupyingRobot.battery.toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#050914] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FFB020] to-[#00F5A0] transition-all duration-300"
                        style={{ width: `${occupyingRobot.battery}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#7F9BB8] flex justify-between">
                      <span>Rate: +15% / min</span>
                      <span>Target: 95%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[#48627D] italic text-xs py-2">
                    Bay empty. Ready for inbound autonomous AGV.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#101E32] p-2.5 rounded-xl border border-[#183653]">
                  <div className="text-[9px] text-[#7F9BB8]">ENERGY DELIVERED</div>
                  <div className="text-[#00E5FF] font-bold text-sm">
                    {station.totalEnergyDelivered.toFixed(0)} mAh
                  </div>
                </div>
                <div className="bg-[#101E32] p-2.5 rounded-xl border border-[#183653]">
                  <div className="text-[9px] text-[#7F9BB8]">VOLTAGE RATING</div>
                  <div className="text-white font-bold text-sm">48V / 60A</div>
                </div>
              </div>

              {!station.isOccupied && idleRobots.filter(r => !station.assignedRobotId || r.id === station.assignedRobotId || r.home_dock_id === station.id).length > 0 && (
                <div className="pt-2 border-t border-[#183653] space-y-1.5">
                  <div className="text-[10px] text-[#7F9BB8]">Dedicated Robot Docking:</div>
                  <div className="flex items-center gap-1.5">
                    <select
                      id={`select_robot_${station.id}`}
                      className="flex-1 bg-[#101E32] border border-[#183653] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    >
                      {idleRobots.filter(r => !station.assignedRobotId || r.id === station.assignedRobotId || r.home_dock_id === station.id).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.battery.toFixed(0)}%)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById(
                          `select_robot_${station.id}`
                        ) as HTMLSelectElement;
                        if (sel) handleSendRobotToStation(station.id, sel.value);
                      }}
                      className="px-2.5 py-1 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold rounded-lg text-xs transition"
                    >
                      Dock
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Clock className="w-4 h-4 text-[#FFB020]" />
            <span>BATTERY DOCKING WAITLIST (FIFO QUEUE: {chargingQueueRobotIds.length})</span>
          </div>
          <span className="text-xs text-[#7F9BB8]">Auto-Dispatches when bay frees</span>
        </div>

        {chargingQueueRobotIds.length === 0 ? (
          <div className="text-[#48627D] italic text-xs py-4 text-center">
            Zero robots waiting in charging queue. Battery levels across fleet are sufficient.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {chargingQueueRobotIds.map((robotId, idx) => {
              const r = robots.find((rob) => rob.id === robotId);
              return (
                <div
                  key={robotId}
                  className="p-3 bg-[#101E32] border border-[#FF3D71]/40 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white">{r?.name || robotId}</div>
                    <div className="text-[10px] text-[#FF3D71]">
                      Queue Position: #{idx + 1}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#FF3D71] font-bold text-sm">
                      {r?.battery.toFixed(0)}%
                    </div>
                    <span className="text-[9px] text-[#7F9BB8]">Low Power</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
