import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClawedChatView } from './ClawedChatView';

export const ClawedDrawer: React.FC = () => {
  const { isClawedDrawerOpen, setIsClawedDrawerOpen, profileMeta } = useApp();

  if (!isClawedDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end transition-opacity animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => setIsClawedDrawerOpen(false)}
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-lg bg-[var(--bg)] border-l border-[var(--border)] h-full flex flex-col z-10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--text)]">
              CL
            </div>
            <h3 className="text-sm font-bold text-[var(--text)]">Clawed</h3>
          </div>

          <button
            onClick={() => setIsClawedDrawerOpen(false)}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            aria-label="Close Clawed drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Component inside drawer */}
        <div className="flex-1 overflow-hidden">
          <ClawedChatView isDrawer onCloseDrawer={() => setIsClawedDrawerOpen(false)} />
        </div>
      </div>
    </div>
  );
};
