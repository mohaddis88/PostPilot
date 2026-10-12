import React, { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Key,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { StatusPill } from '../common/StatusPill';
import { CompanyLogo } from '../common/CompanyLogo';
import { AccountConnection, PlatformType } from '../../types';

export const AccountsView: React.FC = () => {
  const {
    activeProfile,
    profileMeta,
    activeAccounts,
    reconnectAccount,
    disconnectAccount,
    connectAccount,
    showConfirmModal,
  } = useApp();

  // Mock OAuth Flow Modal state
  const [oauthModalAccount, setOauthModalAccount] = useState<AccountConnection | null>(null);
  const [oauthStep, setOauthStep] = useState<'consent' | 'authorizing' | 'success'>('consent');
  const [customHandleInput, setCustomHandleInput] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);

  const startOAuthFlow = (account: AccountConnection) => {
    setOauthModalAccount(account);
    setOauthStep('consent');
    setCustomHandleInput(account.accountHandle);
    setOauthError(null);
  };

  const handleAuthorizeOAuth = () => {
    if (!oauthModalAccount) return;
    setOauthStep('authorizing');
    setOauthError(null);

    setTimeout(() => {
      const res = connectAccount(
        oauthModalAccount.platform,
        customHandleInput || oauthModalAccount.accountHandle,
        activeProfile
      );

      if (!res.success) {
        setOauthError(res.error || 'Connection failed.');
        setOauthStep('consent');
        return;
      }

      setOauthStep('success');
      setTimeout(() => {
        setOauthModalAccount(null);
      }, 1000);
    }, 800);
  };

  const renderPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'linkedin':
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
            style={{ backgroundColor: 'var(--p-linkedin-tint)', color: 'var(--p-linkedin)' }}
          >
            in
          </div>
        );
      case 'instagram':
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
            style={{ backgroundColor: 'var(--p-instagram-tint)', color: 'var(--p-instagram)' }}
          >
            ig
          </div>
        );
      case 'tiktok':
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
            style={{ backgroundColor: 'var(--p-tiktok-tint)', color: 'var(--p-tiktok)' }}
          >
            tt
          </div>
        );
      case 'facebook':
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
            style={{ backgroundColor: 'var(--p-facebook-tint)', color: 'var(--p-facebook)' }}
          >
            fb
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-[var(--surface)] text-[var(--accent-text)] flex items-center justify-center font-bold text-xs shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky Header at top of content area */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {activeProfile === 'company' ? (
              <div className="w-[38px] h-[38px] rounded-xl overflow-hidden ring-2 ring-[var(--accent-border-tint)] bg-black shrink-0">
                <img
                  src="/ontilus-profile.png"
                  alt="Ontilus"
                  className="w-full h-full object-cover select-none"
                />
              </div>
            ) : (
              <div className="w-[38px] h-[38px] rounded-xl ring-2 ring-[var(--accent-border-tint)] bg-[var(--surface)] flex items-center justify-center text-xs font-bold text-[var(--accent-text)] shrink-0 select-none">
                AT
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
                Accounts
              </h1>
              <p className="text-xs text-[var(--muted)]">{profileMeta.name} connected channel credentials & tokens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Inner Wrapper */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full pb-16">
        {/* Platform Account Cards Responsive Grid (auto-fill, min 280px) */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        {activeAccounts.map((account) => {
          const isSimulated = account.isSimulated;

          return (
            <GlassCard
              key={account.platform}
              className="p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0 overflow-hidden"
            >
              {/* Card Body */}
              <div className="space-y-3.5 min-w-0">
                {/* Row 1: Platform Icon + Name on One Row */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderPlatformIcon(account.platform)}
                    <h2 className="text-base font-bold capitalize text-[var(--text)] truncate">
                      {account.platform}
                    </h2>
                  </div>
                  {isSimulated && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] shrink-0">
                      Simulated
                    </span>
                  )}
                </div>

                {/* Row 2: Account Handle Below */}
                <div className="min-w-0 space-y-0.5">
                  <p
                    className="text-sm font-semibold font-mono text-[var(--text)] truncate"
                    title={account.accountHandle}
                  >
                    {account.accountHandle}
                  </p>
                  <p
                    className="text-xs text-[var(--muted)] truncate"
                    title={account.displayName}
                  >
                    {account.displayName}
                  </p>
                </div>

                {/* Credential & Token info */}
                <div className="p-3 rounded-xl bg-[var(--surface)]/70 border border-[var(--border)] space-y-1 text-xs min-w-0">
                  <div className="flex items-center justify-between text-[var(--muted)]">
                    <span className="shrink-0">Bound profile:</span>
                    <span className="text-[var(--accent-text)] font-semibold truncate max-w-[130px]">
                      {profileMeta.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--muted)]">
                    <span className="shrink-0">Token lifespan:</span>
                    <span className="text-[var(--text)] font-mono text-[11px] truncate max-w-[130px]">
                      {account.tokenExpiresInDays ? `${account.tokenExpiresInDays} days` : 'Permanent'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--muted)]">
                    <span className="shrink-0">Last sync:</span>
                    <span className="truncate max-w-[130px]">{account.lastSync}</span>
                  </div>
                </div>
              </div>

              {/* Footer Row: Status Pill and Buttons in a Footer Row */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2 shrink-0">
                <StatusPill status={account.status} size="sm" />

                <div className="flex items-center gap-1.5 shrink-0">
                  {account.status === 'disconnected' ? (
                    <Button
                      variant="accent"
                      size="sm"
                      className="text-xs py-1 px-3 h-7"
                      onClick={() => startOAuthFlow(account)}
                    >
                      Connect
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startOAuthFlow(account)}
                        className="text-xs py-1 px-2.5 h-7"
                      >
                        Reconnect
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          showConfirmModal({
                            title: `Disconnect ${account.platform}?`,
                            message: `This will disconnect ${account.accountHandle} from ${profileMeta.name}.`,
                            confirmLabel: 'Disconnect',
                            isDestructive: true,
                            onConfirm: () => disconnectAccount(account.platform),
                          });
                        }}
                        className="text-xs text-[var(--status-danger)] hover:bg-[rgba(214,69,69,0.1)] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ================= MOCK OAUTH FLOW MODAL ================= */}
      {oauthModalAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                {renderPlatformIcon(oauthModalAccount.platform)}
                <h3 className="text-base font-bold capitalize text-[var(--text)]">
                  Connect {oauthModalAccount.platform}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOauthModalAccount(null)}
                className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {oauthError && (
              <div className="p-3 rounded-xl border border-[rgba(214,69,69,0.3)] bg-[rgba(214,69,69,0.06)] text-xs text-[var(--status-danger)] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{oauthError}</span>
              </div>
            )}

            {/* Step 1: Consent & Handle Config */}
            {oauthStep === 'consent' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text)]">
                    Target account handle
                  </label>
                  <input
                    type="text"
                    value={customHandleInput}
                    onChange={(e) => setCustomHandleInput(e.target.value)}
                    placeholder={`@${profileMeta.id}_official`}
                    className="input-base text-sm w-full font-mono"
                  />
                  <p className="text-[11px] text-[var(--muted)]">
                    Binding credentials strictly to {profileMeta.name}.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5 text-xs text-[var(--muted)]">
                  <p className="font-semibold text-[var(--text)]">Required permissions:</p>
                  <p>• Publish and schedule videos</p>
                  <p>• Read telemetry and engagement statistics</p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOauthModalAccount(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleAuthorizeOAuth}
                  >
                    Authorize OAuth 2.0
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Authorizing */}
            {oauthStep === 'authorizing' && (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-text)] border-t-transparent animate-spin mx-auto" />
                <p className="text-sm font-semibold text-[var(--text)]">
                  Verifying OAuth tokens & webhook bindings...
                </p>
              </div>
            )}

            {/* Step 3: Success */}
            {oauthStep === 'success' && (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[var(--status-success)] mx-auto" />
                <p className="text-sm font-bold text-[var(--text)]">
                  Channel connected successfully!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
