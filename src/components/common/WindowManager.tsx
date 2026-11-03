import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, X, Minus, Square } from 'lucide-react';

interface WindowManagerProps {
  id: string; 
  title: string;
  icon?: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  minWidth?: number;
  minHeight?: number;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  headerRightContent?: React.ReactNode;
}
let globalZIndex = 50;

export const WindowManager: React.FC<WindowManagerProps> = ({
  id,
  title,
  icon,
  initialWidth = 380,
  initialHeight = 460,
  initialX,
  initialY,
  minWidth = 260,
  minHeight = 140,
  isOpen,
  onClose,
  children,
  className = '',
  headerRightContent,
}) => {
  const getSavedState = () => {
    try {
      const saved = localStorage.getItem(`robofleet_win_${id}`);
      if (saved) return JSON.parse(saved);
    } catch {
    }
    return null;
  };

  const saved = getSavedState();

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (saved?.x !== undefined && saved?.y !== undefined) {
      return { x: saved.x, y: saved.y };
    }
    const defX = initialX ?? Math.max(20, window.innerWidth - initialWidth - 30);
    const defY = initialY ?? Math.max(80, window.innerHeight - initialHeight - 40);
    return { x: defX, y: defY };
  });

  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (saved?.width && saved?.height) {
      return { width: saved.width, height: saved.height };
    }
    return { width: initialWidth, height: initialHeight };
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(saved?.isMinimized ?? false);
  const [isMaximized, setIsMaximized] = useState<boolean>(saved?.isMaximized ?? false);
  const [zIndex, setZIndex] = useState<number>(() => ++globalZIndex);

  const windowRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isResizingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const bringToFront = useCallback(() => {
    setZIndex(++globalZIndex);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        `robofleet_win_${id}`,
        JSON.stringify({
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          isMinimized,
          isMaximized,
        })
      );
    } catch {
    }
  }, [id, position, size, isMinimized, isMaximized]);
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (isMaximized) return;
    bringToFront();
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - size.width - 10, moveEvent.clientX - dragOffsetRef.current.x));
      const newY = Math.max(64, Math.min(window.innerHeight - 50, moveEvent.clientY - dragOffsetRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized || isMinimized) return;
    bringToFront();
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const dx = moveEvent.clientX - resizeStartRef.current.x;
      const dy = moveEvent.clientY - resizeStartRef.current.y;
      const newW = Math.max(minWidth, Math.min(window.innerWidth - position.x - 20, resizeStartRef.current.w + dx));
      const newH = Math.max(minHeight, Math.min(window.innerHeight - position.y - 20, resizeStartRef.current.h + dy));
      setSize({ width: newW, height: newH });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  const currentWidth = isMaximized ? window.innerWidth - 40 : size.width;
  const currentHeight = isMaximized ? window.innerHeight - 100 : isMinimized ? 42 : size.height;
  const currentLeft = isMaximized ? 20 : position.x;
  const currentTop = isMaximized ? 74 : position.y;

  return (
    <div
      ref={windowRef}
      onMouseDown={bringToFront}
      style={{
        width: currentWidth,
        height: currentHeight,
        left: currentLeft,
        top: currentTop,
        zIndex,
      }}
      className={`fixed flex flex-col bg-[#0B1728]/95 backdrop-blur-xl border border-[#183653] shadow-2xl rounded-xl select-none transition-[width,height] duration-150 overflow-hidden ${className}`}
    >
      {/* Title / Draggable Header */}
      <div
        onMouseDown={handleMouseDownHeader}
        className="h-10 px-3 bg-[#081221] border-b border-[#183653] flex items-center justify-between cursor-move select-none shrink-0"
      >
        <div className="flex items-center space-x-2 font-mono text-xs font-bold text-[#E7F4FF] truncate">
          {icon && <span className="text-[#00E5FF]">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-1 shrink-0 ml-2" onMouseDown={(e) => e.stopPropagation()}>
          {headerRightContent}

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized((m) => !m)}
            title={isMinimized ? 'Expand Window' : 'Minimize Window'}
            className="p-1 text-[#7F9BB8] hover:text-white hover:bg-[#101E32] rounded transition"
          >
            {isMinimized ? <Square className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>

          {/* Maximize / Restore Button */}
          <button
            onClick={() => {
              setIsMaximized((m) => !m);
              if (isMinimized) setIsMinimized(false);
            }}
            title={isMaximized ? 'Restore Normal Size' : 'Maximize Window'}
            className="p-1 text-[#7F9BB8] hover:text-white hover:bg-[#101E32] rounded transition"
          >
            {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Close Window"
            className="p-1 text-[#7F9BB8] hover:text-[#FF3D71] hover:bg-[#101E32] rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto relative text-xs text-[#E7F4FF]">
          {children}
        </div>
      )}

      {/* Resize Grip (Bottom-Right Corner) */}
      {!isMinimized && !isMaximized && (
        <div
          onMouseDown={handleMouseDownResize}
          title="Drag to resize window"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-20 text-[#7F9BB8] hover:text-[#00E5FF]"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="1" />
            <circle cx="5" cy="2" r="1" />
            <circle cx="2" cy="5" r="1" />
          </svg>
        </div>
      )}
    </div>
  );
};
