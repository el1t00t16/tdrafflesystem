'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Lock, ShieldCheck, Loader2, RefreshCw, AlertTriangle, Database, Sun, Moon, Printer } from 'lucide-react';
import { ClaimsLoginForm } from '../../components/claims/ClaimsLoginForm';
import { RealtimeClaimsWorkstation } from '../../components/claims/RealtimeClaimsWorkstation';
import { PrintQueueStation } from '../../components/admin/PrintQueueStation';
import { Winner, ClaimStationSession } from '../../lib/types';
import {
  isSupabaseConfigured,
  setSupabaseCredentials,
  fetchWinnersFromSupabase,
  updateClaimInSupabase,
  subscribeToRealtimeUpdates,
  syncWinnerPrintStatusToSupabase
} from '../../lib/supabase';
import {
  markWinnerAsPrintedInStorage,
  markWinnersBatchAsPrintedInStorage,
  markWinnerAsUnprintedInStorage,
  mergeWinnersWithPrintStatus
} from '../../lib/printQueueStorage';
import { soundSynthesizer } from '../../lib/sound';

export default function ClaimsPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [claimSession, setClaimSession] = useState<ClaimStationSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeStationTab, setActiveStationTab] = useState<'claims' | 'print-queue'>('claims');

  useEffect(() => {
    try {
      const mode = localStorage.getItem('td26_theme_mode');
      const isDark = mode === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    } catch (e) {}
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    try {
      if (nextDark) {
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

  // Parse quick-setup credentials from URL if provided (?surl=...&skey=...)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const qUrl = urlParams.get('surl');
        const qKey = urlParams.get('skey');
        if (qUrl && qKey) {
          setSupabaseCredentials(decodeURIComponent(qUrl), decodeURIComponent(qKey));
          // Clean sensitive URL parameters from browser address bar
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, '', cleanPath);
        }
      }
    } catch (e) {
      console.error('Error parsing cloud params:', e);
    }

    setIsCloudConfigured(isSupabaseConfigured());

    // Check stored session
    try {
      const stored =
        localStorage.getItem('td26_claim_session') ||
        sessionStorage.getItem('td26_claim_session');
      if (stored) {
        const parsed: ClaimStationSession = JSON.parse(stored);
        if (parsed && parsed.isLoggedIn) {
          setClaimSession(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading claims session:', e);
    } finally {
      setSessionChecked(true);
    }
  }, []);

  // Fetch / Hydrate Winners from Cloud
  const triggerCloudHydration = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setIsHydrating(true);
    setLastSyncStatus('Syncing official winners from Supabase Cloud...');
    try {
      const cloudWinners = await fetchWinnersFromSupabase();
      if (cloudWinners && cloudWinners.length >= 0) {
        const mergedWinners = mergeWinnersWithPrintStatus(cloudWinners);
        setWinners(mergedWinners);
        try {
          localStorage.setItem('td26_winners', JSON.stringify(mergedWinners));
        } catch (e) {
          console.error(e);
        }
        setLastSyncStatus(`Cloud synced: ${cloudWinners.length} official winners loaded.`);
      }
      setTimeout(() => setLastSyncStatus(null), 4000);
    } catch (err) {
      console.warn('Supabase claims station hydration warning:', err);
      setLastSyncStatus('Cloud sync failed or offline.');
      setTimeout(() => setLastSyncStatus(null), 4000);
    } finally {
      setIsHydrating(false);
    }
  }, []);

  // Initial local storage load + initial cloud hydration
  useEffect(() => {
    try {
      const cached = localStorage.getItem('td26_winners');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWinners(mergeWinnersWithPrintStatus(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load winners cache:', e);
    }

    if (isSupabaseConfigured()) {
      triggerCloudHydration();
    }
  }, [triggerCloudHydration]);

  // Real-time live listener for updates across devices
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = subscribeToRealtimeUpdates({
      onWinnerChange: (incomingWinner) => {
        if (!incomingWinner.winnerId) return;
        setWinners((prev) => {
          const index = prev.findIndex((w) => w.winnerId === incomingWinner.winnerId);
          let next: Winner[];
          if (index >= 0) {
            next = [...prev];
            next[index] = { ...next[index], ...incomingWinner };
          } else {
            next = [incomingWinner, ...prev];
          }
          try {
            localStorage.setItem('td26_winners', JSON.stringify(next));
          } catch (e) {
            console.error(e);
          }
          return next;
        });
      },
      onWinnerDelete: (deletedWinnerId) => {
        setWinners((prev) => {
          const next = prev.filter((w) => w.winnerId && w.winnerId !== deletedWinnerId);
          try {
            localStorage.setItem('td26_winners', JSON.stringify(next));
          } catch (e) {
            console.error(e);
          }
          return next;
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle Prize Claim
  const handleClaimPrize = async (
    winnerId: string,
    claimedBy: string,
    details?: {
      idPresented?: string;
      isProxyClaim?: boolean;
      proxyName?: string;
      proxyRelationship?: string;
      claimNotes?: string;
    }
  ) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          return {
            ...w,
            claimStatus: 'CLAIMED' as const,
            claimedAt: timestamp,
            claimedBy: claimedBy || 'Claims Desk',
            idPresented: details?.idPresented || w.idPresented || 'DepEd Employee ID',
            isProxyClaim: details?.isProxyClaim ?? w.isProxyClaim,
            proxyName: details?.proxyName || w.proxyName,
            proxyRelationship: details?.proxyRelationship || w.proxyRelationship,
            claimNotes: details?.claimNotes || w.claimNotes
          };
        }
        return w;
      });
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Cloud push
    await updateClaimInSupabase(winnerId, {
      claimStatus: 'CLAIMED',
      claimedAt: timestamp,
      claimedBy: claimedBy || 'Claims Desk',
      idPresented: details?.idPresented || 'DepEd Employee ID',
      isProxyClaim: details?.isProxyClaim ?? false,
      proxyName: details?.proxyName,
      proxyRelationship: details?.proxyRelationship,
      claimNotes: details?.claimNotes
    }).catch((err) => console.warn('Supabase claim update failed:', err));
  };

  // Handle Unclaim (Revert)
  const handleUnclaimPrize = async (winnerId: string) => {
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          return {
            ...w,
            claimStatus: 'UNCLAIMED' as const,
            claimedAt: undefined,
            claimedBy: undefined
          };
        }
        return w;
      });
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    await updateClaimInSupabase(winnerId, {
      claimStatus: 'UNCLAIMED'
    }).catch((err) => console.warn('Supabase unclaim update failed:', err));
  };

  // Handle Forfeiture
  const handleForfeitPrize = async (winnerId: string, reason?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          return {
            ...w,
            claimStatus: 'FORFEITED' as const,
            forfeitedAt: timestamp,
            forfeitReason: reason || 'Unclaimed by deadline / Absent on stage'
          };
        }
        return w;
      });
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    await updateClaimInSupabase(winnerId, {
      claimStatus: 'FORFEITED',
      forfeitedAt: timestamp,
      forfeitReason: reason || 'Unclaimed by deadline / Absent on stage'
    }).catch((err) => console.warn('Supabase forfeit update failed:', err));
  };

  // Logout / Lock Station
  const handleLogout = () => {
    soundSynthesizer.playClick();
    try {
      localStorage.removeItem('td26_claim_session');
      sessionStorage.removeItem('td26_claim_session');
    } catch (e) {
      console.error(e);
    }
    setClaimSession(null);
  };

  // Print Queue Handlers
  const handleMarkAsPrinted = (winnerId: string) => {
    const timestamp = new Date().toISOString();
    const officer = claimSession?.officerName || 'Claims Desk';
    markWinnerAsPrintedInStorage(winnerId, officer);
    syncWinnerPrintStatusToSupabase([winnerId], true, officer);
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          return {
            ...w,
            isPrinted: true,
            printedAt: timestamp,
            printedBy: officer
          };
        }
        return w;
      });
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving printed winner:', e);
      }
      return updated;
    });
  };

  const handleMarkBatchAsPrinted = (winnerIds: string[]) => {
    const timestamp = new Date().toISOString();
    const officer = claimSession?.officerName || 'Claims Desk';
    markWinnersBatchAsPrintedInStorage(winnerIds, officer);
    syncWinnerPrintStatusToSupabase(winnerIds, true, officer);
    const idSet = new Set(winnerIds);
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (idSet.has(w.winnerId)) {
          return {
            ...w,
            isPrinted: true,
            printedAt: timestamp,
            printedBy: officer
          };
        }
        return w;
      });
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving printed batch:', e);
      }
      return updated;
    });
  };

  const handleRequeueWinner = (winnerId: string) => {
    soundSynthesizer.playClick();
    markWinnerAsUnprintedInStorage(winnerId);
    syncWinnerPrintStatusToSupabase([winnerId], false);
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          return {
            ...w,
            isPrinted: false,
            printedAt: undefined,
            printedBy: undefined
          };
        }
        return w;
      });
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error('Error requeueing winner:', e);
      }
      return updated;
    });
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-neutral-400 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#ff6a00] mr-2" />
        Verifying Prize Claim Station Session...
      </div>
    );
  }

  if (!claimSession) {
    return <ClaimsLoginForm onLoginSuccess={setClaimSession} />;
  }

  const unclaimedCount = winners.filter((w) => w.claimStatus === 'UNCLAIMED').length;
  const claimedCount = winners.filter((w) => w.claimStatus === 'CLAIMED').length;
  const pendingPrintCount = winners.filter((w) => !w.isPrinted).length;

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-[#09090b] text-[#1a1a1a] dark:text-neutral-100 flex flex-col font-sans selection:bg-[#ff6a00] selection:text-white">
      {/* Top Station Header */}
      <header className="bg-white dark:bg-[#18181b] text-[#1a1a1a] dark:text-[#f8f7f4] border-b-2 border-[#1a1a1a] dark:border-black px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 select-none print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00]">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCloudConfigured ? 'bg-[#22c55e] animate-pulse' : 'bg-yellow-400'
                }`}
              />
              <h1 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-white">
                {claimSession.stationId}
              </h1>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs border font-bold uppercase tracking-wider ${
                  isCloudConfigured
                    ? 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e]'
                    : 'bg-yellow-400/15 border-yellow-400/40 text-yellow-500 dark:text-yellow-300'
                }`}
              >
                {isCloudConfigured ? 'Cloud Live' : 'Offline Cache'}
              </span>
            </div>
            <p className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
              Officer in-charge: <strong className="text-[#1a1a1a] dark:text-white">{claimSession.officerName}</strong>
            </p>
          </div>
        </div>

        {/* Status Counters & Controls */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {isCloudConfigured && (
            <button
              onClick={triggerCloudHydration}
              disabled={isHydrating}
              title="Refresh winners from Supabase"
              className="p-1.5 bg-[#f8f7f4] dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-[#1a1a1a]/20 dark:border-white/10 text-[#1a1a1a] dark:text-neutral-300 hover:text-black dark:hover:text-white rounded-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHydrating ? 'animate-spin text-[#22c55e]' : ''}`} />
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-[#f8f7f4] dark:bg-white/5 border border-[#1a1a1a]/20 dark:border-white/10 px-3 py-1.5 rounded-sm">
            <span className="text-neutral-600 dark:text-neutral-400 text-[11px] uppercase">PENDING:</span>
            <span className="px-1.5 py-0.5 bg-[#ff6a00]/20 text-[#ff6a00] border border-[#ff6a00]/30 font-bold text-xs">
              {unclaimedCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f8f7f4] dark:bg-white/5 border border-[#1a1a1a]/20 dark:border-white/10 px-3 py-1.5 rounded-sm">
            <span className="text-neutral-600 dark:text-neutral-400 text-[11px] uppercase">CLAIMED:</span>
            <span className="px-1.5 py-0.5 bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 font-bold text-xs">
              {claimedCount} / {winners.length}
            </span>
          </div>

          <button
            onClick={() => setActiveStationTab('print-queue')}
            title="Switch to Winner Print Queue"
            className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
              activeStationTab === 'print-queue'
                ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 text-amber-900 dark:text-amber-200'
                : 'bg-[#f8f7f4] dark:bg-white/5 border-[#1a1a1a]/20 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-amber-500'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] uppercase hidden sm:inline">PRINT QUEUE:</span>
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs">
              {pendingPrintCount}
            </span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f8f7f4] dark:bg-neutral-800 border border-[#1a1a1a]/25 dark:border-white/20 hover:border-black dark:hover:border-white text-[#1a1a1a] dark:text-white font-bold text-xs uppercase tracking-wider transition-colors rounded-sm"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-yellow-400" /> : <Moon className="w-3.5 h-3.5 text-neutral-600" />}
            <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={handleLogout}
            title="Lock and switch station / officer"
            className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-red-100 dark:hover:bg-red-950/60 border border-[#1a1a1a]/25 dark:border-white/15 hover:border-red-500/50 text-neutral-700 dark:text-neutral-300 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 font-bold uppercase tracking-wider transition-colors text-xs rounded-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Station</span>
            <span className="sm:hidden">Lock</span>
          </button>
        </div>
      </header>

      {/* Station Module Selector Bar */}
      <div className="bg-white dark:bg-[#121215] border-b-2 border-[#1a1a1a] dark:border-white/10 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStationTab('claims')}
            className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-[#1a1a1a] dark:border-white/20 cursor-pointer ${
              activeStationTab === 'claims'
                ? 'bg-[#ff6a00] text-black shadow-xs font-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-[#f8f7f4] dark:hover:bg-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fast Realtime Claiming</span>
            <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono">
              {unclaimedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveStationTab('print-queue')}
            className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-[#1a1a1a] dark:border-white/20 cursor-pointer ${
              activeStationTab === 'print-queue'
                ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-xs font-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-[#f8f7f4] dark:hover:bg-neutral-800'
            }`}
          >
            <Printer className={`w-3.5 h-3.5 ${activeStationTab === 'print-queue' ? 'text-[#ff6a00]' : 'text-neutral-500'}`} />
            <span>Winner Print Queue &amp; Stub Dispatch</span>
            {pendingPrintCount > 0 && (
              <span className="bg-[#FF1E1E] text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono font-black animate-pulse">
                {pendingPrintCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] font-mono text-neutral-500 hidden md:block">
          Official 1/4 Letter Verification Stubs • Real-time QR Camera Interop
        </div>
      </div>

      {/* Main Workstation Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none print:w-full">
        {/* Status notification toast */}
        {lastSyncStatus && (
          <div className="mb-3 bg-neutral-900 border border-[#22c55e]/40 text-[#22c55e] px-3.5 py-2 text-xs font-mono flex items-center gap-2 print:hidden">
            <Database className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>{lastSyncStatus}</span>
          </div>
        )}

        {/* Empty Roster Guidance */}
        {winners.length === 0 && (
          <div className="mb-4 bg-amber-950/40 border-2 border-amber-500/70 p-4 rounded-sm text-amber-200 font-mono text-xs space-y-2.5 print:hidden">
            <div className="flex items-center gap-2 font-bold text-white uppercase text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>NO OFFICIAL WINNERS RECORDED YET</span>
            </div>
            <p className="text-amber-300/90 text-xs leading-relaxed">
              No raffle winners have been drawn on the main stage yet. As soon as the stage operator confirms a draw,
              the winning teachers will appear here in real-time.
            </p>
            {isCloudConfigured && (
              <button
                onClick={triggerCloudHydration}
                disabled={isHydrating}
                className="mt-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase text-xs rounded-xs flex items-center gap-2 shadow cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isHydrating ? 'animate-spin' : ''}`} />
                <span>Check for Newly Drawn Winners Now</span>
              </button>
            )}
          </div>
        )}

        {activeStationTab === 'claims' ? (
          <RealtimeClaimsWorkstation
            winners={winners}
            onClaimPrize={handleClaimPrize}
            onUnclaimPrize={handleUnclaimPrize}
            onForfeitPrize={handleForfeitPrize}
            stationId={claimSession.stationId}
            officerName={claimSession.officerName}
            isStandalone={true}
            onRefreshCloud={triggerCloudHydration}
            isCloudConfigured={isCloudConfigured}
            onOpenPrintQueue={() => setActiveStationTab('print-queue')}
            onMarkAsPrinted={handleMarkAsPrinted}
          />
        ) : (
          <PrintQueueStation
            winners={winners}
            prizes={[]}
            logs={[]}
            onMarkAsPrinted={handleMarkAsPrinted}
            onMarkBatchAsPrinted={handleMarkBatchAsPrinted}
            onRequeueWinner={handleRequeueWinner}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#121215] border-t border-white/10 px-6 py-3 text-center font-mono text-[11px] text-neutral-500 uppercase tracking-widest flex flex-wrap items-center justify-between gap-2 print:hidden">
        <span>Municipal Teachers&apos; Day 2026 • Official Prize Claim &amp; Disbursement Desk</span>
        <span className="text-neutral-400 text-[10px]">Station: {claimSession.stationId}</span>
      </footer>
    </div>
  );
}
