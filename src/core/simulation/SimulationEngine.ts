import { Graph } from './WarehouseGraph';
import { PriorityQueue, Queue, LinkedList, Stack, HashMap } from './internalQueues';

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
  NavigationMode,
  WaitingReason,
  PathfindingResult,
} from '../types';

import { WarehouseGenerator, GeneratedWarehouse } from './WarehouseGenerator';
import { CollisionAvoidance, CongestionData } from './CollisionAvoidance';
import { BatteryManager } from './BatteryManager';
import { BreakdownManager } from './BreakdownManager';
import { TaskAllocator } from '../allocation/TaskAllocator';
import { PathfindingManager } from '../pathfinding/PathfindingManager';
import { ShelfAccessManager } from './ShelfAccessManager';
import { DeadlockDetector } from './DeadlockDetector';
import { TrafficManager } from './TrafficManager';
import { soundEffects } from '../../utils/soundEffects';
import { PRESET_SCENARIOS } from './ScenarioManager';

export interface SimulationMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalDistanceTraveled: number;
  averageTaskCompletionTime: number;
  averageBatteryLevel: number;
  activeRobotsCount: number;
  idleRobotsCount: number;
  chargingRobotsCount: number;
  brokenRobotsCount: number;
  congestion: CongestionData;
  uptimeSeconds: number;
  algorithmExecutionTimes: { algorithm: string; avgTimeMs: number; count: number }[];
  throughputHistory: { time: number; completed: number }[];
  batteryHistory: { time: number; avgBattery: number }[];
  deadlocksDetected: number;
  deadlocksRecovered: number;
  tasksPending?: number;
  systemThroughputPerHour?: number;
  congestedNodes?: GridCoord[];
}

export class SimulationEngine {
  public config: WarehouseConfig;
  public graph: Graph;
  public nodes: WarehouseNode[] = [];
  public chargingStations: ChargingStation[] = [];
  public packingStations: PackingStation[] = [];
  public deliveryNodes: DeliveryNode[] = [];
  public waitingNodes: WaitingNode[] = [];
  public pickupStations: { id: string; nodeId: string; coord: GridCoord; name: string }[] = [];
  public shelfNodes: WarehouseNode[] = [];
  public aisleNodes: WarehouseNode[] = [];
  public shelfIdToFacingAisle: Map<string, GridCoord> = new Map();

  public products: Map<string, Product> = new Map();

  public robotMap: HashMap<string, Robot> = new HashMap();
  public taskMap: HashMap<string, WarehouseTask> = new HashMap();
  public urgentTaskQueue: PriorityQueue<WarehouseTask> = new PriorityQueue();
  public normalTaskQueue: Queue<WarehouseTask> = new Queue();
  public chargingQueue: Queue<string> = new Queue();
  public eventHistory: LinkedList<SimulationEvent> = new LinkedList();
  public eventStack: Stack<SimulationEvent> = new Stack();

  public collisionAvoidance: CollisionAvoidance = new CollisionAvoidance();
  public shelfAccessManager: ShelfAccessManager = new ShelfAccessManager();
  public deadlockDetector: DeadlockDetector = new DeadlockDetector();
  public trafficManager: TrafficManager = new TrafficManager();
  public activeScenario: Scenario | null = null;
  public scenarioStatus: 'in_progress' | 'won' | 'lost' = 'in_progress';

  public isRunning: boolean = true;
  public speedMultiplier: number = 1.0;
  public simulationTime: number = 0;
  private lastTaskSpawnTime: number = 0;
  private lastMetricSampleTime: number = 0;

  public metrics: SimulationMetrics = {
    tasksCompleted: 0,
    tasksFailed: 0,
    totalDistanceTraveled: 0,
    averageTaskCompletionTime: 0,
    averageBatteryLevel: 100,
    activeRobotsCount: 0,
    idleRobotsCount: 0,
    chargingRobotsCount: 0,
    brokenRobotsCount: 0,
    congestion: { level: 'Low', percentage: 0, hotspots: [], reservedCount: 0 },
    uptimeSeconds: 0,
    algorithmExecutionTimes: [],
    throughputHistory: [],
    batteryHistory: [],
    deadlocksDetected: 0,
    deadlocksRecovered: 0,
  };

  public get robots(): Robot[] {
    return this.robotMap.values();
  }

  public get tasks(): WarehouseTask[] {
    return this.taskMap.values();
  }

  private taskCompletionDurations: number[] = [];
  private algorithmStats: Map<string, { totalMs: number; count: number }> = new Map();
  private taskIdCounter: number = 1000;

  constructor(initialConfig?: Partial<WarehouseConfig>) {
    this.config = {
      width: 20,
      length: 20,
      shelfRows: 4,
      shelfCols: 4,
      robotCount: 6,
      chargingStationCount: 4,
      packingStationCount: 2,
      pickupStationCount: 2,
      deliveryNodeCount: 3,
      autoTaskGeneration: false,
      taskGenerationRate: 8,
      robotSpeed: 2.8,
      batteryCapacity: 5000,
      batteryDischargeRate: 0.2,
      breakdownProbability: 0,
      obstacleFrequency: 0,
      pathfindingAlgorithm: 'astar',
      allocationStrategy: 'cost_based_adaptive',
      ...initialConfig,
    };

    const generated = WarehouseGenerator.generate(this.config);
    this.graph = generated.graph;
    this.nodes = generated.nodes;
    this.chargingStations = generated.chargingStations;
    this.packingStations = generated.packingStations;
    this.deliveryNodes = generated.deliveryNodes;
    this.waitingNodes = generated.waitingNodes;
    this.pickupStations = generated.pickupStations;
    this.shelfNodes = generated.shelfNodes;
    this.aisleNodes = generated.aisleNodes;
    this.shelfIdToFacingAisle = generated.shelfIdToFacingAisle;
    this.trafficManager = generated.trafficManager;

    this.initShelfAccessManager();

    for (const p of generated.initialProducts) {
      this.products.set(p.id, p);
    }

    this.initializeRobots();

    this.addEvent({
      id: `init_${Date.now()}`,
      timestamp: Date.now(),
      type: 'aisle_cleared',
      message: `Warehouse initialized: ${this.config.width}x${this.config.length} grid, ${this.config.robotCount} AGVs online. 2-Cell Corridors & Mutex Shelf Access enabled.`,
      severity: 'info',
    });
  }

  public initShelfAccessManager(): void {
    this.shelfAccessManager.reset();
    for (const shelf of this.shelfNodes) {
      if (shelf.shelfId) {
        const facing = this.shelfIdToFacingAisle.get(shelf.shelfId) || { x: shelf.x, y: shelf.y + 1 };
        this.shelfAccessManager.registerShelf(
          shelf.shelfId,
          { x: shelf.x, y: shelf.y },
          facing,
          this.graph,
          this.config.length
        );
      }
    }
  }

  public handleDeadlockBacktrack(victim: Robot, deadlock: import('../types').DeadlockCycle): boolean {
    const clearanceCoord = deadlock.clearanceCoord;
    const finalGoal = victim.currentRoute && victim.currentRoute.length > 0
      ? victim.currentRoute[victim.currentRoute.length - 1]
      : (victim.previousMissionState?.destinationCoord || victim.gridPosition);

    if (!victim.previousMissionState) {
      victim.previousMissionState = {
        state: victim.state === 'recovering_deadlock' || victim.state === 'backing_off' || victim.state === 'yielding' ? 'moving_to_pickup' : victim.state,
        currentTaskId: victim.currentTaskId,
        targetShelfId: victim.targetShelfId,
        targetDeliveryNodeId: victim.targetDeliveryNodeId,
        destinationCoord: { ...finalGoal },
      };
    }

    this.collisionAvoidance.clearRobotReservation(victim.id, this.graph);
    const routeFound = this.calculateRobotRoute(victim, clearanceCoord);
    victim.state = 'recovering_deadlock';
    victim.yieldTimer = 0.8;
    victim.waitTime = 0;
    victim.blockedReason = `Deadlock recovery: Backtracking to (${clearanceCoord.x}, ${clearanceCoord.y}) to break cycle [${deadlock.cycleDescription}].`;

    this.metrics.deadlocksDetected++;
    this.metrics.deadlocksRecovered++;

    this.addEvent({
      id: `deadlock_rec_${victim.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'deadlock_detected',
      message: `DEADLOCK DETECTED: Cycle [${deadlock.cycleDescription}]. Recovery initiated: ${victim.name} backtracking to (${clearanceCoord.x}, ${clearanceCoord.y}).`,
      severity: 'warning',
      robotId: victim.id,
    });

    this.deadlockDetector.recordRecovery();
    return routeFound;
  }

  public initializeRobots(): void {
    this.robotMap.clear();
    for (const bay of this.waitingNodes) {
      bay.isOccupied = false;
      bay.occupyingRobotId = undefined;
    }

    const colors = [
      '#00f0ff',
      '#3b82f6',
      '#a855f7',
      '#f59e0b',
      '#10b981',
      '#ec4899',
      '#6366f1',
      '#14b8a6',
      '#eab308',
      '#84cc16',
      '#f97316',
      '#06b6d4',
    ];

    const aisleList = this.aisleNodes.filter(n => n.y >= 2 && n.y < this.config.length - 1 && !n.isDockingZone);
    const occupiedCoords = new Set<string>();

    for (let i = 0; i < this.config.robotCount; i++) {
      const robotId = `R-${i + 1}`;
      const dock = this.chargingStations.find(d => d.assignedRobotId === robotId) ||
                   this.chargingStations[i % this.chargingStations.length];

      let spawnNode: GridCoord;
      if (dock) {
        spawnNode = { ...dock.coord };
        dock.isOccupied = true;
        dock.occupyingRobotId = robotId;
        dock.assignedRobotId = robotId;
        dock.dockState = 'AVAILABLE';
        dock.queue = [];
      } else {
        spawnNode = { x: Math.min(this.config.width - 2, 4 + i * 2), y: 0 };
      }

      const robot: Robot = {
        id: robotId,
        name: `AGV-${String(i + 1).padStart(2, '0')}`,
        color: colors[i % colors.length],
        position: { x: spawnNode.x, y: 0.25, z: spawnNode.y },
        gridPosition: { x: spawnNode.x, y: spawnNode.y },
        heading: 0,
        battery: 100,
        maxSpeed: this.config.robotSpeed * (0.95 + Math.random() * 0.1),
        loadCapacity: 50,
        maxCapacity: 3,
        cargoCount: 0,
        cargoItems: [],
        isCarrying: false,
        state: 'idle',
        home_dock_id: dock?.id || `DOCK-${String(i + 1).padStart(2, '0')}`,
        chargingStationId: dock?.id,
        waitingCoord: { ...spawnNode },
        currentRoute: [],
        currentRouteIndex: 0,
        distanceTraveled: 0,
        tasksCompleted: 0,
        completedPaths: [],
        breakdownHistory: [],
        waitTime: 0,
        animationTimer: 0,
        lastLogicalNode: { ...spawnNode },
        lastMovementTick: 0,
        health: 100,
      };

      this.robotMap.set(robot.id, robot);
    }
  }

  public addEvent(event: SimulationEvent): void {
    this.eventHistory.append(event);
    this.eventStack.push(event);

    if (this.eventHistory.size() > 300) {
      this.eventHistory.shift();
    }
  }

  public validateAndSyncTaskStates(): void {
    const allRobots = this.robotMap.values();
    const activeTasks = this.taskMap.values().filter(
      t => t.status === 'allocated' || t.status === 'picking' || t.status === 'in_progress' || t.status === 'delivering'
    );

    for (const task of activeTasks) {
      if (task.subtaskIds && task.subtaskIds.length > 0) {
        continue;
      }

      if (!task.assignedRobotId) {
        task.status = 'queued';
        task.progress = 0;
        if (task.priority === 'critical' || task.priority === 'high') {
          this.urgentTaskQueue.enqueue(task, task.priority === 'critical' ? 1 : 5);
        } else {
          this.normalTaskQueue.enqueue(task);
        }
        continue;
      }

      const robot = this.robotMap.get(task.assignedRobotId);
      if (!robot || robot.currentTaskId !== task.id) {
        task.status = 'queued';
        task.assignedRobotId = undefined;
        task.progress = 0;
        if (task.priority === 'critical' || task.priority === 'high') {
          this.urgentTaskQueue.enqueue(task, task.priority === 'critical' ? 1 : 5);
        } else {
          this.normalTaskQueue.enqueue(task);
        }
        continue;
      }

      const routeFinished = !robot.currentRoute || robot.currentRoute.length === 0 || robot.currentRouteIndex >= robot.currentRoute.length;
      const isAtDelivery = routeFinished &&
                           (robot.targetType === 'DELIVERY' || robot.isCarrying) &&
                           ((robot.gridPosition.x === task.destinationCoord.x && robot.gridPosition.y === task.destinationCoord.y) ||
                            (Math.abs(robot.position.x - task.destinationCoord.x) <= 0.25 && Math.abs(robot.position.z - task.destinationCoord.y) <= 0.25));

      if (isAtDelivery) {
        if (robot.state !== 'aligning_delivery' && robot.state !== 'delivering' && robot.state !== 'unloading') {
          if (robot.isCarrying) {
            this.completeDeliverySequence(robot);
            continue;
          } else if (task.status === 'delivering' || task.status === 'in_progress') {
            task.status = 'completed';
            task.progress = 100;
            task.completedAt = this.simulationTime;
            robot.currentTaskId = undefined;
            robot.state = 'idle';
            this.shelfAccessManager.releaseShelf(task.shelfId, robot.id);
            this.sendRobotToWaiting(robot);
            continue;
          }
        }
      }

      const isAtPickup = routeFinished &&
                         (robot.targetType === 'PICKUP' || robot.state === 'moving_to_pickup' || robot.state === 'moving_to_task') &&
                         ((robot.gridPosition.x === task.pickupCoord.x && robot.gridPosition.y === task.pickupCoord.y) ||
                          (Math.abs(robot.position.x - task.pickupCoord.x) <= 0.25 && Math.abs(robot.position.z - task.pickupCoord.y) <= 0.25));

      if (isAtPickup && !robot.isCarrying && robot.currentTaskId === task.id) {
        if (task.status === 'allocated') {
          task.status = 'picking';
          task.progress = 30;
          if (robot.state !== 'picking_up' && robot.state !== 'aligning_pickup') {
            robot.state = 'aligning_pickup';
            robot.animationTimer = 0.35;
          }
        }
      }

      if (robot.isCarrying && robot.currentTaskId === task.id) {
        if (task.status === 'allocated' || task.status === 'picking') {
          task.status = 'in_progress';
          task.progress = 50;
        }
      }
    }

    for (const task of this.taskMap.values()) {
      if (task.status === 'completed') {
        task.progress = 100;
        for (const robot of allRobots) {
          if (robot.currentTaskId === task.id && !robot.isCarrying) {
            robot.currentTaskId = undefined;
            if (robot.state === 'moving_to_delivery' || robot.state === 'delivering') {
              robot.state = 'idle';
              this.sendRobotToWaiting(robot);
            }
          }
        }
      }
    }
  }

  public tick(deltaSeconds: number): void {
    if (!this.isRunning && deltaSeconds > 0) return;

    const scaledDelta = deltaSeconds * this.speedMultiplier;
    this.simulationTime += scaledDelta;

    this.validateAndSyncTaskStates();

    if (this.config.autoTaskGeneration) {
      this.lastTaskSpawnTime += scaledDelta;
      const spawnInterval = 60 / Math.max(1, this.config.taskGenerationRate);
      if (this.lastTaskSpawnTime >= spawnInterval) {
        this.spawnRandomTask();
        this.lastTaskSpawnTime = 0;
      }
    }

    this.processTaskAllocation();

    const allRobots = this.robotMap.values();
    this.collisionAvoidance.updatePositions(allRobots);
    this.collisionAvoidance.updateReservations(allRobots, this.graph, this.simulationTime);

    this.updateRobots(scaledDelta);

    this.collisionAvoidance.updatePositions(allRobots);
    this.collisionAvoidance.updateReservations(allRobots, this.graph, this.simulationTime);

    if (this.config.breakdownProbability > 0 && Math.random() < this.config.breakdownProbability * scaledDelta * 0.05) {
      this.triggerRandomBreakdown();
    }

    this.lastMetricSampleTime += scaledDelta;
    if (this.lastMetricSampleTime >= 2.0) {
      this.updateMetrics();
      this.lastMetricSampleTime = 0;
    }

    if (this.activeScenario && this.scenarioStatus === 'in_progress') {
      this.checkScenarioConditions();
    }
  }

  public getProducts(): Product[] {
    return Array.from(this.products.values());
  }

  public getProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  public addProduct(product: Omit<Product, 'id' | 'shelfCoord' | 'status'> & { id?: string }): Product {
    const pId = product.id || `PRD-${Date.now().toString().slice(-4)}`;
    const shelfNode = this.shelfNodes.find(s => s.shelfId === product.shelfId) || this.shelfNodes[0];
    const shelfCoord = shelfNode ? { x: shelfNode.x, y: shelfNode.y } : { x: 0, y: 0 };

    const newProduct: Product = {
      ...product,
      id: pId,
      shelfCoord,
      status: product.quantity > 0 ? 'in_stock' : 'out_of_stock',
    };

    this.products.set(newProduct.id, newProduct);
    if (shelfNode && shelfNode.shelfInfo) {
      shelfNode.shelfInfo.inventoryLevel = newProduct.quantity;
    }

    this.addEvent({
      id: `prod_add_${newProduct.id}`,
      timestamp: Date.now(),
      type: 'task_created',
      message: `INVENTORY: Added product "${newProduct.name}" (${newProduct.quantity} units) to Shelf ${newProduct.shelfId}.`,
      severity: 'info',
    });

    return newProduct;
  }

  public editProduct(id: string, updates: Partial<Product>): boolean {
    const prod = this.products.get(id);
    if (!prod) return false;

    Object.assign(prod, updates);
    if (updates.quantity !== undefined) {
      prod.status = updates.quantity > 0 ? (updates.quantity < 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
      const shelfNode = this.shelfNodes.find(s => s.shelfId === prod.shelfId);
      if (shelfNode && shelfNode.shelfInfo) {
        shelfNode.shelfInfo.inventoryLevel = prod.quantity;
      }
    }

    return true;
  }

  public deleteProduct(id: string): boolean {
    return this.products.delete(id);
  }

  public createManualTask(params: {
    productId: string;
    requestedQuantity: number;
    shelfId: string;
    deliveryNodeId: string;
    priority?: TaskPriority;
    notes?: string;
    deadlineSeconds?: number;
  }): { success: boolean; message: string; tasksCreated: WarehouseTask[] } {
    const product = this.products.get(params.productId);
    if (!product) {
      return { success: false, message: `Validation Error: Product "${params.productId}" does not exist in inventory.`, tasksCreated: [] };
    }

    if (params.requestedQuantity <= 0) {
      return {
        success: false,
        message: `Validation Error: Requested quantity must be greater than 0.`,
        tasksCreated: [],
      };
    }

    if (product.quantity < params.requestedQuantity) {
      return {
        success: false,
        message: `Validation Error: Insufficient stock for "${product.name}". Requested: ${params.requestedQuantity}, Available: ${product.quantity}.`,
        tasksCreated: [],
      };
    }

    const shelfNode = this.shelfNodes.find(s => s.shelfId === params.shelfId);
    if (!shelfNode) {
      return { success: false, message: `Validation Error: Shelf "${params.shelfId}" does not exist.`, tasksCreated: [] };
    }

    const deliveryNode = this.deliveryNodes.find(d => d.id === params.deliveryNodeId) || this.deliveryNodes[0];
    if (!deliveryNode) {
      return { success: false, message: `Validation Error: Delivery Node "${params.deliveryNodeId}" does not exist.`, tasksCreated: [] };
    }

    const pickupFacingAisle = this.shelfIdToFacingAisle.get(params.shelfId) || { x: shelfNode.x, y: shelfNode.y + 1 };

    const priority = params.priority || 'normal';
    const parentTaskId = `TSK-${++this.taskIdCounter}`;
    const createdTasks: WarehouseTask[] = [];
    const isMultiBatch = params.requestedQuantity > 3;

    let parentTask: WarehouseTask | undefined = undefined;
    if (isMultiBatch) {
      parentTask = {
        id: parentTaskId,
        type: priority === 'critical' ? 'urgent_shipment' : 'order_picking',
        priority,
        productId: product.id,
        requestedQuantity: params.requestedQuantity,
        deliveredQuantity: 0,
        shelfId: params.shelfId,
        deliveryNodeId: deliveryNode.id,
        pickupNodeId: shelfNode.id,
        destinationNodeId: `node_${deliveryNode.coord.x}_${deliveryNode.coord.y}`,
        pickupCoord: pickupFacingAisle,
        shelfCoord: { x: shelfNode.x, y: shelfNode.y },
        destinationCoord: deliveryNode.coord,
        createdAt: this.simulationTime,
        deadline: params.deadlineSeconds ? this.simulationTime + params.deadlineSeconds : undefined,
        status: 'in_progress',
        estimatedDistance: Math.abs(pickupFacingAisle.x - deliveryNode.coord.x) + Math.abs(pickupFacingAisle.y - deliveryNode.coord.y),
        estimatedTime: (Math.abs(pickupFacingAisle.x - deliveryNode.coord.x) + Math.abs(pickupFacingAisle.y - deliveryNode.coord.y)) / this.config.robotSpeed,
        reassignmentCount: 0,
        payloadName: `${product.name} (Total: ${params.requestedQuantity})`,
        notes: params.notes,
        subtaskIds: [],
        totalSubtasks: Math.ceil(params.requestedQuantity / 3),
        isSubtask: false,
      };
      this.taskMap.set(parentTask.id, parentTask);
    }

    let remainingQuantity = params.requestedQuantity;
    let batchIndex = 1;
    const totalSubtasks = Math.ceil(params.requestedQuantity / 3);

    while (remainingQuantity > 0) {
      const batchSize = Math.min(3, remainingQuantity);
      remainingQuantity -= batchSize;

      const taskId = isMultiBatch ? `${parentTaskId}-${batchIndex}` : parentTaskId;

      const task: WarehouseTask = {
        id: taskId,
        parentTaskId: isMultiBatch ? parentTaskId : undefined,
        isSubtask: isMultiBatch,
        subtaskIndex: isMultiBatch ? batchIndex : undefined,
        totalSubtasks: isMultiBatch ? totalSubtasks : undefined,
        type: priority === 'critical' ? 'urgent_shipment' : 'order_picking',
        priority,
        productId: product.id,
        requestedQuantity: batchSize,
        deliveredQuantity: 0,
        shelfId: params.shelfId,
        deliveryNodeId: deliveryNode.id,
        pickupNodeId: shelfNode.id,
        destinationNodeId: `node_${deliveryNode.coord.x}_${deliveryNode.coord.y}`,
        pickupCoord: pickupFacingAisle,
        shelfCoord: { x: shelfNode.x, y: shelfNode.y },
        destinationCoord: deliveryNode.coord,
        createdAt: this.simulationTime,
        deadline: params.deadlineSeconds ? this.simulationTime + params.deadlineSeconds : undefined,
        status: 'queued',
        estimatedDistance: Math.abs(pickupFacingAisle.x - deliveryNode.coord.x) + Math.abs(pickupFacingAisle.y - deliveryNode.coord.y),
        estimatedTime: (Math.abs(pickupFacingAisle.x - deliveryNode.coord.x) + Math.abs(pickupFacingAisle.y - deliveryNode.coord.y)) / this.config.robotSpeed,
        reassignmentCount: 0,
        payloadName: `${product.name} (x${batchSize})`,
        notes: params.notes,
      };

      if (parentTask && parentTask.subtaskIds) {
        parentTask.subtaskIds.push(task.id);
      }

      this.taskMap.set(task.id, task);

      if (task.priority === 'critical' || task.priority === 'high') {
        this.urgentTaskQueue.enqueue(task, task.priority === 'critical' ? 1 : 5);
      } else {
        this.normalTaskQueue.enqueue(task);
      }

      createdTasks.push(task);
      batchIndex++;

      this.addEvent({
        id: `manual_task_${task.id}`,
        timestamp: Date.now(),
        type: 'task_created',
        message: `Task ${task.id} (${task.priority.toUpperCase()}): Pick ${batchSize}x ${product.name} from Shelf ${params.shelfId} → Deliver to ${deliveryNode.name}.${isMultiBatch ? ` [Subtask ${batchIndex - 1}/${totalSubtasks} of ${parentTaskId}]` : ''}`,
        severity: task.priority === 'critical' ? 'warning' : 'info',
        taskId: task.id,
      });
    }

    soundEffects.playTaskCreated();

    return {
      success: true,
      message: isMultiBatch
        ? `Order of ${params.requestedQuantity}x ${product.name} exceeds robot capacity (3). Split into ${createdTasks.length} subtasks under Parent Task ${parentTaskId}.`
        : `Successfully created Task ${parentTaskId} for ${params.requestedQuantity}x ${product.name}.`,
      tasksCreated: isMultiBatch && parentTask ? [parentTask, ...createdTasks] : createdTasks,
    };
  }

  private processTaskAllocation(): void {
    const maxAttempts = Math.max(1, this.robotMap.size());
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      let taskToAllocate: WarehouseTask | undefined = undefined;

      if (!this.urgentTaskQueue.isEmpty()) {
        taskToAllocate = this.urgentTaskQueue.dequeue();
      } else if (!this.normalTaskQueue.isEmpty()) {
        taskToAllocate = this.normalTaskQueue.dequeue();
      }

      if (!taskToAllocate) break;

      if (taskToAllocate.phase === 'ITEM_RECOVERY_REQUIRED') {
        const brokenRobot = taskToAllocate.brokenRobotId ? this.robotMap.get(taskToAllocate.brokenRobotId) : undefined;
        if (brokenRobot) {
          const dispatched = this.dispatchRecoveryForTask(taskToAllocate, brokenRobot);
          if (!dispatched) {
            this.urgentTaskQueue.enqueue(taskToAllocate, 1);
          }
          continue;
        }
      }

      if (taskToAllocate.status !== 'queued' || (taskToAllocate.subtaskIds && taskToAllocate.subtaskIds.length > 0)) continue;

      const allRobots = this.robotMap.values();
      const candidate = TaskAllocator.allocate(taskToAllocate, allRobots, this.config.allocationStrategy);

      if (!candidate) {
        if (taskToAllocate.priority === 'critical' || taskToAllocate.priority === 'high') {
          this.urgentTaskQueue.enqueue(taskToAllocate, taskToAllocate.priority === 'critical' ? 1 : 5);
        } else {
          this.normalTaskQueue.enqueue(taskToAllocate);
        }
        break;
      }

      const robot = candidate.robot;
      taskToAllocate.status = 'allocated';
      taskToAllocate.progress = 10;
      taskToAllocate.assignedRobotId = robot.id;
      taskToAllocate.startedAt = this.simulationTime;
      taskToAllocate.allocationReasoning = candidate.reasoning;

      robot.currentTaskId = taskToAllocate.id;
      robot.targetShelfId = taskToAllocate.shelfId;
      robot.targetDeliveryNodeId = taskToAllocate.deliveryNodeId;
      robot.lastAllocationScore = candidate.score;
      robot.allocationReasoning = candidate.reasoning;
      robot.navigationMode = 'NORMAL_TASK';
      robot.blockedReason = undefined;
      robot.waitingReason = undefined;

      if (robot.waitingNodeId) {
        const currentBay = this.waitingNodes.find(w => w.id === robot.waitingNodeId);
        if (currentBay && (currentBay.occupyingRobotId === robot.id || currentBay.occupiedBy === robot.id || currentBay.reservedBy === robot.id)) {
          currentBay.isOccupied = false;
          currentBay.occupyingRobotId = undefined;
          currentBay.occupiedBy = undefined;
          currentBay.reservedBy = undefined;
          currentBay.waitingReason = undefined;
        }
        robot.waitingNodeId = undefined;
      }

      if (robot.home_dock_id) {
        const homeDock = this.chargingStations.find(d => d.id === robot.home_dock_id);
        if (homeDock && homeDock.occupyingRobotId === robot.id) {
          homeDock.isOccupied = false;
          homeDock.occupyingRobotId = undefined;
          homeDock.dockState = 'AVAILABLE';
        }
      }

      const shelfQueue = this.trafficManager.requestQueueSlot(taskToAllocate.shelfId, robot.id, candidate.score);
      if (shelfQueue) {
        robot.queueSlotIndex = shelfQueue.slotIndex;
        robot.queueStatus = shelfQueue.displayStatus;
      }

      if (shelfQueue && shelfQueue.isFrontOfQueue) {
        robot.state = 'moving_to_pickup';
        robot.targetType = 'PICKUP';
        robot.targetNode = taskToAllocate.pickupCoord;
        robot.stagedShelfId = undefined;
        robot.stagedAtCoord = undefined;
        robot.waitingReason = undefined;
        taskToAllocate.phase = 'EN_ROUTE_TO_PICKUP';

        const routeFound = this.calculateRobotRoute(robot, taskToAllocate.pickupCoord, 'NORMAL_TASK');
        if (!routeFound) {
          robot.state = 'waiting_for_path';
          robot.waitingReason = 'WAITING_FOR_PATH';
          robot.blockedReason = `Cannot pathfind to Shelf ${taskToAllocate.shelfId}: Aisle is obstructed.`;
        }
      } else {
        const stagingTarget = shelfQueue ? shelfQueue.coord : taskToAllocate.pickupCoord;
        robot.state = 'staged';
        robot.targetType = 'STAGING';
        robot.targetNode = stagingTarget;
        robot.stagedShelfId = taskToAllocate.shelfId;
        robot.stagedAtCoord = stagingTarget;
        robot.waitingReason = 'WAITING_FOR_SHELF';
        robot.blockedReason = `WAITING FOR SHELF ACCESS (POSITION ${robot.queueSlotIndex || 1} IN QUEUE)`;
        taskToAllocate.phase = 'ASSIGNED';

        this.calculateRobotRoute(robot, stagingTarget, 'NORMAL_TASK');
      }

      this.addEvent({
        id: `alloc_${taskToAllocate.id}_${robot.id}`,
        timestamp: Date.now(),
        type: 'task_allocated',
        message: `Task ${taskToAllocate.id} allocated to ${robot.name}. ${shelfQueue?.isFrontOfQueue ? 'Shelf access granted.' : `Shelf busy, queueing at (${robot.stagedAtCoord?.x}, ${robot.stagedAtCoord?.y}) [${robot.queueStatus || 'STAGED'}].`} ${candidate.reasoning}`,
        severity: 'info',
        robotId: robot.id,
        taskId: taskToAllocate.id,
      });
    }
  }

  public calculateRobotRoute(
    robot: Robot,
    destination: GridCoord,
    mode?: NavigationMode,
    targetDockId?: string,
    avoidCoords?: GridCoord[],
    allowOppositeLane?: boolean
  ): boolean {
    const navMode = mode || robot.navigationMode || 'NORMAL_TASK';
    const isOppositeAllowed = allowOppositeLane ?? robot.isTemporaryOppositeLane ?? false;
    const t0 = performance.now();

    const runRouteWithAvoid = (coordsToAvoid: GridCoord[]): PathfindingResult => {
      const temporarilyBlockedNodes: WarehouseNode[] = [];
      for (const c of coordsToAvoid) {
        if (c.x === destination.x && c.y === destination.y) continue;
        if (c.x === robot.gridPosition.x && c.y === robot.gridPosition.y) continue;
        const n = this.graph.getNodeByCoord(c.x, c.y);
        if (n && !n.isBlocked) {
          n.isBlocked = true;
          temporarilyBlockedNodes.push(n);
        }
      }

      const res = PathfindingManager.findPath(
        this.graph,
        robot.gridPosition,
        destination,
        this.config.pathfindingAlgorithm,
        {
          reservedForRobotId: robot.id,
          ignoreBlocked: false,
          ignoreReserved: true,
          goalCoord: destination,
          navigationMode: navMode,
          targetDockId: targetDockId || (navMode === 'CHARGING_TASK' ? robot.chargingStationId : undefined),
          allowOppositeLane: isOppositeAllowed,
        }
      );

      for (const n of temporarilyBlockedNodes) {
        n.isBlocked = false;
      }

      return res;
    };

    let result: PathfindingResult;
    const explicitAvoid = avoidCoords || [];

    if (explicitAvoid.length === 0) {
      const stationaryOtherRobots: GridCoord[] = [];
      for (const other of this.robotMap.values()) {
        if (other.id !== robot.id) {
          if (other.state === 'idle' || other.state === 'staged' || other.state === 'waiting' || other.state === 'breakdown') {
            stationaryOtherRobots.push({ x: other.gridPosition.x, y: other.gridPosition.y });
          }
        }
      }

      result = runRouteWithAvoid(stationaryOtherRobots);

      if (!result.path || result.path.length === 0) {
        result = runRouteWithAvoid([]);
      }
    } else {
      result = runRouteWithAvoid(explicitAvoid);
    }

    const durationMs = performance.now() - t0;

    const algoKey = this.config.pathfindingAlgorithm;
    const currStats = this.algorithmStats.get(algoKey) || { totalMs: 0, count: 0 };
    currStats.totalMs += durationMs;
    currStats.count++;
    this.algorithmStats.set(algoKey, currStats);

    if (result.path && result.path.length > 0) {
      robot.currentRoute = result.path;
      robot.currentRouteIndex = result.path.length > 1 ? 1 : 0;
      robot.blockedReason = undefined;
      robot.waitingReason = undefined;
      robot.navigationMode = navMode;
      robot.lastLogicalNode = { ...robot.gridPosition };
      robot.lastMovementTick = this.simulationTime;

      const nextNode = this.graph.getNodeByCoord(result.path[robot.currentRouteIndex].x, result.path[robot.currentRouteIndex].y);
      if (nextNode) {
        robot.currentLaneId = nextNode.laneId;
        robot.assignedTrafficDirection = nextNode.trafficDirection;
      }

      return true;
    }

    robot.blockedReason = `No valid path available because destination (${destination.x}, ${destination.y}) is blocked.`;
    return false;
  }

  public getAvailableWaitingBay(robot: Robot): WaitingNode | undefined {
    if (robot.waitingNodeId) {
      const assigned = this.waitingNodes.find(w => w.id === robot.waitingNodeId);
      if (
        assigned &&
        (!assigned.isOccupied || assigned.occupiedBy === robot.id || assigned.occupyingRobotId === robot.id) &&
        (!assigned.reservedBy || assigned.reservedBy === robot.id)
      ) {
        return assigned;
      }
    }

    let nearest: WaitingNode | undefined = undefined;
    let minDistance = Infinity;

    for (const bay of this.waitingNodes) {
      const isFree =
        (!bay.isOccupied || bay.occupiedBy === robot.id || bay.occupyingRobotId === robot.id) &&
        (!bay.reservedBy || bay.reservedBy === robot.id);
      if (isFree) {
        const dist = Math.abs(bay.coord.x - robot.gridPosition.x) + Math.abs(bay.coord.y - robot.gridPosition.y);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = bay;
        }
      }
    }

    return nearest;
  }

  public sendRobotToHomeDock(robot: Robot): boolean {
    if (robot.isCarrying && robot.battery >= 10) {
      if (robot.currentTaskId) {
        const task = this.taskMap.get(robot.currentTaskId);
        if (task) {
          robot.state = 'moving_to_delivery';
          robot.targetType = 'DELIVERY';
          robot.targetNode = task.destinationCoord;
          task.phase = 'EN_ROUTE_TO_DELIVERY';
          return this.calculateRobotRoute(robot, task.destinationCoord, 'NORMAL_TASK');
        }
      }
      return false;
    }

    const dock = this.chargingStations.find(d => d.id === robot.home_dock_id || d.assignedRobotId === robot.id);
    if (!dock) return false;

    robot.chargingStationId = dock.id;
    robot.targetType = 'DOCK';
    robot.targetNode = dock.coord;
    robot.waitingNodeId = undefined;
    robot.navigationMode = 'CHARGING_TASK';

    if (dock.isOccupied && dock.occupyingRobotId && dock.occupyingRobotId !== robot.id) {
      if (!dock.queue) dock.queue = [];
      if (!dock.queue.includes(robot.id)) dock.queue.push(robot.id);
      const stagingCoord = { x: dock.coord.x, y: 1 };
      const routeFound = this.calculateRobotRoute(robot, stagingCoord, 'CHARGING_TASK', dock.id);
      robot.state = 'returning_to_dock';
      robot.blockedReason = `Dock ${dock.id} occupied; queued at approach (${stagingCoord.x}, ${stagingCoord.y}).`;
      return routeFound;
    }

    dock.isOccupied = true;
    dock.occupyingRobotId = robot.id;
    dock.dockState = 'OCCUPIED';

    const routeFound = this.calculateRobotRoute(robot, dock.coord, 'CHARGING_TASK', dock.id);
    if (routeFound) {
      robot.state = robot.battery < 20 ? 'going_to_charge' : 'returning_to_dock';
      robot.blockedReason = undefined;
      this.addEvent({
        id: `return_dock_${robot.id}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'movement_started',
        message: `${robot.name} en route to Home Dock ${dock.id} at (${dock.coord.x}, ${dock.coord.y}).`,
        severity: 'info',
        robotId: robot.id,
      });
      return true;
    } else {
      const stagingCoord = { x: dock.coord.x, y: 1 };
      const stepOut = this.calculateRobotRoute(robot, stagingCoord, 'CHARGING_TASK', dock.id);
      if (stepOut) {
        robot.state = 'returning_to_dock';
      }
      return stepOut;
    }
  }

  public sendRobotToWaiting(robot: Robot): boolean {
    if (robot.isCarrying && robot.battery >= 10) {
      if (robot.currentTaskId) {
        const task = this.taskMap.get(robot.currentTaskId);
        if (task) {
          robot.state = 'moving_to_delivery';
          robot.targetType = 'DELIVERY';
          robot.targetNode = task.destinationCoord;
          task.phase = 'EN_ROUTE_TO_DELIVERY';
          return this.calculateRobotRoute(robot, task.destinationCoord, 'NORMAL_TASK');
        }
      }
      return false;
    }
    return this.sendRobotToHomeDock(robot);
  }

  public determineRobotPriority(robotA: Robot, robotB: Robot): { higher: Robot; lower: Robot } {
    const getStateWeight = (r: Robot): number => {
      if (r.state === 'moving_to_delivery' || r.state === 'delivering' || r.state === 'aligning_delivery' || r.cargoCount > 0) {
        return 100;
      }
      if (r.state === 'picking_up' || r.state === 'aligning_pickup') {
        return 90;
      }
      if (r.state === 'moving_to_pickup') {
        return 50;
      }
      if (r.state === 'going_to_charge') {
        return r.battery < 15 ? 85 : 40;
      }
      if (r.state === 'returning') {
        return 30;
      }
      if (r.state === 'idle') {
        return 10;
      }
      return 0;
    };

    const weightA = getStateWeight(robotA);
    const weightB = getStateWeight(robotB);

    if (weightA !== weightB) {
      return weightA > weightB ? { higher: robotA, lower: robotB } : { higher: robotB, lower: robotA };
    }

    const getTaskPriorityWeight = (r: Robot): number => {
      if (!r.currentTaskId) return 0;
      const t = this.taskMap.get(r.currentTaskId);
      if (!t) return 0;
      if (t.priority === 'critical') return 4;
      if (t.priority === 'high') return 3;
      if (t.priority === 'normal') return 2;
      return 1;
    };
    const taskA = getTaskPriorityWeight(robotA);
    const taskB = getTaskPriorityWeight(robotB);
    if (taskA !== taskB) {
      return taskA > taskB ? { higher: robotA, lower: robotB } : { higher: robotB, lower: robotA };
    }

    const remainingA = robotA.currentRoute ? Math.max(0, robotA.currentRoute.length - robotA.currentRouteIndex) : 999;
    const remainingB = robotB.currentRoute ? Math.max(0, robotB.currentRoute.length - robotB.currentRouteIndex) : 999;
    if (remainingA !== remainingB) {
      return remainingA < remainingB ? { higher: robotA, lower: robotB } : { higher: robotB, lower: robotA };
    }

    return robotA.id < robotB.id ? { higher: robotA, lower: robotB } : { higher: robotB, lower: robotA };
  }

  public findClearanceNode(robot: Robot, conflictingRobot: Robot): GridCoord | undefined {
    const node = this.graph.getNodeByCoord(robot.gridPosition.x, robot.gridPosition.y);
    if (!node) return undefined;
    const neighbors = this.graph.getNeighbors(node.id, { ignoreBlocked: false, ignoreReserved: true });

    const conflictPathSet = new Set<string>();
    conflictPathSet.add(Graph.coordKey(conflictingRobot.gridPosition.x, conflictingRobot.gridPosition.y));
    if (conflictingRobot.currentRoute) {
      const maxConflictLookahead = Math.min(conflictingRobot.currentRoute.length, conflictingRobot.currentRouteIndex + 4);
      for (let i = conflictingRobot.currentRouteIndex; i < maxConflictLookahead; i++) {
        const c = conflictingRobot.currentRoute[i];
        if (c) conflictPathSet.add(Graph.coordKey(c.x, c.y));
      }
    }

    interface Candidate {
      coord: GridCoord;
      score: number;
    }
    const candidates: Candidate[] = [];

    let prevCoord: GridCoord | undefined = undefined;
    if (robot.currentRoute && robot.currentRouteIndex > 0) {
      prevCoord = robot.currentRoute[robot.currentRouteIndex - 1];
    }

    for (const { node: neighbor } of neighbors) {
      const nKey = Graph.coordKey(neighbor.x, neighbor.y);

      if (this.collisionAvoidance.isOccupied(neighbor.x, neighbor.y)) {
        continue;
      }
      if (neighbor.isBlocked || neighbor.type === 'shelf') {
        continue;
      }

      if (conflictPathSet.has(nKey)) {
        continue;
      }

      if (
        robot.navigationMode !== 'CHARGING_TASK' &&
        (neighbor.y < 2 ||
          neighbor.isDockingZone ||
          neighbor.navigationType === 'DOCK' ||
          neighbor.navigationType === 'DOCK_APPROACH' ||
          neighbor.navigationType === 'RESTRICTED')
      ) {
        continue;
      }

      let score = 0;

      const isBackwardStep = prevCoord && neighbor.x === prevCoord.x && neighbor.y === prevCoord.y;
      if (isBackwardStep) {
        score += 20;
      }

      if (neighbor.y === 2 || neighbor.y === 3 || neighbor.y >= this.config.length - 3) {
        score += 15;
      }

      if (neighbor.x === 0 || neighbor.x === this.config.width - 1 || neighbor.x === Math.floor(this.config.width / 2)) {
        score += 12;
      }

      if (neighbor.type === 'waiting') {
        score += 10;
      }

      const dist = Math.abs(neighbor.x - conflictingRobot.gridPosition.x) + Math.abs(neighbor.y - conflictingRobot.gridPosition.y);
      score += dist * 4;

      candidates.push({ coord: { x: neighbor.x, y: neighbor.y }, score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].coord;
    }

    const visited = new Set<string>();
    visited.add(Graph.coordKey(robot.gridPosition.x, robot.gridPosition.y));
    const queue: { coord: GridCoord; dist: number }[] = [{ coord: { ...robot.gridPosition }, dist: 0 }];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.dist >= 15) break;

      const currNode = this.graph.getNodeByCoord(curr.coord.x, curr.coord.y);
      if (!currNode) continue;
      const currNeighbors = this.graph.getNeighbors(currNode.id, { ignoreBlocked: false, ignoreReserved: true });

      for (const { node: n } of currNeighbors) {
        const key = Graph.coordKey(n.x, n.y);
        if (visited.has(key) || n.isBlocked || n.type === 'shelf' || this.collisionAvoidance.isOccupied(n.x, n.y)) continue;
        visited.add(key);

        if (!conflictPathSet.has(key)) {
          return { x: n.x, y: n.y };
        }

        queue.push({ coord: { x: n.x, y: n.y }, dist: curr.dist + 1 });
      }
    }

    return undefined;
  }

  public handleRobotBackoff(robot: Robot, conflictingRobot: Robot): boolean {
    const clearanceCoord = this.findClearanceNode(robot, conflictingRobot);
    if (!clearanceCoord) {
      return false;
    }

    const finalGoal = robot.currentRoute && robot.currentRoute.length > 0
      ? robot.currentRoute[robot.currentRoute.length - 1]
      : (robot.previousMissionState?.destinationCoord || robot.gridPosition);

    if (!robot.previousMissionState) {
      robot.previousMissionState = {
        state: robot.state === 'backing_off' || robot.state === 'yielding' ? 'moving_to_pickup' : robot.state,
        currentTaskId: robot.currentTaskId,
        targetShelfId: robot.targetShelfId,
        targetDeliveryNodeId: robot.targetDeliveryNodeId,
        destinationCoord: { ...finalGoal },
      };
    }

    this.collisionAvoidance.clearRobotReservation(robot.id, this.graph);

    const backoffRouteFound = this.calculateRobotRoute(
      robot,
      clearanceCoord,
      undefined,
      undefined,
      [{ x: conflictingRobot.gridPosition.x, y: conflictingRobot.gridPosition.y }]
    );
    robot.state = 'backing_off';
    robot.yieldTargetRobotId = conflictingRobot.id;
    robot.yieldTimer = 2.0;
    robot.waitTime = 0;
    robot.waitingReason = 'WAITING_FOR_ROBOT';
    robot.lastMovementTick = this.simulationTime;
    robot.blockedReason = `Backing off to (${clearanceCoord.x}, ${clearanceCoord.y}) to yield right-of-way for ${conflictingRobot.name}.`;

    this.addEvent({
      id: `backoff_${robot.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'rerouted',
      message: `ADAPTIVE BACKOFF: ${robot.name} yielding right-of-way. Backing off to (${clearanceCoord.x}, ${clearanceCoord.y}) to clear path for ${conflictingRobot.name}.`,
      severity: 'warning',
      robotId: robot.id,
    });

    return backoffRouteFound;
  }

  private updateRobots(deltaSeconds: number): void {
    const allRobots = Array.from(this.robotMap.values());

    const hasWaiting = allRobots.some(r => r.waitTime >= 0.5 || r.state === 'waiting_for_path');
    if (hasWaiting) {
      const deadlock = this.deadlockDetector.detectDeadlock(allRobots, this.collisionAvoidance, this.graph);
      if (deadlock && deadlock.victimRobotId) {
        const victim = this.robotMap.get(deadlock.victimRobotId);
        if (victim && victim.state !== 'recovering_deadlock') {
          this.handleDeadlockBacktrack(victim, deadlock);
        }
      }
    }

    for (const robot of allRobots) {
      if (robot.isPaused) {
        continue;
      }

      if (robot.state === 'breakdown' || robot.state === 'maintenance') {
        robot.blockedReason = 'Robot motor breakdown. Maintenance required.';
        continue;
      }

      if (robot.state === 'staged' && robot.currentTaskId) {
        const task = this.taskMap.get(robot.currentTaskId);
        if (task) {
          const targetShelfId = robot.stagedShelfId || task.shelfId;
          if (!robot.isCarrying && targetShelfId) {
            robot.stagedShelfId = targetShelfId;
            const occupiedCoords = new Set(allRobots.map(r => Graph.coordKey(r.gridPosition.x, r.gridPosition.y)));
            const access = this.shelfAccessManager.requestAccess(targetShelfId, robot.id, occupiedCoords);
            const queueInfo = this.trafficManager.requestQueueSlot(targetShelfId, robot.id);
            if (queueInfo) {
              robot.queueSlotIndex = queueInfo.slotIndex;
              robot.queueStatus = queueInfo.displayStatus;
            }
            if (access.granted || (queueInfo && queueInfo.isFrontOfQueue)) {
              robot.state = 'moving_to_pickup';
              robot.stagedShelfId = undefined;
              robot.stagedAtCoord = undefined;
              robot.blockedReason = undefined;
              robot.waitingReason = undefined;
              const routed = this.calculateRobotRoute(robot, task.pickupCoord);
              if (!routed) {
                robot.state = 'waiting_for_path';
                robot.blockedReason = `Cannot pathfind to Shelf ${task.shelfId}: Aisle is obstructed.`;
              } else {
                this.addEvent({
                  id: `staged_granted_${robot.id}_${Date.now()}`,
                  timestamp: Date.now(),
                  type: 'shelf_reserved',
                  message: `Shelf ${task.shelfId} access granted to ${robot.name}. Moving to pickup.`,
                  severity: 'info',
                  robotId: robot.id,
                  taskId: task.id,
                });
              }
            }
          } else if (robot.isCarrying && robot.targetDeliveryNodeId) {
            const delQueue = this.trafficManager.requestQueueSlot(task.deliveryNodeId, robot.id);
            if (delQueue) {
              robot.queueSlotIndex = delQueue.slotIndex;
              robot.queueStatus = delQueue.displayStatus;
              if (delQueue.isFrontOfQueue) {
                robot.state = 'moving_to_delivery';
                robot.stagedAtCoord = undefined;
                robot.blockedReason = undefined;
                robot.waitingReason = undefined;
                this.calculateRobotRoute(robot, task.destinationCoord, 'NORMAL_TASK');
              }
            }
          }
        }
      }

      if (robot.state === 'waiting_for_path') {
        robot.waitTime += deltaSeconds;
        if (robot.waitTime >= 1.0) {
          robot.waitTime = 0;
          if (robot.currentTaskId) {
            const task = this.taskMap.get(robot.currentTaskId);
            if (task) {
              const dest = robot.isCarrying ? task.destinationCoord : task.pickupCoord;
              const found = this.calculateRobotRoute(robot, dest);
              if (found) {
                robot.state = robot.isCarrying ? 'moving_to_delivery' : 'moving_to_pickup';
                robot.blockedReason = undefined;
              }
            }
          } else {
            this.sendRobotToWaiting(robot);
          }
        }
        continue;
      }

      if (robot.state === 'charging') {
        const dock = this.chargingStations.find(s => s.id === robot.home_dock_id || s.id === robot.chargingStationId);
        if (dock) {
          dock.isOccupied = true;
          dock.occupyingRobotId = robot.id;
          dock.dockState = 'CHARGING';
          const fullyCharged = BatteryManager.chargeRobot(robot, dock, deltaSeconds);
          if (fullyCharged || robot.battery >= 100) {
            robot.battery = 100;
            robot.state = 'idle';
            robot.navigationMode = 'NORMAL_TASK';
            dock.dockState = 'AVAILABLE';
            robot.blockedReason = undefined;
            robot.waitingReason = undefined;

            this.addEvent({
              id: `charged_${robot.id}_${Date.now()}`,
              timestamp: Date.now(),
              type: 'charging_finished',
              message: `Robot ${robot.name} reached 100% charge in Home Dock ${dock.id}. Ready for task assignment.`,
              severity: 'success',
              robotId: robot.id,
            });

            this.processTaskAllocation();
          }
        }
        continue;
      }

      if (
        robot.battery < BatteryManager.CRITICAL_BATTERY_THRESHOLD &&
        robot.state !== 'returning_to_dock' &&
        robot.state !== 'going_to_charge'
      ) {
        if (robot.currentTaskId) {
          const task = this.taskMap.get(robot.currentTaskId);
          if (task) {
            if (task.shelfId) {
              this.shelfAccessManager.releaseShelf(task.shelfId, robot.id);
              this.shelfAccessManager.cancelRequest(task.shelfId, robot.id);
              this.trafficManager.releaseQueueSlot(task.shelfId, robot.id);
            }
            if (task.deliveryNodeId) {
              this.trafficManager.releaseQueueSlot(task.deliveryNodeId, robot.id);
            }
            task.status = 'queued';
            task.assignedRobotId = undefined;
            task.progress = 0;
            if (task.priority === 'critical' || task.priority === 'high') {
              this.urgentTaskQueue.enqueue(task, task.priority === 'critical' ? 1 : 5);
            } else {
              this.normalTaskQueue.enqueue(task);
            }
          }
          robot.currentTaskId = undefined;
          robot.targetShelfId = undefined;
          robot.targetDeliveryNodeId = undefined;
          robot.queueSlotIndex = undefined;
          robot.queueStatus = undefined;
          robot.isCarrying = false;
          robot.cargoCount = 0;
          robot.cargoItems = [];
          robot.carriedItemName = undefined;
        }
        this.addEvent({
          id: `crit_bat_${robot.id}_${Date.now()}`,
          timestamp: Date.now(),
          type: 'battery_low',
          message: `CRITICAL BATTERY: ${robot.name} at ${robot.battery.toFixed(0)}% (<15%). Aborting mission and routing to Charging Station.`,
          severity: 'warning',
          robotId: robot.id,
        });

        this.sendRobotToHomeDock(robot);
        continue;
      }

      if (robot.isCarrying && robot.battery >= 10) {
        if (
          robot.state === 'idle' ||
          robot.state === 'returning_to_dock' ||
          (robot.state === 'waiting' && !robot.blockedReason?.startsWith('WAITING FOR'))
        ) {
          if (robot.currentTaskId) {
            const task = this.taskMap.get(robot.currentTaskId);
            if (task) {
              robot.state = 'moving_to_delivery';
              robot.targetType = 'DELIVERY';
              robot.targetNode = task.destinationCoord;
              task.phase = 'EN_ROUTE_TO_DELIVERY';
              this.calculateRobotRoute(robot, task.destinationCoord, 'NORMAL_TASK');
            }
          }
        }
      }

      if (robot.state === 'idle' && !robot.currentTaskId && robot.currentRoute.length === 0) {
        const homeDock = this.chargingStations.find(d => d.id === robot.home_dock_id);
        const isAtHomeDock = homeDock && robot.gridPosition.x === homeDock.coord.x && robot.gridPosition.y === homeDock.coord.y;
        if (!isAtHomeDock) {
          this.sendRobotToHomeDock(robot);
          continue;
        }
      }

      const currPosNode = this.graph.getNodeByCoord(robot.gridPosition.x, robot.gridPosition.y);
      if (robot.state === 'yielding' || robot.state === 'backing_off') {
        robot.movementMode = 'YIELDING';
      } else if (robot.state === 'staged') {
        robot.movementMode = 'STAGING';
      } else if (currPosNode?.isIntersection) {
        robot.movementMode = 'INTERSECTION';
      } else if (currPosNode?.isTwoWayCorridor) {
        robot.movementMode = 'LANE_FOLLOWING';
      } else {
        robot.movementMode = 'FREE_MOVEMENT';
      }

      if (robot.currentTaskId) {
        const currentTask = this.taskMap.get(robot.currentTaskId);
        if (currentTask) {
          if (robot.isCarrying) {
            robot.targetType = robot.state === 'staged' ? 'STAGING' : 'DELIVERY';
            robot.targetNode = robot.state === 'staged' ? robot.stagedAtCoord : currentTask.destinationCoord;
          } else if (robot.isRecoveryRobot) {
            robot.targetType = 'RECOVERY';
          } else {
            robot.targetType = robot.state === 'staged' ? 'STAGING' : 'PICKUP';
            robot.targetNode = robot.state === 'staged' ? robot.stagedAtCoord : currentTask.pickupCoord;
          }
        }
      } else if (robot.state === 'returning_to_dock') {
        robot.targetType = 'DOCK';
      } else if (robot.state === 'waiting' || robot.state === 'returning') {
        robot.targetType = 'WAITING';
      }

      if (
        robot.state === 'moving_to_pickup' ||
        robot.state === 'moving_to_delivery' ||
        robot.state === 'rerouting' ||
        robot.state === 'returning_to_dock' ||
        robot.state === 'going_to_charge'
      ) {
        if (
          robot.lastProgressPosition &&
          robot.lastProgressPosition.x === robot.gridPosition.x &&
          robot.lastProgressPosition.y === robot.gridPosition.y
        ) {
          robot.ticksWithoutProgress = (robot.ticksWithoutProgress || 0) + deltaSeconds;
        } else {
          robot.lastProgressPosition = { ...robot.gridPosition };
          robot.ticksWithoutProgress = 0;
        }

        const timeWithoutMovement = Math.max(
          robot.ticksWithoutProgress || 0,
          this.simulationTime - (robot.lastMovementTick ?? this.simulationTime)
        );

        if (timeWithoutMovement >= 3.0 && !robot.waitingReason) {
          if (robot.targetShelfId && !robot.isCarrying) {
            robot.waitingReason = 'WAITING_FOR_SHELF';
          } else if (robot.blockedReason?.includes('Waiting for')) {
            robot.waitingReason = 'WAITING_FOR_ROBOT';
          } else {
            robot.waitingReason = 'WAITING_FOR_PATH';
          }
        }

        if (robot.currentTaskId) {
          const t = this.taskMap.get(robot.currentTaskId);
          this.deadlockDetector.calculateEffectivePriority(robot, t?.priority);
        }

        if (timeWithoutMovement > 3.5 && timeWithoutMovement - deltaSeconds <= 3.5) {
          if (robot.currentTaskId) {
            const t = this.taskMap.get(robot.currentTaskId);
            if (t) {
              const dest = robot.isCarrying ? t.destinationCoord : t.pickupCoord;
              this.calculateRobotRoute(robot, dest);
            }
          } else if (robot.state === 'returning_to_dock' || robot.state === 'going_to_charge') {
            this.sendRobotToHomeDock(robot);
          }
        }

        if (timeWithoutMovement > 8.0) {
          if (!robot.isCarrying && robot.currentTaskId) {
            const task = this.taskMap.get(robot.currentTaskId);
            if (task) {
              if (task.shelfId) {
                this.shelfAccessManager.releaseShelf(task.shelfId, robot.id);
                this.shelfAccessManager.cancelRequest(task.shelfId, robot.id);
                this.trafficManager.releaseQueueSlot(task.shelfId, robot.id);
              }
              if (task.deliveryNodeId) {
                this.trafficManager.releaseQueueSlot(task.deliveryNodeId, robot.id);
              }
              task.status = 'queued';
              task.priority = 'critical';
              task.assignedRobotId = undefined;
              task.reassignmentCount = (task.reassignmentCount || 0) + 1;
              this.urgentTaskQueue.enqueue(task, 1);

              robot.currentTaskId = undefined;
              robot.targetShelfId = undefined;
              robot.targetDeliveryNodeId = undefined;
              robot.queueSlotIndex = undefined;
              robot.queueStatus = undefined;
              robot.state = 'idle';
              robot.ticksWithoutProgress = 0;
              robot.currentRoute = [];
              robot.currentRouteIndex = 0;
              robot.blockedReason = undefined;

              this.addEvent({
                id: `watchdog_reassign_${task.id}_${Date.now()}`,
                timestamp: Date.now(),
                type: 'stuck_detected',
                message: `WATCHDOG ALERT: ${robot.name} stuck without progress > 8s. Task ${task.id} reassigned to Priority Queue with CRITICAL priority.`,
                severity: 'warning',
                robotId: robot.id,
                taskId: task.id,
              });

              this.sendRobotToWaiting(robot);
              continue;
            }
          } else if (robot.isCarrying && robot.currentTaskId) {
            const task = this.taskMap.get(robot.currentTaskId);
            if (task) {
              const otherRobotCoords = Array.from(this.robotMap.values())
                .filter(r => r.id !== robot.id)
                .map(r => ({ x: r.gridPosition.x, y: r.gridPosition.y }));

              let rerouted = this.calculateRobotRoute(
                robot,
                task.destinationCoord,
                'NORMAL_TASK',
                undefined,
                otherRobotCoords
              );

              if (!rerouted) {
                let blocker: Robot | undefined;
                const nextStep = robot.currentRoute && robot.currentRoute.length > robot.currentRouteIndex
                  ? robot.currentRoute[robot.currentRouteIndex]
                  : undefined;
                if (nextStep) {
                  const occupantId = this.collisionAvoidance.getOccupant(nextStep.x, nextStep.y);
                  if (occupantId && occupantId !== robot.id) {
                    blocker = this.robotMap.get(occupantId);
                  }
                }
                if (!blocker && robot.currentRoute) {
                  for (let i = robot.currentRouteIndex; i < Math.min(robot.currentRoute.length, robot.currentRouteIndex + 3); i++) {
                    const c = robot.currentRoute[i];
                    const occId = this.collisionAvoidance.getOccupant(c.x, c.y);
                    if (occId && occId !== robot.id) {
                      blocker = this.robotMap.get(occId);
                      break;
                    }
                  }
                }

                if (blocker) {
                  if (blocker.state === 'idle' || blocker.state === 'waiting_for_path' || blocker.state === 'waiting') {
                    if (blocker.currentTaskId) {
                      this.handleRobotBackoff(blocker, robot);
                    } else {
                      this.sendRobotToWaiting(blocker);
                    }
                  } else if (blocker.state === 'staged') {
                    this.handleRobotBackoff(blocker, robot);
                  } else if (!blocker.isCarrying) {
                    this.handleRobotBackoff(blocker, robot);
                  } else {
                    const priority = this.determineRobotPriority(robot, blocker);
                    if (priority.lower.id === robot.id) {
                      this.handleRobotBackoff(robot, blocker);
                    } else {
                      this.handleRobotBackoff(blocker, robot);
                    }
                  }
                } else {
                  this.calculateRobotRoute(robot, task.destinationCoord, 'NORMAL_TASK');
                }
              }

              robot.ticksWithoutProgress = 4.0;
              this.addEvent({
                id: `watchdog_carrying_${robot.id}_${Date.now()}`,
                timestamp: Date.now(),
                type: 'stuck_detected',
                message: `WATCHDOG UNSTICK: ${robot.name} carrying cargo was delayed > 8s. Re-planned route and resolved corridor blockage.`,
                severity: 'info',
                robotId: robot.id,
                taskId: task.id,
              });
            }
          } else if (robot.state === 'returning_to_dock' || robot.state === 'going_to_charge') {
            this.sendRobotToHomeDock(robot);
            robot.ticksWithoutProgress = 4.0;
          }
        }
      } else {
        robot.ticksWithoutProgress = 0;
        robot.lastProgressPosition = { ...robot.gridPosition };
      }

      if (robot.state === 'aligning_pickup') {
        robot.animationTimer -= deltaSeconds;
        if (robot.animationTimer <= 0) {
          robot.state = 'picking_up';
          robot.animationTimer = 0.35;
          this.addEvent({
            id: `pickup_start_${robot.id}`,
            timestamp: Date.now(),
            type: 'pickup_started',
            message: `${robot.name} aligned at Shelf ${robot.targetShelfId}. Gripper extending to pick inventory.`,
            severity: 'info',
            robotId: robot.id,
          });
        }
        continue;
      }

      if (robot.isRecoveryRobot && robot.recoveringFromRobotId && robot.state === 'loading') {
        robot.animationTimer -= deltaSeconds;
        robot.blockedReason = 'TRANSFERRING CARGO';
        if (robot.animationTimer <= 0) {
          const brokenRobot = this.robotMap.get(robot.recoveringFromRobotId);
          if (brokenRobot) {
            robot.cargoCount = (robot.cargoCount || 0) + brokenRobot.cargoCount;
            robot.cargoItems = [...(robot.cargoItems || []), ...(brokenRobot.cargoItems || [])];
            robot.carriedItemName = brokenRobot.carriedItemName;
            robot.isCarrying = true;
            brokenRobot.isCarrying = false;
            brokenRobot.cargoCount = 0;
            brokenRobot.cargoItems = [];
            brokenRobot.carriedItemName = undefined;
            brokenRobot.blockedReason = `BREAKDOWN: Disabled at (${brokenRobot.gridPosition.x}, ${brokenRobot.gridPosition.y}). Cargo recovered by ${robot.name}. Awaiting repair.`;
          }
          robot.isRecoveryRobot = false;
          robot.recoveringFromRobotId = undefined;
          robot.targetType = 'DELIVERY';
          robot.state = 'moving_to_delivery';
          if (robot.currentTaskId) {
            const task = this.taskMap.get(robot.currentTaskId);
            if (task) {
              task.phase = 'EN_ROUTE_TO_DELIVERY';
              task.recoveredAt = this.simulationTime;
              robot.targetNode = task.destinationCoord;
              this.calculateRobotRoute(robot, task.destinationCoord, 'NORMAL_TASK');
              this.addEvent({
                id: `rec_done_${robot.id}_${Date.now()}`,
                timestamp: Date.now(),
                type: 'task_updated',
                message: `CARGO RECOVERED: ${robot.name} secured cargo from broken robot. Continuing delivery to ${task.deliveryNodeId}.`,
                severity: 'success',
                robotId: robot.id,
                taskId: task.id,
              });
            }
          }
        }
        continue;
      }

      if (robot.state === 'picking_up' || (robot.state === 'loading' && !robot.isRecoveryRobot)) {
        robot.animationTimer -= deltaSeconds;
        if (robot.animationTimer <= 0) {
          this.completePickupSequence(robot);
        }
        continue;
      }

      if (robot.state === 'aligning_delivery') {
        robot.animationTimer -= deltaSeconds;
        if (robot.animationTimer <= 0) {
          robot.state = 'delivering';
          robot.animationTimer = 0.35;
          this.addEvent({
            id: `delivery_start_${robot.id}`,
            timestamp: Date.now(),
            type: 'delivery_started',
            message: `${robot.name} unloading cargo onto ${robot.targetDeliveryNodeId}.`,
            severity: 'info',
            robotId: robot.id,
          });
        }
        continue;
      }

      if (robot.state === 'delivering' || robot.state === 'unloading') {
        robot.animationTimer -= deltaSeconds;
        if (robot.animationTimer <= 0) {
          this.completeDeliverySequence(robot);
        }
        continue;
      }

      if (robot.state === 'yielding') {
        if (robot.yieldTimer !== undefined) {
          robot.yieldTimer -= deltaSeconds;
        }

        let targetStillNearby = false;
        if (robot.yieldTargetRobotId) {
          const targetRobot = this.robotMap.get(robot.yieldTargetRobotId);
          if (targetRobot) {
            if (
              targetRobot.currentRoute &&
              targetRobot.currentRouteIndex < targetRobot.currentRoute.length
            ) {
              const nextStep = targetRobot.currentRoute[targetRobot.currentRouteIndex];
              if (nextStep && nextStep.x === robot.gridPosition.x && nextStep.y === robot.gridPosition.y) {
                this.handleRobotBackoff(robot, targetRobot);
                continue;
              }
            }

            const dist = Math.abs(targetRobot.gridPosition.x - robot.gridPosition.x) +
                         Math.abs(targetRobot.gridPosition.y - robot.gridPosition.y);
            if (dist <= 1 && targetRobot.state !== 'breakdown' && targetRobot.state !== 'idle') {
              targetStillNearby = true;
            }
          }
        }

        const yieldExpired = robot.yieldTimer !== undefined && robot.yieldTimer <= 0;
        const yieldOverdue = robot.yieldTimer !== undefined && robot.yieldTimer <= -2.0;

        if (!targetStillNearby || yieldExpired || yieldOverdue) {
          if (robot.previousMissionState) {
            const prev = robot.previousMissionState;
            robot.state = prev.state;
            robot.currentTaskId = prev.currentTaskId;
            robot.targetShelfId = prev.targetShelfId;
            robot.targetDeliveryNodeId = prev.targetDeliveryNodeId;
            const dest = prev.destinationCoord;
            robot.previousMissionState = undefined;
            robot.yieldTargetRobotId = undefined;
            robot.yieldTimer = undefined;
            robot.blockedReason = undefined;

            const routeFound = this.calculateRobotRoute(robot, dest);
            if (!routeFound) {
              robot.state = 'waiting_for_path';
              robot.blockedReason = `Path to destination (${dest.x}, ${dest.y}) is temporarily blocked.`;
            } else {
              this.addEvent({
                id: `resumed_${robot.id}_${Date.now()}`,
                timestamp: Date.now(),
                type: 'rerouted',
                message: `${robot.name} resumed route to (${dest.x}, ${dest.y}) after yielding right-of-way.`,
                severity: 'info',
                robotId: robot.id,
              });
            }
          } else {
            robot.state = 'idle';
            robot.yieldTargetRobotId = undefined;
            robot.yieldTimer = undefined;
            robot.blockedReason = undefined;
          }
        }
        continue;
      }

      if (robot.currentRoute.length > 0 && robot.currentRouteIndex < robot.currentRoute.length) {
        const targetCoord = robot.currentRoute[robot.currentRouteIndex];
        const targetWorld = { x: targetCoord.x, y: 0.25, z: targetCoord.y };

        const targetNode = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y);
        const currentNode = this.graph.getNodeByCoord(robot.gridPosition.x, robot.gridPosition.y);
        if (targetNode?.isIntersection && !currentNode?.isIntersection) {
          const intId = this.trafficManager.getIntersectionId(targetCoord.x, targetCoord.y);
          const zone = intId ? this.trafficManager.getIntersectionZone(intId) : undefined;

          const isOccupiedInside = zone && zone.crossingRobotIds.some(cid => {
            const cr = this.robotMap.get(cid);
            return cr && cr.id !== robot.id && this.graph.getNodeByCoord(cr.gridPosition.x, cr.gridPosition.y)?.isIntersection;
          });

          if (isOccupiedInside) {
            robot.waitTime += deltaSeconds;
            robot.waitingReason = 'WAITING_FOR_INTERSECTION';
            robot.blockedReason = 'Holding before intersection for clearance.';
            continue;
          }

          const contenders: Robot[] = [robot];
          if (intId) {
            for (const other of allRobots) {
              if (other.id === robot.id || other.state === 'breakdown' || other.state === 'maintenance') continue;
              if (other.currentRoute && other.currentRoute.length > other.currentRouteIndex) {
                const nextC = other.currentRoute[other.currentRouteIndex];
                if (this.trafficManager.getIntersectionId(nextC.x, nextC.y) === intId) {
                  contenders.push(other);
                }
              }
            }
          }

          if (contenders.length > 1) {
            let highestPriority = contenders[0];
            for (let ci = 1; ci < contenders.length; ci++) {
              const prio = this.determineRobotPriority(highestPriority, contenders[ci]);
              highestPriority = prio.higher;
            }

            if (highestPriority.id !== robot.id) {
              robot.waitTime += deltaSeconds;
              robot.waitingReason = 'WAITING_FOR_INTERSECTION';
              robot.blockedReason = `Holding before intersection: Right-of-way granted to ${highestPriority.name}.`;

              if (robot.waitTime >= 1.0 && robot.currentRoute && robot.currentRoute.length > 0) {
                const finalGoal = robot.currentRoute[robot.currentRoute.length - 1];
                const blockedTargetNode = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y);
                const wasBlocked = blockedTargetNode ? blockedTargetNode.isBlocked : false;
                if (blockedTargetNode) blockedTargetNode.isBlocked = true;

                const alt = PathfindingManager.findPath(
                  this.graph,
                  robot.gridPosition,
                  finalGoal,
                  this.config.pathfindingAlgorithm,
                  {
                    navigationMode: robot.navigationMode || 'NORMAL_TASK',
                    reservedForRobotId: robot.id,
                  }
                );

                if (blockedTargetNode) blockedTargetNode.isBlocked = wasBlocked;

                if (alt.path && alt.path.length > 0) {
                  robot.currentRoute = alt.path;
                  robot.currentRouteIndex = alt.path.length > 1 ? 1 : 0;
                  robot.lastReplanTime = this.simulationTime;
                  robot.replanCount = (robot.replanCount || 0) + 1;
                  robot.routeVersion = (robot.routeVersion || 1) + 1;
                  robot.state = 'rerouting';
                  robot.waitTime = 0;
                  robot.waitingSince = undefined;
                  robot.blockedReason = undefined;
                  continue;
                }
              }

              continue;
            }

            this.collisionAvoidance.clearReservationAt(targetCoord.x, targetCoord.y, this.graph);
          }

          let exitNode = targetCoord;
          for (let ri = robot.currentRouteIndex + 1; ri < robot.currentRoute.length; ri++) {
            const nextCoord = robot.currentRoute[ri];
            const nextNode = this.graph.getNodeByCoord(nextCoord.x, nextCoord.y);
            if (!nextNode?.isIntersection) {
              exitNode = nextCoord;
              break;
            }
          }

          const intPermit = this.trafficManager.requestIntersectionEntry(
            robot,
            targetCoord,
            exitNode,
            this.collisionAvoidance,
            this.simulationTime
          );

          if (!intPermit.canEnter) {
            robot.waitTime += deltaSeconds;
            robot.waitingReason = 'WAITING_FOR_INTERSECTION';
            robot.blockedReason = intPermit.reason || 'Holding before intersection for clearance.';

            if (robot.waitTime >= 1.0 && robot.currentRoute && robot.currentRoute.length > 0) {
              const finalGoal = robot.currentRoute[robot.currentRoute.length - 1];
              const blockedTargetNode = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y);
              const wasBlocked = blockedTargetNode ? blockedTargetNode.isBlocked : false;
              if (blockedTargetNode) blockedTargetNode.isBlocked = true;

              const alt = PathfindingManager.findPath(
                this.graph,
                robot.gridPosition,
                finalGoal,
                this.config.pathfindingAlgorithm,
                {
                  navigationMode: robot.navigationMode || 'NORMAL_TASK',
                  reservedForRobotId: robot.id,
                }
              );

              if (blockedTargetNode) blockedTargetNode.isBlocked = wasBlocked;

              if (alt.path && alt.path.length > 0) {
                robot.currentRoute = alt.path;
                robot.currentRouteIndex = alt.path.length > 1 ? 1 : 0;
                robot.lastReplanTime = this.simulationTime;
                robot.replanCount = (robot.replanCount || 0) + 1;
                robot.routeVersion = (robot.routeVersion || 1) + 1;
                robot.state = 'rerouting';
                robot.waitTime = 0;
                robot.waitingSince = undefined;
                robot.blockedReason = undefined;
                continue;
              }
            }

            continue;
          }
        }

        const conflict = this.collisionAvoidance.getConflictInfo(targetCoord.x, targetCoord.y, robot.id);
        const isYieldTargetReservation = robot.state === 'backing_off' &&
          conflict.isReservation &&
          conflict.conflictingRobotId === robot.yieldTargetRobotId;

        if (conflict.isConflict && !isYieldTargetReservation) {
          robot.waitTime += deltaSeconds;
          const occId = this.collisionAvoidance.getOccupant(targetCoord.x, targetCoord.y);
          const conflictingRobot = (conflict.conflictingRobotId ? this.robotMap.get(conflict.conflictingRobotId) : undefined) ||
            (occId ? this.robotMap.get(occId) : undefined);

          if (conflictingRobot) {
            const isConflictingBehind =
              (conflictingRobot.queueSlotIndex !== undefined && (robot.queueSlotIndex === undefined || robot.queueSlotIndex === 0)) ||
              (conflictingRobot.queueSlotIndex !== undefined && robot.queueSlotIndex !== undefined && conflictingRobot.queueSlotIndex > robot.queueSlotIndex);
            if (isConflictingBehind || robot.queueSlotIndex === 0) {
              this.handleRobotBackoff(conflictingRobot, robot);
              continue;
            }

            if (
              (conflictingRobot.state === 'idle' || conflictingRobot.state === 'waiting_for_path' || conflictingRobot.state === 'waiting') &&
              (!conflictingRobot.currentRoute || conflictingRobot.currentRoute.length === 0 || conflictingRobot.currentRouteIndex >= conflictingRobot.currentRoute.length)
            ) {
              if (conflictingRobot.currentTaskId) {
                this.handleRobotBackoff(conflictingRobot, robot);
              } else {
                this.sendRobotToWaiting(conflictingRobot);
              }
            } else if (conflictingRobot.state === 'staged') {
              const task = conflictingRobot.currentTaskId ? this.taskMap.get(conflictingRobot.currentTaskId) : undefined;
              if (task) {
                const occupiedCoords = new Set(Array.from(this.robotMap.values()).map(r => Graph.coordKey(r.gridPosition.x, r.gridPosition.y)));
                occupiedCoords.add(Graph.coordKey(targetCoord.x, targetCoord.y));
                occupiedCoords.add(Graph.coordKey(robot.gridPosition.x, robot.gridPosition.y));
                const access = this.shelfAccessManager.requestAccess(task.shelfId, conflictingRobot.id, occupiedCoords);
                if (access.stagingCoord && (access.stagingCoord.x !== conflictingRobot.gridPosition.x || access.stagingCoord.y !== conflictingRobot.gridPosition.y)) {
                  conflictingRobot.stagedAtCoord = access.stagingCoord;
                  this.calculateRobotRoute(conflictingRobot, access.stagingCoord, 'NORMAL_TASK');
                } else {
                  this.handleRobotBackoff(conflictingRobot, robot);
                }
              }
            }
          }

          const isDeadlock = conflictingRobot ? this.collisionAvoidance.checkHeadToHead(robot, conflictingRobot) : false;
          const priority = conflictingRobot ? this.determineRobotPriority(robot, conflictingRobot) : undefined;
          const isIntersectionArea = Boolean(
            targetNode?.isIntersection ||
            currentNode?.isIntersection ||
            (conflictingRobot && this.graph.getNodeByCoord(conflictingRobot.gridPosition.x, conflictingRobot.gridPosition.y)?.isIntersection)
          );

          if (isDeadlock && conflictingRobot && priority && !isIntersectionArea) {
            const lowerPriorityRobot = priority.lower;
            const higherPriorityRobot = priority.higher;
            if (lowerPriorityRobot.state !== 'backing_off') {
              const backedOff = this.handleRobotBackoff(lowerPriorityRobot, higherPriorityRobot);
              if (backedOff) {
                continue;
              }
            }
          }

          const conflictName = conflictingRobot ? conflictingRobot.name : 'OBSTACLE';
          robot.blockingEntity = conflictName;
          robot.waitingSince = robot.waitingSince || this.simulationTime;

          robot.obstacleCheckTimer = (robot.obstacleCheckTimer || 0) + deltaSeconds;
          if (robot.obstacleCheckTimer >= 1.0) {
            robot.obstacleCheckTimer = 0;
            const targetNode = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y);
            const conflictNow = this.collisionAvoidance.getConflictInfo(targetCoord.x, targetCoord.y, robot.id);
            const isNowClear = targetNode && !targetNode.isBlocked && !conflictNow.isConflict;
            if (isNowClear) {
              robot.waitTime = 0;
              robot.blockedReason = undefined;
              robot.waitingReason = undefined;
            }
          }

          if (robot.waitTime <= 1.0) {
            const isAisleObstacle = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y)?.isBlocked;
            const desc = conflict.isOccupant ? `OCCUPIED BY ${conflictName}` : (isAisleObstacle ? 'OBSTACLE ON AISLE' : `RESERVED BY ${conflictName}`);
            robot.blockedReason = `WAITING FOR NODE (${targetCoord.x}, ${targetCoord.y}) — ${desc} (wait: ${robot.waitTime.toFixed(1)}s)`;
          } else {
            const timeSinceLastReplan = this.simulationTime - (robot.lastReplanTime || 0);
            const isPermanentBlock = conflictingRobot?.state === 'breakdown' || conflictingRobot?.state === 'maintenance';
            const canReplan = isPermanentBlock || timeSinceLastReplan >= 1.0;

            if (!canReplan) {
              robot.blockedReason = `WAITING FOR NODE (${targetCoord.x}, ${targetCoord.y}) — REPLAN COOLDOWN ACTIVE (wait: ${robot.waitTime.toFixed(1)}s)`;
              continue;
            }

            const overtakeEval = this.trafficManager.evaluateOppositeLaneOvertake(
              robot,
              targetCoord,
              this.collisionAvoidance,
              this.graph,
              Array.from(this.robotMap.values())
            );

            if (overtakeEval.canOvertake && overtakeEval.returnCoord) {
              const finalGoal = robot.currentRoute[robot.currentRoute.length - 1];
              robot.isTemporaryOppositeLane = true;
              robot.oppositeLaneReason = 'TEMPORARY_OPPOSITE_LANE';
              robot.oppositeLaneReturnCoord = overtakeEval.returnCoord;
              const rerouted = this.calculateRobotRoute(
                robot,
                finalGoal,
                undefined,
                undefined,
                [{ x: targetCoord.x, y: targetCoord.y }],
                true
              );
              if (rerouted) {
                robot.lastReplanTime = this.simulationTime;
                robot.replanCount = (robot.replanCount || 0) + 1;
                robot.routeVersion = (robot.routeVersion || 1) + 1;
                robot.state = 'rerouting';
                robot.waitTime = 0;
                robot.waitingSince = undefined;
                robot.blockedReason = `TEMPORARY OPPOSITE LANE OVERTAKE: Bypassing blockage at (${targetCoord.x}, ${targetCoord.y}) via opposite lane, returning at (${overtakeEval.returnCoord.x}, ${overtakeEval.returnCoord.y}).`;
                this.addEvent({
                  id: `overtake_${robot.id}_${Date.now()}`,
                  timestamp: Date.now(),
                  type: 'rerouted',
                  message: `${robot.name} initiated temporary opposite-lane overtake past blockage at (${targetCoord.x}, ${targetCoord.y}).`,
                  severity: 'info',
                  robotId: robot.id,
                });
                continue;
              }
            }

            const remainingSteps = robot.currentRoute.length - robot.currentRouteIndex;
            const finalGoal = robot.currentRoute[robot.currentRoute.length - 1];
            const blockedNode = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y);
            const wasBlocked = blockedNode ? blockedNode.isBlocked : false;
            if (blockedNode) blockedNode.isBlocked = true;

            const altResult = PathfindingManager.findPath(
              this.graph,
              robot.gridPosition,
              finalGoal,
              this.config.pathfindingAlgorithm,
              {
                navigationMode: robot.navigationMode || 'NORMAL_TASK',
                reservedForRobotId: robot.id,
              }
            );

            if (blockedNode) blockedNode.isBlocked = wasBlocked;

            if (altResult.path && altResult.path.length > 0) {
              const detourAdded = altResult.path.length - remainingSteps;
              if (detourAdded > 4 && robot.waitTime < 1.0 && !isPermanentBlock) {
                robot.blockedReason = `WAITING FOR NODE (${targetCoord.x}, ${targetCoord.y}) — DETOUR EXPENSIVE (+${detourAdded} STEPS), WAITING (wait: ${robot.waitTime.toFixed(1)}s)`;
                continue;
              }

              robot.currentRoute = altResult.path;
              robot.currentRouteIndex = altResult.path.length > 1 ? 1 : 0;
              robot.lastReplanTime = this.simulationTime;
              robot.replanCount = (robot.replanCount || 0) + 1;
              robot.routeVersion = (robot.routeVersion || 1) + 1;
              robot.state = 'rerouting';
              robot.waitTime = 0;
              robot.waitingSince = undefined;
              robot.blockedReason = undefined;
              this.addEvent({
                id: `reroute_${robot.id}_${Date.now()}`,
                timestamp: Date.now(),
                type: 'rerouted',
                message: `${robot.name} route blocked at (${targetCoord.x}, ${targetCoord.y}) for >2s. Recalculated dynamic A* alternate route.`,
                severity: 'info',
                robotId: robot.id,
              });
              continue;
            } else if (conflictingRobot && priority && !isIntersectionArea) {
              if (priority.lower.id === robot.id && robot.state !== 'backing_off') {
                const backed = this.handleRobotBackoff(robot, conflictingRobot);
                if (backed) continue;
              } else if (priority.higher.id === robot.id && conflictingRobot.state !== 'backing_off') {
                const backed = this.handleRobotBackoff(conflictingRobot, robot);
                if (backed) continue;
              }
            }
          }
          continue;
        }

        const dx = targetWorld.x - robot.position.x;
        const dz = targetWorld.z - robot.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const moveStep = robot.maxSpeed * deltaSeconds;

        if (dist > 0.01) {
          robot.heading = Math.atan2(dx, dz);
        }

        if (dist <= moveStep) {
          const prevCoord = { ...robot.gridPosition };
          robot.position.x = targetWorld.x;
          robot.position.z = targetWorld.z;
          robot.gridPosition = { x: targetCoord.x, y: targetCoord.y };
          robot.lastLogicalNode = { x: targetCoord.x, y: targetCoord.y };
          robot.lastMovementTick = this.simulationTime;
          robot.waitingReason = undefined;
          robot.currentRouteIndex++;
          robot.distanceTraveled += dist;
          this.metrics.totalDistanceTraveled += dist;
          BatteryManager.consumeBattery(robot, dist, robot.isCarrying, deltaSeconds);

          const currNode = this.graph.getNodeByCoord(targetCoord.x, targetCoord.y);
          if (currNode) {
            robot.currentLaneId = currNode.laneId;
            if (currNode.trafficDirection && currNode.trafficDirection !== 'BIDIRECTIONAL' && currNode.trafficDirection !== 'ANY') {
              robot.assignedTrafficDirection = currNode.trafficDirection;
            }
          }

          if (robot.isTemporaryOppositeLane) {
            const hasReturned =
              (robot.oppositeLaneReturnCoord &&
                robot.gridPosition.x === robot.oppositeLaneReturnCoord.x &&
                robot.gridPosition.y === robot.oppositeLaneReturnCoord.y) ||
              (currNode && currNode.trafficDirection === robot.assignedTrafficDirection && !currNode.isIntersection);
            if (hasReturned) {
              robot.isTemporaryOppositeLane = false;
              robot.oppositeLaneReason = undefined;
              robot.oppositeLaneReturnCoord = undefined;
            }
          }

          const prevNode = this.graph.getNodeByCoord(prevCoord.x, prevCoord.y);
          if (prevNode?.isIntersection && !currNode?.isIntersection) {
            this.trafficManager.releaseIntersection(robot.id);
          }

          this.collisionAvoidance.releaseNode(prevCoord.x, prevCoord.y, robot.id, this.graph);

          if (robot.vacatingShelfId) {
            const vShelf = robot.vacatingShelfId;
            robot.vacatingShelfId = undefined;
            this.shelfAccessManager.releaseExitRoute(vShelf, robot.id);
            this.advanceShelfQueue(vShelf, robot.id);
          } else if (robot.isCarrying && robot.targetShelfId) {
            const releaseRes = this.shelfAccessManager.releaseShelf(robot.targetShelfId, robot.id, robot.gridPosition);
            if (releaseRes.released) {
              this.advanceShelfQueue(robot.targetShelfId, robot.id);
              robot.targetShelfId = undefined;
            }
          }
        } else {
          const moveX = (dx / dist) * moveStep;
          const moveZ = (dz / dist) * moveStep;
          robot.position.x += moveX;
          robot.position.z += moveZ;
          robot.distanceTraveled += moveStep;
          this.metrics.totalDistanceTraveled += moveStep;
          BatteryManager.consumeBattery(robot, moveStep, robot.isCarrying, deltaSeconds);
        }

        robot.blockedReason = undefined;

        if (robot.currentRouteIndex >= robot.currentRoute.length) {
          this.handleRobotReachedWaypointDestination(robot);
        }
      } else {
        BatteryManager.consumeBattery(robot, 0, false, deltaSeconds);
      }
    }
  }

  private handleRobotReachedWaypointDestination(robot: Robot): void {
    this.trafficManager.releaseIntersection(robot.id);
    if (robot.isTemporaryOppositeLane) {
      robot.isTemporaryOppositeLane = false;
      robot.oppositeLaneReason = undefined;
      robot.oppositeLaneReturnCoord = undefined;
    }

    if (robot.state === 'backing_off' || robot.state === 'recovering_deadlock') {
      robot.state = 'yielding';
      robot.yieldTimer = 0.8;
      robot.currentRoute = [];
      robot.currentRouteIndex = 0;
      robot.waitingReason = 'WAITING_FOR_ROBOT';
      robot.blockedReason = `Yielding right-of-way at clearance siding for ${robot.yieldTargetRobotId || 'traffic'}.`;
      return;
    }

    if (robot.state === 'staged') {
      robot.currentRoute = [];
      robot.currentRouteIndex = 0;
      robot.waitingReason = 'WAITING_FOR_SHELF';
      robot.blockedReason = `Staged: Waiting for Shelf ${robot.stagedShelfId} to become available.`;
      return;
    }

    if (robot.targetType === 'DOCK' || robot.state === 'going_to_charge' || robot.state === 'returning_to_dock') {
      const dock = this.chargingStations.find(d => d.id === robot.home_dock_id || d.assignedRobotId === robot.id);
      robot.position.x = robot.gridPosition.x;
      robot.position.z = robot.gridPosition.y;
      robot.currentRoute = [];
      robot.currentRouteIndex = 0;
      robot.blockedReason = undefined;
      robot.waitingReason = undefined;

      if (dock) {
        dock.isOccupied = true;
        dock.occupyingRobotId = robot.id;
      }

      if (robot.battery < 100) {
        robot.state = 'charging';
        if (dock) dock.dockState = 'CHARGING';
        this.addEvent({
          id: `charge_start_${robot.id}_${Date.now()}`,
          timestamp: Date.now(),
          type: 'charging_started',
          message: `${robot.name} docked at Home Dock ${dock?.id || ''}. Charging initiated (+2%/unit).`,
          severity: 'info',
          robotId: robot.id,
        });
      } else {
        robot.state = 'idle';
        if (dock) dock.dockState = 'AVAILABLE';
      }
      return;
    }

    if (!robot.currentTaskId) {
      if (robot.state === 'returning') {
        robot.state = 'idle';
        robot.navigationMode = 'NORMAL_TASK';
        robot.currentRoute = [];
        robot.currentRouteIndex = 0;
        robot.blockedReason = undefined;
        robot.waitingReason = undefined;
        if (robot.waitingNodeId) {
          const bay = this.waitingNodes.find(w => w.id === robot.waitingNodeId);
          if (bay) {
            bay.isOccupied = true;
            bay.occupyingRobotId = robot.id;
            bay.occupiedBy = robot.id;
            bay.reservedBy = robot.id;
            bay.waitingReason = undefined;
          }
        }
        return;
      }
      robot.state = 'idle';
      robot.navigationMode = 'NORMAL_TASK';
      robot.currentRoute = [];
      robot.currentRouteIndex = 0;
      robot.waitingReason = undefined;
      robot.blockedReason = undefined;
      return;
    }

    const task = this.taskMap.get(robot.currentTaskId);
    if (!task) return;

    if (robot.isRecoveryRobot && robot.recoveringFromRobotId) {
      robot.state = 'loading';
      robot.animationTimer = 1.5;
      robot.blockedReason = 'TRANSFERRING CARGO';
      robot.currentRoute = [];
      robot.currentRouteIndex = 0;
      return;
    }

    if (robot.isCarrying || robot.state === 'moving_to_delivery' || robot.targetType === 'DELIVERY') {
      const isAtDelivery = (robot.gridPosition.x === task.destinationCoord.x && robot.gridPosition.y === task.destinationCoord.y) ||
                           (Math.abs(robot.position.x - task.destinationCoord.x) <= 0.25 && Math.abs(robot.position.z - task.destinationCoord.y) <= 0.25);
      if (isAtDelivery) {
        robot.gridPosition = { x: task.destinationCoord.x, y: task.destinationCoord.y };
        robot.position.x = task.destinationCoord.x;
        robot.position.z = task.destinationCoord.y;
        task.status = 'delivering';
        task.phase = 'AT_DELIVERY';
        task.progress = 85;
        robot.state = 'aligning_delivery';
        robot.targetType = 'DELIVERY';
        robot.animationTimer = 0.35;
        robot.currentRoute = [];
        robot.currentRouteIndex = 0;
        robot.waitingReason = undefined;
        robot.blockedReason = undefined;
      } else {
        robot.state = 'staged';
        robot.targetType = 'STAGING';
        robot.stagedAtCoord = { ...robot.gridPosition };
        robot.waitingReason = 'WAITING_FOR_ROBOT';
        robot.blockedReason = robot.queueStatus || `WAITING FOR DELIVERY CLEARANCE (POSITION ${robot.queueSlotIndex || 1} IN QUEUE)`;
        robot.currentRoute = [];
        robot.currentRouteIndex = 0;
      }
    } else if (
      robot.state === 'moving_to_pickup' ||
      robot.state === 'rerouting' ||
      robot.state === 'moving_to_task' ||
      robot.targetType === 'PICKUP' ||
      robot.targetType === 'STAGING'
    ) {
      const isAtPickup = (robot.gridPosition.x === task.pickupCoord.x && robot.gridPosition.y === task.pickupCoord.y) ||
                         (Math.abs(robot.position.x - task.pickupCoord.x) <= 0.25 && Math.abs(robot.position.z - task.pickupCoord.y) <= 0.25);
      if (isAtPickup) {
        robot.gridPosition = { x: task.pickupCoord.x, y: task.pickupCoord.y };
        robot.position.x = task.pickupCoord.x;
        robot.position.z = task.pickupCoord.y;
        if (task.shelfId) {
          this.shelfAccessManager.occupyShelf(task.shelfId, robot.id);
          this.addEvent({
            id: `shelf_occ_${task.shelfId}_${Date.now()}`,
            timestamp: Date.now(),
            type: 'shelf_occupied',
            message: `${robot.name} occupied Shelf ${task.shelfId} interaction zone.`,
            severity: 'info',
            robotId: robot.id,
            taskId: task.id,
          });
        }
        task.status = 'picking';
        task.phase = 'AT_PICKUP';
        task.progress = 30;
        robot.state = 'aligning_pickup';
        robot.targetType = 'PICKUP';
        robot.animationTimer = 0.35;
        robot.currentRoute = [];
        robot.currentRouteIndex = 0;
        robot.waitingReason = undefined;
        robot.blockedReason = undefined;

        const shelfNode = this.shelfNodes.find(s => s.shelfId === task.shelfId);
        if (shelfNode) {
          robot.heading = Math.atan2(shelfNode.x - robot.position.x, shelfNode.y - robot.position.z);
        }
      } else {
        robot.state = 'staged';
        robot.targetType = 'STAGING';
        robot.stagedShelfId = task.shelfId;
        robot.stagedAtCoord = { ...robot.gridPosition };
        robot.waitingReason = 'WAITING_FOR_SHELF';
        robot.blockedReason = robot.queueStatus || `WAITING FOR SHELF ACCESS (POSITION ${robot.queueSlotIndex || 1} IN QUEUE)`;
        robot.currentRoute = [];
        robot.currentRouteIndex = 0;
      }
    }
  }

  private completePickupSequence(robot: Robot): void {
    if (!robot.currentTaskId) {
      robot.state = 'idle';
      this.sendRobotToWaiting(robot);
      return;
    }
    const task = this.taskMap.get(robot.currentTaskId);
    if (!task) {
      robot.state = 'idle';
      this.sendRobotToWaiting(robot);
      return;
    }

    const product = task.productId ? this.products.get(task.productId) : undefined;
    const pickupQty = Math.min(robot.maxCapacity, task.requestedQuantity);

    if (product) {
      product.quantity = Math.max(0, product.quantity - pickupQty);
      product.status = product.quantity > 0 ? (product.quantity < 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
      const shelfNode = this.shelfNodes.find(s => s.shelfId === task.shelfId);
      if (shelfNode && shelfNode.shelfInfo) {
        shelfNode.shelfInfo.inventoryLevel = product.quantity;
      }
    }

    robot.isCarrying = true;
    robot.cargoCount = pickupQty;
    robot.cargoItems = [
      {
        productId: product?.id || 'unknown',
        name: product?.name || task.payloadName,
        quantity: pickupQty,
      },
    ];
    robot.carriedItemName = `${product?.name || task.payloadName} (x${pickupQty})`;
    task.status = 'in_progress';
    task.progress = 50;

    this.addEvent({
      id: `picked_${task.id}`,
      timestamp: Date.now(),
      type: 'pickup_completed',
      message: `LOADED: ${robot.name} loaded ${pickupQty}x ${product?.name || task.payloadName} from Shelf ${task.shelfId}. En route to ${task.deliveryNodeId}.`,
      severity: 'success',
      robotId: robot.id,
      taskId: task.id,
    });

    soundEffects.playPickup();

    robot.vacatingShelfId = task.shelfId;
    robot.targetType = 'DELIVERY';
    task.phase = 'EN_ROUTE_TO_DELIVERY';

    const delQueue = this.trafficManager.requestQueueSlot(task.deliveryNodeId, robot.id);
    if (delQueue) {
      robot.queueSlotIndex = delQueue.slotIndex;
      robot.queueStatus = delQueue.displayStatus;
    }

    const delTarget = (delQueue && !delQueue.isFrontOfQueue) ? delQueue.coord : task.destinationCoord;
    robot.state = 'moving_to_delivery';
    robot.targetNode = delTarget;
    const deliveryFound = this.calculateRobotRoute(robot, delTarget, 'NORMAL_TASK');
    if (deliveryFound && robot.currentRoute && robot.currentRoute.length > 0 && task.shelfId) {
      this.shelfAccessManager.reserveExitRoute(task.shelfId, robot.id, robot.currentRoute);
    }
    if (!deliveryFound) {
      robot.state = 'waiting_for_path';
      robot.waitingReason = 'WAITING_FOR_PATH';
      robot.blockedReason = `Cannot pathfind to Delivery Node ${task.deliveryNodeId}. Aisle is blocked.`;
    }
  }

  private completeDeliverySequence(robot: Robot): void {
    if (!robot.currentTaskId) {
      robot.state = 'idle';
      this.sendRobotToWaiting(robot);
      return;
    }
    const task = this.taskMap.get(robot.currentTaskId);
    if (!task) {
      robot.state = 'idle';
      this.sendRobotToWaiting(robot);
      return;
    }

    const deliveryNode = this.deliveryNodes.find(d => d.id === task.deliveryNodeId);
    if (deliveryNode) {
      deliveryNode.completedDeliveries += robot.cargoCount;
    }

    robot.tasksCompleted++;
    const duration = this.simulationTime - (task.startedAt || task.createdAt);
    this.taskCompletionDurations.push(duration);
    this.metrics.tasksCompleted++;

    this.addEvent({
      id: `delivered_${task.id}`,
      timestamp: Date.now(),
      type: 'delivery_completed',
      message: `DELIVERED: ${task.id} (${robot.carriedItemName}) delivered to ${task.deliveryNodeId} by ${robot.name} in ${duration.toFixed(1)}s.`,
      severity: 'success',
      robotId: robot.id,
      taskId: task.id,
    });

    soundEffects.playDelivery();

    if (robot.currentRoute && robot.currentRoute.length > 0) {
      if (!robot.completedPaths) robot.completedPaths = [];
      robot.completedPaths.push({
        id: `comp_${task.id}_${Date.now()}`,
        points: [...robot.currentRoute],
        completedAt: this.simulationTime,
      });
      if (robot.completedPaths.length > 5) {
        robot.completedPaths.shift();
      }
    }

    if (task.deliveryNodeId) {
      this.advanceDeliveryQueue(task.deliveryNodeId, robot.id);
    }
    robot.queueSlotIndex = undefined;
    robot.queueStatus = undefined;

    const deliveredCount = robot.cargoCount || task.requestedQuantity || 1;

    robot.isCarrying = false;
    robot.cargoCount = 0;
    robot.cargoItems = [];
    robot.carriedItemName = undefined;
    robot.currentTaskId = undefined;
    robot.targetShelfId = undefined;
    robot.targetDeliveryNodeId = undefined;
    robot.targetNode = undefined;
    robot.targetType = undefined;
    robot.currentRoute = [];
    robot.currentRouteIndex = 0;
    robot.state = 'idle';
    robot.waitingReason = undefined;
    robot.blockedReason = undefined;
    robot.navigationMode = 'NORMAL_TASK';

    task.status = 'completed';
    task.phase = 'COMPLETED';
    task.progress = 100;
    task.completedAt = this.simulationTime;

    if (task.parentTaskId) {
      const parentTask = this.taskMap.get(task.parentTaskId);
      if (parentTask) {
        parentTask.deliveredQuantity += deliveredCount;
        const allCompleted = (parentTask.subtaskIds || []).every(id => {
          const st = this.taskMap.get(id);
          return st && st.status === 'completed';
        });
        if (allCompleted) {
          parentTask.status = 'completed';
          parentTask.phase = 'COMPLETED';
          parentTask.progress = 100;
          parentTask.completedAt = this.simulationTime;
          this.addEvent({
            id: `parent_done_${parentTask.id}`,
            timestamp: Date.now(),
            type: 'delivery_completed',
            message: `PARENT TASK COMPLETED: All ${parentTask.totalSubtasks} subtasks for ${parentTask.id} (${parentTask.payloadName}) successfully delivered to ${parentTask.deliveryNodeId}!`,
            severity: 'success',
            taskId: parentTask.id,
          });
        }
      }
    }

    if (task.shelfId) {
      this.shelfAccessManager.releaseShelf(task.shelfId, robot.id);
    }

    this.processTaskAllocation();

    if (!robot.currentTaskId) {
      this.sendRobotToHomeDock(robot);
    }
  }

  private advanceShelfQueue(shelfId: string, vacatingRobotId: string): void {
    this.shelfAccessManager.releaseShelf(shelfId, vacatingRobotId);
    this.trafficManager.releaseQueueSlot(shelfId, vacatingRobotId);
    const shelfAdvance = this.trafficManager.advanceQueue(shelfId, vacatingRobotId);
    if (shelfAdvance.promotions && shelfAdvance.promotions.length > 0) {
      for (const promo of shelfAdvance.promotions) {
        const pRobot = this.robotMap.get(promo.robotId);
        if (!pRobot || !pRobot.currentTaskId) continue;
        const pTask = this.taskMap.get(pRobot.currentTaskId);
        if (!pTask) continue;

        pRobot.queueSlotIndex = promo.newSlotIndex;
        if (promo.newSlotIndex === 0) {
          pRobot.queueStatus = 'FRONT OF QUEUE';
          pRobot.state = 'moving_to_pickup';
          pRobot.targetType = 'PICKUP';
          pRobot.targetNode = pTask.pickupCoord;
          pRobot.stagedShelfId = undefined;
          pRobot.stagedAtCoord = undefined;
          pRobot.blockedReason = undefined;
          pRobot.waitingReason = undefined;
          pTask.phase = 'EN_ROUTE_TO_PICKUP';
          this.calculateRobotRoute(pRobot, pTask.pickupCoord, 'NORMAL_TASK');
          this.addEvent({
            id: `shelf_promo_${pRobot.id}_${Date.now()}`,
            timestamp: Date.now(),
            type: 'task_updated',
            message: `QUEUE PROMOTION: ${pRobot.name} promoted to FRONT OF QUEUE for Shelf ${shelfId}. Navigating to interaction cell.`,
            severity: 'info',
            robotId: pRobot.id,
            taskId: pTask.id,
          });
        } else {
          pRobot.queueStatus = `WAITING IN QUEUE (POS ${promo.newSlotIndex})`;
          pRobot.state = 'staged';
          pRobot.targetType = 'STAGING';
          pRobot.targetNode = promo.newCoord;
          pRobot.stagedShelfId = shelfId;
          pRobot.stagedAtCoord = promo.newCoord;
          pRobot.waitingReason = 'WAITING_FOR_SHELF';
          pRobot.blockedReason = `WAITING FOR SHELF ACCESS (POSITION ${promo.newSlotIndex} IN QUEUE)`;
          this.calculateRobotRoute(pRobot, promo.newCoord, 'NORMAL_TASK');
        }
      }
    }
  }

  private advanceDeliveryQueue(deliveryNodeId: string, vacatingRobotId: string): void {
    this.trafficManager.releaseQueueSlot(deliveryNodeId, vacatingRobotId);
    const delAdvance = this.trafficManager.advanceQueue(deliveryNodeId, vacatingRobotId);
    if (delAdvance.promotions && delAdvance.promotions.length > 0) {
      for (const promo of delAdvance.promotions) {
        const pRobot = this.robotMap.get(promo.robotId);
        if (!pRobot || !pRobot.currentTaskId) continue;
        const pTask = this.taskMap.get(pRobot.currentTaskId);
        if (!pTask) continue;

        pRobot.queueSlotIndex = promo.newSlotIndex;
        if (promo.newSlotIndex === 0) {
          pRobot.queueStatus = 'FRONT OF QUEUE';
          pRobot.state = 'moving_to_delivery';
          pRobot.targetType = 'DELIVERY';
          pRobot.targetNode = pTask.destinationCoord;
          pRobot.stagedAtCoord = undefined;
          pRobot.blockedReason = undefined;
          pRobot.waitingReason = undefined;
          pTask.phase = 'EN_ROUTE_TO_DELIVERY';
          this.calculateRobotRoute(pRobot, pTask.destinationCoord, 'NORMAL_TASK');
          this.addEvent({
            id: `del_promo_${pRobot.id}_${Date.now()}`,
            timestamp: Date.now(),
            type: 'task_updated',
            message: `QUEUE PROMOTION: ${pRobot.name} promoted to FRONT OF QUEUE for Delivery Node ${deliveryNodeId}. Navigating to delivery dock.`,
            severity: 'info',
            robotId: pRobot.id,
            taskId: pTask.id,
          });
        } else {
          pRobot.queueStatus = `WAITING IN QUEUE (POS ${promo.newSlotIndex})`;
          pRobot.state = 'staged';
          pRobot.targetType = 'STAGING';
          pRobot.targetNode = promo.newCoord;
          pRobot.stagedAtCoord = promo.newCoord;
          pRobot.waitingReason = 'WAITING_FOR_ROBOT';
          pRobot.blockedReason = `WAITING FOR DELIVERY CLEARANCE (POSITION ${promo.newSlotIndex} IN QUEUE)`;
          this.calculateRobotRoute(pRobot, promo.newCoord, 'NORMAL_TASK');
        }
      }
    }
  }

  public dispatchRecoveryForTask(task: WarehouseTask, brokenRobot: Robot): boolean {
    const allRobots = Array.from(this.robotMap.values());
    const candidate = allRobots.find(r =>
      r.id !== brokenRobot.id &&
      r.state !== 'breakdown' &&
      r.state !== 'maintenance' &&
      !r.isRecoveryRobot &&
      (r.cargoCount || 0) + (task.requestedQuantity || 1) <= r.maxCapacity &&
      r.battery >= 25 &&
      (r.state === 'idle' || r.state === 'waiting' || (r.state === 'staged' && !r.currentTaskId))
    );

    if (!candidate) return false;

    const deltas = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    let targetAdjacent: GridCoord | undefined = undefined;

    for (const d of deltas) {
      const ax = brokenRobot.gridPosition.x + d.dx;
      const ay = brokenRobot.gridPosition.y + d.dy;
      const node = this.graph.getNodeByCoord(ax, ay);
      if (node && !node.isBlocked && node.type !== 'shelf' && !this.collisionAvoidance.isOccupied(ax, ay)) {
        targetAdjacent = { x: ax, y: ay };
        break;
      }
    }

    if (!targetAdjacent) {
      for (const d of deltas) {
        const ax = brokenRobot.gridPosition.x + d.dx;
        const ay = brokenRobot.gridPosition.y + d.dy;
        const node = this.graph.getNodeByCoord(ax, ay);
        if (node && !node.isBlocked && node.type !== 'shelf') {
          targetAdjacent = { x: ax, y: ay };
          break;
        }
      }
    }

    if (!targetAdjacent) return false;

    candidate.isRecoveryRobot = true;
    candidate.recoveringFromRobotId = brokenRobot.id;
    candidate.targetType = 'RECOVERY';
    candidate.targetNode = targetAdjacent;
    candidate.currentTaskId = task.id;
    candidate.navigationMode = 'NORMAL_TASK';
    candidate.blockedReason = undefined;
    candidate.waitingReason = undefined;

    task.assignedRobotId = candidate.id;
    task.phase = 'EN_ROUTE_TO_RECOVERY';
    task.status = 'in_progress';

    if (candidate.waitingNodeId) {
      const bay = this.waitingNodes.find(w => w.id === candidate.waitingNodeId);
      if (bay) {
        bay.isOccupied = false;
        bay.occupyingRobotId = undefined;
        bay.occupiedBy = undefined;
        bay.reservedBy = undefined;
      }
      candidate.waitingNodeId = undefined;
    }
    if (candidate.home_dock_id) {
      const dock = this.chargingStations.find(d => d.id === candidate.home_dock_id);
      if (dock && dock.occupyingRobotId === candidate.id) {
        dock.isOccupied = false;
        dock.occupyingRobotId = undefined;
        dock.dockState = 'AVAILABLE';
      }
    }

    const routeOk = this.calculateRobotRoute(candidate, targetAdjacent, 'NORMAL_TASK');
    if (routeOk) {
      candidate.state = 'moving_to_task';
      this.addEvent({
        id: `rec_dispatch_${candidate.id}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'task_allocated',
        message: `RECOVERY DISPATCHED: ${candidate.name} dispatched to recover cargo from broken robot ${brokenRobot.name} at (${brokenRobot.gridPosition.x}, ${brokenRobot.gridPosition.y}).`,
        severity: 'info',
        robotId: candidate.id,
        taskId: task.id,
      });
      return true;
    }

    return false;
  }

  public sendRobotToCharge(robot: Robot, station?: ChargingStation): void {
    const dedicatedDock = this.chargingStations.find(
      (d) => d.id === robot.home_dock_id || d.assignedRobotId === robot.id
    );
    const targetStation = dedicatedDock || station || this.chargingStations.find((d) => d.id === robot.home_dock_id);
    if (!targetStation) return;

    if (robot.waitingNodeId) {
      const currentBay = this.waitingNodes.find(w => w.id === robot.waitingNodeId);
      if (currentBay && (currentBay.occupyingRobotId === robot.id || currentBay.occupiedBy === robot.id || currentBay.reservedBy === robot.id)) {
        currentBay.isOccupied = false;
        currentBay.occupyingRobotId = undefined;
        currentBay.occupiedBy = undefined;
        currentBay.reservedBy = undefined;
        currentBay.waitingReason = undefined;
      }
      robot.waitingNodeId = undefined;
    }

    targetStation.isOccupied = true;
    targetStation.occupyingRobotId = robot.id;
    robot.chargingStationId = targetStation.id;
    robot.targetType = 'DOCK';
    robot.targetNode = targetStation.coord;
    robot.navigationMode = 'CHARGING_TASK';
    robot.state = 'going_to_charge';
    robot.blockedReason = undefined;
    robot.waitingReason = undefined;

    const routeOk = this.calculateRobotRoute(robot, targetStation.coord, 'CHARGING_TASK', targetStation.id);
    if (!routeOk) {
      robot.state = 'waiting_for_path';
      robot.waitingReason = 'WAITING_FOR_PATH';
      robot.blockedReason = `Cannot pathfind to Charging Bay ${targetStation.id}. Path obstructed.`;
    }

    this.addEvent({
      id: `charge_dispatch_${robot.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'battery_low',
      message: `${robot.name} (${robot.battery.toFixed(0)}%) dispatched to Charging Bay ${targetStation.id}.`,
      severity: 'info',
      robotId: robot.id,
    });
  }

  public triggerRandomBreakdown(): void {
    const activeRobots = this.robotMap.values().filter(r => r.state !== 'breakdown' && r.state !== 'maintenance');
    if (activeRobots.length === 0) return;

    const robot = activeRobots[Math.floor(Math.random() * activeRobots.length)];
    this.triggerRobotBreakdown(robot.id, 'Drive motor stall');
  }

  public triggerRobotBreakdown(robotId: string, reason: string = 'Motor stall'): void {
    const robot = this.robotMap.get(robotId);
    if (!robot) return;

    const activeTask = robot.currentTaskId ? this.taskMap.get(robot.currentTaskId) : undefined;
    const { affectedTask, event } = BreakdownManager.triggerBreakdown(robot, activeTask, reason);
    this.addEvent(event);
    soundEffects.playBreakdown();

    if (affectedTask) {
      this.urgentTaskQueue.enqueue(affectedTask, 1);
      this.addEvent({
        id: `rescue_${affectedTask.id}`,
        timestamp: Date.now(),
        type: 'task_reassigned',
        message: `TASK RESCUED: ${affectedTask.id} reassigned to Priority Queue due to ${robot.name} breakdown.`,
        severity: 'warning',
        taskId: affectedTask.id,
      });
    }
  }

  public repairRobot(robotId: string): void {
    const robot = this.robotMap.get(robotId);
    if (!robot) return;
    const event = BreakdownManager.repairRobot(robot);
    robot.blockedReason = undefined;
    this.addEvent(event);
  }

  public toggleObstacleAt(coord: GridCoord): boolean {
    const node = this.graph.getNodeByCoord(coord.x, coord.y);
    if (!node || node.type !== 'aisle') return false;

    node.isBlocked = !node.isBlocked;
    const isNowBlocked = node.isBlocked;

    this.addEvent({
      id: `obs_${coord.x}_${coord.y}_${Date.now()}`,
      timestamp: Date.now(),
      type: isNowBlocked ? 'aisle_blocked' : 'aisle_cleared',
      message: isNowBlocked
        ? `OBSTACLE PLACED at (${coord.x}, ${coord.y}). Affected AGVs recalculating routes.`
        : `OBSTACLE REMOVED at (${coord.x}, ${coord.y}). Aisle restored.`,
      severity: isNowBlocked ? 'warning' : 'info',
    });

    if (isNowBlocked) {
      for (const robot of this.robotMap.values()) {
        const usesNode = robot.currentRoute.some(c => c.x === coord.x && c.y === coord.y);
        if (usesNode && robot.currentRoute.length > 0) {
          const goal = robot.currentRoute[robot.currentRoute.length - 1];
          const routeOk = this.calculateRobotRoute(robot, goal);
          if (!routeOk) {
            robot.state = 'waiting_for_path';
            robot.blockedReason = 'No valid path available because destination is blocked by an obstacle.';
          }
        }
      }
    } else {
      for (const robot of this.robotMap.values()) {
        if (robot.state === 'waiting_for_path' || robot.state === 'waiting' || (robot.waitTime > 0 && robot.blockedReason)) {
          robot.waitTime = 0;
          robot.obstacleCheckTimer = 0;
          robot.blockedReason = undefined;
          robot.waitingReason = undefined;

          if (robot.currentTaskId) {
            const task = this.taskMap.get(robot.currentTaskId);
            if (task) {
              const dest = robot.isCarrying ? task.destinationCoord : task.pickupCoord;
              const routeOk = this.calculateRobotRoute(robot, dest);
              if (routeOk) {
                robot.state = robot.isCarrying ? 'moving_to_delivery' : 'moving_to_pickup';
              }
            }
          } else if (robot.currentRoute && robot.currentRoute.length > robot.currentRouteIndex) {
            const dest = robot.currentRoute[robot.currentRoute.length - 1];
            this.calculateRobotRoute(robot, dest);
          }
        }
      }
    }

    return isNowBlocked;
  }

  public clearAllObstacles(): void {
    for (const node of this.aisleNodes) {
      if (node.isBlocked) {
        node.isBlocked = false;
      }
    }

    this.addEvent({
      id: `clear_all_obs_${Date.now()}`,
      timestamp: Date.now(),
      type: 'aisle_cleared',
      message: 'All manual obstacles cleared from warehouse aisles.',
      severity: 'info',
    });

    for (const robot of this.robotMap.values()) {
      if (robot.state === 'waiting_for_path' || robot.state === 'waiting' || (robot.waitTime > 0 && robot.blockedReason)) {
        robot.waitTime = 0;
        robot.obstacleCheckTimer = 0;
        robot.blockedReason = undefined;
        robot.waitingReason = undefined;

        if (robot.currentTaskId) {
          const task = this.taskMap.get(robot.currentTaskId);
          if (task) {
            const dest = robot.isCarrying ? task.destinationCoord : task.pickupCoord;
            const routeOk = this.calculateRobotRoute(robot, dest);
            if (routeOk) {
              robot.state = robot.isCarrying ? 'moving_to_delivery' : 'moving_to_pickup';
            }
          }
        }
      }
    }
  }

  public triggerEmergency(type: EmergencyType, params?: any): void {
    switch (type) {
      case 'critical_request': {
        const product = this.getProducts().find(p => p.quantity > 0) || this.getProducts()[0];
        if (product) {
          this.createManualTask({
            productId: product.id,
            requestedQuantity: Math.min(3, product.quantity),
            shelfId: product.shelfId,
            deliveryNodeId: 'D-01',
            priority: 'critical',
            notes: 'URGENT: Emergency priority shipment!',
            deadlineSeconds: 60,
          });
        }
        break;
      }

      case 'robot_breakdown': {
        this.triggerRandomBreakdown();
        break;
      }

      case 'battery_failure': {
        const robots = this.robotMap.values().filter(r => r.state !== 'breakdown' && r.state !== 'charging');
        if (robots.length > 0) {
          const target = robots[0];
          target.battery = 8;
          this.addEvent({
            id: `bat_fail_${Date.now()}`,
            timestamp: Date.now(),
            type: 'battery_low',
            message: `EMERGENCY: Power cell depletion on ${target.name} (8% battery). Auto-charging triggered.`,
            severity: 'error',
            robotId: target.id,
          });
        }
        break;
      }

      case 'lockdown':
      default: {
        this.emergencyStop();
        break;
      }
    }
  }

  public emergencyStop(): void {
    this.isRunning = false;
    for (const robot of this.robotMap.values()) {
      robot.isPaused = true;
    }
    soundEffects.playEmergency();
    this.addEvent({
      id: `emergency_stop_${Date.now()}`,
      timestamp: Date.now(),
      type: 'emergency_triggered',
      message: '🚨 EMERGENCY STOP ACTIVATED: All autonomous robots halted immediately. System in emergency state.',
      severity: 'error',
    });
  }

  public pauseAllRobots(): void {
    for (const robot of this.robotMap.values()) {
      robot.isPaused = true;
    }
    this.addEvent({
      id: `pause_all_${Date.now()}`,
      timestamp: Date.now(),
      type: 'rerouted',
      message: '⏸️ PAUSED ALL ROBOTS: Fleet movement halted.',
      severity: 'warning',
    });
  }

  public resumeAllRobots(): void {
    this.isRunning = true;
    for (const robot of this.robotMap.values()) {
      robot.isPaused = false;
    }
    this.addEvent({
      id: `resume_all_${Date.now()}`,
      timestamp: Date.now(),
      type: 'aisle_cleared',
      message: '▶️ RESUMED ALL ROBOTS: Fleet operations restarted.',
      severity: 'info',
    });
  }

  public cancelTask(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task || task.status === 'completed') return false;

    if (task.shelfId && task.assignedRobotId) {
      this.shelfAccessManager.cancelRequest(task.shelfId, task.assignedRobotId);
    }

    if (task.assignedRobotId) {
      const robot = this.robotMap.get(task.assignedRobotId);
      if (robot && robot.currentTaskId === taskId) {
        robot.currentTaskId = undefined;
        robot.targetShelfId = undefined;
        robot.targetDeliveryNodeId = undefined;
        robot.currentRoute = [];
        robot.currentRouteIndex = 0;
        if (!robot.isCarrying) {
          robot.state = 'idle';
        }
      }
    }

    task.status = 'cancelled';
    this.addEvent({
      id: `cancel_${task.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'task_completed',
      message: `TASK CANCELLED: Task ${task.id} (${task.payloadName}) was manually cancelled.`,
      severity: 'warning',
      taskId: task.id,
    });
    return true;
  }

  public reprioritizeTask(taskId: string, newPriority: TaskPriority): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) return false;
    task.priority = newPriority;

    if (task.status === 'queued') {
      if (newPriority === 'critical' || newPriority === 'high') {
        this.urgentTaskQueue.enqueue(task, newPriority === 'critical' ? 1 : 5);
      } else {
        this.normalTaskQueue.enqueue(task);
      }
    }

    this.addEvent({
      id: `reprioritize_${task.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'task_created',
      message: `TASK REPRIORITIZED: Task ${task.id} priority changed to ${newPriority.toUpperCase()}.`,
      severity: 'info',
      taskId: task.id,
    });
    return true;
  }

  public reassignTask(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task || task.status === 'completed') return false;

    if (task.shelfId && task.assignedRobotId) {
      this.shelfAccessManager.cancelRequest(task.shelfId, task.assignedRobotId);
    }

    if (task.assignedRobotId) {
      const currentRobot = this.robotMap.get(task.assignedRobotId);
      if (currentRobot) {
        currentRobot.currentTaskId = undefined;
        currentRobot.state = 'idle';
        currentRobot.currentRoute = [];
      }
    }

    task.assignedRobotId = undefined;
    task.status = 'queued';
    task.reassignmentCount++;

    if (task.priority === 'critical' || task.priority === 'high') {
      this.urgentTaskQueue.enqueue(task, task.priority === 'critical' ? 1 : 5);
    } else {
      this.normalTaskQueue.enqueue(task);
    }

    this.addEvent({
      id: `reassign_${task.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'task_reassigned',
      message: `TASK REASSIGNED: Task ${task.id} returned to dispatch queue for immediate reallocation.`,
      severity: 'warning',
      taskId: task.id,
    });

    this.processTaskAllocation();
    return true;
  }

  public retryTask(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) return false;

    task.status = 'queued';
    task.assignedRobotId = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;

    if (task.priority === 'critical' || task.priority === 'high') {
      this.urgentTaskQueue.enqueue(task, task.priority === 'critical' ? 1 : 5);
    } else {
      this.normalTaskQueue.enqueue(task);
    }

    this.addEvent({
      id: `retry_${task.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'task_created',
      message: `TASK RETRIED: Task ${task.id} re-queued for dispatch.`,
      severity: 'info',
      taskId: task.id,
    });

    this.processTaskAllocation();
    return true;
  }

  private updateMetrics(): void {
    const robots = this.robotMap.values();
    let totalBat = 0;
    let activeCount = 0;
    let idleCount = 0;
    let chargingCount = 0;
    let brokenCount = 0;

    for (const r of robots) {
      totalBat += r.battery;
      if (r.state === 'idle') idleCount++;
      else if (r.state === 'charging') chargingCount++;
      else if (r.state === 'breakdown') brokenCount++;
      else activeCount++;
    }

    const avgBat = robots.length > 0 ? totalBat / robots.length : 100;
    const avgDuration =
      this.taskCompletionDurations.length > 0
        ? this.taskCompletionDurations.reduce((a, b) => a + b, 0) / this.taskCompletionDurations.length
        : 0;

    const algoTimes = Array.from(this.algorithmStats.entries()).map(([algorithm, stats]) => ({
      algorithm,
      avgTimeMs: Math.round((stats.totalMs / Math.max(1, stats.count)) * 100) / 100,
      count: stats.count,
    }));

    this.metrics = {
      ...this.metrics,
      activeRobotsCount: activeCount,
      idleRobotsCount: idleCount,
      chargingRobotsCount: chargingCount,
      brokenRobotsCount: brokenCount,
      tasksCompleted: this.metrics.tasksCompleted,
      tasksPending: this.urgentTaskQueue.size() + this.normalTaskQueue.size(),
      totalDistanceTraveled: Math.round(this.metrics.totalDistanceTraveled * 10) / 10,
      averageBatteryLevel: Math.round(avgBat),
      deadlocksDetected: this.metrics.deadlocksDetected,
      deadlocksRecovered: this.metrics.deadlocksRecovered,
      averageTaskCompletionTime: Math.round(avgDuration * 10) / 10,
      systemThroughputPerHour: Math.round((this.metrics.tasksCompleted / Math.max(1, this.simulationTime)) * 3600),
      algorithmExecutionTimes: algoTimes,
      congestedNodes: this.collisionAvoidance.getCongestion(this.aisleNodes.length).hotspots,
    };
  }

  private checkScenarioConditions(): void {
    if (!this.activeScenario) return;

    if (this.metrics.tasksCompleted >= this.activeScenario.targetTasks) {
      this.scenarioStatus = 'won';
      this.addEvent({
        id: `scenario_won_${Date.now()}`,
        timestamp: Date.now(),
        type: 'task_completed',
        message: `VICTORY! Scenario "${this.activeScenario.title}" completed successfully!`,
        severity: 'success',
      });
      this.isRunning = false;
      return;
    }

    if (this.activeScenario.timeLimit > 0 && this.simulationTime >= this.activeScenario.timeLimit) {
      this.scenarioStatus = 'lost';
      this.addEvent({
        id: `scenario_lost_time_${Date.now()}`,
        timestamp: Date.now(),
        type: 'robot_breakdown',
        message: `FAILED: Scenario time limit of ${this.activeScenario.timeLimit}s exceeded.`,
        severity: 'error',
      });
      this.isRunning = false;
      return;
    }

    if (this.metrics.brokenRobotsCount > this.activeScenario.maxBreakdownsAllowed) {
      this.scenarioStatus = 'lost';
      this.addEvent({
        id: `scenario_lost_broken_${Date.now()}`,
        timestamp: Date.now(),
        type: 'robot_breakdown',
        message: `FAILED: Too many robot breakdowns (${this.metrics.brokenRobotsCount}).`,
        severity: 'error',
      });
      this.isRunning = false;
    }
  }

  public spawnRandomTask(overridePriority?: TaskPriority, overrideType?: TaskType): WarehouseTask {
    const products = this.getProducts().filter(p => p.quantity > 0);
    const product = products.length > 0 ? products[Math.floor(Math.random() * products.length)] : undefined;
    const shelfId = product ? product.shelfId : (this.shelfNodes[0]?.shelfId || 'A-01');
    const deliveryNode = this.deliveryNodes[Math.floor(Math.random() * this.deliveryNodes.length)] || this.deliveryNodes[0];

    const res = this.createManualTask({
      productId: product?.id || 'PRD-001',
      requestedQuantity: 1,
      shelfId,
      deliveryNodeId: deliveryNode.id,
      priority: overridePriority || 'normal',
    });

    return res.tasksCreated[0];
  }

  public loadScenario(scenarioId: string): void {
    const scenario = PRESET_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    this.activeScenario = scenario;
    this.scenarioStatus = 'in_progress';
    this.config = {
      ...this.config,
      ...(scenario.initialConfig || {}),
    };

    const generated = WarehouseGenerator.generate(this.config);
    this.graph = generated.graph;
    this.nodes = generated.nodes;
    this.chargingStations = generated.chargingStations;
    this.packingStations = generated.packingStations;
    this.deliveryNodes = generated.deliveryNodes;
    this.waitingNodes = generated.waitingNodes;
    this.pickupStations = generated.pickupStations;
    this.shelfNodes = generated.shelfNodes;
    this.aisleNodes = generated.aisleNodes;
    this.shelfIdToFacingAisle = generated.shelfIdToFacingAisle;
    this.trafficManager = generated.trafficManager;
    this.trafficManager.reset();

    this.products.clear();
    for (const p of generated.initialProducts) {
      this.products.set(p.id, p);
    }

    this.urgentTaskQueue.clear();
    this.normalTaskQueue.clear();
    this.chargingQueue.clear();
    this.taskMap.clear();
    this.simulationTime = 0;
    this.taskCompletionDurations = [];

    this.initializeRobots();
    this.initShelfAccessManager();
    this.deadlockDetector.reset();
    this.isRunning = true;
  }

  public reset(): void {
    this.urgentTaskQueue.clear();
    this.normalTaskQueue.clear();
    this.chargingQueue.clear();
    this.taskMap.clear();
    this.eventHistory.clear();
    this.eventStack.clear();
    this.simulationTime = 0;
    this.scenarioStatus = 'in_progress';
    this.taskCompletionDurations = [];
    this.algorithmStats.clear();

    const generated = WarehouseGenerator.generate(this.config);
    this.graph = generated.graph;
    this.nodes = generated.nodes;
    this.chargingStations = generated.chargingStations;
    this.packingStations = generated.packingStations;
    this.deliveryNodes = generated.deliveryNodes;
    this.waitingNodes = generated.waitingNodes;
    this.pickupStations = generated.pickupStations;
    this.shelfNodes = generated.shelfNodes;
    this.aisleNodes = generated.aisleNodes;
    this.shelfIdToFacingAisle = generated.shelfIdToFacingAisle;
    this.trafficManager = generated.trafficManager;
    this.trafficManager.reset();

    this.products.clear();
    for (const p of generated.initialProducts) {
      this.products.set(p.id, p);
    }

    this.initializeRobots();
    this.initShelfAccessManager();
    this.deadlockDetector.reset();
    this.updateMetrics();
    this.isRunning = true;

    this.addEvent({
      id: `reset_${Date.now()}`,
      timestamp: Date.now(),
      type: 'aisle_cleared',
      message: 'Simulation reset to baseline configuration.',
      severity: 'info',
    });
  }

  public debugSetRobotDestination(robotId: string, destination: GridCoord): boolean {
    const robot = this.robotMap.get(robotId);
    if (!robot) return false;
    const ok = this.calculateRobotRoute(robot, destination);
    if (ok) {
      robot.state = robot.isCarrying ? 'moving_to_delivery' : 'moving_to_pickup';
      robot.isPaused = false;
      this.addEvent({
        id: `dbg_dest_${robot.id}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'rerouted',
        message: `[DEBUG] Manual destination assigned to ${robot.name}: (${destination.x}, ${destination.y}). Path length: ${robot.currentRoute.length} waypoints.`,
        severity: 'info',
        robotId: robot.id,
      });
    }
    return ok;
  }

  public debugToggleRobotPause(robotId: string): boolean {
    const robot = this.robotMap.get(robotId);
    if (!robot) return false;
    robot.isPaused = !robot.isPaused;
    this.addEvent({
      id: `dbg_pause_${robot.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'rerouted',
      message: `[DEBUG] ${robot.name} movement ${robot.isPaused ? 'PAUSED' : 'RESUMED'} manually.`,
      severity: 'info',
      robotId: robot.id,
    });
    return !!robot.isPaused;
  }

  public debugSetRobotBattery(robotId: string, level: number): void {
    const robot = this.robotMap.get(robotId);
    if (!robot) return;
    robot.battery = Math.max(0, Math.min(100, level));
    this.addEvent({
      id: `dbg_bat_${robot.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'battery_low',
      message: `[DEBUG] Set ${robot.name} battery to ${robot.battery}%.`,
      severity: robot.battery < 25 ? 'warning' : 'info',
      robotId: robot.id,
    });
  }

  public debugInspectRobot(robotId: string) {
    const robot = this.robotMap.get(robotId);
    if (!robot) return null;
    return {
      id: robot.id,
      name: robot.name,
      state: robot.state,
      isPaused: !!robot.isPaused,
      battery: robot.battery,
      gridPosition: { ...robot.gridPosition },
      position: { ...robot.position },
      heading: robot.heading,
      speed: robot.maxSpeed,
      cargoCount: robot.cargoCount,
      cargoItems: [...robot.cargoItems],
      currentTaskId: robot.currentTaskId,
      targetShelfId: robot.targetShelfId,
      targetDeliveryNodeId: robot.targetDeliveryNodeId,
      routeLength: robot.currentRoute.length,
      currentRouteIndex: robot.currentRouteIndex,
      remainingWaypoints: robot.currentRoute.slice(robot.currentRouteIndex),
      waitTime: robot.waitTime,
      blockedReason: robot.blockedReason,
    };
  }
}
