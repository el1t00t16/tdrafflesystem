'use client';

import React, { useState, useEffect } from 'react';
import { SystemSettings, Participant, Winner, Prize, RaffleLog, SystemBackupPayload } from '../../lib/types';
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
  Sun,
  Moon,
  Download,
  Save,
  FileUp,
  Archive,
  PlayCircle,
  HardDrive,
  RotateCcw
} from 'lucide-react';
import QRCode from 'qrcode';
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
  winners?: Winner[];
  prizes?: Prize[];
  logs?: RaffleLog[];
  onExportBackup?: (note?: string) => void;
  onCreateSnapshot?: (note?: string) => { success: boolean; message: string; timestamp?: string };
  onRestoreSnapshot?: () => Promise<{ success: boolean; message: string }>;
  onRestoreFromBackupFile?: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  onResetDryRunOnly?: () => Promise<{ success: boolean; message: string; liveStageRemoved?: number; preDrawKept?: number }>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onPrepareNewEvent,
  totalParticipants,
  totalWinners,
  participants = [],
  winners = [],
  prizes = [],
  logs = [],
  onExportBackup,
  onCreateSnapshot,
  onRestoreSnapshot,
  onRestoreFromBackupFile,
  onResetDryRunOnly
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const mode = localStorage.getItem('td26_theme_mode');
      return mode === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    } catch {
      return false;
    }
  });

  const toggleDarkMode = (dark: boolean) => {
    setIsDarkMode(dark);
    try {
      if (dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        localStorage.setItem('td26_theme_mode', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('td26_theme_mode', 'light');
      }
    } catch (e) {}
  };

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

  // Backup & Dry Run Recovery state
  const preDrawWinnersCount = React.useMemo(() => {
    return (winners || []).filter((w) => w.drawType === 'PRE_DRAW').length;
  }, [winners]);

  const liveStageWinnersCount = React.useMemo(() => {
    return (winners || []).filter((w) => w.drawType === 'LIVE_STAGE').length;
  }, [winners]);

  const [snapshotInfo, setSnapshotInfo] = useState<{
    exists: boolean;
    timestamp?: string;
    note?: string;
    preDrawCount?: number;
    totalParticipants?: number;
  }>(() => {
    if (typeof window === 'undefined') return { exists: false };
    try {
      const raw = localStorage.getItem('td26_golden_snapshot');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          exists: true,
          timestamp: parsed.backupDate,
          note: parsed.backupNote,
          preDrawCount: parsed.summary?.preDrawWinnersCount ?? 0,
          totalParticipants: parsed.summary?.totalParticipants ?? 0
        };
      }
    } catch (e) {}
    return { exists: false };
  });

  const refreshSnapshotInfo = () => {
    try {
      const raw = localStorage.getItem('td26_golden_snapshot');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSnapshotInfo({
          exists: true,
          timestamp: parsed.backupDate,
          note: parsed.backupNote,
          preDrawCount: parsed.summary?.preDrawWinnersCount ?? 0,
          totalParticipants: parsed.summary?.totalParticipants ?? 0
        });
      } else {
        setSnapshotInfo({ exists: false });
      }
    } catch (e) {
      setSnapshotInfo({ exists: false });
    }
  };

  const [backupFeedback, setBackupFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isOperating, setIsOperating] = useState(false);
  const [showConfirmRestoreSnapshot, setShowConfirmRestoreSnapshot] = useState(false);
  const [showConfirmDryRunReset, setShowConfirmDryRunReset] = useState(false);
  const [showConfirmRestoreFile, setShowConfirmRestoreFile] = useState(false);
  const [fileToRestoreContent, setFileToRestoreContent] = useState<string>('');
  const [fileRestorePreview, setFileRestorePreview] = useState<any>(null);

  const handleDownloadBackup = () => {
    if (onExportBackup) {
      onExportBackup('Full System Backup');
      setBackupFeedback({
        success: true,
        message: 'System backup JSON file successfully generated and downloaded!'
      });
    }
  };

  const handleSaveSnapshot = () => {
    if (onCreateSnapshot) {
      const res = onCreateSnapshot('Post-Pre-Draw Official Snapshot');
      setBackupFeedback(res);
      refreshSnapshotInfo();
    }
  };

  const handleExecuteRestoreSnapshot = async () => {
    if (!onRestoreSnapshot) return;
    setIsOperating(true);
    setBackupFeedback(null);
    try {
      const res = await onRestoreSnapshot();
      setBackupFeedback(res);
      setShowConfirmRestoreSnapshot(false);
      refreshSnapshotInfo();
    } catch (err: any) {
      setBackupFeedback({
        success: false,
        message: `Restore failed: ${err?.message || err}`
      });
    } finally {
      setIsOperating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const contentStr = event.target?.result as string;
        const parsed = JSON.parse(contentStr);
        if (!parsed.summary || !Array.isArray(parsed.participants)) {
          setBackupFeedback({
            success: false,
            message: 'Invalid file format: selected file does not appear to be a valid Teachers Day raffle backup.'
          });
          return;
        }
        setFileToRestoreContent(contentStr);
        setFileRestorePreview(parsed);
        setShowConfirmRestoreFile(true);
      } catch (err) {
        setBackupFeedback({
          success: false,
          message: 'Failed to read backup file. Please select a valid JSON backup.'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestoreFile = async () => {
    if (!onRestoreFromBackupFile || !fileToRestoreContent) return;
    setIsOperating(true);
    setBackupFeedback(null);
    try {
      const res = await onRestoreFromBackupFile(fileToRestoreContent);
      setBackupFeedback(res);
      setShowConfirmRestoreFile(false);
      setFileToRestoreContent('');
      setFileRestorePreview(null);
      refreshSnapshotInfo();
    } catch (err: any) {
      setBackupFeedback({
        success: false,
        message: `File restore failed: ${err?.message || err}`
      });
    } finally {
      setIsOperating(false);
    }
  };

  const handleExecuteDryRunReset = async () => {
    if (!onResetDryRunOnly) return;
    setIsOperating(true);
    setBackupFeedback(null);
    try {
      const res = await onResetDryRunOnly();
      setBackupFeedback(res);
      setShowConfirmDryRunReset(false);
      refreshSnapshotInfo();
    } catch (err: any) {
      setBackupFeedback({
        success: false,
        message: `Dry run reset failed: ${err?.message || err}`
      });
    } finally {
      setIsOperating(false);
    }
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
      {/* Event Configuration Form */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm relative border-t-4 border-t-[#FF1E1E]">
        <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 dark:border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#FF1E1E]" />
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">SYSTEM SETTINGS</h3>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
                Event configuration &amp; raffle operational parameters
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1a1a1a] dark:text-white flex items-center gap-1 bg-[#f8f7f4] dark:bg-neutral-900 px-3 py-1 border border-[#1a1a1a]/30 dark:border-white/30">
              <CheckCircle className="w-3.5 h-3.5 text-[#FF1E1E]" /> Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">EVENT NAME:</label>
            <input
              type="text"
              value={localSettings.eventName}
              onChange={(e) => setLocalSettings({ ...localSettings, eventName: e.target.value })}
              className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/15 px-3.5 py-2.5 text-[#1a1a1a] dark:text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">EVENT DATE:</label>
              <input
                type="text"
                value={localSettings.eventDate}
                onChange={(e) => setLocalSettings({ ...localSettings, eventDate: e.target.value })}
                className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/15 px-3.5 py-2.5 text-[#1a1a1a] dark:text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
              />
            </div>

            <div>
              <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">LOCATION:</label>
              <input
                type="text"
                value={localSettings.location}
                onChange={(e) => setLocalSettings({ ...localSettings, location: e.target.value })}
                className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/15 px-3.5 py-2.5 text-[#1a1a1a] dark:text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">ORGANIZATION:</label>
            <input
              type="text"
              value={localSettings.organization}
              onChange={(e) => setLocalSettings({ ...localSettings, organization: e.target.value })}
              className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/15 px-3.5 py-2.5 text-[#1a1a1a] dark:text-white font-bold outline-none focus:border-[#FF1E1E] uppercase"
            />
          </div>

          {/* Display Mode / Theme Setting */}
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-black text-[#1a1a1a] dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4 text-neutral-400" /> : <Sun className="w-4 h-4 text-[#ff6a00]" />}
                <span>INTERFACE THEME (DARK / LIGHT MODE)</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] mt-0.5 max-w-sm">
                Choose between the crisp paper-white aesthetic (default) or the high-contrast dark room mode.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 border border-[#1a1a1a]/20 dark:border-white/20 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => toggleDarkMode(false)}
                className={`px-3 py-1.5 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  !isDarkMode
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => toggleDarkMode(true)}
                className={`px-3 py-1.5 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  isDarkMode
                    ? 'bg-white text-black'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Previous Winner Protection Setting */}
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 flex items-center justify-between">
            <div>
              <div className="font-black text-[#1a1a1a] dark:text-white text-sm uppercase tracking-wide">ALLOW MULTIPLE WINS</div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] mt-0.5 max-w-sm">
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
                  : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/30 dark:border-white/20'
              }`}
            >
              {localSettings.allowMultipleWins ? 'ALLOWED: ON' : 'PROTECTED: OFF'}
            </button>
          </div>

          {/* Animation Duration Slider */}
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-black text-[#1a1a1a] dark:text-white text-sm uppercase tracking-wide">ANIMATION DURATION</div>
                <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                  Duration of rapid name cycling before reveal (3 to 30 seconds)
                </p>
              </div>
              <span className="text-[#FF1E1E] font-black text-base font-mono">
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
              className="w-full accent-[#FF1E1E] cursor-pointer"
            />
            {/* Quick Duration Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono uppercase mr-1">Presets:</span>
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
                  className={`px-2.5 py-1 text-xs font-mono font-bold transition-all border ${
                    localSettings.animationDuration === sec
                      ? 'bg-[#FF1E1E] text-white border-[#FF1E1E] shadow-sm'
                      : 'bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#1a1a1a] dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Pre-Draw Reel Animation Duration */}
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-4 border border-[#1a1a1a]/20 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black text-[#1a1a1a] dark:text-white text-sm uppercase tracking-wide">
                  PRE-DRAW REEL ANIMATION DURATION
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                  Duration of 5-district shuffle reel during pre-draw station batches (1 to 15 seconds)
                </p>
              </div>
              <span className="text-indigo-600 font-black text-base font-mono">
                {localSettings.preDrawDuration || 3} SECONDS
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={localSettings.preDrawDuration || 3}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  preDrawDuration: Number(e.target.value)
                })
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            {/* Quick Duration Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono uppercase mr-1">
                Presets:
              </span>
              {[1, 2, 3, 5, 8, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      preDrawDuration: sec
                    })
                  }
                  className={`px-2.5 py-1 text-xs font-mono font-bold transition-all border ${
                    (localSettings.preDrawDuration || 3) === sec
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#1a1a1a] dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-sm uppercase tracking-wider shadow transition-all rounded-none"
          >
            Save Settings Changes
          </button>
        </form>
      </div>

      {/* EVENT BACKUP, SNAPSHOT & DRY RUN RECOVERY PANEL */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm space-y-5 relative border-t-4 border-t-[#38bdf8]">
        <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-[#38bdf8]" />
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
                EVENT BACKUP &amp; DRY RUN RECOVERY
              </h4>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
                Thursday Pre-Draw Protection &amp; Friday Morning Rehearsal Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 font-bold uppercase border border-indigo-300 dark:border-indigo-800">
              {preDrawWinnersCount} Pre-Draw Winners Locked
            </span>
          </div>
        </div>

        {/* Snapshot Status Info Banner */}
        <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-500" />
              <span>In-Browser Official Snapshot Slot:</span>
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
              snapshotInfo.exists
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-400'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300'
            }`}>
              {snapshotInfo.exists ? 'SNAPSHOT ACTIVE' : 'NO SNAPSHOT SAVED'}
            </span>
          </div>

          {snapshotInfo.exists ? (
            <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1 font-mono">
              <div className="flex flex-wrap items-center gap-3">
                <span>Saved: <strong>{new Date(snapshotInfo.timestamp || '').toLocaleString()}</strong></span>
                <span>Pre-Draw Winners: <strong className="text-indigo-600 dark:text-indigo-400">{snapshotInfo.preDrawCount}</strong></span>
                <span>Roster: <strong>{snapshotInfo.totalParticipants?.toLocaleString()}</strong></span>
              </div>
              {snapshotInfo.note && (
                <div className="text-[11px] text-neutral-500 italic">
                  Note: {snapshotInfo.note}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              After finishing Thursday&apos;s Pre-Draw and resetting non-winners for gate check-in, click <strong>&quot;Save Post-Pre-Draw Snapshot&quot;</strong> to lock your official pre-draw state before Friday morning&apos;s rehearsal.
            </p>
          )}
        </div>

        {/* Feedback message banner */}
        {backupFeedback && (
          <div
            className={`p-3.5 border text-xs font-mono flex items-start gap-2.5 animate-fade-in ${
              backupFeedback.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-800 dark:text-red-200'
            }`}
          >
            {backupFeedback.success ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">
                {backupFeedback.success ? 'OPERATION SUCCESSFUL' : 'NOTICE'}
              </span>
              {backupFeedback.message}
            </div>
            <button
              onClick={() => setBackupFeedback(null)}
              className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {/* Action 1: Download Full Backup File */}
          <div className="p-3.5 bg-[#f8f7f4] dark:bg-neutral-950 border border-emerald-500/30 flex flex-col justify-between gap-3">
            <div>
              <div className="font-black text-[#1a1a1a] dark:text-white uppercase flex items-center gap-1.5 text-xs">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>1. Download Full Backup (.json)</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-normal">
                Exports all participants, confirmed pre-draw winners, remaining prize counts, logs, and settings into a JSON file. Save to flash drive or Google Drive.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup File</span>
            </button>
          </div>

          {/* Action 2: Save Post-Pre-Draw Snapshot */}
          <div className="p-3.5 bg-[#f8f7f4] dark:bg-neutral-950 border border-amber-500/30 flex flex-col justify-between gap-3">
            <div>
              <div className="font-black text-[#1a1a1a] dark:text-white uppercase flex items-center gap-1.5 text-xs">
                <Save className="w-4 h-4 text-amber-500" />
                <span>2. Save Post-Pre-Draw Snapshot</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-normal">
                Instantly snapshots current state inside browser storage. Locks {preDrawWinnersCount} pre-draw winners and roster before running tests on Friday morning.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-black" />
              <span>Save Browser Snapshot</span>
            </button>
          </div>

          {/* Action 3: Restore Saved Snapshot */}
          <div className="p-3.5 bg-[#f8f7f4] dark:bg-neutral-950 border border-indigo-500/30 flex flex-col justify-between gap-3">
            <div>
              <div className="font-black text-[#1a1a1a] dark:text-white uppercase flex items-center gap-1.5 text-xs">
                <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>3. Restore Saved Snapshot (1-Click)</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-normal">
                Restores the locked Thursday post-pre-draw state. Replaces local cache and syncs to Supabase Cloud before the real event begins.
              </p>
            </div>
            <button
              type="button"
              disabled={!snapshotInfo.exists || isOperating}
              onClick={() => setShowConfirmRestoreSnapshot(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore Official Snapshot</span>
            </button>
          </div>

          {/* Action 4: Restore from Backup File */}
          <div className="p-3.5 bg-[#f8f7f4] dark:bg-neutral-950 border border-sky-500/30 flex flex-col justify-between gap-3">
            <div>
              <div className="font-black text-[#1a1a1a] dark:text-white uppercase flex items-center gap-1.5 text-xs">
                <FileUp className="w-4 h-4 text-sky-500" />
                <span>4. Restore from Backup File (.json)</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-normal">
                Upload a previously downloaded `.json` backup file. Useful if switching computers or recovering after a complete browser wipe.
              </p>
            </div>
            <label className="w-full py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#1a1a1a]/30 dark:border-white/20 text-[#1a1a1a] dark:text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer">
              <FileUp className="w-4 h-4 text-sky-500" />
              <span>Upload Backup File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isOperating}
              />
            </label>
          </div>
        </div>

        {/* Action 5: Dedicated Friday Morning Dry Run Cleanup Tool */}
        <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30 border-2 border-rose-500/40 space-y-2 font-mono">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span className="font-black text-xs uppercase text-rose-950 dark:text-rose-200">
                FRIDAY MORNING DRY RUN REHEARSAL CLEANUP
              </span>
            </div>
            <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 uppercase">
              RECOMMENDED POST-REHEARSAL ACTION
            </span>
          </div>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Tested the Live Stage raffle and gate attendance during rehearsal? This button <strong>purges ONLY the {liveStageWinnersCount} live stage test winners and test gate check-ins</strong>, restores drawn prize quantities, and keeps all <strong>{preDrawWinnersCount} Thursday Pre-Draw Winners 100% locked and safe</strong>!
          </p>
          <div className="pt-2">
            <button
              type="button"
              disabled={isOperating}
              onClick={() => setShowConfirmDryRunReset(true)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Friday Dry Run (Keep Pre-Draw Winners Intact)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Confirm Restore Snapshot */}
      {showConfirmRestoreSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] border-2 border-indigo-600 max-w-md w-full p-6 space-y-4 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase">
                <RotateCcw className="w-5 h-5" />
                <span>Restore Saved Snapshot?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmRestoreSnapshot(false)}
                className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              This will restore your official state saved on <strong>{new Date(snapshotInfo.timestamp || '').toLocaleString()}</strong>.
            </p>
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3 space-y-1">
              <div className="font-bold text-indigo-900 dark:text-indigo-200 uppercase">Snapshot Contents:</div>
              <div>• {snapshotInfo.preDrawCount} Pre-Draw Winners locked</div>
              <div>• {snapshotInfo.totalParticipants?.toLocaleString()} Participants roster</div>
              <div>• Cloud database (Supabase) will be synchronized</div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowConfirmRestoreSnapshot(false)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isOperating}
                onClick={handleExecuteRestoreSnapshot}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isOperating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm &amp; Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Restore from File */}
      {showConfirmRestoreFile && fileRestorePreview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] border-2 border-sky-600 max-w-md w-full p-6 space-y-4 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-black text-sm uppercase">
                <FileUp className="w-5 h-5" />
                <span>Restore Backup File?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmRestoreFile(false);
                  setFileToRestoreContent('');
                  setFileRestorePreview(null);
                }}
                className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              Backup created on: <strong>{new Date(fileRestorePreview.backupDate || '').toLocaleString()}</strong>
            </p>
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 space-y-1">
              <div className="font-bold text-sky-900 dark:text-sky-200 uppercase">Backup File Details:</div>
              <div>• {fileRestorePreview.summary?.totalParticipants?.toLocaleString()} Participants</div>
              <div>• {fileRestorePreview.summary?.preDrawWinnersCount ?? fileRestorePreview.summary?.totalWinners} Confirmed Pre-Draw Winners</div>
              <div>• {fileRestorePreview.summary?.totalPrizes} Prizes configured</div>
              <div>• Cloud database (Supabase) will be overwritten with backup state</div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmRestoreFile(false);
                  setFileToRestoreContent('');
                  setFileRestorePreview(null);
                }}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isOperating}
                onClick={handleExecuteRestoreFile}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isOperating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm &amp; Restore File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Reset Friday Dry Run */}
      {showConfirmDryRunReset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] border-2 border-rose-600 max-w-md w-full p-6 space-y-4 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm uppercase">
                <PlayCircle className="w-5 h-5" />
                <span>Reset Dry Run Rehearsal?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmDryRunReset(false)}
                className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              This cleans up all practice tests performed during Friday morning rehearsal:
            </p>
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 space-y-1.5">
              <div className="font-bold text-rose-900 dark:text-rose-200 uppercase">Cleanup Summary:</div>
              <div className="text-emerald-700 dark:text-emerald-300 font-bold">• Keeps all {preDrawWinnersCount} Thursday Pre-Draw Winners 100% SAFE</div>
              <div>• Removes {liveStageWinnersCount} Live Stage test winners from rehearsal</div>
              <div>• Restores drawn prize quantities back to available</div>
              <div>• Clears test entrance gate scans (fresh gate start)</div>
              <div>• Resets non-winners to Ineligible (ready for QR scan)</div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowConfirmDryRunReset(false)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isOperating}
                onClick={handleExecuteDryRunReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {isOperating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Clean Dry Run Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Event Preparation / Reset Panel */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm space-y-4 relative border-t-4 border-t-[#1a1a1a] dark:border-t-white">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a]/15 dark:border-white/10 pb-3">
          <ShieldCheck className="w-5 h-5 text-[#1a1a1a] dark:text-white" />
          <h4 className="font-black text-lg text-[#1a1a1a] dark:text-white uppercase tracking-tight">EVENT PREPARATION &amp; READINESS</h4>
        </div>

        <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Participants Loaded:</span>
            <span className={totalParticipants > 0 ? "text-[#1a1a1a] dark:text-white font-black" : "text-amber-600 dark:text-amber-400 font-bold"}>
              {totalParticipants > 0 ? `YES (${totalParticipants.toLocaleString()} PERSONNEL)` : '0 PERSONNEL (ROSTER EMPTY)'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">Previous Winners:</span>
            <span className="text-[#1a1a1a] dark:text-white font-bold">{totalWinners} recorded</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider">System Status:</span>
            <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-widest font-black ${
              totalParticipants > 0
                ? 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-white border-[#1a1a1a]/30 dark:border-white/20'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-500/40'
            }`}>
              {totalParticipants > 0 ? 'READY FOR EVENT' : 'AWAITING PARTICIPANTS ROSTER'}
            </span>
          </div>
        </div>

        {/* Reset Feedback Notification */}
        {resetFeedback && (
          <div
            className={`p-3.5 border text-xs font-mono flex items-start gap-2.5 animate-fade-in ${
              resetFeedback.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-800 dark:text-red-200'
            }`}
          >
            {resetFeedback.success ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">
                {resetFeedback.success ? 'RESET COMPLETED IN SUPABASE & LOCAL CACHE' : 'RESET NOTICE'}
              </span>
              {resetFeedback.message}
            </div>
            <button
              onClick={() => setResetFeedback(null)}
              className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => {
              setShowConfirmReset(true);
              setResetFeedback(null);
            }}
            className="w-full py-3 bg-[#f8f7f4] dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-900 border-2 border-[#1a1a1a] dark:border-white/20 hover:border-[#FF1E1E] text-[#1a1a1a] dark:text-neutral-300 hover:text-[#FF1E1E] dark:hover:text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-none"
          >
            <RefreshCw className="w-4 h-4 text-[#FF1E1E]" />
            <span>Prepare Fresh Event Session (Clear Previous Winners)</span>
          </button>
        </div>

        {showConfirmReset && (
          <div className="bg-[#fff5f5] dark:bg-[#0A0A0A] border-2 border-[#FF1E1E] p-4 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-red-700 dark:text-white font-black text-sm uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 text-[#FF1E1E]" />
              <span>Safety Confirmation Required</span>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              This will clear previous winner records, clear draw history, and reset participant winner flags to &quot;NO&quot; both <strong>locally and in Supabase Cloud</strong>. All prize quantities will reset back to full. {deleteParticipantsCheckbox ? <strong className="text-red-600 dark:text-red-400">WARNING: All {totalParticipants.toLocaleString()} participants will be permanently wiped!</strong> : <strong>The {totalParticipants.toLocaleString()} participant master list will NOT be deleted unless checked below.</strong>}
            </p>

            <div className="bg-white dark:bg-neutral-950 p-3 border border-[#1a1a1a]/15 dark:border-white/10 space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetAttendanceCheckbox}
                  onChange={(e) => setResetAttendanceCheckbox(e.target.checked)}
                  disabled={isResetting}
                  className="accent-[#FF1E1E] w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-[#1a1a1a] dark:text-white uppercase text-[11px] block">
                    Also Clear Attendance Gate Check-ins
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                    Check this to reset all teachers back to Ineligible (Absent) and clear all gate scan records in Supabase. Leave unchecked if attendees have already checked in at the gates.
                  </span>
                </div>
              </label>
            </div>

            <div className="bg-white dark:bg-neutral-950 p-3 border border-red-500/30 space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteParticipantsCheckbox}
                  onChange={(e) => setDeleteParticipantsCheckbox(e.target.checked)}
                  disabled={isResetting}
                  className="accent-[#FF1E1E] w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-red-600 dark:text-red-400 uppercase text-[11px] flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    Also Delete All Participants Masterlist (Purge Roster)
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                    DANGER: Check this ONLY if you want to completely delete all {totalParticipants.toLocaleString()} personnel from Supabase Cloud and local storage. You will need to import a new roster TSV/CSV file.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-neutral-700 dark:text-neutral-300 font-black uppercase text-[10px] tracking-wider mb-1">
                Type <strong>MALUNGON2026</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="MALUNGON2026"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={isResetting}
                className="w-full bg-white dark:bg-neutral-950 border-2 border-[#FF1E1E] p-2 text-[#1a1a1a] dark:text-white font-mono text-xs outline-none uppercase font-bold disabled:opacity-50"
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
                className="px-3 py-1.5 border border-[#1a1a1a]/30 dark:border-white/20 text-[#1a1a1a] dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold uppercase text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput !== 'MALUNGON2026' || isResetting}
                onClick={handleExecuteReset}
                className="px-4 py-1.5 bg-[#FF1E1E] hover:bg-[#ff3838] disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-wider shadow flex items-center gap-1.5"
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
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm space-y-5 relative border-t-4 border-t-[#ff6a00]">
        <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#ff6a00]/15 border border-[#ff6a00]/30 flex items-center justify-center text-[#ff6a00]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
                GATEKEEPER &amp; SCANNER STATIONS
              </h4>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
                Volunteer attendance passkey &amp; multi-gate mobile terminal link
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1a1a1a] dark:text-neutral-300">
              STATION SECURITY ACTIVE
            </span>
          </div>
        </div>

        <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 space-y-4 text-xs">
          {/* Admin Master Console PIN Setting */}
          <div className="space-y-1.5 pb-3 border-b border-[#1a1a1a]/15 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#FF1E1E]" />
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
                className="text-[10px] text-[#FF1E1E] hover:underline font-mono"
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
                className="w-36 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/25 dark:border-white/15 px-3 py-2 text-[#1a1a1a] dark:text-white font-mono text-center font-bold tracking-widest text-sm outline-none focus:border-[#FF1E1E]"
              />
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-sans">
                Protects the main stage console from gate volunteers, staff, or audience participants.
              </span>
            </div>
          </div>

          {/* Gate Access PIN Setting */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#ff6a00]" />
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
                className="text-[10px] text-[#ff6a00] hover:underline font-mono"
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
                className="w-36 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/25 dark:border-white/15 px-3 py-2 text-[#1a1a1a] dark:text-white font-mono text-center font-bold tracking-widest text-sm outline-none focus:border-[#ff6a00]"
              />
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-sans">
                Only volunteers with this passkey can unlock the QR scanner station.
              </span>
            </div>
          </div>

          {/* Passcode Instant Feedback Banner */}
          {pinSavedFeedback && (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Passcodes updated &amp; active immediately! Previous codes are now rejected.</span>
            </div>
          )}

          {/* Shareable Scanner Link */}
          <div className="space-y-1.5 pt-3 border-t border-[#1a1a1a]/15 dark:border-white/10">
            <label className="font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>VOLUNTEER SCANNER STATION LINK (SHARE WITH ENTRANCE CREW):</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/attendance` : 'https://teachers-day-raffle-system.web.app/attendance'}
                className="flex-1 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/25 dark:border-white/15 px-3 py-2 text-[#1a1a1a] dark:text-white font-mono text-xs select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopyGateUrl}
                className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#1a1a1a]/30 dark:border-white/20 text-[#1a1a1a] dark:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copiedGateUrl ? (
                  <>
                    <Check className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-[#22c55e]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <a
                href="/attendance"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#ff6a00] hover:bg-[#ff7b1a] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span>Open Terminal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Phone Setup with Supabase Auto-Connect */}
          <div className="pt-3 border-t border-[#1a1a1a]/15 dark:border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>MOBILE PHONE 1-SCAN SETUP (AUTO-CONNECTS SUPABASE &amp; 2,000 TEACHERS):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleQuickSetupQr}
                  className="px-3 py-1.5 bg-[#ff6a00]/10 hover:bg-[#ff6a00]/20 border border-[#ff6a00]/40 text-[#ff6a00] font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQuickSetupQr ? 'Hide Station QR' : 'Show Station Setup QR'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyQuickSetupUrl}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#1a1a1a]/30 dark:border-white/20 text-[#1a1a1a] dark:text-neutral-200 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
                >
                  {copiedQuickSetupUrl ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedQuickSetupUrl ? 'Copied!' : 'Copy Mobile Link'}</span>
                </button>
              </div>
            </div>

            {showQuickSetupQr && (
              <div className="bg-white dark:bg-neutral-900 border border-[#ff6a00]/40 p-4 rounded-sm flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                {quickSetupQrUrl ? (
                  <div className="p-2 bg-white rounded-sm shrink-0 shadow-md border border-neutral-200 dark:border-neutral-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={quickSetupQrUrl} alt="Quick Setup QR" className="w-40 h-40 object-contain" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-[#f8f7f4] dark:bg-neutral-950 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-xs">
                    Generating QR...
                  </div>
                )}
                <div className="space-y-2 text-[#1a1a1a] dark:text-neutral-300 text-xs">
                  <div className="font-bold text-[#1a1a1a] dark:text-white uppercase text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ff6a00] animate-ping" />
                    <span>Scan with Mobile Camera to Instantly Sync</span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[11px]">
                    Point your mobile phone camera at this QR code. It opens the Gatekeeper Terminal with your Supabase database credentials automatically applied — immediately pulling all 2,000 teachers without typing anything on the phone!
                  </p>
                  <div className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 bg-[#f8f7f4] dark:bg-neutral-950 p-2 border border-[#1a1a1a]/15 dark:border-white/10">
                    Station PIN: <strong className="text-[#1a1a1a] dark:text-white">{localSettings.gateAccessPin || '2026'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security & Multi-Network Highlights */}
          <div className="pt-2 border-t border-[#1a1a1a]/15 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono text-[#1a1a1a] dark:text-neutral-300">
            <div className="p-2.5 bg-white dark:bg-neutral-900/80 border border-[#1a1a1a]/15 dark:border-white/5 space-y-1">
              <div className="text-[#1a1a1a] dark:text-white font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Strictly Isolated</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[10px] leading-tight">
                Gate volunteers cannot view or alter raffle prizes, winner rolls, or system configurations.
              </p>
            </div>

            <div className="p-2.5 bg-white dark:bg-neutral-900/80 border border-[#1a1a1a]/15 dark:border-white/5 space-y-1">
              <div className="text-[#1a1a1a] dark:text-white font-bold flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Any Network</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[10px] leading-tight">
                No venue Wi-Fi needed. Works on 4G/5G mobile data, pocket Wi-Fi, or hotspot over HTTPS.
              </p>
            </div>

            <div className="p-2.5 bg-white dark:bg-neutral-900/80 border border-[#1a1a1a]/15 dark:border-white/5 space-y-1">
              <div className="text-[#1a1a1a] dark:text-white font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Multi-Gate Sync</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[10px] leading-tight">
                Gate 1, Gate 2, and VIP desks sync instantly to Supabase with real-time duplicate scan prevention.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Database Integration Panel */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm space-y-5 relative border-t-4 border-t-[#22c55e]">
        <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-[#22c55e]" />
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
                SUPABASE CLOUD DATABASE
              </h4>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
                Live attendance audit trail &amp; multi-station cloud synchronization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                supabaseUrl && supabaseAnonKey ? 'bg-[#22c55e] animate-pulse' : 'bg-[#eab308]'
              }`}
            />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1a1a1a] dark:text-neutral-300">
              {supabaseUrl && supabaseAnonKey ? 'CLOUD CONNECTED' : 'OFFLINE / LOCAL CACHE'}
            </span>
          </div>
        </div>

        <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-4 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300">
                SUPABASE PROJECT URL:
              </label>
              {supabaseSource !== 'NONE' && (
                <span className="text-[9px] font-mono text-neutral-500 dark:text-neutral-400 uppercase">
                  Source: {supabaseSource === 'LOCAL_STORAGE' ? 'Browser Settings' : 'Build Environment'}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-[#1a1a1a]/25 dark:border-white/15 px-3.5 py-2.5 text-[#1a1a1a] dark:text-white font-mono text-xs outline-none focus:border-[#22c55e]"
            />
          </div>

          <div>
            <label className="block font-black uppercase text-[10px] tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
              SUPABASE ANON PUBLIC KEY:
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-[#1a1a1a]/25 dark:border-white/15 px-3.5 py-2.5 text-[#1a1a1a] dark:text-white font-mono text-xs outline-none focus:border-[#22c55e]"
            />
          </div>

          {/* Test Status feedback */}
          {testStatus.message && (
            <div
              className={`p-3 border text-xs flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-500/50 text-red-800 dark:text-red-200'
              }`}
            >
              {testStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus.loading || !supabaseUrl || !supabaseAnonKey}
              className="px-4 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#1a1a1a]/30 dark:border-white/20 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 flex items-center gap-2 transition-all"
            >
              {testStatus.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22c55e]" />
              ) : (
                <Database className="w-3.5 h-3.5 text-[#22c55e]" />
              )}
              <span>Test Connection</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSupabase}
              disabled={!supabaseUrl || !supabaseAnonKey}
              className="px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-black" />
              <span>Save &amp; Connect Live</span>
            </button>

            {(supabaseUrl || supabaseAnonKey) && (
              <button
                type="button"
                onClick={handleClearSupabase}
                className="px-3 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white border border-[#1a1a1a]/20 dark:border-white/15 text-xs font-bold uppercase transition-all"
                title="Clear credentials"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Database Quick Actions */}
        <div className="border border-[#1a1a1a]/15 dark:border-white/10 bg-[#f8f7f4] dark:bg-neutral-950 p-4 space-y-3 text-xs">
          <div className="font-black text-[#1a1a1a] dark:text-white text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Database Setup &amp; Sync Utilities</span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white inline-flex items-center gap-1 font-mono underline"
            >
              Open Supabase Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopySchema}
              className="p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#1a1a1a]/25 dark:border-white/15 hover:border-[#1a1a1a] dark:hover:border-white/30 text-[#1a1a1a] dark:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              {copiedSchema ? (
                <>
                  <Check className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-[#22c55e]">Schema Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                  <span>Copy SQL Schema</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePushParticipants}
              disabled={isSyncingParticipants || !supabaseUrl || !supabaseAnonKey}
              className="p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#1a1a1a]/25 dark:border-white/15 hover:border-[#22c55e] text-[#1a1a1a] dark:text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
            >
              {isSyncingParticipants ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#22c55e]" />
                  <span>Pushing Data...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-[#22c55e]" />
                  <span>Sync {participants.length.toLocaleString()} Teachers to Cloud</span>
                </>
              )}
            </button>
          </div>

          {syncProgress && (
            <div className="p-2.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/15 dark:border-white/10 font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
              {syncProgress}
            </div>
          )}

          <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed pt-1">
            Tip: If you haven&apos;t created your Supabase tables yet, click <strong>&quot;Copy SQL Schema&quot;</strong>, open your Supabase project&apos;s <strong>SQL Editor</strong>, paste, and click <strong>Run</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
