import { useEffect, useRef, useState, useCallback } from 'react';

interface KanbanScrollbarProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function KanbanScrollbar({ containerRef }: KanbanScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const updateThumb = useCallback(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const { scrollWidth, clientWidth, scrollLeft } = container;
    const trackWidth = track.clientWidth;

    // Calculate thumb width as a ratio of visible area to total scrollable area
    const ratio = clientWidth / scrollWidth;
    const newThumbWidth = Math.max(ratio * trackWidth, 40); // Min 40px

    // Calculate thumb position
    const maxScroll = scrollWidth - clientWidth;
    const maxThumbLeft = trackWidth - newThumbWidth;
    const newThumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumbLeft : 0;

    setThumbWidth(newThumbWidth);
    setThumbLeft(newThumbLeft);
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateThumb();

    container.addEventListener('scroll', updateThumb);
    window.addEventListener('resize', updateThumb);

    // Observe size changes
    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateThumb);
      window.removeEventListener('resize', updateThumb);
      resizeObserver.disconnect();
    };
  }, [containerRef, updateThumb]);

  const handleTrackClick = (e: React.MouseEvent) => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    const trackRect = track.getBoundingClientRect();
    const clickX = e.clientX - trackRect.left;
    const trackWidth = track.clientWidth;

    const { scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    // Calculate where to scroll based on click position
    const scrollRatio = clickX / trackWidth;
    container.scrollTo({
      left: scrollRatio * maxScroll,
      behavior: 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStartX.current = containerRef.current?.scrollLeft || 0;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;

      const deltaX = e.clientX - dragStartX.current;
      const trackWidth = track.clientWidth;
      const { scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      const maxThumbLeft = trackWidth - thumbWidth;

      // Convert thumb movement to scroll movement
      const scrollDelta = (deltaX / maxThumbLeft) * maxScroll;
      container.scrollLeft = scrollStartX.current + scrollDelta;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, thumbWidth, containerRef]);

  // Don't show scrollbar if content fits
  const container = containerRef.current;
  if (container && container.scrollWidth <= container.clientWidth) {
    return null;
  }

  return (
    <div
      ref={trackRef}
      className="kanban-scroll-track mb-3"
      onClick={handleTrackClick}
    >
      <div
        ref={thumbRef}
        className="kanban-scroll-thumb"
        style={{
          width: `${thumbWidth}px`,
          marginLeft: `${thumbLeft}px`,
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
