'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Gift, ArrowRight, Eye, EyeOff, AlertCircle, Building2, User } from 'lucide-react';
import { ClaimStationSession } from '../../lib/types';
import { soundSynthesizer } from '../../lib/sound';

interface ClaimsLoginFormProps {
  onLoginSuccess: (session: ClaimStationSession) => void;
  expectedPin?: string;
}

const PRESET_STATIONS = [
  'Disbursement Desk 1 (Minor Prizes)',
  'Disbursement Desk 2 (Major & Grand Prizes)',
  'Disbursement Desk 3 (Cash & Vouchers)',
  'Disbursement Desk 4 (Fast-Track Express)',
  'Claims Station - Main Gym Stage'
];

export const ClaimsLoginForm: React.FC<ClaimsLoginFormProps> = ({
  onLoginSuccess,
  expectedPin = '2026'
}) => {
  const [stationId, setStationId] = useState<string>(PRESET_STATIONS[0]);
  const [customStation, setCustomStation] = useState<string>('');
  const [isCustomStation, setIsCustomStation] = useState<boolean>(false);
  const [officerName, setOfficerName] = useState<string>('Disbursing Officer 1');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeStation = isCustomStation ? customStation.trim() : stationId.trim();
    if (!activeStation) {
      setErrorMsg('Please specify your disbursement desk or location.');
      soundSynthesizer.playError();
      return;
    }

    const activeOfficer = officerName.trim() || 'Disbursing Officer 1';

    // Retrieve active PIN from localStorage or fallback
    const entered = pin.trim();
    let storedAdminPin = '';
    let storedGatePin = '';
    try {
      storedAdminPin = localStorage.getItem('td26_admin_pin')?.trim() || '';
      storedGatePin = localStorage.getItem('td26_gate_pin')?.trim() || '';
    } catch (e) {
      console.error(e);
    }

    // Default '2026' is ALWAYS valid!
    const isPinValid =
      entered === '2026' ||
      entered === (expectedPin || '').trim() ||
      (storedAdminPin !== '' && entered === storedAdminPin) ||
      (storedGatePin !== '' && entered === storedGatePin);

    if (!isPinValid) {
      setErrorMsg('Incorrect Station PIN. Default passcode is 2026.');
      soundSynthesizer.playError();
      return;
    }

    soundSynthesizer.playSuccess();

    const session: ClaimStationSession = {
      stationId: activeStation,
      officerName: activeOfficer,
      authenticatedAt: new Date().toISOString(),
      isLoggedIn: true
    };

    if (rememberDevice) {
      try {
        localStorage.setItem('td26_claim_session', JSON.stringify(session));
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        sessionStorage.setItem('td26_claim_session', JSON.stringify(session));
      } catch (e) {
        console.error(e);
      }
    }

    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center justify-center p-4 selection:bg-[#ff6a00] selection:text-white relative">
      {/* Background Accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff6a00]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121215] border border-white/10 p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#ff6a00]/15 border border-[#ff6a00]/40 rounded-sm flex items-center justify-center mx-auto text-[#ff6a00] mb-3 shadow-inner">
            <Gift className="w-7 h-7" />
          </div>
          <div className="font-mono text-[10px] tracking-widest text-[#ff6a00] uppercase font-bold">
            MUNICIPAL TEACHERS&apos; DAY 2026
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            PRIZE CLAIM WORKSTATION
          </h1>
          <p className="text-xs text-neutral-400 font-mono">
            Fast Real-Time Disbursement &amp; Verification Desk
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-xs text-red-300 text-xs font-mono flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Station Selection */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-bold uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#ff6a00]" />
              <span>Claim Desk / Station</span>
            </label>
            {!isCustomStation ? (
              <select
                value={stationId}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomStation(true);
                  } else {
                    setStationId(e.target.value);
                  }
                }}
                className="w-full bg-[#18181b] border border-white/15 px-3 py-2.5 text-neutral-200 focus:border-[#ff6a00] outline-none font-sans text-xs uppercase"
              >
                {PRESET_STATIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Custom Station Name...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStation}
                  onChange={(e) => setCustomStation(e.target.value)}
                  placeholder="e.g. Desk 5 - Elementary Annex"
                  autoFocus
                  className="w-full bg-[#18181b] border border-[#ff6a00] px-3 py-2 text-neutral-200 focus:border-[#ff6a00] outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomStation(false)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-400 text-[10px] uppercase border border-white/10"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Officer in Charge */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-bold uppercase flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#ff6a00]" />
              <span>Disbursing Officer / Staff Name</span>
            </label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              placeholder="e.g. Juan dela Cruz / DepEd Treasury"
              required
              className="w-full bg-[#18181b] border border-white/15 px-3 py-2.5 text-neutral-200 focus:border-[#ff6a00] outline-none uppercase"
            />
          </div>

          {/* Security PIN */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-bold uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Station Access PIN</span>
              </span>
              <span className="text-[10px] text-neutral-500 font-normal">Default: 2026</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Station PIN (e.g. 2026)"
                required
                maxLength={8}
                className="w-full bg-[#18181b] border border-white/15 pl-3 pr-10 py-2.5 text-neutral-200 focus:border-[#ff6a00] outline-none tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember this station */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rememberDevice"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="accent-[#ff6a00] w-3.5 h-3.5"
            />
            <label htmlFor="rememberDevice" className="text-neutral-400 text-[11px] cursor-pointer select-none">
              Stay logged in on this disbursement device
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#ff6a00] hover:bg-[#e05e00] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg transition-all rounded-xs mt-2"
          >
            <span>Open Prize Disbursement Station</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 text-center font-mono text-[10px] text-neutral-500">
          Municipal Teachers&apos; Day 2026 • Grand Raffle System
        </div>
      </div>
    </div>
  );
};
