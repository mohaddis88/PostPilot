import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Layers,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { api } from '../../api';
import { PlatformType } from '../../types';
import { RecommendationObject, RecommendationResult } from '../../domain/recommendations';
import { DetailedStatsResponse, StatsRange } from '../../domain/stats';
import { PLATFORM_COLORS, PLATFORM_SPECS } from '../../domain/specs';

export const InsightsView: React.FC = () => {
  const { activeProfile, profileMeta, setActiveNav, addNewPost, applyRecommendationAction } = useApp();

  const [topTab, setTopTab] = useState<'insights' | 'ideas'>('insights');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [dateRange, setDateRange] = useState<StatsRange>('30d');

  // Real recommendation results from api.recommendations
  const [recommendationResults, setRecommendationResults] = useState<RecommendationResult[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(true);

  // Real stats data from api.stats to match Statistics page numbers
  const [statsData, setStatsData] = useState<DetailedStatsResponse | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Expanded cards tracker
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  // Active inner tab per card: 'whatHappened' | 'whatItMeans' | 'tryThis'
  const [cardActiveTabs, setCardActiveTabs] = useState<
    Record<string, 'whatHappened' | 'whatItMeans' | 'tryThis'>
  >({});

  // Show more toggle (max 4 visible initially)
  const [showAllInsights, setShowAllInsights] = useState(false);

  // Ideas generator state
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [ideas, setIdeas] = useState<string[]>(
    activeProfile === 'company'
      ? [
          'High-Throughput WebSocket Pools in Rust: Benchmark numbers vs Node.js under 100k client load.',
          'Zero-Downtime PostgreSQL Schema Migrations: Safe dual-write cutovers on 40TB production datasets.',
          'Why Multi-Tenant Kubernetes Ingress Breaks During Cert Renewal: SRE checklist for edge clusters.',
          'Sub-5ms Streaming Telemetry Demo: eBPF kernel trace capture visualized live in Grafana.',
        ]
      : [
          'Photonic Organza Runway 05: Real-time dynamic cloth solvers under neon Shibuya rain lighting.',
          'Behind the Mesh: Translating vocal stem spectrograms into 4K facial micro-expression topology.',
          'Kinetic Digital Jewelry: Holographic platinum ear cuffs reacting to wearer telemetry.',
          'Neural Procedural Shaders: 120fps iridescent crystal refraction BTS teardown.',
        ]
  );

  // Update ideas when profile changes
  useEffect(() => {
    setIdeas(
      activeProfile === 'company'
        ? [
            'High-Throughput WebSocket Pools in Rust: Benchmark numbers vs Node.js under 100k client load.',
            'Zero-Downtime PostgreSQL Schema Migrations: Safe dual-write cutovers on 40TB production datasets.',
            'Why Multi-Tenant Kubernetes Ingress Breaks During Cert Renewal: SRE checklist for edge clusters.',
            'Sub-5ms Streaming Telemetry Demo: eBPF kernel trace capture visualized live in Grafana.',
          ]
        : [
            'Photonic Organza Runway 05: Real-time dynamic cloth solvers under neon Shibuya rain lighting.',
            'Behind the Mesh: Translating vocal stem spectrograms into 4K facial micro-expression topology.',
            'Kinetic Digital Jewelry: Holographic platinum ear cuffs reacting to wearer telemetry.',
            'Neural Procedural Shaders: 120fps iridescent crystal refraction BTS teardown.',
          ]
    );
  }, [activeProfile]);

  // Load real recommendations via API
  useEffect(() => {
    let isCancelled = false;
    setIsRecsLoading(true);

    api.recommendations
      .list(activeProfile, selectedPlatform)
      .then((results) => {
        if (!isCancelled) {
          setRecommendationResults(results);
          setIsRecsLoading(false);
          // Auto-expand first actionable recommendation if available
          const firstActionable = results.find((r) => r.hasRecommendation && r.recommendation);
          if (firstActionable?.recommendation) {
            setExpandedCardIds((prev) => ({
              ...prev,
              [firstActionable.recommendation!.id]: true,
            }));
            setCardActiveTabs((prev) => ({
              ...prev,
              [firstActionable.recommendation!.id]: 'whatHappened',
            }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load recommendations:', err);
        if (!isCancelled) setIsRecsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeProfile, selectedPlatform]);

  // Load real stats for period from api.stats to guarantee numbers match the Statistics page
  useEffect(() => {
    let isCancelled = false;
    setIsStatsLoading(true);

    api.stats
      .getDetailedStats(activeProfile, {
        range: dateRange,
        platform: selectedPlatform,
      })
      .then((res) => {
        if (!isCancelled) {
          setStatsData(res);
          setIsStatsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load stats for insights:', err);
        if (!isCancelled) setIsStatsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeProfile, dateRange, selectedPlatform]);

  // Exactly three summary numbers matching Statistics page for same period
  const summaryCards = useMemo(() => {
    if (!statsData || !statsData.summaryCards || statsData.summaryCards.length === 0) {
      return [];
    }
    return statsData.summaryCards.slice(0, 3);
  }, [statsData]);

  const toggleCard = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    if (!cardActiveTabs[id]) {
      setCardActiveTabs((prev) => ({
        ...prev,
        [id]: 'whatHappened',
      }));
    }
  };

  const setCardInnerTab = (id: string, tab: 'whatHappened' | 'whatItMeans' | 'tryThis') => {
    setCardActiveTabs((prev) => ({
      ...prev,
      [id]: tab,
    }));
  };

  // Filter recommendations based on platform selection
  const filteredRecs = useMemo(() => {
    if (selectedPlatform === 'all') return recommendationResults;
    return recommendationResults.filter((r) => r.platform === selectedPlatform);
  }, [recommendationResults, selectedPlatform]);

  const visibleRecs = showAllInsights ? filteredRecs : filteredRecs.slice(0, 4);

  const handleGenerateIdea = () => {
    setIsGeneratingIdea(true);
    setTimeout(() => {
      setIsGeneratingIdea(false);
      const newIdea =
        activeProfile === 'company'
          ? `Microsecond Zero-Copy Buffers in Linux: How kernel ring buffers speed up container streaming (${Date.now().toString().slice(-4)}).`
          : `Iridescent Cyber-Latex: Real-time procedural sheen shaders under rain streetlights (${Date.now().toString().slice(-4)}).`;
      setIdeas([newIdea, ...ideas]);
    }, 500);
  };

  const handleUseIdeaAsDraft = (idea: string) => {
    addNewPost({
      profileId: activeProfile,
      title: idea.split(':')[0] || 'Generated Post Idea',
      caption: idea,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoDuration: '0:30',
      videoAspect: '9:16',
      thumbnailUrl:
        activeProfile === 'company'
          ? 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80'
          : 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=400&q=80',
      platforms: ['linkedin', 'instagram'],
      status: 'draft',
      author: profileMeta.name,
      fileName: 'Draft_Generated_Idea.mp4',
      resolution: '1080x1920 (9:16 Vertical)',
    });
    setActiveNav('create');
  };

  const getKindLabel = (kind: 'best_time' | 'format' | 'cta') => {
    switch (kind) {
      case 'best_time':
        return 'Best Timing';
      case 'format':
        return 'Content Format';
      case 'cta':
        return 'Call to Action';
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* ================= STICKY PAGE HEADER ================= */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                Insights & Recommendations
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {profileMeta.name} data-backed recommendations derived from your past performance
              </p>
            </div>

            {/* Top Tabs: Insights vs Ideas */}
            <div className="flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs shrink-0 self-start sm:self-center">
              <button
                onClick={() => setTopTab('insights')}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                  topTab === 'insights'
                    ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Recommendations
              </button>
              <button
                onClick={() => setTopTab('ideas')}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  topTab === 'ideas'
                    ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Concept Incubator ({ideas.length})</span>
              </button>
            </div>
          </div>

          {/* Filters: Platform & Date Range */}
          {topTab === 'insights' && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['all', 'linkedin', 'instagram', 'tiktok', 'facebook'] as Array<PlatformType | 'all'>).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`px-3 py-1 rounded-full font-medium capitalize transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      selectedPlatform === plat
                        ? 'bg-[var(--accent-fill)] text-[#0A0A0A] font-bold shadow-xs'
                        : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)]'
                    }`}
                  >
                    {plat !== 'all' && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: PLATFORM_COLORS[plat] }}
                      />
                    )}
                    <span>{plat === 'all' ? 'All channels' : PLATFORM_SPECS[plat].name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs shrink-0">
                {(['7d', '30d', '90d', 'all'] as StatsRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      dateRange === r
                        ? 'bg-[var(--bg)] text-[var(--text)] font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {r === 'all' ? 'All time' : r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Inner Wrapper */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full pb-16">
        {/* ================= TAB 1: RECOMMENDATIONS ================= */}
        {topTab === 'insights' && (
          <div className="space-y-6">
            {/* Top: Exactly Three Summary Numbers from StatsApi matching Statistics Page */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isStatsLoading ? (
                [1, 2, 3].map((idx) => (
                  <GlassCard key={idx} className="p-4 sm:p-5 space-y-2 animate-pulse">
                    <div className="h-3 w-20 bg-[var(--surface-hover)] rounded" />
                    <div className="h-7 w-28 bg-[var(--surface-hover)] rounded" />
                    <div className="h-3 w-16 bg-[var(--surface-hover)] rounded" />
                  </GlassCard>
                ))
              ) : (
                summaryCards.map((card, idx) => {
                  const isUp = card.direction === 'up';
                  const isDown = card.direction === 'down';
                  const changeText =
                    card.changePercent === 0
                      ? 'Unchanged'
                      : `${card.changePercent > 0 ? '+' : ''}${card.changePercent}% vs prev period`;

                  return (
                    <GlassCard key={idx} className="p-4 sm:p-5 space-y-1">
                      <p className="text-[12px] text-[var(--muted)] font-medium">
                        {card.label}
                      </p>
                      <p className="text-2xl font-bold tracking-tight text-[var(--text)] font-mono">
                        {card.formattedValue}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] font-semibold">
                        {isUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                        {isDown && <TrendingUp className="w-3.5 h-3.5 text-rose-500 rotate-180" />}
                        <span
                          className={
                            isUp
                              ? 'text-emerald-500'
                              : isDown
                              ? 'text-rose-500'
                              : 'text-[var(--muted)]'
                          }
                        >
                          {changeText}
                        </span>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>

            {/* Recommendation Cards List */}
            <div className="space-y-5 pt-1">
              {isRecsLoading ? (
                <div className="p-8 text-center text-sm text-[var(--muted)]">
                  Evaluating channel metrics and historical performance...
                </div>
              ) : visibleRecs.length === 0 ? (
                <GlassCard className="p-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-[var(--text)]">No data found</p>
                  <p className="text-xs text-[var(--muted)]">
                    No posts tracked yet for the selected filter.
                  </p>
                </GlassCard>
              ) : (
                visibleRecs.map((result) => {
                  const cardId = result.hasRecommendation && result.recommendation
                    ? result.recommendation.id
                    : `not-enough-${result.kind}-${result.platform}`;
                  const isExpanded = !!expandedCardIds[cardId];
                  const activeInnerTab = cardActiveTabs[cardId] || 'whatHappened';
                  const platformSpec = PLATFORM_SPECS[result.platform];

                  // CASE 1: Real Actionable Recommendation
                  if (result.hasRecommendation && result.recommendation) {
                    const rec = result.recommendation;
                    return (
                      <GlassCard
                        key={rec.id}
                        className="p-5 sm:p-6 transition-all duration-200 border-[var(--border)] hover:border-[var(--accent-border-tint)] space-y-4"
                      >
                        {/* Collapsed Header: Short Headline, One Key Number, Chevron */}
                        <div
                          onClick={() => toggleCard(rec.id)}
                          className="flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: PLATFORM_COLORS[rec.platform] }}
                              />
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                                {platformSpec.name} • {getKindLabel(rec.kind)}
                              </span>
                            </div>
                            <h2 className="text-[16px] font-semibold text-[var(--text)] leading-snug">
                              {rec.headline}
                            </h2>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-center">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--accent-text)] border border-[var(--border)] font-mono">
                              +{rec.evidence.values.differencePercent}%
                            </span>
                            <div className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content: 3 Tabs (What happened, What it means, Try this) */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-[var(--border)] space-y-4 animate-in fade-in duration-150">
                            {/* Inner 3 Tabs */}
                            <div className="flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs w-fit">
                              <button
                                type="button"
                                onClick={() => setCardInnerTab(rec.id, 'whatHappened')}
                                className={`px-3.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                  activeInnerTab === 'whatHappened'
                                    ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                              >
                                What happened
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardInnerTab(rec.id, 'whatItMeans')}
                                className={`px-3.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                  activeInnerTab === 'whatItMeans'
                                    ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                              >
                                What it means
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardInnerTab(rec.id, 'tryThis')}
                                className={`px-3.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                  activeInnerTab === 'tryThis'
                                    ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                              >
                                Try this
                              </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-4.5 rounded-xl bg-[var(--surface)]/70 border border-[var(--border)] text-sm leading-relaxed text-[var(--text)]">
                              {activeInnerTab === 'whatHappened' && (
                                <div className="space-y-3">
                                  <p className="text-sm text-[var(--text)] leading-relaxed">
                                    {rec.whatHappened}
                                  </p>
                                  {/* Evidence data row */}
                                  <div className="pt-2 border-t border-[var(--border)]/60 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-[var(--text)]">Sample:</span>
                                      <span>{rec.evidence.sampleSize} posts compared</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-[var(--text)]">Winner:</span>
                                      <span>
                                        {rec.evidence.values.winner.label} (avg{' '}
                                        {rec.evidence.values.winner.average.toLocaleString()}{' '}
                                        {rec.evidence.metric.toLowerCase()})
                                      </span>
                                    </div>
                                    {rec.evidence.values.runnerUp && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-[var(--text)]">Runner-up:</span>
                                        <span>
                                          {rec.evidence.values.runnerUp.label} (avg{' '}
                                          {rec.evidence.values.runnerUp.average.toLocaleString()}{' '}
                                          {rec.evidence.metric.toLowerCase()})
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {activeInnerTab === 'whatItMeans' && (
                                <p className="text-sm text-[var(--text)] leading-relaxed">
                                  {rec.whatItMeans}
                                </p>
                              )}

                              {activeInnerTab === 'tryThis' && (
                                <div className="space-y-3.5 w-full">
                                  <p className="text-sm text-[var(--text)] leading-relaxed">
                                    {rec.tryThis}
                                  </p>

                                  {/* Prefill Param Context Pills */}
                                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                    <span className="px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                                      Platform:{' '}
                                      <strong className="text-[var(--text)]">
                                        {PLATFORM_SPECS[rec.action.params.platform].name}
                                      </strong>
                                    </span>
                                    <span className="px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                                      Format:{' '}
                                      <strong className="text-[var(--text)] capitalize">
                                        {rec.action.params.postType}
                                      </strong>
                                    </span>
                                    {rec.action.params.localTime && (
                                      <span className="px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                                        Slot:{' '}
                                        <strong className="text-[var(--text)]">
                                          {rec.action.params.scheduledDateFormatted ||
                                            rec.action.params.timeRangeLabel}
                                        </strong>
                                      </span>
                                    )}
                                    {rec.action.params.ctaType && (
                                      <span className="px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                                        CTA:{' '}
                                        <strong className="text-[var(--text)] capitalize">
                                          {rec.action.params.ctaType}
                                        </strong>
                                      </span>
                                    )}
                                  </div>

                                  {/* The Actionable "TRY THIS" Button */}
                                  <div className="pt-2">
                                    <Button
                                      variant="accent"
                                      size="sm"
                                      onClick={() => applyRecommendationAction(rec)}
                                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                                      className="font-semibold text-xs"
                                    >
                                      Try this in Create
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    );
                  }

                  // CASE 2: Insufficient Data / Not enough data yet
                  return (
                    <GlassCard
                      key={cardId}
                      className="p-5 sm:p-6 transition-all duration-200 border-[var(--border)] bg-[var(--surface)]/40 space-y-3"
                    >
                      <div
                        onClick={() => toggleCard(cardId)}
                        className="flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: PLATFORM_COLORS[result.platform] }}
                            />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                              {platformSpec.name} • {getKindLabel(result.kind)}
                            </span>
                          </div>
                          <h2 className="text-[15px] font-semibold text-[var(--muted)] leading-snug">
                            {getKindLabel(result.kind)}: Not enough data yet
                          </h2>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-center">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                            {result.sampleCount} posts tracked
                          </span>
                          <div className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-[var(--border)] space-y-2 text-xs leading-relaxed text-[var(--muted)]">
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)]">
                            <AlertCircle className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold text-[var(--text)]">
                                {result.insufficientDataReason}
                              </p>
                              <p>
                                PostPilot groups past posts by weekday and hour in your profile
                                timezone. Recommendations unlock automatically once compared
                                categories reach at least 5 posts each with a 15% or greater
                                performance difference. We never invent sample numbers.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })
              )}

              {/* Show More toggle */}
              {filteredRecs.length > 4 && (
                <div className="pt-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllInsights(!showAllInsights)}
                    rightIcon={
                      showAllInsights ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {showAllInsights
                      ? 'Show fewer recommendations'
                      : `Show all (${filteredRecs.length - 4} more)`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: IDEAS ================= */}
        {topTab === 'ideas' && (
          <div className="space-y-6">
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                <div>
                  <h2 className="text-base font-bold text-[var(--text)]">
                    Topic & Hook Incubator
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    Concepts tailored to the {profileMeta.name} target audience
                  </p>
                </div>

                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleGenerateIdea}
                  isLoading={isGeneratingIdea}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Generate concept
                </Button>
              </div>

              <div className="space-y-3">
                {ideas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--accent-border-tint)] transition-all"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {idea.split(':')[0]}
                      </p>
                      <p className="text-xs text-[var(--muted)] line-clamp-2">
                        {idea.split(':')[1] ? idea.split(':')[1].trim() : idea}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseIdeaAsDraft(idea)}
                      leftIcon={<PlusCircle className="w-3.5 h-3.5 text-[var(--accent-text)]" />}
                      className="shrink-0 text-xs"
                    >
                      Use as draft
                    </Button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
