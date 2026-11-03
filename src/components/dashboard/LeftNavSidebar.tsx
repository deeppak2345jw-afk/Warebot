import React from 'react';
import {
  Home,
  Boxes,
  Package,
  ListTodo,
  Bot,
  Zap,
  ArrowDownToLine,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useUIStore, ScreenType } from '../../store/useUIStore';

interface NavItem {
  id: ScreenType;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const LeftNavSidebar: React.FC = () => {
  const activeScreen = useUIStore((s) => s.activeScreen);
  const setActiveScreen = useUIStore((s) => s.setActiveScreen);

  const navItems: NavItem[] = [
    { id: 'home', label: 'Main Menu', icon: Home, badge: 'Home' },
    { id: 'simulation', label: 'Main Warehouse', icon: Boxes, badge: '2D' },
    { id: 'tasks', label: 'Task Scheduler', icon: ListTodo },
    { id: 'robots', label: 'Fleet Roster', icon: Bot },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package, badge: 'Stock' },
    { id: 'charging_stations', label: 'Charging Bays', icon: Zap, badge: 'Bays' },
    { id: 'delivery_nodes', label: 'Delivery Docks', icon: ArrowDownToLine, badge: 'Docks' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#060B14] border-r border-[#1E2C42] flex flex-col justify-between select-none z-20 shrink-0 font-sans text-xs">
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#7F9BB8] px-3 py-1.5 flex items-center justify-between">
          <span>WAREBOTS CONSOLE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm shadow-[#00E5FF]/20 font-semibold'
                  : 'text-[#7F9BB8] hover:text-[#E7F4FF] hover:bg-[#0B1220]'
              }`}
            >
              {/* Active left cyan indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#00E5FF] rounded-r-full shadow-md shadow-[#00E5FF]" />
              )}

              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#00E5FF]' : 'text-[#48627D] group-hover:text-[#7F9BB8]'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge ? (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30'
                      : 'bg-[#101E32] text-[#7F9BB8]'
                  }`}
                >
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00E5FF]" />
              )}
            </button>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-[#1E2C42] bg-[#04070D]">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
          <div className="text-[11px] font-mono text-[#00F5A0] font-bold">WAREBOTS CORE ONLINE</div>
        </div>
        <div className="text-[10px] text-[#7F9BB8] mt-1 font-mono flex items-center justify-between">
          <span>60 FPS • AUTONOMOUS</span>
          <span className="text-[#00E5FF] font-bold">v2.0</span>
        </div>
      </div>
    </aside>
  );
};
