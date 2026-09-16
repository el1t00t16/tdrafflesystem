'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, QrCode, ArrowRight, Eye, EyeOff, AlertCircle, Building2, User } from 'lucide-react';
import { GateSession } from '../../lib/types';
import { soundSynthesizer } from '../../lib/sound';

interface GateLoginFormProps {
  onLoginSuccess: (session: GateSession) => void;
  expectedPin?: string;
}

const PRESET_STATIONS = [
  'Gate 1 - Main Entrance (Gymnasium)',
  'Gate 2 - North Entrance (Elementary Wing)',
  'Gate 3 - South Entrance (High School Wing)',
  'Gate 4 - VIP & Special Guests Desk',
  'Station 5 - Fast-Track Scanner Desk'
];

export const GateLoginForm: React.FC<GateLoginFormProps> = ({
  onLoginSuccess,
  expectedPin = '2026'
}) => {
  const [stationId, setStationId] = useState<string>(PRESET_STATIONS[0]);
  const [customStation, setCustomStation] = useState<string>('');
  const [isCustomStation, setIsCustomStation] = useState<boolean>(false);
  const [officerName, setOfficerName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeStation = isCustomStation ? customStation.trim() : stationId.trim();
    if (!activeStation) {
      setErrorMsg('Please specify your station name or location.');
      soundSynthesizer.playError();
      return;
    }

    if (!officerName.trim()) {
      setErrorMsg('Please enter the officer name or station in-charge.');
      soundSynthesizer.playError();
      return;
    }

    // Default '2026' is ALWAYS valid!
    const entered = pin.trim();
    let storedGatePin = '';
    let storedAdminPin = '';
    try {
      storedGatePin = localStorage.getItem('td26_gate_pin')?.trim() || '';
      storedAdminPin = localStorage.getItem('td26_admin_pin')?.trim() || '';
    } catch (e) {
      console.error(e);
    }

    const isPinValid =
      entered === '2026' ||
      entered === (expectedPin || '').trim() ||
      (storedGatePin !== '' && entered === storedGatePin) ||
      (storedAdminPin !== '' && entered === storedAdminPin);

    if (!isPinValid) {
      setErrorMsg('Incorrect Station PIN. Default passcode is 2026.');
      soundSynthesizer.playError();
      return;
    }

    soundSynthesizer.playSuccess();

    const session: GateSession = {
      stationId: activeStation,
      officerName: officerName.trim(),
      authenticatedAt: new Date().toISOString(),
      isLoggedIn: true
    };

    if (rememberDevice) {
      try {
        localStorage.setItem('td26_gate_session', JSON.stringify(session));
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        sessionStorage.setItem('td26_gate_session', JSON.stringify(session));
      } catch (e) {
        console.error(e);
      }
    }

    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--surface-card)]/90 backdrop-blur-xl border border-[var(--border)] p-6 sm:p-8 shadow-2xl rounded-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] mb-1 shadow-xs">
            <QrCode className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-mono font-bold uppercase tracking-widest">
              Entrance Gate Access Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--ink)]">
            ATTENDANCE SCANNER
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono">
            Municipal Teachers&apos; Day 2026 • Station Login
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-500/50 p-3 rounded-xl text-xs flex items-center gap-2.5 text-rose-300 font-mono animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Station Selection */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Station Location:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomStation(!isCustomStation)}
                className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
              >
                {isCustomStation ? 'Use presets' : 'Custom station'}
              </button>
            </label>

            {isCustomStation ? (
              <input
                type="text"
                required
                placeholder="e.g. Backdoor Entrance Desk"
                value={customStation}
                onChange={(e) => setCustomStation(e.target.value)}
                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] p-3 text-[var(--ink)] font-bold rounded-xl outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-muted)]/40"
              />
            ) : (
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] p-3 text-[var(--ink)] font-bold rounded-xl outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                {PRESET_STATIONS.map((st) => (
                  <option key={st} value={st} className="bg-[var(--surface-card)] text-[var(--ink)]">
                    {st}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Officer Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Scanner Officer / Volunteer Name:</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maria Santos (Gate Desk)"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] p-3 text-[var(--ink)] font-bold rounded-xl outline-none focus:border-[var(--accent)] placeholder:text-[var(--ink-muted)]/40"
            />
          </div>

          {/* PIN Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Station Security PIN:</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                required
                placeholder="Enter Gate PIN (default: 2026)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] p-3 pr-10 text-[var(--ink)] font-bold rounded-xl outline-none focus:border-[var(--accent)] tracking-widest text-center placeholder:text-[var(--ink-muted)]/40"
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

          {/* Remember device checkbox */}
          <div className="flex items-center gap-2 pt-1 text-[var(--ink-muted)] text-xs">
            <input
              type="checkbox"
              id="remember_gate"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="accent-[var(--accent)] w-4 h-4 rounded"
            />
            <label htmlFor="remember_gate" className="cursor-pointer text-[11px]">
              Keep this device logged in for today&apos;s event
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[var(--accent)] hover:brightness-110 text-[var(--accent-ink)] font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-md cursor-pointer"
          >
            <span>Unlock &amp; Start Station</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-[var(--border)] text-center text-[10px] text-[var(--ink-muted)] font-mono leading-relaxed">
          Authorized gate personnel only. All QR scan transactions are cryptographically logged with station and timestamp metadata.
        </div>
      </div>
    </div>
  );
};
