import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Plus,
  History,
  Trash2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { ChatMessage, PlatformType } from '../../types';

interface ClawedChatViewProps {
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export const ClawedChatView: React.FC<ClawedChatViewProps> = () => {
  const {
    activeProfile,
    profileMeta,
    chatMessages,
    chatSessions,
    currentChatId,
    startNewChat,
    switchChatSession,
    deleteChatSession,
    sendChatMessage,
    approvePendingChatAction,
    cancelPendingChatAction,
    openStatusLogDrawerForPost,
    setActiveNav,
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    if (historyOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [historyOpen]);

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    sendChatMessage(inputPrompt.trim());
    setInputPrompt('');
  };

  // 3 Clickable Example Prompts Only
  const examplePrompts = [
    'What is currently scheduled?',
    'Why did the last dispatch fail?',
    'Schedule this for tomorrow at 10 AM',
  ];

  const getToolSummaryLabel = (toolName: string): string => {
    switch (toolName) {
      case 'query_scheduled_dispatches':
        return 'Checked scheduled posts';
      case 'inspect_failed_worker_traces':
        return 'Checked failed jobs';
      case 'stage_immediate_publish':
        return 'Prepared immediate publish';
      case 'stage_reschedule':
        return 'Prepared reschedule';
      case 'stage_cancellation':
        return 'Prepared cancellation';
      case 'create_draft_release':
      case 'create_persona_draft':
        return 'Created draft';
      default:
        return `Ran ${toolName.replace(/_/g, ' ')}`;
    }
  };

  const renderPlatformBadge = (platform: PlatformType) => {
    const names: Record<PlatformType, string> = {
      linkedin: 'LinkedIn',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
    };
    return (
      <span
        key={platform}
        className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
      >
        {names[platform]}
      </span>
    );
  };

  const currentSession = chatSessions.find((s) => s.id === currentChatId);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* 1. Fixed Header with "New chat" button and previous chats history dropdown */}
      <header
        className="shrink-0 h-14 border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between bg-[var(--bg)] z-30"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-[var(--text)] tracking-tight">Clawed</h1>
          <span className="text-[11px] font-mono text-[var(--muted)] hidden sm:inline">
            • {currentSession?.title || 'Active chat'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous chats history dropdown */}
          <div className="relative" ref={historyRef}>
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] text-xs text-[var(--text)] transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span className="hidden sm:inline">History</span>
              <span className="text-[10px] text-[var(--muted)] font-mono">({chatSessions.length})</span>
              <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
            </button>

            {historyOpen && (
              <div className="absolute right-0 mt-2 w-64 p-2 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-xl z-50 text-xs space-y-1 animate-in fade-in duration-150">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)]">
                  Previous Chats
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
                  {chatSessions.map((session) => {
                    const isSelected = session.id === currentChatId;
                    return (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-[var(--surface)] text-[var(--text)] font-semibold'
                            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
                        }`}
                        onClick={() => {
                          switchChatSession(session.id);
                          setHistoryOpen(false);
                        }}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate text-xs">{session.title}</p>
                          <p className="text-[10px] text-[var(--muted)]">{session.createdAt}</p>
                        </div>
                        {chatSessions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(session.id);
                            }}
                            className="p-1 rounded text-[var(--muted)] hover:text-[var(--status-danger)] transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* New chat button */}
          <Button
            variant="outline"
            size="sm"
            onClick={startNewChat}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            New chat
          </Button>
        </div>
      </header>

      {/* 2. Message Area (Scrolls by itself, Centered max ~720px) */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[720px] mx-auto w-full space-y-6">
          {chatMessages.length === 0 ? (
            /* Short Empty State with 3 Clickable Example Prompts Only */
            <div className="py-24 text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto text-xs font-bold text-[var(--text)]">
                CL
              </div>
              <p className="text-xs text-[var(--muted)]">Ask Clawed to check schedules, investigate errors, or prepare releases.</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendChatMessage(prompt)}
                    className="text-xs px-3.5 py-2 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--border)]/30 text-[var(--text)] transition-colors cursor-pointer text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              const toolOpen = !!expandedTools[msg.id];

              if (isUser) {
                return (
                  /* User message: Right-aligned bubble with neutral colors */
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] text-sm shadow-xs">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              }

              return (
                /* Clawed reply: Plain text without a bubble, neutral colors */
                <div key={msg.id} className="space-y-3.5 text-sm">
                  {/* Plain text body */}
                  <div className="leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                    {msg.text}
                  </div>

                  {/* Compact Tool Call Line with chevron */}
                  {msg.toolCall && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => toggleTool(msg.id)}
                        className="w-full flex items-center justify-between p-2.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                      >
                        <span className="font-medium text-[var(--text)]">
                          {getToolSummaryLabel(msg.toolCall.toolName)}
                        </span>
                        {toolOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {toolOpen && (
                        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] space-y-2 text-xs">
                          {msg.toolCall.result &&
                          typeof msg.toolCall.result === 'object' &&
                          'dispatches' in (msg.toolCall.result as Record<string, unknown>) ? (
                            <div className="space-y-1.5">
                              {((msg.toolCall.result as { dispatches: Array<{ title: string; scheduledFor?: string; platforms: PlatformType[] }> }).dispatches || []).map(
                                (d, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <p className="font-semibold text-[var(--text)] truncate">
                                        {d.title}
                                      </p>
                                      <p className="text-[11px] text-[var(--muted)]">
                                        {d.scheduledFor || 'Scheduled slot'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {d.platforms.map(renderPlatformBadge)}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : msg.toolCall.result &&
                            typeof msg.toolCall.result === 'object' &&
                            'failures' in (msg.toolCall.result as Record<string, unknown>) ? (
                            <div className="space-y-2">
                              {((msg.toolCall.result as { failures: Array<{ title: string; error: string; id?: string }> }).failures || []).map(
                                (f, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-lg bg-[var(--bg)] border border-[rgba(214,69,69,0.3)] text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-semibold text-[var(--text)]">{f.title}</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openStatusLogDrawerForPost(f.id || 'post-failed-1');
                                          setActiveNav('logs');
                                        }}
                                        className="text-[11px] text-[var(--accent-text)] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                                      >
                                        <span>View in Status log</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-[var(--status-danger)]">{f.error}</p>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--muted)]">
                              Completed successfully.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Confirmation Card for publish, reschedule or cancel */}
                  {msg.pendingConfirmation && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3 text-xs shadow-xs">
                      <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
                        <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] shrink-0" />
                        <span>Confirm action</span>
                      </div>

                      <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1 text-xs text-[var(--muted)]">
                        <p>
                          Profile:{' '}
                          <strong className="text-[var(--text)]">
                            {msg.pendingConfirmation.profile === 'company' ? 'Ontilus' : 'Aria Tan'}
                          </strong>
                          {msg.pendingConfirmation.profileSourceNote && (
                            <span className="text-[11px] text-[var(--muted)] font-normal ml-1.5">
                              {msg.pendingConfirmation.profileSourceNote}
                            </span>
                          )}
                        </p>
                        <p>
                          Platforms:{' '}
                          <span className="text-[var(--text)]">
                            {msg.pendingConfirmation.platforms.join(', ')}
                          </span>
                        </p>
                        <p>
                          Time:{' '}
                          <span className="text-[var(--text)] font-semibold">
                            {msg.pendingConfirmation.scheduledTime}
                          </span>
                        </p>
                      </div>

                      {msg.pendingConfirmation.resolved ? (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          {msg.pendingConfirmation.resolved === 'approved' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                              <span className="text-[var(--status-success)] font-semibold">
                                Confirmed and executed.
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-[var(--muted)]" />
                              <span>Cancelled.</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => cancelPendingChatAction(msg.id)}
                            className="px-3.5 py-1.5 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => approvePendingChatAction(msg.id)}
                            className="px-4 py-1.5 rounded-full bg-[var(--text)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3. Input Pinned at Bottom with Send Button */}
      <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)]/60 p-4">
        <form
          onSubmit={handleSend}
          className="max-w-[720px] mx-auto w-full flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Type a message or instruction..."
            className="input-base flex-1 text-sm h-10"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!inputPrompt.trim()}
            className="h-10 px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
};
