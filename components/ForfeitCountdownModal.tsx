'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Winner } from '../lib/types';
import {
  AlertTriangle,
  Clock,
  Play,
  Pause,
  X,
  Search,
  Gift,
  Users,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { soundSynthesizer } from '../lib/sound';

interface ForfeitCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  winners: Winner[];
  onConfirmForfeitBatch: (winnerIds: string[], reason: string) => Promise<void> | void;
  soundEnabled?: boolean;
}

export const ForfeitCountdownModal: React.FC<ForfeitCountdownModalProps> = ({
  isOpen,
  onClose,
  winners,
  onConfirmForfeitBatch,
  soundEnabled = true
}) => {
  // Phase: 'CONFIG' (operator selects items & duration) | 'COUNTDOWN' (live stage timer) | 'RESOLVED' (forfeited)
  const [phase, setPhase] = useState<'CONFIG' | 'COUNTDOWN' | 'RESOLVED'>('CONFIG');

  // Filter only UNCLAIMED winners
  const unclaimedWinners = useMemo(() => {
    return winners.filter((w) => w.claimStatus === 'UNCLAIMED');
  }, [winners]);

  // Selected winner IDs for forfeiture
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(10);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(10);
  const [isPaused, setIsPaused] = useState(false);
  const [forfeitReason, setForfeitReason] = useState('Unclaimed by deadline / Absent on stage');
  const [forfeitedSummary, setForfeitedSummary] = useState<{ prizeName: string; count: number }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Group unclaimed winners by Prize Name
  const groupedByPrize = useMemo(() => {
    const map = new Map<string, { prizeName: string; prizeId?: string; winners: Winner[] }>();
    unclaimedWinners.forEach((w) => {
      const key = w.prizeName || 'Unassigned Prize';
      const entry = map.get(key) || { prizeName: key, prizeId: w.prizeId, winners: [] };
      entry.winners.push(w);
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.winners.length - a.winners.length);
  }, [unclaimedWinners]);

  // Filtered unclaimed list by search query
  const filteredWinners = useMemo(() => {
    if (!searchQuery.trim()) return unclaimedWinners;
    const q = searchQuery.toLowerCase();
    return unclaimedWinners.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.winnerId.toLowerCase().includes(q) ||
        (w.prizeName || '').toLowerCase().includes(q) ||
        w.district.toLowerCase().includes(q) ||
        (w.school || '').toLowerCase().includes(q)
    );
  }, [unclaimedWinners, searchQuery]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('CONFIG');
      setSelectedWinnerIds([]);
      setSearchQuery('');
      setCountdownSeconds(10);
      setRemainingSeconds(10);
      setIsPaused(false);
      setForfeitReason('Unclaimed by deadline / Absent on stage');
    }
  }, [isOpen]);

  // Toggle selection for a single winner
  const toggleSelectWinner = (winnerId: string) => {
    setSelectedWinnerIds((prev) =>
      prev.includes(winnerId) ? prev.filter((id) => id !== winnerId) : [...prev, winnerId]
    );
  };

  // Toggle selection for all winners of a prize
  const toggleSelectPrizeGroup = (prizeWinners: Winner[]) => {
    const prizeIds = prizeWinners.map((w) => w.winnerId);
    const allSelected = prizeIds.every((id) => selectedWinnerIds.includes(id));
    if (allSelected) {
      setSelectedWinnerIds((prev) => prev.filter((id) => !prizeIds.includes(id)));
    } else {
      setSelectedWinnerIds((prev) => Array.from(new Set([...prev, ...prizeIds])));
    }
  };

  // Select all or deselect all
  const handleSelectAll = () => {
    if (selectedWinnerIds.length === unclaimedWinners.length) {
      setSelectedWinnerIds([]);
    } else {
      setSelectedWinnerIds(unclaimedWinners.map((w) => w.winnerId));
    }
  };

  // Items currently selected summary
  const selectedPrizesSummary = useMemo(() => {
    const map = new Map<string, number>();
    const selectedSet = new Set(selectedWinnerIds);
    unclaimedWinners.forEach((w) => {
      if (selectedSet.has(w.winnerId)) {
        const name = w.prizeName || 'Prize';
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([prizeName, count]) => ({ prizeName, count }));
  }, [selectedWinnerIds, unclaimedWinners]);

  // Launch the live countdown
  const handleLaunchCountdown = () => {
    if (selectedWinnerIds.length === 0) return;
    setForfeitedSummary(selectedPrizesSummary);
    setRemainingSeconds(countdownSeconds);
    setIsPaused(false);
    setPhase('COUNTDOWN');
    if (soundEnabled) {
      soundSynthesizer.playWarning();
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (phase !== 'COUNTDOWN' || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleExecuteForfeiture();
          return 0;
        }

        const next = prev - 1;
        if (soundEnabled) {
          if (next <= 3) {
            soundSynthesizer.playCountdown(next);
          } else {
            soundSynthesizer.playCountdownTick();
          }
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isPaused, soundEnabled]);

  // Execute forfeiture when countdown finishes or skipped
  const handleExecuteForfeiture = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (soundEnabled) {
      soundSynthesizer.playWarning();
    }
    setPhase('RESOLVED');
    try {
      await onConfirmForfeitBatch(selectedWinnerIds, forfeitReason);
    } catch (err) {
      console.error('Error confirming batch forfeit:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fade-in font-sans">
      {/* Container */}
      <div
        className={`w-full max-w-4xl bg-[#121215] border-2 border-[#1a1a1a] shadow-2xl overflow-hidden transition-all duration-300 ${
          phase === 'COUNTDOWN' ? 'border-red-600 shadow-red-950/40 ring-4 ring-red-500/20' : 'border-amber-500/30'
        }`}
      >
        {/* ============================================================== */}
        {/* PHASE 1: CONFIGURATION & SELECTION                            */}
        {/* ============================================================== */}
        {phase === 'CONFIG' && (
          <div className="flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="bg-[#1a1a1f] border-b border-white/10 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                    Stage Final Call &amp; Forfeit Manager
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Audience Countdown for Unclaimed Items • Prizes will <span className="text-amber-400 font-bold">NOT</span> auto-replenish
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Notice Banner */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-3 text-xs text-amber-200/90 font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                    Physical Inventory Protection Enabled
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-300">
                    When you forfeit tickets here, the winners are marked <strong>FORFEITED</strong> to close their claim.
                    The raffle prize pool is <strong>intentionally kept unchanged</strong> so you can safely audit physical table boxes before any redraw.
                  </p>
                </div>
              </div>

              {/* Unclaimed Summary Chips (Grouped by Prize) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs uppercase font-bold text-neutral-400">
                    Unclaimed Items by Prize ({unclaimedWinners.length} total pending)
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="font-mono text-[11px] text-[#ff6a00] hover:underline font-bold uppercase"
                  >
                    {selectedWinnerIds.length === unclaimedWinners.length ? 'Deselect All' : 'Select All Unclaimed'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {groupedByPrize.length === 0 ? (
                    <div className="w-full text-center py-6 text-neutral-500 font-mono text-xs uppercase">
                      No unclaimed prizes at this time. All prizes are claimed or already forfeited!
                    </div>
                  ) : (
                    groupedByPrize.map((group) => {
                      const prizeWinnerIds = group.winners.map((w) => w.winnerId);
                      const isFullySelected = prizeWinnerIds.every((id) => selectedWinnerIds.includes(id));
                      const isPartiallySelected =
                        !isFullySelected && prizeWinnerIds.some((id) => selectedWinnerIds.includes(id));

                      return (
                        <button
                          key={group.prizeName}
                          type="button"
                          onClick={() => toggleSelectPrizeGroup(group.winners)}
                          className={`px-3 py-2 border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            isFullySelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                              : isPartiallySelected
                              ? 'bg-amber-950/30 border-amber-600/60 text-amber-400'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:border-white/30'
                          }`}
                        >
                          <span className="w-5 h-5 flex items-center justify-center bg-black/40 text-amber-400 rounded-xs text-[10px] font-black">
                            {group.winners.length}
                          </span>
                          <span>{group.prizeName}</span>
                          {isFullySelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400 ml-1" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-neutral-500 ml-1" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selection Table / List */}
              {unclaimedWinners.length > 0 && (
                <div className="border border-white/10 bg-black/30 overflow-hidden">
                  <div className="p-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search winner name, ticket ID, or prize..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-black/50 border border-white/10 text-xs text-white placeholder-neutral-500 font-mono outline-none focus:border-amber-400"
                      />
                    </div>
                    <span className="font-mono text-xs text-neutral-400">
                      Selected: <strong className="text-amber-400">{selectedWinnerIds.length}</strong> / {unclaimedWinners.length}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                    {filteredWinners.map((w) => {
                      const isSelected = selectedWinnerIds.includes(w.winnerId);
                      return (
                        <div
                          key={w.winnerId}
                          onClick={() => toggleSelectWinner(w.winnerId)}
                          className={`p-2.5 flex items-center justify-between gap-3 text-xs font-mono cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="font-bold text-neutral-400 text-[11px]">{w.winnerId}</span>
                            <span className="font-black text-white uppercase truncate">{w.name}</span>
                            <span className="text-[10px] text-neutral-400 hidden sm:inline">
                              {w.district} • {w.school || 'School'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] text-amber-300 font-bold uppercase truncate max-w-[180px]">
                              {w.prizeName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Countdown Duration & Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-mono text-xs uppercase font-bold text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Audience Countdown Duration</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[5, 10, 15, 20, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setCountdownSeconds(sec);
                          setRemainingSeconds(sec);
                        }}
                        className={`px-3 py-1.5 font-mono text-xs font-bold uppercase border transition-all ${
                          countdownSeconds === sec
                            ? 'bg-[#ff1e1e] text-white border-red-500 shadow-sm'
                            : 'bg-white/5 text-neutral-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase font-bold text-neutral-400 mb-1.5">
                    Forfeiture Reason (Recorded in Audit Log)
                  </label>
                  <input
                    type="text"
                    value={forfeitReason}
                    onChange={(e) => setForfeitReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-400"
                    placeholder="Reason for forfeit..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#1a1a1f] border-t border-white/10 px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs font-mono text-neutral-400">
                {selectedWinnerIds.length > 0 ? (
                  <span>
                    Ready to announce:{' '}
                    <strong className="text-white">
                      {selectedPrizesSummary.map((p) => `${p.count}x ${p.prizeName}`).join(', ')}
                    </strong>
                  </span>
                ) : (
                  <span>Please select at least one unclaimed item to begin.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-white/20 hover:bg-white/10 text-neutral-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCountdown}
                  disabled={selectedWinnerIds.length === 0}
                  className="px-5 py-2.5 bg-[#FF1E1E] hover:bg-[#ff3838] disabled:opacity-30 disabled:hover:bg-[#FF1E1E] text-white font-mono text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Stage Countdown ({selectedWinnerIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PHASE 2: DRAMATIC AUDIENCE COUNTDOWN VIEW                      */}
        {/* ============================================================== */}
        {phase === 'COUNTDOWN' && (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden bg-gradient-to-b from-[#180a0a] via-[#121215] to-[#0d0d0f] animate-fade-in">
            {/* Pulsing Top Banner */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-red-600/20 border border-red-500/40 text-red-400 font-mono text-xs uppercase font-black tracking-widest animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>OFFICIAL FINAL CALL • UNCLAIMED PRIZES</span>
              <AlertTriangle className="w-4 h-4" />
            </div>

            {/* Instruction Headline */}
            <div className="space-y-1">
              <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight">
                LAST CHANCE TO CLAIM PRIZE
              </h1>
              <p className="font-mono text-xs sm:text-sm text-neutral-400">
                Ticket holders must present themselves to the stage immediately!
              </p>
            </div>

            {/* Items on Notice Grid */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-2xl">
              {forfeitedSummary.map((item) => (
                <div
                  key={item.prizeName}
                  className="px-4 py-2.5 bg-neutral-900/90 border-2 border-red-500/50 flex items-center gap-2.5 shadow-lg shadow-red-950/30"
                >
                  <span className="w-7 h-7 bg-red-600 text-white font-mono text-sm font-black flex items-center justify-center">
                    {item.count}x
                  </span>
                  <span className="font-display text-sm sm:text-base font-black uppercase text-white tracking-wide">
                    {item.prizeName}
                  </span>
                </div>
              ))}
            </div>

            {/* Giant Central Countdown Number */}
            <div className="relative py-2 sm:py-4">
              <div
                className={`font-mono text-7xl sm:text-9xl lg:text-[11rem] font-black tracking-tighter leading-none transition-all drop-shadow-[0_0_35px_rgba(255,30,30,0.5)] ${
                  remainingSeconds <= 3
                    ? 'text-red-500 scale-110 animate-ping duration-700'
                    : remainingSeconds <= 5
                    ? 'text-amber-400'
                    : 'text-white'
                }`}
              >
                {String(remainingSeconds).padStart(2, '0')}
              </div>
              <div className="text-neutral-400 font-mono text-xs uppercase tracking-widest font-bold mt-1">
                SECONDS REMAINING
              </div>
            </div>

            {/* Emergency Controls for Operator */}
            <div className="w-full pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setPhase('CONFIG');
                }}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase transition-colors"
              >
                ← Back / Abort
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  className={`px-4 py-2 border font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                    isPaused
                      ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Resume Timer' : 'Emergency Pause'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteForfeiture}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-mono text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Skip to Forfeit Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PHASE 3: RESOLVED / FORFEITED STAMP                            */}
        {/* ============================================================== */}
        {phase === 'RESOLVED' && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 bg-[#121215] animate-fade-in">
            {/* Stamp Banner */}
            <div className="p-4 border-4 border-red-600 bg-red-950/30 text-red-500 font-black text-2xl sm:text-4xl uppercase tracking-widest font-display shadow-2xl rotate-[-2deg] animate-bounce">
              🚫 OFFICIALLY FORFEITED
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg sm:text-xl font-bold uppercase text-white font-display">
                {selectedWinnerIds.length} Unclaimed Ticket{selectedWinnerIds.length > 1 ? 's' : ''} Forfeited
              </h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                The winners have been marked as <strong>FORFEITED</strong> in the official records.
              </p>
            </div>

            {/* List of items that were forfeited */}
            <div className="bg-black/40 border border-white/10 p-3.5 max-w-lg w-full text-left space-y-2">
              <div className="text-[11px] font-mono uppercase font-bold text-neutral-400">
                Forfeited Items Summary:
              </div>
              <div className="flex flex-wrap gap-2">
                {forfeitedSummary.map((item) => (
                  <span
                    key={item.prizeName}
                    className="px-2.5 py-1 bg-red-950/50 border border-red-500/30 text-red-300 font-mono text-xs font-bold uppercase"
                  >
                    {item.count}x {item.prizeName}
                  </span>
                ))}
              </div>

              <div className="pt-2 text-[11px] font-mono text-amber-300 border-t border-white/10 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Reminder:</strong> Prize inventory was <strong>NOT</strong> auto-replenished. Please verify your physical boxes before setting up replacement redraws.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Done &amp; Return to Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
