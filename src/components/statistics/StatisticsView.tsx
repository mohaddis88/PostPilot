import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  ExternalLink,
  ArrowUpDown,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import {
  CtaType,
  PlatformMetricData,
  PlatformType,
  PostItem,
  StoryPartMetricData,
} from '../../domain/types';
import { PLATFORM_COLORS, PLATFORM_SPECS } from '../../domain/specs';
import {
  ChartBucket,
  CtaPerformanceItem,
  DetailedStatsResponse,
  PLATFORM_METRICS_CONFIG,
  StatsRange,
  SummaryCardData,
  formatDayMonth,
  formatDayMonthYear,
  formatMetricNumber,
  getPostMetricValue,
  getPostPublishDate,
} from '../../domain/stats';
import { formatInTimezone } from '../../domain/dates';

export const StatisticsView: React.FC = () => {
  const { activeProfile, activeAccounts } = useApp();

  // Control state
  const [range, setRange] = useState<StatsRange>('30d');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('views');

  // Top posts table platform tab (one platform at a time)
  const [tablePlatform, setTablePlatform] = useState<PlatformType>('linkedin');

  // Bar click filter
  const [activeBarFilter, setActiveBarFilter] = useState<ChartBucket | null>(null);

  // Table sorting & pagination
  const [sortField, setSortField] = useState<string>('published');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isViewAll, setIsViewAll] = useState<boolean>(false);
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<string>>(new Set());

  // API response state
  const [statsData, setStatsData] = useState<DetailedStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync selected metric whenever selectedPlatform changes
  useEffect(() => {
    const available = PLATFORM_METRICS_CONFIG[selectedPlatform];
    const found = available.find((m) => m.key === selectedMetric);
    if (!found) {
      setSelectedMetric(available[0]?.key || 'views');
    }
  }, [selectedPlatform]);

  // Sync tablePlatform whenever selectedPlatform changes to a single platform
  useEffect(() => {
    if (selectedPlatform !== 'all') {
      setTablePlatform(selectedPlatform);
    }
  }, [selectedPlatform]);

  // Reset bar filter when range or platform changes
  useEffect(() => {
    setActiveBarFilter(null);
  }, [range, selectedPlatform]);

  // Fetch detailed statistics from StatsApi
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    api.stats
      .getDetailedStats(activeProfile, {
        range,
        platform: selectedPlatform,
        selectedMetric,
      })
      .then((res) => {
        if (!isCancelled) {
          setStatsData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load stats:', err);
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeProfile, range, selectedPlatform, selectedMetric]);

  // Determine trackedSince string for current platform selection
  const currentTrackedSinceStr = useMemo(() => {
    if (!statsData) return '';
    return statsData.trackedSince;
  }, [statsData]);

  const trackingSinceLabel = useMemo(() => {
    if (!currentTrackedSinceStr) return 'Tracking active';
    const d = new Date(currentTrackedSinceStr);
    return `Tracking since ${formatDayMonthYear(d)}`;
  }, [currentTrackedSinceStr]);

  // Available metrics for current platform
  const availableMetrics = useMemo(() => {
    return PLATFORM_METRICS_CONFIG[selectedPlatform] || [];
  }, [selectedPlatform]);

  // Filter posts for top posts table based on tablePlatform and activeBarFilter
  const filteredTablePosts = useMemo(() => {
    if (!statsData) return [];
    let list = statsData.currentPosts.filter((p: PostItem) => p.platforms.includes(tablePlatform));

    if (activeBarFilter) {
      const startMs = activeBarFilter.startDate.getTime();
      const endMs = activeBarFilter.endDate.getTime();
      list = list.filter((p: PostItem) => {
        const pub = getPostPublishDate(p);
        if (!pub) return false;
        const t = pub.getTime();
        return t >= startMs && t <= endMs;
      });
    }

    // Sort list
    list.sort((a: PostItem, b: PostItem) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'published') {
        valA = getPostPublishDate(a)?.getTime() || 0;
        valB = getPostPublishDate(b)?.getTime() || 0;
      } else if (sortField === 'title') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortField === 'type') {
        valA = a.type || 'post';
        valB = b.type || 'post';
      } else if (sortField === 'ctaClicks') {
        valA = a.ctaClicks ?? a.metrics?.clicks ?? 0;
        valB = b.ctaClicks ?? b.metrics?.clicks ?? 0;
      } else {
        valA = getPostMetricValue(a, tablePlatform, sortField);
        valB = getPostMetricValue(b, tablePlatform, sortField);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [statsData, tablePlatform, activeBarFilter, sortField, sortDirection]);

  // Visible posts count for table pagination
  const visibleTablePosts = useMemo(() => {
    if (isViewAll) return filteredTablePosts;
    return filteredTablePosts.slice(0, 5);
  }, [filteredTablePosts, isViewAll]);

  // Story toggle expansion handler
  const handleToggleStoryExpand = (postId: string) => {
    setExpandedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Header column click for table sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Metric columns for current table platform
  const tableMetricColumns = useMemo(() => {
    return PLATFORM_METRICS_CONFIG[tablePlatform] || [];
  }, [tablePlatform]);

  // Chart max value for scaling bars
  const chartMaxValue = useMemo(() => {
    if (!statsData || !statsData.chart.buckets.length) return 100;
    const max = Math.max(...statsData.chart.buckets.map((b: ChartBucket) => b.total || b.value || 0));
    return max > 0 ? max * 1.15 : 100;
  }, [statsData]);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. STICKY HEADER WITH TITLE, TRACKING INFO, RANGE FILTER, AND PLATFORM TABS */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[var(--background)]/90 border-b border-[var(--border)] -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Statistics</h1>
              {statsData?.window.clamped && (
                <span
                  title="Rolling window starts before the social account was connected; clamped to connected date"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"
                >
                  <Calendar className="w-3 h-3" />
                  {statsData.window.clampedDateString}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{trackingSinceLabel}</span>
            </p>
          </div>

          {/* Range Selector: Last 7 days, Last 30 days, Last 90 days, All time */}
          <div className="flex items-center bg-[var(--card)] p-1 rounded-xl border border-[var(--border)] shadow-xs">
            {(
              [
                { id: '7d', label: 'Last 7 days' },
                { id: '30d', label: 'Last 30 days' },
                { id: '90d', label: 'Last 90 days' },
                { id: 'all', label: 'All time' },
              ] as const
            ).map((item) => {
              const active = range === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRange(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform Tabs: All, LinkedIn, Instagram, Facebook, TikTok */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {(
            [
              { id: 'all', label: 'All', color: '#6366F1' },
              { id: 'linkedin', label: 'LinkedIn', color: PLATFORM_COLORS.linkedin },
              { id: 'instagram', label: 'Instagram', color: PLATFORM_COLORS.instagram },
              { id: 'facebook', label: 'Facebook', color: PLATFORM_COLORS.facebook },
              { id: 'tiktok', label: 'TikTok', color: PLATFORM_COLORS.tiktok },
            ] as const
          ).map((tab) => {
            const isTabActive = selectedPlatform === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPlatform(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  isTabActive
                    ? 'bg-[var(--surface-hover)] text-[var(--text)] border-[var(--border)] shadow-xs ring-1 ring-[var(--border)]'
                    : 'bg-transparent text-[var(--muted)] border-transparent hover:bg-[var(--surface)] hover:text-[var(--text)]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tab.color }}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FOUR SUMMARY NUMBERS MAX FOR SELECTED PLATFORM AND RANGE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData?.summaryCards.map((card: SummaryCardData) => {
          const isUp = card.direction === 'up';
          const isDown = card.direction === 'down';

          return (
            <div
              key={card.key}
              className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)] transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted)]">{card.label}</span>
                <div className="relative group/tooltip">
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--muted)] hover:text-[var(--text)] cursor-help transition-colors" />
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tooltip:block w-52 p-2 rounded-lg bg-stone-900 text-stone-100 text-[11px] leading-tight shadow-xl border border-stone-800 z-30 pointer-events-none">
                    {card.tooltip}
                  </div>
                </div>
              </div>

              <div className="mt-2 mb-1">
                <span className="text-2xl font-bold tracking-tight text-[var(--text)]">
                  {card.formattedValue}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {isUp && (
                  <span className="inline-flex items-center font-semibold text-emerald-500 gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{card.changePercent}%
                  </span>
                )}
                {isDown && (
                  <span className="inline-flex items-center font-semibold text-rose-500 gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    -{card.changePercent}%
                  </span>
                )}
                {!isUp && !isDown && (
                  <span className="inline-flex items-center font-semibold text-[var(--muted)] gap-0.5">
                    <Minus className="w-3.5 h-3.5" />
                    0.0%
                  </span>
                )}
                <span className="text-[11px] text-[var(--muted)] truncate">vs previous period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. BAR CHART WITH METRIC SELECTOR AND CLICK-TO-FILTER */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Performance Over Time</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Grouped by {statsData?.chart.granularity === 'day' ? 'days' : statsData?.chart.granularity === 'week' ? 'weeks' : 'months'}. Click a bar to filter top posts below.
            </p>
          </div>

          {/* Metric Selector tailored to current platform */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--muted)]">Metric:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] cursor-pointer hover:bg-[var(--surface-hover)] focus:outline-hidden"
            >
              {availableMetrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Bar Filter Alert Banner */}
        {activeBarFilter && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs">
            <div className="flex items-center gap-2 text-[var(--accent-text)] font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>
                Filtered to period: {activeBarFilter.label} ({activeBarFilter.postsCount} post
                {activeBarFilter.postsCount === 1 ? '' : 's'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveBarFilter(null)}
              className="inline-flex items-center gap-1 font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear filter
            </button>
          </div>
        )}

        {/* Grouped / Single Bar Chart Graphic */}
        <div className="pt-4">
          <div className="h-56 flex items-end gap-2 sm:gap-4 w-full">
            {statsData?.chart.buckets.map((bucket: ChartBucket) => {
              const isSelected = activeBarFilter?.key === bucket.key;
              const heightPercent = Math.min(
                100,
                Math.max(6, Math.round((bucket.total / chartMaxValue) * 100))
              );

              return (
                <div
                  key={bucket.key}
                  onClick={() => {
                    if (isSelected) {
                      setActiveBarFilter(null);
                    } else {
                      setActiveBarFilter(bucket);
                    }
                  }}
                  className={`flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer transition-all ${
                    isSelected ? 'opacity-100 scale-102' : 'hover:opacity-100 opacity-90'
                  }`}
                >
                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 pointer-events-none">
                    <div className="p-2.5 rounded-xl bg-stone-900 text-stone-100 text-[11px] shadow-2xl border border-stone-800 whitespace-nowrap space-y-1">
                      <div className="font-semibold text-stone-200 border-b border-stone-800 pb-1">
                        {bucket.label}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-stone-300">
                        <span>Total {statsData.chart.metricLabel}:</span>
                        <span className="font-bold text-white">
                          {formatMetricNumber(
                            statsData.chart.metricKey,
                            bucket.total,
                            availableMetrics.find((m) => m.key === statsData.chart.metricKey)
                              ?.format || 'number'
                          )}
                        </span>
                      </div>
                      {selectedPlatform === 'all' && (
                        <div className="pt-1 border-t border-stone-800 space-y-0.5 text-[10px]">
                          {(['linkedin', 'instagram', 'facebook', 'tiktok'] as PlatformType[]).map(
                            (plat) => (
                              <div key={plat} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 capitalize">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: PLATFORM_COLORS[plat] }}
                                  />
                                  {plat}:
                                </span>
                                <span>{bucket.breakdown[plat]?.toLocaleString() || 0}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <div className="text-[10px] text-stone-400 pt-0.5 italic">
                        Click to filter posts table
                      </div>
                    </div>
                  </div>

                  {/* Bars Area: Grouped or Single */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all flex items-end justify-center p-0.5 ${
                      isSelected
                        ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--card)]'
                        : ''
                    }`}
                  >
                    {selectedPlatform === 'all' ? (
                      /* Grouped Bars in Platform Brand Colors */
                      <div className="w-full h-full flex items-end gap-0.5">
                        {(['linkedin', 'instagram', 'facebook', 'tiktok'] as PlatformType[]).map(
                          (plat) => {
                            const val = bucket.breakdown[plat] || 0;
                            const subHeightPercent = Math.min(
                              100,
                              Math.max(8, Math.round((val / chartMaxValue) * 100))
                            );
                            return (
                              <div
                                key={plat}
                                title={`${plat}: ${val.toLocaleString()}`}
                                style={{
                                  height: `${subHeightPercent}%`,
                                  backgroundColor: PLATFORM_COLORS[plat],
                                }}
                                className="flex-1 rounded-t-sm transition-all hover:brightness-125"
                              />
                            );
                          }
                        )}
                      </div>
                    ) : (
                      /* Single Platform Bar */
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: PLATFORM_COLORS[selectedPlatform],
                        }}
                        className="w-full rounded-t-md hover:brightness-125 transition-all"
                      />
                    )}
                  </div>

                  {/* X Axis Label */}
                  <span
                    className={`text-[10px] mt-2 font-medium truncate max-w-full ${
                      isSelected ? 'font-bold text-[var(--accent-text)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          {selectedPlatform === 'all' && (
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-[var(--border)] mt-2">
              {(['linkedin', 'instagram', 'facebook', 'tiktok'] as PlatformType[]).map((plat) => (
                <div key={plat} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[plat] }}
                  />
                  <span className="capitalize">{plat}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. CTA PERFORMANCE LIST (WHEN AT LEAST 3 POSTS PER TYPE EXIST) */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-[var(--accent-text)]" />
            <h3 className="text-sm font-bold text-[var(--text)]">CTA Performance</h3>
          </div>
          <span className="text-xs text-[var(--muted)]">Average clicks per CTA type (min 3 posts)</span>
        </div>

        {statsData?.ctaPerformance.qualifyingCount && statsData.ctaPerformance.qualifyingCount > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {statsData.ctaPerformance.items.map((ctaItem: CtaPerformanceItem) => (
              <div
                key={ctaItem.type}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent-text)] border border-[var(--accent)]/20">
                    {ctaItem.label}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{ctaItem.postCount} posts</span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-xl font-bold text-[var(--text)]">
                      {ctaItem.avgClicks.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[var(--muted)] ml-1">avg clicks</span>
                  </div>
                  <span className="text-xs text-[var(--muted)] font-medium">
                    {ctaItem.totalClicks.toLocaleString()} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted)] bg-[var(--surface)]">
            CTA performance analysis activates automatically when at least 3 published posts exist for a given CTA type.
            <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-[var(--text)]">
              {statsData &&
                (Object.entries(statsData.ctaPerformance.allTypeCounts) as [CtaType, number][]).map(([type, cnt]) => {
                  if (type === 'none') return null;
                  return (
                    <span key={type} className="capitalize">
                      {type}: {cnt}/3 posts
                    </span>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 5. TOP POSTS TABLE (ONE PLATFORM AT A TIME, SORTABLE, STORY PARTS EXPAND) */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Top Posts Breakdown</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Review published post performance one platform at a time. Stories with multiple parts can be expanded.
            </p>
          </div>

          {/* Table Platform Tabs */}
          <div className="flex items-center bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)]">
            {(['linkedin', 'instagram', 'facebook', 'tiktok'] as PlatformType[]).map((plat) => {
              const active = tablePlatform === plat;
              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setTablePlatform(plat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--card)] text-[var(--text)] shadow-xs border border-[var(--border)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {plat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Content */}
        {filteredTablePosts.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--muted)]">
            No published posts found for {PLATFORM_SPECS[tablePlatform].name} in this period.
            {activeBarFilter && ' (Try clearing the active bar filter).'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th
                    onClick={() => handleSort('title')}
                    className="py-3 px-2 font-semibold cursor-pointer hover:text-[var(--text)]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Post</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('type')}
                    className="py-3 px-2 font-semibold cursor-pointer hover:text-[var(--text)]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Type</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('published')}
                    className="py-3 px-2 font-semibold cursor-pointer hover:text-[var(--text)]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Published</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  {/* Platform-specific columns */}
                  {tableMetricColumns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="py-3 px-2 font-semibold text-right cursor-pointer hover:text-[var(--text)]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>{col.label}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  ))}
                  <th
                    onClick={() => handleSort('ctaClicks')}
                    className="py-3 px-2 font-semibold text-right cursor-pointer hover:text-[var(--text)]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>CTA Clicks</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visibleTablePosts.map((post: PostItem) => {
                  const isStory = post.type === 'story' && !!post.storyParts?.length;
                  const partsCount = post.storyParts?.length || 1;
                  const isExpanded = expandedStoryIds.has(post.id);
                  const pubDate = getPostPublishDate(post);
                  const formattedDate = pubDate
                    ? formatInTimezone(pubDate, undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recently';

                  const ctaClicks =
                    post.ctaClicks ??
                    post.metrics?.clicks ??
                    post.platformMetrics?.[tablePlatform]?.ctaClicks ??
                    0;

                  return (
                    <React.Fragment key={post.id}>
                      <tr className="hover:bg-[var(--surface)]/50 transition-colors">
                        {/* Post Column */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5 max-w-xs">
                            <img
                              src={post.thumbnailUrl}
                              alt={post.title}
                              className="w-10 h-10 rounded-lg object-cover bg-stone-800 shrink-0 border border-[var(--border)]"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text)] truncate">
                                {post.title}
                              </p>
                              {post.isImported && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                  Imported
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Type Column */}
                        <td className="py-3 px-2">
                          {isStory ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStoryExpand(post.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-[11px] bg-[var(--surface)] text-[var(--accent-text)] border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                            >
                              <span>Story · {partsCount} parts</span>
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                              Post
                            </span>
                          )}
                        </td>

                        {/* Published Column */}
                        <td className="py-3 px-2 text-[var(--muted)] whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Main metric columns for platform */}
                        {tableMetricColumns.map((col) => {
                          const val = getPostMetricValue(post, tablePlatform, col.key);
                          const formattedVal = formatMetricNumber(col.key, val, col.format);
                          return (
                            <td
                              key={col.key}
                              className="py-3 px-2 text-right font-medium text-[var(--text)]"
                            >
                              {formattedVal}
                            </td>
                          );
                        })}

                        {/* CTA Clicks Column */}
                        <td className="py-3 px-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-[var(--text)]">
                              {ctaClicks.toLocaleString()}
                            </span>
                            {post.cta && post.cta !== 'none' && (
                              <span className="text-[10px] uppercase font-bold text-[var(--muted)]">
                                {post.cta}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Story Parts Breakdown */}
                      {isStory && isExpanded && post.storyPartMetrics?.map((part: StoryPartMetricData) => (
                        <tr
                          key={`${post.id}-part-${part.partIndex}`}
                          className="bg-[var(--surface)]/30 text-[11px] border-l-2 border-[var(--accent)]"
                        >
                          <td className="py-2 px-2 pl-8 font-medium text-[var(--muted)]">
                            ↳ Part {part.partIndex}: {part.title || `${part.durationSeconds || 15}s segment`}
                          </td>
                          <td className="py-2 px-2 text-[var(--muted)]">Part {part.partIndex}</td>
                          <td className="py-2 px-2 text-[var(--muted)]">—</td>
                          {tableMetricColumns.map((col) => {
                            const partVal = (part as any)[col.key] || Math.round(getPostMetricValue(post, tablePlatform, col.key) / partsCount);
                            return (
                              <td key={col.key} className="py-2 px-2 text-right text-[var(--muted)]">
                                {formatMetricNumber(col.key, partVal, col.format)}
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-right text-[var(--muted)]">
                            {part.ctaClicks || Math.round(ctaClicks / partsCount)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination: Page Size 5 with "View all" */}
        {filteredTablePosts.length > 5 && (
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
            <span className="text-[var(--muted)]">
              Showing {isViewAll ? filteredTablePosts.length : 5} of {filteredTablePosts.length} posts
            </span>
            <button
              type="button"
              onClick={() => setIsViewAll(!isViewAll)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold hover:bg-[var(--surface-hover)] cursor-pointer transition-all"
            >
              {isViewAll ? 'Show less (5)' : `View all (${filteredTablePosts.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
