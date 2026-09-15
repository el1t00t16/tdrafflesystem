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
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center justify-center p-4 selection:bg-[#ff6a00] selection:text-white">
      {/* Background Accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff6a00]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121215] border border-white/10 p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#ff6a00]/10 border border-[#ff6a00]/30 text-[#ff6a00] mb-1">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="inline-block px-2.5 py-0.5 bg-neutral-900 border border-white/10 font-mono text-[9px] uppercase tracking-widest text-neutral-400">
            Entrance Gate Access Control
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            ATTENDANCE SCANNER
          </h1>
          <p className="text-xs text-neutral-400 font-medium">
            Municipal Teachers&apos; Day 2026 • Station Login
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/50 p-3 text-xs flex items-center gap-2.5 text-red-300 font-mono animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Station Selection */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Station Location:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomStation(!isCustomStation)}
                className="text-[10px] text-[#ff6a00] hover:underline"
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
                className="w-full bg-[#18181b] border border-white/15 p-2.5 text-white font-bold outline-none focus:border-[#ff6a00]"
              />
            ) : (
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full bg-[#18181b] border border-white/15 p-2.5 text-white font-bold outline-none focus:border-[#ff6a00]"
              >
                {PRESET_STATIONS.map((st) => (
                  <option key={st} value={st} className="bg-[#18181b] text-white">
                    {st}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Officer Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#ff6a00]" />
              <span>Scanner Officer / Volunteer Name:</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maria Santos (Gate Desk)"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full bg-[#18181b] border border-white/15 p-2.5 text-white font-bold outline-none focus:border-[#ff6a00]"
            />
          </div>

          {/* PIN Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#ff6a00]" />
              <span>Station Security PIN:</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                required
                placeholder="Enter Gate PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-[#18181b] border border-white/15 p-2.5 pr-10 text-white font-bold outline-none focus:border-[#ff6a00] tracking-widest text-center"
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

          {/* Remember device checkbox */}
          <div className="flex items-center gap-2 pt-1 text-neutral-300 text-xs">
            <input
              type="checkbox"
              id="remember_gate"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="accent-[#ff6a00] w-4 h-4"
            />
            <label htmlFor="remember_gate" className="cursor-pointer text-[11px]">
              Keep this device logged in for today&apos;s event
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-[#ff6a00] hover:bg-[#ff7b1a] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-lg shadow-[#ff6a00]/20"
          >
            <span>Unlock &amp; Start Station</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-white/5 text-center text-[10px] text-neutral-500 font-mono leading-relaxed">
          Authorized gate personnel only. All QR scan transactions are cryptographically logged with station and timestamp metadata.
        </div>
      </div>
    </div>
  );
};
