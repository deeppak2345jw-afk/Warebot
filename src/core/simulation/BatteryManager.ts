import { Robot, ChargingStation } from '../types';
import { manhattanDistance } from '../allocation/strategies';

export class BatteryManager {
  public static readonly LOW_BATTERY_THRESHOLD = 20;
  public static readonly CRITICAL_BATTERY_THRESHOLD = 15;
  public static readonly TARGET_CHARGE_LEVEL = 100;

  public static consumeBattery(robot: Robot, distanceMoved: number, isCarrying: boolean, deltaSeconds: number): void {
    if (robot.state === 'charging') return;

    const baseRatePerUnit = 0.25;
    const loadMultiplier = isCarrying ? 1.5 : 1.0;
    const moveDrain = distanceMoved * baseRatePerUnit * loadMultiplier;

    const isExecuting =
      robot.state === 'picking_up' ||
      robot.state === 'loading' ||
      robot.state === 'delivering' ||
      robot.state === 'unloading' ||
      robot.state === 'aligning_pickup' ||
      robot.state === 'aligning_delivery' ||
      robot.state === 'executing_task';
    const execDrain = isExecuting ? deltaSeconds * 0.2 : 0;

    const idleDrain = deltaSeconds * 0.01;

    const totalDrain = moveDrain + execDrain + idleDrain;
    robot.battery = Math.max(0, robot.battery - totalDrain);
  }

  public static chargeRobot(robot: Robot, station: ChargingStation, deltaSeconds: number): boolean {
    if (!station.isOperational) return false;

    const chargeRatePerSecond = 2.0;
    const chargeAdded = chargeRatePerSecond * deltaSeconds;
    robot.battery = Math.min(100, robot.battery + chargeAdded);
    station.totalEnergyDelivered += chargeAdded;

    return robot.battery >= BatteryManager.TARGET_CHARGE_LEVEL;
  }

  public static findBestChargingStation(
    robot: Robot,
    stations: ChargingStation[]
  ): ChargingStation | null {
    const homeDock = stations.find(
      s => s.id === robot.home_dock_id || s.assignedRobotId === robot.id
    );
    if (homeDock && homeDock.isOperational) {
      return homeDock;
    }
    return null;
  }
}
