import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Eye,
  Check,
  HardDrive,
  Trash2,
  Sliders,
  Zap,
  Gauge,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';

export const SettingsScreen: React.FC = () => {
  const config = useSimulationStore((s) => s.config);
  const updateConfig = useSimulationStore((s) => s.updateConfig);
  const reset = useSimulationStore((s) => s.reset);

  const layers = useUIStore((s) => s.layers);
  const toggleLayer = useUIStore((s) => s.toggleLayer);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const setCameraMode = useUIStore((s) => s.setCameraMode);

  const [message, setMessage] = useState<string | null>(null);

  const handleSaveToLocalStorage = () => {
    localStorage.setItem('warebots_warehouse_config', JSON.stringify(config));
    setMessage('Configuration successfully saved to local browser storage.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLoadFromLocalStorage = () => {
    const saved = localStorage.getItem('warebots_warehouse_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        updateConfig(parsed);
        setMessage('Loaded configuration from local storage.');
      } catch (e) {
        setMessage('Failed to parse saved configuration.');
      }
    } else {
      setMessage('No saved configuration found in local storage.');
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('warebots_warehouse_config');
    setMessage('Cleared local storage.');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#050914] text-[#E7F4FF] select-none font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#183653]">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#00E5FF]" />
              <span>SYSTEM SETTINGS & LOCAL PERSISTENCE</span>
            </h1>
            <p className="text-xs text-[#7F9BB8] mt-1 font-sans">
              Configure simulation parameters, visual overlays, battery discharge rates, and browser local storage.
            </p>
          </div>

          {message && (
            <div className="flex items-center space-x-1.5 bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 px-3 py-1.5 rounded-xl text-xs">
              <Check className="w-3.5 h-3.5" />
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Visual & Map Overlays */}
        <div className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#00E5FF]" />
            <span>Map Overlays & Visual Effects</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#101E32] rounded-xl border border-[#183653]">
              <div>
                <div className="text-white font-bold">Glowing Neon Path Trails</div>
                <div className="text-[#7F9BB8] text-[11px] font-sans">
                  Render animated laser trails and particles along active robot routes
                </div>
              </div>
              <button
                onClick={() => toggleLayer('paths')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  layers.paths ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20' : 'bg-[#050914] text-[#7F9BB8]'
                }`}
              >
                {layers.paths ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#101E32] rounded-xl border border-[#183653]">
              <div>
                <div className="text-white font-bold">Technical Coordinate Grid</div>
                <div className="text-[#7F9BB8] text-[11px] font-sans">
                  Show discrete warehouse coordinate lines
                </div>
              </div>
              <button
                onClick={() => toggleLayer('grid')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  layers.grid ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20' : 'bg-[#050914] text-[#7F9BB8]'
                }`}
              >
                {layers.grid ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#101E32] rounded-xl border border-[#183653]">
              <div>
                <div className="text-white font-bold">Default 3D Camera Projection</div>
                <div className="text-[#7F9BB8] text-[11px] font-sans">
                  Choose default 3D camera viewpoint
                </div>
              </div>
              <div className="flex space-x-1">
                {(['orbit', 'top_down', 'follow_robot'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCameraMode(mode)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition ${
                      cameraMode === mode
                        ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-bold'
                        : 'text-[#7F9BB8] hover:text-white'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Physics Parameters */}
        <div className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#9B5CFF]" />
            <span>Simulation Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#101E32] rounded-xl border border-[#183653] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#7F9BB8]">Robot Speed:</span>
                <span className="text-[#00E5FF] font-bold">{config.robotSpeed} u/s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.2"
                value={config.robotSpeed}
                onChange={(e) => updateConfig({ robotSpeed: parseFloat(e.target.value) })}
                className="w-full accent-[#00E5FF]"
              />
            </div>

            <div className="p-3 bg-[#101E32] rounded-xl border border-[#183653] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#7F9BB8]">Battery Discharge Rate:</span>
                <span className="text-[#FFB020] font-bold">{config.batteryDischargeRate}% / unit</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={config.batteryDischargeRate}
                onChange={(e) => updateConfig({ batteryDischargeRate: parseFloat(e.target.value) })}
                className="w-full accent-[#FFB020]"
              />
            </div>
          </div>
        </div>

        {/* Persistence & Storage */}
        <div className="bg-[#0B1728] p-5 rounded-2xl border border-[#183653] space-y-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#00F5A0]" />
            <span>Browser LocalStorage Persistence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              onClick={handleSaveToLocalStorage}
              className="p-3 bg-[#101E32] hover:border-[#00E5FF]/60 rounded-xl border border-[#183653] flex items-center justify-center space-x-2 text-[#00E5FF] transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Config</span>
            </button>

            <button
              onClick={handleLoadFromLocalStorage}
              className="p-3 bg-[#101E32] hover:border-[#9B5CFF]/60 rounded-xl border border-[#183653] flex items-center justify-center space-x-2 text-[#9B5CFF] transition"
            >
              <HardDrive className="w-4 h-4" />
              <span>Load Saved</span>
            </button>

            <button
              onClick={handleClearLocalStorage}
              className="p-3 bg-[#101E32] hover:border-[#FF3D71]/60 rounded-xl border border-[#183653] flex items-center justify-center space-x-2 text-[#FF3D71] transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear LocalStorage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
