import React from 'react';
import {
  X,
  Battery,
  BatteryCharging,
  Zap,
  Gauge,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  Camera,
  Layers,
  ArrowRight,
  TrendingUp,
  Package,
  AlertTriangle,
  Compass,
  Play,
  Pause,
  PlusCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const RightInspector: React.FC = () => {
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);
  const selectedStationId = useUIStore((s) => s.selectedStationId);
  const selectedShelfId = useUIStore((s) => s.selectedShelfId);
  const selectRobot = useUIStore((s) => s.selectRobot);
  const selectTask = useUIStore((s) => s.selectTask);
  const selectStation = useUIStore((s) => s.selectStation);
  const selectShelf = useUIStore((s) => s.selectShelf);
  const setCameraMode = useUIStore((s) => s.setCameraMode);
  const setCreateTaskModalOpen = useUIStore((s) => s.setCreateTaskModalOpen);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const robots = useSimulationStore((s) => s.robots);
  const tasks = useSimulationStore((s) => s.tasks);
  const chargingStations = useSimulationStore((s) => s.chargingStations);
  const deliveryNodes = useSimulationStore((s) => s.deliveryNodes);
  const products = useSimulationStore((s) => s.products);
  const nodes = useSimulationStore((s) => s.nodes);
  const shelfNodes = nodes.filter((n) => n.type === 'shelf');
  const metrics = useSimulationStore((s) => s.metrics);
  const repairRobot = useSimulationStore((s) => s.repairRobot);
  const triggerBreakdown = useSimulationStore((s) => s.triggerBreakdown);
  const debugToggleRobotPause = useSimulationStore((s) => s.debugToggleRobotPause);
  const engine = useSimulationStore((s) => s.engine);
  const syncState = useSimulationStore((s) => s.syncState);

  const selectedRobot = robots.find((r) => r.id === selectedRobotId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const selectedCharging = chargingStations.find((c) => c.id === selectedStationId);
  const selectedDelivery = deliveryNodes.find((d) => d.id === selectedStationId);
  const selectedShelfNode = shelfNodes.find((s) => s.shelfId === selectedShelfId);
  const shelfProducts = products.filter((p) => p.shelfId === selectedShelfId);

  const closeInspector = () => {
    selectRobot(null);
    selectTask(null);
    selectStation(null);
    selectShelf(null);
  };

  const handleSendToNearestCharge = () => {
    if (!selectedRobot) return;
    engine.sendRobotToHomeDock(selectedRobot);
    syncState();
  };

  const handleSendToWaiting = () => {
    if (!selectedRobot) return;
    engine.sendRobotToWaiting(selectedRobot);
    syncState();
  };

  const handleSendToHomeDock = () => {
    if (!selectedRobot) return;
    engine.sendRobotToHomeDock(selectedRobot);
    syncState();
  };

  return (
    <aside className="w-88 bg-[#081221]/95 border-l border-[#183653] flex flex-col justify-between overflow-y-auto z-20 shrink-0 select-none text-xs text-[#E7F4FF]">
      {/* 1. ROBOT INSPECTOR & TELEMETRY */}
      {selectedRobot ? (
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
            <div className="flex items-center space-x-2">
              <div
                className="w-3.5 h-3.5 rounded-full shadow-md"
                style={{ backgroundColor: selectedRobot.color }}
              />
              <span className="font-bold text-sm text-white font-mono">{selectedRobot.name}</span>
              <span className="text-[10px] text-[#7F9BB8] font-mono">({selectedRobot.id})</span>
              <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
            </div>
            <button
              onClick={closeInspector}
              className="text-[#7F9BB8] hover:text-white p-1 rounded hover:bg-[#101E32]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Blocked / Warning Banner */}
          {selectedRobot.blockedReason && (
            <div className="p-2.5 rounded-xl bg-[#FF3D71]/15 border border-[#FF3D71]/40 space-y-1 animate-pulse">
              <div className="flex items-center space-x-1.5 text-[#FF3D71] font-bold font-mono text-[11px]">
                <AlertTriangle className="w-4 h-4" />
                <span>ROBOT HALTED / BLOCKED</span>
              </div>
              <p className="text-[11px] text-red-200 leading-relaxed font-sans">
                {selectedRobot.blockedReason}
              </p>
            </div>
          )}

          {/* State Badge */}
          <div className="flex items-center justify-between bg-[#0B1728] p-2.5 rounded-xl border border-[#183653]">
            <span className="text-[#7F9BB8]">Operational State:</span>
            <span
              className={`px-2 py-0.5 rounded-md font-mono font-semibold uppercase text-[10px] ${
                selectedRobot.state === 'breakdown'
                  ? 'bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/30 animate-pulse'
                  : selectedRobot.state === 'charging' || selectedRobot.state === 'going_to_charge'
                  ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30'
                  : selectedRobot.state === 'backing_off'
                  ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30 animate-pulse'
                  : selectedRobot.state === 'yielding'
                  ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30'
                  : selectedRobot.state === 'returning_to_dock'
                  ? 'bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#9B5CFF]/30'
                  : selectedRobot.state === 'returning'
                  ? 'bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#9B5CFF]/30'
                  : selectedRobot.state === 'picking_up'
                  ? 'bg-[#9B5CFF]/20 text-[#9B5CFF] border border-[#9B5CFF]/30'
                  : selectedRobot.state === 'executing_task' || selectedRobot.state === 'delivering'
                  ? 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30'
                  : selectedRobot.cargoCount > 0
                  ? 'bg-[#FFB020]/20 text-[#FFB020]'
                  : selectedRobot.state === 'moving_to_task' || selectedRobot.state === 'moving_to_pickup'
                  ? 'bg-[#267BFF]/20 text-[#267BFF]'
                  : 'bg-[#00E5FF]/20 text-[#00E5FF]'
              }`}
            >
              {selectedRobot.state === 'returning_to_dock'
                ? `RETURNING TO DOCK (${selectedRobot.home_dock_id || 'HOME'})`
                : selectedRobot.state === 'returning'
                ? `RETURNING (${selectedRobot.waitingNodeId || 'BAY'})`
                : selectedRobot.state === 'backing_off'
                ? 'BACKING OFF (YIELD)'
                : selectedRobot.state === 'yielding'
                ? 'YIELDING'
                : selectedRobot.state.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Home Dock Integration */}
          <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#E7F4FF] font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#00E5FF]" />
                <span>Integrated Home Dock</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
                {selectedRobot.home_dock_id || 'DOCK-01'}
              </span>
            </div>
            {(() => {
              const homeDock = chargingStations.find((c) => c.id === (selectedRobot.home_dock_id || 'DOCK-01'));
              const isAtDock =
                homeDock &&
                selectedRobot.gridPosition.x === homeDock.coord.x &&
                selectedRobot.gridPosition.y === homeDock.coord.y;
              return (
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-[#7F9BB8]">
                    <span>Dock Position:</span>
                    <span className="text-white font-bold">
                      ({homeDock?.coord.x ?? 0}, {homeDock?.coord.y ?? 0})
                    </span>
                  </div>
                  <div className="flex justify-between text-[#7F9BB8]">
                    <span>Dock Status:</span>
                    <span
                      className={
                        isAtDock
                          ? selectedRobot.state === 'charging'
                            ? 'text-[#FFB020] font-bold'
                            : 'text-[#00F5A0] font-bold'
                          : selectedRobot.state === 'returning_to_dock'
                          ? 'text-[#9B5CFF] font-bold'
                          : 'text-[#00E5FF]'
                      }
                    >
                      {isAtDock
                        ? selectedRobot.state === 'charging'
                          ? '⚡ CHARGING AT DOCK'
                          : '🟢 WAITING AT DOCK'
                        : selectedRobot.state === 'returning_to_dock'
                        ? '↩ EN ROUTE TO DOCK'
                        : 'IN FIELD (TASK EXECUTION)'}
                    </span>
                  </div>
                  {homeDock && homeDock.queue && homeDock.queue.length > 0 && (
                    <div className="flex justify-between text-[#FFB020]">
                      <span>Dock Queue:</span>
                      <span>{homeDock.queue.length} robot(s) queued</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Cargo Manifest (Capacity: Max 3 items) */}
          <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#E7F4FF] font-semibold flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#FFB020]" />
                <span>Cargo Payload</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  selectedRobot.cargoCount === 3
                    ? 'bg-[#FF3D71]/20 text-[#FF3D71] border border-[#FF3D71]/30'
                    : selectedRobot.cargoCount > 0
                    ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30'
                    : 'bg-[#101E32] text-[#48627D]'
                }`}
              >
                Cargo: {selectedRobot.cargoCount} / 3 items
              </span>
            </div>

            {selectedRobot.cargoCount > 0 ? (
              <div className="space-y-1 font-mono text-[11px]">
                {selectedRobot.cargoItems && selectedRobot.cargoItems.length > 0 ? (
                  selectedRobot.cargoItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between p-1.5 bg-[#101E32] rounded-lg border border-[#183653]"
                    >
                      <span className="text-[#FFB020]">{item.name}</span>
                      <span className="text-[#7F9BB8]">{item.quantity} units</span>
                    </div>
                  ))
                ) : (
                  <div className="p-1.5 bg-[#101E32] rounded text-[#FFB020]">
                    {selectedRobot.carriedItemName}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#48627D] italic text-[11px]">Compartment empty (0 / 3)</div>
            )}
          </div>

          {/* Battery Level Ring & Percentage */}
          <div className="space-y-2 bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[#E7F4FF]">
                {selectedRobot.state === 'charging' ? (
                  <BatteryCharging className="w-4 h-4 text-[#FFB020] animate-pulse" />
                ) : (
                  <Battery className="w-4 h-4 text-[#00E5FF]" />
                )}
                <span>Battery Level</span>
              </div>
              <span
                className={`font-mono font-bold ${
                  selectedRobot.battery < 25 ? 'text-[#FF3D71]' : 'text-[#00E5FF]'
                }`}
              >
                {selectedRobot.battery.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#101E32] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  selectedRobot.battery < 25
                    ? 'bg-[#FF3D71]'
                    : selectedRobot.battery < 50
                    ? 'bg-[#FFB020]'
                    : 'bg-gradient-to-r from-[#00E5FF] to-[#00F5A0]'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, selectedRobot.battery))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#48627D] font-mono">
              <span>Runtime: ~{Math.floor(selectedRobot.battery * 1.8)} mins</span>
              <span>Discharge: 0.2%/m</span>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653] space-y-2">
            <div className="text-[#7F9BB8] font-semibold font-mono text-[10px] uppercase tracking-wider">
              Navigation Telemetry
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
                <div className="text-[#48627D] text-[9px]">CURRENT POS</div>
                <div className="text-[#00E5FF] font-bold">
                  ({selectedRobot.position.x.toFixed(1)}, {selectedRobot.position.z.toFixed(1)})
                </div>
              </div>
              <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
                <div className="text-[#48627D] text-[9px]">GRID NODE</div>
                <div className="text-white font-bold">
                  ({selectedRobot.gridPosition.x}, {selectedRobot.gridPosition.y})
                </div>
              </div>
              <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
                <div className="text-[#48627D] text-[9px]">SPEED</div>
                <div className="text-white font-bold">{selectedRobot.maxSpeed.toFixed(1)} u/s</div>
              </div>
              <div className="bg-[#101E32] p-2 rounded-lg border border-[#183653]">
                <div className="text-[#48627D] text-[9px]">DISTANCE</div>
                <div className="text-[#00F5A0] font-bold">
                  {selectedRobot.distanceTraveled.toFixed(1)} m
                </div>
              </div>
            </div>

            {/* Current Route Waypoints */}
            {selectedRobot.currentRoute.length > 0 && (
              <div className="text-[10px] font-mono bg-[#101E32] p-2.5 rounded-lg border border-[#183653] space-y-1">
                <div className="text-[#00E5FF] font-bold">Route Path:</div>
                <div className="text-[#7F9BB8] truncate">
                  {selectedRobot.currentRoute
                    .slice(selectedRobot.currentRouteIndex)
                    .map((c) => `(${c.x},${c.y})`)
                    .join(' → ') || 'At destination'}
                </div>
              </div>
            )}
          </div>

          {/* Active Mission */}
          <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653] space-y-1.5 font-mono text-[11px]">
            <div className="text-[#7F9BB8] font-semibold">Active Mission</div>
            {selectedRobot.currentTaskId ? (
              <div className="space-y-1">
                <div className="text-[#00E5FF] font-bold">Task: {selectedRobot.currentTaskId}</div>
                {selectedRobot.targetShelfId && (
                  <div className="text-[#7F9BB8]">
                    Pickup Shelf: <span className="text-white">{selectedRobot.targetShelfId}</span>
                  </div>
                )}
                {selectedRobot.targetDeliveryNodeId && (
                  <div className="text-[#00F5A0]">
                    Destination:{' '}
                    <span className="font-bold">{selectedRobot.targetDeliveryNodeId}</span>
                  </div>
                )}
              </div>
            ) : selectedRobot.state === 'returning_to_dock' ? (
              <div className="space-y-1">
                <div className="text-[#9B5CFF] font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Returning to Home Dock</span>
                </div>
                <div className="text-[#7F9BB8]">
                  Target Dock:{' '}
                  <span className="text-white font-bold">{selectedRobot.home_dock_id || 'DOCK-01'}</span>
                </div>
              </div>
            ) : selectedRobot.state === 'returning' ? (
              <div className="space-y-1">
                <div className="text-[#9B5CFF] font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Returning to Standby</span>
                </div>
                <div className="text-[#7F9BB8]">
                  Target Bay:{' '}
                  <span className="text-white font-bold">{selectedRobot.waitingNodeId || 'North Standby Bay'}</span>
                </div>
                {selectedRobot.waitingCoord && (
                  <div className="text-[#7F9BB8]">
                    Bay Coord:{' '}
                    <span className="text-[#00E5FF]">
                      ({selectedRobot.waitingCoord.x}, {selectedRobot.waitingCoord.y})
                    </span>
                  </div>
                )}
              </div>
            ) : selectedRobot.state === 'backing_off' || selectedRobot.state === 'yielding' ? (
              <div className="space-y-1">
                <div className="text-[#FFB020] font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>{selectedRobot.state === 'backing_off' ? 'Backing Off to Siding' : 'Yielding Right-of-Way'}</span>
                </div>
                <div className="text-[#7F9BB8] leading-tight">
                  {selectedRobot.blockedReason || 'Yielding to let higher-priority traffic pass.'}
                </div>
                {selectedRobot.yieldTimer !== undefined && (
                  <div className="text-[10px] text-[#00E5FF]">
                    Hold timer: {Math.max(0, selectedRobot.yieldTimer).toFixed(1)}s
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[#48627D] italic">No active task (Idle & Available)</div>
                {selectedRobot.waitingNodeId && (
                  <div className="text-[#7F9BB8]">
                    Standby Bay:{' '}
                    <span className="text-[#9B5CFF] font-semibold">{selectedRobot.waitingNodeId}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Functional Robot Controls */}
          <div className="space-y-2 pt-2 border-t border-[#183653]">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => debugToggleRobotPause(selectedRobot.id)}
                className={`py-2 px-3 rounded-xl font-medium transition flex items-center justify-center gap-1.5 border ${
                  selectedRobot.isPaused
                    ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/40 hover:bg-[#00F5A0]/30'
                    : 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/40 hover:bg-[#FFB020]/30'
                }`}
              >
                {selectedRobot.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSendToNearestCharge}
                className="py-2 px-3 rounded-xl bg-[#00E5FF]/20 hover:bg-[#00E5FF]/30 text-[#00E5FF] border border-[#00E5FF]/40 flex items-center justify-center gap-1.5 font-medium transition"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Charge</span>
              </button>
            </div>

            {selectedRobot.state === 'idle' && (
              <button
                onClick={handleSendToHomeDock}
                className="w-full py-2 px-3 rounded-xl bg-[#00E5FF]/20 hover:bg-[#00E5FF]/30 text-[#00E5FF] border border-[#00E5FF]/40 flex items-center justify-center space-x-2 font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Home Dock ({selectedRobot.home_dock_id || 'DOCK-01'})</span>
              </button>
            )}

            {selectedRobot.state === 'breakdown' ? (
              <button
                onClick={() => repairRobot(selectedRobot.id)}
                className="w-full py-2 px-3 rounded-xl bg-[#00F5A0]/20 hover:bg-[#00F5A0]/30 text-[#00F5A0] border border-[#00F5A0]/40 flex items-center justify-center space-x-2 font-medium transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Dispatch Maintenance Crew</span>
              </button>
            ) : (
              <button
                onClick={() => triggerBreakdown(selectedRobot.id)}
                className="w-full py-2 px-3 rounded-xl bg-[#FF3D71]/20 hover:bg-[#FF3D71]/30 text-[#FF3D71] border border-[#FF3D71]/40 flex items-center justify-center space-x-2 font-medium transition"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Simulate Breakdown</span>
              </button>
            )}

            <button
              onClick={() => setActiveScreen('robots')}
              className="w-full py-2 px-3 rounded-xl bg-[#101E32] hover:bg-[#183653] text-[#7F9BB8] hover:text-white flex items-center justify-center space-x-1.5 transition text-[11px]"
            >
              <span>View Full Fleet Roster</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : selectedShelfNode ? (
        /* 2. SHELF INSPECTOR (Section 9: Clicking a shelf should open its details) */
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-[#00E5FF]" />
              <span className="font-bold text-sm text-white font-mono">
                Shelf {selectedShelfNode.shelfId}
              </span>
            </div>
            <button
              onClick={closeInspector}
              className="text-[#7F9BB8] hover:text-white p-1 rounded hover:bg-[#101E32]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shelf Details */}
          <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#7F9BB8]">Zone:</span>
              <span className="text-[#00E5FF] font-mono font-semibold">
                {selectedShelfNode.zone || 'Storage Rack'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#7F9BB8]">Grid Coordinate:</span>
              <span className="text-white font-mono font-bold">
                ({selectedShelfNode.x}, {selectedShelfNode.y})
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#7F9BB8]">Capacity:</span>
              <span className="text-[#00F5A0] font-mono">
                {selectedShelfNode.shelfInfo?.inventoryLevel || 10} /{' '}
                {selectedShelfNode.shelfInfo?.maxCapacity || 50} units
              </span>
            </div>
          </div>

          {/* Stored Inventory Products */}
          <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653] space-y-2">
            <div className="text-[11px] font-mono text-[#7F9BB8] uppercase font-bold">
              Stored Products ({shelfProducts.length})
            </div>
            {shelfProducts.length > 0 ? (
              <div className="space-y-1.5">
                {shelfProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded-lg bg-[#101E32] border border-[#183653] flex items-center justify-between font-mono"
                  >
                    <div>
                      <div className="text-white font-semibold">{p.name}</div>
                      <div className="text-[10px] text-[#7F9BB8]">{p.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00E5FF] font-bold">{p.quantity} units</div>
                      <span className="text-[9px] text-[#00F5A0] uppercase">{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#48627D] italic text-[11px]">No products assigned to this shelf.</div>
            )}
          </div>

          {/* Quick Create Task Action for this Shelf */}
          <button
            onClick={() => setCreateTaskModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold flex items-center justify-center gap-1.5 transition font-mono shadow-md shadow-[#00E5FF]/20"
          >
            <PlusCircle className="w-4 h-4 fill-current" />
            <span>Create Task for this Shelf</span>
          </button>
        </div>
      ) : selectedCharging || selectedDelivery ? (
        /* 3. CHARGING STATION OR DELIVERY NODE INSPECTOR */
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#183653]">
            <div className="font-bold text-sm text-white font-mono">
              {selectedDelivery ? selectedDelivery.name : `Charging Bay: ${selectedCharging?.id}`}
            </div>
            <button
              onClick={closeInspector}
              className="text-[#7F9BB8] hover:text-white p-1 rounded hover:bg-[#101E32]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDelivery && (
            <div className="space-y-3 font-mono">
              <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
                <div className="text-[#7F9BB8] text-[10px]">TOTAL DELIVERIES COMPLETED</div>
                <div className="text-[#00F5A0] font-bold text-xl">
                  {selectedDelivery.completedDeliveries} packages
                </div>
              </div>
              <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
                <div className="text-[#7F9BB8] text-[10px]">OPERATIONAL STATUS</div>
                <div className="text-[#00E5FF] font-bold uppercase">{selectedDelivery.status}</div>
              </div>
            </div>
          )}

          {selectedCharging && (
            <div className="space-y-3 font-mono">
              <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
                <div className="text-[#7F9BB8] text-[10px]">INTEGRATED HOME DOCK</div>
                <div className="text-[#00E5FF] font-bold text-base">{selectedCharging.id}</div>
                <div className="text-[#7F9BB8] text-[10px] mt-2">ASSIGNED AGV</div>
                <div className="text-white font-bold">{selectedCharging.assignedRobotId || 'R-1'}</div>
              </div>
              <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
                <div className="text-[#7F9BB8] text-[10px]">DOCK OPERATIONAL STATUS</div>
                <div
                  className={`font-bold text-sm ${
                    selectedCharging.isOccupied ? 'text-[#FFB020]' : 'text-[#00F5A0]'
                  }`}
                >
                  {selectedCharging.isOccupied
                    ? `Occupied by ${selectedCharging.occupyingRobotId}`
                    : 'AVAILABLE (WAITING READY)'}
                </div>
              </div>
              {selectedCharging.queue && selectedCharging.queue.length > 0 && (
                <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
                  <div className="text-[#FFB020] text-[10px] font-bold">DOCK RESERVATION QUEUE</div>
                  <div className="text-white text-xs">{selectedCharging.queue.join(', ')}</div>
                </div>
              )}
              <div className="bg-[#0B1728] p-3 rounded-xl border border-[#183653]">
                <div className="text-[#7F9BB8] text-[10px]">TOTAL ENERGY DELIVERED</div>
                <div className="text-[#00E5FF] font-bold text-lg">
                  {selectedCharging.totalEnergyDelivered.toFixed(0)} mAh
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 4. DEFAULT OVERVIEW WHEN NOTHING IS SELECTED */
        <div className="p-4 space-y-4">
          <div className="pb-3 border-b border-[#183653]">
            <div className="font-bold text-sm text-white font-mono">Warehouse Vitals</div>
            <div className="text-[11px] text-[#7F9BB8]">Real-time Telemetry Overview</div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-[#0B1728] p-2.5 rounded-xl border border-[#183653]">
              <div className="text-[#7F9BB8] text-[10px]">ACTIVE MISSIONS</div>
              <div className="text-[#00E5FF] font-bold text-base">{metrics.activeRobotsCount}</div>
            </div>
            <div className="bg-[#0B1728] p-2.5 rounded-xl border border-[#183653]">
              <div className="text-[#7F9BB8] text-[10px]">DELIVERED</div>
              <div className="text-[#00F5A0] font-bold text-base">{metrics.tasksCompleted}</div>
            </div>
            <div className="bg-[#0B1728] p-2.5 rounded-xl border border-[#183653]">
              <div className="text-[#7F9BB8] text-[10px]">AVG BATTERY</div>
              <div className="text-[#FFB020] font-bold text-base">
                {metrics.averageBatteryLevel}%
              </div>
            </div>
            <div className="bg-[#0B1728] p-2.5 rounded-xl border border-[#183653]">
              <div className="text-[#7F9BB8] text-[10px]">CONGESTION</div>
              <div className="text-[#9B5CFF] font-bold text-base">{metrics.congestion?.level || 'Low'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[#7F9BB8] font-semibold text-[11px] font-mono">
              Fleet Overview ({robots.length} AGVs)
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {robots.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRobot(r.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-[#0B1728] hover:bg-[#101E32] border border-[#183653] text-left font-mono transition"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="text-white">{r.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] ${
                        (r.battery ?? 100) < 25 ? 'text-[#FF3D71]' : 'text-[#7F9BB8]'
                      }`}
                    >
                      {r.battery !== undefined ? `${r.battery.toFixed(0)}%` : '100%'}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        r.state === 'breakdown'
                          ? 'bg-[#FF3D71]/20 text-[#FF3D71]'
                          : r.state === 'charging'
                          ? 'bg-[#FFB020]/20 text-[#FFB020]'
                          : 'bg-[#00F5A0]/20 text-[#00F5A0]'
                      }`}
                    >
                      {r.state}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[#48627D] italic text-center pt-2">
            Click any AGV robot, shelf rack, or delivery dock on the map to inspect full telemetry.
          </div>
        </div>
      )}
    </aside>
  );
};
