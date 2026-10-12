import React, { useState } from 'react';
import {
  Activity,
  Server,
  Database,
  Globe,
  Radio,
  Sliders,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { StatusPill } from '../common/StatusPill';
import { InfoTooltip } from '../common/InfoTooltip';
import { AuditLogEntry, PlatformType } from '../../types';

export const SystemStatusView: React.FC = () => {
  const {
    simulateFailure,
    setDashboardError,
    isDashboardEmptySimulated,
    setIsDashboardEmptySimulated,
    runProfileIsolationCheck,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'health' | 'settings' | 'audit'>('health');

  // Platform Connections (Mock vs Live) state
  const [platformModes, setPlatformModes] = useState<Record<PlatformType, 'mock' | 'live'>>({
    linkedin: 'live',
    instagram: 'live',
    tiktok: 'mock',
    facebook: 'live',
  });

  const togglePlatformMode = (platform: PlatformType) => {
    setPlatformModes((prev) => ({
      ...prev,
      [platform]: prev[platform] === 'live' ? 'mock' : 'live',
    }));
  };

  // Advanced Worker & Retry Settings
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);
  const [timeoutSeconds, setTimeoutSeconds] = useState(180);
  const [concurrencyThreads, setConcurrencyThreads] = useState(8);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedMessage('Worker and retry settings saved successfully.');
    setTimeout(() => {
      setSettingsSavedMessage(null);
    }, 3000);
  };

  // Audit Log State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditProfileFilter, setAuditProfileFilter] = useState<'all' | 'company' | 'model'>('all');
  const [visibleCount, setVisibleCount] = useState(10);

  const initialAuditLogs: AuditLogEntry[] = [
    {
      id: 'aud-01',
      who: 'Sandy Mass',
      what: 'Dispatched distributed cloud architecture demo',
      when: '10 mins ago',
      profile: 'company',
      status: 'success',
    },
    {
      id: 'aud-02',
      who: 'adamsanders881@gmail.com',
      what: 'Scheduled Cyberpunk Silk Runway Look 04',
      when: '25 mins ago',
      profile: 'model',
      status: 'success',
    },
    {
      id: 'aud-03',
      who: 'worker-us-west-4a-98',
      what: 'Encountered TikTok 504 chunk ingestion timeout',
      when: '1 hour ago',
      profile: 'company',
      status: 'danger',
    },
    {
      id: 'aud-04',
      who: 'Sandy Mass',
      what: 'Re-authenticated Meta Graph OAuth token',
      when: '2 hours ago',
      profile: 'company',
      status: 'warning',
    },
    {
      id: 'aud-05',
      who: 'adamsanders881@gmail.com',
      what: 'Updated master captions for Look 05 release',
      when: '3 hours ago',
      profile: 'model',
      status: 'success',
    },
    {
      id: 'aud-06',
      who: 'worker-eu-central-1b-02',
      what: 'Remuxed vertical container to 1080x1920 H.264',
      when: '4 hours ago',
      profile: 'model',
      status: 'success',
    },
    {
      id: 'aud-07',
      who: 'Sandy Mass',
      what: 'Triggered profile isolation verification check',
      when: '5 hours ago',
      profile: 'company',
      status: 'success',
    },
    {
      id: 'aud-08',
      who: 'adamsanders881@gmail.com',
      what: 'Restored draft from Recently deleted trash',
      when: '6 hours ago',
      profile: 'model',
      status: 'success',
    },
    {
      id: 'aud-09',
      who: 'worker-ap-east-1a-12',
      what: 'Polled live video delivery statistics',
      when: '8 hours ago',
      profile: 'company',
      status: 'success',
    },
    {
      id: 'aud-10',
      who: 'Sandy Mass',
      what: 'Rotated webhook signature signing credentials',
      when: '12 hours ago',
      profile: 'company',
      status: 'success',
    },
    {
      id: 'aud-11',
      who: 'adamsanders881@gmail.com',
      what: 'Generated 3 AI topics in Ideas incubator',
      when: '14 hours ago',
      profile: 'model',
      status: 'success',
    },
    {
      id: 'aud-12',
      who: 'worker-us-east-1c-44',
      what: 'Flushed transcode staging cache (14.2 GB freed)',
      when: '18 hours ago',
      profile: 'company',
      status: 'success',
    },
    {
      id: 'aud-13',
      who: 'Sandy Mass',
      what: 'Signed in from Chrome on macOS Ventura',
      when: '1 day ago',
      profile: 'company',
      status: 'success',
    },
    {
      id: 'aud-14',
      who: 'worker-us-west-4a-98',
      what: 'Health check heartbeat OK across all 8 nodes',
      when: '1 day ago',
      profile: 'company',
      status: 'success',
    },
  ];

  const [auditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const filteredAudit = auditLogs.filter((log) => {
    const matchesSearch =
      log.who.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.what.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesProfile =
      auditProfileFilter === 'all' || log.profile === auditProfileFilter;
    return matchesSearch && matchesProfile;
  });

  const displayedAudit = filteredAudit.slice(0, visibleCount);

  return (
    <div className="min-h-full flex flex-col">
      {/* ================= STICKY PAGE HEADER ================= */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface)] text-[var(--status-success)] border border-[rgba(46,158,107,0.25)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse" />
                All systems operational
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] mt-1">
              System status
            </h1>
          </div>

          {/* 3 Simplified Tabs: Health, Settings, Audit log */}
          <div className="flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs shrink-0 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('health')}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Health
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Audit log
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Inner Wrapper */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full pb-16">
        {/* ================= TAB 1: HEALTH ================= */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Card 1: API */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--accent-text)]" />
                <h2 className="text-sm font-bold text-[var(--text)]">API</h2>
                <InfoTooltip content="Current operational status of platform ingestion endpoints and partner APIs." />
              </div>
              <StatusPill status="active" label="Operational" size="sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">LinkedIn Partner API v2</p>
                  <p className="text-[11px] text-[var(--muted)]">Latency: 38ms • OAuth 2.0 active</p>
                </div>
                <StatusPill status="active" label="Connected" size="sm" />
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">Meta Graph API v19.0 (IG & FB)</p>
                  <p className="text-[11px] text-[var(--muted)]">Latency: 52ms • Webhooks active</p>
                </div>
                <StatusPill status="active" label="Connected" size="sm" />
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">TikTok Creator Upload API</p>
                  <p className="text-[11px] text-[var(--muted)]">Latency: 94ms • Chunked transfer</p>
                </div>
                <StatusPill status="active" label="Connected" size="sm" />
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">PostPilot Edge Proxy Gateway</p>
                  <p className="text-[11px] text-[var(--muted)]">Latency: 12ms • TLS 1.3 mutual auth</p>
                </div>
                <StatusPill status="active" label="Operational" size="sm" />
              </div>
            </div>
          </GlassCard>

          {/* Card 2: Database */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--accent-text)]" />
                <h2 className="text-sm font-bold text-[var(--text)]">Database</h2>
                <InfoTooltip content="Persistence cluster health, transactional read replicas, and object storage containers." />
              </div>
              <StatusPill status="active" label="Healthy" size="sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text)]">Primary Store</span>
                  <StatusPill status="active" label="Online" size="sm" />
                </div>
                <p className="text-[11px] text-[var(--muted)]">Read latency: 2.1ms • Connection pool: 24/100</p>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text)]">Media Blob Bucket</span>
                  <StatusPill status="active" label="Healthy" size="sm" />
                </div>
                <p className="text-[11px] text-[var(--muted)]">MP4 containers replicated in 3 geographic zones</p>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text)]">Audit Replication</span>
                  <StatusPill status="active" label="Synced" size="sm" />
                </div>
                <p className="text-[11px] text-[var(--muted)]">Replication lag: &lt;50ms across read replicas</p>
              </div>
            </div>
          </GlassCard>

          {/* Card 3: Worker Queue */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[var(--accent-text)]" />
                <h2 className="text-sm font-bold text-[var(--text)]">Worker queue</h2>
                <InfoTooltip content="Active background workers for transcoding MP4 videos and scheduling uploads." />
              </div>
              <StatusPill status="active" label="Active • 0 backlog" size="sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 space-y-1">
                <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Active Workers</p>
                <p className="text-xl font-extrabold text-[var(--text)]">8 / 8 Online</p>
                <p className="text-[11px] text-[var(--status-success)]">0 jobs in backoff buffer</p>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 space-y-1">
                <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Transcode Latency</p>
                <p className="text-xl font-extrabold text-[var(--text)]">74 ms</p>
                <p className="text-[11px] text-[var(--muted)]">NVENC hardware acceleration</p>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 space-y-1">
                <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Queue Depth</p>
                <p className="text-xl font-extrabold text-[var(--text)]">1 In Flight</p>
                <p className="text-[11px] text-[var(--muted)]">Processing chunked MP4 video</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ================= TAB 2: SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Section 1: Connections */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--accent-text)]" />
                <h2 className="text-base font-bold text-[var(--text)]">Connections</h2>
                <InfoTooltip content="Toggle between mock simulation and live direct channel API dispatch for each platform." />
              </div>
              <span className="text-xs text-[var(--muted)]">Per-platform switch</span>
            </div>

            <div className="divide-y divide-[var(--border)] text-xs">
              {/* LinkedIn */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text)]">LinkedIn</span>
                    <InfoTooltip content="In Mock mode, posts simulate publishing without calling LinkedIn's Member or Organization share API." />
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    Current mode: {platformModes.linkedin === 'live' ? 'Live API streaming' : 'Mock sandbox'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePlatformMode('linkedin')}
                  className="flex items-center p-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold cursor-pointer"
                >
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.linkedin === 'mock'
                        ? 'bg-[var(--bg)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Mock
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.linkedin === 'live'
                        ? 'bg-[var(--accent-fill)] text-[#0A0A0A] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Live
                  </span>
                </button>
              </div>

              {/* Instagram */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text)]">Instagram</span>
                    <InfoTooltip content="In Mock mode, Reels video chunks are simulated in-memory without uploading to Meta CDN." />
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    Current mode: {platformModes.instagram === 'live' ? 'Live API streaming' : 'Mock sandbox'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePlatformMode('instagram')}
                  className="flex items-center p-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold cursor-pointer"
                >
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.instagram === 'mock'
                        ? 'bg-[var(--bg)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Mock
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.instagram === 'live'
                        ? 'bg-[var(--accent-fill)] text-[#0A0A0A] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Live
                  </span>
                </button>
              </div>

              {/* TikTok */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text)]">TikTok</span>
                    <InfoTooltip content="In Mock mode, TikTok direct upload avoids hitting sandbox token expiration limits." />
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    Current mode: {platformModes.tiktok === 'live' ? 'Live API streaming' : 'Mock sandbox'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePlatformMode('tiktok')}
                  className="flex items-center p-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold cursor-pointer"
                >
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.tiktok === 'mock'
                        ? 'bg-[var(--bg)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Mock
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.tiktok === 'live'
                        ? 'bg-[var(--accent-fill)] text-[#0A0A0A] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Live
                  </span>
                </button>
              </div>

              {/* Facebook */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text)]">Facebook</span>
                    <InfoTooltip content="In Mock mode, page posts are emulated locally with synthetic engagement statistics." />
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    Current mode: {platformModes.facebook === 'live' ? 'Live API streaming' : 'Mock sandbox'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePlatformMode('facebook')}
                  className="flex items-center p-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold cursor-pointer"
                >
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.facebook === 'mock'
                        ? 'bg-[var(--bg)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Mock
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full transition-all ${
                      platformModes.facebook === 'live'
                        ? 'bg-[var(--accent-fill)] text-[#0A0A0A] shadow-xs'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Live
                  </span>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Section 2: Collapsed Advanced "Worker and retry settings" */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <button
              type="button"
              onClick={() => setAdvancedExpanded(!advancedExpanded)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--accent-text)]" />
                <h2 className="text-base font-bold text-[var(--text)] group-hover:text-[var(--accent-text)] transition-colors">
                  Worker and retry settings
                </h2>
                <div onClick={(e) => e.stopPropagation()}>
                  <InfoTooltip content="Configure worker timeout limits, retry backoff attempts, and parallel transcode thread concurrency." />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span>{advancedExpanded ? 'Collapse' : 'Expand'}</span>
                {advancedExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {advancedExpanded && (
              <form onSubmit={handleSaveSettings} className="space-y-4 pt-3 border-t border-[var(--border)]">
                {settingsSavedMessage && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl border border-[rgba(46,158,107,0.3)] bg-[rgba(46,158,107,0.08)] text-xs text-[var(--status-success)] flex items-center gap-2 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{settingsSavedMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Max Retries */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                      <span>Max Retries</span>
                      <InfoTooltip content="Maximum times a worker attempts to re-dispatch a failed video before marking as failed." />
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(Number(e.target.value))}
                      className="input-base w-full text-xs"
                      required
                    />
                  </div>

                  {/* Timeout */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                      <span>Timeout (seconds)</span>
                      <InfoTooltip content="Maximum duration before a hanging video upload stream times out and triggers backoff." />
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={600}
                      step={10}
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      className="input-base w-full text-xs"
                      required
                    />
                  </div>

                  {/* Concurrency */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                      <span>Concurrency (threads)</span>
                      <InfoTooltip content="Number of simultaneous transcode routines running across edge cluster nodes." />
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={concurrencyThreads}
                      onChange={(e) => setConcurrencyThreads(Number(e.target.value))}
                      className="input-base w-full text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="accent" size="sm">
                    Save settings
                  </Button>
                </div>
              </form>
            )}
          </GlassCard>

          {/* Developer Simulation Controls */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--accent-text)]" />
                <h2 className="text-sm font-bold text-[var(--text)]">Developer simulation</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] font-mono">
                Prototype tools
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateFailure('429')}
              >
                Simulate 429 rate limit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateFailure('401')}
              >
                Simulate 401 unauthorized
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateFailure('timeout')}
              >
                Simulate 504 timeout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDashboardError('Worker connection timeout after 15,000ms while polling dispatches.')
                }
              >
                Simulate worker error
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDashboardEmptySimulated(!isDashboardEmptySimulated)}
              >
                {isDashboardEmptySimulated ? 'Exit empty simulation' : 'Simulate empty queue'}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  const res = runProfileIsolationCheck();
                  setCheckResult(res.message);
                }}
                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Check profile isolation
              </Button>
            </div>

            {checkResult && (
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] flex items-center justify-between gap-2">
                <span>{checkResult}</span>
                <button
                  onClick={() => setCheckResult(null)}
                  className="text-[var(--muted)] hover:text-[var(--text)] text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ================= TAB 3: AUDIT LOG ================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <GlassCard className="p-4 sm:p-5 space-y-4">
            {/* Filters: Search with correct icon padding + Profile Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search with wrapper position: relative, icon at left: 14px, 18px wide, input pl-12 (48px) */}
              <div className="relative flex-1 max-w-sm">
                <div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)] flex items-center justify-center"
                  style={{ left: '14px', width: '18px', height: '18px' }}
                >
                  <Search className="w-[18px] h-[18px]" />
                </div>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search actions, users, dispatches..."
                  className="input-base text-xs w-full h-9"
                  style={{ paddingLeft: '48px', paddingRight: '12px' }}
                />
              </div>

              {/* Profile filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setAuditProfileFilter('all')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    auditProfileFilter === 'all'
                      ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  All profiles
                </button>
                <button
                  type="button"
                  onClick={() => setAuditProfileFilter('company')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    auditProfileFilter === 'company'
                      ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Ontilus (Company)
                </button>
                <button
                  type="button"
                  onClick={() => setAuditProfileFilter('model')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    auditProfileFilter === 'model'
                      ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  Aria Tan (Model)
                </button>
              </div>
            </div>

            {/* Table: max 5 columns (Who, Action, Profile, Time, Status) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Who</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Profile</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {displayedAudit.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[var(--muted)]">
                        No audit events match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedAudit.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--surface)]/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[var(--text)] whitespace-nowrap">
                          {log.who}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text)]">
                          {log.what}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="capitalize text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)]">
                            {log.profile === 'company' ? 'Ontilus' : 'Aria Tan'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--muted)] whitespace-nowrap">
                          {log.when}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              log.status === 'success'
                                ? 'bg-[rgba(46,158,107,0.12)] text-[var(--status-success)]'
                                : log.status === 'warning'
                                ? 'bg-[rgba(235,160,55,0.12)] text-[var(--status-warning)]'
                                : 'bg-[rgba(214,69,69,0.12)] text-[var(--status-danger)]'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="capitalize">{log.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Load 10 more */}
            <div className="pt-2 flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--border)]">
              <span>
                Showing {Math.min(displayedAudit.length, filteredAudit.length)} of {filteredAudit.length} events
              </span>
              {visibleCount < filteredAudit.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Load 10 more
                </Button>
              )}
            </div>
          </GlassCard>
        </div>
      )}
      </div>
    </div>
  );
};
