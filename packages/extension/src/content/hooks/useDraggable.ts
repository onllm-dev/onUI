import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  boundaryPadding?: number;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  handleMouseDown: (e: MouseEvent) => void;
}

/**
 * Hook for making an element draggable
 */
export function useDraggable(
  options: UseDraggableOptions = {}
): UseDraggableReturn {
  const { initialPosition = { x: 20, y: 20 }, boundaryPadding = 10 } = options;

  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const elementRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - elementRef.current.width - boundaryPadding;
      const maxY = window.innerHeight - elementRef.current.height - boundaryPadding;

      setPosition({
        x: Math.max(boundaryPadding, Math.min(newX, maxX)),
        y: Math.max(boundaryPadding, Math.min(newY, maxY)),
      });
    },
    [isDragging, boundaryPadding]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    const rect = target.closest('.onui-toolbar')?.getBoundingClientRect();

    if (rect) {
      elementRef.current = { width: rect.width, height: rect.height };
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    isDragging,
    handleMouseDown,
  };
}
