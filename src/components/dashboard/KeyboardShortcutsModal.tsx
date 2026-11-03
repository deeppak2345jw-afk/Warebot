import React from 'react';
import { HelpCircle, X, Compass, Play, Eye, Move } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const KeyboardShortcutsModal: React.FC = () => {
  const isKeyboardShortcutsOpen = useUIStore((s) => s.isKeyboardShortcutsOpen);
  const setKeyboardShortcutsOpen = useUIStore((s) => s.setKeyboardShortcutsOpen);

  if (!isKeyboardShortcutsOpen) return null;

  const shortcutSections = [
    {
      title: 'VIEW CONTROLS',
      icon: <Eye className="w-4 h-4 text-[#00E5FF]" />,
      items: [
        { key: '1', desc: 'Switch to 2D Tactical View' },
        { key: '2', desc: 'Switch to 3D Perspective View' },
        { key: '3', desc: 'Switch to Isometric View' },
        { key: 'F', desc: 'Toggle Free View / Pan Mode' },
        { key: 'M', desc: 'Toggle Maximize Viewport' },
        { key: 'ESC', desc: 'Exit Maximize / Close Modals' },
        { key: 'Space', desc: 'Reset Camera (in Free View)' },
      ],
    },
    {
      title: 'SIMULATION CONTROLS',
      icon: <Play className="w-4 h-4 text-[#00F5A0]" />,
      items: [
        { key: 'Space', desc: 'Play / Pause Simulation' },
        { key: 'Shift+Space', desc: 'Step Forward 1 Tick' },
        { key: 'R', desc: 'Reset Simulation' },
        { key: '1-8x', desc: 'Select Speed Multiplier in Top Bar' },
      ],
    },
    {
      title: 'CAMERA (FREE VIEW MODE)',
      icon: <Move className="w-4 h-4 text-[#FFB020]" />,
      items: [
        { key: 'W / A / S / D', desc: 'Pan Camera (Up, Left, Down, Right)' },
        { key: 'Left Click + Drag', desc: 'Rotate Viewport' },
        { key: 'Right Click + Drag', desc: 'Pan Viewport' },
        { key: 'Scroll Wheel', desc: 'Smooth Zoom In / Out' },
        { key: 'Q / E', desc: 'Roll Camera Clockwise / Counter-Clockwise' },
        { key: 'Shift (Hold)', desc: '2x Pan / Movement Speed' },
        { key: 'Ctrl (Hold)', desc: '0.5x Precision Speed' },
      ],
    },
    {
      title: 'PANELS & MODALS',
      icon: <Compass className="w-4 h-4 text-[#A855F7]" />,
      items: [
        { key: 'T', desc: 'Toggle Tasks / Inspector Panel' },
        { key: 'L', desc: 'Toggle Event Timeline / Bottom Panel' },
        { key: '?', desc: 'Show / Hide This Help Overlay' },
        { key: 'X', desc: 'Close Active Focused Window' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0B1728] border border-[#183653] shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden text-[#E7F4FF] font-mono">
        {/* Header */}
        <div className="px-5 py-4 bg-[#081221] border-b border-[#183653] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center border border-[#00E5FF]/40">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">KEYBOARD SHORTCUTS & NAVIGATION</h2>
              <p className="text-[10px] text-[#7F9BB8] font-sans">Quick reference guide for RoboFleet controls</p>
            </div>
          </div>
          <button
            onClick={() => setKeyboardShortcutsOpen(false)}
            className="text-[#7F9BB8] hover:text-white p-1 rounded-lg hover:bg-[#101E32] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {shortcutSections.map((sec) => (
            <div key={sec.title} className="bg-[#101E32]/70 border border-[#183653] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold tracking-wide">
                {sec.icon}
                <span>{sec.title}</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {sec.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-0.5">
                    <span className="text-[#7F9BB8]">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#081221] border border-[#183653] text-[#00E5FF] font-bold text-[10px] shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#081221] border-t border-[#183653] flex items-center justify-between text-[11px] text-[#7F9BB8]">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[#101E32] text-white">?</kbd> anytime to toggle this modal.</span>
          <button
            onClick={() => setKeyboardShortcutsOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black font-bold transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
