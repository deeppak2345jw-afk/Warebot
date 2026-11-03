import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TopNavBar } from './components/dashboard/TopNavBar';
import { LeftNavSidebar } from './components/dashboard/LeftNavSidebar';
import { MainSimulationScreen } from './components/screens/MainSimulationScreen';
import { Warehouse3DScreen } from './components/screens/Warehouse3DScreen';
import { PaneViewScreen } from './components/screens/PaneViewScreen';
import { ScenarioScreen } from './components/screens/ScenarioScreen';
import { ConfigScreen } from './components/screens/ConfigScreen';
import { AnalyticsScreen } from './components/screens/AnalyticsScreen';
import { FleetScreen } from './components/screens/FleetScreen';
import { TaskBoardScreen } from './components/screens/TaskBoardScreen';
import { DataStructuresScreen } from './components/screens/DataStructuresScreen';
import { EducationalScreen } from './components/screens/EducationalScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { InventoryScreen } from './components/screens/InventoryScreen';
import { ChargingStationsScreen } from './components/screens/ChargingStationsScreen';
import { DeliveryNodesScreen } from './components/screens/DeliveryNodesScreen';
import { EmergencyModal } from './components/dashboard/EmergencyModal';
import { CreateTaskModal } from './components/dashboard/CreateTaskModal';

import { useUIStore } from './store/useUIStore';
import { useSimulationStore } from './store/useSimulationStore';

export function App() {
  const activeScreen = useUIStore((s) => s.activeScreen);
  const isEmergencyModalOpen = useUIStore((s) => s.isEmergencyModalOpen);
  const isCreateTaskModalOpen = useUIStore((s) => s.isCreateTaskModalOpen);
  const scenarioStatus = useSimulationStore((s) => s.scenarioStatus);
  const toggleRunning = useSimulationStore((s) => s.toggleRunning);
  const step = useSimulationStore((s) => s.step);
  const setSpeed = useSimulationStore((s) => s.setSpeed);

  // Victory Confetti trigger
  useEffect(() => {
    if (scenarioStatus === 'won') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#00F5A0', '#9B5CFF', '#FFB020'],
      });
    }
  }, [scenarioStatus]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRunning();
      } else if (e.key === 's' || e.key === 'S') {
        step();
      } else if (e.key === '1') {
        setSpeed(0.5);
      } else if (e.key === '2') {
        setSpeed(1.0);
      } else if (e.key === '3') {
        setSpeed(2.0);
      } else if (e.key === '4') {
        setSpeed(4.0);
      } else if (e.key === '8') {
        setSpeed(8.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRunning, step, setSpeed]);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen />;
      case 'simulation':
        return <MainSimulationScreen />;
      case 'tasks':
        return <TaskBoardScreen />;
      case 'three_d':
        return <Warehouse3DScreen />;
      case 'pane_view':
        return <PaneViewScreen />;
      case 'robots':
        return <FleetScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'charging_stations':
        return <ChargingStationsScreen />;
      case 'delivery_nodes':
        return <DeliveryNodesScreen />;
      case 'scenarios':
        return <ScenarioScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'datastructures':
        return <DataStructuresScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <MainSimulationScreen />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-warehouse-darker text-gray-100 overflow-hidden font-sans">
      {/* Top Header */}
      <TopNavBar />

      {/* Main Container: Left Nav + Active View */}
      <div className="flex-1 flex overflow-hidden">
        <LeftNavSidebar />
        <main className="flex-1 flex overflow-hidden relative">
          {renderScreen()}
        </main>
      </div>

      {/* Global Modals */}
      {isEmergencyModalOpen && <EmergencyModal />}
      {isCreateTaskModalOpen && <CreateTaskModal />}
    </div>
  );
}

export default App;
