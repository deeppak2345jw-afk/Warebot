import React from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Download,
  Activity,
  BatteryCharging,
  Bot,
  Zap,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

export const AnalyticsScreen: React.FC = () => {
  const metrics = useSimulationStore((s) => s.metrics);
  const robots = useSimulationStore((s) => s.robots);
  const tasks = useSimulationStore((s) => s.tasks);
  const simulationTime = useSimulationStore((s) => s.simulationTime);

  // Prepare robot battery & workload chart data
  const robotData = robots.map((r) => ({
    name: r.name,
    battery: Math.round(r.battery),
    tasks: r.tasksCompleted,
    distance: Math.round(r.distanceTraveled),
  }));

  // Prepare throughput chart data
  const throughputData = metrics.throughputHistory.length > 0
    ? metrics.throughputHistory
    : [{ time: 0, completed: 0 }];

  // Prepare algorithm comparison data
  const algoData = metrics.algorithmExecutionTimes.length > 0
    ? metrics.algorithmExecutionTimes
    : [
        { algorithm: 'astar', avgTimeMs: 0.8 },
        { algorithm: 'dijkstra', avgTimeMs: 2.1 },
      ];

  // Export Analytics to JSON
  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      simulationTimeSeconds: simulationTime,
      metrics,
      robots: robots.map((r) => ({
        id: r.id,
        name: r.name,
        battery: r.battery,
        tasksCompleted: r.tasksCompleted,
        distanceTraveled: r.distanceTraveled,
        state: r.state,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        priority: t.priority,
        status: t.status,
        pickup: t.pickupCoord,
        destination: t.destinationCoord,
        assignedRobot: t.assignedRobotId,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse_analytics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Analytics to CSV
  const exportCSV = () => {
    let csv = 'Robot ID,Name,State,Battery (%),Tasks Completed,Distance Traveled (m)\n';
    robots.forEach((r) => {
      csv += `${r.id},${r.name},${r.state},${r.battery.toFixed(1)},${r.tasksCompleted},${r.distanceTraveled.toFixed(1)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warehouse-border">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Real-Time Warehouse Analytics</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Live operational metrics, throughput trends, battery consumption profiles, and algorithm latency benchmarks.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-warehouse-card hover:bg-warehouse-border text-xs border border-warehouse-border text-gray-300 font-mono transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportJSON}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold font-mono transition shadow-md shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
              <span>TASKS DELIVERED</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {metrics.tasksCompleted}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Avg time: {metrics.averageTaskCompletionTime}s
            </div>
          </div>

          <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
              <span>FLEET AVG BATTERY</span>
              <BatteryCharging className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">
              {metrics.averageBatteryLevel}%
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {metrics.chargingRobotsCount} robots currently charging
            </div>
          </div>

          <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
              <span>DISTANCE TRAVELED</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300 font-mono mt-1">
              {metrics.totalDistanceTraveled} m
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Total fleet transit distance</div>
          </div>

          <div className="bg-warehouse-card p-4 rounded-xl border border-warehouse-border">
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
              <span>CONGESTION LEVEL</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono mt-1">
              {metrics.congestion.level}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {metrics.congestion.percentage}% nodes reserved
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Tasks Delivered Over Time */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Throughput / Tasks Completed Over Time</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="areaCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="time" stroke="#64748b" textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e17', borderColor: '#1f293d', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#areaCyan)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Battery Reserves per Robot */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-cyan-400" />
              <span>Battery Reserves per AGV (%)</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={robotData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e17', borderColor: '#1f293d', fontSize: '11px' }}
                  />
                  <Bar dataKey="battery" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Workload Distribution (Tasks Done) */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Workload Distribution (Tasks Completed per AGV)</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={robotData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e17', borderColor: '#1f293d', fontSize: '11px' }}
                  />
                  <Bar dataKey="tasks" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Pathfinding Algorithm Execution Latency */}
          <div className="bg-warehouse-card p-5 rounded-xl border border-warehouse-border space-y-3">
            <div className="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Pathfinding Algorithm Compute Latency (ms)</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={algoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="algorithm" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e17', borderColor: '#1f293d', fontSize: '11px' }}
                  />
                  <Bar dataKey="avgTimeMs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
