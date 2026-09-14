'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AttendanceRecord, District, DistributionMode, EligibilityStatus, Participant, Prize, RaffleLog, SystemSettings, TemporaryDrawResult, Winner } from '../lib/types';
import {
  INITIAL_PARTICIPANTS,
  INITIAL_PRIZES,
  INITIAL_WINNERS,
  INITIAL_LOGS,
  INITIAL_SETTINGS
} from '../lib/data';
import { Header } from '../components/Header';
import { ProjectorDisplay } from '../components/ProjectorDisplay';
import { AdminDashboard } from '../components/AdminDashboard';
import { GasGuideView } from '../components/GasGuideView';
import { PrizeClaimModule } from '../components/PrizeClaimModule';
import { AttendanceScannerModule } from '../components/attendance/AttendanceScannerModule';
import { DrawPreviewModal, DrawReviewModal } from '../components/DrawModals';
import { soundSynthesizer } from '../lib/sound';
import { triggerConfetti } from '../lib/confetti';

const DISTRICT_LIST: District[] = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'PRIVATE'];

export default function Home() {
  const [currentView, setCurrentView] = useState<'display' | 'admin' | 'claim' | 'attendance' | 'gas'>('display');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Application State
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);
  const [winners, setWinners] = useState<Winner[]>(INITIAL_WINNERS);
  const [logs, setLogs] = useState<RaffleLog[]>(INITIAL_LOGS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Active Prize Selection
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    const available = INITIAL_PRIZES.find((p) => p.remainingQuantity > 0);
    return available ? available.id : INITIAL_PRIZES[0].id;
  });

  // Draw Cycling State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStatus, setDrawStatus] = useState<'IDLE' | 'DRAWING' | 'REVEALED'>('IDLE');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealedWinners, setRevealedWinners] = useState<Participant[]>([]);
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

  // Modals
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [temporaryDrawResult, setTemporaryDrawResult] = useState<TemporaryDrawResult | null>(null);

  // Sound sync
  useEffect(() => {
    soundSynthesizer.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Load persisted cache on client mount after hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const cachedWinners = localStorage.getItem('td26_winners');
        if (cachedWinners) {
          const parsed = JSON.parse(cachedWinners);
          if (Array.isArray(parsed)) {
            setWinners(parsed);
          }
        }
      } catch (e) {
        console.error(e);
      }

      try {
        const cachedParticipants = localStorage.getItem('td26_profiling_participants');
        if (cachedParticipants) {
          const parsed = JSON.parse(cachedParticipants);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setParticipants(parsed);
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
            setAttendanceRecords(parsed);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);

    return () => clearTimeout(timer);
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

  // Verified Present & Eligible Count
  const presentCount = useMemo(() => {
    return participants.filter((p) => p.eligible === 'ELIGIBLE' || p.attendedAt).length;
  }, [participants]);

  // Attendance Handlers
  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants((prev) => {
      const list = prev.map((p) => (p.id === updated.id ? updated : p));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
      return list;
    });
  };

  const handleAddAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
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

  // Eligible pool calculations
  const eligiblePool = useMemo(() => {
    return participants.filter((p) => {
      if (p.eligible !== 'ELIGIBLE') return false;
      if (!settings.allowMultipleWins && p.winner === 'YES') return false;
      return true;
    });
  }, [participants, settings.allowMultipleWins]);

  const excludedWinnersCount = useMemo(() => {
    return participants.filter((p) => p.winner === 'YES').length;
  }, [participants]);

  // District Eligible Pool Breakdown
  const districtEligibleCounts = useMemo<Record<District, number>>(() => {
    const counts: Record<District, number> = {
      NORTH: 0,
      SOUTH: 0,
      EAST: 0,
      WEST: 0,
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
        SOUTH: [],
        EAST: [],
        WEST: [],
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
      // Combined Pool Draw
      const count = Math.min(combinedWinnersCount, currentPrize.remainingQuantity);
      if (eligiblePool.length < count) {
        alert(
          `Insufficient eligible participants. Needed: ${count}, Available: ${eligiblePool.length}`
        );
        return;
      }

      const poolCopy = [...eligiblePool];
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
      eligiblePoolSize: eligiblePool.length,
      distributionMode: distributionMode,
      winnersPerDistrict: distributionMode === 'EQUAL_PER_DISTRICT' ? winnersPerDistrict : undefined
    };

    setTemporaryDrawResult(tempResult);

    // Enter DRAWING state
    setIsDrawing(true);
    setDrawStatus('DRAWING');
    setRevealedWinners([]);
    setCountdown(null);

    // Start Audio
    soundSynthesizer.startSpinning();

    // Rapid Cycling on all 5 district cards
    // Filter participants by district for authentic cycling representation
    const participantsByDistrict: Record<District, Participant[]> = {
      NORTH: eligiblePool.filter((p) => p.district === 'NORTH'),
      SOUTH: eligiblePool.filter((p) => p.district === 'SOUTH'),
      EAST: eligiblePool.filter((p) => p.district === 'EAST'),
      WEST: eligiblePool.filter((p) => p.district === 'WEST'),
      PRIVATE: eligiblePool.filter((p) => p.district === 'PRIVATE')
    };

    const cycleInterval = setInterval(() => {
      const nextNames: Record<District, { name: string; school: string }> = { ...shufflingNames };
      DISTRICT_LIST.forEach((d) => {
        const pool = participantsByDistrict[d];
        if (pool && pool.length > 0) {
          const rand = pool[Math.floor(Math.random() * pool.length)];
          nextNames[d] = { name: rand.fullName, school: rand.school };
        }
      });
      setShufflingNames(nextNames);
    }, 75);

    // Animation duration from settings
    const durationMs = (settings.animationDuration || 6) * 1000;

    setTimeout(() => {
      // End rapid cycling, stop spinning sound
      clearInterval(cycleInterval);
      soundSynthesizer.stopSpinning();

      // Initiate 3-2-1 Countdown
      setCountdown(3);
      soundSynthesizer.playCountdownBeep(3);

      setTimeout(() => {
        setCountdown(2);
        soundSynthesizer.playCountdownBeep(2);

        setTimeout(() => {
          setCountdown(1);
          soundSynthesizer.playCountdownBeep(1);

          setTimeout(() => {
            // Final Reveal (0)
            setCountdown(null);
            setIsDrawing(false);
            setDrawStatus('REVEALED');
            setRevealedWinners(selectedWinners);

            // Celebration Audio & Confetti
            soundSynthesizer.playCelebrationFanfare();
            triggerConfetti();

            // Open Draw Review Modal after brief delay so audience can admire the cards
            setTimeout(() => {
              setIsReviewModalOpen(true);
            }, 1800);
          }, 1000);
        }, 1000);
      }, 1000);
    }, Math.max(2500, durationMs - 3000));
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
      claimStatus: 'UNCLAIMED'
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

    // Decrement Prize remaining quantity
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id === temporaryDrawResult.prize.id) {
          const newDrawn = p.drawnQuantity + temporaryDrawResult.winners.length;
          const newRemaining = Math.max(0, p.quantity - newDrawn);
          return {
            ...p,
            drawnQuantity: newDrawn,
            remainingQuantity: newRemaining,
            status: newRemaining > 0 ? 'AVAILABLE' : 'EXHAUSTED'
          };
        }
        return p;
      })
    );

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
      winnersPerDistrict: temporaryDrawResult.winnersPerDistrict
    };
    setLogs((prev) => [newLog, ...prev]);

    // Close Review Modal
    setIsReviewModalOpen(false);
    setTemporaryDrawResult(null);

    // Automatically select the next available prize if this one was exhausted
    const remainingPrizes = prizes.map((p) =>
      p.id === temporaryDrawResult.prize.id
        ? { ...p, remainingQuantity: p.quantity - (p.drawnQuantity + temporaryDrawResult.winners.length) }
        : p
    );
    const nextAvailable = remainingPrizes.find((p) => p.remainingQuantity > 0);
    if (nextAvailable) {
      handleSelectPrize(nextAvailable.id, remainingPrizes);
    }
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
      winnersPerDistrict: temporaryDrawResult.winnersPerDistrict
    };
    setLogs((prev) => [redrawnLog, ...prev]);

    // Reset display and temporary result
    setIsReviewModalOpen(false);
    setTemporaryDrawResult(null);
    setDrawStatus('IDLE');
    setRevealedWinners([]);
  };

  // Participant Eligibility Toggle
  const handleToggleEligibility = (id: string) => {
    soundSynthesizer.playClick();
    setParticipants((prev: Participant[]) => {
      const updated: Participant[] = prev.map((p) => {
        if (p.id === id) {
          const nextEligible: EligibilityStatus = p.eligible === 'ELIGIBLE' ? 'INELIGIBLE' : 'ELIGIBLE';
          return { ...p, eligible: nextEligible };
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
  };

  // Add Prize
  const handleAddPrize = (newPrize: Prize) => {
    soundSynthesizer.playSuccess();
    setPrizes((prev) => [...prev, newPrize]);
    if (!selectedPrizeId) {
      setSelectedPrizeId(newPrize.id);
    }
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

  // Update Settings
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    soundSynthesizer.playSuccess();
    setSettings(newSettings);
  };

  // Prepare Fresh Event Reset (clears winners, preserves participants)
  const handlePrepareNewEvent = () => {
    soundSynthesizer.playCelebrationFanfare();
    setWinners([]);
    setLogs([]);
    setRevealedWinners([]);
    setDrawStatus('IDLE');
    try {
      localStorage.removeItem('td26_winners');
    } catch (e) {
      console.error(e);
    }
    setParticipants((prev) => {
      const reset = prev.map((p) => ({ ...p, winner: 'NO' as const, claimed: 'NO' as const }));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(reset));
      } catch (e) {
        console.error(e);
      }
      return reset;
    });
    setPrizes((prev) =>
      prev.map((p) => ({
        ...p,
        drawnQuantity: 0,
        remainingQuantity: p.quantity,
        status: 'AVAILABLE'
      }))
    );
  };

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col selection:bg-[#1a1a1a] selection:text-[#f8f7f4]">
      {/* Top Application Header */}
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        unclaimedCount={unclaimedCount}
        presentCount={presentCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentView === 'display' && (
          <ProjectorDisplay
            selectedPrize={currentPrize}
            isDrawing={isDrawing}
            shufflingNames={shufflingNames}
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
          />
        )}

        {currentView === 'attendance' && (
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6">
            <AttendanceScannerModule
              participants={participants}
              attendanceRecords={attendanceRecords}
              onUpdateParticipant={handleUpdateParticipant}
              onAddAttendanceRecord={handleAddAttendanceRecord}
            />
          </div>
        )}

        {currentView === 'claim' && (
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6">
            <PrizeClaimModule
              winners={winners}
              onClaimPrize={handleClaimPrize}
              onUnclaimPrize={handleUnclaimPrize}
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
            onToggleEligibility={handleToggleEligibility}
            onImportParticipants={handleImportParticipants}
            onAddPrize={handleAddPrize}
            onClaimPrize={handleClaimPrize}
            onUnclaimPrize={handleUnclaimPrize}
            onUpdateSettings={handleUpdateSettings}
            onPrepareNewEvent={handlePrepareNewEvent}
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
        eligiblePoolCount={eligiblePool.length}
        excludedWinnersCount={excludedWinnersCount}
        distributionMode={distributionMode}
        winnersPerDistrict={winnersPerDistrict}
        totalWinnersToDraw={totalWinnersToDraw}
        districtEligibleCounts={districtEligibleCounts}
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
