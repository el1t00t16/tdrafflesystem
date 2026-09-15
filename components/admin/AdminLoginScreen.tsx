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
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center justify-center p-4 selection:bg-[#FF1E1E] selection:text-white">
      {/* Subtle Red Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF1E1E]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121215] border border-white/10 p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 border-t-2 border-t-[#FF1E1E]">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FF1E1E]/10 border border-[#FF1E1E]/30 text-[#FF1E1E] mb-1">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#FF1E1E]">
            MUNICIPAL TEACHERS&apos; DAY 2026
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            MASTER STAGE CONSOLE
          </h1>
          <p className="text-xs text-neutral-400">
            Restricted to Stage Directors &amp; Event Administrators.
          </p>
        </div>

        {/* Security Warning Banner */}
        <div className="bg-neutral-950 border border-white/10 p-3 rounded-xs flex items-start gap-2.5 text-[11px] font-mono text-neutral-300">
          <Lock className="w-4 h-4 text-[#FF1E1E] mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            This console controls live prize rolls, participant database mutations, and cloud sync. Unauthorized access is restricted.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-300">
              ADMIN MASTER PASSCODE
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter master passcode..."
                autoFocus
                className="w-full bg-neutral-950 border border-white/15 px-3.5 py-3 pr-10 text-white font-mono text-sm tracking-widest outline-none focus:border-[#FF1E1E] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Remember this laptop */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-neutral-300">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="accent-[#FF1E1E] w-3.5 h-3.5"
              />
              <span>Remember this Admin laptop</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.99] cursor-pointer"
          >
            <span>Unlock Master Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Notice & Redirect for Gate Volunteers */}
        <div className="pt-4 border-t border-white/10 text-center space-y-2">
          <p className="text-[11px] text-neutral-400">
            Are you an Entrance Volunteer or Gatekeeper?
          </p>
          <a
            href="/attendance"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-[#ff6a00] font-mono text-xs font-bold uppercase tracking-wider transition-colors w-full"
          >
            <span>Go to Volunteer Gate Scanner Terminal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
