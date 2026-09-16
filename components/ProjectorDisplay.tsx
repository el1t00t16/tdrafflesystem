'use client';

import React, { useState, useEffect } from 'react';
import { District, DistributionMode, Participant, Prize } from '../lib/types';
import { Trophy, Minus, Plus, CheckCircle, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

interface ProjectorDisplayProps {
  selectedPrize: Prize | null;
  prizes?: Prize[];
  selectedPrizeId?: string;
  onSelectPrize?: (prizeId: string) => void;
  isDrawing: boolean;
  shufflingNames: Record<District, { name: string; school: string }>;
  revealedWinners: Participant[];
  countdown: number | null;
  onOpenDrawPreview: () => void;
  drawStatus: 'IDLE' | 'DRAWING' | 'REVEALED';
  distributionMode: DistributionMode;
  winnersPerDistrict: number;
  combinedWinnersCount: number;
  onDistributionModeChange?: (mode: DistributionMode) => void;
  onWinnersPerDistrictChange?: (count: number) => void;
  onCombinedWinnersCountChange?: (count: number) => void;
  hasPendingReview?: boolean;
  onConfirmWinners?: () => void;
  onRedraw?: () => void;
  candidatePoolByDistrict?: Record<District, string[]>;
  targetDistrict?: District | 'ALL';
  onTargetDistrictChange?: (district: District | 'ALL') => void;
  isFullStage?: boolean;
  onToggleFullStage?: (fullStage: boolean) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const DISTRICT_CONFIG: { id: District; number: string; title: string; isPrivate?: boolean }[] = [
  { id: 'NORTH', number: '01', title: 'North' },
  { id: 'EAST', number: '02', title: 'East' },
  { id: 'WEST', number: '03', title: 'West' },
  { id: 'SOUTH', number: '04', title: 'South' },
  { id: 'PRIVATE', number: '05', title: 'Private (ECCD + Private School + LSB)', isPrivate: true }
];

export const ProjectorDisplay: React.FC<ProjectorDisplayProps> = ({
  selectedPrize,
  prizes,
  selectedPrizeId,
  onSelectPrize,
  isDrawing,
  shufflingNames,
  candidatePoolByDistrict,
  revealedWinners,
  countdown,
  onOpenDrawPreview,
  drawStatus,
  distributionMode,
  winnersPerDistrict,
  combinedWinnersCount,
  onDistributionModeChange,
  onWinnersPerDistrictChange,
  onCombinedWinnersCountChange,
  targetDistrict = 'ALL',
  onTargetDistrictChange,
  hasPendingReview,
  onConfirmWinners,
  onRedraw,
  isFullStage,
  onToggleFullStage,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen
}) => {
  const [internalFullStage, setInternalFullStage] = useState(false);
  const fullStageActive = isFullStage !== undefined ? isFullStage : internalFullStage;

  const setFullStage = (active: boolean) => {
    if (onToggleFullStage) {
      onToggleFullStage(active);
    }
    setInternalFullStage(active);
  };

  // Automatically collapse controls and hide header when a draw starts
  useEffect(() => {
    if (isDrawing) {
      setFullStage(true);
    }
  }, [isDrawing]);

  // Keyboard shortcut: Esc to exit full stage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullStageActive) {
        setFullStage(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullStageActive]);

  // Group revealed winners by district
  const winnersByDistrict: Record<District, Participant[]> = {
    NORTH: [],
    EAST: [],
    WEST: [],
    SOUTH: [],
    PRIVATE: []
  };

  if (drawStatus === 'REVEALED') {
    revealedWinners.forEach((w) => {
      if (winnersByDistrict[w.district]) {
        winnersByDistrict[w.district].push(w);
      }
    });
  }

  const totalWinnersToDraw =
    distributionMode === 'EQUAL_PER_DISTRICT'
      ? winnersPerDistrict * 5
      : combinedWinnersCount;
  const singleWinnerShufflingName =
    targetDistrict && targetDistrict !== 'ALL'
      ? shufflingNames[targetDistrict]?.name || 'DepEd Participant'
      : Object.values(shufflingNames).find((n) => n.name !== 'Awaiting draw...')?.name || 'DepEd Participant';

  const getHeroNameFontSize = (name: string) => {
    const len = name.length;
    if (len <= 14) return 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl 2xl:text-[9.5rem] tracking-tight';
    if (len <= 22) return 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl 2xl:text-[7rem] tracking-tight';
    return 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl 2xl:text-[5.5rem] tracking-tight';
  };
  const availableQty = selectedPrize ? selectedPrize.remainingQuantity : 0;
  const maxPerDistrict = Math.floor(availableQty / 5);

  const isButtonDisabled =
    isDrawing ||
    !selectedPrize ||
    selectedPrize.remainingQuantity <= 0 ||
    totalWinnersToDraw <= 0 ||
    totalWinnersToDraw > availableQty;

  return (
    <div className={`flex-1 flex flex-col relative ${fullStageActive ? 'h-screen overflow-hidden' : ''}`}>
      {/* Cinematic Stage Top Bar when in Full Stage Mode */}
      {fullStageActive && (
        <div className="bg-[var(--header-bg)] text-[var(--ink)] px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 border-b-2 border-[var(--border)] shadow-md animate-fade-in select-none relative min-h-[72px] sm:min-h-[82px] shrink-0">
          {/* Left: Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-mono text-xs sm:text-sm uppercase px-2.5 sm:px-3 py-1 text-white font-black tracking-wider shadow-xs rounded-xs ${
                isDrawing
                  ? 'bg-[var(--accent)] text-black animate-pulse'
                  : hasPendingReview
                  ? 'bg-amber-600 animate-pulse'
                  : drawStatus === 'REVEALED'
                  ? 'bg-emerald-600'
                  : 'bg-neutral-800'
              }`}
            >
              {isDrawing
                ? '⚡ LIVE DRAW'
                : hasPendingReview
                ? '⏳ PENDING'
                : drawStatus === 'REVEALED'
                ? '🏆 WINNERS CONFIRMED'
                : 'READY TO DRAW'}
            </span>
          </div>

          {/* Center: The Name of the Prize Being Drawn (Flex-1, Naturally Centered, Never Collides With Buttons) */}
          <div className="flex-1 text-center px-2 sm:px-4 min-w-0">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-[var(--ink)] leading-tight drop-shadow-md truncate">
              {selectedPrize ? (
                selectedPrize.unitValue > 0
                  ? `₱${selectedPrize.unitValue.toLocaleString()} — ${selectedPrize.name}`
                  : selectedPrize.name
              ) : (
                'GRAND RAFFLE DRAW'
              )}
            </div>
            <div className="font-mono text-[10px] sm:text-xs lg:text-sm text-[var(--accent)] font-bold uppercase tracking-wider mt-0.5 truncate">
              {selectedPrize?.description && (
                <span>{selectedPrize.description} • </span>
              )}
              {distributionMode === 'EQUAL_PER_DISTRICT'
                ? `${winnersPerDistrict} PER DISTRICT (5 DISTRICTS = ${totalWinnersToDraw} WINNERS)`
                : targetDistrict && targetDistrict !== 'ALL'
                ? `${totalWinnersToDraw} WINNER${totalWinnersToDraw > 1 ? 'S' : ''} • ${targetDistrict} DISTRICT EXCLUSIVE REDRAW`
                : `${totalWinnersToDraw} WINNER${totalWinnersToDraw > 1 ? 'S' : ''} (COMBINED POOL — ALL DISTRICTS)`}
            </div>
          </div>

          {/* Right: Actions & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {hasPendingReview && onConfirmWinners && (
              <>
                {onRedraw && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Discard these drawn winners and redraw this round?')) {
                        onRedraw();
                      }
                    }}
                    className="px-2.5 sm:px-3 py-1.5 bg-neutral-800 hover:bg-red-950/80 text-neutral-300 hover:text-red-300 border border-white/20 hover:border-red-500/50 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 rounded-xs"
                    title="Discard temporary winners and redraw"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redraw</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onConfirmWinners}
                  className="px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 active:scale-95 animate-pulse rounded-xs"
                  title="Confirm winners and record permanently"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Winners</span>
                </button>
              </>
            )}

            {/* Quick Audio & Fullscreen shortcuts */}
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-1.5 border font-mono text-xs transition-colors rounded-xs ${
                  soundEnabled
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--badge-bg)]'
                    : 'border-white/20 text-white/50 hover:text-white'
                }`}
                title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
                aria-label="Toggle Sound"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 border border-white/20 hover:border-white text-white/70 hover:text-white font-mono text-xs transition-colors rounded-xs"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={() => setFullStage(false)}
              className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white text-white hover:text-black font-mono text-xs font-bold uppercase tracking-wider border border-white/20 transition-all flex items-center gap-1.5 shadow-xs rounded-md"
              title="Show navigation bar and controls sidebar (Esc)"
            >
              <span>⚙️ Controls / Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Grid (Full-width 100% stage, zero horizontal margins) */}
      <div
        className={`w-full flex-1 theme-bg-gradient flex flex-col ${
          fullStageActive
            ? 'h-[calc(100vh-72px)] sm:h-[calc(100vh-82px)] overflow-hidden'
            : 'min-h-[calc(100vh-140px)] lg:grid lg:grid-cols-[1.1fr_2fr]'
        }`}
      >
        {/* Editorial Sidebar - Compact & Cohesive (Zero Dead Space) */}
        {!fullStageActive && (
          <aside className="sidebar p-4 sm:p-5 lg:p-6 lg:border-r-2 lg:border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] flex flex-col gap-4 animate-fade-in overflow-y-auto">
            {/* Top Status & Full Stage Toggle */}
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
              <div
                className="header-meta font-mono text-xs uppercase tracking-wider font-bold"
                style={{ color: 'var(--accent)' }}
              >
                {isDrawing
                  ? '[ Status: Drawing in Progress... ]'
                  : drawStatus === 'REVEALED'
                  ? '[ Status: Winners Announced ]'
                  : '[ Status: Ready ]'}
              </div>
              <button
                type="button"
                onClick={() => setFullStage(true)}
                className="font-mono text-[11px] font-bold uppercase text-[var(--ink-muted)] hover:text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)] px-2.5 py-1 transition-colors flex items-center gap-1.5 rounded-sm"
                title="Hide navigation and sidebar for clean full screen stage (or press Esc to exit)"
              >
                <span>Full Stage</span>
                <span>⛶</span>
              </button>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-[var(--ink)] tracking-tight leading-none">
              Grand Raffle Draw
            </h2>

            {/* Active Prize Selection Card */}
            <div className="bg-[var(--surface-card)] border-2 border-[var(--border)] p-3.5 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-bold">
                  Active Raffle Prize
                </span>
                {prizes && prizes.length > 1 && onSelectPrize && (
                  <span className="font-mono text-[9px] uppercase font-bold text-[var(--accent)] bg-[var(--badge-bg)] border border-[var(--border-accent)] px-2 py-0.5 rounded-xs">
                    Select Below
                  </span>
                )}
              </div>

              {/* Quick Prize Selector Dropdown */}
              {prizes && prizes.length > 0 && onSelectPrize && (
                <select
                  id="projector-prize-select"
                  value={selectedPrizeId || selectedPrize?.id || ''}
                  onChange={(e) => onSelectPrize(e.target.value)}
                  disabled={isDrawing}
                  aria-label="Select Prize to Draw"
                  className="w-full bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border-2 border-[var(--border)] focus:border-[var(--accent)] p-2 text-xs font-mono font-bold uppercase tracking-wide text-[var(--ink)] outline-none transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {prizes.map((p) => {
                    const isExhausted = p.remainingQuantity <= 0;
                    const label = p.unitValue > 0
                      ? `${p.name} (₱${p.unitValue.toLocaleString()}) — ${p.remainingQuantity} Left`
                      : `${p.name}${p.description ? ` [${p.description}]` : ''} — ${p.remainingQuantity} Left`;
                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={isExhausted}
                        className="bg-[var(--surface)] text-[var(--ink)] py-1 font-bold"
                      >
                        {isExhausted ? `[DRAWN] ${label}` : label}
                      </option>
                    );
                  })}
                </select>
              )}

              <div className="pt-0.5">
                <div className="font-display text-2xl sm:text-3xl font-black leading-tight text-[var(--ink)] tracking-tight truncate">
                  {selectedPrize ? (
                    selectedPrize.unitValue > 0 ? (
                      `₱${selectedPrize.unitValue.toLocaleString()}`
                    ) : (
                      selectedPrize.name
                    )
                  ) : (
                    'SELECT PRIZE'
                  )}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold mt-0.5">
                  {selectedPrize ? (
                    selectedPrize.unitValue > 0 ? (
                      `${selectedPrize.name} • ${availableQty} AVAILABLE`
                    ) : (
                      `${selectedPrize.description ? `${selectedPrize.description} • ` : ''}${availableQty} AVAILABLE`
                    )
                  ) : (
                    'NO PRIZE SELECTED'
                  )}
                </div>
              </div>
            </div>

            {/* Criteria & Stepper Card */}
            <div className="border-2 border-[var(--border)] p-3.5 rounded-lg space-y-3 bg-[var(--surface-card)] shadow-xs">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-bold">
                Distribution Criteria
              </div>

              {/* Criteria Row with Monospace Tags */}
              <div className="criteria-row flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDistributionModeChange?.('EQUAL_PER_DISTRICT')}
                  className={`tag text-xs font-mono font-bold uppercase px-3 py-1.5 border transition-all ${
                    distributionMode === 'EQUAL_PER_DISTRICT'
                      ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--accent)]'
                  }`}
                >
                  Equal Per District
                </button>
                <button
                  type="button"
                  onClick={() => onDistributionModeChange?.('COMBINED_POOL')}
                  className={`tag text-xs font-mono font-bold uppercase px-3 py-1.5 border transition-all ${
                    distributionMode === 'COMBINED_POOL'
                      ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--accent)]'
                  }`}
                >
                  Combined Pool
                </button>
              </div>

              {/* Draw Count & Adjust Stepper */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                <div className="font-mono text-xs text-[var(--ink)]">
                  <span className="text-[var(--ink-muted)]">Draw: </span>
                  <span className="font-bold">
                    {distributionMode === 'EQUAL_PER_DISTRICT'
                      ? `${winnersPerDistrict} / dist`
                      : `${combinedWinnersCount} pool`}
                  </span>
                  <span className="mx-1 text-[var(--border)]">•</span>
                  <span className="font-bold text-[var(--accent)]">{totalWinnersToDraw} Total</span>
                </div>

                {/* Quick Adjust Stepper Controls */}
                {selectedPrize && selectedPrize.remainingQuantity > 0 && (
                  <div className="inline-flex border-2 border-[var(--border)] rounded-sm overflow-hidden">
                    {distributionMode === 'EQUAL_PER_DISTRICT' && onWinnersPerDistrictChange && (
                      <>
                        <button
                          type="button"
                          disabled={winnersPerDistrict <= 1}
                          onClick={() => onWinnersPerDistrictChange(Math.max(1, winnersPerDistrict - 1))}
                          className="px-2 py-0.5 text-xs font-mono font-bold hover:bg-[var(--accent)] hover:text-black disabled:opacity-30 transition-colors bg-[var(--surface-elevated)] text-[var(--ink)]"
                          title="Decrease count per district"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[var(--surface)] text-[var(--ink)]">
                          {winnersPerDistrict}
                        </span>
                        <button
                          type="button"
                          disabled={winnersPerDistrict >= maxPerDistrict}
                          onClick={() => onWinnersPerDistrictChange(winnersPerDistrict + 1)}
                          className="px-2 py-0.5 text-xs font-mono font-bold hover:bg-[var(--accent)] hover:text-black disabled:opacity-30 transition-colors bg-[var(--surface-elevated)] text-[var(--ink)]"
                          title="Increase count per district"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </>
                    )}

                    {distributionMode === 'COMBINED_POOL' && onCombinedWinnersCountChange && (
                      <>
                        <button
                          type="button"
                          disabled={combinedWinnersCount <= 1}
                          onClick={() => onCombinedWinnersCountChange(Math.max(1, combinedWinnersCount - 1))}
                          className="px-2 py-0.5 text-xs font-mono font-bold hover:bg-[var(--accent)] hover:text-black disabled:opacity-30 transition-colors bg-[var(--surface-elevated)] text-[var(--ink)]"
                          title="Decrease combined winners count"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[var(--surface)] text-[var(--ink)]">
                          {combinedWinnersCount}
                        </span>
                        <button
                          type="button"
                          disabled={combinedWinnersCount >= availableQty}
                          onClick={() => onCombinedWinnersCountChange(combinedWinnersCount + 1)}
                          className="px-2 py-0.5 text-xs font-mono font-bold hover:bg-[var(--accent)] hover:text-black disabled:opacity-30 transition-colors bg-[var(--surface-elevated)] text-[var(--ink)]"
                          title="Increase combined winners count"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Choice A: District Target Scope Selector (When in Combined Pool / Redraw Mode) */}
              {distributionMode === 'COMBINED_POOL' && onTargetDistrictChange && (
                <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-[var(--ink-muted)]">
                    <span>Target District Scope:</span>
                    <span className="text-[var(--accent)]">
                      {targetDistrict === 'ALL' ? 'All 5 Districts' : `${targetDistrict} Only`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => onTargetDistrictChange('ALL')}
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-1 border transition-all text-center ${
                        targetDistrict === 'ALL'
                          ? 'bg-[var(--accent)] text-black border-[var(--accent)] font-black'
                          : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                      }`}
                    >
                      All (5)
                    </button>
                    {(['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'] as District[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onTargetDistrictChange(d)}
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-1 border transition-all text-center ${
                          targetDistrict === d
                            ? 'bg-[var(--accent)] text-black border-[var(--accent)] font-black'
                            : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {d === 'PRIVATE' ? 'Private' : d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Commence Draw or Confirm Winners */}
            {hasPendingReview && onConfirmWinners ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={onConfirmWinners}
                  className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 animate-pulse rounded-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Winners</span>
                </button>
                {onRedraw && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Discard these drawn winners and redraw this round?')) {
                        onRedraw();
                      }
                    }}
                    className="w-full p-2 border border-red-500/40 hover:bg-red-950/20 text-red-400 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 rounded-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redraw Round</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                id="btn-trigger-draw"
                disabled={isButtonDisabled}
                onClick={() => {
                  setFullStage(true);
                  onOpenDrawPreview();
                }}
                className="btn-draw w-full p-4 disabled:opacity-30 disabled:cursor-not-allowed shadow-md rounded-md"
              >
                <span>{isDrawing ? 'Drawing in Progress' : 'Commence Draw'}</span>
                <span className="text-xl">→</span>
              </button>
            )}

            {/* Quick Operator Status Footer */}
            <div className="mt-auto pt-3 border-t border-[var(--border)] font-mono text-[10px] text-[var(--ink-muted)] flex items-center justify-between">
              <span>PROJECTOR READY</span>
              <span>PRESS ESC TO EXIT FULL STAGE</span>
            </div>
          </aside>
        )}

        {/* Main Stage: Single Winner Hero Spotlight OR 2 + 2 + 1 Multi-District Layout */}
        <main className="main-stage flex-1 p-3 sm:p-6 lg:p-8 theme-bg-gradient flex flex-col justify-center items-center overflow-y-auto">
          {distributionMode === 'COMBINED_POOL' && totalWinnersToDraw === 1 ? (
            /* Single Winner Hero Spotlight Card - Balanced, Proportional & Majestic */
            <div className="w-full max-w-4xl lg:max-w-5xl 2xl:max-w-6xl mx-auto flex flex-col justify-center animate-fade-in my-auto">
              <div
                className={`bg-[var(--surface-card)] border-3 sm:border-4 rounded-3xl p-6 sm:p-9 lg:p-11 shadow-2xl flex flex-col justify-between h-[420px] sm:h-[480px] lg:h-[520px] max-h-[82vh] overflow-hidden transition-all ${
                  isDrawing
                    ? 'border-[var(--accent)] shadow-2xl ring-8 ring-[var(--accent-glow)]'
                    : drawStatus === 'REVEALED' && revealedWinners.length > 0
                    ? 'border-emerald-500 bg-[var(--surface-card)] shadow-2xl ring-4 ring-emerald-500/20 animate-grand-winner-pulse'
                    : 'border-[var(--border)]'
                }`}
              >
                {/* Celebratory Header: Centered with subtle gradient accent divider */}
                <div className="shrink-0 text-center flex flex-col items-center justify-center pb-2">
                  {drawStatus === 'REVEALED' && revealedWinners.length > 0 ? (
                    <>
                      <div className="font-mono text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2 sm:gap-3 drop-shadow-xs">
                        <span className="text-xl sm:text-3xl lg:text-4xl">🎉</span>
                        <span>CONGRATULATIONS!</span>
                        <span className="text-xl sm:text-3xl lg:text-4xl">🎉</span>
                      </div>
                      <div className="w-36 sm:w-56 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mt-2.5 rounded-full" />
                    </>
                  ) : isDrawing ? (
                    <>
                      <div className="font-mono text-xs sm:text-sm md:text-base font-black uppercase tracking-[0.25em] text-[var(--accent)] flex items-center gap-2 animate-pulse">
                        <span>⚡</span>
                        <span>
                          {targetDistrict && targetDistrict !== 'ALL'
                            ? `SHUFFLING ${targetDistrict} DISTRICT CANDIDATES...`
                            : 'SHUFFLING ALL DISTRICT CANDIDATES...'}
                        </span>
                        <span>⚡</span>
                      </div>
                      <div className="w-36 sm:w-56 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent mt-2.5 rounded-full" />
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)] flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[var(--accent)]" />
                        <span>
                          {targetDistrict && targetDistrict !== 'ALL'
                            ? `${targetDistrict} DISTRICT EXCLUSIVE REDRAW`
                            : 'READY TO DRAW 1 LUCKY WINNER'}
                        </span>
                      </div>
                      <div className="w-28 sm:w-44 h-0.5 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent mt-2 rounded-full" />
                    </>
                  )}
                </div>

                {/* Hero Content Area: Strictly Centered & Proportional */}
                <div className="flex-1 flex flex-col justify-center items-center text-center overflow-hidden py-1">
                  {isDrawing ? (
                    <div className="w-full flex flex-col items-center justify-center">
                      {/* Fixed-height name container with mechanical sliding reel effect */}
                      <div className="h-[150px] sm:h-[190px] lg:h-[220px] w-full flex items-center justify-center px-2 sm:px-4 overflow-hidden relative">
                        <div
                          key={singleWinnerShufflingName}
                          className={`font-winner font-black text-[var(--ink)] uppercase text-center leading-[1.05] drop-shadow-md animate-reel-slide ${getHeroNameFontSize(singleWinnerShufflingName)}`}
                        >
                          {singleWinnerShufflingName}
                        </div>
                      </div>
                      <div className="font-mono text-xs sm:text-sm md:text-base text-[var(--accent)] font-bold uppercase tracking-widest pt-3 animate-pulse">
                        [ SELECTING 1 WINNER... ]
                      </div>
                    </div>
                  ) : drawStatus === 'REVEALED' && revealedWinners.length > 0 ? (
                    <div className="w-full flex flex-col items-center justify-center animate-fade-in space-y-3 sm:space-y-4">
                      {/* Fixed-height name container: scaled font gives short names grand visual presence */}
                      <div className="h-[140px] sm:h-[180px] lg:h-[210px] w-full flex items-center justify-center px-4 overflow-hidden">
                        <div
                          className={`font-winner font-black text-[var(--ink)] uppercase text-center leading-[1.05] drop-shadow-sm animate-winner-reveal ${getHeroNameFontSize(revealedWinners[0].fullName)}`}
                        >
                          {revealedWinners[0].fullName}
                        </div>
                      </div>

                      {/* Details Badge Row - Refined Spacing & High-Contrast Visual Balance */}
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1">
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-[var(--surface-elevated)] text-[var(--ink)] font-mono text-xs sm:text-sm md:text-base font-bold uppercase rounded-full border border-[var(--border)] shadow-xs">
                          {revealedWinners[0].district === 'PRIVATE'
                            ? (revealedWinners[0].originalDistrict?.toLowerCase().includes('eccd')
                                ? 'ECCD (PRIVATE)'
                                : revealedWinners[0].position?.toLowerCase().includes('lsb') || revealedWinners[0].typeOfPersonnel?.toLowerCase().includes('lsb')
                                ? 'LSB (PRIVATE)'
                                : 'PRIVATE SCHOOL')
                            : `${revealedWinners[0].originalDistrict || revealedWinners[0].district} DISTRICT`}
                        </span>
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-[var(--surface)] text-[var(--ink)] font-mono text-xs sm:text-sm md:text-base font-bold uppercase rounded-full border border-[var(--border)] shadow-xs">
                          {revealedWinners[0].school}
                        </span>
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-amber-500/15 text-amber-300 font-mono text-xs sm:text-sm md:text-base font-black uppercase rounded-full border border-amber-500/30 shadow-xs">
                          {revealedWinners[0].position}
                        </span>
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-[var(--surface)] text-[var(--ink-muted)] font-mono text-xs sm:text-sm md:text-base font-bold uppercase rounded-full border border-[var(--border)] shadow-xs">
                          ID: {revealedWinners[0].id}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-2 text-[var(--ink-muted)] font-mono">
                      <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-[var(--accent)] opacity-60 stroke-1" />
                      <div className="text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-[var(--ink)]">
                        READY TO COMMENCE DRAW
                      </div>
                      <div className="text-xs sm:text-sm text-[var(--ink-muted)]">
                        {targetDistrict !== 'ALL'
                          ? `Eligible pool: ${candidatePoolByDistrict?.[targetDistrict]?.length || 0} teachers in ${targetDistrict} District`
                          : 'Eligible pool: All eligible teachers across all 5 districts'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hero Footer - Balanced Centered Subtle Accent */}
                <div className="shrink-0 text-center pt-2 sm:pt-3 flex flex-col items-center">
                  <div className="w-28 sm:w-44 h-0.5 bg-gradient-to-r from-transparent via-[var(--border)] to-transparent mb-2 rounded-full" />
                  <span className="font-mono text-[11px] sm:text-xs text-[var(--ink-muted)] font-bold uppercase tracking-[0.25em]">
                    MALUNGON MUNICIPAL TEACHERS&apos; DAY 2026
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-District 2 + 2 + 1 Layout */
            <div className="w-full max-w-[97vw] 2xl:max-w-[1850px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 items-stretch">
              {DISTRICT_CONFIG.map(({ id, title, isPrivate }) => {
                const winners = winnersByDistrict[id];
                const hasWinner = drawStatus === 'REVEALED' && winners.length > 0;
                const isCardDrawing = isDrawing;

                return (
                  <div
                    key={id}
                    id={`card-${id}`}
                    className={`district-pane bg-[var(--surface-card)] border-2 sm:border-3 border-[var(--border)] rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 shadow-lg transition-all flex flex-col justify-between min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] xl:min-h-[195px] ${
                      isCardDrawing
                        ? 'border-[var(--accent)] shadow-xl ring-4 ring-[var(--accent-glow)]'
                        : 'hover:border-[var(--accent)]/50'
                    } ${
                      isPrivate
                        ? 'sm:col-span-2 sm:w-[calc(50%-0.375rem)] md:sm:w-[calc(50%-0.5rem)] lg:sm:w-[calc(50%-0.625rem)] sm:mx-auto w-full'
                        : ''
                    }`}
                  >
                    {/* District Header (Clean, Distinct Monospace Font from Winner Names) */}
                    <div className="text-center pb-1.5 mb-1.5 border-b-2 border-[var(--border)] relative flex items-center justify-center">
                      <h3 className="font-mono text-sm sm:text-base lg:text-lg font-black uppercase tracking-[0.25em] text-[var(--accent)]">
                        {title}
                      </h3>
                      {hasWinner && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs sm:text-sm font-bold text-[var(--badge-text)] bg-[var(--badge-bg)] border border-[var(--border-accent)] px-3 py-0.5 rounded-full shadow-xs">
                          {winners.length} 🏆
                        </div>
                      )}
                    </div>

                    {/* Pane Content - Maximized Teacher Names in Giant Bold Focus */}
                    <div className="flex-1 flex flex-col justify-center min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] xl:min-h-[155px]">
                      {isCardDrawing ? (
                        <div className="flex-1 flex flex-col justify-center items-center py-2 w-full overflow-hidden">
                          <div className="min-h-[85px] sm:min-h-[105px] lg:min-h-[125px] flex items-center justify-center w-full px-3">
                            <div
                              key={shufflingNames[id]?.name}
                              className="font-winner font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[var(--ink)] uppercase tracking-tight text-center leading-tight drop-shadow-xs animate-reel-slide"
                            >
                              {shufflingNames[id]?.name || 'DepEd Participant'}
                            </div>
                          </div>

                          <div className="font-mono text-xs sm:text-sm text-[var(--accent)] font-bold uppercase tracking-widest pt-2 animate-pulse">
                            [ SHUFFLING ALL {candidatePoolByDistrict?.[id]?.length || 0} CANDIDATES... ]
                          </div>
                        </div>
                      ) : hasWinner ? (
                        <div className={`flex-1 flex flex-col justify-center ${winners.length > 2 ? 'space-y-1 py-1 max-h-[260px] overflow-y-auto pr-0.5' : 'overflow-hidden py-2'}`}>
                          {winners.map((w, idx) => (
                            <div
                              key={idx}
                              className={`text-center ${
                                winners.length > 1 ? 'py-1 border-b border-[var(--border)] last:border-b-0' : 'py-1'
                              }`}
                            >
                              {/* In-Focus Well-Proportioned Teacher Name in Plus Jakarta Sans font */}
                              <div
                                className={`font-winner font-black text-[var(--ink)] uppercase tracking-tight leading-tight ${
                                  winners.length === 1
                                    ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
                                    : winners.length <= 3
                                    ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                                    : 'text-base sm:text-lg md:text-xl lg:text-2xl'
                                }`}
                              >
                                {w.fullName}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : drawStatus === 'REVEALED' ? (
                        <div
                          id={`badge-${id}`}
                          className="pane-status font-mono text-sm sm:text-base text-[var(--ink-muted)] text-center py-4 font-semibold tracking-wider uppercase"
                        >
                          No winners in this round
                        </div>
                      ) : (
                        <div
                          id={`badge-${id}`}
                          className="pane-status font-mono text-sm sm:text-base text-[var(--ink-muted)] text-center py-4 font-semibold tracking-wider uppercase"
                        >
                          Waiting for raffle draw...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
