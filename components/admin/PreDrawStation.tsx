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

const DISTRICTS: District[] = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];

interface PreDrawStationProps {
  prizes: Prize[];
  participants: Participant[];
  winners: Winner[];
  logs: RaffleLog[];
  onConfirmPreDrawBatch: (batch: TemporaryDrawResult) => void;
  allowMultipleWins: boolean;
}

export const PreDrawStation: React.FC<PreDrawStationProps> = ({
  prizes,
  participants,
  winners,
  logs,
  onConfirmPreDrawBatch,
  allowMultipleWins
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

  // Currently selected prize
  const currentPrize = useMemo(() => {
    return prizes.find((p) => p.id === selectedPrizeId) || prizes[0] || null;
  }, [prizes, selectedPrizeId]);

  const availableQty = currentPrize ? currentPrize.remainingQuantity : 0;

  // Filter eligible participants (active, verified eligible, and not already winners if multiple wins disabled)
  const eligiblePool = useMemo(() => {
    return participants.filter((p) => {
      if (p.eligible !== 'ELIGIBLE') return false;
      if (!allowMultipleWins && p.winner === 'YES') return false;
      return true;
    });
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
    availableQty <= 0 ||
    isDistrictPoolInsufficient ||
    isCombinedPoolInsufficient ||
    isQuantityExceeded;

  // Pre-drawn winners recorded
  const preDrawWinners = useMemo(() => {
    return winners.filter((w) => w.drawType === 'PRE_DRAW');
  }, [winners]);

  // Pre-drawn logs
  const preDrawLogs = useMemo(() => {
    return logs.filter((l) => l.drawType === 'PRE_DRAW');
  }, [logs]);

  // Execute RNG batch selection
  const handleExecuteRng = () => {
    if (!currentPrize || availableQty <= 0) return;

    let selectedWinners: Participant[] = [];

    if (distributionMode === 'EQUAL_PER_DISTRICT') {
      const selectedByDistrict: Record<District, Participant[]> = {
        NORTH: [],
        EAST: [],
        WEST: [],
        SOUTH: [],
        PRIVATE: []
      };

      DISTRICTS.forEach((d) => {
        const districtPool = eligiblePool.filter((p) => p.district === d);
        // Unbiased Fisher-Yates shuffle
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
    }

    const nextBatchNum = `PRE-${String(preDrawLogs.length + 1).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const result: TemporaryDrawResult = {
      drawNumber: nextBatchNum,
      prize: currentPrize,
      winners: selectedWinners,
      timestamp,
      eligiblePoolSize: eligiblePool.length,
      distributionMode,
      winnersPerDistrict: distributionMode === 'EQUAL_PER_DISTRICT' ? winnersPerDistrict : undefined,
      drawType: 'PRE_DRAW'
    };

    setProvisionalBatch(result);
    setIsReviewOpen(true);
  };

  // Re-run RNG for current batch
  const handleRedrawCurrentBatch = () => {
    handleExecuteRng();
  };

  // Confirm and persist batch
  const handleConfirmBatch = () => {
    if (!provisionalBatch) return;
    onConfirmPreDrawBatch(provisionalBatch);
    setIsReviewOpen(false);
    setProvisionalBatch(null);

    // Auto-adjust combined count if remaining prize reduced
    const remainingAfter = availableQty - provisionalBatch.winners.length;
    if (remainingAfter > 0) {
      setCombinedWinnersCount((prev) => Math.min(prev, remainingAfter));
    }
  };

  // Filtered pre-draw winners for history table
  const filteredHistory = useMemo(() => {
    if (!searchFilter.trim()) return preDrawWinners;
    const q = searchFilter.toLowerCase();
    return preDrawWinners.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.winnerId.toLowerCase().includes(q) ||
        w.depedId?.toLowerCase().includes(q) ||
        w.school.toLowerCase().includes(q) ||
        w.prizeName.toLowerCase().includes(q) ||
        w.drawNumber.toLowerCase().includes(q)
    );
  }, [preDrawWinners, searchFilter]);

  // Export Pre-Draw CSV
  const exportPreDrawCSV = () => {
    const headers = [
      'Batch #',
      'Winner ID',
      'DepEd ID',
      'Name',
      'District',
      'School',
      'Position',
      'Prize Won',
      'Unit Value',
      'Date & Time',
      'Claim Status'
    ];

    const rows = preDrawWinners.map((w) => [
      w.drawNumber,
      w.winnerId,
      w.depedId || 'N/A',
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
      `deped_malungon_predraw_masterlist_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print-friendly Official Masterlist View
  const handlePrintOfficialMasterlist = () => {
    window.print();
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
                Advance RNG for minor &amp; consolation prizes • COA &amp; Raffle Committee Secretariat
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
              Batch Drawer
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
              Eligible Pool Left
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {eligiblePool.length}
            </span>
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
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm dark:shadow-2xl relative border-t-4 border-t-indigo-600 space-y-6">
            {/* 1. Select Prize */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 mb-2">
                SELECT PRIZE FOR PRE-DRAW:
              </label>
              <select
                value={selectedPrizeId}
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
                {prizes.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={p.remainingQuantity <= 0}
                    className="bg-white dark:bg-neutral-900 text-black dark:text-white py-2"
                  >
                    {p.name} — (Remaining: {p.remainingQuantity} / {p.quantity})
                    {p.unitValue > 0 ? ` • ₱${p.unitValue.toLocaleString()} each` : ''}
                    {p.remainingQuantity <= 0 ? ' [EXHAUSTED]' : ''}
                  </option>
                ))}
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
                      disabled={combinedWinnersCount <= 1}
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
                      disabled={combinedWinnersCount >= availableQty || combinedWinnersCount >= eligiblePool.length}
                      onClick={() => setCombinedWinnersCount(combinedWinnersCount + 1)}
                      className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/15 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">{combinedWinnersCount} WINNERS</span>
                    <span className="text-neutral-500 font-normal">
                      (₱{((currentPrize?.unitValue || 0) * combinedWinnersCount).toLocaleString()})
                    </span>
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
                      disabled={winnersPerDistrict <= 1}
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
                      disabled={winnersPerDistrict >= maxPerDistrict || (winnersPerDistrict + 1) * 5 > availableQty}
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

                {/* District breakdown pill cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                  {DISTRICTS.map((d) => {
                    const count = districtEligibleCounts[d] || 0;
                    const isShort = count < winnersPerDistrict;
                    return (
                      <div
                        key={d}
                        className={`p-2 border text-center ${
                          isShort
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200'
                            : 'border-[#1a1a1a]/20 dark:border-white/10 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500">
                          {d === 'PRIVATE' ? 'PRIVATE' : d}
                        </div>
                        <div className="text-sm font-black font-mono mt-0.5">{count}</div>
                        <div className="text-[8px] text-neutral-400 uppercase font-bold">eligible</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Action Execute Button */}
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
                EXECUTE PRE-DRAW BATCH ({totalWinnersToDraw} {totalWinnersToDraw === 1 ? 'WINNER' : 'WINNERS'})
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
                  OFFICIAL PRE-DRAW WINNERS MASTERLIST
                </h3>
                <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                  Total Pre-Drawn Records: {preDrawWinners.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportPreDrawCSV}
                  disabled={preDrawWinners.length === 0}
                  className="px-3 py-2 bg-[#1a1a1a] hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed border border-[#1a1a1a] dark:border-white/20 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintOfficialMasterlist}
                  disabled={preDrawWinners.length === 0}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Sheet</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pre-draw winner name, ID, school, prize, batch #..."
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
                    <th className="p-3 whitespace-nowrap">DepEd ID</th>
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
                        {preDrawWinners.length === 0
                          ? 'No pre-draw winners recorded yet. Use the Batch Drawer to conduct advance draws.'
                          : 'No matching pre-draw winners found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((w, idx) => (
                      <tr key={w.winnerId} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                        <td className="p-3 font-mono text-neutral-500 text-[11px]">{idx + 1}</td>
                        <td className="p-3 font-mono font-black text-indigo-600 whitespace-nowrap">{w.drawNumber}</td>
                        <td className="p-3 font-mono font-black text-[#FF1E1E] whitespace-nowrap">{w.winnerId}</td>
                        <td className="p-3 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                          {w.depedId || 'N/A'}
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
                  ₱{provisionalBatch.prize.unitValue.toLocaleString()} each
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Batch Value:</span>
                <span className="font-mono font-bold text-indigo-900 dark:text-indigo-200">
                  ₱{(provisionalBatch.prize.unitValue * provisionalBatch.winners.length).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Winners List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-[#1a1a1a]/15 text-[10px] uppercase font-mono font-bold text-neutral-600 dark:text-neutral-400">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">DepEd ID</th>
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
                      <td className="p-2.5 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {w.depedId || w.id}
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
                }}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Discard Batch
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRedrawCurrentBatch}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-indigo-600" />
                  <span>Redraw Batch</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBatch}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all"
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
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999]">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <p className="text-xs uppercase font-serif tracking-widest">Republic of the Philippines</p>
          <p className="text-sm font-bold uppercase font-serif">Department of Education • Region XII</p>
          <p className="text-xs uppercase font-serif">Schools Division of Sarangani • Municipality of Malungon</p>
          <h1 className="text-xl font-black uppercase tracking-tight mt-3">
            OFFICIAL PRE-DRAW WINNERS MASTERLIST
          </h1>
          <p className="text-xs uppercase font-mono font-bold mt-0.5">
            Municipal Teachers' Day 2026 Celebration • Pre-Draw Session
          </p>
          <p className="text-[10px] text-neutral-600 font-mono mt-1">
            Generated on: {new Date().toLocaleString()} • Total Pre-Draw Winners: {preDrawWinners.length}
          </p>
        </div>

        <table className="w-full text-left text-[10px] border border-black border-collapse">
          <thead>
            <tr className="bg-neutral-200 border-b border-black font-bold uppercase font-mono">
              <th className="p-1.5 border border-black">#</th>
              <th className="p-1.5 border border-black">Batch #</th>
              <th className="p-1.5 border border-black">Winner ID</th>
              <th className="p-1.5 border border-black">DepEd ID</th>
              <th className="p-1.5 border border-black">Winner Name</th>
              <th className="p-1.5 border border-black">District</th>
              <th className="p-1.5 border border-black">School / Station</th>
              <th className="p-1.5 border border-black">Position</th>
              <th className="p-1.5 border border-black">Prize Won</th>
              <th className="p-1.5 border border-black min-w-[120px]">Signature / Received</th>
            </tr>
          </thead>
          <tbody>
            {preDrawWinners.map((w, idx) => (
              <tr key={w.winnerId} className="border-b border-neutral-300">
                <td className="p-1.5 border border-black font-mono">{idx + 1}</td>
                <td className="p-1.5 border border-black font-mono font-bold">{w.drawNumber}</td>
                <td className="p-1.5 border border-black font-mono">{w.winnerId}</td>
                <td className="p-1.5 border border-black font-mono">{w.depedId || 'N/A'}</td>
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

        {/* Audit Certification Signatures */}
        <div className="mt-12 pt-6 border-t border-black grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-black h-12"></div>
            <p className="font-bold uppercase mt-1">Raffle Committee Chair</p>
            <p className="text-[10px] text-neutral-600 uppercase">Secretariat &amp; Records</p>
          </div>
          <div>
            <div className="border-b border-black h-12"></div>
            <p className="font-bold uppercase mt-1">LGU Representative</p>
            <p className="text-[10px] text-neutral-600 uppercase">Municipality of Malungon</p>
          </div>
          <div>
            <div className="border-b border-black h-12"></div>
            <p className="font-bold uppercase mt-1">COA / Audit Observer</p>
            <p className="text-[10px] text-neutral-600 uppercase">Commission on Audit</p>
          </div>
        </div>
      </div>
    </div>
  );
};
