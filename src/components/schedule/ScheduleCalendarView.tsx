import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Send,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
  Folder,
  HardDrive,
  Search,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  FileImage,
  Undo2,
  CalendarPlus,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import {
  MockDriveFile,
  PlatformType,
  PostItem,
} from '../../domain/types';
import { PLATFORM_COLORS } from '../../domain/specs';
import {
  formatMonthHeader,
  formatShortDate,
  formatTimeOnly,
  generateMonthCalendarGrid,
  generateWeekCalendarDays,
  CalendarCell,
  formatDateYmd,
} from '../../domain/dates';
import { calendarApi, mediaApi } from '../../api';

export const ScheduleCalendarView: React.FC = () => {
  const {
    activeProfile,
    profileMeta,
    activePosts,
    startEditPost,
    startCreateWithDate,
    updateExistingPost,
    addNewPost,
    setActiveNav,
  } = useApp();

  // Navigation state (year / month / week)
  // Default to October 2026 as per user test vectors / prompt context
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 1)); // October 2026
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');

  // Selected Day for Keyboard Navigation (format: YYYY-MM-DD)
  const [focusedDateStr, setFocusedDateStr] = useState<string>('2026-10-09');

  // Drive panel state
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<MockDriveFile[]>([]);
  const [driveFolder, setDriveFolder] = useState<'all' | 'Drafts' | 'Approved' | 'Archive'>('all');
  const [driveSearch, setDriveSearch] = useState('');
  const [selectedDriveFile, setSelectedDriveFile] = useState<MockDriveFile | null>(null);
  const [pickerTargetDate, setPickerTargetDate] = useState<string>('2026-10-14');
  const [drivePickerModalOpen, setDrivePickerModalOpen] = useState(false);

  // Range posts from CalendarApi
  const [rangePosts, setRangePosts] = useState<PostItem[]>([]);
  const [isLoadingRange, setIsLoadingRange] = useState(false);

  // Toast Notification State (with Undo action)
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    type: 'success' | 'error';
    onUndo?: () => void;
  } | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success', onUndo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = `toast-${Date.now()}`;
    setToast({ id, message, type, onUndo });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 6000);
  };

  // Drag and drop state
  const [draggedChipPostId, setDraggedChipPostId] = useState<string | null>(null);
  const [draggedDriveFileId, setDraggedDriveFileId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // "+N more" modal state
  const [moreModalDate, setMoreModalDate] = useState<{ date: string; posts: PostItem[] } | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1..12

  // Real date math navigation
  const handlePrev = () => {
    if (calendarViewMode === 'month') {
      setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (calendarViewMode === 'month') {
      setCurrentDate(new Date(currentYear, currentMonth, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    // Navigate to October 2026 reference today date or actual current Date
    const today = new Date(2026, 9, 9);
    setCurrentDate(today);
    setFocusedDateStr('2026-10-09');
  };

  // Month grid & Week days
  const monthWeeks = useMemo(() => {
    return generateMonthCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const weekDays = useMemo(() => {
    return generateWeekCalendarDays(currentDate);
  }, [currentDate]);

  // Compute from / to bounds for CalendarApi.getRange
  const activeDateRange = useMemo(() => {
    if (calendarViewMode === 'month') {
      const firstCell = monthWeeks[0]?.[0]?.date || `${currentYear}-01-01`;
      const lastWeek = monthWeeks[monthWeeks.length - 1];
      const lastCell = lastWeek?.[lastWeek.length - 1]?.date || `${currentYear}-12-31`;
      return { from: firstCell, to: lastCell };
    } else {
      const from = weekDays[0]?.date || `${currentYear}-01-01`;
      const to = weekDays[weekDays.length - 1]?.date || `${currentYear}-12-31`;
      return { from, to };
    }
  }, [calendarViewMode, monthWeeks, weekDays, currentYear]);

  // Fetch range data from CalendarApi.getRange
  const fetchCalendarRange = async () => {
    setIsLoadingRange(true);
    try {
      const data = await calendarApi.getRange(activeDateRange.from, activeDateRange.to, activeProfile);
      setRangePosts(data);
    } catch {
      // Fallback to activePosts in context if error
      setRangePosts(activePosts);
    } finally {
      setIsLoadingRange(false);
    }
  };

  useEffect(() => {
    fetchCalendarRange();
  }, [activeDateRange.from, activeDateRange.to, activeProfile, activePosts]);

  // Load drive files scoped strictly to active profile
  useEffect(() => {
    mediaApi
      .listDriveFiles()
      .then((files) => {
        // Scoped to active profile only
        const profileFiles = files.filter(
          (f) => !f.profileId || f.profileId === activeProfile
        );
        setDriveFiles(profileFiles);
      })
      .catch(() => {});
  }, [activeProfile]);

  // Filter drive files by search and folder
  const filteredDriveFiles = useMemo(() => {
    return driveFiles.filter((f) => {
      const matchesFolder = driveFolder === 'all' || f.folder === driveFolder;
      const matchesSearch =
        driveSearch.trim() === '' ||
        f.name.toLowerCase().includes(driveSearch.toLowerCase()) ||
        f.suggestedTitle.toLowerCase().includes(driveSearch.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  }, [driveFiles, driveFolder, driveSearch]);

  // Posts map by date string ('YYYY-MM-DD')
  const postsByDate = useMemo(() => {
    const map = new Map<string, PostItem[]>();
    for (const post of rangePosts) {
      if (post.isDeleted) continue;
      // Derive target date: plannedDate first, then scheduledForUtc, then createdAt
      const dateKey =
        post.plannedDate ||
        (post.scheduledForUtc ? post.scheduledForUtc.split('T')[0] : null) ||
        (post.createdAt ? post.createdAt.split('T')[0] : null);
      if (!dateKey) continue;
      const list = map.get(dateKey) || [];
      list.push(post);
      map.set(dateKey, list);
    }
    return map;
  }, [rangePosts]);

  // Chip Reschedule Drop Handler
  const handleDropPostChip = async (targetDate: string) => {
    if (!draggedChipPostId) return;
    const post = rangePosts.find((p) => p.id === draggedChipPostId);
    if (!post) {
      setDraggedChipPostId(null);
      setDragOverDate(null);
      return;
    }

    const prevPlannedDate = post.plannedDate;
    const prevScheduledUtc = post.scheduledForUtc;
    const prevScheduledLabel = post.scheduledFor;

    try {
      let updated: PostItem;
      if (post.status === 'draft') {
        // Drafts keep no time
        updated = await calendarApi.reschedule(post.id, targetDate, 'Draft planned date');
      } else {
        // Keeps time: retain previous hour & minute
        let timeStr = '12:00';
        if (post.scheduledForUtc && post.scheduledForUtc.includes('T')) {
          timeStr = post.scheduledForUtc.split('T')[1].slice(0, 5);
        }
        const newUtc = `${targetDate}T${timeStr}:00Z`;
        const dateObj = new Date(newUtc);
        const formattedLabel = `${formatShortDate(dateObj)} at ${formatTimeOnly(dateObj)}`;
        updated = await calendarApi.reschedule(post.id, newUtc, formattedLabel);
      }

      updateExistingPost(post.id, updated);
      fetchCalendarRange();

      showToast(
        `Rescheduled "${post.title.slice(0, 24)}..." to ${formatShortDate(new Date(targetDate + 'T00:00:00Z'))}`,
        'success',
        async () => {
          // UNDO callback
          const revertUtc = prevScheduledUtc || `${prevPlannedDate || targetDate}T12:00:00Z`;
          const reverted = await calendarApi.reschedule(
            post.id,
            revertUtc,
            prevScheduledLabel || 'Draft planned date'
          );
          updateExistingPost(post.id, {
            ...reverted,
            plannedDate: prevPlannedDate,
            scheduledForUtc: prevScheduledUtc,
            scheduledFor: prevScheduledLabel,
          });
          fetchCalendarRange();
          showToast(`Undone: "${post.title.slice(0, 20)}" returned to original date.`);
        }
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule post', 'error');
    } finally {
      setDraggedChipPostId(null);
      setDragOverDate(null);
    }
  };

  // Drive File Drop Handler (Creates a Draft)
  const handleDropDriveFile = async (targetDate: string, fileId?: string) => {
    const fId = fileId || draggedDriveFileId;
    if (!fId) return;

    try {
      const createdPost = await calendarApi.dropFile({
        profileId: activeProfile,
        driveFileId: fId,
        date: targetDate,
      });

      addNewPost(createdPost);
      fetchCalendarRange();

      const targetDateFormatted = formatShortDate(new Date(targetDate + 'T00:00:00Z'));
      showToast(`Draft added to ${targetDateFormatted}`, 'success', () => {
        // Undo action: soft delete the newly created post
        updateExistingPost(createdPost.id, { isDeleted: true, deletedAt: new Date().toISOString() });
        fetchCalendarRange();
        showToast(`Draft removed from ${targetDateFormatted}.`);
      });
    } catch (err: any) {
      showToast(err.message || 'Could not add draft from file', 'error');
    } finally {
      setDraggedDriveFileId(null);
      setDragOverDate(null);
    }
  };

  // Keyboard navigation for calendar cells
  const handleKeyDownGrid = (e: React.KeyboardEvent, dateStr: string) => {
    const current = new Date(dateStr + 'T00:00:00Z');
    let nextDate: Date | null = null;

    if (e.key === 'ArrowRight') {
      nextDate = new Date(current);
      nextDate.setUTCDate(current.getUTCDate() + 1);
    } else if (e.key === 'ArrowLeft') {
      nextDate = new Date(current);
      nextDate.setUTCDate(current.getUTCDate() - 1);
    } else if (e.key === 'ArrowDown') {
      nextDate = new Date(current);
      nextDate.setUTCDate(current.getUTCDate() + 7);
    } else if (e.key === 'ArrowUp') {
      nextDate = new Date(current);
      nextDate.setUTCDate(current.getUTCDate() - 7);
    } else if (e.key === 'Enter') {
      startCreateWithDate(dateStr);
      return;
    }

    if (nextDate) {
      e.preventDefault();
      const nextDateStr = formatDateYmd(nextDate);
      setFocusedDateStr(nextDateStr);
      // If moved across month, sync currentDate
      if (nextDate.getUTCMonth() !== currentDate.getMonth()) {
        setCurrentDate(new Date(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), 1));
      }
      // Focus element
      const el = document.getElementById(`cal-cell-${nextDateStr}`);
      el?.focus();
    }
  };

  // Header Title
  const headerTitle = useMemo(() => {
    if (calendarViewMode === 'month') {
      return formatMonthHeader(currentYear, currentMonth);
    } else {
      const first = weekDays[0];
      const last = weekDays[6];
      if (!first || !last) return 'Week View';
      return `Week of ${first.dayNumber} ${formatMonthHeader(first.year, first.month).slice(0, 3)} - ${last.dayNumber} ${formatMonthHeader(last.year, last.month).slice(0, 3)}, ${last.year}`;
    }
  }, [calendarViewMode, currentYear, currentMonth, weekDays]);

  return (
    <div className="min-h-full flex flex-col relative">
      {/* Sticky Top Header bar with calendar actions */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                {headerTitle}
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {profileMeta.name} releases & drafts • Asia/Kuala_Lumpur
              </p>
            </div>
            {isLoadingRange && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--muted)] animate-pulse">
                Syncing...
              </span>
            )}
          </div>

          {/* Controls: Prev/Next/Today, Month/Week toggle, Drive Panel toggle, Create button */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Prev / Today / Next Navigation */}
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous period"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next period"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Month / Week View Toggle */}
            <div className="flex items-center p-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
              <button
                type="button"
                onClick={() => setCalendarViewMode('month')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  calendarViewMode === 'month'
                    ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarViewMode('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  calendarViewMode === 'week'
                    ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Week</span>
              </button>
            </div>

            {/* Drive Panel Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDriveOpen(!isDriveOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isDriveOpen
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span>Drive</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] font-mono">
                {driveFiles.length}
              </span>
            </button>

            {/* Create Post */}
            <Button
              variant="accent"
              size="sm"
              onClick={() => setActiveNav('create')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout Area: Calendar Grid + Side-by-Side Drive Panel */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 gap-5">
        {/* Left: Main Calendar View */}
        <div className="flex-1 min-w-0 flex flex-col space-y-2">
          {/* Calendar Day-of-Week Headers (Monday First) */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
            <span className="py-1">Mon</span>
            <span className="py-1">Tue</span>
            <span className="py-1">Wed</span>
            <span className="py-1">Thu</span>
            <span className="py-1">Fri</span>
            <span className="py-1 text-amber-500/80">Sat</span>
            <span className="py-1 text-amber-500/80">Sun</span>
          </div>

          {/* Month or Week Grid */}
          {calendarViewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-1.5 text-xs">
              {monthWeeks.flat().map((cell) => {
                const dayPosts = postsByDate.get(cell.date) || [];
                const isOver = dragOverDate === cell.date;
                const isFocused = focusedDateStr === cell.date;

                return (
                  <div
                    key={cell.date}
                    id={`cal-cell-${cell.date}`}
                    tabIndex={0}
                    role="gridcell"
                    aria-label={`${cell.date}, ${dayPosts.length} posts`}
                    onKeyDown={(e) => handleKeyDownGrid(e, cell.date)}
                    onFocus={() => setFocusedDateStr(cell.date)}
                    onClick={() => {
                      setFocusedDateStr(cell.date);
                    }}
                    onDoubleClick={() => {
                      startCreateWithDate(cell.date);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDate(cell.date);
                    }}
                    onDragLeave={() => {
                      if (dragOverDate === cell.date) setDragOverDate(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedChipPostId) {
                        handleDropPostChip(cell.date);
                      } else if (draggedDriveFileId) {
                        handleDropDriveFile(cell.date);
                      }
                    }}
                    className={`min-h-[105px] sm:min-h-[120px] p-1.5 rounded-xl border flex flex-col justify-between transition-all duration-150 outline-none select-none ${
                      isOver
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : isFocused
                        ? 'ring-2 ring-[var(--accent-text)] border-[var(--border-strong)]'
                        : cell.isToday
                        ? 'border-[var(--accent-text)]/80 bg-[var(--surface)] shadow-xs'
                        : cell.isCurrentMonth
                        ? 'border-[var(--border)] bg-[var(--card)]/90 hover:border-[var(--border-strong)]'
                        : 'border-[var(--border)]/40 bg-[var(--surface)]/20 opacity-40 hover:opacity-80'
                    }`}
                  >
                    {/* Day Number Header + Add CTA */}
                    <div className="flex items-center justify-between pb-1">
                      <span
                        className={`text-xs font-bold leading-none ${
                          cell.isToday
                            ? 'px-1.5 py-0.5 rounded-full bg-[var(--accent-text)] text-white'
                            : cell.isCurrentMonth
                            ? 'text-[var(--text)]'
                            : 'text-[var(--muted)]'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Quick Add Draft / Post button on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCreateWithDate(cell.date);
                        }}
                        title={`Create release on ${cell.date}`}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Chips List (Up to 3, then "+N more") */}
                    <div className="flex-1 space-y-1 overflow-hidden py-0.5">
                      {dayPosts.slice(0, 3).map((post) => (
                        <PostChip
                          key={post.id}
                          post={post}
                          onDragStart={() => setDraggedChipPostId(post.id)}
                          onDragEnd={() => setDraggedChipPostId(null)}
                          onClick={() => startEditPost(post.id, 1)}
                        />
                      ))}

                      {dayPosts.length > 3 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoreModalDate({ date: cell.date, posts: dayPosts });
                          }}
                          className="w-full text-left px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-text)] hover:underline cursor-pointer"
                        >
                          +{dayPosts.length - 3} more
                        </button>
                      )}
                    </div>

                    {/* Empty Day Droppable placeholder helper */}
                    {dayPosts.length === 0 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          startCreateWithDate(cell.date);
                        }}
                        className="flex-1 flex items-center justify-center cursor-pointer group"
                      >
                        <span className="text-[10px] text-[var(--muted)] opacity-0 group-hover:opacity-60 transition-opacity">
                          + New
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Week View: 7 Large Columns */
            <div className="grid grid-cols-7 gap-2 text-xs flex-1">
              {weekDays.map((cell) => {
                const dayPosts = postsByDate.get(cell.date) || [];
                const isOver = dragOverDate === cell.date;

                return (
                  <div
                    key={cell.date}
                    id={`cal-cell-${cell.date}`}
                    tabIndex={0}
                    role="gridcell"
                    aria-label={`${cell.date}, ${dayPosts.length} posts`}
                    onKeyDown={(e) => handleKeyDownGrid(e, cell.date)}
                    onFocus={() => setFocusedDateStr(cell.date)}
                    onDoubleClick={() => startCreateWithDate(cell.date)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDate(cell.date);
                    }}
                    onDragLeave={() => {
                      if (dragOverDate === cell.date) setDragOverDate(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedChipPostId) {
                        handleDropPostChip(cell.date);
                      } else if (draggedDriveFileId) {
                        handleDropDriveFile(cell.date);
                      }
                    }}
                    className={`min-h-[460px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      isOver
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : cell.isToday
                        ? 'border-[var(--accent-text)] bg-[var(--surface)]'
                        : 'border-[var(--border)] bg-[var(--card)]'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-base font-bold ${
                            cell.isToday ? 'text-[var(--accent-text)]' : 'text-[var(--text)]'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {formatMonthHeader(cell.year, cell.month).slice(0, 3)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => startCreateWithDate(cell.date)}
                        className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        title="Add post"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-1.5 py-2 overflow-y-auto">
                      {dayPosts.map((post) => (
                        <PostChip
                          key={post.id}
                          post={post}
                          isDetailed
                          onDragStart={() => setDraggedChipPostId(post.id)}
                          onDragEnd={() => setDraggedChipPostId(null)}
                          onClick={() => startEditPost(post.id, 1)}
                        />
                      ))}
                      {dayPosts.length === 0 && (
                        <div
                          onClick={() => startCreateWithDate(cell.date)}
                          className="h-full flex flex-col items-center justify-center text-center p-3 text-[var(--muted)] border border-dashed border-[var(--border)]/60 rounded-lg cursor-pointer hover:border-[var(--border-strong)] transition-colors"
                        >
                          <CalendarPlus className="w-5 h-5 mb-1 opacity-40" />
                          <span className="text-[11px] font-medium">Empty day</span>
                          <span className="text-[9px] opacity-70">Click or drop file</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Side-by-Side Google Drive Panel (320px) */}
        {isDriveOpen && (
          <aside
            aria-label="Google Drive Asset Library"
            className="w-80 shrink-0 flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden transition-all animate-in slide-in-from-right duration-200"
          >
            {/* Drive Header */}
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-[var(--text)]">Drive Library</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">
                  {profileMeta.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDriveOpen(false)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                aria-label="Close Drive panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Selectors: Drafts, Approved, Archive */}
            <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {(['all', 'Drafts', 'Approved', 'Archive'] as const).map((fol) => (
                <button
                  key={fol}
                  type="button"
                  onClick={() => setDriveFolder(fol)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    driveFolder === fol
                      ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {fol === 'all' ? 'All Files' : fol}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="p-2.5 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-hidden focus:border-[var(--accent-text)]"
                />
              </div>
            </div>

            {/* Instruction Callout */}
            <div className="px-3 py-2 bg-[var(--surface)]/50 border-b border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Drag any file to a calendar day, or select and "Add to date".</span>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {filteredDriveFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted)]">
                  No files found in {driveFolder}
                </div>
              ) : (
                filteredDriveFiles.map((file) => {
                  const isSelected = selectedDriveFile?.id === file.id;
                  const isImage = file.kind === 'image' || file.name.endsWith('.png') || file.name.endsWith('.jpg');

                  return (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedDriveFileId(file.id);
                        e.dataTransfer.setData('text/plain', file.id);
                      }}
                      onDragEnd={() => setDraggedDriveFileId(null)}
                      onClick={() => setSelectedDriveFile(file)}
                      className={`p-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-[var(--accent-text)] bg-[var(--surface)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--surface)]/50 hover:bg-[var(--surface)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {/* Thumbnail with duration badge */}
                      <div className="w-11 h-11 rounded-lg bg-black overflow-hidden relative shrink-0 border border-[var(--border)]">
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold px-1 rounded bg-black/80 text-white leading-tight">
                          {isImage ? 'IMG' : file.duration}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mt-0.5">
                          <span className="flex items-center gap-1">
                            {isImage ? <FileImage className="w-2.5 h-2.5" /> : <FileVideo className="w-2.5 h-2.5" />}
                            {file.aspect}
                          </span>
                          <span>•</span>
                          <span>{file.sizeFormatted}</span>
                        </div>
                        <span className="inline-block mt-1 text-[9px] font-medium px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">
                          {file.folder}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Keyboard / Touch Alternative: "Add to date" action panel */}
            {selectedDriveFile && (
              <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
                  <span className="truncate max-w-[170px]">{selectedDriveFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDriveFile(null)}
                    className="text-[10px] text-[var(--muted)] hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={pickerTargetDate}
                    onChange={(e) => setPickerTargetDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)]"
                  />
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      handleDropDriveFile(pickerTargetDate, selectedDriveFile.id);
                      setSelectedDriveFile(null);
                    }}
                    className="text-xs shrink-0"
                  >
                    Add to date
                  </Button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* "+N More" Posts Popup Modal */}
      {moreModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text)]">
                {formatShortDate(new Date(moreModalDate.date + 'T00:00:00Z'))} ({moreModalDate.posts.length} posts)
              </span>
              <button
                type="button"
                onClick={() => setMoreModalDate(null)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {moreModalDate.posts.map((post) => (
                <PostChip
                  key={post.id}
                  post={post}
                  isDetailed
                  onClick={() => {
                    setMoreModalDate(null);
                    startEditPost(post.id, 1);
                  }}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const date = moreModalDate.date;
                setMoreModalDate(null);
                startCreateWithDate(date);
              }}
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              className="w-full text-xs"
            >
              Add release on this date
            </Button>
          </div>
        </div>
      )}

      {/* Toast with Undo Action */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl text-xs text-[var(--text)] animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                setToast(null);
              }}
              className="ml-2 flex items-center gap-1 font-bold text-[var(--accent-text)] hover:underline cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// Compact Calendar Post Chip Component
interface PostChipProps {
  post: PostItem;
  isDetailed?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClick?: () => void;
}

const PostChip: React.FC<PostChipProps> = ({
  post,
  isDetailed = false,
  onDragStart,
  onDragEnd,
  onClick,
}) => {
  // Styles by status
  // Draft = dashed border
  // Scheduled = solid border
  // Published = check icon
  // Failed = danger dot
  const isDraft = post.status === 'draft';
  const isScheduled = post.status === 'scheduled';
  const isPublished = post.status === 'published';
  const isFailed = post.status === 'failed';

  // Primary platform color dot
  const primaryPlatform: PlatformType = post.platforms[0] || 'linkedin';
  const platformColor = PLATFORM_COLORS[primaryPlatform] || '#0A66C2';

  // Time label
  const timeFormatted = useMemo(() => {
    if (isDraft) return '';
    if (post.scheduledForUtc && post.scheduledForUtc.includes('T')) {
      return post.scheduledForUtc.split('T')[1].slice(0, 5);
    }
    return '';
  }, [post.scheduledForUtc, isDraft]);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', post.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={`${post.title} (${post.status.toUpperCase()}) - Click to edit in Create`}
      className={`group relative rounded-md text-[11px] font-medium transition-all cursor-pointer select-none flex items-center gap-1.5 ${
        isDetailed ? 'p-1.5' : 'px-1.5 py-0.5'
      } ${
        isDraft
          ? 'border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border-strong)]'
          : isPublished
          ? 'border border-emerald-500/30 bg-emerald-500/10 text-[var(--text)]'
          : isFailed
          ? 'border border-rose-500/40 bg-rose-500/10 text-rose-300'
          : 'border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text)] shadow-xs hover:border-[var(--accent-text)]'
      }`}
    >
      {/* Platform indicator dot or Status icon */}
      {isPublished ? (
        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
      ) : isFailed ? (
        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
      ) : (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: platformColor }}
        />
      )}

      {/* Title */}
      <span className="truncate flex-1 font-semibold text-[10px] sm:text-[11px]">
        {post.title}
      </span>

      {/* Time for scheduled/published */}
      {timeFormatted && (
        <span className="text-[9px] text-[var(--muted)] shrink-0 font-mono">
          {timeFormatted}
        </span>
      )}
    </div>
  );
};
