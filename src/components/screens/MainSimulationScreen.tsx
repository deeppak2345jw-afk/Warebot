import React, { useEffect } from 'react';
import { Maximize2, Minimize2, Move, Box, Layers, HelpCircle, Binary } from 'lucide-react';
import { Warehouse2DCanvas } from '../simulation/Warehouse2DCanvas';
import { Warehouse3DScene } from '../3d/Warehouse3DScene';
import { RightInspector } from '../dashboard/RightInspector';
import { BottomPanel } from '../dashboard/BottomPanel';
import { DeveloperDebugPanel } from '../dashboard/DeveloperDebugPanel';
import { KeyboardShortcutsModal } from '../dashboard/KeyboardShortcutsModal';
import { AlgorithmRouteInspector } from '../dashboard/AlgorithmRouteInspector';
import { useUIStore } from '../../store/useUIStore';

export const MainSimulationScreen: React.FC = () => {
  const isInspectorOpen = useUIStore((s) => s.isInspectorOpen);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const isViewportMaximized = useUIStore((s) => s.isViewportMaximized);
  const toggleViewportMaximized = useUIStore((s) => s.toggleViewportMaximized);
  const isFreeView = useUIStore((s) => s.isFreeView);
  const toggleFreeView = useUIStore((s) => s.toggleFreeView);
  const setKeyboardShortcutsOpen = useUIStore((s) => s.setKeyboardShortcutsOpen);
  const isKeyboardShortcutsOpen = useUIStore((s) => s.isKeyboardShortcutsOpen);
  const toggleAlgorithmInspector = useUIStore((s) => s.toggleAlgorithmInspector);
  const isAlgorithmInspectorOpen = useUIStore((s) => s.isAlgorithmInspectorOpen);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or select
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '1') {
        setViewMode('2d');
      } else if (e.key === '2') {
        setViewMode('3d');
      } else if (e.key === '3') {
        setViewMode('isometric');
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFreeView();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleViewportMaximized();
      } else if (e.key === 'Escape') {
        if (isViewportMaximized) toggleViewportMaximized();
        if (isKeyboardShortcutsOpen) setKeyboardShortcutsOpen(false);
      } else if (e.key === '?') {
        setKeyboardShortcutsOpen(!isKeyboardShortcutsOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setViewMode,
    toggleFreeView,
    toggleViewportMaximized,
    isViewportMaximized,
    setKeyboardShortcutsOpen,
    isKeyboardShortcutsOpen,
  ]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#050914]">
      {/* Central Map Area + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Viewport Container */}
        <div
          id="warehouse-viewport"
          className={`h-full relative transition-all duration-200 ${
            isViewportMaximized
              ? 'absolute inset-0 z-30 w-full'
              : 'flex-1'
          }`}
        >
          {/* Universal View Controls & Maximize Bar (Top-Right of Viewport) */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20 select-none">
            {/* 2D / 3D / Isometric View Switcher */}
            <div className="bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-1 rounded-xl flex items-center gap-1 shadow-xl">
              <button
                id="view-2d"
                onClick={() => setViewMode('2d')}
                title="2D Tactical View (Shortcut: 1)"
                className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition ${
                  viewMode === '2d'
                    ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                    : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
                }`}
              >
                2D Tactical
              </button>
              <button
                id="view-3d"
                onClick={() => setViewMode('3d')}
                title="3D Perspective View (Shortcut: 2)"
                className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition ${
                  viewMode === '3d'
                    ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                    : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
                }`}
              >
                3D Scene
              </button>
              <button
                id="view-isometric"
                onClick={() => setViewMode('isometric')}
                title="3D Isometric View (Shortcut: 3)"
                className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition ${
                  viewMode === 'isometric'
                    ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/20'
                    : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
                }`}
              >
                Isometric
              </button>
            </div>

            {/* Free View / Pan Mode Button */}
            <div className="bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-1 rounded-xl flex items-center gap-1 shadow-xl">
              <button
                onClick={toggleFreeView}
                title="Toggle Free View / Pan Mode (WASD + Mouse Drag) (Shortcut: F)"
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 ${
                  isFreeView
                    ? 'bg-[#FFB020] text-black shadow-md shadow-[#FFB020]/30'
                    : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Free View</span>
              </button>
            </div>

            {/* Routing & Algorithm Engine Button */}
            <div className="bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-1 rounded-xl flex items-center shadow-xl">
              <button
                onClick={toggleAlgorithmInspector}
                title="Routing Algorithm Engine & Path Benchmark (A* vs Dijkstra)"
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 ${
                  isAlgorithmInspectorOpen
                    ? 'bg-[#00E5FF] text-black shadow-md shadow-[#00E5FF]/30'
                    : 'text-[#7F9BB8] hover:text-[#00E5FF] hover:bg-[#101E32]'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Algorithms</span>
              </button>
            </div>

            {/* Warehouse Viewport Maximize Button */}
            <div className="bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-1 rounded-xl flex items-center shadow-xl">
              <button
                id="warehouse-maximize"
                onClick={toggleViewportMaximized}
                title={isViewportMaximized ? 'Restore Viewport (Shortcut: M / ESC)' : 'Maximize Viewport (Shortcut: M)'}
                className={`p-1.5 rounded-lg transition ${
                  isViewportMaximized
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                    : 'text-[#7F9BB8] hover:text-white hover:bg-[#101E32]'
                }`}
              >
                {isViewportMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Help Overlay Button */}
            <div className="bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-1 rounded-xl flex items-center shadow-xl">
              <button
                onClick={() => setKeyboardShortcutsOpen(true)}
                title="Keyboard Shortcuts & Help (Shortcut: ?)"
                className="p-1.5 text-[#7F9BB8] hover:text-[#00E5FF] hover:bg-[#101E32] rounded-lg transition"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Free View Active Indicator Badge */}
          {isFreeView && (
            <div className="absolute top-4 left-4 bg-[#FFB020]/90 text-black px-3 py-1 rounded-lg font-mono text-xs font-bold shadow-lg flex items-center gap-2 z-20 animate-pulse pointer-events-none">
              <Move className="w-3.5 h-3.5" />
              <span>FREE VIEW MODE (WASD + Mouse Pan/Rotate | Space to Reset)</span>
            </div>
          )}

          {/* Render 2D Tactical Canvas OR 3D/Isometric Scene */}
          {viewMode === '2d' ? <Warehouse2DCanvas /> : <Warehouse3DScene />}
        </div>

        {/* Right Inspector Panel (dimmed if viewport maximized) */}
        {isInspectorOpen && !isViewportMaximized && <RightInspector />}
      </div>

      {/* Collapsible Bottom Panel (Events & Task Queue) (hidden if viewport maximized) */}
      {!isViewportMaximized && <BottomPanel />}

      {/* Developer Debug Panel (Floating Diagnostic Window) */}
      <DeveloperDebugPanel />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal />

      {/* Routing & Algorithm Inspector Modal */}
      <AlgorithmRouteInspector />
    </div>
  );
};
