import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { CompanyLogo } from '../common/CompanyLogo';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();

  const [email, setEmail] = useState('adamsanders881@gmail.com');
  const [password, setPassword] = useState('DispatcherPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await login(email, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm space-y-4">
        {/* Company Logo & Login text */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <CompanyLogo size={48} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              Welcome to PostPilot!
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Your social media manager
            </p>
          </div>
        </div>

        <GlassCard className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-2.5 rounded-xl border border-[rgba(214,69,69,0.3)] bg-[rgba(214,69,69,0.08)] text-xs text-[var(--status-danger)] flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Field with exact icon positioning wrapper */}
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[var(--text)]"
              >
                Email
              </label>
              <div className="relative">
                {/* Absolutely positioned at left: 14px, vertically centered, 18px wide */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)] flex items-center justify-center"
                  style={{ left: '14px', width: '18px', height: '18px' }}
                >
                  <Mail className="w-[18px] h-[18px]" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-base w-full text-sm h-10"
                  style={{ paddingLeft: '48px', paddingRight: '12px' }}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field with exact icon positioning wrapper */}
            <div className="space-y-1">
              <label
                htmlFor="login-pass"
                className="block text-xs font-semibold text-[var(--text)]"
              >
                Password
              </label>
              <div className="relative">
                {/* Absolutely positioned at left: 14px, vertically centered, 18px wide */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)] flex items-center justify-center"
                  style={{ left: '14px', width: '18px', height: '18px' }}
                >
                  <Lock className="w-[18px] h-[18px]" />
                </div>
                <input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-base w-full text-sm h-10"
                  style={{ paddingLeft: '48px', paddingRight: '40px' }}
                  autoComplete="current-password"
                />
                {/* Right eye toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="accent"
                className="w-full"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
