'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Lock, ShieldCheck, Loader2, RefreshCw, AlertTriangle, Database, Moon, Sun } from 'lucide-react';
import { GateLoginForm } from '../../components/attendance/GateLoginForm';
import { AttendanceScannerModule } from '../../components/attendance/AttendanceScannerModule';
import { Participant, AttendanceRecord, GateSession } from '../../lib/types';
import { INITIAL_PARTICIPANTS } from '../../lib/data';
import { useTheme } from '../../lib/theme';

import {
  isSupabaseConfigured,
  setSupabaseCredentials,
  fetchParticipantsFromSupabase,
  fetchAttendanceRecordsFromSupabase
} from '../../lib/supabase';

export default function AttendancePage() {
  const { isDark, toggleDarkMode } = useTheme();
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [gateSession, setGateSession] = useState<GateSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);

  // Check saved session on mount + handle quick-setup credentials passed via URL (?surl=...&skey=...)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const qUrl = urlParams.get('surl');
        const qKey = urlParams.get('skey');
        if (qUrl && qKey) {
          setSupabaseCredentials(decodeURIComponent(qUrl), decodeURIComponent(qKey));
          // Strip sensitive credentials from address bar without reloading
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, '', cleanPath);
        }
      }
    } catch (e) {
      console.error('Error parsing cloud quick-setup params:', e);
    }

    setIsCloudConfigured(isSupabaseConfigured());

    try {
      const stored = localStorage.getItem('td26_gate_session') || sessionStorage.getItem('td26_gate_session');
      if (stored) {
        const parsed: GateSession = JSON.parse(stored);
        if (parsed && parsed.isLoggedIn) {
          setGateSession(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading gate session:', e);
    } finally {
      setSessionChecked(true);
    }
  }, []);

  const triggerCloudHydration = async () => {
    if (!isSupabaseConfigured()) return;
    setIsHydrating(true);
    setLastSyncStatus('Syncing with Supabase Cloud...');
    try {
      const [cloudParts, cloudAtt] = await Promise.all([
        fetchParticipantsFromSupabase(),
        fetchAttendanceRecordsFromSupabase()
      ]);

      if (cloudParts && cloudParts.length > 0) {
        setParticipants(cloudParts);
        try {
          localStorage.setItem('td26_profiling_participants', JSON.stringify(cloudParts));
        } catch (e) {
          console.error(e);
        }
      }

      if (cloudAtt && cloudAtt.length > 0) {
        setAttendanceRecords(cloudAtt);
        try {
          localStorage.setItem('td26_attendance_records', JSON.stringify(cloudAtt));
        } catch (e) {
          console.error(e);
        }
      }

      setLastSyncStatus(`Cloud synced: ${cloudParts?.length || 0} registered teachers loaded.`);
      setTimeout(() => setLastSyncStatus(null), 4000);
    } catch (err) {
      console.warn('Supabase attendance station hydration warning:', err);
      setLastSyncStatus('Cloud sync failed or offline.');
      setTimeout(() => setLastSyncStatus(null), 4000);
    } finally {
      setIsHydrating(false);
    }
  };

  // Synchronize with local storage + Cloud Supabase
  useEffect(() => {
    try {
      const isPurged = localStorage.getItem('td26_seed_data_purged_v1');
      if (!isPurged) {
        localStorage.removeItem('td26_winners');
        localStorage.removeItem('td26_attendance_records');
        const existingParts = localStorage.getItem('td26_profiling_participants');
        if (existingParts) {
          const parsed = JSON.parse(existingParts);
          if (Array.isArray(parsed) && (parsed.length === 44 || parsed.some((p: any) => p.id === 'W-2026-49550'))) {
            localStorage.removeItem('td26_profiling_participants');
          }
        }
        localStorage.setItem('td26_seed_data_purged_v1', 'true');
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const cached = localStorage.getItem('td26_profiling_participants');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setParticipants(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load participants cache:', e);
    }

    try {
      const cachedAttendance = localStorage.getItem('td26_attendance_records');
      if (cachedAttendance) {
        const parsed = JSON.parse(cachedAttendance);
        if (Array.isArray(parsed)) {
          setAttendanceRecords(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load attendance cache:', e);
    }

    // Live cloud hydration if configured
    if (isSupabaseConfigured()) {
      triggerCloudHydration();
    }
  }, []);

  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleBatchUpdateParticipants = (batch: Participant[]) => {
    setParticipants(batch);
    try {
      localStorage.setItem('td26_profiling_participants', JSON.stringify(batch));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      if (prev.some((r) => r.id === record.id || r.participantId === record.participantId)) {
        return prev.map((r) => (r.id === record.id || r.participantId === record.participantId ? { ...r, ...record } : r));
      }
      const next = [record, ...prev];
      try {
        localStorage.setItem('td26_attendance_records', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('td26_gate_session');
      sessionStorage.removeItem('td26_gate_session');
    } catch (e) {
      console.error(e);
    }
    setGateSession(null);
  };

  // While validating stored session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-neutral-400 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#ff6a00] mr-2" />
        Verifying Gate Station Session...
      </div>
    );
  }

  // If not authenticated, require Gate PIN and Station setup
  if (!gateSession) {
    return <GateLoginForm onLoginSuccess={setGateSession} />;
  }

  const presentCount = participants.filter((p) => p.eligible === 'ELIGIBLE' || p.attendedAt).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans transition-colors selection:bg-[var(--accent)] selection:text-black">
      {/* Top Station Bar - Isolated Workstation for Gate Personnel */}
      <header className="bg-[var(--header-bg)] text-[var(--ink)] border-b border-[var(--border)] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[var(--badge-bg)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCloudConfigured ? 'bg-[#22c55e] animate-pulse' : 'bg-yellow-400'
                }`}
              />
              <h1 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                {gateSession.stationId}
              </h1>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs border font-bold uppercase tracking-wider ${
                  isCloudConfigured
                    ? 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e]'
                    : 'bg-yellow-400/15 border-yellow-400/40 text-yellow-300'
                }`}
              >
                {isCloudConfigured ? 'Cloud Live' : 'Offline Cache'}
              </span>
            </div>
            <p className="font-mono text-[11px] text-neutral-400">
              Officer in-charge: <strong className="text-white">{gateSession.officerName}</strong>
            </p>
          </div>
        </div>

        {/* Status Counters & Logout */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {/* Cloud Sync Refresh Button */}
          {isCloudConfigured && (
            <button
              onClick={triggerCloudHydration}
              disabled={isHydrating}
              title="Refresh cloud roster from Supabase"
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white rounded-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHydrating ? 'animate-spin text-[#22c55e]' : ''}`} />
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 px-2.5 py-1.5 rounded-sm transition-colors text-xs text-neutral-300 hover:text-white cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden md:inline">{isDark ? 'Dark' : 'Light'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-sm">
            <span className="text-neutral-400 text-[11px] uppercase">CHECKED-IN:</span>
            <span className="px-1.5 py-0.5 bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 font-bold text-xs">
              {presentCount} / {participants.length}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Lock and switch station / officer"
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-red-950/60 border border-white/15 hover:border-red-500/50 text-neutral-300 hover:text-red-300 px-3 py-1.5 font-bold uppercase tracking-wider transition-colors text-xs rounded-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Station</span>
            <span className="sm:hidden">Lock</span>
          </button>
        </div>
      </header>

      {/* Main Scanner Workstation */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8">
        {/* Status notification toast if sync just ran */}
        {lastSyncStatus && (
          <div className="mb-3 bg-neutral-900 border border-[#22c55e]/40 text-[#22c55e] px-3.5 py-2 text-xs font-mono flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>{lastSyncStatus}</span>
          </div>
        )}

        {/* Empty Roster Guidance Alert */}
        {participants.length === 0 && (
          <div className="mb-4 bg-amber-950/40 border-2 border-amber-500/70 p-4 rounded-sm text-amber-200 font-mono text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-white uppercase text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>ROSTER EMPTY ON THIS DEVICE (0 REGISTERED)</span>
            </div>
            <p className="text-amber-300/90 text-xs leading-relaxed">
              This mobile station has 0 registered teachers in its local memory. Any badge scanned right now will show as <strong>&quot;UNKNOWN PARTICIPANT&quot;</strong> because the master list has not been loaded.
            </p>
            <div className="bg-black/50 border border-amber-500/30 p-3 rounded-xs space-y-1.5 text-[11px] text-neutral-200">
              <div className="font-bold text-amber-400 uppercase tracking-wider">How to load the teachers into this phone:</div>
              <div>
                1. <strong>Cloud Sync (Supabase):</strong> Ensure the Admin has clicked <em>&quot;Sync Teachers to Cloud&quot;</em> on their main PC laptop. Then tap the button below to pull the roster into this phone.
              </div>
              <div>
                2. <strong>Offline CSV Transfer:</strong> In the <em>OFFLINE SYNC / CSV</em> card below, tap <em>&quot;Merge&quot;</em> to import the attendance/participants CSV file.
              </div>
            </div>
            {isCloudConfigured && (
              <button
                onClick={triggerCloudHydration}
                disabled={isHydrating}
                className="mt-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase text-xs rounded-xs flex items-center gap-2 shadow"
              >
                <RefreshCw className={`w-4 h-4 ${isHydrating ? 'animate-spin' : ''}`} />
                <span>{isHydrating ? 'Fetching Teachers from Cloud...' : 'Fetch Roster from Supabase Cloud Now'}</span>
              </button>
            )}
          </div>
        )}

        <AttendanceScannerModule
          participants={participants}
          attendanceRecords={attendanceRecords}
          onUpdateParticipant={handleUpdateParticipant}
          onBatchUpdateParticipants={handleBatchUpdateParticipants}
          onAddAttendanceRecord={handleAddAttendanceRecord}
          initialStationId={gateSession.stationId}
          initialOfficerName={gateSession.officerName}
          isStandaloneGate={true}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#1a1a1a]/15 px-6 py-3 text-center font-mono text-[11px] text-neutral-500 uppercase tracking-widest flex flex-wrap items-center justify-between gap-2">
        <span>Municipal Teachers&apos; Day 2026 • Malungon Gate Entrance Scanner • Region XII</span>
        <span className="text-neutral-400 text-[10px]">Station: {gateSession.stationId}</span>
      </footer>
    </div>
  );
}
