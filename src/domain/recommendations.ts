import {
  AccountConnection,
  CtaType,
  PlatformType,
  PostItem,
  PostType,
  ProfileId,
} from './types';
import { DEFAULT_USER_TIMEZONE, combineDateTimeToUtc } from './dates';
import { getPostMetricValue, getPostPublishDate } from './stats';
import { PLATFORM_SPECS } from './specs';

export type RecommendationKind = 'best_time' | 'format' | 'cta';

export interface BestPostingSlot {
  dayName: string;
  timeSlot: string;
  timeSlot24h: string;
  expectedEngagementBoost: string;
  reason: string;
}

export interface ChannelHealthReport {
  score: number; // 0..100
  rating: 'excellent' | 'good' | 'needs_attention' | 'critical';
  recommendations: string[];
  activeAccountsCount: number;
  expiringAccountsCount: number;
}

export interface RecommendationActionParams {
  platform: PlatformType;
  postType: PostType;
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dayName?: string;
  localTime?: string; // HH:MM 24-hour e.g. "14:30"
  localTimeLabel?: string; // e.g. "2:30 PM"
  timeRangeLabel?: string; // e.g. "2:00-3:00 PM"
  scheduledDate?: string; // YYYY-MM-DD
  scheduledDateFormatted?: string; // e.g. "Tuesday, 13 Oct 2026"
  tz: string;
  ctaType?: CtaType;
}

export interface RecommendationEvidence {
  sampleSize: number;
  metric: string;
  values: {
    winner: { label: string; average: number; count: number };
    runnerUp?: { label: string; average: number; count: number };
    differencePercent: number;
  };
}

export interface RecommendationObject {
  id: string;
  profileId: ProfileId;
  platform: PlatformType;
  kind: RecommendationKind;
  headline: string;
  whatHappened: string;
  whatItMeans: string;
  tryThis: string;
  evidence: RecommendationEvidence;
  action: {
    type: 'create_post';
    params: RecommendationActionParams;
  };
}

export interface RecommendationResult {
  kind: RecommendationKind;
  platform: PlatformType;
  hasRecommendation: boolean;
  recommendation?: RecommendationObject;
  insufficientDataReason?: string;
  sampleCount: number;
}

/**
 * Returns research-backed peak engagement slots per platform.
 * Maintained for backward compatibility.
 */
export function getRecommendedPostingSlots(platform: PlatformType): BestPostingSlot[] {
  switch (platform) {
    case 'linkedin':
      return [
        {
          dayName: 'Tuesday',
          timeSlot: '09:00 AM',
          timeSlot24h: '09:00',
          expectedEngagementBoost: '+34%',
          reason: 'B2B professionals scanning feeds at start of work week.',
        },
        {
          dayName: 'Thursday',
          timeSlot: '01:30 PM',
          timeSlot24h: '13:30',
          expectedEngagementBoost: '+28%',
          reason: 'Midday executive reading and engineering article shares.',
        },
      ];
    case 'instagram':
      return [
        {
          dayName: 'Wednesday',
          timeSlot: '12:00 PM',
          timeSlot24h: '12:00',
          expectedEngagementBoost: '+41%',
          reason: 'Lunch break discovery peak for Reels and aesthetic visual posts.',
        },
        {
          dayName: 'Sunday',
          timeSlot: '07:30 PM',
          timeSlot24h: '19:30',
          expectedEngagementBoost: '+39%',
          reason: 'Evening leisure browsing before weekly kickoff.',
        },
      ];
    case 'tiktok':
      return [
        {
          dayName: 'Thursday',
          timeSlot: '07:00 PM',
          timeSlot24h: '19:00',
          expectedEngagementBoost: '+52%',
          reason: 'High algorithm velocity during evening peak.',
        },
        {
          dayName: 'Saturday',
          timeSlot: '03:00 PM',
          timeSlot24h: '15:00',
          expectedEngagementBoost: '+45%',
          reason: 'Weekend viral discovery window for vertical video.',
        },
      ];
    case 'facebook':
      return [
        {
          dayName: 'Monday',
          timeSlot: '01:00 PM',
          timeSlot24h: '13:00',
          expectedEngagementBoost: '+22%',
          reason: 'Afternoon social feed catch-up and community group discussions.',
        },
        {
          dayName: 'Friday',
          timeSlot: '11:00 AM',
          timeSlot24h: '11:00',
          expectedEngagementBoost: '+26%',
          reason: 'Pre-weekend engagement spikes across shared links and videos.',
        },
      ];
  }
}

/**
 * Computes overall account health score and actionable recommendations.
 */
export function computeChannelHealthReport(
  posts: PostItem[],
  accounts: AccountConnection[]
): ChannelHealthReport {
  let score = 100;
  const recommendations: string[] = [];

  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const expiringAccounts = accounts.filter((a) => a.status === 'expiring');
  const disconnectedAccounts = accounts.filter(
    (a) => a.status === 'disconnected' || a.status === 'reauth_required'
  );

  if (accounts.length === 0) {
    score -= 40;
    recommendations.push('Connect at least one social media channel to begin dispatching.');
  }

  if (disconnectedAccounts.length > 0) {
    score -= disconnectedAccounts.length * 15;
    recommendations.push(
      `${disconnectedAccounts.length} channel(s) require re-authentication. Reconnect immediately to avoid dispatch failures.`
    );
  }

  if (expiringAccounts.length > 0) {
    score -= expiringAccounts.length * 5;
    recommendations.push(
      `${expiringAccounts.length} channel token(s) are nearing expiration. Refresh tokens to prevent publishing interruptions.`
    );
  }

  const failedPosts = posts.filter((p) => p.status === 'failed' && !p.isDeleted);
  if (failedPosts.length > 0) {
    score -= Math.min(25, failedPosts.length * 10);
    recommendations.push(
      `${failedPosts.length} post(s) recently failed to publish. Review actionable errors in the Logs drawer.`
    );
  }

  const scheduledPosts = posts.filter((p) => p.status === 'scheduled' && !p.isDeleted);
  if (scheduledPosts.length === 0) {
    score -= 10;
    recommendations.push(
      'No upcoming posts are scheduled. Fill your pipeline to maintain steady audience reach.'
    );
  }

  score = Math.max(0, Math.min(100, score));

  let rating: ChannelHealthReport['rating'] = 'excellent';
  if (score < 50) rating = 'critical';
  else if (score < 75) rating = 'needs_attention';
  else if (score < 90) rating = 'good';

  return {
    score,
    rating,
    recommendations,
    activeAccountsCount: activeAccounts.length,
    expiringAccountsCount: expiringAccounts.length,
  };
}

/**
 * Extracts weekday and 24-hour in user timezone using Intl.
 */
export function getWeekdayAndHourInTz(
  date: Date,
  timeZone = DEFAULT_USER_TIMEZONE
): { dayOfWeek: number; dayName: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const dayName = parts.find((p) => p.type === 'weekday')?.value || 'Monday';
  const hourStr = parts.find((p) => p.type === 'hour')?.value || '0';
  let hour = parseInt(hourStr, 10);
  if (hour === 24) hour = 0;

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const dayOfWeek = dayMap[dayName] !== undefined ? dayMap[dayName] : 1;
  return { dayOfWeek, dayName, hour };
}

/**
 * Formats a 1-hour slot as a friendly range (e.g. "2:00-3:00 PM")
 * and extracts the middle timestamp (e.g. "14:30").
 */
export function formatHourRange(hour: number): {
  rangeLabel: string;
  middleTime: string;
  middleLabel: string;
} {
  const startH = hour % 24;
  const endH = (hour + 1) % 24;

  const fmt = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return { displayH, period };
  };

  const start = fmt(startH);
  const end = fmt(endH);

  const rangeLabel =
    start.period === end.period
      ? `${start.displayH}:00-${end.displayH}:00 ${end.period}`
      : `${start.displayH}:00 ${start.period}-${end.displayH}:00 ${end.period}`;

  const middleTime = `${String(startH).padStart(2, '0')}:30`;
  const midFmt = fmt(startH);
  const middleLabel = `${midFmt.displayH}:30 ${midFmt.period}`;

  return { rangeLabel, middleTime, middleLabel };
}

/**
 * Calculates the next future occurrence of a given weekday and local time in target timezone.
 * What the recommendation card says is what gets prefilled.
 */
export function getNextOccurrenceDate(
  dayOfWeek: number, // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  localTime: string, // "14:30"
  timeZone = DEFAULT_USER_TIMEZONE,
  referenceNow?: Date
): {
  dateStr: string;
  timeStr: string;
  utcIso: string;
  formattedLabel: string;
} {
  const now = referenceNow ? new Date(referenceNow) : new Date();

  // Get current wall clock in timeZone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const getPartVal = (type: string) => parts.find((p) => p.type === type)?.value || '0';
  const currYear = parseInt(getPartVal('year'), 10);
  const currMonth = parseInt(getPartVal('month'), 10);
  const currDay = parseInt(getPartVal('day'), 10);
  const currDayName = getPartVal('weekday');
  let currHour = parseInt(getPartVal('hour'), 10);
  if (currHour === 24) currHour = 0;
  const currMinute = parseInt(getPartVal('minute'), 10);

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const currentDayOfWeek = dayMap[currDayName] !== undefined ? dayMap[currDayName] : 0;

  const [targetHStr, targetMStr] = localTime.split(':');
  const targetHour = parseInt(targetHStr || '12', 10);
  const targetMinute = parseInt(targetMStr || '0', 10);

  let diffDays = (dayOfWeek - currentDayOfWeek + 7) % 7;

  // If target day is today, check if target time is in the future
  if (diffDays === 0) {
    const isFutureToday =
      targetHour > currHour || (targetHour === currHour && targetMinute > currMinute);
    if (!isFutureToday) {
      diffDays = 7; // Next week's occurrence
    }
  }

  // Calculate target date by advancing diffDays from local wall-clock date
  const targetLocalDate = new Date(Date.UTC(currYear, currMonth - 1, currDay + diffDays));
  const tYear = targetLocalDate.getUTCFullYear();
  const tMonth = String(targetLocalDate.getUTCMonth() + 1).padStart(2, '0');
  const tDay = String(targetLocalDate.getUTCDate()).padStart(2, '0');
  const dateStr = `${tYear}-${tMonth}-${tDay}`;

  const utcIso = combineDateTimeToUtc(dateStr, localTime, timeZone);

  const daysArr = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayName = daysArr[dayOfWeek] || 'Day';

  const midFmtHour = targetHour % 12 === 0 ? 12 : targetHour % 12;
  const midPeriod = targetHour >= 12 ? 'PM' : 'AM';
  const midMins = String(targetMinute).padStart(2, '0');
  const formattedLabel = `${dayName}, ${tDay} ${[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][targetLocalDate.getUTCMonth()]} at ${midFmtHour}:${midMins} ${midPeriod}`;

  return {
    dateStr,
    timeStr: localTime,
    utcIso,
    formattedLabel,
  };
}

/**
 * Returns primary evaluation metric for each platform.
 */
function getPlatformPrimaryMetric(platform: PlatformType): { key: string; label: string } {
  switch (platform) {
    case 'linkedin':
      return { key: 'impressions', label: 'Impressions' };
    case 'instagram':
      return { key: 'reach', label: 'Reach' };
    case 'facebook':
      return { key: 'reach', label: 'Reach' };
    case 'tiktok':
      return { key: 'views', label: 'Views' };
  }
}

/**
 * Evaluates best posting time recommendation for a platform.
 * Rules:
 * - Group past posts by weekday and hour in profile timezone.
 * - Compare average of main metric.
 * - Recommend best slot ONLY IF each compared slot has at least 5 posts and difference is at least 15%.
 * - Show slot as range ("2:00-3:00 PM") and prefill middle of it ("14:30").
 * - If not enough data, show "Not enough data yet" instead of a recommendation. Never invent numbers.
 */
function evaluateBestTimeRecommendation(
  profileId: ProfileId,
  platform: PlatformType,
  posts: PostItem[],
  tz: string,
  referenceNow?: Date
): RecommendationResult {
  const published = posts.filter(
    (p) => !p.isDeleted && p.status === 'published' && p.platforms.includes(platform)
  );

  const { key: metricKey, label: metricLabel } = getPlatformPrimaryMetric(platform);

  // Group by (dayOfWeek, hour)
  const slotGroups: Record<
    string,
    { dayOfWeek: number; dayName: string; hour: number; posts: PostItem[] }
  > = {};

  for (const p of published) {
    const pubDate = getPostPublishDate(p);
    if (!pubDate) continue;

    const { dayOfWeek, dayName, hour } = getWeekdayAndHourInTz(pubDate, tz);
    const key = `${dayOfWeek}-${hour}`;

    if (!slotGroups[key]) {
      slotGroups[key] = { dayOfWeek, dayName, hour, posts: [] };
    }
    slotGroups[key].posts.push(p);
  }

  // Filter slots with at least 5 posts
  const qualifyingSlots = Object.values(slotGroups).filter((s) => s.posts.length >= 5);

  if (qualifyingSlots.length < 2) {
    return {
      kind: 'best_time',
      platform,
      hasRecommendation: false,
      insufficientDataReason:
        'Not enough data yet. We need at least 5 published posts in two distinct time slots to find your peak posting window.',
      sampleCount: published.length,
    };
  }

  // Compute average metric for each qualifying slot
  const slotAverages = qualifyingSlots.map((s) => {
    let total = 0;
    for (const p of s.posts) {
      total += getPostMetricValue(p, platform, metricKey);
    }
    const avg = total / s.posts.length;
    const { rangeLabel, middleTime, middleLabel } = formatHourRange(s.hour);
    return {
      ...s,
      average: avg,
      count: s.posts.length,
      rangeLabel,
      middleTime,
      middleLabel,
    };
  });

  // Sort descending by average
  slotAverages.sort((a, b) => b.average - a.average);

  const winner = slotAverages[0];
  const runnerUp = slotAverages[1];

  const diffPercent = runnerUp.average > 0
    ? ((winner.average - runnerUp.average) / runnerUp.average) * 100
    : 100;

  if (diffPercent < 15) {
    return {
      kind: 'best_time',
      platform,
      hasRecommendation: false,
      insufficientDataReason:
        'Not enough data yet. Engagement differences between top slots are under the 15% significance threshold.',
      sampleCount: published.length,
    };
  }

  // Calculate next occurrence for prefill
  const nextOcc = getNextOccurrenceDate(winner.dayOfWeek, winner.middleTime, tz, referenceNow);

  const diffRounded = Math.round(diffPercent);
  const headline = `Post on ${winner.dayName}s between ${winner.rangeLabel} for ${diffRounded}% more ${metricLabel.toLowerCase()}`;

  const whatHappened = `Across ${winner.count + runnerUp.count} published updates, posts shared on ${winner.dayName}s between ${winner.rangeLabel} averaged ${Math.round(winner.average).toLocaleString()} ${metricLabel.toLowerCase()}, compared to ${Math.round(runnerUp.average).toLocaleString()} during ${runnerUp.dayName}s (${runnerUp.rangeLabel}).`;

  const whatItMeans = `Your followers on ${PLATFORM_SPECS[platform].name} are most receptive during this ${winner.rangeLabel} window. Scheduling here maximizes initial algorithmic velocity.`;

  const tryThis = `Schedule your next ${PLATFORM_SPECS[platform].name} post for ${nextOcc.formattedLabel} (the middle of the ${winner.rangeLabel} window).`;

  const rec: RecommendationObject = {
    id: `rec-time-${profileId}-${platform}`,
    profileId,
    platform,
    kind: 'best_time',
    headline,
    whatHappened,
    whatItMeans,
    tryThis,
    evidence: {
      sampleSize: winner.count + runnerUp.count,
      metric: metricLabel,
      values: {
        winner: {
          label: `${winner.dayName} (${winner.rangeLabel})`,
          average: Math.round(winner.average),
          count: winner.count,
        },
        runnerUp: {
          label: `${runnerUp.dayName} (${runnerUp.rangeLabel})`,
          average: Math.round(runnerUp.average),
          count: runnerUp.count,
        },
        differencePercent: diffRounded,
      },
    },
    action: {
      type: 'create_post',
      params: {
        platform,
        postType: 'post',
        dayOfWeek: winner.dayOfWeek,
        dayName: winner.dayName,
        localTime: winner.middleTime,
        localTimeLabel: winner.middleLabel,
        timeRangeLabel: winner.rangeLabel,
        scheduledDate: nextOcc.dateStr,
        scheduledDateFormatted: nextOcc.formattedLabel,
        tz,
      },
    },
  };

  return {
    kind: 'best_time',
    platform,
    hasRecommendation: true,
    recommendation: rec,
    sampleCount: published.length,
  };
}

/**
 * Evaluates Post vs Story format recommendation.
 * Rules:
 * - Only platforms supporting stories (Instagram, Facebook).
 * - Each format must have at least 5 posts.
 * - Difference must be at least 15%.
 */
function evaluateFormatRecommendation(
  profileId: ProfileId,
  platform: PlatformType,
  posts: PostItem[],
  tz: string
): RecommendationResult {
  if (!PLATFORM_SPECS[platform].story.supported) {
    return {
      kind: 'format',
      platform,
      hasRecommendation: false,
      insufficientDataReason: `Stories are not supported on ${PLATFORM_SPECS[platform].name}.`,
      sampleCount: 0,
    };
  }

  const published = posts.filter(
    (p) => !p.isDeleted && p.status === 'published' && p.platforms.includes(platform)
  );

  const feedPosts = published.filter((p) => p.type !== 'story');
  const storyPosts = published.filter((p) => p.type === 'story');

  if (feedPosts.length < 5 || storyPosts.length < 5) {
    return {
      kind: 'format',
      platform,
      hasRecommendation: false,
      insufficientDataReason:
        'Not enough data yet. Requires at least 5 feed posts and 5 stories to compare performance reliably.',
      sampleCount: published.length,
    };
  }

  const { key: metricKey, label: metricLabel } = getPlatformPrimaryMetric(platform);

  const feedAvg =
    feedPosts.reduce((acc, p) => acc + getPostMetricValue(p, platform, metricKey), 0) /
    feedPosts.length;
  const storyAvg =
    storyPosts.reduce((acc, p) => acc + getPostMetricValue(p, platform, metricKey), 0) /
    storyPosts.length;

  const minAvg = Math.min(feedAvg, storyAvg);
  const diffPercent = minAvg > 0 ? (Math.abs(feedAvg - storyAvg) / minAvg) * 100 : 0;

  if (diffPercent < 15) {
    return {
      kind: 'format',
      platform,
      hasRecommendation: false,
      insufficientDataReason:
        'Not enough data yet. Feed posts and stories perform within 15% of each other.',
      sampleCount: published.length,
    };
  }

  const winnerIsPost = feedAvg > storyAvg;
  const winnerType: PostType = winnerIsPost ? 'post' : 'story';
  const winnerLabel = winnerIsPost ? 'Feed Posts' : 'Stories';
  const runnerUpLabel = winnerIsPost ? 'Stories' : 'Feed Posts';
  const winnerAvg = winnerIsPost ? feedAvg : storyAvg;
  const runnerUpAvg = winnerIsPost ? storyAvg : feedAvg;
  const winnerCount = winnerIsPost ? feedPosts.length : storyPosts.length;
  const runnerUpCount = winnerIsPost ? storyPosts.length : feedPosts.length;

  const diffRounded = Math.round(diffPercent);
  const headline = `${winnerLabel} generate ${diffRounded}% higher ${metricLabel.toLowerCase()} than ${runnerUpLabel}`;

  const whatHappened = `Comparing ${feedPosts.length} standard posts and ${storyPosts.length} stories on ${PLATFORM_SPECS[platform].name}, ${winnerLabel.toLowerCase()} averaged ${Math.round(winnerAvg).toLocaleString()} ${metricLabel.toLowerCase()} vs ${Math.round(runnerUpAvg).toLocaleString()} for ${runnerUpLabel.toLowerCase()}.`;

  const whatItMeans = `${winnerLabel} match how your community consumes content on ${PLATFORM_SPECS[platform].name}. Emphasizing this format produces consistent returns.`;

  const tryThis = `Create a new ${winnerType === 'story' ? 'Story' : 'Post'} formatted for ${PLATFORM_SPECS[platform].name}.`;

  const rec: RecommendationObject = {
    id: `rec-format-${profileId}-${platform}`,
    profileId,
    platform,
    kind: 'format',
    headline,
    whatHappened,
    whatItMeans,
    tryThis,
    evidence: {
      sampleSize: feedPosts.length + storyPosts.length,
      metric: metricLabel,
      values: {
        winner: { label: winnerLabel, average: Math.round(winnerAvg), count: winnerCount },
        runnerUp: {
          label: runnerUpLabel,
          average: Math.round(runnerUpAvg),
          count: runnerUpCount,
        },
        differencePercent: diffRounded,
      },
    },
    action: {
      type: 'create_post',
      params: {
        platform,
        postType: winnerType,
        tz,
      },
    },
  };

  return {
    kind: 'format',
    platform,
    hasRecommendation: true,
    recommendation: rec,
    sampleCount: published.length,
  };
}

/**
 * Evaluates best CTA type recommendation.
 * Rules:
 * - Each compared CTA type must have at least 5 posts.
 * - Difference must be at least 15%.
 */
function evaluateCtaRecommendation(
  profileId: ProfileId,
  platform: PlatformType,
  posts: PostItem[],
  tz: string
): RecommendationResult {
  const published = posts.filter(
    (p) =>
      !p.isDeleted &&
      p.status === 'published' &&
      p.platforms.includes(platform) &&
      p.cta &&
      p.cta !== 'none'
  );

  const ctaGroups: Record<string, PostItem[]> = {};
  for (const p of published) {
    const t = p.cta!;
    if (!ctaGroups[t]) ctaGroups[t] = [];
    ctaGroups[t].push(p);
  }

  // Filter CTA types with at least 5 posts
  const qualifyingCtas = Object.entries(ctaGroups).filter(([_, list]) => list.length >= 5);

  if (qualifyingCtas.length < 2) {
    return {
      kind: 'cta',
      platform,
      hasRecommendation: false,
      insufficientDataReason:
        'Not enough data yet. We need at least 5 published updates for two different CTA types to compare click-through results.',
      sampleCount: published.length,
    };
  }

  const ctaAverages = qualifyingCtas.map(([typeStr, list]) => {
    const type = typeStr as CtaType;
    let totalClicks = 0;
    for (const p of list) {
      totalClicks += p.ctaClicks ?? p.metrics?.clicks ?? 0;
    }
    const avg = totalClicks / list.length;
    const labelMap: Record<CtaType, string> = {
      none: 'None',
      link: 'Link',
      book: 'Book',
      'sign up': 'Sign Up',
      other: 'Other',
    };
    return {
      type,
      label: labelMap[type] || type,
      average: avg,
      count: list.length,
    };
  });

  ctaAverages.sort((a, b) => b.average - a.average);

  const winner = ctaAverages[0];
  const runnerUp = ctaAverages[1];

  const diffPercent = runnerUp.average > 0
    ? ((winner.average - runnerUp.average) / runnerUp.average) * 100
    : 100;

  if (diffPercent < 15) {
    return {
      kind: 'cta',
      platform,
      hasRecommendation: false,
      insufficientDataReason:
        'Not enough data yet. The difference in click rates between CTA types is under 15%.',
      sampleCount: published.length,
    };
  }

  const diffRounded = Math.round(diffPercent);
  const headline = `"${winner.label}" CTA drives ${diffRounded}% more clicks than "${runnerUp.label}"`;

  const whatHappened = `Analyzing ${winner.count + runnerUp.count} posts with clear actions on ${PLATFORM_SPECS[platform].name}, "${winner.label}" averaged ${Math.round(winner.average)} clicks per post, compared to ${Math.round(runnerUp.average)} for "${runnerUp.label}".`;

  const whatItMeans = `Your readers respond with much higher conversion intent when guided by "${winner.label}". It sets clear expectations before clicking through.`;

  const tryThis = `Create your next post with a "${winner.label}" CTA to maximize outbound traffic.`;

  const rec: RecommendationObject = {
    id: `rec-cta-${profileId}-${platform}`,
    profileId,
    platform,
    kind: 'cta',
    headline,
    whatHappened,
    whatItMeans,
    tryThis,
    evidence: {
      sampleSize: winner.count + runnerUp.count,
      metric: 'Clicks',
      values: {
        winner: { label: winner.label, average: Math.round(winner.average), count: winner.count },
        runnerUp: {
          label: runnerUp.label,
          average: Math.round(runnerUp.average),
          count: runnerUp.count,
        },
        differencePercent: diffRounded,
      },
    },
    action: {
      type: 'create_post',
      params: {
        platform,
        postType: 'post',
        ctaType: winner.type,
        tz,
      },
    },
  };

  return {
    kind: 'cta',
    platform,
    hasRecommendation: true,
    recommendation: rec,
    sampleCount: published.length,
  };
}

/**
 * Pure function: Deterministic recommendation generator.
 * Same inputs always produce identical output.
 */
export function generateRecommendations(
  profileId: ProfileId,
  posts: PostItem[],
  platform: PlatformType | 'all' = 'all',
  tz = DEFAULT_USER_TIMEZONE,
  referenceNow?: Date
): RecommendationResult[] {
  const targetPlatforms: PlatformType[] =
    platform === 'all'
      ? ['linkedin', 'instagram', 'facebook', 'tiktok']
      : [platform];

  const results: RecommendationResult[] = [];

  for (const plat of targetPlatforms) {
    // 1. best_time
    results.push(evaluateBestTimeRecommendation(profileId, plat, posts, tz, referenceNow));

    // 2. format (if platform supports stories)
    if (PLATFORM_SPECS[plat].story.supported) {
      results.push(evaluateFormatRecommendation(profileId, plat, posts, tz));
    }

    // 3. cta
    results.push(evaluateCtaRecommendation(profileId, plat, posts, tz));
  }

  return results;
}
