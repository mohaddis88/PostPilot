import React, { useState, useRef, useEffect } from 'react';
import { Info, HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  variant?: 'info' | 'help';
  className?: string;
  side?: 'top' | 'bottom';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  variant = 'info',
  className = '',
  side = 'top',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Trim to max 20 words if exceeded
  const words = content.trim().split(/\s+/);
  const displayContent =
    words.length > 20 ? words.slice(0, 20).join(' ') + '...' : content;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // If related target is not inside container, close
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        aria-label="More information"
        aria-expanded={open}
        className="p-0.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-text)]"
      >
        {variant === 'help' ? (
          <HelpCircle className="w-3.5 h-3.5" />
        ) : (
          <Info className="w-3.5 h-3.5" />
        )}
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 w-56 sm:w-64 p-2.5 rounded-xl text-[11px] leading-snug bg-[var(--surface-elevated)] text-[var(--text)] border border-[var(--border)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto ${
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="font-normal text-[var(--text)]">{displayContent}</div>
        </div>
      )}
    </div>
  );
};
