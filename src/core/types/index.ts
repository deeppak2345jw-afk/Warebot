export type NodeType =
  | 'aisle'
  | 'shelf'
  | 'charging'
  | 'packing'
  | 'pickup'
  | 'dispatch'
  | 'delivery'
  | 'waiting'
  | 'obstacle';

export interface GridCoord {
  x: number;
  y: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weightKg: number;
  shelfId: string;
  shelfCoord: GridCoord;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  color?: string;
}

export interface DeliveryNode {
  id: string;
  name: string;
  coord: GridCoord;
  capacity: number;
  currentQueue: string[];
  completedDeliveries: number;
  status: 'operational' | 'busy' | 'full' | 'offline';
}

export interface WaitingNode {
  id: string;
  name: string;
  coord: GridCoord;
  isOccupied: boolean;
  occupyingRobotId?: string;
  occupiedBy?: string;
  reservedBy?: string;
  waitingReason?: WaitingReason;
}

export type NavigationMode = 'NORMAL_TASK' | 'CHARGING_TASK' | 'LEAVING_DOCK';
export type NavigationType = 'NORMAL' | 'DOCK' | 'DOCK_APPROACH' | 'RESTRICTED' | 'WAITING';

export interface NodeReservation {
  owner: string;
  node: GridCoord;
  createdAt: number;
  ttl: number; 
  expectedRelease: number;
  purpose: 'current_position' | 'next_step' | 'staging' | 'docking' | 'waiting';
}

export type WaitingReason =
  | 'WAITING_FOR_SHELF'
  | 'WAITING_FOR_ROBOT'
  | 'WAITING_FOR_DOCK'
  | 'WAITING_FOR_INTERSECTION'
  | 'WAITING_FOR_PATH'
  | 'WAITING_FOR_BATTERY'
  | 'WAITING_FOR_PRIORITY';

export type ShelfAccessStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'WAITING';

export type TrafficDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'BIDIRECTIONAL' | 'ANY';

export interface CorridorLane {
  laneId: string;
  corridorId: string;
  direction: TrafficDirection;
  coords: GridCoord[];
  adjacentLaneId?: string;
}

export interface Corridor {
  corridorId: string;
  name: string;
  type: 'horizontal' | 'vertical' | 'storage_aisle';
  laneA: CorridorLane;
  laneB: CorridorLane;
  directionA: TrafficDirection;
  directionB: TrafficDirection;
  entryNodes: GridCoord[];
  exitNodes: GridCoord[];
  intersectionNodes: GridCoord[];
}

export type QueueSlotStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'APPROACHING' | 'RELEASING';

export interface QueueSlot {
  queueId: string;
  resourceId: string;
  slotIndex: number;
  coord: GridCoord;
  assignedRobotId?: string;
  reservedUntil?: number;
  status: QueueSlotStatus;
}

export interface IntersectionZone {
  intersectionId: string;
  coords: GridCoord[];
  reservedByRobotId?: string;
  reservationExpiry?: number;
  crossingRobotIds: string[];
  waitingQueue: string[];
}

export interface WarehouseNode {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  isBlocked: boolean;
  reservedBy?: string;
  zone?: string;
  shelfId?: string;
  deliveryNodeId?: string;
  waitingNodeId?: string;
  shelfAccessStatus?: ShelfAccessStatus;
  shelfOwnerRobotId?: string;
  shelfWaitingQueue?: string[];
  stagingCoords?: GridCoord[];
  navigationType?: NavigationType;
  isDockingZone?: boolean;
  trafficDirection?: TrafficDirection;
  laneId?: string;
  corridorId?: string;
  isIntersection?: boolean;
  isStagingNode?: boolean;
  isRestrictedZone?: boolean;
  isTwoWayCorridor?: boolean;
  oppositeLaneCoord?: GridCoord;
  shelfInfo?: {
    category: string;
    inventoryLevel: number;
    maxCapacity: number;
  };
}

export type DockState = 'AVAILABLE' | 'CHARGING' | 'OCCUPIED';

export interface IntegratedDock {
  id: string; 
  nodeId: string;
  coord: GridCoord;
  assigned_robot: string; 
  state: DockState;
  charging_speed: number; 
  queue: string[]; 
  isOperational: boolean;
  totalEnergyDelivered: number;
}

export type RobotState =
  | 'idle'
  | 'moving_to_task'
  | 'moving_to_pickup'
  | 'aligning_pickup'
  | 'picking_up'
  | 'loading'
  | 'executing_task'
  | 'moving_to_delivery'
  | 'aligning_delivery'
  | 'delivering'
  | 'unloading'
  | 'returning'
  | 'returning_to_dock'
  | 'low_battery'
  | 'going_to_charge'
  | 'waiting_for_charger'
  | 'charging'
  | 'leaving_dock'
  | 'breakdown'
  | 'waiting_for_path'
  | 'waiting'
  | 'staged'
  | 'rerouting'
  | 'backing_off'
  | 'yielding'
  | 'recovering_deadlock'
  | 'reassigned'
  | 'maintenance'
  | 'completed'
  | 'avoiding_obstacle'
  | 'carrying_item';

export interface CarriedItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface Robot {
  id: string;
  name: string;
  color: string;
  position: Position3D;
  gridPosition: GridCoord;
  targetGridPosition?: GridCoord;
  heading: number; 
  targetHeading?: number;
  battery: number;
  maxSpeed: number; 
  loadCapacity: number;
  maxCapacity: number; 
  cargoCount: number; 
  cargoItems: CarriedItem[];
  isCarrying: boolean;
  carriedItemName?: string;
  state: RobotState;
  isPaused?: boolean; 
  currentTaskId?: string;
  targetShelfId?: string;
  targetDeliveryNodeId?: string;
  currentRoute: GridCoord[];
  currentRouteIndex: number;
  distanceTraveled: number;
  tasksCompleted: number;
  chargingStationId?: string;
  waitingNodeId?: string;
  waitingCoord?: GridCoord;
  breakdownHistory: { time: number; reason: string }[];
  lastAllocationScore?: number;
  allocationReasoning?: string;
  waitTime: number;
  obstacleCheckTimer?: number;
  blockedReason?: string;
  waitingReason?: WaitingReason;
  navigationMode?: NavigationMode;
  lastLogicalNode?: GridCoord;
  lastMovementTick?: number;
  animationTimer: number;
  health: number;
  yieldTimer?: number;
  yieldTargetRobotId?: string;
  stagedAtCoord?: GridCoord;
  stagedShelfId?: string;
  lastProgressPosition?: GridCoord;
  lastProgressTime?: number;
  ticksWithoutProgress?: number;
  effectivePriority?: number;
  home_dock_id?: string;
  completedPaths?: { id: string; points: GridCoord[]; completedAt: number }[];
  previousMissionState?: {
    state: RobotState;
    currentTaskId?: string;
    targetShelfId?: string;
    targetDeliveryNodeId?: string;
    destinationCoord: GridCoord;
  };
  
  currentLaneId?: string;
  assignedTrafficDirection?: TrafficDirection;
  isTemporaryOppositeLane?: boolean;
  oppositeLaneReason?: string;
  oppositeLaneReturnCoord?: GridCoord;
  queueSlotIndex?: number;
  queueStatus?: string;
  movementMode?: 'LANE_FOLLOWING' | 'FREE_MOVEMENT' | 'INTERSECTION' | 'STAGING' | 'YIELDING' | 'LANE_DISCIPLINE';
  vacatingShelfId?: string;
  // Target validation & state tracking
  targetType?: 'PICKUP' | 'DELIVERY' | 'DOCK' | 'WAITING' | 'STAGING' | 'RECOVERY' | 'EMERGENCY_RECOVERY';
  targetNode?: GridCoord;
  // Explicit Wait Tracking & Timeout Revalidation
  waitingSince?: number;
  blockingEntity?: string;
  estimatedWaitTime?: number;
  maximumWaitThreshold?: number;
  routeVersion?: number;
  routeBlockedSince?: number;
  lastReplanTime?: number;
  replanCount?: number;
  replanReason?: string;
  previousRoutes?: GridCoord[][];
  isRecoveryRobot?: boolean;
  recoveringFromRobotId?: string;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type TaskType =
  | 'replenishment'
  | 'retrieval'
  | 'order_picking'
  | 'packing_delivery'
  | 'urgent_shipment'
  | 'transfer'
  | 'return'
  | 'emergency'
  | 'recovery';

export type TaskPhase =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'AT_PICKUP'
  | 'PICKED_UP'
  | 'CARRYING_ITEM'
  | 'EN_ROUTE_TO_DELIVERY'
  | 'AT_DELIVERY'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'ITEM_RECOVERY_REQUIRED'
  | 'RECOVERY_ASSIGNED'
  | 'EN_ROUTE_TO_RECOVERY'
  | 'RECOVERING_ITEM';

export type TaskStatus =
  | 'queued'
  | 'allocated'
  | 'in_progress'
  | 'picking'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface WarehouseTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  phase?: TaskPhase;
  productId?: string;
  requestedQuantity: number;
  deliveredQuantity: number;
  shelfId: string;
  deliveryNodeId: string;
  pickupNodeId: string;
  destinationNodeId: string;
  pickupCoord: GridCoord;
  shelfCoord: GridCoord;
  destinationCoord: GridCoord;
  createdAt: number;
  deadline?: number;
  status: TaskStatus;
  assignedRobotId?: string;
  estimatedDistance: number;
  estimatedTime: number;
  startedAt?: number;
  completedAt?: number;
  lastProgressTime?: number;
  ticksWithoutProgress?: number;
  allocationReasoning?: string;
  reassignmentCount: number;
  payloadName: string;
  progress?: number; // 0 - 100 percentage
  notes?: string;
  parentTaskId?: string;
  subtaskIds?: string[];
  subtaskIndex?: number;
  totalSubtasks?: number;
  isSubtask?: boolean;
  recoveryLocation?: GridCoord;
  brokenRobotId?: string;
  recoveredAt?: number;
}

export interface DeadlockCycle {
  robotIds: string[];
  cycleDescription: string;
  timestamp: number;
  victimRobotId: string;
  clearanceCoord: GridCoord;
}

export type AllocationStrategyType =
  | 'nearest_available'
  | 'highest_battery'
  | 'least_loaded'
  | 'fastest_completion'
  | 'priority_aware'
  | 'cost_based_adaptive'
  | 'balanced_workload';

export type PathfindingAlgorithmType = 'astar' | 'dijkstra';

export interface WarehouseConfig {
  width: number;
  length: number;
  shelfRows: number;
  shelfCols: number;
  robotCount: number;
  chargingStationCount: number;
  packingStationCount: number;
  pickupStationCount: number;
  deliveryNodeCount: number;
  autoTaskGeneration: boolean; 
  taskGenerationRate: number;
  robotSpeed: number; 
  batteryCapacity: number; 
  batteryDischargeRate: number; 
  breakdownProbability: number; 
  obstacleFrequency: number;
  pathfindingAlgorithm: PathfindingAlgorithmType;
  allocationStrategy: AllocationStrategyType;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  type:
    | 'task_created'
    | 'task_allocated'
    | 'task_completed'
    | 'task_reassigned'
    | 'robot_breakdown'
    | 'robot_repaired'
    | 'battery_low'
    | 'charging_started'
    | 'charging_finished'
    | 'aisle_blocked'
    | 'aisle_cleared'
    | 'rerouted'
    | 'collision_avoided'
    | 'pickup_started'
    | 'pickup_completed'
    | 'delivery_started'
    | 'delivery_completed'
    | 'emergency_triggered'
    | 'deadlock_detected'
    | 'deadlock_recovered'
    | 'shelf_reserved'
    | 'shelf_occupied'
    | 'shelf_released'
    | 'movement_started'
    | 'task_updated'
    | 'stuck_detected';
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  robotId?: string;
  taskId?: string;
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  description: string;
  objectives: string[];
  successCondition: string;
  failureCondition: string;
  initialConfig: Partial<WarehouseConfig>;
  targetTasks: number;
  timeLimit: number;
  minBatteryAvg: number;
  maxBreakdownsAllowed: number;
}

export interface ChargingStation {
  id: string;
  nodeId: string;
  coord: GridCoord;
  isOccupied: boolean;
  occupyingRobotId?: string;
  assignedRobotId?: string;
  dockState?: DockState;
  queue?: string[];
  isOperational: boolean;
  totalEnergyDelivered: number;
}

export interface PackingStation {
  id: string;
  nodeId: string;
  coord: GridCoord;
  name: string;
  zone: string;
  packagesProcessed: number;
  isBusy: boolean;
}

export interface PathfindingResult {
  path: GridCoord[];
  exploredNodes: GridCoord[];
  cost: number;
  calculationTimeMs: number;
  algorithm: PathfindingAlgorithmType;
}

export type EmergencyType =
  | 'critical_request'
  | 'robot_breakdown'
  | 'battery_failure'
  | 'aisle_closure'
  | 'charger_failure'
  | 'delivery_failure'
  | 'urgent_shipment'
  | 'lockdown';
