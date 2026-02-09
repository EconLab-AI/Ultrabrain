import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SplitPaneProps {
  direction: 'horizontal' | 'vertical';
  children: [React.ReactNode, React.ReactNode];
  initialRatio?: number;
  minSize?: number;
}

export function SplitPane({ direction, children, initialRatio = 0.5, minSize = 100 }: SplitPaneProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;

      if (direction === 'horizontal') {
        const x = e.clientX - rect.left;
        newRatio = x / rect.width;
      } else {
        const y = e.clientY - rect.top;
        newRatio = y / rect.height;
      }

      const containerSize = direction === 'horizontal' ? rect.width : rect.height;
      const minRatio = minSize / containerSize;
      const maxRatio = 1 - minRatio;
      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, minSize]);

  const isHorizontal = direction === 'horizontal';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  const firstPaneStyle: React.CSSProperties = {
    [isHorizontal ? 'width' : 'height']: `calc(${ratio * 100}% - 2px)`,
    overflow: 'hidden',
    position: 'relative',
  };

  const secondPaneStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  };

  const handleStyle: React.CSSProperties = {
    [isHorizontal ? 'width' : 'height']: '4px',
    [isHorizontal ? 'cursor' : 'cursor']: isHorizontal ? 'col-resize' : 'row-resize',
    backgroundColor: '#2d2d44',
    flexShrink: 0,
    transition: 'background-color 0.15s',
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <div style={firstPaneStyle}>{children[0]}</div>
      <div
        style={handleStyle}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#4a4a6a';
        }}
        onMouseLeave={(e) => {
          if (!isDragging.current) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#2d2d44';
          }
        }}
      />
      <div style={secondPaneStyle}>{children[1]}</div>
    </div>
  );
}
