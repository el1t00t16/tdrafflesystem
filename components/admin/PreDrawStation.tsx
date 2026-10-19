'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { downloadCsvFile } from '../../lib/utils';
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
  Search,
  UserCheck,
  X,
  Loader2,
  ExternalLink,
  Eye,
  Check,
  LayoutGrid,
  Tv,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SlidersHorizontal
} from 'lucide-react';

const DISTRICT_CONFIG: { id: District; number: string; title: string; isPrivate?: boolean }[] = [
  { id: 'NORTH', number: '01', title: 'North' },
  { id: 'EAST', number: '02', title: 'East' },
  { id: 'WEST', number: '03', title: 'West' },
  { id: 'SOUTH', number: '04', title: 'South' },
  { id: 'PRIVATE', number: '05', title: 'Private (ECCD + Private School + LSB)', isPrivate: true }
];

const DISTRICTS: District[] = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];

// Helper to safely get numeric peso value only for cash prizes (unitValue > 0)
function getPrizeDisplayValue(prize: Prize | null): number {
  if (!prize) return 0;
  return prize.unitValue > 0 ? prize.unitValue : 0;
}

interface PreDrawStationProps {
  prizes: Prize[];
  participants: Participant[];
  winners: Winner[];
  logs: RaffleLog[];
  onConfirmPreDrawBatch: (batch: TemporaryDrawResult) => void;
  onResetNonWinnersEligibility?: () => Promise<{ success: boolean; count: number; winnersKept: number; error?: string }>;
  allowMultipleWins: boolean;
  initialReelDuration?: number;
}

export const PreDrawStation: React.FC<PreDrawStationProps> = ({
  prizes,
  participants,
  winners,
  logs,
  onConfirmPreDrawBatch,
  onResetNonWinnersEligibility,
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
  const [shufflingNames, setShufflingNames] = useState<
    Record<District, { name: string; school: string; topName?: string; bottomName?: string }>
  >({
    NORTH: { name: 'Awaiting pre-draw...', school: '', topName: 'Eligible Candidates', bottomName: 'Ready to Draw' },
    EAST: { name: 'Awaiting pre-draw...', school: '', topName: 'Eligible Candidates', bottomName: 'Ready to Draw' },
    WEST: { name: 'Awaiting pre-draw...', school: '', topName: 'Eligible Candidates', bottomName: 'Ready to Draw' },
    SOUTH: { name: 'Awaiting pre-draw...', school: '', topName: 'Eligible Candidates', bottomName: 'Ready to Draw' },
    PRIVATE: { name: 'Awaiting pre-draw...', school: '', topName: 'Eligible Candidates', bottomName: 'Ready to Draw' }
  });
  const [revealedWinnersByDistrict, setRevealedWinnersByDistrict] = useState<Record<District, Participant[]>>({
    NORTH: [],
    EAST: [],
    WEST: [],
    SOUTH: [],
    PRIVATE: []
  });

  // Windows Snipping Tool (Win + Shift + S) Recording Frame & Live Clock
  const [isRecordFrameMode, setIsRecordFrameMode] = useState<boolean>(true);
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setLiveTimestamp(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // View mode for 5-District Reel: 'grid' (Screenshot #1) or 'carousel' (Projector Full View in Screenshot #2)
  const [displayMode, setDisplayMode] = useState<'grid' | 'carousel'>('grid');
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(true);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);

  // Keep selected prize in sync if prizes inventory loads asynchronously
  useEffect(() => {
    if (prizes.length > 0) {
      if (!selectedPrizeId || !prizes.some((p) => p.id === selectedPrizeId)) {
        const available = prizes.find((p) => p.remainingQuantity > 0);
        setSelectedPrizeId(available ? available.id : prizes[0].id);
      }
    }
  }, [prizes, selectedPrizeId]);

  // Keyboard navigation for Full View Carousel (Arrow Left / Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (displayMode === 'carousel') {
        if (e.key === 'ArrowRight') {
          setCarouselIndex((prev) => (prev + 1) % 5);
        } else if (e.key === 'ArrowLeft') {
          setCarouselIndex((prev) => (prev - 1 + 5) % 5);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMode]);

  // Auto-cycle through districts every 5s when in Carousel / Projector Full View
  useEffect(() => {
    if (displayMode !== 'carousel' || !isAutoCycling || isShuffling) return;

    // Find districts that have winners
    const activeDistrictIndices = DISTRICT_CONFIG.map((d, idx) => ({
      idx,
      hasWinners: (revealedWinnersByDistrict[d.id] || []).length > 0
    }))
      .filter((item) => !hasDrawnRound || item.hasWinners)
      .map((item) => item.idx);

    if (activeDistrictIndices.length <= 1) return;

    const timer = setInterval(() => {
      setCarouselIndex((prev) => {
        const currentPos = activeDistrictIndices.indexOf(prev);
        if (currentPos === -1) return activeDistrictIndices[0];
        const nextPos = (currentPos + 1) % activeDistrictIndices.length;
        return activeDistrictIndices[nextPos];
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [displayMode, isAutoCycling, isShuffling, hasDrawnRound, revealedWinnersByDistrict]);

  // Focus carousel on first active district with winners when round finishes
  useEffect(() => {
    if (hasDrawnRound) {
      const firstActive = DISTRICT_CONFIG.findIndex((d) => (revealedWinnersByDistrict[d.id] || []).length > 0);
      if (firstActive >= 0) {
        setCarouselIndex(firstActive);
      }
    }
  }, [hasDrawnRound, revealedWinnersByDistrict]);

  // Gate attendance transition states
  const [isGatePrepModalOpen, setIsGatePrepModalOpen] = useState(false);
  const [isResettingGate, setIsResettingGate] = useState(false);
  const [gateResetFeedback, setGateResetFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const confirmedWinnersCount = useMemo(() => {
    return participants.filter((p) => p.winner === 'YES').length;
  }, [participants]);

  const nonWinnersCount = useMemo(() => {
    return participants.filter((p) => p.winner !== 'YES').length;
  }, [participants]);

  const handleExecuteGatePrep = async () => {
    if (!onResetNonWinnersEligibility) return;
    setIsResettingGate(true);
    setGateResetFeedback(null);
    try {
      const res = await onResetNonWinnersEligibility();
      if (res.success) {
        soundSynthesizer.playSuccess();
        setGateResetFeedback({
          text: `Success! ${res.winnersKept} winners kept intact. ${res.count} non-winners reset to INELIGIBLE for gate scanning.`
        });
        setTimeout(() => {
          setIsGatePrepModalOpen(false);
          setGateResetFeedback(null);
        }, 2200);
      } else {
        setGateResetFeedback({
          text: `Sync error: ${res.error || 'Failed to reset non-winners'}`,
          error: true
        });
      }
    } catch (err: any) {
      setGateResetFeedback({
        text: `Error: ${err?.message || err}`,
        error: true
      });
    } finally {
      setIsResettingGate(false);
    }
  };

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

  // Filter eligible participants (Pre-Draw advance draws for Minor Prizes include both Teaching & Non-Teaching)
  const eligiblePool = useMemo(() => {
    return participants.filter((p) => isEligibleForDraw(p, allowMultipleWins, currentPrize?.category || 'MINOR'));
  }, [participants, allowMultipleWins, currentPrize?.category]);

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
    setIsControlsCollapsed(true);

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

    // Rolling reel index offsets per district for a continuous mechanical tumbler motion
    const reelOffsets: Record<District, number> = {
      NORTH: Math.floor(Math.random() * 50),
      EAST: Math.floor(Math.random() * 50),
      WEST: Math.floor(Math.random() * 50),
      SOUTH: Math.floor(Math.random() * 50),
      PRIVATE: Math.floor(Math.random() * 50)
    };

    const stepReel = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = durationMs - elapsed;

      setShuffleProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)));

      // When finished: reveal cards and keep winners illuminated on 5 cards for screen recording
      if (remaining <= 0) {
        soundSynthesizer.stopSpinning();
        soundSynthesizer.playCelebrationFanfare();

        setShuffleProgress(100);
        setIsShuffling(false);
        setHasDrawnRound(true);
        setRevealedWinnersByDistrict(selectedByDistrict);
        // Do not auto-open modal: keep 5 cards visible and illuminated for screen recording
        return;
      }

      // Roll 3 names (top, center, bottom) on all 5 district cards
      const nextNames: Record<
        District,
        { name: string; school: string; topName?: string; bottomName?: string }
      > = { ...shufflingNames };

      DISTRICTS.forEach((d) => {
        const pool = participantsByDistrict[d];
        if (pool && pool.length > 0) {
          if (pool.length === 1) {
            const p = pool[0];
            nextNames[d] = {
              name: p.fullName,
              school: p.school,
              topName: p.fullName,
              bottomName: p.fullName
            };
          } else if (pool.length === 2) {
            const idx = Math.floor(Math.random() * 2);
            nextNames[d] = {
              name: pool[idx].fullName,
              school: pool[idx].school,
              topName: pool[1 - idx].fullName,
              bottomName: pool[1 - idx].fullName
            };
          } else {
            const stride = pool.length > 8 ? Math.floor(Math.random() * 3) + 1 : 1;
            reelOffsets[d] = (reelOffsets[d] + stride) % pool.length;
            const curIdx = reelOffsets[d];
            const prevIdx = (curIdx - 1 + pool.length) % pool.length;
            const nextIdx = (curIdx + 1) % pool.length;

            nextNames[d] = {
              name: pool[curIdx].fullName,
              school: pool[curIdx].school,
              topName: pool[prevIdx].fullName,
              bottomName: pool[nextIdx].fullName
            };
          }
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

  // Discard provisional batch
  const handleDiscardBatch = () => {
    setIsReviewOpen(false);
    setProvisionalBatch(null);
    setHasDrawnRound(false);
  };

  // Redraw action from modal or in-frame action bar (re-shuffles 5 cards)
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
        (w.name || '').toLowerCase().includes(q) ||
        (w.winnerId || '').toLowerCase().includes(q) ||
        (w.participantId ? String(w.participantId).toLowerCase().includes(q) : false) ||
        (w.school || '').toLowerCase().includes(q) ||
        (w.prizeName || '').toLowerCase().includes(q) ||
        (w.drawNumber ? String(w.drawNumber).toLowerCase().includes(q) : false)
    );
  }, [activeMasterlistWinners, searchFilter]);

  // Effective list for both CSV Export and Print Sheet (respects search filter if typed)
  const effectiveMasterlistRecords = useMemo(() => {
    return searchFilter.trim() ? filteredHistory : activeMasterlistWinners;
  }, [searchFilter, filteredHistory, activeMasterlistWinners]);

  // Export CSV (clean Blob download with UTF-8 BOM)
  const exportPreDrawCSV = () => {
    if (effectiveMasterlistRecords.length === 0) {
      alert('No winner records available to export.');
      return;
    }

    const headers = [
      'Batch Number',
      'Winner ID',
      'Profiling ID',
      'Winner Name',
      'District',
      'School / Station',
      'Position',
      'Prize Won',
      'Unit Value (PHP)',
      'Date',
      'Time',
      'Claim Status'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = effectiveMasterlistRecords.map((w) => [
      escapeCsv(w.drawNumber),
      escapeCsv(w.winnerId),
      escapeCsv(w.participantId || 'N/A'),
      escapeCsv(w.name),
      escapeCsv(w.district),
      escapeCsv(w.school),
      escapeCsv(w.position),
      escapeCsv(w.prizeName),
      w.unitValue || 0,
      escapeCsv(w.date),
      escapeCsv(w.time),
      escapeCsv(w.claimStatus)
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    downloadCsvFile(
      `deped_malungon_${masterlistScope === 'PRE_DRAW_ONLY' ? 'predraw' : 'all_winners'}_masterlist_${new Date().toISOString().slice(0, 10)}.csv`,
      csvContent
    );
  };

  return (
    <>
      {/* ON-SCREEN DASHBOARD UI (Hidden when printing official sheet) */}
      <div className="space-y-6 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5] print:hidden">
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
            <a
              href="/pre-draw"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Open full-screen Pre-Draw Winners Showcase on LED Wall (/pre-draw)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>LED Wall Showcase</span>
            </a>
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

      {/* POST-PRE-DRAW GATE ATTENDANCE PREPARATION BANNER */}
      {onResetNonWinnersEligibility && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-2 border-indigo-500/70 dark:border-indigo-600/60 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 bg-indigo-600 text-white rounded-xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                FINISHED PRE-DRAWS? PREPARE ROSTER FOR GATE ATTENDANCE
              </h3>
              <span className="font-mono text-[9px] bg-indigo-600 text-white px-2 py-0.5 font-bold uppercase">
                ADMIN WORKFLOW
              </span>
            </div>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 max-w-2xl leading-relaxed font-mono">
              Keeps all <strong>{confirmedWinnersCount} Confirmed Winners</strong> locked (they cannot win on stage). Resets the remaining <strong>{nonWinnersCount} non-winners to INELIGIBLE</strong> so that teachers must physically scan badges at the entrance gate to qualify for the Live Stage!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundSynthesizer.playClick();
              setIsGatePrepModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-amber-300" />
            <span>Prepare Roster for Gate</span>
          </button>
        </div>
      )}

      {activeTab === 'console' && (
        <div
          className={`flex flex-col gap-4 sm:gap-5 items-start transition-all duration-300 ${
            isControlsCollapsed
              ? 'w-full'
              : 'lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr]'
          }`}
        >
          {/* FLOATING RE-OPEN TAB WHEN CONTROLS ARE COLLAPSED */}
          {isControlsCollapsed && (
            <button
              type="button"
              onClick={() => setIsControlsCollapsed(false)}
              className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-black uppercase tracking-wider py-4 px-2 rounded-r-xl shadow-2xl flex flex-col items-center gap-1.5 transition-all hover:pl-3 border-y border-r border-indigo-400 cursor-pointer animate-fade-in group"
              title="Click to show Batch Controls Deck"
            >
              <ChevronRight className="w-4 h-4 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
              <SlidersHorizontal className="w-4 h-4 text-white" />
              <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] tracking-widest uppercase font-bold mt-1">
                CONTROLS
              </span>
            </button>
          )}

          {/* LEFT COLUMN: OPERATOR CONTROL DECK */}
          {!isControlsCollapsed && (
            <div className="w-full bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 sm:p-5 shadow-sm dark:shadow-2xl relative border-t-4 border-t-indigo-600 space-y-4 lg:sticky lg:top-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]/15 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-mono text-xs font-black uppercase tracking-wider text-[#1a1a1a] dark:text-white">
                    BATCH CONTROLS
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded">
                    STUDIO DECK
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsControlsCollapsed(true)}
                    className="p-1 px-1.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer border border-[#1a1a1a]/10 dark:border-white/10"
                    title="Collapse Controls Deck to maximize Full Projector Card screen"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </button>
                </div>
              </div>

            {/* 1. Select Prize */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                1. SELECT PRIZE FOR PRE-DRAW:
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
                className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/20 focus:border-indigo-600 px-3 py-2 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wide outline-none transition-colors"
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
                      className="bg-white dark:bg-neutral-900 text-black dark:text-white py-1.5"
                    >
                      [{p.category || 'MINOR'}] {p.name} — (Remaining: {p.remainingQuantity} / {p.quantity})
                      {val > 0 ? ` • ₱${val.toLocaleString()} ea` : ''}
                      {p.remainingQuantity <= 0 ? ' [EXHAUSTED]' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Quick Prize Metadata Subtext */}
              {currentPrize && (
                <div className="flex items-center justify-between text-[10px] font-mono px-2 py-1 bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400">
                  <span>
                    Stock: <strong className="text-indigo-600 dark:text-indigo-400">{availableQty}</strong> / {currentPrize.quantity}
                  </span>
                  <span>
                    Value: <strong className="text-emerald-600 dark:text-emerald-400">{currentUnitVal > 0 ? `₱${currentUnitVal.toLocaleString()}` : 'Physical Item'}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 2. Distribution Mode */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                2. ALLOCATION MODE:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isShuffling}
                  onClick={() => setDistributionMode('COMBINED_POOL')}
                  className={`px-2.5 py-2 border text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    distributionMode === 'COMBINED_POOL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:text-[#1a1a1a] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Combined</span>
                  </div>
                  <span className="text-[9px] opacity-80 font-normal">Bulk Pool</span>
                </button>

                <button
                  type="button"
                  disabled={isShuffling}
                  onClick={() => setDistributionMode('EQUAL_PER_DISTRICT')}
                  className={`px-2.5 py-2 border text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    distributionMode === 'EQUAL_PER_DISTRICT'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:text-[#1a1a1a] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>5 Quotas</span>
                  </div>
                  <span className="text-[9px] opacity-80 font-normal">Equal Split</span>
                </button>
              </div>
            </div>

            {/* 3. Stepper & Quantity Configuration */}
            {distributionMode === 'COMBINED_POOL' ? (
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                    3. WINNERS IN BATCH:
                  </label>
                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {combinedWinnersCount} Winners
                    {currentUnitVal > 0 && ` (₱${(currentUnitVal * combinedWinnersCount).toLocaleString()})`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-black flex-1">
                    <button
                      type="button"
                      disabled={combinedWinnersCount <= 1 || isShuffling}
                      onClick={() => setCombinedWinnersCount(Math.max(1, combinedWinnersCount - 1))}
                      className="p-2 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-black text-lg text-[#1a1a1a] dark:text-white font-mono">
                      {combinedWinnersCount}
                    </span>
                    <button
                      type="button"
                      disabled={combinedWinnersCount >= availableQty || combinedWinnersCount >= eligiblePool.length || isShuffling}
                      onClick={() => setCombinedWinnersCount(combinedWinnersCount + 1)}
                      className="p-2 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[5, 10, 20, 50].map((preset) => {
                    if (preset > availableQty && preset !== 5) return null;
                    const isCurrent = combinedWinnersCount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isShuffling}
                        onClick={() => setCombinedWinnersCount(preset)}
                        className={`px-2 py-1 border text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:border-indigo-600'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                  {availableQty > 0 && (
                    <button
                      type="button"
                      disabled={isShuffling}
                      onClick={() => setCombinedWinnersCount(availableQty)}
                      className={`px-2 py-1 border text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                        combinedWinnersCount === availableQty
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-neutral-900 text-indigo-600 border-indigo-600/40 hover:bg-indigo-600/10'
                      }`}
                    >
                      All ({availableQty})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                    3. WINNERS PER DISTRICT:
                  </label>
                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {winnersPerDistrict * 5} Total ({winnersPerDistrict} × 5)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-black flex-1">
                    <button
                      type="button"
                      disabled={winnersPerDistrict <= 1 || isShuffling}
                      onClick={() => setWinnersPerDistrict(Math.max(1, winnersPerDistrict - 1))}
                      className="p-2 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex-1 text-center font-black text-lg text-[#1a1a1a] dark:text-white font-mono">
                      {winnersPerDistrict}
                    </span>
                    <button
                      type="button"
                      disabled={winnersPerDistrict >= maxPerDistrict || (winnersPerDistrict + 1) * 5 > availableQty || isShuffling}
                      onClick={() => setWinnersPerDistrict(winnersPerDistrict + 1)}
                      className="p-2 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Presets for Equal per District */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[1, 2, 3, 5, 10].map((preset) => {
                    if (preset * 5 > availableQty && preset !== 1) return null;
                    const isCurrent = winnersPerDistrict === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isShuffling}
                        onClick={() => setWinnersPerDistrict(preset)}
                        className={`px-2 py-1 border text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:border-indigo-600'
                        }`}
                      >
                        {preset}/dist ({preset * 5})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Pre-Draw Reel Animation Duration */}
            <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                    4. REEL DURATION:
                  </label>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {reelDuration}s
                  </span>
                  <span className="text-[9px] text-neutral-500 uppercase font-mono">
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
                className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50 h-1.5"
              />

              <div className="flex flex-wrap items-center gap-1">
                {[
                  { sec: 1, label: '1s Fast' },
                  { sec: 2, label: '2s' },
                  { sec: 3, label: '3s Def' },
                  { sec: 5, label: '5s Stage' },
                  { sec: 10, label: '10s' }
                ].map(({ sec, label }) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={isShuffling}
                    onClick={() => handleReelDurationChange(sec)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                      reelDuration === sec
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
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
              className={`w-full py-3.5 font-black text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isButtonDisabled
                  ? 'bg-neutral-200 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-300 dark:border-white/10 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.01] active:scale-[0.99] shadow-indigo-600/30'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isShuffling
                  ? `SHUFFLING... (${Math.max(0, (reelDuration * (100 - shuffleProgress) / 100)).toFixed(1)}s)`
                  : `EXECUTE PRE-DRAW BATCH (${totalWinnersToDraw} ${totalWinnersToDraw === 1 ? 'WINNER' : 'WINNERS'})`}
              </span>
            </button>
          </div>
        )}

          {/* RIGHT COLUMN: 5-DISTRICT REEL & SCREEN RECORDING STAGE */}
          <div className="w-full min-w-0">
            {(() => {
              const currentCarouselDistrict = DISTRICT_CONFIG[carouselIndex] || DISTRICT_CONFIG[0];
              const carouselWinners = revealedWinnersByDistrict[currentCarouselDistrict.id] || [];

              return (
                <div
                  id="predraw-recording-frame"
                  className="space-y-4 p-3 sm:p-4 rounded-2xl transition-all relative bg-neutral-900/5 dark:bg-black/60 border-2 border-indigo-500/40 dark:border-indigo-400/40 shadow-xl"
                >
                  {/* Official Video Audit Stamp Header Banner */}
                  <div className="bg-[#111827] dark:bg-[#0c0d12] text-white rounded-xl p-3 sm:p-4 border border-neutral-700/80 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-4 ring-emerald-500/20" />
                        <div>
                          <h2 className="font-mono text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                            MUNICIPAL TEACHERS&apos; DAY 2026 • OFFICIAL PRE-DRAW REEL
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-neutral-300 mt-0.5">
                            <span className="text-amber-300 font-bold">
                              BATCH: {provisionalBatch?.drawNumber || `PRE-${String(preDrawLogs.length + 1).padStart(4, '0')}`}
                            </span>
                            {currentPrize && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-300 font-bold uppercase">
                                  [{currentPrize.category || 'MINOR'}]
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto font-mono text-right">
                        {/* Toggle Controls Deck Button */}
                        <button
                          type="button"
                          onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isControlsCollapsed
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-xs'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-white/20'
                          }`}
                          title={isControlsCollapsed ? 'Show Batch Controls Deck' : 'Hide Batch Controls (Maximize Screen)'}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>{isControlsCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
                        </button>

                        {/* View Switcher: 5-Grid View vs Full Projector Card */}
                        <div className="inline-flex border border-white/20 rounded-lg p-0.5 bg-neutral-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDisplayMode('grid')}
                            className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                              displayMode === 'grid'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                            title="5-District Grid Layout (All 5 Districts at Once)"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>5-District Grid</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayMode('carousel')}
                            className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                              displayMode === 'carousel'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                            title="Projector Full Card View (One District at a Time, Full Screen Legibility)"
                          >
                            <Tv className="w-3.5 h-3.5" />
                            <span>Full Projector Card</span>
                          </button>
                        </div>

                        <div className="text-right pl-2 border-l border-white/10 hidden sm:block">
                          <div className="text-[10px] uppercase text-neutral-400 font-bold flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-[#ff6a00]" />
                            <span>PST TIME</span>
                          </div>
                          <div className="text-xs font-black text-amber-300 tracking-wide">
                            {liveTimestamp || 'Philippine Standard Time'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Prize & Batch Meta Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-neutral-800/80 p-2 rounded border border-white/5">
                        <span className="text-[9px] uppercase text-neutral-400 block font-bold">Active Prize</span>
                        <span className="font-bold text-white truncate block text-xs sm:text-sm" title={currentPrize?.name}>
                          {currentPrize?.name || 'No Prize Selected'}
                        </span>
                      </div>
                      <div className="bg-neutral-800/80 p-2 rounded border border-white/5">
                        <span className="text-[9px] uppercase text-neutral-400 block font-bold">Draw Target</span>
                        <span className="font-bold text-amber-400 text-xs sm:text-sm">
                          {totalWinnersToDraw} {totalWinnersToDraw === 1 ? 'Winner' : 'Winners'} {distributionMode === 'EQUAL_PER_DISTRICT' ? '(Quota)' : '(Pool)'}
                        </span>
                      </div>
                      <div className="bg-neutral-800/80 p-2 rounded border border-white/5">
                        <span className="text-[9px] uppercase text-neutral-400 block font-bold">Prize Unit Value</span>
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {currentUnitVal > 0 ? `₱${currentUnitVal.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ea` : 'Physical Item / Gift'}
                        </span>
                        {currentUnitVal > 0 && totalWinnersToDraw > 1 && (
                          <span className="text-[9px] text-amber-300/80 block font-mono">
                            Batch Total: ₱{(currentUnitVal * totalWinnersToDraw).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="bg-neutral-800/80 p-2 rounded border border-white/5">
                        <span className="text-[9px] uppercase text-neutral-400 block font-bold">Reel Status</span>
                        <span className={`font-bold text-xs sm:text-sm uppercase ${
                          isShuffling
                            ? 'text-[#ff6a00] animate-pulse'
                            : hasDrawnRound
                            ? 'text-emerald-400'
                            : 'text-neutral-300'
                        }`}>
                          {isShuffling
                            ? `⚡ Spinning (${Math.max(0, (reelDuration * (100 - shuffleProgress) / 100)).toFixed(1)}s)`
                            : hasDrawnRound
                            ? `🏆 ${provisionalBatch?.winners.length || 0} Winners`
                            : '● Standby'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Reel Progress Bar */}
                  {isShuffling && (
                    <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 overflow-hidden rounded-full shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-[#ff6a00] to-emerald-500 transition-all duration-75"
                        style={{ width: `${shuffleProgress}%` }}
                      />
                    </div>
                  )}

                  {/* VIEW 1: 5-DISTRICT GRID VIEW */}
                  {displayMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
                      {DISTRICT_CONFIG.map(({ id, title, isPrivate }) => {
                        const districtWinners = revealedWinnersByDistrict[id] || [];
                        const hasWinners = hasDrawnRound && districtWinners.length > 0;

                        return (
                          <div
                            key={id}
                            className={`bg-white dark:bg-[#141416] border-2 rounded-2xl p-3.5 transition-all flex flex-col justify-between min-h-[160px] shadow-sm ${
                              isShuffling
                                ? 'border-[#ff6a00] bg-orange-50/80 dark:bg-orange-950/20 ring-4 ring-[#ff6a00]/30 shadow-lg scale-[1.01]'
                                : hasWinners
                                ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/25 shadow-md'
                                : 'border-[#1a1a1a]/20 dark:border-white/10'
                            } ${isPrivate ? 'sm:col-span-2 sm:max-w-md sm:mx-auto w-full' : ''}`}
                          >
                            {/* Card Header with Orange Underline Border */}
                            <div className="text-center pb-2 mb-2 border-b-2 border-[#ff6a00]/30 relative flex items-center justify-between">
                              {/* Expand to Full View Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCarouselIndex(DISTRICT_CONFIG.findIndex((d) => d.id === id));
                                  setDisplayMode('carousel');
                                }}
                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-[#ff6a00] rounded transition-colors cursor-pointer"
                                title={`Open ${title} in Full Projector View`}
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>

                              <h4 className="font-mono text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#ff6a00]">
                                {title}
                              </h4>

                              {hasWinners ? (
                                <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 rounded-full">
                                  {districtWinners.length} 🏆
                                </div>
                              ) : (
                                <div className="w-5" />
                              )}
                            </div>

                            {/* Card Body */}
                            <div className="flex-1 flex flex-col justify-center items-center py-1 text-center min-h-[90px] overflow-hidden">
                              {isShuffling ? (
                                <div className="w-full flex-1 flex flex-col justify-between items-center overflow-hidden min-h-0">
                                  {/* 3-Line Rolling Mechanical Reel Tumbler */}
                                  <div
                                    key={shufflingNames[id]?.name}
                                    className="w-full flex-1 flex flex-col items-center justify-around py-0.5 min-h-0 animate-reel-slide"
                                  >
                                    {/* Top / Incoming Candidate */}
                                    <div className="w-full text-center truncate font-winner font-bold text-xs sm:text-sm md:text-base text-neutral-400 dark:text-neutral-500 opacity-60 uppercase tracking-tight select-none">
                                      {shufflingNames[id]?.topName || '••• DepEd Candidate •••'}
                                    </div>

                                    {/* Center / Active Candidate (High-Contrast Focal Line with Big Legible Text) */}
                                    <div className="w-full text-center px-2 py-1.5 sm:py-2 rounded-lg bg-white dark:bg-[#1a1a1f] border-2 border-[#ff6a00] shadow-md ring-2 ring-[#ff6a00]/30">
                                      <div className="font-winner font-black text-base sm:text-lg md:text-xl lg:text-2xl text-[#111827] dark:text-white uppercase tracking-tight leading-tight truncate">
                                        {shufflingNames[id]?.name || 'DepEd Participant'}
                                      </div>
                                    </div>

                                    {/* Bottom / Outgoing Candidate */}
                                    <div className="w-full text-center truncate font-winner font-bold text-xs sm:text-sm md:text-base text-neutral-400 dark:text-neutral-500 opacity-60 uppercase tracking-tight select-none">
                                      {shufflingNames[id]?.bottomName || '••• DepEd Candidate •••'}
                                    </div>
                                  </div>

                                  <div className="font-mono text-[9px] sm:text-[10px] text-[#ff6a00] font-bold uppercase tracking-widest animate-pulse pt-0.5 shrink-0">
                                    [ SHUFFLING {districtEligibleCounts[id] || 0} CANDIDATES... ]
                                  </div>
                                </div>
                              ) : hasWinners ? (
                                <div className="w-full space-y-2 overflow-y-auto max-h-[190px] pr-1">
                                  {districtWinners.map((w, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1f] border border-emerald-500/50 shadow-xs text-left"
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className="font-mono text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                                          WINNER #{idx + 1}
                                        </span>
                                        <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                                          {w.id}
                                        </span>
                                      </div>
                                      <div className="font-winner font-black text-sm sm:text-base md:text-lg text-[#111827] dark:text-white uppercase tracking-tight leading-tight truncate">
                                        {w.fullName}
                                      </div>
                                      <div className="text-[11px] font-mono text-neutral-600 dark:text-neutral-300 truncate mt-0.5">
                                        {w.school} {w.position ? `• ${w.position}` : ''}
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
                  )}

                  {/* VIEW 2: FULL PROJECTOR CARD VIEW */}
                  {displayMode === 'carousel' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Projector Header Bar */}
                      <div className="bg-[#111827] dark:bg-[#0c0d12] rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                        {/* Left: Status Badge */}
                        <div className="flex items-center gap-2 w-full sm:w-1/4 justify-start">
                          <span className="px-3 py-1 font-mono text-xs font-black uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                            {hasDrawnRound ? '🏆 WINNERS REVEALED' : '⏳ PENDING DRAW'}
                          </span>
                        </div>

                        {/* Center: Large Prize & Allocation Subtext */}
                        <div className="text-center w-full sm:w-2/4">
                          <div className="font-mono text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase">
                            {currentUnitVal > 0 ? `₱ ${currentUnitVal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : currentPrize?.name || 'RAFFLE PRIZE'}
                          </div>
                          <div className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#ff6a00] mt-1">
                            LGU MALUNGON • {distributionMode === 'EQUAL_PER_DISTRICT' ? `${winnersPerDistrict} PER DISTRICT (5 DISTRICTS = ${totalWinnersToDraw} WINNERS)` : `${totalWinnersToDraw} WINNERS TOTAL (COMBINED POOL)`}
                          </div>
                        </div>

                        {/* Right: Quick Action Controls */}
                        <div className="flex items-center gap-2 w-full sm:w-1/4 justify-end">
                          {hasDrawnRound && provisionalBatch && (
                            <button
                              type="button"
                              onClick={() => {
                                soundSynthesizer.playSuccess();
                                handleConfirmBatch();
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase tracking-wider rounded flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                            >
                              <Check className="w-4 h-4" />
                              <span>CONFIRM</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                            className={`px-3 py-2 font-mono text-xs font-bold uppercase rounded border flex items-center gap-1.5 cursor-pointer transition-colors ${
                              isControlsCollapsed
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-xs'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-white/10'
                            }`}
                            title={isControlsCollapsed ? 'Show Batch Controls Deck' : 'Maximize Projector Card (Hide Controls)'}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>{isControlsCollapsed ? 'Show Deck' : 'Maximize'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayMode('grid')}
                            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-mono text-xs font-bold uppercase rounded border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>GRID</span>
                          </button>
                        </div>
                      </div>

                      {/* Massive Projector Stage Card */}
                      <div
                        className={`bg-white dark:bg-[#121418] border-3 sm:border-4 border-emerald-500 rounded-3xl p-5 sm:p-8 lg:p-10 shadow-2xl ring-4 ring-emerald-500/20 flex flex-col justify-between transition-all duration-300 ${
                          isControlsCollapsed
                            ? 'min-h-[440px] sm:min-h-[540px] lg:min-h-[620px]'
                            : 'min-h-[380px] sm:min-h-[460px] lg:min-h-[500px]'
                        }`}
                      >
                        {/* District Header */}
                        <div className="pb-3 mb-3 border-b-2 border-[#ff6a00]/30 flex items-center justify-between gap-2 px-1 sm:px-2 shrink-0 relative">
                          <div className="flex items-center justify-start gap-1.5 sm:gap-2 shrink-0 z-10">
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                            <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] whitespace-nowrap">
                              DISTRICT WINNERS
                            </span>
                          </div>

                          <div className="flex-1 text-center px-2 min-w-0 flex flex-col items-center justify-center">
                            <h3
                              className={`font-mono font-black uppercase tracking-[0.2em] text-[#ff6a00] leading-none truncate max-w-full ${
                                isControlsCollapsed
                                  ? 'text-2xl sm:text-3xl lg:text-4xl'
                                  : 'text-xl sm:text-2xl lg:text-3xl'
                              }`}
                            >
                              {currentCarouselDistrict.id === 'PRIVATE' ? 'PRIVATE' : currentCarouselDistrict.title}
                            </h3>
                            {currentCarouselDistrict.id === 'PRIVATE' && (
                              <span className="font-mono text-[10px] sm:text-xs font-bold text-neutral-500 dark:text-neutral-400 tracking-wider uppercase mt-1 truncate max-w-full">
                                ECCD • Private School • LSB
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end shrink-0 z-10">
                            <div className="font-mono text-xs sm:text-sm font-black text-[#ff6a00] bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700/50 px-3 sm:px-4 py-1 rounded-full whitespace-nowrap shadow-2xs">
                              {carouselWinners.length} {carouselWinners.length === 1 ? 'Winner' : 'Winners'}
                            </div>
                          </div>
                        </div>

                        {/* Winner Names */}
                        <div className="flex-1 flex flex-col justify-center items-center py-4 px-2 overflow-hidden">
                          {isShuffling ? (
                            <div className="text-center w-full animate-fade-in space-y-4">
                              <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#ff6a00] font-bold animate-pulse">
                                ⚡ SHUFFLING {currentCarouselDistrict.title.toUpperCase()} CANDIDATES...
                              </div>
                              <div
                                className={`font-winner font-black text-[#111827] dark:text-white uppercase tracking-tight ${
                                  isControlsCollapsed
                                    ? 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl'
                                    : 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl'
                                }`}
                              >
                                {shufflingNames[currentCarouselDistrict.id]?.name || 'DepEd Participant'}
                              </div>
                              <div className="w-32 h-1 bg-[#ff6a00] mx-auto rounded-full animate-pulse" />
                            </div>
                          ) : carouselWinners.length > 0 ? (
                            <div className={`flex flex-col justify-center items-center w-full ${
                              carouselWinners.length <= 3 ? 'space-y-4 sm:space-y-6' : 'space-y-2 sm:space-y-3'
                            }`}>
                              {carouselWinners.map((w, idx) => (
                                <div key={idx} className="text-center w-full animate-fade-in">
                                  <div
                                    className={`font-winner font-black text-[#111827] dark:text-white uppercase tracking-tight leading-[1.08] drop-shadow-xs ${
                                      carouselWinners.length === 1
                                        ? isControlsCollapsed
                                          ? 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl'
                                          : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl'
                                        : carouselWinners.length <= 3
                                        ? isControlsCollapsed
                                          ? 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl'
                                          : 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl'
                                        : carouselWinners.length <= 5
                                        ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                                        : 'text-lg sm:text-xl md:text-2xl'
                                    }`}
                                  >
                                    {w.fullName}
                                  </div>
                                  <div className="text-[11px] sm:text-xs md:text-sm font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                                    {w.school} {w.position ? `• ${w.position}` : ''} • <span className="font-bold text-indigo-600 dark:text-indigo-400">{w.id}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-10 space-y-2 text-neutral-400 font-mono">
                              <div className="text-base sm:text-xl font-bold uppercase tracking-wider text-neutral-500">
                                No winners recorded yet for {currentCarouselDistrict.title}
                              </div>
                              <div className="text-xs text-neutral-400">
                                Eligible pool: {districtEligibleCounts[currentCarouselDistrict.id] || 0} candidates
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="shrink-0 text-center pt-3 flex flex-col items-center">
                          <div className="w-28 sm:w-44 h-0.5 bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent mb-2 rounded-full" />
                          <span className="font-mono text-[10px] sm:text-xs text-neutral-400 font-bold uppercase tracking-[0.25em]">
                            MALUNGON MUNICIPAL TEACHERS&apos; DAY 2026
                          </span>
                        </div>
                      </div>

                      {/* Carousel Navigation Bar */}
                      <div className="flex flex-col items-center justify-center gap-2 pt-2 font-mono">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setCarouselIndex((prev) => (prev - 1 + 5) % 5)}
                            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                            title="Previous District (Left Arrow)"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {DISTRICT_CONFIG.map((d, idx) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setCarouselIndex(idx)}
                              className={`transition-all duration-300 rounded-full cursor-pointer ${
                                idx === carouselIndex
                                  ? 'w-8 sm:w-10 h-2.5 sm:h-3 bg-[#ff6a00] shadow-md'
                                  : (revealedWinnersByDistrict[d.id] || []).length > 0
                                  ? 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-emerald-400 hover:bg-emerald-500 hover:scale-110'
                                  : 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-neutral-500 hover:bg-neutral-400 hover:scale-110'
                              }`}
                              title={`${d.title} (${(revealedWinnersByDistrict[d.id] || []).length} winners)`}
                            />
                          ))}

                          <button
                            type="button"
                            onClick={() => setCarouselIndex((prev) => (prev + 1) % 5)}
                            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                            title="Next District (Right Arrow)"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsAutoCycling(!isAutoCycling)}
                            className={`p-1.5 rounded-full text-white transition-colors cursor-pointer ${
                              isAutoCycling ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-neutral-700 hover:bg-neutral-600'
                            }`}
                            title={isAutoCycling ? 'Pause Auto-cycling' : 'Resume Auto-cycling'}
                          >
                            {isAutoCycling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="text-[10px] text-neutral-400 tracking-wider uppercase">
                          ‹ › ARROW KEYS TO NAVIGATE • {isAutoCycling ? 'AUTO CYCLING EVERY 5S' : 'AUTO CYCLING PAUSED'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IN-FRAME POST-DRAW ACTION BAR FOR SCREEN RECORDING */}
                  {hasDrawnRound && provisionalBatch && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#111827] dark:bg-[#0c0d12] border-2 border-emerald-500 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in text-white font-mono">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black uppercase text-emerald-400 tracking-wide">
                            REVEAL COMPLETE • {provisionalBatch.winners.length} WINNERS ILLUMINATED
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Recorded in Batch #{provisionalBatch.drawNumber} • Ready for screen recording
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            soundSynthesizer.playClick();
                            handleDiscardBatch();
                          }}
                          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer rounded"
                        >
                          Discard
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundSynthesizer.playClick();
                            handleRedrawFromModal();
                          }}
                          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white text-xs font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer rounded"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Redraw</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundSynthesizer.playClick();
                            setIsReviewOpen(true);
                          }}
                          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white text-xs font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer rounded"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Audit Sheet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundSynthesizer.playSuccess();
                            handleConfirmBatch();
                          }}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer rounded"
                        >
                          <Check className="w-4 h-4 text-white" />
                          <span>Confirm &amp; Award Batch</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
      </div>

      {/* PRINT-ONLY OFFICIAL SHEET LAYOUT (Hidden on screen, rendered on window.print()) */}
      <div className="hidden print:block bg-white text-black p-4 w-full">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter landscape;
                margin: 0.35in;
              }
              html, body, main {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              * {
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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
          <p className="text-xs uppercase font-serif tracking-widest text-black">Republic of the Philippines</p>
          <p className="text-sm font-bold uppercase font-serif text-black">Department of Education • Region XII</p>
          <p className="text-xs uppercase font-serif text-black">Schools Division of Sarangani • Municipality of Malungon</p>
          <h1 className="text-xl font-black uppercase tracking-tight mt-2 text-black">
            {masterlistScope === 'PRE_DRAW_ONLY' ? 'OFFICIAL PRE-DRAW WINNERS MASTERLIST' : 'OFFICIAL WINNERS MASTERLIST (ALL BATCHES)'}
          </h1>
          <p className="text-xs uppercase font-mono font-bold mt-0.5 text-black">
            Municipal Teachers&apos; Day 2026 Celebration • Raffle Committee Records
          </p>
          <p className="text-[10px] text-neutral-600 font-mono mt-1">
            Generated on: {new Date().toLocaleString()} • Total Records: {effectiveMasterlistRecords.length}
            {searchFilter.trim() ? ` • Filtered Search: "${searchFilter}"` : ''}
          </p>
        </div>

        <table className="w-full text-left text-[10px] border border-black border-collapse bg-white text-black">
          <thead>
            <tr className="bg-neutral-200 border-b border-black font-bold uppercase font-mono text-black">
              <th className="p-1.5 border border-black text-black">#</th>
              <th className="p-1.5 border border-black text-black">Batch #</th>
              <th className="p-1.5 border border-black text-black">Winner ID</th>
              <th className="p-1.5 border border-black text-black">Profiling ID</th>
              <th className="p-1.5 border border-black text-black">Winner Name</th>
              <th className="p-1.5 border border-black text-black">District</th>
              <th className="p-1.5 border border-black text-black">School / Station</th>
              <th className="p-1.5 border border-black text-black">Position</th>
              <th className="p-1.5 border border-black text-black">Prize Won</th>
              <th className="p-1.5 border border-black min-w-[120px] text-black">Signature / Received</th>
            </tr>
          </thead>
          <tbody>
            {effectiveMasterlistRecords.map((w, idx) => (
              <tr key={w.winnerId} className="border-b border-neutral-300 text-black">
                <td className="p-1.5 border border-black font-mono text-black">{idx + 1}</td>
                <td className="p-1.5 border border-black font-mono font-bold text-black">{w.drawNumber}</td>
                <td className="p-1.5 border border-black font-mono text-black">{w.winnerId}</td>
                <td className="p-1.5 border border-black font-mono font-bold text-black">{w.participantId || 'N/A'}</td>
                <td className="p-1.5 border border-black font-bold uppercase text-black">{w.name}</td>
                <td className="p-1.5 border border-black uppercase text-black">{w.district}</td>
                <td className="p-1.5 border border-black text-black">{w.school}</td>
                <td className="p-1.5 border border-black text-black">{w.position}</td>
                <td className="p-1.5 border border-black font-bold text-black">{w.prizeName}</td>
                <td className="p-1.5 border border-black"></td>
              </tr>
            ))}
            {effectiveMasterlistRecords.length === 0 && (
              <tr>
                <td colSpan={10} className="p-4 text-center text-xs font-mono text-neutral-500">
                  No records found matching the current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Audit Certification Signatures (2 Signatures: Committee Chair & LGU Representative) */}
        <div className="mt-10 pt-4 border-t border-black grid grid-cols-2 max-w-2xl mx-auto gap-12 text-center text-xs text-black">
          <div>
            <div className="border-b border-black h-10"></div>
            <p className="font-bold uppercase mt-1 text-black">Raffle Committee Chair</p>
            <p className="text-[10px] text-neutral-600 uppercase">Secretariat &amp; Records</p>
          </div>
          <div>
            <div className="border-b border-black h-10"></div>
            <p className="font-bold uppercase mt-1 text-black">LGU Representative</p>
            <p className="text-[10px] text-neutral-600 uppercase">Municipality of Malungon</p>
          </div>
        </div>
      </div>

      {/* MODAL: Prepare for Gate Attendance Confirmation */}
      {isGatePrepModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="bg-white dark:bg-neutral-900 border-2 border-indigo-600 w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <h3 className="font-mono font-black text-sm uppercase tracking-wider">
                  Prepare Roster for Gate Attendance
                </h3>
              </div>
              <button
                type="button"
                disabled={isResettingGate}
                onClick={() => setIsGatePrepModalOpen(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                This prepares your database for entrance gate opening. It ensures that <strong>only teachers who physically arrive and scan their badge at the gate</strong> can win Grand Prizes on the Live Stage!
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xs flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-emerald-950 dark:text-emerald-200 uppercase">
                      {confirmedWinnersCount} Confirmed Winners Stay Protected
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-normal">
                      All winners keep their prize records, claim slips, and audit logs. They can still scan in at the gate for meal/attendance turnout, but are <strong>100% blocked from winning again on stage</strong>.
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 p-3 rounded-xs flex items-start gap-3">
                  <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-950 dark:text-indigo-200 uppercase">
                      {nonWinnersCount} Non-Winners Reset to INELIGIBLE
                    </div>
                    <div className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5 leading-normal">
                      Only becomes eligible once their QR code is scanned at the entrance gate scanner. Absent teachers will not be able to win on stage!
                    </div>
                  </div>
                </div>
              </div>

              {gateResetFeedback && (
                <div className={`p-3 border font-bold text-xs flex items-center gap-2 ${
                  gateResetFeedback.error
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}>
                  {gateResetFeedback.error ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{gateResetFeedback.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-white/10">
                <button
                  type="button"
                  disabled={isResettingGate}
                  onClick={() => setIsGatePrepModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResettingGate}
                  onClick={handleExecuteGatePrep}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold uppercase flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  {isResettingGate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Syncing Roster...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Reset Non-Winners for Gate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
