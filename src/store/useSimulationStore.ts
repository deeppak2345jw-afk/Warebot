import { create } from 'zustand';
import {
  SimulationEngine,
  SimulationMetrics,
} from '../core/simulation/SimulationEngine';
import {
  WarehouseConfig,
  WarehouseNode,
  Robot,
  WarehouseTask,
  SimulationEvent,
  ChargingStation,
  PackingStation,
  DeliveryNode,
  WaitingNode,
  Product,
  TaskPriority,
  TaskType,
  GridCoord,
  Scenario,
  EmergencyType,
} from '../core/types';

interface SimulationStoreState {
  engine: SimulationEngine;
  config: WarehouseConfig;
  metrics: SimulationMetrics;
  robots: Robot[];
  tasks: WarehouseTask[];
  urgentQueueTasks: WarehouseTask[];
  normalQueueTasks: WarehouseTask[];
  chargingQueueRobotIds: string[];
  events: SimulationEvent[];
  nodes: WarehouseNode[];
  chargingStations: ChargingStation[];
  packingStations: PackingStation[];
  deliveryNodes: DeliveryNode[];
  waitingNodes: WaitingNode[];
  products: Product[];
  pickupStations: { id: string; nodeId: string; coord: GridCoord; name: string }[];
  isRunning: boolean;
  speedMultiplier: number;
  simulationTime: number;
  activeScenario: Scenario | null;
  scenarioStatus: 'in_progress' | 'won' | 'lost';

  // Actions
  start: () => void;
  pause: () => void;
  toggleRunning: () => void;
  setSpeed: (speed: number) => void;
  step: () => void;
  spawnTask: (priority?: TaskPriority, type?: TaskType) => void;
  createManualTask: (params: {
    productId: string;
    requestedQuantity: number;
    shelfId: string;
    deliveryNodeId: string;
    priority?: TaskPriority;
    notes?: string;
    deadlineSeconds?: number;
  }) => { success: boolean; message: string; tasksCreated: WarehouseTask[] };
  addProduct: (product: Omit<Product, 'id' | 'shelfCoord' | 'status'> & { id?: string }) => Product;
  editProduct: (id: string, updates: Partial<Product>) => boolean;
  deleteProduct: (id: string) => boolean;
  triggerEmergency: (type: EmergencyType, params?: any) => void;
  toggleObstacleAt: (coord: GridCoord) => boolean;
  clearAllObstacles: () => void;
  toggleAutoTasks: () => void;
  triggerBreakdown: (robotId?: string) => void;
  repairRobot: (robotId: string) => void;
  toggleAisle: (coord: GridCoord) => void;
  cancelTask: (taskId: string) => boolean;
  reprioritizeTask: (taskId: string, newPriority: TaskPriority) => boolean;
  reassignTask: (taskId: string) => boolean;
  retryTask: (taskId: string) => boolean;
  emergencyStop: () => void;
  pauseAllRobots: () => void;
  resumeAllRobots: () => void;
  debugSetRobotDestination: (robotId: string, dest: GridCoord) => boolean;
  debugToggleRobotPause: (robotId: string) => boolean;
  debugSetRobotBattery: (robotId: string, level: number) => void;
  debugInspectRobot: (robotId: string) => any;
  updateConfig: (newConfig: Partial<WarehouseConfig>) => void;
  loadScenario: (scenarioId: string) => void;
  reset: () => void;
  syncState: () => void;
}

const initialEngine = new SimulationEngine();

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  engine: initialEngine,
  config: initialEngine.config,
  metrics: initialEngine.metrics,
  robots: initialEngine.robotMap.values(),
  tasks: initialEngine.taskMap.values(),
  urgentQueueTasks: initialEngine.urgentTaskQueue.toArray().map(n => n.item),
  normalQueueTasks: initialEngine.normalTaskQueue.toArray(),
  chargingQueueRobotIds: initialEngine.chargingQueue.toArray(),
  events: initialEngine.eventHistory.toArray().slice(-50),
  nodes: initialEngine.nodes,
  chargingStations: initialEngine.chargingStations,
  packingStations: initialEngine.packingStations,
  deliveryNodes: initialEngine.deliveryNodes,
  waitingNodes: initialEngine.waitingNodes,
  products: initialEngine.getProducts(),
  pickupStations: initialEngine.pickupStations,
  isRunning: true, // RUNNING BY DEFAULT SO ROBOTS MOVE IMMEDIATELY
  speedMultiplier: 1.0,
  simulationTime: 0,
  activeScenario: null,
  scenarioStatus: 'in_progress',

  syncState: () => {
    const { engine } = get();
    set({
      config: engine.config,
      metrics: { ...engine.metrics },
      robots: engine.robotMap.values().map(r => ({ ...r })),
      tasks: engine.taskMap.values().map(t => ({ ...t })),
      urgentQueueTasks: engine.urgentTaskQueue.toArray().map(n => ({ ...n.item })),
      normalQueueTasks: engine.normalTaskQueue.toArray().map(t => ({ ...t })),
      chargingQueueRobotIds: engine.chargingQueue.toArray(),
      events: engine.eventHistory.toArray().slice(-50),
      nodes: engine.nodes,
      chargingStations: engine.chargingStations.map(c => ({ ...c })),
      packingStations: engine.packingStations,
      deliveryNodes: engine.deliveryNodes.map(d => ({ ...d })),
      waitingNodes: engine.waitingNodes.map(w => ({ ...w })),
      products: engine.getProducts(),
      simulationTime: engine.simulationTime,
      activeScenario: engine.activeScenario,
      scenarioStatus: engine.scenarioStatus,
      isRunning: engine.isRunning,
    });
  },

  start: () => {
    const { engine } = get();
    engine.isRunning = true;
    set({ isRunning: true });
  },

  pause: () => {
    const { engine } = get();
    engine.isRunning = false;
    set({ isRunning: false });
  },

  toggleRunning: () => {
    const { engine, isRunning } = get();
    engine.isRunning = !isRunning;
    set({ isRunning: !isRunning });
  },

  setSpeed: (speed: number) => {
    const { engine } = get();
    engine.speedMultiplier = speed;
    set({ speedMultiplier: speed });
  },

  step: () => {
    const { engine, syncState } = get();
    engine.tick(0.25);
    syncState();
  },

  spawnTask: (priority, type) => {
    const { engine, syncState } = get();
    engine.spawnRandomTask(priority, type);
    syncState();
  },

  createManualTask: (params) => {
    const { engine, syncState } = get();
    const result = engine.createManualTask(params);
    syncState();
    return result;
  },

  addProduct: (product) => {
    const { engine, syncState } = get();
    const res = engine.addProduct(product);
    syncState();
    return res;
  },

  editProduct: (id, updates) => {
    const { engine, syncState } = get();
    const res = engine.editProduct(id, updates);
    syncState();
    return res;
  },

  deleteProduct: (id) => {
    const { engine, syncState } = get();
    const res = engine.deleteProduct(id);
    syncState();
    return res;
  },

  triggerEmergency: (type, params) => {
    const { engine, syncState } = get();
    engine.triggerEmergency(type, params);
    syncState();
  },

  toggleObstacleAt: (coord) => {
    const { engine, syncState } = get();
    const res = engine.toggleObstacleAt(coord);
    syncState();
    return res;
  },

  clearAllObstacles: () => {
    const { engine, syncState } = get();
    engine.clearAllObstacles();
    syncState();
  },

  toggleAutoTasks: () => {
    const { engine, syncState } = get();
    engine.config.autoTaskGeneration = !engine.config.autoTaskGeneration;
    syncState();
  },

  triggerBreakdown: (robotId) => {
    const { engine, syncState } = get();
    if (robotId) {
      engine.triggerRobotBreakdown(robotId);
    } else {
      engine.triggerRandomBreakdown();
    }
    syncState();
  },

  repairRobot: (robotId: string) => {
    const { engine, syncState } = get();
    engine.repairRobot(robotId);
    syncState();
  },

  toggleAisle: (coord: GridCoord) => {
    const { engine, syncState } = get();
    engine.toggleObstacleAt(coord);
    syncState();
  },

  cancelTask: (taskId: string) => {
    const { engine, syncState } = get();
    const res = engine.cancelTask(taskId);
    syncState();
    return res;
  },

  reprioritizeTask: (taskId: string, newPriority: TaskPriority) => {
    const { engine, syncState } = get();
    const res = engine.reprioritizeTask(taskId, newPriority);
    syncState();
    return res;
  },

  reassignTask: (taskId: string) => {
    const { engine, syncState } = get();
    const res = engine.reassignTask(taskId);
    syncState();
    return res;
  },

  retryTask: (taskId: string) => {
    const { engine, syncState } = get();
    const res = engine.retryTask(taskId);
    syncState();
    return res;
  },

  emergencyStop: () => {
    const { engine, syncState } = get();
    engine.emergencyStop();
    syncState();
  },

  pauseAllRobots: () => {
    const { engine, syncState } = get();
    engine.pauseAllRobots();
    syncState();
  },

  resumeAllRobots: () => {
    const { engine, syncState } = get();
    engine.resumeAllRobots();
    syncState();
  },

  debugSetRobotDestination: (robotId: string, dest: GridCoord) => {
    const { engine, syncState } = get();
    const res = engine.debugSetRobotDestination(robotId, dest);
    syncState();
    return res;
  },

  debugToggleRobotPause: (robotId: string) => {
    const { engine, syncState } = get();
    const res = engine.debugToggleRobotPause(robotId);
    syncState();
    return res;
  },

  debugSetRobotBattery: (robotId: string, level: number) => {
    const { engine, syncState } = get();
    engine.debugSetRobotBattery(robotId, level);
    syncState();
  },

  debugInspectRobot: (robotId: string) => {
    const { engine } = get();
    return engine.debugInspectRobot(robotId);
  },

  updateConfig: (newConfig: Partial<WarehouseConfig>) => {
    const { engine, syncState } = get();
    engine.config = { ...engine.config, ...newConfig };
    engine.reset();
    syncState();
  },

  loadScenario: (scenarioId: string) => {
    const { engine, syncState } = get();
    engine.loadScenario(scenarioId);
    syncState();
  },

  reset: () => {
    const { engine, syncState } = get();
    engine.reset();
    syncState();
  },
}));

// =========================================================================
// CENTRALIZED AUTHORITATIVE SIMULATION RUNNER (Decoupled from UI screens)
// =========================================================================
let globalSimLoopId: number | null = null;
let lastSimLoopTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
let simSyncAccumulator = 0;

export function startGlobalSimulationLoop() {
  if (typeof window === 'undefined') return;
  if (globalSimLoopId !== null) return;

  const loop = (currentTime: number) => {
    globalSimLoopId = requestAnimationFrame(loop);
    const rawDelta = Math.min((currentTime - lastSimLoopTime) / 1000, 0.1);
    lastSimLoopTime = currentTime;

    const state = useSimulationStore.getState();
    const { engine } = state;

    if (engine.isRunning && rawDelta > 0) {
      engine.tick(rawDelta);
      simSyncAccumulator += rawDelta;
      if (simSyncAccumulator >= 0.08) {
        state.syncState();
        simSyncAccumulator = 0;
      }
    }
  };

  globalSimLoopId = requestAnimationFrame(loop);
}

// Automatically start continuous simulation loop in browser environment
if (typeof window !== 'undefined') {
  startGlobalSimulationLoop();
}
