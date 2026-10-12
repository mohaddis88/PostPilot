import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Building2,
  Sparkles,
  User,
  LogOut,
  ChevronDown,
  Menu,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProfileId } from '../../types';
import { CompanyLogo } from '../common/CompanyLogo';

export const TopBar: React.FC = () => {
  const {
    activeProfile,
    setActiveProfile,
    theme,
    toggleTheme,
    user,
    logout,
    profileMeta,
    setMobileNavOpen,
    mobileNavOpen,
    isNavExpanded,
    toggleNavExpanded,
    triggerDashboardReload,
    isClawedDrawerOpen,
    setIsClawedDrawerOpen,
  } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileSwitch = (newProfile: ProfileId) => {
    if (activeProfile !== newProfile) {
      setActiveProfile(newProfile);
    }
  };

  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileNavOpen(!mobileNavOpen);
    } else {
      toggleNavExpanded();
    }
  };

  const isMenuExpanded = typeof window !== 'undefined' && window.innerWidth < 768 ? mobileNavOpen : isNavExpanded;

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg)] transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="flex items-center justify-between h-16 pr-4 sm:pr-6 lg:pr-8 w-full gap-3 overflow-hidden">
        {/* Left: 64px Menu button slot perfectly aligned with 64px rail, followed by PostPilot brand */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            <button
              type="button"
              onClick={handleMenuClick}
              aria-expanded={isMenuExpanded}
              aria-label="Toggle navigation menu"
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-text)]"
            >
              <Menu className="w-5 h-5" size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <CompanyLogo size={28} className="shrink-0" />
            <span className="font-bold text-base tracking-tight text-[var(--text)] whitespace-nowrap hidden min-[380px]:inline">
              PostPilot
            </span>
          </div>
        </div>

        {/* Center: Stable Segmented Profile Switcher */}
        <div
          role="radiogroup"
          aria-label="Profile"
          className="relative w-[170px] h-8 p-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center shrink-0"
        >
          {/* Sliding pill indicator */}
          <div
            className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-[var(--bg)] shadow-xs transition-transform duration-300 ease-out"
            style={{
              transform: activeProfile === 'company' ? 'translateX(0)' : 'translateX(calc(100%))',
            }}
          />

          {/* Company */}
          <button
            role="radio"
            aria-checked={activeProfile === 'company'}
            onClick={() => handleProfileSwitch('company')}
            className={`relative z-10 w-1/2 h-full flex items-center justify-center rounded-full text-xs font-medium cursor-pointer transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] ${
              activeProfile === 'company'
                ? 'text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Company
          </button>

          {/* Model */}
          <button
            role="radio"
            aria-checked={activeProfile === 'model'}
            onClick={() => handleProfileSwitch('model')}
            className={`relative z-10 w-1/2 h-full flex items-center justify-center rounded-full text-xs font-medium cursor-pointer transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] ${
              activeProfile === 'model'
                ? 'text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Model
          </button>
        </div>

        {/* Right: Theme Toggle, Clawed Copilot & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Clawed Copilot Drawer Trigger */}
          <button
            onClick={() => setIsClawedDrawerOpen(!isClawedDrawerOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent-border-tint)] bg-[var(--surface)] hover:bg-[var(--bg)] transition-all cursor-pointer text-xs font-semibold text-[var(--text)]"
            title="Open Clawed autonomous copilot drawer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            <span className="hidden sm:inline">Clawed</span>
          </button>

          {/* Reload data action */}
          <button
            onClick={triggerDashboardReload}
            aria-label="Refresh dashboard data"
            title="Refresh dashboard data"
            className="p-2 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-text)]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Light / Dark Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-text)]"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-full border border-[var(--border)] hover:border-[var(--accent-border-tint)] bg-[var(--surface)] hover:bg-[var(--bg)] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-text)] text-xs sm:text-sm"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: 'var(--accent-fill)',
                  color: '#0A0A0A',
                }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="text-left hidden lg:block leading-tight w-28">
                <span className="font-semibold block text-[var(--text)] text-xs truncate">
                  {user.name}
                </span>
                <span className="text-[11px] text-[var(--muted)] block truncate">
                  {activeProfile === 'company' ? 'Company' : 'Model'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
            </button>

            {/* Dropdown Popover (solid opaque overlay, no glass transparency) */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 p-3 solid-overlay rounded-2xl z-50 animate-in fade-in duration-150">
                <div className="pb-2.5 border-b border-[var(--border)] space-y-0.5">
                  <p className="text-sm font-semibold text-[var(--text)]">{user.name}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                </div>

                <div className="py-2 space-y-1">
                  <span className="px-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                    Profile
                  </span>
                  <button
                    onClick={() => {
                      handleProfileSwitch('company');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  >
                    <span>Company</span>
                    {activeProfile === 'company' && (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      handleProfileSwitch('model');
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  >
                    <span>Model</span>
                    {activeProfile === 'model' && (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--border)]">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-[var(--status-danger)] hover:bg-[rgba(214,69,69,0.08)] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
