'use client';

import React, { useState } from 'react';
import { ShieldAlert, Lock, ArrowRight, Eye, EyeOff, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';
import { soundSynthesizer } from '../../lib/sound';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  expectedPin?: string;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onLoginSuccess,
  expectedPin = '2026'
}) => {
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Retrieve active PIN from local storage or fallback (2026 is ALWAYS valid)
    const entered = pin.trim();
    let storedPin = '';
    try {
      storedPin = localStorage.getItem('td26_admin_pin')?.trim() || '';
    } catch (e) {
      console.error(e);
    }

    const isPinValid =
      entered === '2026' ||
      entered === (expectedPin || '').trim() ||
      (storedPin !== '' && entered === storedPin);

    if (!isPinValid) {
      setErrorMsg('Incorrect Admin Master Passcode. Default passcode is 2026.');
      soundSynthesizer.playError();
      return;
    }

    soundSynthesizer.playSuccess();

    try {
      if (rememberDevice) {
        localStorage.setItem('td26_admin_authenticated', 'true');
      } else {
        sessionStorage.setItem('td26_admin_authenticated', 'true');
      }
    } catch (e) {
      console.error(e);
    }

    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--surface-card)]/90 backdrop-blur-xl border border-[var(--border)] p-6 sm:p-8 shadow-2xl rounded-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] mb-1 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-mono font-bold uppercase tracking-widest">
              MUNICIPAL TEACHERS&apos; DAY 2026
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--ink)]">
            MASTER STAGE CONSOLE
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono">
            Restricted to Stage Directors &amp; Event Administrators.
          </p>
        </div>

        {/* Security Warning Banner */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border)] p-3.5 rounded-xl flex items-start gap-2.5 text-[11px] font-mono text-[var(--ink-muted)]">
          <Lock className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            This console controls live prize rolls, participant database mutations, and cloud sync. Unauthorized access is restricted.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              ADMIN MASTER PASSCODE
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter master passcode (default: 2026)..."
                autoFocus
                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] px-4 py-3 pr-10 text-[var(--ink)] font-mono text-sm tracking-widest rounded-xl outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all placeholder:text-[var(--ink-muted)]/40"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Remember this laptop */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--ink-muted)]">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4 rounded"
              />
              <span>Remember this Admin laptop</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[var(--accent)] hover:brightness-110 text-[var(--accent-ink)] font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
          >
            <span>Unlock Master Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Notice & Redirect for Gate Volunteers */}
        <div className="pt-4 border-t border-[var(--border)] text-center space-y-2">
          <p className="text-[11px] text-[var(--ink-muted)]">
            Are you an Entrance Volunteer or Gatekeeper?
          </p>
          <a
            href="/attendance"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] border border-[var(--border)] text-[var(--accent)] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors w-full cursor-pointer"
          >
            <span>Go to Volunteer Gate Scanner Terminal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
