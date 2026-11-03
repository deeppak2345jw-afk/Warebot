import React, { useState } from 'react';
import {
  Bug,
  X,
  Play,
  Pause,
  Compass,
  Battery,
  Zap,
  RotateCcw,
  Wrench,
  AlertTriangle,
  Send,
  Navigation,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

import { WindowManager } from '../common/WindowManager';

export const DeveloperDebugPanel: React.FC = () => {
  const isDebugMode = useUIStore((s) => s.isDebugMode);
  const toggleDebugMode = useUIStore((s) => s.toggleDebugMode);
  const showPathDebug = useUIStore((s) => s.showPathDebug);
  const togglePathDebug = useUIStore((s) => s.togglePathDebug);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const selectRobot = useUIStore((s) => s.selectRobot);

  const robots = useSimulationStore((s) => s.robots);
  const engine = useSimulationStore((s) => s.engine);
  const debugSetRobotDestination = useSimulationStore((s) => s.debugSetRobotDestination);
  const debugToggleRobotPause = useSimulationStore((s) => s.debugToggleRobotPause);
  const debugSetRobotBattery = useSimulationStore((s) => s.debugSetRobotBattery);
  const triggerBreakdown = useSimulationStore((s) => s.triggerBreakdown);
  const repairRobot = useSimulationStore((s) => s.repairRobot);

  const activeRobotId = selectedRobotId || (robots[0]?.id ?? '');
  const activeRobot = robots.find((r) => r.id === activeRobotId);

  const [destX, setDestX] = useState<number>(5);
  const [destY, setDestY] = useState<number>(5);
  const [overrideBattery, setOverrideBattery] = useState<number>(activeRobot?.battery ?? 100);

  if (!isDebugMode) return null;

  const handleSendToCoord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRobot) return;
    debugSetRobotDestination(activeRobot.id, { x: Number(destX), y: Number(destY) });
  };

  const handleSetBattery = (level: number) => {
    if (!activeRobot) return;
    setOverrideBattery(level);
    debugSetRobotBattery(activeRobot.id, level);
  };

  return (
    <WindowManager
      id="developer_debug_console"
      title="DEVELOPER DEBUG CONSOLE"
      icon={<Bug className="w-4 h-4" />}
      isOpen={isDebugMode}
      onClose={toggleDebugMode}
      initialWidth={400}
      initialHeight={520}
    >
      <div className="p-4 space-y-3">
        {/* Show Path Debug Info Checkbox (Part 2.5) */}
        <div className="flex items-center justify-between bg-[#101E32] p-2.5 rounded-lg border border-[#183653]">
          <label className="text-[11px] text-[#E7F4FF] flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPathDebug}
              onChange={togglePathDebug}
              className="rounded bg-[#081221] border-[#183653] text-[#00E5FF] focus:ring-0 cursor-pointer"
            />
            <span className="font-bold">Show Path Debug Info</span>
          </label>
          <span className="text-[10px] text-[#7F9BB8] font-mono">A* Waypoints & Labels</span>
        </div>

        {/* Robot Selector Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-[#7F9BB8] uppercase">Target Robot for Diagnostic:</label>
          <select
            value={activeRobotId}
            onChange={(e) => selectRobot(e.target.value)}
            className="w-full bg-[#101E32] border border-[#183653] rounded-lg px-2.5 py-1.5 text-xs text-[#00E5FF] focus:outline-none focus:border-[#00E5FF]"
          >
            {robots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id}) - [{r.state.toUpperCase()}] - {r.battery.toFixed(0)}%
              </option>
            ))}
          </select>
        </div>

      {activeRobot && (
        <div className="py-3 space-y-3 max-h-96 overflow-y-auto pr-1">
          {/* Telemetry Status Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
              <div className="text-[9px] text-[#7F9BB8]">COORDINATES</div>
              <div className="text-[#00E5FF] font-bold">
                ({activeRobot.position.x.toFixed(1)}, {activeRobot.position.z.toFixed(1)})
              </div>
            </div>
            <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
              <div className="text-[9px] text-[#7F9BB8]">GRID NODE</div>
              <div className="text-white font-bold">
                ({activeRobot.gridPosition.x}, {activeRobot.gridPosition.y})
              </div>
            </div>
            <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
              <div className="text-[9px] text-[#7F9BB8]">STATE & PAUSE</div>
              <div className="font-bold flex items-center gap-1">
                <span className={activeRobot.isPaused ? 'text-[#FFB020]' : 'text-[#00F5A0]'}>
                  {activeRobot.isPaused ? 'PAUSED' : activeRobot.state}
                </span>
              </div>
            </div>
            <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
              <div className="text-[9px] text-[#7F9BB8]">ROUTE PROGRESS</div>
              <div className="text-[#9B5CFF] font-bold">
                Idx {activeRobot.currentRouteIndex} / {activeRobot.currentRoute.length}
              </div>
            </div>
          </div>

          {/* Blocked Reason Alert (If any) */}
          {activeRobot.blockedReason && (
            <div className="p-2 bg-[#FF3D71]/10 border border-[#FF3D71]/40 rounded-lg text-[#FF3D71] text-[10px] flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{activeRobot.blockedReason}</span>
            </div>
          )}

          {/* Direct Destination Assignment */}
          <form onSubmit={handleSendToCoord} className="bg-[#101E32] p-2.5 rounded-lg border border-[#183653] space-y-2">
            <div className="text-[10px] text-[#7F9BB8] uppercase font-bold flex items-center gap-1">
              <Navigation className="w-3 h-3 text-[#00E5FF]" />
              <span>Direct Waypoint Override:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[#7F9BB8]">X:</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={destX}
                  onChange={(e) => setDestX(Number(e.target.value))}
                  className="w-14 bg-[#0B1728] border border-[#183653] rounded px-1.5 py-1 text-center text-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#7F9BB8]">Y:</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={destY}
                  onChange={(e) => setDestY(Number(e.target.value))}
                  className="w-14 bg-[#0B1728] border border-[#183653] rounded px-1.5 py-1 text-center text-white"
                />
              </div>
              <button
                type="submit"
                className="flex-1 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold py-1 px-2 rounded flex items-center justify-center gap-1 transition"
              >
                <Send className="w-3 h-3" />
                <span>Dispatch</span>
              </button>
            </div>
          </form>

          {/* Movement Start / Pause & Fault Overrides */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => debugToggleRobotPause(activeRobot.id)}
              className={`p-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition ${
                activeRobot.isPaused
                  ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/50 hover:bg-[#00F5A0]/30'
                  : 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/50 hover:bg-[#FFB020]/30'
              }`}
            >
              {activeRobot.isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Move</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Move</span>
                </>
              )}
            </button>

            {activeRobot.state === 'breakdown' ? (
              <button
                onClick={() => repairRobot(activeRobot.id)}
                className="p-2 rounded-lg bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/50 hover:bg-[#00F5A0]/30 font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Fix Motor</span>
              </button>
            ) : (
              <button
                onClick={() => triggerBreakdown(activeRobot.id)}
                className="p-2 rounded-lg bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/50 hover:bg-[#FF3D71]/30 font-bold flex items-center justify-center gap-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Trigger Stall</span>
              </button>
            )}
          </div>

          {/* Battery Level Override */}
          <div className="bg-[#101E32] p-2.5 rounded-lg border border-[#183653] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#7F9BB8]">
              <span className="flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Battery Override:</span>
              </span>
              <span className="text-[#00E5FF] font-bold">{activeRobot.battery.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSetBattery(10)}
                className="px-2 py-0.5 bg-[#FF3D71]/20 hover:bg-[#FF3D71]/30 text-[#FF3D71] rounded text-[10px]"
              >
                10% (Low)
              </button>
              <button
                onClick={() => handleSetBattery(50)}
                className="px-2 py-0.5 bg-[#FFB020]/20 hover:bg-[#FFB020]/30 text-[#FFB020] rounded text-[10px]"
              >
                50%
              </button>
              <button
                onClick={() => handleSetBattery(100)}
                className="px-2 py-0.5 bg-[#00F5A0]/20 hover:bg-[#00F5A0]/30 text-[#00F5A0] rounded text-[10px]"
              >
                100% (Full)
              </button>
            </div>
          </div>

          {/* Watchdog & Priority Aging */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
              <div className="text-[9px] text-[#7F9BB8]">STUCK TIMER</div>
              <div className="text-[#FFB020] font-bold">
                {(activeRobot.ticksWithoutProgress || 0).toFixed(1)}s / 10s
              </div>
            </div>
            <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
              <div className="text-[9px] text-[#7F9BB8]">EFFECTIVE PRIORITY</div>
              <div className="text-[#00E5FF] font-bold">
                {activeRobot.effectivePriority ?? 'N/A'}
              </div>
            </div>
          </div>

          {/* Waypoints List */}
          {activeRobot.currentRoute.length > 0 && (
            <div className="bg-[#101E32] p-2.5 rounded-lg border border-[#183653] space-y-1 text-[10px]">
              <div className="text-[#7F9BB8] font-bold">
                Route Waypoints ({activeRobot.currentRoute.length - activeRobot.currentRouteIndex} left):
              </div>
              <div className="text-[#00E5FF] truncate">
                {activeRobot.currentRoute
                  .slice(activeRobot.currentRouteIndex)
                  .map((c) => `(${c.x},${c.y})`)
                  .join(' → ') || 'At destination'}
              </div>
            </div>
          )}

          {/* WFG Deadlock Telemetry */}
          {(() => {
            const deadlockStats = engine.deadlockDetector.getStats();
            return (
              <div className="bg-[#101E32] p-2.5 rounded-lg border border-[#183653] space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between font-bold text-[#FF3D71]">
                  <span>WFG DEADLOCK DETECTOR:</span>
                  <span>{deadlockStats.activeDeadlocks.length > 0 ? '⚠️ CYCLE ACTIVE' : '✓ CLEAR'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] text-[#7F9BB8]">
                  <div>Detected: <span className="text-white font-bold">{deadlockStats.totalDeadlocksDetected}</span></div>
                  <div>Recovered: <span className="text-[#00F5A0] font-bold">{deadlockStats.totalRecoveriesExecuted}</span></div>
                </div>
                {deadlockStats.activeDeadlocks.length > 0 && (
                  <div className="p-1.5 bg-[#FF3D71]/20 border border-[#FF3D71]/40 rounded text-[#FF3D71] text-[9px]">
                    Cycle: {deadlockStats.activeDeadlocks[0].cycleDescription}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Shelf Mutex Resource Monitor */}
          {(() => {
            const allShelves: any[] = Array.from(engine.shelfAccessManager.getAllShelfResources().values());
            const busyShelves = allShelves.filter((s: any) => s.status !== 'AVAILABLE');
            return (
              <div className="bg-[#101E32] p-2.5 rounded-lg border border-[#183653] space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between font-bold text-[#00E5FF]">
                  <span>SHELF MUTEX MONITOR:</span>
                  <span>{busyShelves.length} / {allShelves.length} BUSY</span>
                </div>
                {busyShelves.length > 0 ? (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {busyShelves.map((s: any) => (
                      <div key={s.shelfId} className="flex items-center justify-between text-[9px] p-1 bg-[#0B1728] rounded">
                        <span className="text-white font-bold">{s.shelfId}</span>
                        <span className={`px-1 rounded ${
                          s.status === 'OCCUPIED' ? 'bg-[#FF3D71]/20 text-[#FF3D71]' :
                          s.status === 'RESERVED' ? 'bg-[#FFB020]/20 text-[#FFB020]' :
                          'bg-[#9B5CFF]/20 text-[#9B5CFF]'
                        }`}>
                          {s.status} (Owner: {s.ownerRobotId || 'None'})
                        </span>
                        {s.waitingQueue.length > 0 && (
                          <span className="text-[#9B5CFF]">Queue: {s.waitingQueue.length}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[9px] text-[#7F9BB8]">All shelf interaction cells are free.</div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      </div>
    </WindowManager>
  );
};
