'use client';

import React, { useState, useEffect } from 'react';
import { SystemSettings, Participant } from '../../lib/types';
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Database,
  Copy,
  Check,
  UploadCloud,
  Loader2,
  ExternalLink,
  Trash2,
  QrCode,
  Lock,
  Smartphone,
  X,
  Palette,
  Sparkles,
  Monitor,
  Moon,
  Sun
} from 'lucide-react';
import QRCode from 'qrcode';
import { useTheme, THEMES, ThemeId } from '../../lib/theme';
import {
  getSupabaseCredentials,
  setSupabaseCredentials,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  batchSyncParticipantsToSupabase
} from '../../lib/supabase';

interface SettingsManagerProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onPrepareNewEvent: (options?: { resetAttendance?: boolean; deleteParticipants?: boolean }) => Promise<{ success: boolean; message: string }> | void;
  totalParticipants: number;
  totalWinners: number;
  participants?: Participant[];
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onPrepareNewEvent,
  totalParticipants,
  totalWinners,
  participants = []
}) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(() => {
    let pin = settings.gateAccessPin || '2026';
    try {
      const stored = localStorage.getItem('td26_gate_pin');
      if (stored) pin = stored;
    } catch (e) {}
    let adminPin = settings.adminAccessPin || '2026';
    try {
      const storedAdmin = localStorage.getItem('td26_admin_pin');
      if (storedAdmin) adminPin = storedAdmin;
    } catch (e) {}
    return { ...settings, gateAccessPin: pin, adminAccessPin: adminPin };
  });
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [resetAttendanceCheckbox, setResetAttendanceCheckbox] = useState(false);
  const [deleteParticipantsCheckbox, setDeleteParticipantsCheckbox] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedGateUrl, setCopiedGateUrl] = useState(false);
  const [showQuickSetupQr, setShowQuickSetupQr] = useState(false);
  const [quickSetupQrUrl, setQuickSetupQrUrl] = useState<string | null>(null);
  const [copiedQuickSetupUrl, setCopiedQuickSetupUrl] = useState(false);
  const [pinSavedFeedback, setPinSavedFeedback] = useState(false);

  // Dynamic Theme & Dark Mode Hook
  const { theme, setTheme, allThemes, themeConfig, isDark, setMode, toggleDarkMode } = useTheme();
  const [themeChangedFeedback, setThemeChangedFeedback] = useState<string | null>(null);

  const handleSelectTheme = (newThemeId: ThemeId) => {
    setTheme(newThemeId);
    const found = allThemes.find((t) => t.id === newThemeId);
    setThemeChangedFeedback(`Active: ${found?.name || newThemeId}`);
    setTimeout(() => setThemeChangedFeedback(null), 3500);
  };

  // Supabase State initialized lazily
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseCredentials().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseCredentials().anonKey);
  const [supabaseSource, setSupabaseSource] = useState<'ENV' | 'LOCAL_STORAGE' | 'NONE'>(
    () => getSupabaseCredentials().source
  );
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [isSyncingParticipants, setIsSyncingParticipants] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestStatus({ loading: false, success: result.success, message: result.message });
  };

  const handleSaveSupabase = () => {
    setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    const creds = getSupabaseCredentials();
    setSupabaseSource(creds.source);
    setTestStatus({
      loading: false,
      success: true,
      message: 'Supabase credentials saved! The app is now connected to your live database.'
    });
  };

  const handleClearSupabase = () => {
    setSupabaseCredentials('', '');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setSupabaseSource('NONE');
    setTestStatus({ loading: false, message: 'Supabase credentials cleared.' });
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handlePushParticipants = async () => {
    if (participants.length === 0) {
      alert('No participants loaded to push.');
      return;
    }
    setIsSyncingParticipants(true);
    setSyncProgress(`0 / ${participants.length} pushed...`);

    const res = await batchSyncParticipantsToSupabase(participants, (processed, total) => {
      setSyncProgress(`${processed.toLocaleString()} / ${total.toLocaleString()} synced`);
    });

    setIsSyncingParticipants(false);
    if (res.success) {
      setSyncProgress(`Successfully synced ${res.count.toLocaleString()} participants to Supabase!`);
    } else {
      setSyncProgress(`Sync error: ${res.error}`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    try {
      localStorage.setItem('td26_gate_pin', localSettings.gateAccessPin || '2026');
      localStorage.setItem('td26_admin_pin', localSettings.adminAccessPin || '2026');
    } catch (e) {
      console.error(e);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyGateUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://teachers-day-raffle-system.web.app';
    const gateUrl = `${origin}/attendance`;
    navigator.clipboard.writeText(gateUrl);
    setCopiedGateUrl(true);
    setTimeout(() => setCopiedGateUrl(false), 2500);
  };

  const handleToggleQuickSetupQr = async () => {
    if (!showQuickSetupQr) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://teachers-day-raffle-system.web.app';
      const targetUrl = supabaseUrl && supabaseAnonKey
        ? `${origin}/attendance?surl=${encodeURIComponent(supabaseUrl)}&skey=${encodeURIComponent(supabaseAnonKey)}`
        : `${origin}/attendance`;
      try {
        const qrData = await QRCode.toDataURL(targetUrl, {
          width: 260,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQuickSetupQrUrl(qrData);
      } catch (err) {
        console.error('Failed to generate quick setup QR:', err);
      }
      setShowQuickSetupQr(true);
    } else {
      setShowQuickSetupQr(false);
    }
  };

  const handleCopyQuickSetupUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://teachers-day-raffle-system.web.app';
    const targetUrl = supabaseUrl && supabaseAnonKey
      ? `${origin}/attendance?surl=${encodeURIComponent(supabaseUrl)}&skey=${encodeURIComponent(supabaseAnonKey)}`
      : `${origin}/attendance`;
    navigator.clipboard.writeText(targetUrl);
    setCopiedQuickSetupUrl(true);
    setTimeout(() => setCopiedQuickSetupUrl(false), 2500);
  };

  const handleExecuteReset = async () => {
    if (confirmInput !== 'MALUNGON2026') return;
    setIsResetting(true);
    setResetFeedback(null);
    try {
      const res = await onPrepareNewEvent({
        resetAttendance: resetAttendanceCheckbox,
        deleteParticipants: deleteParticipantsCheckbox
      });
      if (res && res.message) {
        setResetFeedback(res);
      } else {
        setResetFeedback({
          success: true,
          message: 'Event session successfully reset locally and in Supabase Cloud!'
        });
      }
      setShowConfirmReset(false);
      setConfirmInput('');
      setDeleteParticipantsCheckbox(false);
    } catch (err: any) {
      setResetFeedback({
        success: false,
        message: `Reset failed: ${err?.message || err}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Event Theme & Stage Color Palette Customizer */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-4 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-[var(--ink)] uppercase tracking-tight leading-none">
                  EVENT COLOR THEME
                </h3>
                <span className="font-mono text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Live Switcher
                </span>
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
                Active Theme: <strong className="text-[var(--ink)]">{themeConfig.name}</strong>
              </p>
            </div>
          </div>

          {themeChangedFeedback && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full animate-fade-in flex items-center gap-1 self-start sm:self-auto">
              <Check className="w-3 h-3 text-emerald-500" />
              {themeChangedFeedback}
            </span>
          )}
        </div>

        <p className="text-[var(--ink-muted)] text-xs leading-relaxed">
          Select a visual palette below. Changes apply <strong className="text-[var(--ink)]">instantly in real-time</strong> across the <strong className="text-[var(--ink)]">Stage Projector Display</strong>, <strong className="text-[var(--ink)]">Admin Master Console</strong>, and <strong className="text-[var(--ink)]">All Stations</strong>.
        </p>

        {/* Dedicated Dark / Light Mode Quick Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--ink)] tracking-wide">
                Display Mode:
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                isDark ? 'border-amber-400/40 text-amber-500 dark:text-amber-300 bg-amber-400/10' : 'border-blue-400/40 text-blue-600 dark:text-blue-300 bg-blue-400/10'
              }`}>
                {isDark ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
              Switch between high-contrast stage dark mode and daylight light mode with one click.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--surface-card)] p-1 border border-[var(--border)] rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                isDark
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                !isDark
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Mode</span>
            </button>
          </div>
        </div>

        {/* Theme Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {allThemes.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTheme(t.id)}
                className={`p-3.5 text-left rounded-xl border-2 transition-all relative flex flex-col justify-between gap-3 group cursor-pointer ${
                  isActive
                    ? 'border-[var(--accent)] bg-[var(--surface-elevated)] shadow-md ring-2 ring-[var(--accent-glow)]'
                    : 'border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        isActive ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--ink-muted)]'
                      }`}>
                        {t.tag}
                      </span>
                      <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md border border-[var(--border)] text-[var(--ink-muted)] bg-[var(--surface)]">
                        {t.mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                      </span>
                    </div>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-black text-[var(--accent)] uppercase">
                        <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--ink-muted)] uppercase group-hover:text-[var(--ink)] transition-colors">
                        Click to Apply
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-sm text-[var(--ink)] uppercase tracking-tight">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-[var(--ink-muted)] mt-0.5 leading-snug">
                    {t.subtitle}
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase text-[var(--ink-muted)] font-bold">Palette:</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30"
                      style={{ backgroundColor: t.colors.bg }}
                      title={`Stage Background: ${t.colors.bg}`}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30"
                      style={{ backgroundColor: t.colors.surfaceCard }}
                      title={`Card Surface: ${t.colors.surfaceCard}`}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30"
                      style={{ backgroundColor: t.colors.accent }}
                      title={`Primary Accent: ${t.colors.accent}`}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30"
                      style={{ backgroundColor: t.colors.accentSecondary }}
                      title={`Secondary Accent: ${t.colors.accentSecondary}`}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30"
                      style={{ backgroundColor: t.colors.text }}
                      title={`Text Ink: ${t.colors.text}`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Event Configuration Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-[var(--ink)] uppercase tracking-tight leading-none">SYSTEM SETTINGS</h3>
              <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
                Event configuration &amp; raffle operational parameters
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">EVENT NAME:</label>
            <input
              type="text"
              value={localSettings.eventName}
              onChange={(e) => setLocalSettings({ ...localSettings, eventName: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--ink)] font-bold outline-none focus:border-[var(--accent)] uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">EVENT DATE:</label>
              <input
                type="text"
                value={localSettings.eventDate}
                onChange={(e) => setLocalSettings({ ...localSettings, eventDate: e.target.value })}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--ink)] font-bold outline-none focus:border-[var(--accent)] uppercase"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">LOCATION:</label>
              <input
                type="text"
                value={localSettings.location}
                onChange={(e) => setLocalSettings({ ...localSettings, location: e.target.value })}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--ink)] font-bold outline-none focus:border-[var(--accent)] uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">ORGANIZATION:</label>
            <input
              type="text"
              value={localSettings.organization}
              onChange={(e) => setLocalSettings({ ...localSettings, organization: e.target.value })}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--ink)] font-bold outline-none focus:border-[var(--accent)] uppercase"
            />
          </div>

          {/* Previous Winner Protection Setting */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-[var(--ink)] text-sm uppercase tracking-wide">ALLOW MULTIPLE WINS</div>
              <p className="text-[var(--ink-muted)] text-[11px] mt-0.5 max-w-sm">
                If <strong className="text-[var(--ink)]">OFF (Default)</strong>, participants who already won are excluded from succeeding draws.
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
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                localSettings.allowMultipleWins
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]'
              }`}
            >
              {localSettings.allowMultipleWins ? 'ALLOWED: ON' : 'PROTECTED: OFF'}
            </button>
          </div>

          {/* Animation Duration Slider */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-[var(--ink)] text-sm uppercase tracking-wide">ANIMATION DURATION</div>
                <p className="text-[var(--ink-muted)] text-[11px]">
                  Duration of rapid name cycling before reveal (3 to 30 seconds)
                </p>
              </div>
              <span className="text-[var(--accent)] font-black text-base font-mono">
                {localSettings.animationDuration} SECONDS
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="30"
              step="1"
              value={localSettings.animationDuration}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  animationDuration: Number(e.target.value)
                })
              }
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            {/* Quick Duration Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[var(--ink-muted)] font-mono uppercase mr-1">Presets:</span>
              {[3, 5, 10, 15, 20, 25, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      animationDuration: sec
                    })
                  }
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all border cursor-pointer ${
                    localSettings.animationDuration === sec
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface)] hover:bg-[var(--surface-card)] text-[var(--ink)] border-[var(--border)]'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-bold text-sm uppercase tracking-wider shadow transition-all cursor-pointer"
          >
            Save Settings Changes
          </button>
        </form>
      </div>

      {/* Controlled Event Preparation / Reset Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
          <h4 className="font-black text-lg text-[var(--ink)] uppercase tracking-tight">EVENT PREPARATION &amp; READINESS</h4>
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Participants Loaded:</span>
            <span className={totalParticipants > 0 ? "text-[var(--ink)] font-black" : "text-amber-500 font-bold"}>
              {totalParticipants > 0 ? `YES (${totalParticipants.toLocaleString()} PERSONNEL)` : '0 PERSONNEL (ROSTER EMPTY)'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">Previous Winners:</span>
            <span className="text-[var(--ink)] font-bold">{totalWinners} recorded</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider">System Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-bold ${
              totalParticipants > 0
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              {totalParticipants > 0 ? 'READY FOR EVENT' : 'AWAITING PARTICIPANTS ROSTER'}
            </span>
          </div>
        </div>

        {/* Reset Feedback Notification */}
        {resetFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-fade-in ${
              resetFeedback.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300'
            }`}
          >
            {resetFeedback.success ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">
                {resetFeedback.success ? 'RESET COMPLETED IN SUPABASE & LOCAL CACHE' : 'RESET NOTICE'}
              </span>
              {resetFeedback.message}
            </div>
            <button
              onClick={() => setResetFeedback(null)}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="pt-1">
          <button
            onClick={() => {
              setShowConfirmReset(true);
              setResetFeedback(null);
            }}
            className="w-full py-3 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink)] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[var(--accent)]" />
            <span>Prepare Fresh Event Session (Clear Previous Winners)</span>
          </button>
        </div>

        {showConfirmReset && (
          <div className="rounded-xl bg-[var(--surface-elevated)] border-2 border-red-500/50 p-4 space-y-3 animate-fade-in text-xs shadow-lg">
            <div className="flex items-center gap-2 text-[var(--ink)] font-bold text-sm uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Safety Confirmation Required</span>
            </div>
            <p className="text-[var(--ink-muted)] leading-relaxed">
              This will clear previous winner records, clear draw history, and reset participant winner flags to &quot;NO&quot; both <strong className="text-[var(--ink)]">locally and in Supabase Cloud</strong>. All prize quantities will reset back to full. {deleteParticipantsCheckbox ? <strong className="text-red-500">WARNING: All {totalParticipants.toLocaleString()} participants will be permanently wiped!</strong> : <strong className="text-[var(--ink)]">The {totalParticipants.toLocaleString()} participant master list will NOT be deleted unless checked below.</strong>}
            </p>

            <div className="bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetAttendanceCheckbox}
                  onChange={(e) => setResetAttendanceCheckbox(e.target.checked)}
                  disabled={isResetting}
                  className="accent-[var(--accent)] w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-[var(--ink)] uppercase text-[11px] block">
                    Also Clear Attendance Gate Check-ins
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5 leading-tight">
                    Check this to reset all teachers back to Ineligible (Absent) and clear all gate scan records in Supabase. Leave unchecked if attendees have already checked in at the gates.
                  </span>
                </div>
              </label>
            </div>

            <div className="bg-[var(--surface)] p-3 rounded-lg border border-red-500/30 space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteParticipantsCheckbox}
                  onChange={(e) => setDeleteParticipantsCheckbox(e.target.checked)}
                  disabled={isResetting}
                  className="accent-[var(--accent)] w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-red-500 uppercase text-[11px] flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    Also Delete All Participants Masterlist (Purge Roster)
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5 leading-tight">
                    DANGER: Check this ONLY if you want to completely delete all {totalParticipants.toLocaleString()} personnel from Supabase Cloud and local storage. You will need to import a new roster TSV/CSV file.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider mb-1">
                Type <strong className="text-[var(--ink)]">MALUNGON2026</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="MALUNGON2026"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={isResetting}
                className="w-full bg-[var(--surface)] border border-red-500/50 rounded-lg p-2.5 text-[var(--ink)] font-mono text-xs outline-none uppercase font-bold disabled:opacity-50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setShowConfirmReset(false);
                  setConfirmInput('');
                }}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] font-bold uppercase text-xs disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput !== 'MALUNGON2026' || isResetting}
                onClick={handleExecuteReset}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold uppercase text-xs tracking-wider shadow flex items-center gap-1.5 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Supabase &amp; Local Cache...</span>
                  </>
                ) : (
                  <span>Confirm Fresh Event Reset</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gatekeeper Security & Scanner Stations Access Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[var(--ink)] uppercase tracking-tight leading-none">
                GATEKEEPER &amp; SCANNER STATIONS
              </h4>
              <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
                Volunteer attendance passkey &amp; multi-gate mobile terminal link
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              SECURITY ACTIVE
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] p-4 space-y-4 text-xs">
          {/* Admin Master Console PIN Setting */}
          <div className="space-y-1.5 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>ADMIN MASTER CONSOLE ACCESS PIN:</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...localSettings, adminAccessPin: '2026' };
                  setLocalSettings(updated);
                  onUpdateSettings(updated);
                  try {
                    localStorage.setItem('td26_admin_pin', '2026');
                    localStorage.setItem('td26_settings', JSON.stringify(updated));
                  } catch (e) {}
                  setPinSavedFeedback(true);
                  setTimeout(() => setPinSavedFeedback(false), 2500);
                }}
                className="text-[10px] text-[var(--accent)] hover:underline font-mono cursor-pointer"
              >
                Reset to default (2026)
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                maxLength={15}
                placeholder="2026"
                value={localSettings.adminAccessPin || ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  const updated = { ...localSettings, adminAccessPin: val };
                  setLocalSettings(updated);
                  onUpdateSettings(updated);
                  try {
                    localStorage.setItem('td26_admin_pin', val);
                    localStorage.setItem('td26_settings', JSON.stringify(updated));
                  } catch (err) {}
                  setPinSavedFeedback(true);
                  setTimeout(() => setPinSavedFeedback(false), 2500);
                }}
                className="w-36 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-mono text-center font-bold tracking-widest text-sm outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[11px] text-[var(--ink-muted)] font-sans">
                Protects the main stage console from gate volunteers, staff, or audience participants.
              </span>
            </div>
          </div>

          {/* Gate Access PIN Setting */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>GATE STATION ACCESS PIN:</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...localSettings, gateAccessPin: '2026' };
                  setLocalSettings(updated);
                  onUpdateSettings(updated);
                  try {
                    localStorage.setItem('td26_gate_pin', '2026');
                    localStorage.setItem('td26_settings', JSON.stringify(updated));
                  } catch (e) {}
                  setPinSavedFeedback(true);
                  setTimeout(() => setPinSavedFeedback(false), 2500);
                }}
                className="text-[10px] text-amber-500 hover:underline font-mono cursor-pointer"
              >
                Reset to default (2026)
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                maxLength={10}
                placeholder="2026"
                value={localSettings.gateAccessPin || ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  const updated = { ...localSettings, gateAccessPin: val };
                  setLocalSettings(updated);
                  onUpdateSettings(updated);
                  try {
                    localStorage.setItem('td26_gate_pin', val);
                    localStorage.setItem('td26_settings', JSON.stringify(updated));
                  } catch (err) {}
                  setPinSavedFeedback(true);
                  setTimeout(() => setPinSavedFeedback(false), 2500);
                }}
                className="w-36 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-mono text-center font-bold tracking-widest text-sm outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-[var(--ink-muted)] font-sans">
                Only volunteers with this passkey can unlock the QR scanner station.
              </span>
            </div>
          </div>

          {/* Passcode Instant Feedback Banner */}
          {pinSavedFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Passcodes updated &amp; active immediately! Previous codes are now rejected.</span>
            </div>
          )}

          {/* Shareable Scanner Link */}
          <div className="space-y-1.5 pt-3 border-t border-[var(--border)]">
            <label className="font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
              <span>VOLUNTEER SCANNER STATION LINK (SHARE WITH ENTRANCE CREW):</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/attendance` : 'https://teachers-day-raffle-system.web.app/attendance'}
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-mono text-xs select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopyGateUrl}
                className="px-4 py-2 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedGateUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[var(--ink-muted)]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <a
                href="/attendance"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span>Open Terminal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Phone Setup with Supabase Auto-Connect */}
          <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                <span>MOBILE PHONE 1-SCAN SETUP (AUTO-CONNECTS SUPABASE &amp; 2,000 TEACHERS):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleQuickSetupQr}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQuickSetupQr ? 'Hide Station QR' : 'Show Station Setup QR'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyQuickSetupUrl}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedQuickSetupUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedQuickSetupUrl ? 'Copied!' : 'Copy Mobile Link'}</span>
                </button>
              </div>
            </div>

            {showQuickSetupQr && (
              <div className="bg-[var(--surface)] border border-amber-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                {quickSetupQrUrl ? (
                  <div className="p-2 bg-white rounded-lg shrink-0 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={quickSetupQrUrl} alt="Quick Setup QR" className="w-40 h-40 object-contain" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-[var(--surface-elevated)] rounded-lg flex items-center justify-center text-[var(--ink-muted)] text-xs">
                    Generating QR...
                  </div>
                )}
                <div className="space-y-2 text-[var(--ink)] text-xs">
                  <div className="font-bold uppercase text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Scan with Mobile Camera to Instantly Sync</span>
                  </div>
                  <p className="text-[var(--ink-muted)] leading-relaxed text-[11px]">
                    Point your mobile phone camera at this QR code. It opens the Gatekeeper Terminal with your Supabase database credentials automatically applied — immediately pulling all 2,000 teachers without typing anything on the phone!
                  </p>
                  <div className="text-[10px] font-mono text-[var(--ink-muted)] bg-[var(--surface-elevated)] p-2 rounded-lg border border-[var(--border)]">
                    Station PIN: <strong className="text-[var(--ink)]">{localSettings.gateAccessPin || '2026'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security & Multi-Network Highlights */}
          <div className="pt-2 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono text-[var(--ink)]">
            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
              <div className="font-bold flex items-center gap-1 text-[var(--ink)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Strictly Isolated</span>
              </div>
              <p className="text-[var(--ink-muted)] text-[10px] leading-tight font-sans">
                Gate volunteers cannot view or alter raffle prizes, winner rolls, or system configurations.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
              <div className="font-bold flex items-center gap-1 text-[var(--ink)]">
                <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
                <span>Any Network</span>
              </div>
              <p className="text-[var(--ink-muted)] text-[10px] leading-tight font-sans">
                No venue Wi-Fi needed. Works on 4G/5G mobile data, pocket Wi-Fi, or hotspot over HTTPS.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
              <div className="font-bold flex items-center gap-1 text-[var(--ink)]">
                <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Multi-Gate Sync</span>
              </div>
              <p className="text-[var(--ink-muted)] text-[10px] leading-tight font-sans">
                Gate 1, Gate 2, and VIP desks sync instantly to Supabase with real-time duplicate scan prevention.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Database Integration Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[var(--ink)] uppercase tracking-tight leading-none">
                SUPABASE CLOUD DATABASE
              </h4>
              <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
                Live attendance audit trail &amp; multi-station cloud synchronization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseUrl && supabaseAnonKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              {supabaseUrl && supabaseAnonKey ? 'CLOUD CONNECTED' : 'OFFLINE / LOCAL CACHE'}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] p-4 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)]">
                SUPABASE PROJECT URL:
              </label>
              {supabaseSource !== 'NONE' && (
                <span className="text-[9px] font-mono text-[var(--ink-muted)] uppercase">
                  Source: {supabaseSource === 'LOCAL_STORAGE' ? 'Browser Settings' : 'Build Environment'}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--ink)] font-mono text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-[10px] tracking-wider text-[var(--ink-muted)] mb-1">
              SUPABASE ANON PUBLIC KEY:
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--ink)] font-mono text-xs outline-none focus:border-emerald-500"
            />
          </div>

          {/* Test Status feedback */}
          {testStatus.message && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                  : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300'
              }`}
            >
              {testStatus.success ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus.loading || !supabaseUrl || !supabaseAnonKey}
              className="px-4 py-2 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-bold text-xs uppercase tracking-wider disabled:opacity-40 flex items-center gap-2 transition-all cursor-pointer"
            >
              {testStatus.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              ) : (
                <Database className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>Test Connection</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSupabase}
              disabled={!supabaseUrl || !supabaseAnonKey}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Save &amp; Connect Live</span>
            </button>

            {(supabaseUrl || supabaseAnonKey) && (
              <button
                type="button"
                onClick={handleClearSupabase}
                className="px-3 py-2 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-red-500 border border-[var(--border)] text-xs font-bold uppercase transition-all cursor-pointer"
                title="Clear credentials"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Database Quick Actions */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-3 text-xs">
          <div className="font-bold text-[var(--ink)] text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Database Setup &amp; Sync Utilities</span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink)] inline-flex items-center gap-1 font-mono underline"
            >
              Open Supabase Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopySchema}
              className="p-3 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedSchema ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Schema Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--ink-muted)]" />
                  <span>Copy SQL Schema</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePushParticipants}
              disabled={isSyncingParticipants || !supabaseUrl || !supabaseAnonKey}
              className="p-3 rounded-lg bg-[var(--surface-card)] hover:bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/50 text-[var(--ink)] font-bold text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSyncingParticipants ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Pushing Data...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-emerald-500" />
                  <span>Sync {participants.length.toLocaleString()} Teachers to Cloud</span>
                </>
              )}
            </button>
          </div>

          {syncProgress && (
            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] font-mono text-[11px] text-[var(--ink)]">
              {syncProgress}
            </div>
          )}

          <p className="text-[var(--ink-muted)] text-[11px] leading-relaxed pt-1">
            Tip: If you haven&apos;t created your Supabase tables yet, click <strong>&quot;Copy SQL Schema&quot;</strong>, open your Supabase project&apos;s <strong>SQL Editor</strong>, paste, and click <strong>Run</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
