'use client';

import React, { useState, useMemo } from 'react';
import {
  District,
  DistributionMode,
  Participant,
  Prize,
  RaffleLog,
  TemporaryDrawResult,
  Winner
} from '../../lib/types';
import { isEligibleForDraw } from '../../lib/data';
import { soundSynthesizer } from '../../lib/sound';
import {
  Sparkles,
  Users,
  Trophy,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  Minus,
  Plus,
  Target,
  Globe,
  Clock,
  ShieldCheck,
  Search
} from 'lucide-react';

const DISTRICT_CONFIG: { id: District; number: string; title: string; isPrivate?: boolean }[] = [
  { id: 'NORTH', number: '01', title: 'North' },
  { id: 'EAST', number: '02', title: 'East' },
  { id: 'WEST', number: '03', title: 'West' },
  { id: 'SOUTH', number: '04', title: 'South' },
  { id: 'PRIVATE', number: '05', title: 'Private (ECCD + Private School + LSB)', isPrivate: true }
];

const DISTRICTS: District[] = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];

// Helper to parse numeric peso value from prize name if unitValue is 0
function getPrizeDisplayValue(prize: Prize | null): number {
  if (!prize) return 0;
  if (prize.unitValue > 0) return prize.unitValue;
  const match = prize.name.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (match) {
    const val = parseFloat(match[0]);
    if (!isNaN(val) && val > 0) return val;
  }
  return 0;
}

interface PreDrawStationProps {
  prizes: Prize[];
  participants: Participant[];
  winners: Winner[];
  logs: RaffleLog[];
  onConfirmPreDrawBatch: (batch: TemporaryDrawResult) => void;
  allowMultipleWins: boolean;
  initialReelDuration?: number;
}

export const PreDrawStation: React.FC<PreDrawStationProps> = ({
  prizes,
  participants,
  winners,
  logs,
  onConfirmPreDrawBatch,
  allowMultipleWins,
  initialReelDuration = 3
}) => {
  // Local states
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    const available = prizes.find((p) => p.remainingQuantity > 0);
    return available ? available.id : prizes[0]?.id || '';
  });

  const [distributionMode, setDistributionMode] = useState<DistributionMode>('COMBINED_POOL');
  const [winnersPerDistrict, setWinnersPerDistrict] = useState<number>(1);
  const [combinedWinnersCount, setCombinedWinnersCount] = useState<number>(5);
  const [provisionalBatch, setProvisionalBatch] = useState<TemporaryDrawResult | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'console' | 'history'>('console');
  const [masterlistScope, setMasterlistScope] = useState<'PRE_DRAW_ONLY' | 'ALL_WINNERS'>('PRE_DRAW_ONLY');

  // Animation Duration for Pre-Draw Reel
  const [reelDuration, setReelDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('td26_predraw_reel_duration');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) return parsed;
      }
    } catch (e) {}
    return initialReelDuration || 3;
  });
  const [shuffleProgress, setShuffleProgress] = useState<number>(0);

  const handleReelDurationChange = (sec: number) => {
    const val = Math.max(1, Math.min(20, sec));
    setReelDuration(val);
    try {
      localStorage.setItem('td26_predraw_reel_duration', String(val));
    } catch (e) {}
  };

  // 5 Cards Shuffle States
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasDrawnRound, setHasDrawnRound] = useState(false);
  const [shufflingNames, setShufflingNames] = useState<Record<District, { name: string; school: string }>>({
    NORTH: { name: 'Awaiting pre-draw...', school: '' },
    EAST: { name: 'Awaiting pre-draw...', school: '' },
    WEST: { name: 'Awaiting pre-draw...', school: '' },
    SOUTH: { name: 'Awaiting pre-draw...', school: '' },
    PRIVATE: { name: 'Awaiting pre-draw...', school: '' }
  });
  const [revealedWinnersByDistrict, setRevealedWinnersByDistrict] = useState<Record<District, Participant[]>>({
    NORTH: [],
    EAST: [],
    WEST: [],
    SOUTH: [],
    PRIVATE: []
  });

  // Currently selected prize
  const currentPrize = useMemo(() => {
    return prizes.find((p) => p.id === selectedPrizeId) || prizes[0] || null;
  }, [prizes, selectedPrizeId]);

  const availableQty = currentPrize ? currentPrize.remainingQuantity : 0;
  const currentUnitVal = getPrizeDisplayValue(currentPrize);

  const presentCount = useMemo(() => {
    return participants.filter((p) => p.eligible === 'ELIGIBLE' || p.attendedAt).length;
  }, [participants]);

  const totalWinnersCount = useMemo(() => {
    return participants.filter((p) => p.winner === 'YES').length;
  }, [participants]);

  // Filter eligible participants - strictly Teaching Personnel only (Non-Teaching excluded from raffle draws)
  const eligiblePool = useMemo(() => {
    return participants.filter((p) => isEligibleForDraw(p, allowMultipleWins));
  }, [participants, allowMultipleWins]);

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

  // Limits
  const maxPerDistrictByPrize = Math.floor(availableQty / 5);
  const minDistrictEligible = Math.min(...DISTRICTS.map((d) => districtEligibleCounts[d] || 0));
  const maxPerDistrict = Math.min(maxPerDistrictByPrize, minDistrictEligible);

  const totalWinnersToDraw =
    distributionMode === 'EQUAL_PER_DISTRICT'
      ? winnersPerDistrict * 5
      : combinedWinnersCount;

  // Validation
  const isDistrictPoolInsufficient =
    distributionMode === 'EQUAL_PER_DISTRICT' &&
    DISTRICTS.some((d) => (districtEligibleCounts[d] || 0) < winnersPerDistrict);
  const isCombinedPoolInsufficient =
    distributionMode === 'COMBINED_POOL' && combinedWinnersCount > eligiblePool.length;
  const isQuantityExceeded = totalWinnersToDraw > availableQty || totalWinnersToDraw <= 0;
  const isButtonDisabled =
    isShuffling ||
    availableQty <= 0 ||
    isDistrictPoolInsufficient ||
    isCombinedPoolInsufficient ||
    isQuantityExceeded;

  // Helper to identify Pre-Draw records
  const isPreDrawRecord = (drawNumber?: string, drawType?: string) => {
    if (drawType === 'PRE_DRAW') return true;
    if (drawNumber && String(drawNumber).toUpperCase().startsWith('PRE')) return true;
    return false;
  };

  // Pre-drawn winners recorded
  const preDrawWinners = useMemo(() => {
    return winners.filter((w) => isPreDrawRecord(w.drawNumber, w.drawType));
  }, [winners]);

  // Pre-drawn logs
  const preDrawLogs = useMemo(() => {
    return logs.filter((l) => isPreDrawRecord(l.drawNumber, l.drawType));
  }, [logs]);

  // Execute Pre-Draw with Animated 5 Cards Shuffling Reel
  const handleExecuteRng = () => {
    if (!currentPrize || availableQty <= 0 || isShuffling) return;

    // 1. Unbiased RNG selection
    let selectedWinners: Participant[] = [];
    const selectedByDistrict: Record<District, Participant[]> = {
      NORTH: [],
      EAST: [],
      WEST: [],
      SOUTH: [],
      PRIVATE: []
    };

    if (distributionMode === 'EQUAL_PER_DISTRICT') {
      DISTRICTS.forEach((d) => {
        const districtPool = eligiblePool.filter((p) => p.district === d);
        // Fisher-Yates
        for (let i = districtPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [districtPool[i], districtPool[j]] = [districtPool[j], districtPool[i]];
        }
        selectedByDistrict[d] = districtPool.slice(0, winnersPerDistrict);
      });

      DISTRICTS.forEach((d) => {
        selectedWinners.push(...selectedByDistrict[d]);
      });
    } else {
      const count = Math.min(combinedWinnersCount, availableQty);
      const poolCopy = [...eligiblePool];
      for (let i = poolCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
      }
      selectedWinners = poolCopy.slice(0, count);

      selectedWinners.forEach((w) => {
        if (selectedByDistrict[w.district]) {
          selectedByDistrict[w.district].push(w);
        }
      });
    }

    const nextBatchNum = `PRE-${String(preDrawLogs.length + 1).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const result: TemporaryDrawResult = {
      drawNumber: nextBatchNum,
      prize: {
        ...currentPrize,
        unitValue: currentUnitVal
      },
      winners: selectedWinners,
      timestamp,
      eligiblePoolSize: eligiblePool.length,
      distributionMode,
      winnersPerDistrict: distributionMode === 'EQUAL_PER_DISTRICT' ? winnersPerDistrict : undefined,
      drawType: 'PRE_DRAW'
    };

    setProvisionalBatch(result);
    setIsReviewOpen(false);
    setIsShuffling(true);
    setHasDrawnRound(false);

    // Filter participants by district for authentic reel cycling
    const participantsByDistrict: Record<District, Participant[]> = {
      NORTH: eligiblePool.filter((p) => p.district === 'NORTH'),
      EAST: eligiblePool.filter((p) => p.district === 'EAST'),
      WEST: eligiblePool.filter((p) => p.district === 'WEST'),
      SOUTH: eligiblePool.filter((p) => p.district === 'SOUTH'),
      PRIVATE: eligiblePool.filter((p) => p.district === 'PRIVATE')
    };

    // 2. Start Audio Reel
    soundSynthesizer.startSpinning();

    // 3. Shuffle Reel on 5 Cards (User-configured duration)
    const durationMs = Math.max(1000, Math.round(reelDuration * 1000));
    const startTime = Date.now();
    let isDeceleratingSound = false;

    setShuffleProgress(0);

    const stepReel = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = durationMs - elapsed;

      setShuffleProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)));

      // When finished: reveal cards and open review table
      if (remaining <= 0) {
        soundSynthesizer.stopSpinning();
        soundSynthesizer.playCelebrationFanfare();

        setShuffleProgress(100);
        setIsShuffling(false);
        setHasDrawnRound(true);
        setRevealedWinnersByDistrict(selectedByDistrict);

        // Open batch review modal after 700ms so user sees the 5 cards light up with winners
        setTimeout(() => {
          setIsReviewOpen(true);
        }, 700);
        return;
      }

      // Roll names on all 5 district cards
      const nextNames: Record<District, { name: string; school: string }> = { ...shufflingNames };
      DISTRICTS.forEach((d) => {
        const pool = participantsByDistrict[d];
        if (pool && pool.length > 0) {
          const rand = pool[Math.floor(Math.random() * pool.length)];
          nextNames[d] = { name: rand.fullName, school: rand.school };
        }
      });
      setShufflingNames(nextNames);

      // Deceleration curve
      const progress = Math.min(1, elapsed / durationMs);
      let nextDelay = 45;
      if (progress > 0.65) {
        const decelProgress = (progress - 0.65) / 0.35;
        nextDelay = Math.round(45 + Math.pow(decelProgress, 2.3) * 450);
        if (nextDelay >= 85) {
          if (!isDeceleratingSound) {
            soundSynthesizer.stopSpinning();
            isDeceleratingSound = true;
          }
          soundSynthesizer.playClick();
        }
      }

      setTimeout(stepReel, Math.min(nextDelay, Math.max(25, remaining)));
    };

    stepReel();
  };

  // Redraw action from modal (closes modal and re-shuffles 5 cards)
  const handleRedrawFromModal = () => {
    setIsReviewOpen(false);
    handleExecuteRng();
  };

  // Confirm and persist batch
  const handleConfirmBatch = () => {
    if (!provisionalBatch) return;
    onConfirmPreDrawBatch(provisionalBatch);
    setIsReviewOpen(false);
    setProvisionalBatch(null);
    setHasDrawnRound(false);

    // Auto-adjust combined count if remaining prize reduced
    const remainingAfter = availableQty - provisionalBatch.winners.length;
    if (remainingAfter > 0) {
      setCombinedWinnersCount((prev) => Math.min(prev, remainingAfter));
    }
  };

  // Active masterlist depending on scope filter
  const activeMasterlistWinners = useMemo(() => {
    return masterlistScope === 'PRE_DRAW_ONLY' ? preDrawWinners : winners;
  }, [masterlistScope, preDrawWinners, winners]);

  // Filtered winners for history table
  const filteredHistory = useMemo(() => {
    if (!searchFilter.trim()) return activeMasterlistWinners;
    const q = searchFilter.toLowerCase();
    return activeMasterlistWinners.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.winnerId.toLowerCase().includes(q) ||
        (w.participantId && w.participantId.toLowerCase().includes(q)) ||
        w.school.toLowerCase().includes(q) ||
        w.prizeName.toLowerCase().includes(q) ||
        (w.drawNumber && w.drawNumber.toLowerCase().includes(q))
    );
  }, [activeMasterlistWinners, searchFilter]);

  // Export CSV
  const exportPreDrawCSV = () => {
    const headers = [
      'Batch #',
      'Winner ID',
      'Profiling ID',
      'Name',
      'District',
      'School',
      'Position',
      'Prize Won',
      'Unit Value',
      'Date & Time',
      'Claim Status'
    ];

    const rows = activeMasterlistWinners.map((w) => [
      w.drawNumber,
      w.winnerId,
      w.participantId || 'N/A',
      `"${w.name}"`,
      w.district,
      `"${w.school}"`,
      `"${w.position}"`,
      `"${w.prizeName}"`,
      w.unitValue,
      `${w.date} ${w.time}`,
      w.claimStatus
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `deped_malungon_${masterlistScope === 'PRE_DRAW_ONLY' ? 'predraw' : 'all_winners'}_masterlist_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      {/* Station Sub-Navigation & Header */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl relative border-t-4 border-t-indigo-600">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
                  PRE-DRAW STATION &amp; BATCH DISPATCH
                </h2>
                <span className="bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-black px-2 py-0.5 border border-indigo-300 dark:border-indigo-800 uppercase">
                  Advance Draw Session
                </span>
              </div>
              <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
                Advance 5-District Shuffling Reel • Raffle Committee Secretariat &amp; LGU Observers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('console')}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-[#1a1a1a] dark:border-white/20 ${
                activeTab === 'console'
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              5-Card Batch Drawer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-[#1a1a1a] dark:border-white/20 flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Pre-Draw Masterlist</span>
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 font-mono">
                {preDrawWinners.length}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#1a1a1a]/15 dark:border-white/10">
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Pre-Draw Winners
            </span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {preDrawWinners.length}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Batches Executed
            </span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white font-mono">
              {preDrawLogs.length}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Teaching Pool Left
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {eligiblePool.length}
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                (Non-Teaching excluded)
              </span>
            </div>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Pre-Draw Value Awarded
            </span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white font-mono">
              ₱{preDrawWinners.reduce((acc, w) => acc + (w.unitValue || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'console' && (
        <div className="space-y-6">
          {/* THE 5 DISTRICT CARDS SHUFFLE DISPLAY (User requested: North, East, West, South, Private) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-widest text-[#1a1a1a] dark:text-white">
                <Sparkles className="w-4 h-4 text-[#ff6a00]" />
                <span>5-DISTRICT SHUFFLE DISPLAY (PRE-DRAW REEL)</span>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 uppercase">
                {isShuffling
                  ? `⚡ SHUFFLING... (${Math.max(0, (reelDuration * (100 - shuffleProgress) / 100)).toFixed(1)}s)`
                  : hasDrawnRound
                  ? '🏆 WINNERS REVEALED'
                  : 'READY TO SHUFFLE'}
              </span>
            </div>

            {/* Dynamic Reel Progress Bar */}
            {isShuffling && (
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 overflow-hidden rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-[#ff6a00] to-emerald-500 transition-all duration-75"
                  style={{ width: `${shuffleProgress}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
              {DISTRICT_CONFIG.map(({ id, title, isPrivate }) => {
                const districtWinners = revealedWinnersByDistrict[id] || [];
                const hasWinners = hasDrawnRound && districtWinners.length > 0;

                return (
                  <div
                    key={id}
                    className={`bg-white dark:bg-[#141416] border-2 rounded-2xl p-4 transition-all flex flex-col justify-between min-h-[140px] shadow-sm ${
                      isShuffling
                        ? 'border-[#ff6a00] bg-orange-50/80 dark:bg-orange-950/20 ring-4 ring-[#ff6a00]/25 shadow-md'
                        : hasWinners
                        ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md'
                        : 'border-[#1a1a1a]/20 dark:border-white/10'
                    } ${isPrivate ? 'sm:col-span-2 sm:w-1/2 sm:mx-auto w-full' : ''}`}
                  >
                    {/* Card Header with Orange Underline Border */}
                    <div className="text-center pb-2 mb-2 border-b-2 border-[#ff6a00]/30 relative flex items-center justify-center">
                      <h4 className="font-mono text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#ff6a00]">
                        {title}
                      </h4>
                      {hasWinners && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 rounded-full">
                          {districtWinners.length} 🏆
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="flex-1 flex flex-col justify-center items-center py-2 text-center min-h-[70px]">
                      {isShuffling ? (
                        <div className="w-full space-y-1 overflow-hidden">
                          <div className="font-winner font-black text-lg sm:text-xl md:text-2xl text-[#111827] dark:text-white uppercase tracking-tight leading-tight animate-reel-slide">
                            {shufflingNames[id]?.name || 'DepEd Participant'}
                          </div>
                          <div className="font-mono text-[10px] text-[#ff6a00] font-bold uppercase tracking-widest animate-pulse">
                            [ SHUFFLING {districtEligibleCounts[id] || 0} CANDIDATES... ]
                          </div>
                        </div>
                      ) : hasWinners ? (
                        <div className="w-full space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                          {districtWinners.map((w, idx) => (
                            <div key={idx} className="border-b border-neutral-200 dark:border-white/10 pb-1 last:border-b-0">
                              <div className="font-winner font-black text-base sm:text-lg text-[#111827] dark:text-white uppercase tracking-tight leading-snug">
                                {w.fullName}
                              </div>
                              <div className="text-[10px] font-mono text-neutral-500 truncate">
                                {w.school} • <span className="font-bold text-indigo-600 dark:text-indigo-400">{w.id}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-neutral-400 font-mono text-xs uppercase tracking-wider space-y-0.5">
                          <div className="font-semibold">Waiting for pre-draw...</div>
                          <div className="text-[10px] text-neutral-400">
                            Pool: {districtEligibleCounts[id] || 0} eligible teachers
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BATCH CONTROLS CONSOLE */}
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm dark:shadow-2xl relative border-t-4 border-t-indigo-600 space-y-6">
            {/* 1. Select Prize */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 mb-2">
                SELECT PRIZE FOR PRE-DRAW:
              </label>
              <select
                value={selectedPrizeId}
                disabled={isShuffling}
                onChange={(e) => {
                  setSelectedPrizeId(e.target.value);
                  const p = prizes.find((x) => x.id === e.target.value);
                  if (p) {
                    setCombinedWinnersCount(Math.min(5, p.remainingQuantity || 1));
                  }
                }}
                className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/20 focus:border-indigo-600 px-4 py-3 text-[#1a1a1a] dark:text-white font-black text-sm uppercase tracking-wide outline-none transition-colors"
              >
                {prizes.length === 0 && (
                  <option value="" disabled>
                    No prizes registered in inventory
                  </option>
                )}
                {prizes.map((p) => {
                  const val = getPrizeDisplayValue(p);
                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={p.remainingQuantity <= 0}
                      className="bg-white dark:bg-neutral-900 text-black dark:text-white py-2"
                    >
                      {p.name} — (Remaining: {p.remainingQuantity} / {p.quantity})
                      {val > 0 ? ` • ₱${val.toLocaleString()} each` : ''}
                      {p.remainingQuantity <= 0 ? ' [EXHAUSTED]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Distribution Mode */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 mb-2">
                DISTRIBUTION ALLOCATION MODE:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isShuffling}
                  onClick={() => setDistributionMode('COMBINED_POOL')}
                  className={`px-4 py-3 border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                    distributionMode === 'COMBINED_POOL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:text-[#1a1a1a] dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Combined Pool (Bulk RNG)</span>
                </button>

                <button
                  type="button"
                  disabled={isShuffling}
                  onClick={() => setDistributionMode('EQUAL_PER_DISTRICT')}
                  className={`px-4 py-3 border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                    distributionMode === 'EQUAL_PER_DISTRICT'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:text-[#1a1a1a] dark:hover:text-white'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Equal Per District (5 Quotas)</span>
                </button>
              </div>
            </div>

            {/* 3. Stepper & Quantity Configuration */}
            {distributionMode === 'COMBINED_POOL' ? (
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 sm:p-5 space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                  WINNERS IN THIS PRE-DRAW BATCH:
                </label>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-black">
                    <button
                      type="button"
                      disabled={combinedWinnersCount <= 1 || isShuffling}
                      onClick={() => setCombinedWinnersCount(Math.max(1, combinedWinnersCount - 1))}
                      className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-16 text-center font-black text-xl text-[#1a1a1a] dark:text-white font-mono">
                      {combinedWinnersCount}
                    </span>
                    <button
                      type="button"
                      disabled={combinedWinnersCount >= availableQty || combinedWinnersCount >= eligiblePool.length || isShuffling}
                      onClick={() => setCombinedWinnersCount(combinedWinnersCount + 1)}
                      className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/15 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">{combinedWinnersCount} WINNERS</span>
                    {currentUnitVal > 0 && (
                      <span className="text-neutral-500 font-normal">
                        (₱{(currentUnitVal * combinedWinnersCount).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 block mb-2">
                    QUICK BATCH PRESETS:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[5, 10, 20, 50].map((preset) => {
                      if (preset > availableQty && preset !== 5) return null;
                      const isCurrent = combinedWinnersCount === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isShuffling}
                          onClick={() => setCombinedWinnersCount(preset)}
                          className={`px-3 py-1.5 border text-[11px] font-black uppercase tracking-wider transition-colors ${
                            isCurrent
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:border-indigo-600'
                          }`}
                        >
                          {preset} Winners
                        </button>
                      );
                    })}
                    {availableQty > 0 && (
                      <button
                        type="button"
                        disabled={isShuffling}
                        onClick={() => setCombinedWinnersCount(availableQty)}
                        className={`px-3 py-1.5 border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          combinedWinnersCount === availableQty
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-neutral-900 text-indigo-600 border-indigo-600/40 hover:bg-indigo-600/10'
                        }`}
                      >
                        All Remaining ({availableQty})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 sm:p-5 space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                  WINNERS PER DISTRICT:
                </label>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-black">
                    <button
                      type="button"
                      disabled={winnersPerDistrict <= 1 || isShuffling}
                      onClick={() => setWinnersPerDistrict(Math.max(1, winnersPerDistrict - 1))}
                      className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-16 text-center font-black text-xl text-[#1a1a1a] dark:text-white font-mono">
                      {winnersPerDistrict}
                    </span>
                    <button
                      type="button"
                      disabled={winnersPerDistrict >= maxPerDistrict || (winnersPerDistrict + 1) * 5 > availableQty || isShuffling}
                      onClick={() => setWinnersPerDistrict(winnersPerDistrict + 1)}
                      className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/15 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">{winnersPerDistrict * 5} TOTAL WINNERS</span>
                    <span className="text-neutral-500 font-normal">({winnersPerDistrict} × 5 districts)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Pre-Draw Reel Animation Duration */}
            <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                    PRE-DRAW REEL ANIMATION DURATION:
                  </label>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-base">
                    {reelDuration}s
                  </span>
                  <span className="text-[10px] text-neutral-500 uppercase font-mono">
                    ({reelDuration <= 1.5 ? 'Fast' : reelDuration <= 3.5 ? 'Balanced' : 'Dramatic'})
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={reelDuration}
                disabled={isShuffling}
                onChange={(e) => handleReelDurationChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
              />

              {/* Quick Duration Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono uppercase mr-1">
                  Presets:
                </span>
                {[
                  { sec: 1, label: '1s (Fast)' },
                  { sec: 2, label: '2s (Snappy)' },
                  { sec: 3, label: '3s (Default)' },
                  { sec: 5, label: '5s (Stage)' },
                  { sec: 8, label: '8s (Suspense)' },
                  { sec: 10, label: '10s (Dramatic)' }
                ].map(({ sec, label }) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={isShuffling}
                    onClick={() => handleReelDurationChange(sec)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold transition-all border ${
                      reelDuration === sec
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#1a1a1a] dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10'
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Action Execute Button with Shuffle Reel */}
            <button
              type="button"
              disabled={isButtonDisabled}
              onClick={handleExecuteRng}
              className={`w-full py-4 font-black text-base uppercase tracking-wider shadow-md flex items-center justify-center gap-2.5 transition-all ${
                isButtonDisabled
                  ? 'bg-neutral-200 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-300 dark:border-white/10 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.01] active:scale-[0.99] shadow-indigo-600/30'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {isShuffling
                  ? `SHUFFLING CANDIDATES... (${Math.max(0, (reelDuration * (100 - shuffleProgress) / 100)).toFixed(1)}s)`
                  : `EXECUTE PRE-DRAW BATCH (${totalWinnersToDraw} ${totalWinnersToDraw === 1 ? 'WINNER' : 'WINNERS'})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* History & Masterlist Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-black text-base sm:text-lg text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                  OFFICIAL WINNERS MASTERLIST
                </h3>
                <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                  Showing: {activeMasterlistWinners.length} {masterlistScope === 'PRE_DRAW_ONLY' ? 'Pre-Draw Records' : 'Total System Winners'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportPreDrawCSV}
                  disabled={activeMasterlistWinners.length === 0}
                  className="px-3 py-2 bg-[#1a1a1a] hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed border border-[#1a1a1a] dark:border-white/20 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={activeMasterlistWinners.length === 0}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Sheet</span>
                </button>
              </div>
            </div>

            {/* Scope Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1a1a1a]/10 dark:border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                VIEW SCOPE:
              </span>
              <button
                type="button"
                onClick={() => setMasterlistScope('PRE_DRAW_ONLY')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                  masterlistScope === 'PRE_DRAW_ONLY'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-[#f8f7f4] dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:border-indigo-600'
                }`}
              >
                Pre-Draw Batches ({preDrawWinners.length})
              </button>
              <button
                type="button"
                onClick={() => setMasterlistScope('ALL_WINNERS')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                  masterlistScope === 'ALL_WINNERS'
                    ? 'bg-[#FF1E1E] text-white border-[#FF1E1E] shadow-sm'
                    : 'bg-[#f8f7f4] dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:border-[#FF1E1E]'
                }`}
              >
                All System Winners ({winners.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${masterlistScope === 'PRE_DRAW_ONLY' ? 'pre-draw' : 'all'} winner name, Profiling ID, school, prize, batch #...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/10 pl-9 pr-3 py-2 text-xs font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-indigo-600 uppercase"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1a1a1a] border-b border-[#1a1a1a] dark:border-white/20 text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                    <th className="p-3">#</th>
                    <th className="p-3 whitespace-nowrap">Batch #</th>
                    <th className="p-3 whitespace-nowrap">Winner ID</th>
                    <th className="p-3 whitespace-nowrap">Profiling ID</th>
                    <th className="p-3 whitespace-nowrap">Winner Name</th>
                    <th className="p-3 whitespace-nowrap">District</th>
                    <th className="p-3 whitespace-nowrap">School</th>
                    <th className="p-3 whitespace-nowrap">Position</th>
                    <th className="p-3 whitespace-nowrap">Prize Won</th>
                    <th className="p-3 whitespace-nowrap">Date &amp; Time</th>
                    <th className="p-3 text-center whitespace-nowrap">Claim Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5 font-sans">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-neutral-500 font-bold uppercase tracking-wider">
                        {activeMasterlistWinners.length === 0
                          ? 'No winners recorded yet for this view.'
                          : 'No matching winners found for this search filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((w, idx) => (
                      <tr key={w.winnerId} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                        <td className="p-3 font-mono text-neutral-500 text-[11px]">{idx + 1}</td>
                        <td className="p-3 font-mono font-black text-indigo-600 whitespace-nowrap">{w.drawNumber}</td>
                        <td className="p-3 font-mono font-black text-[#FF1E1E] whitespace-nowrap">{w.winnerId}</td>
                        <td className="p-3 font-mono font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {w.participantId || 'N/A'}
                        </td>
                        <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">
                          {w.name}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="bg-[#1a1a1a] dark:bg-neutral-950 text-white font-black text-[10px] px-2 py-0.5 border border-[#1a1a1a] dark:border-white/10 uppercase tracking-wider">
                            {w.district}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={w.school}>
                          {w.school}
                        </td>
                        <td className="p-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{w.position}</td>
                        <td className="p-3 font-bold text-[#1a1a1a] dark:text-white whitespace-nowrap">{w.prizeName}</td>
                        <td className="p-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                          {w.date} {w.time}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest inline-flex items-center gap-1 ${
                              w.claimStatus === 'CLAIMED'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {w.claimStatus === 'CLAIMED' ? 'CLAIMED' : 'UNCLAIMED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TWO-STAGE AUDIT & CONFIRMATION MODAL */}
      {isReviewOpen && provisionalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/20 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative border-t-4 border-t-indigo-600">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1a1a1a]/15 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight text-[#1a1a1a] dark:text-white">
                    PROVISIONAL PRE-DRAW BATCH REVIEW ({provisionalBatch.drawNumber})
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 font-medium">
                  Verify the drawn candidates below. You may redraw the batch or confirm to officially award the prizes.
                </p>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                  {provisionalBatch.winners.length} WINNERS
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {provisionalBatch.distributionMode === 'EQUAL_PER_DISTRICT'
                    ? `${provisionalBatch.winnersPerDistrict} per district`
                    : 'Combined pool'}
                </span>
              </div>
            </div>

            {/* Prize summary banner */}
            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 border-b border-indigo-200 dark:border-indigo-900 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Prize Item:</span>
                <strong className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                  {provisionalBatch.prize.name}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Unit Value:</span>
                <span className="font-mono font-bold text-indigo-900 dark:text-indigo-200">
                  {currentUnitVal > 0 ? `₱${currentUnitVal.toLocaleString()} each` : 'Token / Item'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Batch Value:</span>
                <span className="font-mono font-bold text-indigo-900 dark:text-indigo-200">
                  {currentUnitVal > 0
                    ? `₱${(currentUnitVal * provisionalBatch.winners.length).toLocaleString()}`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Winners List (REQUEST 1: PROFILING ID instead of Deped ID) */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-[#1a1a1a]/15 text-[10px] uppercase font-mono font-bold text-neutral-600 dark:text-neutral-400">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5 whitespace-nowrap">PROFILING ID</th>
                    <th className="p-2.5">Full Name</th>
                    <th className="p-2.5">District</th>
                    <th className="p-2.5">School / Station</th>
                    <th className="p-2.5">Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-white/5 font-sans">
                  {provisionalBatch.winners.map((w, idx) => (
                    <tr key={w.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
                      <td className="p-2.5 font-mono text-neutral-400 text-[11px]">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {w.id}
                      </td>
                      <td className="p-2.5 font-black uppercase text-[#1a1a1a] dark:text-white">{w.fullName}</td>
                      <td className="p-2.5">
                        <span className="bg-[#1a1a1a] dark:bg-neutral-900 text-white font-black text-[9px] px-2 py-0.5">
                          {w.district}
                        </span>
                      </td>
                      <td className="p-2.5 text-neutral-600 dark:text-neutral-400">{w.school}</td>
                      <td className="p-2.5 text-neutral-600 dark:text-neutral-400">{w.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#1a1a1a]/15 dark:border-white/10 bg-[#f8f7f4] dark:bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsReviewOpen(false);
                  setProvisionalBatch(null);
                  setHasDrawnRound(false);
                }}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Discard Batch
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRedrawFromModal}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  <span>Redraw Batch (Shuffle)</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBatch}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Commit Batch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY OFFICIAL SHEET LAYOUT (Hidden on screen, rendered on window.print()) */}
      <div className="hidden print:block bg-white text-black p-4">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter landscape;
                margin: 0.35in;
              }
              body {
                background: white !important;
                color: black !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
            }
          `
        }} />
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <p className="text-xs uppercase font-serif tracking-widest">Republic of the Philippines</p>
          <p className="text-sm font-bold uppercase font-serif">Department of Education • Region XII</p>
          <p className="text-xs uppercase font-serif">Schools Division of Sarangani • Municipality of Malungon</p>
          <h1 className="text-xl font-black uppercase tracking-tight mt-2">
            {masterlistScope === 'PRE_DRAW_ONLY' ? 'OFFICIAL PRE-DRAW WINNERS MASTERLIST' : 'OFFICIAL WINNERS MASTERLIST (ALL BATCHES)'}
          </h1>
          <p className="text-xs uppercase font-mono font-bold mt-0.5">
            Municipal Teachers' Day 2026 Celebration • Raffle Committee Records
          </p>
          <p className="text-[10px] text-neutral-600 font-mono mt-1">
            Generated on: {new Date().toLocaleString()} • Total Records: {activeMasterlistWinners.length}
          </p>
        </div>

        <table className="w-full text-left text-[10px] border border-black border-collapse">
          <thead>
            <tr className="bg-neutral-200 border-b border-black font-bold uppercase font-mono">
              <th className="p-1.5 border border-black">#</th>
              <th className="p-1.5 border border-black">Batch #</th>
              <th className="p-1.5 border border-black">Winner ID</th>
              <th className="p-1.5 border border-black">Profiling ID</th>
              <th className="p-1.5 border border-black">Winner Name</th>
              <th className="p-1.5 border border-black">District</th>
              <th className="p-1.5 border border-black">School / Station</th>
              <th className="p-1.5 border border-black">Position</th>
              <th className="p-1.5 border border-black">Prize Won</th>
              <th className="p-1.5 border border-black min-w-[120px]">Signature / Received</th>
            </tr>
          </thead>
          <tbody>
            {activeMasterlistWinners.map((w, idx) => (
              <tr key={w.winnerId} className="border-b border-neutral-300">
                <td className="p-1.5 border border-black font-mono">{idx + 1}</td>
                <td className="p-1.5 border border-black font-mono font-bold">{w.drawNumber}</td>
                <td className="p-1.5 border border-black font-mono">{w.winnerId}</td>
                <td className="p-1.5 border border-black font-mono font-bold">{w.participantId || 'N/A'}</td>
                <td className="p-1.5 border border-black font-bold uppercase">{w.name}</td>
                <td className="p-1.5 border border-black uppercase">{w.district}</td>
                <td className="p-1.5 border border-black">{w.school}</td>
                <td className="p-1.5 border border-black">{w.position}</td>
                <td className="p-1.5 border border-black font-bold">{w.prizeName}</td>
                <td className="p-1.5 border border-black"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Audit Certification Signatures (2 Signatures: Committee Chair & LGU Representative) */}
        <div className="mt-10 pt-4 border-t border-black grid grid-cols-2 max-w-2xl mx-auto gap-12 text-center text-xs">
          <div>
            <div className="border-b border-black h-10"></div>
            <p className="font-bold uppercase mt-1">Raffle Committee Chair</p>
            <p className="text-[10px] text-neutral-600 uppercase">Secretariat &amp; Records</p>
          </div>
          <div>
            <div className="border-b border-black h-10"></div>
            <p className="font-bold uppercase mt-1">LGU Representative</p>
            <p className="text-[10px] text-neutral-600 uppercase">Municipality of Malungon</p>
          </div>
        </div>
      </div>
    </div>
  );
};
