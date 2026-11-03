import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Layers,
  ShieldAlert,
  Boxes,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore, MapLayers } from '../../store/useUIStore';
import { Robot, WarehouseNode, ChargingStation, DeliveryNode, WaitingNode, GridCoord } from '../../core/types';

export const Warehouse2DCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const engine = useSimulationStore((s) => s.engine);
  const syncState = useSimulationStore((s) => s.syncState);
  const config = useSimulationStore((s) => s.config);

  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const selectedShelfId = useUIStore((s) => s.selectedShelfId);
  const isObstacleMode = useUIStore((s) => s.isObstacleMode);
  const isDebugMode = useUIStore((s) => s.isDebugMode);
  const showPathDebug = useUIStore((s) => s.showPathDebug);
  const activeFrontierNodes = useUIStore((s) => s.activeFrontierNodes);
  const customInspectedRoute = useUIStore((s) => s.customInspectedRoute);
  const isFreeView = useUIStore((s) => s.isFreeView);
  const layers = useUIStore((s) => s.layers);
  const viewMode = useUIStore((s) => s.viewMode);
  const selectRobot = useUIStore((s) => s.selectRobot);
  const selectShelf = useUIStore((s) => s.selectShelf);
  const selectStation = useUIStore((s) => s.selectStation);
  const toggleLayer = useUIStore((s) => s.toggleLayer);
  const toggleObstacleMode = useUIStore((s) => s.toggleObstacleMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [hoveredNode, setHoveredNode] = useState<WarehouseNode | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{
    type: 'robot' | 'shelf' | 'charging' | 'delivery' | 'waiting' | 'node';
    robot?: Robot;
    shelf?: WarehouseNode;
    product?: any;
    station?: ChargingStation | DeliveryNode;
    waitingBay?: WaitingNode;
    node?: WarehouseNode;
    screenPos: { x: number; y: number };
  } | null>(null);
  const animTimeRef = useRef<number>(0);
  const handleResetView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    const gridPixelWidth = config.width * 50;
    const gridPixelHeight = config.length * 50;

    const scale = Math.min((clientWidth - 60) / gridPixelWidth, (clientHeight - 60) / gridPixelHeight, 1.35);
    setZoom(Math.max(0.6, scale));
    setPan({
      x: (clientWidth - gridPixelWidth * scale) / 2,
      y: (clientHeight - gridPixelHeight * scale) / 2,
    });
  }, [config.width, config.length]);

  useEffect(() => {
    handleResetView();
  }, [handleResetView]);
  const handleFocusRobot = useCallback(() => {
    if (!selectedRobotId || !containerRef.current) return;
    const robot = engine.robotMap.get(selectedRobotId);
    if (!robot) return;

    const cellSize = 50 * zoom;
    const targetPixelX = robot.position.x * cellSize;
    const targetPixelY = robot.position.z * cellSize;

    const { clientWidth, clientHeight } = containerRef.current;
    setPan({
      x: clientWidth / 2 - targetPixelX,
      y: clientHeight / 2 - targetPixelY,
    });
  }, [selectedRobotId, engine, zoom]);
  useEffect(() => {
    if (!isFreeView) return;

    const handleFreeViewKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const mult = e.shiftKey ? 2 : e.ctrlKey ? 0.5 : 1;
      const step = 30 * mult;

      if (e.key === 'w' || e.key === 'W') {
        setPan((p) => ({ ...p, y: p.y + step }));
      } else if (e.key === 's' || e.key === 'S') {
        setPan((p) => ({ ...p, y: p.y - step }));
      } else if (e.key === 'a' || e.key === 'A') {
        setPan((p) => ({ ...p, x: p.x + step }));
      } else if (e.key === 'd' || e.key === 'D') {
        setPan((p) => ({ ...p, x: p.x - step }));
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener('keydown', handleFreeViewKey);
    return () => window.removeEventListener('keydown', handleFreeViewKey);
  }, [isFreeView, handleResetView]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();
    let syncThrottle = 0;

    const render = (currentTime: number) => {
      try {
        animationId = requestAnimationFrame(render);
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        animTimeRef.current += dt;
        if (containerRef.current) {
          const dpr = window.devicePixelRatio || 1;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          if (w > 0 && h > 0 && (canvas.width !== w * dpr || canvas.height !== h * dpr)) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
          }
        }

        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(dpr, dpr);

        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        ctx.fillStyle = '#050914';
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        const cellSize = 50;
        if (layers.grid) {
          ctx.strokeStyle = '#10243E';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= config.width; x++) {
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, config.length * cellSize);
          }
          for (let y = 0; y <= config.length; y++) {
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(config.width * cellSize, y * cellSize);
          }
          ctx.stroke();
        }
        if (layers.zones) {
          drawZones(ctx, config.width, config.length, cellSize);
          drawFloorMarkings(ctx, config.width, config.length, cellSize, animTimeRef.current);
        }
        if (layers.chargingStations) {
          drawChargingStations(ctx, engine.chargingStations, cellSize, animTimeRef.current);
        }
        drawWaitingBays(ctx, engine.waitingNodes, cellSize, animTimeRef.current);
        drawStagingBays(ctx, cellSize, animTimeRef.current);
        if (layers.deliveryNodes) {
          drawDeliveryNodes(ctx, engine.deliveryNodes, cellSize, animTimeRef.current);
        }
        if (layers.shelves) {
          drawShelves(ctx, engine.shelfNodes, cellSize, selectedShelfId, animTimeRef.current);
        
        if (layers.obstacles) {
          drawObstacles(ctx, engine.nodes, cellSize, animTimeRef.current);
        }
        if (layers.heatmap) {
          drawHeatmap(ctx, engine.collisionAvoidance.getNodeVisits(), cellSize);
        }
        if (layers.restricted) {
          drawRestricted(ctx, engine.collisionAvoidance.getReservedNodesSet(), cellSize, animTimeRef.current);
        }
        if (layers.paths) {
          drawPaths(ctx, engine.robotMap.values(), cellSize, animTimeRef.current);
        }
        if (layers.robots) {
          drawRobots(ctx, engine.robotMap.values(), cellSize, selectedRobotId, layers.robotLabels, animTimeRef.current);
        }
        drawDeadlockOverlay(ctx, cellSize, animTimeRef.current);

        ctx.restore(); 
        ctx.restore(); 
      } catch (err) {
        console.error('2D Canvas Render Error:', err);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [engine, syncState, pan, zoom, layers, selectedRobotId, selectedShelfId, config.width, config.length]);
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  };

  const drawZones = (ctx: CanvasRenderingContext2D, width: number, length: number, cellSize: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 176, 32, 0.04)';
    ctx.strokeStyle = 'rgba(255, 176, 32, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.fillRect(3.5 * cellSize, 0, 13 * cellSize, 2 * cellSize);
    ctx.strokeRect(3.5 * cellSize, 0, 13 * cellSize, 2 * cellSize);
    ctx.setLineDash([]);

    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255, 176, 32, 0.85)';
    ctx.fillText('⚡ RESTRICTED DOCKING ZONE (AUTHORIZED AGVS ONLY)', 4 * cellSize, 14);

    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255, 176, 32, 0.6)';
    ctx.fillText('⬇ DEDICATED APPROACH LANE (EXCLUDED FROM NORMAL A* ROUTING)', 4 * cellSize, 1 * cellSize + 14);
    ctx.fillStyle = 'rgba(155, 92, 255, 0.05)';
    ctx.strokeStyle = 'rgba(155, 92, 255, 0.3)';
    ctx.strokeRect(0, 0, 2 * cellSize, cellSize);
    ctx.strokeRect(18 * cellSize, 0, 2 * cellSize, cellSize);
    ctx.restore();
    ctx.font = 'bold 8.5px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.fillText('➡ NORTH CROSSWAY (BI-DIRECTIONAL TRAFFIC NETWORK)', 2 * cellSize, 2 * cellSize + 14);
    ctx.fillStyle = 'rgba(0, 245, 160, 0.05)';
    ctx.strokeStyle = 'rgba(0, 245, 160, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(0, (length - 1) * cellSize, width * cellSize, cellSize);
    ctx.strokeRect(0, (length - 1) * cellSize, width * cellSize, cellSize);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 245, 160, 0.7)';
    ctx.fillText('📦 DISPATCH & DELIVERY DOCKS [D-01 - D-03]', 10, (length - 1) * cellSize + 15);
    ctx.fillStyle = 'rgba(38, 123, 255, 0.02)';
    ctx.strokeStyle = 'rgba(38, 123, 255, 0.2)';
    ctx.strokeRect(cellSize * 0.5, cellSize * 3.5, (width - 1) * cellSize, (length - 7) * cellSize);
  };

  const drawFloorMarkings = (
    ctx: CanvasRenderingContext2D,
    width: number,
    length: number,
    cellSize: number,
    time: number
  ) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    const horizBorders = [2, 6, 10, 14, 18];
    for (const row of horizBorders) {
      if (row < length) {
        ctx.beginPath();
        ctx.moveTo(1 * cellSize, row * cellSize);
        ctx.lineTo((width - 1) * cellSize, row * cellSize);
        ctx.stroke();
      }
    }
    const vertBorders = [1, 10, 19];
    for (const col of vertBorders) {
      if (col < width) {
        ctx.beginPath();
        ctx.moveTo(col * cellSize, 1 * cellSize);
        ctx.lineTo(col * cellSize, (length - 1) * cellSize);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.4;

    for (const node of engine.nodes) {
      if (!node.trafficDirection || node.trafficDirection === 'BIDIRECTIONAL' || node.trafficDirection === 'ANY' || node.isIntersection) {
        continue;
      }
      const cx = node.x * cellSize + cellSize / 2;
      const cy = node.y * cellSize + cellSize / 2;

      ctx.beginPath();
      if (node.trafficDirection === 'EAST') {
        ctx.moveTo(cx - 4, cy - 3.5);
        ctx.lineTo(cx + 3, cy);
        ctx.lineTo(cx - 4, cy + 3.5);
      } else if (node.trafficDirection === 'WEST') {
        ctx.moveTo(cx + 4, cy - 3.5);
        ctx.lineTo(cx - 3, cy);
        ctx.lineTo(cx + 4, cy + 3.5);
      } else if (node.trafficDirection === 'SOUTH') {
        ctx.moveTo(cx - 3.5, cy - 4);
        ctx.lineTo(cx, cy + 3);
        ctx.lineTo(cx + 3.5, cy - 4);
      } else if (node.trafficDirection === 'NORTH') {
        ctx.moveTo(cx - 3.5, cy + 4);
        ctx.lineTo(cx, cy - 3);
        ctx.lineTo(cx + 3.5, cy + 4);
      }
      ctx.stroke();
    }
    ctx.restore();
    const intersections = engine.trafficManager ? engine.trafficManager.getAllIntersections() : [];
    ctx.save();
    for (const zone of intersections) {
      const minX = Math.min(...zone.coords.map((c) => c.x)) * cellSize;
      const minY = Math.min(...zone.coords.map((c) => c.y)) * cellSize;
      const isReserved = !!zone.reservedByRobotId;
      ctx.strokeStyle = isReserved ? 'rgba(255, 176, 32, 0.5)' : 'rgba(0, 229, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(minX + 2, minY + 2, 2 * cellSize - 4, 2 * cellSize - 4);
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  const drawChargingStations = (
    ctx: CanvasRenderingContext2D,
    stations: ChargingStation[],
    cellSize: number,
    time: number
  ) => {
    const bufferCols = [3, 5, 7, 9, 11, 13, 15, 17];
    ctx.save();
    for (const bx of bufferCols) {
      const bpx = bx * cellSize;
      const bpy = 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(bpx + 3, bpy + 3, cellSize - 6, cellSize - 6);
      ctx.setLineDash([]);

      ctx.font = '7.5px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BUFFER', bpx + cellSize / 2, bpy + cellSize / 2);
    }
    ctx.restore();
    for (const station of stations) {
      const px = station.coord.x * cellSize;
      const py = station.coord.y * cellSize;

      const dockState = station.dockState || (station.isOccupied ? 'OCCUPIED' : 'AVAILABLE');
      let statusColor = '#22C55E'; 
      if (dockState === 'CHARGING') {
        statusColor = '#EAB308';
      } else if (dockState === 'OCCUPIED' || station.isOccupied) {
        statusColor = '#EF4444'; 
      }
      ctx.fillStyle = station.isOccupied ? 'rgba(16, 42, 69, 0.9)' : 'rgba(11, 30, 50, 0.85)';
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawRoundedRect(ctx, px + 3, py + 3, cellSize - 6, cellSize - 6, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = statusColor;
      ctx.fillRect(px + cellSize / 2 - 8, py + 3, 16, 3);
      const pulse = (Math.sin(time * 3 + station.coord.x) + 1) / 2;
      ctx.strokeStyle = statusColor;
      ctx.globalAlpha = 0.3 + pulse * 0.4;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px + cellSize / 2, py + cellSize / 2, 12 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = statusColor;
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(px + cellSize - 8, py + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = 'bold 8.5px JetBrains Mono, monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(station.id, px + cellSize / 2, py + cellSize / 2 - 5);
      const assigned = station.assignedRobotId || (station.occupyingRobotId ? station.occupyingRobotId : '');
      if (assigned) {
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.fillStyle = statusColor;
        ctx.fillText(assigned, px + cellSize / 2, py + cellSize / 2 + 7);
      }
      if (station.queue && station.queue.length > 0) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(px + 4, py + cellSize - 11, 24, 8);
        ctx.font = 'bold 7px JetBrains Mono, monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Q:${station.queue.length}`, px + 16, py + cellSize - 7);
      }
    }
  };

  const drawWaitingBays = (
    ctx: CanvasRenderingContext2D,
    nodes: WaitingNode[],
    cellSize: number,
    time: number
  ) => {
    for (const node of nodes) {
      const px = node.coord.x * cellSize;
      const py = node.coord.y * cellSize;
      ctx.fillStyle = node.isOccupied ? 'rgba(155, 92, 255, 0.15)' : 'rgba(155, 92, 255, 0.05)';
      ctx.strokeStyle = node.isOccupied ? '#9B5CFF' : 'rgba(155, 92, 255, 0.6)';
      ctx.lineWidth = node.isOccupied ? 2 : 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      drawRoundedRect(ctx, px + 5, py + 5, cellSize - 10, cellSize - 10, 6);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      const pulse = (Math.sin(time * 2.0 + node.coord.x) + 1) / 2;
      ctx.fillStyle = node.isOccupied ? '#9B5CFF' : `rgba(155, 92, 255, ${0.4 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(px + cellSize / 2, py + cellSize / 2 - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 8.5px JetBrains Mono, monospace';
      ctx.fillStyle = '#C084FC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, px + cellSize / 2, py + cellSize / 2 + 6);
    }
  };

  const drawStagingBays = (
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    time: number
  ) => {
    const resources = engine.shelfAccessManager.getAllShelfResources();
    for (const res of resources.values()) {
      if (res.waitingQueue.length === 0 && res.status !== 'WAITING') {
        continue;
      }

      const pulse = (Math.sin(time * 3) + 1) / 2;

      for (let i = 0; i < res.stagingCoords.length; i++) {
        const coord = res.stagingCoords[i];
        const px = coord.x * cellSize;
        const py = coord.y * cellSize;

        ctx.save();
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        drawRoundedRect(ctx, px + 6, py + 6, cellSize - 12, cellSize - 12, 6);
        ctx.stroke();

        ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
        ctx.fill();
        ctx.setLineDash([]);

        ctx.font = 'bold 7.5px JetBrains Mono, monospace';
        ctx.fillStyle = '#C084FC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`STAGE ${i + 1}`, px + cellSize / 2, py + cellSize / 2);
        ctx.restore();
      }
    }
  };

  const drawDeliveryNodes = (
    ctx: CanvasRenderingContext2D,
    nodes: DeliveryNode[],
    cellSize: number,
    time: number
  ) => {
    for (const node of nodes) {
      const px = node.coord.x * cellSize;
      const py = node.coord.y * cellSize;
      ctx.fillStyle = '#07241D';
      ctx.strokeStyle = '#00F5A0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawRoundedRect(ctx, px + 4, py + 4, cellSize - 8, cellSize - 8, 8);
      ctx.fill();
      ctx.stroke();
      const pulse = (Math.sin(time * 2.5 + node.coord.x) + 1) / 2;
      ctx.strokeStyle = `rgba(0, 245, 160, ${0.3 + pulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px + cellSize / 2, py + cellSize / 2, 14 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#00F5A0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, px + cellSize / 2, py + cellSize / 2 - 4);

      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillStyle = '#A7F3D0';
      ctx.fillText(`${node.completedDeliveries} pk`, px + cellSize / 2, py + cellSize / 2 + 7);
    }
  };

  const drawShelves = (
    ctx: CanvasRenderingContext2D,
    shelves: WarehouseNode[],
    cellSize: number,
    selectedShelf: string | null,
    time: number
  ) => {
    const boxColors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4'];

    for (const shelf of shelves) {
      const px = shelf.x * cellSize;
      const py = shelf.y * cellSize;
      const isSelected = shelf.shelfId === selectedShelf;
      ctx.fillStyle = isSelected ? '#1A334E' : '#0B1726';
      ctx.strokeStyle = isSelected ? '#00E5FF' : '#334155';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      drawRoundedRect(ctx, px + 4, py + 4, cellSize - 8, cellSize - 8, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isSelected ? '#00E5FF' : '#475569';
      ctx.fillRect(px + 4, py + 4, 3, cellSize - 8);
      ctx.fillRect(px + cellSize - 7, py + 4, 3, cellSize - 8);
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(px + 7, py + cellSize / 2 + 3, cellSize - 14, 2.5);
      ctx.fillRect(px + 7, py + cellSize / 2 - 9, cellSize - 14, 2.5);
      const invLevel = shelf.shelfInfo?.inventoryLevel ?? 12;
      const maxCap = shelf.shelfInfo?.maxCapacity ?? 50;
      const ratio = Math.min(1, invLevel / maxCap);
      const boxCount = Math.max(1, Math.min(6, Math.ceil(ratio * 6)));

      for (let b = 0; b < boxCount; b++) {
        const col = boxColors[(shelf.x + shelf.y + b) % boxColors.length];
        const isUpper = b >= 3;
        const colIdx = b % 3;
        const bx = px + 8 + colIdx * 11;
        const by = isUpper ? py + cellSize / 2 - 16 : py + cellSize / 2 - 4;

        ctx.fillStyle = col;
        ctx.fillRect(bx, by, 9, 7);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bx, by, 9, 7);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(bx + 3.5, by, 2, 7);
      }
      ctx.font = 'bold 8.5px JetBrains Mono, monospace';
      const shelfText = shelf.shelfId || 'RACK';
      const textMetrics = ctx.measureText(shelfText);
      const textW = textMetrics.width;
      const pillW = textW + 6;
      const pillH = 11;
      const pillX = px + cellSize / 2 - pillW / 2;
      const pillY = py + cellSize - 15;

      ctx.fillStyle = isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(11, 23, 38, 0.9)';
      ctx.fillRect(pillX, pillY, pillW, pillH);
      ctx.strokeStyle = isSelected ? '#00E5FF' : '#334155';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(pillX, pillY, pillW, pillH);

      ctx.fillStyle = isSelected ? '#00E5FF' : '#F1F5F9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shelfText, px + cellSize / 2, py + cellSize - 9.5);

      const resource = engine.shelfAccessManager.getShelfResource(shelf.shelfId || '');
      const status = resource?.status || 'AVAILABLE';

      let statusColor = '#10B981'; 
      if (status === 'RESERVED') {
        statusColor = '#F59E0B'; 
      } else if (status === 'OCCUPIED') {
        statusColor = '#EF4444'; 
      } else if (status === 'WAITING') {
        statusColor = '#A855F7'; 
      
      const dotX = px + cellSize - 9;
      const dotY = py + 9;

      if (status === 'OCCUPIED' || status === 'WAITING' || status === 'RESERVED') {
        const pulse = (Math.sin(time * 4 + shelf.x) + 1) / 2;
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4 + pulse * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawObstacles = (
    ctx: CanvasRenderingContext2D,
    nodes: WarehouseNode[],
    cellSize: number,
    time: number
  ) => {
    const blockedAisles = nodes.filter((n) => n.type === 'aisle' && n.isBlocked);

    for (const node of blockedAisles) {
      const px = node.x * cellSize;
      const py = node.y * cellSize;

      ctx.save();
      ctx.beginPath();
      drawRoundedRect(ctx, px + 2, py + 2, cellSize - 4, cellSize - 4, 6);
      ctx.clip();
      ctx.fillStyle = '#2A1208';
      ctx.fillRect(px, py, cellSize, cellSize);
      ctx.strokeStyle = '#FFB020';
      ctx.lineWidth = 4;
      const offset = (time * 20) % 16;
      for (let i = -cellSize; i < cellSize * 2; i += 12) {
        ctx.beginPath();
        ctx.moveTo(px + i + offset, py);
        ctx.lineTo(px + i - cellSize + offset, py + cellSize);
        ctx.stroke();
      }

      ctx.restore();
      ctx.strokeStyle = '#FF3D71';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️', px + cellSize / 2, py + cellSize / 2);
    }
  };

  const drawHeatmap = (
    ctx: CanvasRenderingContext2D,
    nodeVisits: Map<string, number>,
    cellSize: number
  ) => {
    let maxVisits = 1;
    for (const v of nodeVisits.values()) {
      if (v > maxVisits) maxVisits = v;
    }

    for (const [key, visits] of nodeVisits.entries()) {
      const [x, y] = key.split(',').map(Number);
      const px = x * cellSize;
      const py = y * cellSize;
      const intensity = Math.min(1, visits / maxVisits);

      let color = `rgba(38, 123, 255, ${0.12 + intensity * 0.35})`;
      if (intensity > 0.6) {
        color = `rgba(255, 61, 113, ${0.22 + intensity * 0.4})`;
      } else if (intensity > 0.25) {
        color = `rgba(255, 176, 32, ${0.18 + intensity * 0.35})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      if (intensity > 0.15) {
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${visits}`, px + cellSize - 3, py + cellSize - 3);
      }
    }
  };

  const drawRestricted = (
    ctx: CanvasRenderingContext2D,
    reservedNodes: Set<string>,
    cellSize: number,
    time: number
  ) => {
    for (const key of reservedNodes) {
      const [x, y] = key.split(',').map(Number);
      const px = x * cellSize;
      const py = y * cellSize;

      ctx.strokeStyle = 'rgba(240, 82, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(240, 82, 255, 0.08)';
      ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
    }
  };

  const drawPaths = (
    ctx: CanvasRenderingContext2D,
    robots: Robot[],
    cellSize: number,
    time: number
  ) => {
    for (const robot of robots) {
      if (!robot.completedPaths || robot.completedPaths.length === 0) continue;
      for (const comp of robot.completedPaths) {
        const age = time - comp.completedAt;
        if (age > 10 || comp.points.length < 2) continue;
        const opacity = Math.max(0, 1 - age / 10) * 0.45;

        ctx.save();
        ctx.strokeStyle = `rgba(156, 163, 175, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(comp.points[0].x * cellSize + cellSize / 2, comp.points[0].y * cellSize + cellSize / 2);
        for (let i = 1; i < comp.points.length; i++) {
          ctx.lineTo(comp.points[i].x * cellSize + cellSize / 2, comp.points[i].y * cellSize + cellSize / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
    const activeTasks = engine.taskMap.values().filter((t) => t.status === 'allocated' || t.status === 'in_progress');
    for (const task of activeTasks) {
      if (task.assignedRobotId) {
        const robot = engine.robotMap.get(task.assignedRobotId);
        if (robot && (task.status === 'allocated' || robot.state === 'staged')) {
          const startPt = robot.isCarrying ? task.pickupCoord : { x: robot.gridPosition.x, y: robot.gridPosition.y };
          const endPt = robot.isCarrying ? task.destinationCoord : task.pickupCoord;

          ctx.save();
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -time * 15;
          ctx.beginPath();
          ctx.moveTo(startPt.x * cellSize + cellSize / 2, startPt.y * cellSize + cellSize / 2);
          ctx.lineTo(endPt.x * cellSize + cellSize / 2, endPt.y * cellSize + cellSize / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#FBBF24';
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(startPt.x * cellSize + cellSize / 2, startPt.y * cellSize + cellSize / 2, 2.5, 0, Math.PI * 2);
          ctx.arc(endPt.x * cellSize + cellSize / 2, endPt.y * cellSize + cellSize / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.restore();
        }
      }
    }
    for (const robot of robots) {
      if (robot.currentRoute.length <= 1 || robot.state === 'breakdown' || robot.state === 'charging') {
        continue;
      }

      const points: { x: number; y: number }[] = [];
      points.push({
        x: robot.position.x * cellSize + cellSize / 2,
        y: robot.position.z * cellSize + cellSize / 2,
      });

      for (let i = robot.currentRouteIndex; i < robot.currentRoute.length; i++) {
        const pt = robot.currentRoute[i];
        points.push({
          x: pt.x * cellSize + cellSize / 2,
          y: pt.y * cellSize + cellSize / 2,
        });
      }

      ctx.save();
    
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(74, 222, 128, 0.6)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#4ADE80';
      ctx.globalAlpha = 0.6;
      for (let i = 1; i < points.length; i++) {
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      const totalPoints = points.length;
      if (totalPoints > 1) {
        const t = (time * 1.8) % (totalPoints - 1);
        const idx = Math.floor(t);
        const frac = t - idx;
        const p1 = points[idx];
        const p2 = points[idx + 1];

        const particleX = p1.x + (p2.x - p1.x) * frac;
        const particleY = p1.y + (p2.y - p1.y) * frac;

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#4ADE80';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (showPathDebug || isDebugMode) {
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillStyle = '#A7F3D0';
        for (let i = robot.currentRouteIndex; i < robot.currentRoute.length; i++) {
          const pt = robot.currentRoute[i];
          ctx.fillText(`(${pt.x},${pt.y})`, pt.x * cellSize + cellSize / 2 + 4, pt.y * cellSize + cellSize / 2 - 4);
        }
        const lastPt = robot.currentRoute[robot.currentRoute.length - 1];
        if (lastPt) {
          ctx.fillStyle = '#FDE047';
          ctx.fillText(
            `WPs:${robot.currentRoute.length - robot.currentRouteIndex} | ${robot.navigationMode || 'A*'}`,
            lastPt.x * cellSize + 2,
            lastPt.y * cellSize + cellSize - 2
          );
        }
      }

      ctx.restore();
    }
    if (activeFrontierNodes && activeFrontierNodes.length > 0) {
      ctx.save();
      for (const node of activeFrontierNodes) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.fillRect(node.x * cellSize + 2, node.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(node.x * cellSize + 2, node.y * cellSize + 2, cellSize - 4, cellSize - 4);
      }
      ctx.restore();
    }

    if (customInspectedRoute && customInspectedRoute.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(
        customInspectedRoute[0].x * cellSize + cellSize / 2,
        customInspectedRoute[0].y * cellSize + cellSize / 2
      );
      for (let i = 1; i < customInspectedRoute.length; i++) {
        ctx.lineTo(
          customInspectedRoute[i].x * cellSize + cellSize / 2,
          customInspectedRoute[i].y * cellSize + cellSize / 2
        );
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < customInspectedRoute.length; i++) {
        const pt = customInspectedRoute[i];
        ctx.beginPath();
        ctx.arc(pt.x * cellSize + cellSize / 2, pt.y * cellSize + cellSize / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const drawRobots = (
    ctx: CanvasRenderingContext2D,
    robots: Robot[],
    cellSize: number,
    selectedId: string | null,
    showLabels: boolean,
    time: number
  ) => {
    for (const robot of robots) {
      const px = robot.position.x * cellSize + cellSize / 2;
      const py = robot.position.z * cellSize + cellSize / 2;
      const isSelected = robot.id === selectedId;

      ctx.save();
      ctx.translate(px, py);
      let statusColor = '#00E5FF';
      if (robot.state === 'breakdown') statusColor = '#FF3D71';
      else if (robot.state === 'charging') statusColor = '#FFB020';
      else if (robot.state === 'backing_off' || robot.state === 'yielding') statusColor = '#FFB020';
      else if (robot.state === 'recovering_deadlock') statusColor = '#F97316';
      else if (robot.state === 'staged') statusColor = '#A855F7';
      else if (robot.state === 'picking_up') statusColor = '#9B5CFF';
      else if (robot.state === 'delivering') statusColor = '#00F5A0';
      else if (robot.cargoCount > 0) statusColor = '#FFB020';
      else if (robot.state === 'idle') statusColor = '#267BFF';

      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = isSelected ? 14 : 6;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (isSelected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 23, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.rotate(robot.heading);
      ctx.fillStyle = '#0F1E32';
      ctx.strokeStyle = robot.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      drawRoundedRect(ctx, -14, -14, 28, 28, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = robot.color;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(-5, 5);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fill();
      if (robot.cargoCount > 0) {
        const boxSize = 6;
        for (let b = 0; b < robot.cargoCount; b++) {
          ctx.fillStyle = '#FFB020';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.fillRect(-9 + b * 7, -9, boxSize, boxSize);
          ctx.strokeRect(-9 + b * 7, -9, boxSize, boxSize);
        }
      }
      if (robot.state === 'breakdown') {
        const pulse = (Math.sin(time * 6) + 1) / 2;
        ctx.fillStyle = `rgba(255, 61, 113, ${0.7 + pulse * 0.3})`;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✖', 0, 0);
      }

      ctx.restore(); 
      if (showLabels) {
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#E7F4FF';
        ctx.textAlign = 'center';
        ctx.fillText(robot.name, px, py + 30);
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillStyle = robot.battery < 25 ? '#FF3D71' : '#7F9BB8';
        ctx.fillText(`${robot.battery.toFixed(0)}%`, px, py + 39);
        if (robot.isTemporaryOppositeLane) {
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('⚡ OVERTAKING', px, py + 48);
        } else if (robot.queueStatus && robot.queueSlotIndex !== undefined) {
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillStyle = robot.queueSlotIndex === 0 ? '#10B981' : '#A855F7';
          ctx.fillText(robot.queueSlotIndex === 0 ? 'Q: FRONT' : `Q: POS ${robot.queueSlotIndex}`, px, py + 48);
        } else if (robot.state === 'backing_off') {
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillStyle = '#FFB020';
          ctx.fillText('BACKING OFF', px, py + 48);
        } else if (robot.state === 'yielding') {
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillStyle = '#FFB020';
          ctx.fillText('YIELDING', px, py + 48);
        } else if (robot.state === 'staged') {
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillStyle = '#A855F7';
          ctx.fillText(`STAGED [${robot.stagedShelfId || 'SHELF'}]`, px, py + 48);
        } else if (robot.state === 'recovering_deadlock') {
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillStyle = '#F97316';
          ctx.fillText('DEADLOCK BACKTRACK', px, py + 48);
        }
        if (robot.effectivePriority !== undefined && robot.effectivePriority > 0) {
          ctx.font = '7.5px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(`P:${robot.effectivePriority}`, px, py + 57);
        }
      }
    }
  };

  const drawDeadlockOverlay = (
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    time: number
  ) => {
    const stats = engine.deadlockDetector.getStats();
    if (stats.activeDeadlocks.length === 0) return;

    for (const deadlock of stats.activeDeadlocks) {
      const robots = deadlock.robotIds
        .map((id) => engine.robotMap.get(id))
        .filter((r): r is Robot => r !== undefined);

      if (robots.length < 2) continue;
      ctx.save();
      const pulse = (Math.sin(time * 5) + 1) / 2;
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      const first = robots[0];
      ctx.moveTo(first.position.x * cellSize + cellSize / 2, first.position.z * cellSize + cellSize / 2);

      for (let i = 1; i < robots.length; i++) {
        const r = robots[i];
        ctx.lineTo(r.position.x * cellSize + cellSize / 2, r.position.z * cellSize + cellSize / 2);
      }
      ctx.lineTo(first.position.x * cellSize + cellSize / 2, first.position.z * cellSize + cellSize / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const victim = engine.robotMap.get(deadlock.victimRobotId);
      if (victim && deadlock.clearanceCoord) {
        const vx = victim.position.x * cellSize + cellSize / 2;
        const vy = victim.position.z * cellSize + cellSize / 2;
        const cx = deadlock.clearanceCoord.x * cellSize + cellSize / 2;
        const cy = deadlock.clearanceCoord.y * cellSize + cellSize / 2;

        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('CLEARANCE SIDING', cx, cy - 10);
      }

      ctx.restore();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;
    const cellSize = 50;
    const gx = Math.floor(clickX / cellSize);
    const gy = Math.floor(clickY / cellSize);
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const node = engine.graph.getNodeByCoord(gx, gy);
    setHoveredNode(node || null);
    const robots = engine.robotMap.values();
    let foundRobot: Robot | undefined;
    for (const r of robots) {
      const rx = r.position.x * cellSize + cellSize / 2;
      const ry = r.position.z * cellSize + cellSize / 2;
      if (Math.hypot(clickX - rx, clickY - ry) < 22) {
        foundRobot = r;
        break;
      }
    }
    if (foundRobot) {
      setHoveredInfo({ type: 'robot', robot: foundRobot, screenPos });
      return;
    }
    const shelf = engine.shelfNodes.find((s) => s.x === gx && s.y === gy);
    if (shelf) {
      const product = engine.getProducts().find((p) => p.shelfId === shelf.shelfId);
      setHoveredInfo({ type: 'shelf', shelf, product, screenPos });
      return;
    }
    const cs = engine.chargingStations.find((c) => c.coord.x === gx && c.coord.y === gy);
    if (cs) {
      setHoveredInfo({ type: 'charging', station: cs, screenPos });
      return;
    }
    const wb = engine.waitingNodes.find((w) => w.coord.x === gx && w.coord.y === gy);
    if (wb) {
      const occupant = wb.occupyingRobotId ? engine.robotMap.get(wb.occupyingRobotId) : undefined;
      setHoveredInfo({ type: 'waiting', waitingBay: wb, robot: occupant, screenPos });
      return;
    }
    const dn = engine.deliveryNodes.find((d) => d.coord.x === gx && d.coord.y === gy);
    if (dn) {
      setHoveredInfo({ type: 'delivery', station: dn, screenPos });
      return;
    }
    if (node) {
      setHoveredInfo({ type: 'node', node, screenPos });
      return;
    }

    setHoveredInfo(null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const dist = Math.hypot(e.clientX - (dragStart.x + pan.x), e.clientY - (dragStart.y + pan.y));
    setIsDragging(false);

    if (dist > 5) return;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    const cellSize = 50;
    const gx = Math.floor(clickX / cellSize);
    const gy = Math.floor(clickY / cellSize);
    if (isObstacleMode) {
      if (gx >= 0 && gx < config.width && gy >= 0 && gy < config.length) {
        engine.toggleObstacleAt({ x: gx, y: gy });
        syncState();
      }
      return;
    }
    const robots = engine.robotMap.values();
    for (const r of robots) {
      const rx = r.position.x * cellSize + cellSize / 2;
      const ry = r.position.z * cellSize + cellSize / 2;
      if (Math.hypot(clickX - rx, clickY - ry) < 22) {
        selectRobot(r.id);
        return;
      }
    }
    const shelfNode = engine.shelfNodes.find((s) => s.x === gx && s.y === gy);
    if (shelfNode && shelfNode.shelfId) {
      selectShelf(shelfNode.shelfId);
      return;
    }
    const cs = engine.chargingStations.find((c) => c.coord.x === gx && c.coord.y === gy);
    if (cs) {
      selectStation(cs.id);
      return;
    }
    const hitWb = engine.waitingNodes.find((w) => w.coord.x === gx && w.coord.y === gy);
    if (hitWb && hitWb.occupyingRobotId) {
      selectRobot(hitWb.occupyingRobotId);
      return;
    }
    const dn = engine.deliveryNodes.find((d) => d.coord.x === gx && d.coord.y === gy);
    if (dn) {
      selectStation(dn.id);
      return;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.max(0.4, Math.min(3.0, zoom * zoomFactor));

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden bg-[#050914]">
      {/* 2D HTML Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full ${
          isObstacleMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      />

      {}
      {isObstacleMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#FFB020] text-black px-4 py-1.5 rounded-full font-mono text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce z-10 pointer-events-none">
          <AlertTriangle className="w-4 h-4" />
          <span>OBSTACLE MODE: Click any aisle grid cell to place or remove a blockage</span>
        </div>
      )}

      {}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10 select-none">
        {}
        <div className="bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-1 rounded-xl flex items-center gap-1 shadow-xl text-xs font-mono">
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z * 1.2))}
            title="Zoom In"
            className="p-1.5 text-[#7F9BB8] hover:text-[#00E5FF] hover:bg-[#101E32] rounded-lg transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}
            title="Zoom Out"
            className="p-1.5 text-[#7F9BB8] hover:text-[#00E5FF] hover:bg-[#101E32] rounded-lg transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            title="Reset Camera View"
            className="p-1.5 text-[#7F9BB8] hover:text-[#00E5FF] hover:bg-[#101E32] rounded-lg transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {selectedRobotId && (
            <button
              onClick={handleFocusRobot}
              title="Track Selected AGV"
              className="p-1.5 text-[#00E5FF] hover:bg-[#101E32] rounded-lg transition flex items-center gap-1"
            >
              <Crosshair className="w-4 h-4" />
              <span className="text-[10px]">Track</span>
            </button>
          )}
        </div>

        {}
        <div className="relative">
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className={`p-2 rounded-xl border backdrop-blur-md transition flex items-center gap-1.5 font-mono text-xs ${
              isLayerMenuOpen
                ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                : 'bg-[#0B1728]/90 border-[#183653] text-[#7F9BB8] hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Layers</span>
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[#0B1728] border border-[#183653] rounded-xl p-3 shadow-2xl space-y-2 z-20 text-xs font-mono">
              <div className="text-[10px] text-[#48627D] uppercase font-bold tracking-wider pb-1 border-b border-[#183653]">
                Map Layer Toggles
              </div>
              {(
                [
                  ['robots', 'Robots (AGVs)'],
                  ['paths', 'Active Paths & Trails'],
                  ['shelves', 'Storage Shelves'],
                  ['zones', 'Warehouse Zones'],
                  ['obstacles', 'Obstacles & Hazards'],
                  ['deliveryNodes', 'Delivery Docks'],
                  ['chargingStations', 'Charging Bays'],
                  ['heatmap', 'Transit Heatmap'],
                  ['restricted', 'Reserved Paths'],
                  ['grid', 'Technical Grid'],
                  ['robotLabels', 'Robot Labels & Battery'],
                ] as [keyof MapLayers, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className="w-full flex items-center justify-between p-1.5 rounded hover:bg-[#101E32] transition"
                >
                  <span className={layers[key] ? 'text-[#E7F4FF]' : 'text-[#48627D]'}>{label}</span>
                  {layers[key] ? (
                    <Eye className="w-3.5 h-3.5 text-[#00E5FF]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#48627D]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {}
      {hoveredInfo && !isDragging && (
        <div
          className="absolute z-20 pointer-events-none bg-[#0B1728]/95 backdrop-blur-md border border-[#183653] p-2.5 rounded-lg shadow-2xl text-xs font-mono max-w-xs space-y-1 transition-all duration-75"
          style={{
            left: Math.min(window.innerWidth - 300, Math.max(10, hoveredInfo.screenPos.x + 14)),
            top: Math.min(window.innerHeight - 180, Math.max(10, hoveredInfo.screenPos.y + 14)),
          }}
        >
          {hoveredInfo.type === 'robot' && hoveredInfo.robot && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#183653] pb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredInfo.robot.color }} />
                  {hoveredInfo.robot.name} ({hoveredInfo.robot.id})
                </span>
                <div className="flex items-center gap-1">
                  {hoveredInfo.robot.isRecoveryRobot && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      RECOVERY
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      hoveredInfo.robot.state === 'backing_off' || hoveredInfo.robot.state === 'yielding'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : hoveredInfo.robot.state === 'breakdown'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {hoveredInfo.robot.state.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] pt-1 text-gray-300">
                <span>Logical Node:</span>
                <span className="text-white font-mono">({hoveredInfo.robot.gridPosition.x}, {hoveredInfo.robot.gridPosition.y})</span>
                {hoveredInfo.robot.targetNode && (
                  <>
                    <span>Target Node:</span>
                    <span className="text-cyan-300 font-mono">
                      ({hoveredInfo.robot.targetNode.x}, {hoveredInfo.robot.targetNode.y}) [{hoveredInfo.robot.targetType || 'GOAL'}]
                    </span>
                  </>
                )}
                <span>Traffic Mode:</span>
                <span className={hoveredInfo.robot.movementMode === 'LANE_FOLLOWING' ? 'text-cyan-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  {hoveredInfo.robot.movementMode === 'LANE_FOLLOWING'
                    ? `TWO_WAY (${hoveredInfo.robot.assignedTrafficDirection || 'LANE'})`
                    : hoveredInfo.robot.movementMode || 'FREE_MOVEMENT'}
                </span>
                {hoveredInfo.robot.queueStatus && (
                  <>
                    <span>Queue Status:</span>
                    <span className="text-purple-300 font-semibold">{hoveredInfo.robot.queueStatus}</span>
                  </>
                )}
                <span>Battery:</span>
                <span className={hoveredInfo.robot.battery < 25 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {hoveredInfo.robot.battery.toFixed(0)}%
                </span>
                <span>Cargo:</span>
                <span className="text-amber-300 font-bold">
                  {hoveredInfo.robot.cargoCount} / {hoveredInfo.robot.maxCapacity} units
                </span>
                {hoveredInfo.robot.carriedItemName && (
                  <>
                    <span>Item:</span>
                    <span className="text-white truncate">{hoveredInfo.robot.carriedItemName}</span>
                  </>
                )}
                <span>Route / Replans:</span>
                <span className="text-gray-400 font-mono">v{hoveredInfo.robot.routeVersion || 1} (replan: {hoveredInfo.robot.replanCount || 0})</span>
                <span>Completed:</span>
                <span className="text-cyan-400">{hoveredInfo.robot.tasksCompleted} tasks</span>
              </div>
              {hoveredInfo.robot.blockedReason && (
                <div className="text-[9px] text-amber-300/90 font-mono pt-1 border-t border-[#183653]/60 leading-tight">
                  {hoveredInfo.robot.blockedReason}
                </div>
              )}
            </div>
          )}

          {hoveredInfo.type === 'shelf' && hoveredInfo.shelf && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#183653] pb-1">
                <span className="font-bold text-white flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                  Shelf {hoveredInfo.shelf.shelfId}
                </span>
                <span className="text-[10px] text-gray-400">
                  ({hoveredInfo.shelf.x}, {hoveredInfo.shelf.y})
                </span>
              </div>
              <div className="text-[10px] pt-1 space-y-0.5 text-gray-300">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="text-amber-300 font-semibold">{hoveredInfo.product?.name || 'Empty'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stock:</span>
                  <span className="text-white font-mono">
                    {hoveredInfo.shelf.shelfInfo?.inventoryLevel ?? hoveredInfo.product?.quantity ?? 0} / {hoveredInfo.shelf.shelfInfo?.maxCapacity ?? 50}
                  </span>
                </div>
                {hoveredInfo.product?.sku && (
                  <div className="flex justify-between text-gray-400">
                    <span>SKU:</span>
                    <span>{hoveredInfo.product.sku}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {hoveredInfo.type === 'charging' && hoveredInfo.station && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#183653] pb-1">
                <span className="font-bold text-white flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Charging Bay {hoveredInfo.station.id}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    (hoveredInfo.station as ChargingStation).isOccupied
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {(hoveredInfo.station as ChargingStation).isOccupied ? 'Occupied' : 'Available'}
                </span>
              </div>
              <div className="text-[10px] pt-1 text-gray-300 flex justify-between">
                <span>Current AGV:</span>
                <span className="text-cyan-400 font-bold">
                  {(hoveredInfo.station as ChargingStation).occupyingRobotId || 'None'}
                </span>
              </div>
            </div>
          )}

          {hoveredInfo.type === 'waiting' && hoveredInfo.waitingBay && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#183653] pb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9B5CFF] animate-pulse" />
                  Waiting Bay {hoveredInfo.waitingBay.id}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    hoveredInfo.waitingBay.isOccupied
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {hoveredInfo.waitingBay.isOccupied ? 'Occupied' : 'Standby Bay'}
                </span>
              </div>
              <div className="text-[10px] pt-1 text-gray-300 flex justify-between">
                <span>Parked AGV:</span>
                <span className="text-[#9B5CFF] font-bold">
                  {hoveredInfo.waitingBay.occupyingRobotId
                    ? `${hoveredInfo.robot?.name || hoveredInfo.waitingBay.occupyingRobotId}`
                    : 'None (Standby Ready)'}
                </span>
              </div>
            </div>
          )}

          {hoveredInfo.type === 'delivery' && hoveredInfo.station && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#183653] pb-1">
                <span className="font-bold text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Delivery Dock {hoveredInfo.station.id}
                </span>
                <span className="text-[10px] text-gray-400">
                  ({hoveredInfo.station.coord.x}, {hoveredInfo.station.coord.y})
                </span>
              </div>
              <div className="text-[10px] pt-1 text-gray-300 flex justify-between">
                <span>Completed:</span>
                <span className="text-emerald-400 font-bold">
                  {(hoveredInfo.station as DeliveryNode).completedDeliveries || 0} packages
                </span>
              </div>
            </div>
          )}

          {hoveredInfo.type === 'node' && hoveredInfo.node && (
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#183653] pb-1">
                <span className="font-bold text-white">
                  Node ({hoveredInfo.node.x}, {hoveredInfo.node.y})
                </span>
                <span className="text-[10px] text-cyan-400 uppercase font-bold">
                  [{hoveredInfo.node.zone}]
                </span>
              </div>
              <div className="text-[10px] pt-1 text-gray-300 flex justify-between">
                <span>Status:</span>
                <span className={hoveredInfo.node.isBlocked ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {hoveredInfo.node.isBlocked ? '⚠️ BLOCKED (Click to clear)' : 'Clear Passage'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 bg-[#0B1728]/90 backdrop-blur-md border border-[#183653] px-3 py-1.5 rounded-lg font-mono text-[11px] text-[#7F9BB8] z-10 flex items-center gap-2">
          <span>
            NODE ({hoveredNode.x}, {hoveredNode.y})
          </span>
          <span className="text-[#00E5FF] uppercase font-bold">[{hoveredNode.zone}]</span>
          {hoveredNode.shelfId && <span className="text-[#FFB020]">Shelf: {hoveredNode.shelfId}</span>}
          {hoveredNode.isBlocked && <span className="text-[#FF3D71] font-bold">BLOCKED</span>}
        </div>
      )}
    </div>
  );
};
