'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AttendanceRecord, District, DistributionMode, EligibilityStatus, Participant, Prize, PrizeStatus, RaffleLog, SystemSettings, TemporaryDrawResult, Winner } from '../lib/types';
import {
  INITIAL_PARTICIPANTS,
  INITIAL_PRIZES,
  INITIAL_WINNERS,
  INITIAL_LOGS,
  INITIAL_SETTINGS,
  determineParticipantDistrict,
  isEligibleForDraw
} from '../lib/data';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { ProjectorDisplay } from '../components/ProjectorDisplay';
import { AdminDashboard } from '../components/AdminDashboard';
import { GasGuideView } from '../components/GasGuideView';
import { ClaimsStation } from '../components/admin/ClaimsStation';
import { PrizeClaimModule } from '../components/PrizeClaimModule';
import { AttendanceScannerModule } from '../components/attendance/AttendanceScannerModule';
import { AdminLoginScreen } from '../components/admin/AdminLoginScreen';
import { DrawPreviewModal, DrawReviewModal } from '../components/DrawModals';
import { soundSynthesizer } from '../lib/sound';
import { triggerConfetti } from '../lib/confetti';
import {
  pushWinnerToSupabase,
  updateClaimInSupabase,
  fetchParticipantsFromSupabase,
  fetchAttendanceRecordsFromSupabase,
  fetchWinnersFromSupabase,
  fetchPrizesFromSupabase,
  savePrizeToSupabase,
  deletePrizeFromSupabase,
  clearAllPrizesFromSupabase,
  syncPrizesToSupabase,
  batchSyncParticipantsToSupabase,
  fetchLogsFromSupabase,
  pushLogToSupabase,
  updateParticipantEligibilityInSupabase,
  subscribeToRealtimeUpdates,
  isSupabaseConfigured,
  executeFullEventResetInSupabase,
  clearAllParticipantsFromSupabase,
  deleteParticipantFromSupabase,
  deleteParticipantsBatchFromSupabase,
  upsertSingleParticipantToSupabase,
  syncWinnerPrintStatusToSupabase
} from '../lib/supabase';
import {
  markWinnerAsPrintedInStorage,
  markWinnersBatchAsPrintedInStorage,
  markWinnerAsUnprintedInStorage,
  mergeWinnersWithPrintStatus
} from '../lib/printQueueStorage';

const DISTRICT_LIST: District[] = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];

export default function Home() {
  const [currentView, setCurrentView] = useState<'display' | 'admin' | 'claim' | 'attendance' | 'gas'>('display');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Application State
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);
  const [winners, setWinners] = useState<Winner[]>(INITIAL_WINNERS);
  const [logs, setLogs] = useState<RaffleLog[]>(INITIAL_LOGS);
  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedSettings = localStorage.getItem('td26_settings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed) return parsed;
        }
        const storedAdminPin = localStorage.getItem('td26_admin_pin');
        const storedGatePin = localStorage.getItem('td26_gate_pin');
        if (storedAdminPin || storedGatePin) {
          return {
            ...INITIAL_SETTINGS,
            ...(storedAdminPin ? { adminAccessPin: storedAdminPin } : {}),
            ...(storedGatePin ? { gateAccessPin: storedGatePin } : {})
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_SETTINGS;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Active Prize Selection
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    const available = INITIAL_PRIZES.find((p) => p.remainingQuantity > 0);
    return available ? available.id : (INITIAL_PRIZES[0]?.id || '');
  });

  // Draw Cycling State
  const [isDrawing, setIsDrawing] = useState(false);
  const [temporaryDrawResult, setTemporaryDrawResult] = useState<TemporaryDrawResult | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('td26_pending_draw_result');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error recovering pending draw result:', e);
      }
    }
    return null;
  });

  const [drawStatus, setDrawStatus] = useState<'IDLE' | 'DRAWING' | 'REVEALED'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('td26_pending_draw_result');
        if (saved) return 'REVEALED';
      } catch (e) {
        console.error(e);
      }
    }
    return 'IDLE';
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealedWinners, setRevealedWinners] = useState<Participant[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('td26_pending_draw_result');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.winners || [];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [shufflingNames, setShufflingNames] = useState<
    Record<District, { name: string; school: string }>
  >({
    NORTH: { name: 'Awaiting draw...', school: 'North District School' },
    SOUTH: { name: 'Awaiting draw...', school: 'South District School' },
    EAST: { name: 'Awaiting draw...', school: 'East District School' },
    WEST: { name: 'Awaiting draw...', school: 'West District School' },
    PRIVATE: { name: 'Awaiting draw...', school: 'Private School' }
  });

  // Winner Selection Criteria State
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('EQUAL_PER_DISTRICT');
  const [winnersPerDistrict, setWinnersPerDistrict] = useState<number>(3);
  const [combinedWinnersCount, setCombinedWinnersCount] = useState<number>(15);
  const [targetDistrict, setTargetDistrict] = useState<District | 'ALL'>('ALL');

  // Admin Master Security State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminAuthChecked, setAdminAuthChecked] = useState<boolean>(false);

  // Modals
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isFullStage, setIsFullStage] = useState<boolean>(false);

  // Sync pending unconfirmed draw result to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (temporaryDrawResult) {
        localStorage.setItem('td26_pending_draw_result', JSON.stringify(temporaryDrawResult));
      } else {
        localStorage.removeItem('td26_pending_draw_result');
      }
    } catch (e) {
      console.error('Error persisting pending draw result:', e);
    }
  }, [temporaryDrawResult]);

  // Warn if user attempts to refresh or close tab while unconfirmed winners are waiting
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (temporaryDrawResult) {
        e.preventDefault();
        e.returnValue = 'You have drawn raffle winners waiting to be confirmed!';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [temporaryDrawResult]);

  // Check saved admin master session on mount
  useEffect(() => {
    try {
      const storedAuth =
        localStorage.getItem('td26_admin_authenticated') ||
        sessionStorage.getItem('td26_admin_authenticated');
      if (storedAuth === 'true') {
        setIsAdminAuthenticated(true);
      }
    } catch (e) {
      console.error('Error checking admin master session:', e);
    } finally {
      setAdminAuthChecked(true);
    }
  }, []);

  const handleLockAdmin = () => {
    try {
      localStorage.removeItem('td26_admin_authenticated');
      sessionStorage.removeItem('td26_admin_authenticated');
    } catch (e) {
      console.error('Error locking admin console:', e);
    }
    setIsAdminAuthenticated(false);
  };

  // Sound sync
  useEffect(() => {
    soundSynthesizer.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Load persisted cache on client mount after hydration + Live Supabase Sync
  useEffect(() => {
    // 0. One-time purge of legacy mock seed data from previous dev sessions
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
      const isPrizesPurged = localStorage.getItem('td26_seed_prizes_purged_v1');
      if (!isPrizesPurged) {
        const cachedP = localStorage.getItem('td26_prizes');
        if (cachedP) {
          const parsed = JSON.parse(cachedP);
          if (Array.isArray(parsed) && (parsed.length === 10 || parsed.some((p: any) => p.id === 'P001' && p.name && p.name.includes('500')))) {
            localStorage.removeItem('td26_prizes');
          }
        }
        localStorage.setItem('td26_seed_prizes_purged_v1', 'true');
      }
    } catch (e) {
      console.error(e);
    }

    // 1. Immediate local cache hydration (offline-first)
    try {
      const cachedWinners = localStorage.getItem('td26_winners');
      if (cachedWinners) {
        const parsed = JSON.parse(cachedWinners);
        if (Array.isArray(parsed)) setWinners(mergeWinnersWithPrintStatus(parsed));
      }
    } catch (e) {
      console.error(e);
    }

    // Helper to normalize participant districts based on criteria (PSDS -> East/North, LSB/ECCD/Private -> PRIVATE)
    const normalizeParticipantList = (list: Participant[]): Participant[] =>
      list.map((p) => {
        const correctDistrict = determineParticipantDistrict({
          rawDistrict: p.originalDistrict || p.district,
          rawType: p.typeOfPersonnel || p.personnelType,
          position: p.position,
          school: p.school
        });
        return correctDistrict !== p.district ? { ...p, district: correctDistrict } : p;
      });

    try {
      const cachedParticipants = localStorage.getItem('td26_profiling_participants');
      if (cachedParticipants) {
        const parsed = JSON.parse(cachedParticipants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setParticipants(normalizeParticipantList(parsed));
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const cachedAttendance = localStorage.getItem('td26_attendance_records');
      if (cachedAttendance) {
        const parsed = JSON.parse(cachedAttendance);
        if (Array.isArray(parsed)) {
          const uniqueMap = new Map<string, AttendanceRecord>();
          parsed.forEach((r) => {
            const key = r.id || r.participantId;
            if (!uniqueMap.has(key)) uniqueMap.set(key, r);
          });
          const deduplicated = Array.from(uniqueMap.values());
          setAttendanceRecords(deduplicated);
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const cachedPrizes = localStorage.getItem('td26_prizes');
      if (cachedPrizes) {
        const parsed = JSON.parse(cachedPrizes);
        if (Array.isArray(parsed)) setPrizes(parsed);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Cloud Data Hydration (if Supabase is configured)
    if (isSupabaseConfigured()) {
      Promise.all([
        fetchParticipantsFromSupabase(),
        fetchAttendanceRecordsFromSupabase(),
        fetchWinnersFromSupabase(),
        fetchPrizesFromSupabase(),
        fetchLogsFromSupabase()
      ])
        .then(([cloudParts, cloudAtt, cloudWinners, cloudPrizes, cloudLogs]) => {
          if (Array.isArray(cloudParts)) {
            if (cloudParts.length > 0) {
              const normalized = normalizeParticipantList(cloudParts);
              setParticipants(normalized);
              try {
                localStorage.setItem('td26_profiling_participants', JSON.stringify(normalized));
              } catch (e) {
                console.error(e);
              }
            } else {
              setParticipants([]);
              try {
                localStorage.removeItem('td26_profiling_participants');
              } catch (e) {
                console.error(e);
              }
            }
          }

          if (Array.isArray(cloudAtt)) {
            setAttendanceRecords(cloudAtt);
            try {
              if (cloudAtt.length > 0) {
                localStorage.setItem('td26_attendance_records', JSON.stringify(cloudAtt));
              } else {
                localStorage.removeItem('td26_attendance_records');
              }
            } catch (e) {
              console.error(e);
            }
          }

          if (Array.isArray(cloudWinners)) {
            const mergedWinners = mergeWinnersWithPrintStatus(cloudWinners);
            setWinners(mergedWinners);
            try {
              if (mergedWinners.length > 0) {
                localStorage.setItem('td26_winners', JSON.stringify(mergedWinners));
              } else {
                localStorage.removeItem('td26_winners');
              }
            } catch (e) {
              console.error(e);
            }
          }

          if (Array.isArray(cloudPrizes) && cloudPrizes.length > 0) {
            setPrizes(cloudPrizes);
          }

          if (Array.isArray(cloudLogs)) {
            setLogs(cloudLogs);
            try {
              if (cloudLogs.length > 0) {
                localStorage.setItem('td26_raffle_logs', JSON.stringify(cloudLogs));
              } else {
                localStorage.removeItem('td26_raffle_logs');
              }
            } catch (e) {
              console.error(e);
            }
          }
        })
        .catch((err) => console.warn('Supabase hydration warning:', err));

      // 3. Realtime Multi-Device Synchronization Channel
      const unsubscribe = subscribeToRealtimeUpdates({
        onAttendanceScan: (record) => {
          setAttendanceRecords((prev) => {
            if (prev.some((r) => r.id === record.id)) return prev;
            const next = [record, ...prev];
            try {
              localStorage.setItem('td26_attendance_records', JSON.stringify(next));
            } catch (e) {
              console.error(e);
            }
            return next;
          });

          // Automatically promote participant to ELIGIBLE on the projector in realtime!
          setParticipants((prev) => {
            const next = prev.map((p) => {
              if (p.id === record.participantId) {
                return {
                  ...p,
                  eligible: 'ELIGIBLE' as const,
                  attendedAt: record.scannedAt,
                  attendedBy: `${record.scannerOfficer} (${record.stationId})`
                };
              }
              return p;
            });
            try {
              localStorage.setItem('td26_profiling_participants', JSON.stringify(next));
            } catch (e) {
              console.error(e);
            }
            return next;
          });
        },

        onWinnerChange: (winner) => {
          if (!winner.winnerId) return;
          setWinners((prev) => {
            const idx = prev.findIndex((w) => w.winnerId === winner.winnerId);
            let next: Winner[];
            if (idx >= 0) {
              next = [...prev];
              next[idx] = winner;
            } else {
              next = [winner, ...prev];
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
        },

        onParticipantChange: (change) => {
          setParticipants((prev) => {
            const next = prev.map((p) => {
              if (p.id === change.id) {
                return {
                  ...p,
                  eligible: (change.eligible as any) || p.eligible,
                  winner: (change.winner as any) || p.winner,
                  attendedAt: change.attended_at || p.attendedAt,
                  attendedBy: change.attended_by || p.attendedBy
                };
              }
              return p;
            });
            try {
              localStorage.setItem('td26_profiling_participants', JSON.stringify(next));
            } catch (e) {
              console.error(e);
            }
            return next;
          });
        },

        onPrizeChange: (prize) => {
          setPrizes((prev) => {
            const exists = prev.some((p) => p.id === prize.id);
            const next = exists ? prev.map((p) => (p.id === prize.id ? prize : p)) : [...prev, prize];
            try {
              localStorage.setItem('td26_prizes', JSON.stringify(next));
            } catch (e) {
              console.error(e);
            }
            return next;
          });
        },

        onLogAdded: (log) => {
          setLogs((prev) => {
            if (prev.some((l) => l.logId === log.logId)) return prev;
            return [log, ...prev];
          });
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Synchronize route with URL query param ?page=...
  useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      if (page === 'claim') {
        setCurrentView('claim');
      } else if (page === 'attendance') {
        setCurrentView('attendance');
      } else if (page === 'admin') {
        setCurrentView('admin');
      } else if (page === 'gas') {
        setCurrentView('gas');
      } else if (page === 'projector' || page === 'display') {
        setCurrentView('display');
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const handleViewChange = (view: 'display' | 'admin' | 'claim' | 'attendance' | 'gas') => {
    soundSynthesizer.playClick();
    if (view !== 'display') {
      setIsFullStage(false);
    }
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (view === 'display') {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', view);
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  // Unclaimed Winners Count
  const unclaimedCount = useMemo(() => {
    return winners.filter((w) => w.claimStatus === 'UNCLAIMED').length;
  }, [winners]);

  // Pre-Draw Winners
  const preDrawWinners = useMemo(() => {
    return winners.filter((w) => w.drawType === 'PRE_DRAW' || w.drawNumber.startsWith('PRE'));
  }, [winners]);

  // Verified Present & Eligible Count
  const presentCount = useMemo(() => {
    return participants.filter((p) => p.eligible === 'ELIGIBLE' || p.attendedAt).length;
  }, [participants]);

  // Attendance Handlers
  const handleUpdateParticipant = (updated: Participant) => {
    const correctDistrict = determineParticipantDistrict({
      rawDistrict: updated.originalDistrict || updated.district,
      rawType: updated.typeOfPersonnel || updated.personnelType,
      position: updated.position,
      school: updated.school
    });
    const normalized = correctDistrict !== updated.district ? { ...updated, district: correctDistrict } : updated;
    setParticipants((prev) => {
      const list = prev.map((p) => (p.id === normalized.id ? normalized : p));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
      return list;
    });
  };

  const handleBatchUpdateParticipants = (batch: Participant[]) => {
    const normalized = batch.map((p) => {
      const correctDistrict = determineParticipantDistrict({
        rawDistrict: p.originalDistrict || p.district,
        rawType: p.typeOfPersonnel || p.personnelType,
        position: p.position,
        school: p.school
      });
      return correctDistrict !== p.district ? { ...p, district: correctDistrict } : p;
    });
    setParticipants(normalized);
    try {
      localStorage.setItem('td26_profiling_participants', JSON.stringify(normalized));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      // Prevent duplicate scan logs (by record id or participantId)
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

  // Selected Prize Object
  const currentPrize = useMemo(() => {
    return prizes.find((p) => p.id === selectedPrizeId) || prizes[0] || null;
  }, [prizes, selectedPrizeId]);

  // Auto-select active prize when prizes list changes
  useEffect(() => {
    if (prizes.length > 0) {
      if (!selectedPrizeId || !prizes.some((p) => p.id === selectedPrizeId)) {
        const available = prizes.find((p) => p.remainingQuantity > 0);
        setSelectedPrizeId(available ? available.id : prizes[0].id);
      }
    } else if (selectedPrizeId) {
      setSelectedPrizeId('');
    }
  }, [prizes, selectedPrizeId]);

  // Eligible pool calculations - strictly Teaching Personnel only (Non-Teaching excluded from raffle draws)
  const eligiblePool = useMemo(() => {
    return participants.filter((p) => isEligibleForDraw(p, settings.allowMultipleWins));
  }, [participants, settings.allowMultipleWins]);

  const excludedWinnersCount = useMemo(() => {
    return participants.filter((p) => p.winner === 'YES').length;
  }, [participants]);

  // District Eligible Pool Breakdown
  const districtEligibleCounts = useMemo<Record<District, number>>(() => {
    const counts: Record<District, number> = {
      NORTH: 0,
      EAST: 0,
      WEST: 0,
      SOUTH: 0,
      PRIVATE: 0
    };
    eligiblePool.forEach((p) => {
      if (counts[p.district] !== undefined) {
        counts[p.district]++;
      }
    });
    return counts;
  }, [eligiblePool]);

  // Select Prize and synchronize distribution criteria defaults
  const handleSelectPrize = (prizeId: string, prizeList: Prize[] = prizes) => {
    setSelectedPrizeId(prizeId);
    const targetPrize = prizeList.find((p) => p.id === prizeId);
    if (targetPrize) {
      const maxPerDistrict = Math.floor(targetPrize.remainingQuantity / 5);
      if (maxPerDistrict >= 1) {
        setDistributionMode('EQUAL_PER_DISTRICT');
        setWinnersPerDistrict(targetPrize.remainingQuantity === 15 ? 3 : Math.min(3, maxPerDistrict));
      } else {
        setDistributionMode('COMBINED_POOL');
      }
      setCombinedWinnersCount(Math.max(1, Math.min(targetPrize.remainingQuantity, 15)));
    }
  };

  // Total winners planned for the current round
  const totalWinnersToDraw = useMemo(() => {
    if (!currentPrize) return 0;
    if (distributionMode === 'EQUAL_PER_DISTRICT') {
      return winnersPerDistrict * 5;
    }
    return Math.min(combinedWinnersCount, currentPrize.remainingQuantity);
  }, [distributionMode, winnersPerDistrict, combinedWinnersCount, currentPrize]);

  // Candidate Pool by District for smooth rolling reel in Projector Display
  const candidatePoolByDistrict = useMemo(() => {
    const result: Record<District, string[]> = {
      NORTH: [],
      EAST: [],
      WEST: [],
      SOUTH: [],
      PRIVATE: []
    };
    DISTRICT_LIST.forEach((d) => {
      const pool = eligiblePool.filter((p) => p.district === d);
      if (pool.length > 0) {
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        result[d] = shuffled.map((p) => p.fullName);
      }
    });
    return result;
  }, [eligiblePool]);

  // Handle Opening Preview Modal
  const handleOpenDrawPreview = () => {
    if (!currentPrize || currentPrize.remainingQuantity <= 0) return;
    soundSynthesizer.playClick();
    setIsPreviewModalOpen(true);
  };

  // Start the Draw Animation & Algorithm with District Criteria
  const handleConfirmStartDraw = () => {
    if (!currentPrize || currentPrize.remainingQuantity <= 0) return;
    setIsPreviewModalOpen(false);

    let selectedWinners: Participant[] = [];

    if (distributionMode === 'EQUAL_PER_DISTRICT') {
      const requiredPerDistrict = winnersPerDistrict;
      const totalRequired = requiredPerDistrict * 5;

      if (totalRequired > currentPrize.remainingQuantity) {
        alert(
          `Cannot draw ${totalRequired} winners. Only ${currentPrize.remainingQuantity} remaining for ${currentPrize.name}.`
        );
        return;
      }

      // Verify each district has sufficient eligible participants
      for (const d of DISTRICT_LIST) {
        const availableInDistrict = districtEligibleCounts[d] || 0;
        if (availableInDistrict < requiredPerDistrict) {
          alert(
            `Insufficient eligible participants in ${d} District. Needed: ${requiredPerDistrict}, Available: ${availableInDistrict}`
          );
          return;
        }
      }

      // Unbiased Fisher-Yates shuffle within each district's pool
      const selectedByDistrict: Record<District, Participant[]> = {
        NORTH: [],
        EAST: [],
        WEST: [],
        SOUTH: [],
        PRIVATE: []
      };

      DISTRICT_LIST.forEach((d) => {
        const districtPool = eligiblePool.filter((p) => p.district === d);
        for (let i = districtPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [districtPool[i], districtPool[j]] = [districtPool[j], districtPool[i]];
        }
        selectedByDistrict[d] = districtPool.slice(0, requiredPerDistrict);
      });

      // Combine winners by district
      DISTRICT_LIST.forEach((d) => {
        selectedWinners.push(...selectedByDistrict[d]);
      });
    } else {
      // Combined Pool Draw (or Choice A: Specific Target District Exclusive Redraw)
      const count = Math.min(combinedWinnersCount, currentPrize.remainingQuantity);
      const activePool = targetDistrict === 'ALL'
        ? eligiblePool
        : eligiblePool.filter((p) => p.district === targetDistrict);

      if (activePool.length < count) {
        alert(
          `Insufficient eligible participants in ${targetDistrict === 'ALL' ? 'pool' : `${targetDistrict} District`}. Needed: ${count}, Available: ${activePool.length}`
        );
        return;
      }

      const poolCopy = [...activePool];
      for (let i = poolCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
      }
      selectedWinners = poolCopy.slice(0, count);
    }

    // Compute next Draw Number
    const nextDrawNum = `DRAW-${String(logs.length + 1).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const tempResult: TemporaryDrawResult = {
      drawNumber: nextDrawNum,
      prize: currentPrize,
      winners: selectedWinners,
      timestamp: timestamp,
      eligiblePoolSize: targetDistrict === 'ALL' ? eligiblePool.length : eligiblePool.filter((p) => p.district === targetDistrict).length,
      distributionMode: distributionMode,
      winnersPerDistrict: distributionMode === 'EQUAL_PER_DISTRICT' ? winnersPerDistrict : undefined,
      targetDistrict: distributionMode === 'COMBINED_POOL' ? targetDistrict : undefined
    };

    setTemporaryDrawResult(tempResult);

    // Enter DRAWING state
    setIsDrawing(true);
    setDrawStatus('DRAWING');
    setRevealedWinners([]);
    setCountdown(null);

    // Start Audio Reel
    soundSynthesizer.startSpinning();

    // Rapid Cycling on all 5 district cards
    // Filter participants by district for authentic cycling representation
    const participantsByDistrict: Record<District, Participant[]> = {
      NORTH: eligiblePool.filter((p) => p.district === 'NORTH'),
      EAST: eligiblePool.filter((p) => p.district === 'EAST'),
      WEST: eligiblePool.filter((p) => p.district === 'WEST'),
      SOUTH: eligiblePool.filter((p) => p.district === 'SOUTH'),
      PRIVATE: eligiblePool.filter((p) => p.district === 'PRIVATE')
    };

    // Dynamic shuffle duration directly controlled by Admin Console > Settings > ANIMATION DURATION (in seconds)
    const durationMs = Math.max(2500, (settings.animationDuration || 4) * 1000);
    const startTime = Date.now();
    let isDeceleratingSound = false;

    // Ease-out Deceleration Reel: starts at blitz speed (45ms), then smoothly slows down in the final ~35%
    const stepReel = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = durationMs - elapsed;

      // When duration is reached: halt reel and instantly reveal winners!
      if (remaining <= 0) {
        soundSynthesizer.stopSpinning();
        setCountdown(null);
        setIsDrawing(false);
        setDrawStatus('REVEALED');
        setRevealedWinners(selectedWinners);

        // Grand Celebration Fanfare & Confetti
        soundSynthesizer.playCelebrationFanfare();
        triggerConfetti();
        return;
      }

      // Roll names on all 5 districts
      const nextNames: Record<District, { name: string; school: string }> = { ...shufflingNames };
      DISTRICT_LIST.forEach((d) => {
        const pool = participantsByDistrict[d];
        if (pool && pool.length > 0) {
          const rand = pool[Math.floor(Math.random() * pool.length)];
          nextNames[d] = { name: rand.fullName, school: rand.school };
        }
      });
      setShufflingNames(nextNames);

      // Deceleration Curve Calculation:
      // Phase 1 (0% to 65% of time): Fast blitz at 45ms
      // Phase 2 (65% to 100% of time): Progressively brakes from 45ms up to ~520ms
      const progress = Math.min(1, elapsed / durationMs);
      let nextDelay = 45;

      if (progress > 0.65) {
        const decelProgress = (progress - 0.65) / 0.35; // 0.0 -> 1.0
        // Polynomial ease-out braking curve
        nextDelay = Math.round(45 + Math.pow(decelProgress, 2.3) * 475);

        // In the final slow stretch, switch from continuous reel buzz to distinct mechanical clicks
        if (nextDelay >= 85) {
          if (!isDeceleratingSound) {
            soundSynthesizer.stopSpinning();
            isDeceleratingSound = true;
          }
          soundSynthesizer.playClick();
        }
      }

      // Schedule next frame
      setTimeout(stepReel, Math.min(nextDelay, Math.max(25, remaining)));
    };

    // Kick off animation loop
    stepReel();
  };

  // Two-Stage Confirmation: Confirm Winners Officially
  const handleConfirmWinners = () => {
    if (!temporaryDrawResult) return;

    soundSynthesizer.playCelebrationFanfare();

    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const fullTimestamp = `${dateStr} ${timeStr}`;

    const newWinnerRecords: Winner[] = temporaryDrawResult.winners.map((w, idx) => ({
      winnerId: `WN-${String(winners.length + idx + 1).padStart(4, '0')}`,
      participantId: w.id,
      depedId: w.depedId,
      contactNumber: w.contactNumber,
      email: w.email,
      sex: w.sex,
      name: w.fullName,
      district: w.district,
      originalDistrict: w.originalDistrict,
      personnelType: w.personnelType,
      school: w.school,
      position: w.position,
      prizeId: temporaryDrawResult.prize.id,
      prizeName: temporaryDrawResult.prize.name,
      unitValue: temporaryDrawResult.prize.unitValue,
      drawNumber: temporaryDrawResult.drawNumber,
      date: dateStr,
      time: timeStr,
      claimStatus: 'UNCLAIMED',
      isPrinted: false
    }));

    // Update Participants winner status = YES
    const winnerIdSet = new Set(temporaryDrawResult.winners.map((w) => w.id));
    setParticipants((prev) => {
      const updated = prev.map((p) => {
        if (winnerIdSet.has(p.id)) {
          return { ...p, winner: 'YES' as const };
        }
        return p;
      });
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Update Winners list with persistence
    setWinners((prev) => {
      const updated = [...prev, ...newWinnerRecords];
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Real-time Cloud Sync: Push winners to Supabase
    newWinnerRecords.forEach((w) => {
      pushWinnerToSupabase(w).catch((err) => console.warn('Supabase winner push:', err));
    });

    // Decrement Prize remaining quantity & sync to Supabase
    const updatedPrizes: Prize[] = prizes.map((p) => {
      if (p.id === temporaryDrawResult.prize.id) {
        const newDrawn = p.drawnQuantity + temporaryDrawResult.winners.length;
        const newRemaining = Math.max(0, p.quantity - newDrawn);
        const status: PrizeStatus = newRemaining > 0 ? 'AVAILABLE' : 'EXHAUSTED';
        return {
          ...p,
          drawnQuantity: newDrawn,
          remainingQuantity: newRemaining,
          status
        };
      }
      return p;
    });
    setPrizes(updatedPrizes);
    syncPrizesToSupabase(updatedPrizes).catch((err) => console.warn('Supabase prize sync:', err));

    // Record Log Entry
    const newLog: RaffleLog = {
      logId: `LOG-${String(logs.length + 1).padStart(4, '0')}`,
      drawNumber: temporaryDrawResult.drawNumber,
      timestamp: fullTimestamp,
      prizeId: temporaryDrawResult.prize.id,
      prizeName: temporaryDrawResult.prize.name,
      numberOfWinners: temporaryDrawResult.winners.length,
      eligiblePoolSize: temporaryDrawResult.eligiblePoolSize,
      winnerIds: temporaryDrawResult.winners.map((w) => w.id),
      winnerNames: temporaryDrawResult.winners.map((w) => w.fullName),
      status: 'CONFIRMED',
      admin: 'Event Admin',
      distributionMode: temporaryDrawResult.distributionMode,
      winnersPerDistrict: temporaryDrawResult.winnersPerDistrict,
      targetDistrict: temporaryDrawResult.targetDistrict
    };
    setLogs((prev) => [newLog, ...prev]);
    pushLogToSupabase(newLog).catch((err) => console.warn('Supabase log push:', err));

    // Close Review Modal
    setIsReviewModalOpen(false);
    setTemporaryDrawResult(null);

    // Automatically select the next available prize if this one was exhausted
    const remainingPrizes = updatedPrizes;
    const nextAvailable = remainingPrizes.find((p) => p.remainingQuantity > 0);
    if (nextAvailable) {
      handleSelectPrize(nextAvailable.id, remainingPrizes);
    }
  };

  // Handle Confirmation of Pre-Draw Batch (Advance Draws)
  const handleConfirmPreDrawBatch = (batch: TemporaryDrawResult) => {
    soundSynthesizer.playCelebrationFanfare();

    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const fullTimestamp = `${dateStr} ${timeStr}`;

    const newWinnerRecords: Winner[] = batch.winners.map((w, idx) => ({
      winnerId: `WN-${String(winners.length + idx + 1).padStart(4, '0')}`,
      participantId: w.id,
      depedId: w.depedId,
      contactNumber: w.contactNumber,
      email: w.email,
      sex: w.sex,
      name: w.fullName,
      district: w.district,
      originalDistrict: w.originalDistrict,
      personnelType: w.personnelType,
      school: w.school,
      position: w.position,
      prizeId: batch.prize.id,
      prizeName: batch.prize.name,
      unitValue: batch.prize.unitValue,
      drawNumber: batch.drawNumber,
      date: dateStr,
      time: timeStr,
      claimStatus: 'UNCLAIMED',
      drawType: 'PRE_DRAW',
      isPrinted: false
    }));

    // Update Participants winner status = YES so they are excluded from future draws
    const winnerIdSet = new Set(batch.winners.map((w) => w.id));
    setParticipants((prev) => {
      const updated = prev.map((p) => {
        if (winnerIdSet.has(p.id)) {
          return { ...p, winner: 'YES' as const };
        }
        return p;
      });
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Update Winners list with persistence
    setWinners((prev) => {
      const updated = [...prev, ...newWinnerRecords];
      try {
        localStorage.setItem('td26_winners', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // Push new winners to Supabase in real-time
    newWinnerRecords.forEach((w) => {
      pushWinnerToSupabase(w).catch((err) => console.warn('Supabase winner push:', err));
    });

    // Decrement Prize remaining quantity & sync to Supabase
    const updatedPrizes: Prize[] = prizes.map((p) => {
      if (p.id === batch.prize.id) {
        const newDrawn = p.drawnQuantity + batch.winners.length;
        const newRemaining = Math.max(0, p.quantity - newDrawn);
        const status: PrizeStatus = newRemaining > 0 ? 'AVAILABLE' : 'EXHAUSTED';
        return {
          ...p,
          drawnQuantity: newDrawn,
          remainingQuantity: newRemaining,
          status
        };
      }
      return p;
    });
    setPrizes(updatedPrizes);
    syncPrizesToSupabase(updatedPrizes).catch((err) => console.warn('Supabase prize sync:', err));

    // Record Audit Log Entry for Pre-Draw
    const newLog: RaffleLog = {
      logId: `LOG-${String(logs.length + 1).padStart(4, '0')}`,
      drawNumber: batch.drawNumber,
      timestamp: fullTimestamp,
      prizeId: batch.prize.id,
      prizeName: batch.prize.name,
      numberOfWinners: batch.winners.length,
      eligiblePoolSize: batch.eligiblePoolSize,
      winnerIds: batch.winners.map((w) => w.id),
      winnerNames: batch.winners.map((w) => w.fullName),
      status: 'CONFIRMED',
      admin: 'Pre-Draw Committee',
      distributionMode: batch.distributionMode,
      winnersPerDistrict: batch.winnersPerDistrict,
      drawType: 'PRE_DRAW'
    };
    setLogs((prev) => [newLog, ...prev]);
    pushLogToSupabase(newLog).catch((err) => console.warn('Supabase log push:', err));
  };

  // Two-Stage Confirmation: Redraw Action
  const handleRedraw = () => {
    if (!temporaryDrawResult) return;

    soundSynthesizer.playClick();

    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Record Discarded Redraw Log
    const redrawnLog: RaffleLog = {
      logId: `LOG-${String(logs.length + 1).padStart(4, '0')}`,
      drawNumber: temporaryDrawResult.drawNumber,
      timestamp: `${dateStr} ${timeStr}`,
      prizeId: temporaryDrawResult.prize.id,
      prizeName: temporaryDrawResult.prize.name,
      numberOfWinners: temporaryDrawResult.winners.length,
      eligiblePoolSize: temporaryDrawResult.eligiblePoolSize,
      winnerIds: temporaryDrawResult.winners.map((w) => w.id),
      winnerNames: temporaryDrawResult.winners.map((w) => w.fullName),
      status: 'REDRAWN',
      admin: 'Event Admin',
      distributionMode: temporaryDrawResult.distributionMode,
      winnersPerDistrict: temporaryDrawResult.winnersPerDistrict,
      targetDistrict: temporaryDrawResult.targetDistrict
    };
    setLogs((prev) => [redrawnLog, ...prev]);
    pushLogToSupabase(redrawnLog).catch((err) => console.warn('Supabase redrawn log push:', err));

    // Reset display and temporary result
    setIsReviewModalOpen(false);
    setTemporaryDrawResult(null);
    setDrawStatus('IDLE');
    setRevealedWinners([]);
  };

  // Participant Eligibility Toggle
  const handleToggleEligibility = (id: string) => {
    soundSynthesizer.playClick();
    let nextStatus: EligibilityStatus = 'ELIGIBLE';
    setParticipants((prev: Participant[]) => {
      const updated: Participant[] = prev.map((p) => {
        if (p.id === id) {
          nextStatus = p.eligible === 'ELIGIBLE' ? 'INELIGIBLE' : 'ELIGIBLE';
          return { ...p, eligible: nextStatus };
        }
        return p;
      });
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    updateParticipantEligibilityInSupabase(id, nextStatus).catch((err) => console.warn('Supabase eligibility toggle:', err));
  };

  // Import Participants Batch
  const handleImportParticipants = (imported: Participant[]) => {
    soundSynthesizer.playSuccess();
    setParticipants(imported);
    try {
      localStorage.setItem('td26_profiling_participants', JSON.stringify(imported));
    } catch (e) {
      console.error(e);
    }
    if (isSupabaseConfigured()) {
      batchSyncParticipantsToSupabase(imported).then((res) => {
        if (!res.success) {
          console.warn('Auto Supabase participant import notice:', res.error);
        }
      });
    }
  };

  // Clear all participants (Purge masterlist locally and in Supabase Cloud)
  const handleClearAllParticipants = async () => {
    soundSynthesizer.playClick();
    setParticipants([]);
    try {
      localStorage.removeItem('td26_profiling_participants');
    } catch (e) {
      console.error(e);
    }
    if (isSupabaseConfigured()) {
      clearAllParticipantsFromSupabase().catch((err) => console.warn('Supabase participants clear sync:', err));
    }
  };

  // Delete single participant (e.g. duplicate removal)
  const handleDeleteParticipant = async (id: string) => {
    soundSynthesizer.playClick();
    setParticipants((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      deleteParticipantFromSupabase(id).catch((err) => console.warn('Supabase delete participant sync:', err));
    }
  };

  // Batch delete multiple participants (e.g. batch duplicate resolution)
  const handleBatchDeleteParticipants = async (ids: string[]) => {
    soundSynthesizer.playClick();
    const idSet = new Set(ids);
    setParticipants((prev) => {
      const updated = prev.filter((p) => !idSet.has(p.id));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      deleteParticipantsBatchFromSupabase(ids).catch((err) => console.warn('Supabase batch delete participants sync:', err));
    }
  };

  // Merge duplicate participant records into a primary record
  const handleMergeParticipants = async (primaryId: string, mergedData: Participant, secondaryIds: string[]) => {
    soundSynthesizer.playSuccess();
    const secIdSet = new Set(secondaryIds);
    setParticipants((prev) => {
      const updated = prev
        .filter((p) => !secIdSet.has(p.id))
        .map((p) => (p.id === primaryId ? mergedData : p));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    if (isSupabaseConfigured()) {
      upsertSingleParticipantToSupabase(mergedData).catch((err) => console.warn('Supabase merged participant upsert:', err));
      if (secondaryIds.length > 0) {
        deleteParticipantsBatchFromSupabase(secondaryIds).catch((err) => console.warn('Supabase batch delete duplicates:', err));
      }
    }
  };

  // Prize Management Handlers
  const handleAddPrize = (newPrize: Prize) => {
    soundSynthesizer.playSuccess();
    setPrizes((prev) => {
      const next = [...prev, newPrize];
      try {
        localStorage.setItem('td26_prizes', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    if (!selectedPrizeId) {
      setSelectedPrizeId(newPrize.id);
    }
    savePrizeToSupabase(newPrize).then((res) => {
      if (!res.success) {
        console.warn('Supabase savePrize notice:', res.error);
      }
    });
  };

  const handleDeletePrize = (prizeId: string) => {
    soundSynthesizer.playClick();
    const updated = prizes.filter((p) => p.id !== prizeId);
    setPrizes(updated);
    try {
      localStorage.setItem('td26_prizes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    if (selectedPrizeId === prizeId) {
      const available = updated.find((p) => p.remainingQuantity > 0);
      setSelectedPrizeId(available ? available.id : (updated[0]?.id || ''));
    }
    deletePrizeFromSupabase(prizeId).catch((err) => console.warn('Supabase prize delete sync:', err));
  };

  const handleClearAllPrizes = () => {
    soundSynthesizer.playClick();
    setPrizes([]);
    setSelectedPrizeId('');
    try {
      localStorage.removeItem('td26_prizes');
    } catch (e) {
      console.error(e);
    }
    clearAllPrizesFromSupabase().catch((err) => console.warn('Supabase prize clear sync:', err));
  };

  // Claim Prize Verification
  const handleClaimPrize = (
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
    soundSynthesizer.playSuccess();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    let participantId = '';
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          participantId = w.participantId;
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

    // Cloud Sync: Update prize claim status in Supabase
    updateClaimInSupabase(winnerId, {
      claimStatus: 'CLAIMED',
      claimedAt: timestamp,
      claimedBy: claimedBy || 'Claims Desk',
      idPresented: details?.idPresented || 'DepEd Employee ID',
      proxyName: details?.proxyName,
      proxyRelationship: details?.proxyRelationship,
      claimNotes: details?.claimNotes
    }).catch((err) => console.warn('Supabase claim update:', err));

    if (participantId) {
      setParticipants((prev) => {
        const updated = prev.map((p) => {
          if (p.id === participantId) {
            return { ...p, claimed: 'YES' as const };
          }
          return p;
        });
        try {
          localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  };

  // Revert / Undo Claim
  const handleUnclaimPrize = (winnerId: string) => {
    soundSynthesizer.playClick();
    let participantId = '';
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          participantId = w.participantId;
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

    // Cloud Sync: Revert claim in Supabase
    updateClaimInSupabase(winnerId, {
      claimStatus: 'UNCLAIMED'
    }).catch((err) => console.warn('Supabase unclaim update:', err));

    if (participantId) {
      setParticipants((prev) => {
        const updated = prev.map((p) => {
          if (p.id === participantId) {
            return { ...p, claimed: 'NO' as const };
          }
          return p;
        });
        try {
          localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  };

  // Forfeit Unclaimed Ticket & Return Prize to Active Raffle Pool
  const handleForfeitPrize = (winnerId: string, reason?: string) => {
    soundSynthesizer.playSuccess();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    let targetPrizeId = '';
    let targetPrizeName = '';
    let targetParticipantId = '';
    let winnerName = '';
    let winnerDistrict: District = 'NORTH';

    // 1. Update Winner status to FORFEITED
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          targetPrizeId = w.prizeId;
          targetPrizeName = w.prizeName;
          targetParticipantId = w.participantId;
          winnerName = w.name;
          winnerDistrict = w.district;
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

    // 2. Cloud Sync: Update claim status in Supabase
    updateClaimInSupabase(winnerId, {
      claimStatus: 'FORFEITED',
      forfeitedAt: timestamp,
      forfeitReason: reason || 'Unclaimed by deadline / Absent on stage'
    }).catch((err) => console.warn('Supabase forfeit update:', err));

    // 3. Reset Participant winner flag to 'NO' so they don't block inventory
    if (targetParticipantId) {
      setParticipants((prev) => {
        const updated = prev.map((p) => {
          if (p.id === targetParticipantId) {
            return { ...p, winner: 'NO' as const, claimed: 'NO' as const };
          }
          return p;
        });
        try {
          localStorage.setItem('td26_profiling_participants', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }

    // 4. Return 1 Unit of Prize back to Active Inventory
    if (targetPrizeId) {
      let prizeToSelect: string | null = null;
      setPrizes((prev) => {
        const updated = prev.map((p) => {
          if (p.id === targetPrizeId) {
            const newDrawn = Math.max(0, p.drawnQuantity - 1);
            const newRemaining = Math.max(0, p.quantity - newDrawn);
            prizeToSelect = p.id;
            return {
              ...p,
              drawnQuantity: newDrawn,
              remainingQuantity: newRemaining,
              status: newRemaining > 0 ? ('AVAILABLE' as PrizeStatus) : ('EXHAUSTED' as PrizeStatus)
            };
          }
          return p;
        });
        try {
          localStorage.setItem('td26_prizes', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        syncPrizesToSupabase(updated).catch((err) => console.warn('Supabase prize sync on forfeit:', err));
        return updated;
      });

      // Select this prize so it's ready for redraw
      if (prizeToSelect) {
        setSelectedPrizeId(prizeToSelect);
        setDistributionMode('COMBINED_POOL');
        setCombinedWinnersCount(1);
        setTargetDistrict(winnerDistrict); // Default to the forfeited winner's district!
      }
    }

    // 5. Audit Log for Forfeiture
    const forfeitLog: RaffleLog = {
      logId: `LOG-${String(logs.length + 1).padStart(4, '0')}`,
      drawNumber: `FORFEIT-${winnerId}`,
      timestamp: timestamp,
      prizeId: targetPrizeId,
      prizeName: targetPrizeName || 'Raffle Prize',
      numberOfWinners: 1,
      eligiblePoolSize: eligiblePool.length,
      winnerIds: targetParticipantId ? [targetParticipantId] : [],
      winnerNames: winnerName ? [winnerName] : [],
      status: 'FORFEITED',
      admin: 'Claims Committee',
      distributionMode: 'COMBINED_POOL',
      targetDistrict: winnerDistrict
    };
    setLogs((prev) => [forfeitLog, ...prev]);
    pushLogToSupabase(forfeitLog).catch((err) => console.warn('Supabase forfeit log push:', err));
  };

  // Print Queue & Verification Stub Handlers
  const handleMarkAsPrinted = (winnerId: string) => {
    const timestamp = new Date().toISOString();
    markWinnerAsPrintedInStorage(winnerId, 'Print Desk');
    syncWinnerPrintStatusToSupabase([winnerId], true, 'Print Desk');
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (w.winnerId === winnerId) {
          return {
            ...w,
            isPrinted: true,
            printedAt: timestamp,
            printedBy: 'Print Desk'
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
    markWinnersBatchAsPrintedInStorage(winnerIds, 'Print Desk');
    syncWinnerPrintStatusToSupabase(winnerIds, true, 'Print Desk');
    const idSet = new Set(winnerIds);
    setWinners((prev) => {
      const updated = prev.map((w) => {
        if (idSet.has(w.winnerId)) {
          return {
            ...w,
            isPrinted: true,
            printedAt: timestamp,
            printedBy: 'Print Desk'
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

  // Update Settings
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    soundSynthesizer.playSuccess();
    setSettings(newSettings);
    try {
      localStorage.setItem('td26_settings', JSON.stringify(newSettings));
      if (newSettings.adminAccessPin) {
        localStorage.setItem('td26_admin_pin', newSettings.adminAccessPin.trim());
      }
      if (newSettings.gateAccessPin) {
        localStorage.setItem('td26_gate_pin', newSettings.gateAccessPin.trim());
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Prepare Fresh Event Reset (clears winners, raffle logs, resets participant flags & prizes locally and in Supabase Cloud)
  const handlePrepareNewEvent = async (options?: {
    resetAttendance?: boolean;
    deleteParticipants?: boolean;
  }): Promise<{ success: boolean; message: string }> => {
    soundSynthesizer.playCelebrationFanfare();

    // 1. Reset Local in-memory state
    setWinners([]);
    setLogs([]);
    setRevealedWinners([]);
    setDrawStatus('IDLE');

    if (options?.deleteParticipants) {
      setParticipants([]);
    } else {
      // Update participants: preserve personnel profiles, but reset winner & claimed flags
      setParticipants((prev) => {
        const next = prev.map((p) => ({
          ...p,
          winner: 'NO' as const,
          claimed: 'NO' as const,
          ...(options?.resetAttendance
            ? { eligible: 'INELIGIBLE' as const, attendedAt: undefined, attendedBy: undefined }
            : {})
        }));
        try {
          localStorage.setItem('td26_profiling_participants', JSON.stringify(next));
        } catch (e) {
          console.error('LocalStorage update notice:', e);
        }
        return next;
      });
    }

    if (options?.resetAttendance || options?.deleteParticipants) {
      setAttendanceRecords([]);
    }

    // Reset prizes inventory back to full
    const resetPrizesList = prizes.map((p) => ({
      ...p,
      drawnQuantity: 0,
      remainingQuantity: p.quantity,
      status: 'AVAILABLE' as const
    }));
    setPrizes(resetPrizesList);

    // 2. Clear LocalStorage cache
    try {
      localStorage.removeItem('td26_winners');
      localStorage.removeItem('td26_raffle_logs');
      if (options?.resetAttendance || options?.deleteParticipants) {
        localStorage.removeItem('td26_attendance_records');
      }
      if (options?.deleteParticipants) {
        localStorage.removeItem('td26_profiling_participants');
      }
    } catch (e) {
      console.error('LocalStorage cleanup notice:', e);
    }

    // 3. Execute Cloud Reset in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const cloudRes = await executeFullEventResetInSupabase({
          resetAttendance: options?.resetAttendance,
          deleteParticipants: options?.deleteParticipants,
          prizes: resetPrizesList
        });

        if (!cloudRes.success) {
          console.error('Supabase cloud reset warning:', cloudRes.error);
          return {
            success: false,
            message: `Local session reset, but Supabase Cloud error: ${cloudRes.error}`
          };
        }

        return {
          success: true,
          message: options?.deleteParticipants
            ? 'Local session, participants roster, and Supabase Cloud database have been completely purged!'
            : 'Local session and Supabase Cloud database have been completely reset!'
        };
      } catch (err: any) {
        console.error('Supabase cloud reset exception:', err);
        return {
          success: false,
          message: `Local reset completed, but Supabase Cloud encountered: ${err?.message || err}`
        };
      }
    }

    return {
      success: true,
      message: options?.deleteParticipants
        ? 'Local session and participants roster cleared (Offline Mode).'
        : 'Local session reset successfully (Offline Mode).'
    };
  };

  if (!adminAuthChecked) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-neutral-400 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#FF1E1E] mr-2" />
        Verifying Master Console Session...
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <AdminLoginScreen
        onLoginSuccess={() => setIsAdminAuthenticated(true)}
        expectedPin={settings.adminAccessPin || '2026'}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] dark:bg-[#09090b] text-[#1a1a1a] dark:text-[#f4f4f5] flex flex-col selection:bg-[#1a1a1a] selection:text-[#f8f7f4] transition-colors">
      {/* Top Application Header (Hidden when in Full Stage mode on Projector) */}
      {(!isFullStage || currentView !== 'display') && (
        <Header
          currentView={currentView}
          onViewChange={handleViewChange}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          unclaimedCount={unclaimedCount}
          totalWinnersCount={winners.length}
          presentCount={presentCount}
          onLock={handleLockAdmin}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentView === 'display' && (
          <ProjectorDisplay
            selectedPrize={currentPrize}
            prizes={prizes}
            selectedPrizeId={selectedPrizeId}
            preDrawWinners={preDrawWinners}
            onSelectPrize={(id) => {
              soundSynthesizer.playClick();
              handleSelectPrize(id);
            }}
            isDrawing={isDrawing}
            shufflingNames={shufflingNames}
            candidatePoolByDistrict={candidatePoolByDistrict}
            revealedWinners={revealedWinners}
            countdown={countdown}
            onOpenDrawPreview={handleOpenDrawPreview}
            drawStatus={drawStatus}
            distributionMode={distributionMode}
            winnersPerDistrict={winnersPerDistrict}
            combinedWinnersCount={combinedWinnersCount}
            onDistributionModeChange={setDistributionMode}
            onWinnersPerDistrictChange={setWinnersPerDistrict}
            onCombinedWinnersCountChange={setCombinedWinnersCount}
            targetDistrict={targetDistrict}
            onTargetDistrictChange={setTargetDistrict}
            hasPendingReview={!!temporaryDrawResult}
            onConfirmWinners={handleConfirmWinners}
            onRedraw={handleRedraw}
            isFullStage={isFullStage}
            onToggleFullStage={setIsFullStage}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        )}

        {currentView === 'attendance' && (
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6">
            <AttendanceScannerModule
              participants={participants}
              attendanceRecords={attendanceRecords}
              onUpdateParticipant={handleUpdateParticipant}
              onBatchUpdateParticipants={handleBatchUpdateParticipants}
              onAddAttendanceRecord={handleAddAttendanceRecord}
            />
          </div>
        )}

        {currentView === 'claim' && (
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6">
            <ClaimsStation
              winners={winners}
              onClaimPrize={handleClaimPrize}
              onUnclaimPrize={handleUnclaimPrize}
              onForfeitPrize={handleForfeitPrize}
            />
          </div>
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            participants={participants}
            prizes={prizes}
            winners={winners}
            logs={logs}
            settings={settings}
            selectedPrizeId={selectedPrizeId}
            onSelectPrize={(id) => {
              soundSynthesizer.playClick();
              handleSelectPrize(id);
            }}
            onLaunchDraw={handleOpenDrawPreview}
            onConfirmPreDrawBatch={handleConfirmPreDrawBatch}
            onToggleEligibility={handleToggleEligibility}
            onImportParticipants={handleImportParticipants}
            onClearAllParticipants={handleClearAllParticipants}
            onDeleteParticipant={handleDeleteParticipant}
            onBatchDeleteParticipants={handleBatchDeleteParticipants}
            onMergeParticipants={handleMergeParticipants}
            onAddPrize={handleAddPrize}
            onDeletePrize={handleDeletePrize}
            onClearAllPrizes={handleClearAllPrizes}
            onClaimPrize={handleClaimPrize}
            onUnclaimPrize={handleUnclaimPrize}
            onForfeitPrize={handleForfeitPrize}
            onUpdateSettings={handleUpdateSettings}
            onPrepareNewEvent={handlePrepareNewEvent}
            onMarkAsPrinted={handleMarkAsPrinted}
            onMarkBatchAsPrinted={handleMarkBatchAsPrinted}
            onRequeueWinner={handleRequeueWinner}
            eligiblePoolCount={eligiblePool.length}
            isDrawing={isDrawing}
            distributionMode={distributionMode}
            onDistributionModeChange={setDistributionMode}
            winnersPerDistrict={winnersPerDistrict}
            onWinnersPerDistrictChange={setWinnersPerDistrict}
            combinedWinnersCount={combinedWinnersCount}
            onCombinedWinnersCountChange={setCombinedWinnersCount}
            districtEligibleCounts={districtEligibleCounts}
          />
        )}

        {currentView === 'gas' && <GasGuideView />}
      </div>

      {/* Draw Preview Modal (Before Start) */}
      <DrawPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          soundSynthesizer.playClick();
          setIsPreviewModalOpen(false);
        }}
        onConfirmStart={handleConfirmStartDraw}
        prize={currentPrize}
        eligiblePoolCount={targetDistrict === 'ALL' ? eligiblePool.length : eligiblePool.filter((p) => p.district === targetDistrict).length}
        excludedWinnersCount={excludedWinnersCount}
        distributionMode={distributionMode}
        winnersPerDistrict={winnersPerDistrict}
        totalWinnersToDraw={totalWinnersToDraw}
        districtEligibleCounts={districtEligibleCounts}
        targetDistrict={targetDistrict}
      />

      {/* Draw Review Modal (Two-Stage Confirmation: Discard/Redraw vs Confirm Winners) */}
      <DrawReviewModal
        isOpen={isReviewModalOpen}
        drawResult={temporaryDrawResult}
        onConfirmWinners={handleConfirmWinners}
        onRedraw={handleRedraw}
      />
    </main>
  );
}
