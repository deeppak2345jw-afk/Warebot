import React from 'react';
import {
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Battery,
  Bot,
  Zap,
} from 'lucide-react';
import { PRESET_SCENARIOS } from '../../core/simulation/ScenarioManager';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const ScenarioScreen: React.FC = () => {
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const activeScenario = useSimulationStore((s) => s.activeScenario);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const handleLaunch = (scenarioId: string) => {
    loadScenario(scenarioId);
    setActiveScreen('simulation');
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Medium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Hard':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Extreme':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-warehouse-dark text-gray-200 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-warehouse-border">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Operational Scenarios & Stress Tests</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Select a pre-configured challenge to evaluate multi-robot task allocation, dynamic rerouting, and battery arbitration.
            </p>
          </div>
          <div className="text-xs font-mono bg-warehouse-card px-3 py-1.5 rounded-lg border border-warehouse-border text-cyan-400">
            {PRESET_SCENARIOS.length} SCENARIOS AVAILABLE
          </div>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_SCENARIOS.map((scenario) => {
            const isCurrent = activeScenario?.id === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-cyan-950/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-warehouse-card/80 border-warehouse-border hover:border-gray-600'
                }`}
              >
                <div className="space-y-3">
                  {/* Top: Title & Difficulty */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white">{scenario.title}</h2>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 mt-1 rounded font-mono font-semibold border ${getDifficultyColor(
                          scenario.difficulty
                        )}`}
                      >
                        {scenario.difficulty.toUpperCase()}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] bg-cyan-500 text-black font-bold px-2 py-0.5 rounded font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">{scenario.description}</p>

                  {/* Objectives */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                      Mission Objectives:
                    </div>
                    {scenario.objectives.map((obj, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>

                  {/* Criteria */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 font-mono">
                    <div className="bg-warehouse-darker p-2 rounded border border-warehouse-border">
                      <span className="text-emerald-400 font-semibold block">SUCCESS:</span>
                      <span className="text-gray-400">{scenario.successCondition}</span>
                    </div>
                    <div className="bg-warehouse-darker p-2 rounded border border-warehouse-border">
                      <span className="text-red-400 font-semibold block">FAILURE:</span>
                      <span className="text-gray-400">{scenario.failureCondition}</span>
                    </div>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-4 mt-2 border-t border-warehouse-border flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      {scenario.initialConfig.robotCount || 6} AGVs
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      {scenario.targetTasks} Tasks
                    </span>
                  </div>

                  <button
                    onClick={() => handleLaunch(scenario.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-md shadow-cyan-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Scenario</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
