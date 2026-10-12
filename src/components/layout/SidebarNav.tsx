import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Calendar,
  ListRestart,
  Share2,
  BarChart3,
  Lightbulb,
  Cpu,
  Activity,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavItemId } from '../../types';

interface NavItemDef {
  id: NavItemId;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  badgeCount?: number;
  badgeType?: 'danger' | 'info';
  badgeAria?: string;
}

interface TooltipState {
  label: string;
  badgeText?: string | null;
  badgeType?: 'danger' | 'info';
  top: number;
  left: number;
}

function formatBadgeText(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return count.toString();
}

export const SidebarNav: React.FC = () => {
  const {
    activeNav,
    setActiveNav,
    draftsCount,
    attentionFailuresCount,
    isNavExpanded,
    setIsNavExpanded,
    mobileNavOpen,
    setMobileNavOpen,
    navigateToBadgePage,
  } = useApp();

  const [activeTooltip, setActiveTooltip] = useState<TooltipState | null>(null);
  const navItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const expandedNavRef = useRef<HTMLDivElement>(null);

  const navItems: NavItemDef[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create', icon: PlusCircle },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: FileText,
      badgeCount: draftsCount,
      badgeType: 'info',
      badgeAria: `${draftsCount} draft${draftsCount === 1 ? '' : 's'}`,
    },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    {
      id: 'logs',
      label: 'Status log',
      icon: ListRestart,
      badgeCount: attentionFailuresCount,
      badgeType: 'danger',
      badgeAria: `${attentionFailuresCount} failed post${attentionFailuresCount === 1 ? '' : 's'} requiring attention`,
    },
    { id: 'accounts', label: 'Accounts', icon: Share2 },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
    { id: 'clawed', label: 'Clawed', icon: Cpu },
    { id: 'system', label: 'System status', icon: Activity },
  ];

  // Close expanded nav on Escape key and clear tooltips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNavExpanded) setIsNavExpanded(false);
        if (mobileNavOpen) setMobileNavOpen(false);
        setActiveTooltip(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNavExpanded, mobileNavOpen, setIsNavExpanded, setMobileNavOpen]);

  // Handle arrow key navigation in the rail
  const handleRailKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % navItems.length;
      navItemsRef.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + navItems.length) % navItems.length;
      navItemsRef.current[prev]?.focus();
    }
  };

  const handleSelectNav = (id: NavItemId) => {
    setActiveTooltip(null);
    if (id === 'logs') {
      navigateToBadgePage('logs');
    } else if (id === 'drafts') {
      navigateToBadgePage('drafts');
    } else {
      setActiveNav(id);
    }
    // Always collapse expanded or mobile nav on selection
    if (isNavExpanded) setIsNavExpanded(false);
    if (mobileNavOpen) setMobileNavOpen(false);
  };

  const handleMouseEnter = (item: NavItemDef, el: HTMLElement) => {
    if (isNavExpanded) return;
    const rect = el.getBoundingClientRect();
    const badgeText = item.badgeCount !== undefined ? formatBadgeText(item.badgeCount) : null;
    setActiveTooltip({
      label: item.label,
      badgeText,
      badgeType: item.badgeType,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. COLLAPSED 64px NARROW ICON RAIL (Desktop only, exactly 64px) */}
      {/* ============================================================ */}
      <aside
        className="hidden md:flex flex-col w-[64px] min-w-[64px] max-w-[64px] shrink-0 h-full bg-[var(--surface)] border-r border-[var(--border)] select-none z-10 transition-colors duration-200 overflow-x-hidden overflow-y-auto"
        style={{ width: '64px', minWidth: '64px', maxWidth: '64px' }}
        aria-label="Sidebar Rail"
      >
        <nav
          className="flex-1 flex flex-col items-center py-3 space-y-1 w-[64px] max-w-[64px] overflow-x-hidden"
          aria-label="Main Navigation"
        >
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            const badgeText = item.badgeCount !== undefined ? formatBadgeText(item.badgeCount) : null;

            return (
              <div
                key={item.id}
                className="w-[64px] h-[44px] shrink-0 flex items-center justify-center relative p-0 m-0"
              >
                <button
                  ref={(el) => {
                    navItemsRef.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  onKeyDown={(e) => handleRailKeyDown(e, idx)}
                  onMouseEnter={(e) => handleMouseEnter(item, e.currentTarget)}
                  onMouseLeave={handleMouseLeave}
                  onFocus={(e) => handleMouseEnter(item, e.currentTarget)}
                  onBlur={handleMouseLeave}
                  aria-label={item.badgeAria ? `${item.label}, ${item.badgeAria}` : item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-[64px] h-[44px] flex items-center justify-center relative transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] ${
                    isActive
                      ? 'bg-[var(--surface-hover,rgba(255,255,255,0.06))] text-[var(--accent-text)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover,rgba(255,255,255,0.04))]'
                  }`}
                >
                  {/* Left accent bar for active page */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--accent)]"
                      aria-hidden="true"
                    />
                  )}

                  {/* Centered 20px Icon Container: x=32px, y=22px */}
                  <div className="relative w-5 h-5 flex items-center justify-center shrink-0 pointer-events-none">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-[var(--accent-text)]' : 'text-[var(--muted)]'
                      }`}
                      size={20}
                      strokeWidth={2}
                    />

                    {/* Small Top-Right Badge: sits at top-right without shifting centered icon */}
                    {badgeText && (
                      <span
                        className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full ring-2 ring-[var(--surface)] text-[10px] font-bold text-white flex items-center justify-center leading-none ${
                          item.badgeType === 'danger'
                            ? 'bg-[var(--danger)]'
                            : 'bg-[var(--info)]'
                        }`}
                        aria-hidden="true"
                      >
                        {badgeText}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ============================================================ */}
      {/* 2. EXPANDED NAV OVERLAY (Desktop only, 240px wide, zero jump) */}
      {/* ============================================================ */}
      {isNavExpanded && (
        <div className="hidden md:block">
          {/* Dimmed backdrop */}
          <div
            className="fixed inset-0 top-16 bg-black/40 backdrop-blur-[1px] z-40 transition-opacity duration-200"
            onClick={() => setIsNavExpanded(false)}
            aria-hidden="true"
          />

          {/* Expanded 240px solid overlay drawer */}
          <div
            ref={expandedNavRef}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded Navigation"
            className="fixed left-0 top-16 bottom-0 w-60 z-50 bg-[var(--surface)] border-r border-[var(--border)] shadow-2xl flex flex-col transition-all duration-200 ease-out motion-reduce:transition-none"
          >
            <div className="px-4 pt-4 pb-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center justify-between">
              <span>Menu</span>
              <span className="text-[10px] text-[var(--muted)] opacity-70">Esc to close</span>
            </div>

            <nav className="flex-1 py-1 space-y-1 overflow-y-auto overflow-x-hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                const badgeText = item.badgeCount !== undefined ? formatBadgeText(item.badgeCount) : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    aria-label={item.badgeAria ? `${item.label}, ${item.badgeAria}` : item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full h-[44px] flex items-center transition-colors duration-150 cursor-pointer relative focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] ${
                      isActive
                        ? 'bg-[var(--surface-hover,rgba(255,255,255,0.06))] text-[var(--text)] font-semibold border-y border-[var(--accent-border-tint)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover,rgba(255,255,255,0.04))]'
                    }`}
                  >
                    {/* Left accent bar for active page */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}

                    {/* Fixed 64px icon slot on the left: centered at x=32px, exact same as collapsed rail */}
                    <div className="w-[64px] h-[44px] shrink-0 flex items-center justify-center relative">
                      <div className="relative w-5 h-5 flex items-center justify-center shrink-0 pointer-events-none">
                        <Icon
                          className={`w-5 h-5 shrink-0 transition-colors ${
                            isActive ? 'text-[var(--accent-text)]' : 'text-[var(--muted)]'
                          }`}
                          size={20}
                          strokeWidth={2}
                        />
                      </div>
                    </div>

                    {/* Label starts after 64px icon slot */}
                    <span className="truncate text-sm font-medium flex-1 text-left pr-2">
                      {item.label}
                    </span>

                    {/* Right-aligned Badge in expanded row */}
                    {badgeText && (
                      <span
                        className={`mr-4 ml-auto px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 leading-none ${
                          item.badgeType === 'danger'
                            ? 'bg-[var(--danger)]'
                            : 'bg-[var(--info)]'
                        }`}
                        aria-hidden="true"
                      >
                        {badgeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MOBILE FULL NAV DRAWER (< 768px, opened by menu button) */}
      {/* ============================================================ */}
      {mobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 top-16 z-50 md:hidden flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-64 max-w-[85vw] bg-[var(--surface)] border-r border-[var(--border)] h-full flex flex-col z-10 shadow-2xl p-2 transition-transform duration-200">
            <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
              <span className="font-bold text-sm text-[var(--text)]">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" size={20} strokeWidth={2} />
              </button>
            </div>

            <nav className="flex-1 py-3 px-1 space-y-1 overflow-y-auto overflow-x-hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                const badgeText = item.badgeCount !== undefined ? formatBadgeText(item.badgeCount) : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    aria-label={item.badgeAria ? `${item.label}, ${item.badgeAria}` : item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full h-[44px] px-3.5 rounded-xl flex items-center gap-3 transition-all duration-150 cursor-pointer relative focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] ${
                      isActive
                        ? 'bg-[var(--surface-hover,rgba(255,255,255,0.06))] text-[var(--text)] font-semibold border border-[var(--accent-border-tint)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover,rgba(255,255,255,0.04))]'
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}

                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-[var(--accent-text)]' : 'text-[var(--muted)]'
                      }`}
                      size={20}
                      strokeWidth={2}
                    />

                    <span className="truncate text-sm font-medium flex-1 text-left">
                      {item.label}
                    </span>

                    {badgeText && (
                      <span
                        className={`ml-auto px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 leading-none ${
                          item.badgeType === 'danger'
                            ? 'bg-[var(--danger)]'
                            : 'bg-[var(--info)]'
                        }`}
                        aria-hidden="true"
                      >
                        {badgeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. COLLAPSED-STATE TOOLTIP PORTAL (Rendered outside rail)    */}
      {/* ============================================================ */}
      {activeTooltip && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          className="fixed px-2.5 py-1 text-xs font-semibold rounded-lg z-[9999] whitespace-nowrap solid-overlay text-[var(--text)] pointer-events-none shadow-lg animate-in fade-in duration-100"
          style={{
            left: `${activeTooltip.left}px`,
            top: `${activeTooltip.top}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {activeTooltip.label}
          {activeTooltip.badgeText && (
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ${
                activeTooltip.badgeType === 'danger'
                  ? 'bg-[var(--danger)]'
                  : 'bg-[var(--info)]'
              }`}
            >
              {activeTooltip.badgeText}
            </span>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
