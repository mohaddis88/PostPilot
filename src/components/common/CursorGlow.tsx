import React, { useEffect, useRef } from 'react';

export const CursorGlow: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const currentPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Respect user motion preferences & touch devices
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (prefersReducedMotion || isTouchDevice) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const animate = () => {
      // Smooth easing (0.12 factor)
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.12;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.12;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentPos.current.x - 250}px, ${currentPos.current.y - 250}px, 0)`;
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="cursor-glow-layer pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        ref={glowRef}
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle 250px at center, var(--accent-fill), transparent 70%)',
          opacity: 0.15,
          filter: 'blur(40px)',
          transition: 'background var(--transition-speed) ease',
        }}
      />
    </div>
  );
};
