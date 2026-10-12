/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import {
  ClawedDrawer,
  ConfirmModal,
  CursorGlow,
  LoginScreen,
  SidebarNav,
  TopBar,
} from './ui';

// Lazy-loaded views for optimal initial bundle size and instant navigation response
const DashboardView = lazy(() =>
  import('./components/dashboard/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const CreatePostFlow = lazy(() =>
  import('./components/create/CreatePostFlow').then((m) => ({ default: m.CreatePostFlow }))
);
const DraftsView = lazy(() =>
  import('./components/drafts/DraftsView').then((m) => ({ default: m.DraftsView }))
);
const ScheduleCalendarView = lazy(() =>
  import('./components/schedule/ScheduleCalendarView').then((m) => ({ default: m.ScheduleCalendarView }))
);
const PublishingLogsView = lazy(() =>
  import('./components/logs/PublishingLogsView').then((m) => ({ default: m.PublishingLogsView }))
);
const AccountsView = lazy(() =>
  import('./components/accounts/AccountsView').then((m) => ({ default: m.AccountsView }))
);
const StatisticsView = lazy(() =>
  import('./components/statistics/StatisticsView').then((m) => ({ default: m.StatisticsView }))
);
const InsightsView = lazy(() =>
  import('./components/insights/InsightsView').then((m) => ({ default: m.InsightsView }))
);
const ClawedChatView = lazy(() =>
  import('./components/clawed/ClawedChatView').then((m) => ({ default: m.ClawedChatView }))
);
const SystemStatusView = lazy(() =>
  import('./components/system/SystemStatusView').then((m) => ({ default: m.SystemStatusView }))
);

const PageLoader: React.FC = () => (
  <div className="min-h-[300px] h-full flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent-text)] rounded-full animate-spin" />
      <span className="text-xs text-[var(--muted)]">Loading workspace...</span>
    </div>
  </div>
);

const MainAppContent: React.FC = () => {
  const { isAuthenticated, activeNav, activeProfile } = useApp();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderActiveSection = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView key={activeProfile} />;
      case 'create':
        return <CreatePostFlow key={activeProfile} />;
      case 'drafts':
        return <DraftsView key={activeProfile} />;
      case 'schedule':
        return <ScheduleCalendarView key={activeProfile} />;
      case 'logs':
        return <PublishingLogsView key={activeProfile} />;
      case 'accounts':
        return <AccountsView key={activeProfile} />;
      case 'statistics':
        return <StatisticsView key={activeProfile} />;
      case 'insights':
        return <InsightsView key={activeProfile} />;
      case 'clawed':
        return <ClawedChatView />;
      case 'system':
        return <SystemStatusView />;
      default:
        return <DashboardView key={activeProfile} />;
    }
  };

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-300 relative overflow-hidden">
      {/* Background radial glow */}
      <CursorGlow />

      {/* Top Bar with Stable Profile Switcher & Theming */}
      <TopBar />

      {/* Main Layout Area: Fixed Viewport, Rail 64px on left, Only Main Scrolls */}
      <div className="flex-1 flex w-full relative z-10 overflow-hidden">
        <SidebarNav />
        <main className="flex-1 h-full stable-scroll p-0 m-0 min-w-0 overflow-y-auto overflow-x-hidden">
          <Suspense fallback={<PageLoader />}>
            {renderActiveSection()}
          </Suspense>
        </main>
      </div>

      {/* High-impact action confirmation modal */}
      <ConfirmModal />

      {/* Clawed Autonomous Copilot Slide-Over Drawer */}
      <ClawedDrawer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
