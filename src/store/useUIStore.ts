import { create } from 'zustand';

export type ScreenType =
  | 'home'
  | 'simulation'
  | 'tasks'
  | 'three_d'
  | 'pane_view'
  | 'robots'
  | 'inventory'
  | 'charging_stations'
  | 'delivery_nodes'
  | 'scenarios'
  | 'analytics'
  | 'datastructures'
  | 'settings';

export type CameraMode = 'orbit' | 'top_down' | 'follow_robot';
export type PaneLayoutMode = 'split_horizontal' | 'split_vertical' | 'pip';

export interface MapLayers {
  robots: boolean;
  paths: boolean;
  shelves: boolean;
  zones: boolean;
  obstacles: boolean;
  deliveryNodes: boolean;
  chargingStations: boolean;
  grid: boolean;
  restricted: boolean;
  heatmap: boolean;
  robotLabels: boolean;
}

interface UIStoreState {
  activeScreen: ScreenType;
  selectedRobotId: string | null;
  selectedTaskId: string | null;
  selectedStationId: string | null;
  selectedShelfId: string | null;
  cameraMode: CameraMode;
  viewMode: '2d' | '3d' | 'isometric';
  paneLayout: PaneLayoutMode;

  layers: MapLayers;

  isInspectorOpen: boolean;
  isBottomPanelOpen: boolean;
  isObstacleMode: boolean;
  isDebugMode: boolean;
  showPathDebug: boolean;
  isViewportMaximized: boolean;
  isFreeView: boolean;
  isEmergencyModalOpen: boolean;
  isCreateTaskModalOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  isAlgorithmInspectorOpen: boolean;
  activeFrontierNodes: { x: number; y: number }[] | null;
  customInspectedRoute: { x: number; y: number }[] | null;

  setActiveScreen: (screen: ScreenType) => void;
  selectRobot: (id: string | null) => void;
  selectTask: (id: string | null) => void;
  selectStation: (id: string | null) => void;
  selectShelf: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setViewMode: (mode: '2d' | '3d' | 'isometric') => void;
  setPaneLayout: (layout: PaneLayoutMode) => void;
  toggleLayer: (layer: keyof MapLayers) => void;
  toggleInspector: () => void;
  toggleBottomPanel: () => void;
  toggleObstacleMode: () => void;
  toggleDebugMode: () => void;
  togglePathDebug: () => void;
  toggleViewportMaximized: () => void;
  toggleFreeView: () => void;
  setEmergencyModalOpen: (open: boolean) => void;
  setCreateTaskModalOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setAlgorithmInspectorOpen: (open: boolean) => void;
  toggleAlgorithmInspector: () => void;
  setActiveFrontierNodes: (nodes: { x: number; y: number }[] | null) => void;
  setCustomInspectedRoute: (route: { x: number; y: number }[] | null) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  activeScreen: 'simulation',
  selectedRobotId: null,
  selectedTaskId: null,
  selectedStationId: null,
  selectedShelfId: null,
  cameraMode: 'top_down',
  viewMode: '2d',
  paneLayout: 'split_horizontal',

  layers: {
    robots: true,
    paths: true,
    shelves: true,
    zones: true,
    obstacles: true,
    deliveryNodes: true,
    chargingStations: true,
    grid: true,
    restricted: true,
    heatmap: false,
    robotLabels: true,
  },

  isInspectorOpen: true,
  isBottomPanelOpen: true,
  isObstacleMode: false,
  isDebugMode: false,
  showPathDebug: false,
  isViewportMaximized: false,
  isFreeView: false,
  isEmergencyModalOpen: false,
  isCreateTaskModalOpen: false,
  isKeyboardShortcutsOpen: false,
  isAlgorithmInspectorOpen: false,
  activeFrontierNodes: null,
  customInspectedRoute: null,

  setActiveScreen: (screen) => set({ activeScreen: screen }),
  selectRobot: (id) =>
    set({
      selectedRobotId: id,
      selectedTaskId: null,
      selectedStationId: null,
      selectedShelfId: null,
      isInspectorOpen: id !== null,
    }),
  selectTask: (id) =>
    set({
      selectedTaskId: id,
      selectedRobotId: null,
      selectedStationId: null,
      selectedShelfId: null,
      isInspectorOpen: id !== null,
    }),
  selectStation: (id) =>
    set({
      selectedStationId: id,
      selectedRobotId: null,
      selectedTaskId: null,
      selectedShelfId: null,
      isInspectorOpen: id !== null,
    }),
  selectShelf: (id) =>
    set({
      selectedShelfId: id,
      selectedRobotId: null,
      selectedTaskId: null,
      selectedStationId: null,
      isInspectorOpen: id !== null,
    }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setPaneLayout: (layout) => set({ paneLayout: layout }),
  toggleLayer: (layer) =>
    set((s) => ({
      layers: {
        ...s.layers,
        [layer]: !s.layers[layer],
      },
    })),
  toggleInspector: () => set((s) => ({ isInspectorOpen: !s.isInspectorOpen })),
  toggleBottomPanel: () => set((s) => ({ isBottomPanelOpen: !s.isBottomPanelOpen })),
  toggleObstacleMode: () => set((s) => ({ isObstacleMode: !s.isObstacleMode })),
  toggleDebugMode: () => set((s) => ({ isDebugMode: !s.isDebugMode })),
  togglePathDebug: () => set((s) => ({ showPathDebug: !s.showPathDebug })),
  toggleViewportMaximized: () => set((s) => ({ isViewportMaximized: !s.isViewportMaximized })),
  toggleFreeView: () => set((s) => ({ isFreeView: !s.isFreeView })),
  setEmergencyModalOpen: (open) => set({ isEmergencyModalOpen: open }),
  setCreateTaskModalOpen: (open) => set({ isCreateTaskModalOpen: open }),
  setKeyboardShortcutsOpen: (open) => set({ isKeyboardShortcutsOpen: open }),
  setAlgorithmInspectorOpen: (open) => set({ isAlgorithmInspectorOpen: open }),
  toggleAlgorithmInspector: () => set((s) => ({ isAlgorithmInspectorOpen: !s.isAlgorithmInspectorOpen })),
  setActiveFrontierNodes: (nodes) => set({ activeFrontierNodes: nodes }),
  setCustomInspectedRoute: (route) => set({ customInspectedRoute: route }),
}));
