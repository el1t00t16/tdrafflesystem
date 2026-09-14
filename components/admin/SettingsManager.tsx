'use client';

import React, { useState } from 'react';
import { SystemSettings } from '../../lib/types';
import { Settings, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

interface SettingsManagerProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onPrepareNewEvent: () => void;
  totalParticipants: number;
  totalWinners: number;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onPrepareNewEvent,
  totalParticipants,
  totalWinners
}) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExecuteReset = () => {
    if (confirmInput === 'MALUNGON2026') {
      onPrepareNewEvent();
      setShowConfirmReset(false);
      setConfirmInput('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Event Configuration Form */}
      <div className="bg-[#121212] border border-white/10 p-6 shadow-2xl relative border-t-2 border-t-[#FF1E1E]">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#FF1E1E]" />
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none">SYSTEM SETTINGS</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
                Event configuration &amp; raffle operational parameters
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1 bg-neutral-900 px-3 py-1 border border-white/30">
              <CheckCircle className="w-3.5 h-3.5 text-[#FF1E1E]" /> Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">EVENT NAME:</label>
            <input
              type="text"
              value={localSettings.eventName}
              onChange={(e) => setLocalSettings({ ...localSettings, eventName: e.target.value })}
              className="w-full bg-neutral-950 border border-white/15 px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">EVENT DATE:</label>
              <input
                type="text"
                value={localSettings.eventDate}
                onChange={(e) => setLocalSettings({ ...localSettings, eventDate: e.target.value })}
                className="w-full bg-neutral-950 border border-white/15 px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
              />
            </div>

            <div>
              <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">LOCATION:</label>
              <input
                type="text"
                value={localSettings.location}
                onChange={(e) => setLocalSettings({ ...localSettings, location: e.target.value })}
                className="w-full bg-neutral-950 border border-white/15 px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-300 mb-1">ORGANIZATION:</label>
            <input
              type="text"
              value={localSettings.organization}
              onChange={(e) => setLocalSettings({ ...localSettings, organization: e.target.value })}
              className="w-full bg-neutral-950 border border-white/15 px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
            />
          </div>

          {/* Previous Winner Protection Setting */}
          <div className="bg-neutral-950 border border-white/10 p-4 flex items-center justify-between">
            <div>
              <div className="font-black text-white text-sm uppercase tracking-wide">ALLOW MULTIPLE WINS</div>
              <p className="text-neutral-400 text-[11px] mt-0.5 max-w-sm">
                If <strong>OFF (Default)</strong>, participants who already won are excluded from succeeding draws.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  allowMultipleWins: !localSettings.allowMultipleWins
                })
              }
              className={`px-4 py-2 font-black text-xs uppercase tracking-wider transition-colors ${
                localSettings.allowMultipleWins
                  ? 'bg-[#FF1E1E] text-white'
                  : 'bg-neutral-900 text-white border border-white/20'
              }`}
            >
              {localSettings.allowMultipleWins ? 'ALLOWED: ON' : 'PROTECTED: OFF'}
            </button>
          </div>

          {/* Animation Duration Slider */}
          <div className="bg-neutral-950 border border-white/10 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-black text-white text-sm uppercase tracking-wide">ANIMATION DURATION</div>
                <p className="text-neutral-400 text-[11px]">
                  Duration of rapid name cycling before reveal
                </p>
              </div>
              <span className="text-[#FF1E1E] font-black text-sm">
                {localSettings.animationDuration} SECONDS
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={localSettings.animationDuration}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  animationDuration: Number(e.target.value)
                })
              }
              className="w-full accent-[#FF1E1E] cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-sm uppercase tracking-wider shadow transition-all rounded-none"
          >
            Save Settings Changes
          </button>
        </form>
      </div>

      {/* Controlled Event Preparation / Reset Panel */}
      <div className="bg-[#121212] border border-white/10 p-6 shadow-2xl space-y-4 relative border-t-2 border-t-white">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <ShieldCheck className="w-5 h-5 text-white" />
          <h4 className="font-black text-lg text-white uppercase tracking-tight">EVENT PREPARATION &amp; READINESS</h4>
        </div>

        <div className="bg-neutral-950 border border-white/10 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Participants Loaded:</span>
            <span className="text-white font-black">
              YES ({totalParticipants.toLocaleString()} PERSONNEL)
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Previous Winners:</span>
            <span className="text-white font-bold">{totalWinners} recorded</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-wider">System Status:</span>
            <span className="bg-neutral-900 text-white font-black px-2 py-0.5 border border-white/20 text-[10px] uppercase tracking-widest">
              READY FOR EVENT
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowConfirmReset(true)}
            className="w-full py-3 bg-black hover:bg-neutral-900 border border-white/20 hover:border-[#FF1E1E] text-neutral-300 hover:text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-none"
          >
            <RefreshCw className="w-4 h-4 text-[#FF1E1E]" />
            <span>Prepare Fresh Event Session (Clear Previous Winners)</span>
          </button>
        </div>

        {showConfirmReset && (
          <div className="bg-[#0A0A0A] border-2 border-[#FF1E1E] p-4 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 text-[#FF1E1E]" />
              <span>Safety Confirmation Required</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              This will clear previous winner records and reset all participant winner flags to &quot;NO&quot; and prize remaining quantities back to full. <strong>The 2,000 participant master list will NOT be deleted.</strong>
            </p>
            <div>
              <label className="block text-neutral-300 font-black uppercase text-[10px] tracking-wider mb-1">
                Type <strong>MALUNGON2026</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="MALUNGON2026"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full bg-neutral-950 border border-[#FF1E1E] p-2 text-white font-mono text-xs outline-none uppercase font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setShowConfirmReset(false);
                  setConfirmInput('');
                }}
                className="px-3 py-1.5 border border-white/20 text-neutral-300 hover:bg-neutral-900 font-bold uppercase text-xs"
              >
                Cancel
              </button>
              <button
                disabled={confirmInput !== 'MALUNGON2026'}
                onClick={handleExecuteReset}
                className="px-4 py-1.5 bg-[#FF1E1E] hover:bg-[#ff3838] disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-wider shadow"
              >
                Confirm Fresh Event Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
