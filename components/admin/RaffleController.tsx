'use client';

import React from 'react';
import { District, DistributionMode, Prize } from '../../lib/types';
import { Trophy, Users, AlertCircle, PlayCircle, Sparkles, Target, Globe, Minus, Plus } from 'lucide-react';

interface RaffleControllerProps {
  prizes: Prize[];
  selectedPrizeId: string;
  onSelectPrize: (id: string) => void;
  onLaunchDraw: () => void;
  eligiblePoolCount: number;
  isDrawing: boolean;
  distributionMode: DistributionMode;
  onDistributionModeChange: (mode: DistributionMode) => void;
  winnersPerDistrict: number;
  onWinnersPerDistrictChange: (count: number) => void;
  combinedWinnersCount: number;
  onCombinedWinnersCountChange: (count: number) => void;
  districtEligibleCounts: Record<District, number>;
}

const DISTRICTS: District[] = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];

export const RaffleController: React.FC<RaffleControllerProps> = ({
  prizes,
  selectedPrizeId,
  onSelectPrize,
  onLaunchDraw,
  eligiblePoolCount,
  isDrawing,
  distributionMode,
  onDistributionModeChange,
  winnersPerDistrict,
  onWinnersPerDistrictChange,
  combinedWinnersCount,
  onCombinedWinnersCountChange,
  districtEligibleCounts
}) => {
  const currentPrize = prizes.find((p) => p.id === selectedPrizeId) || prizes[0] || null;
  const availableQty = currentPrize ? currentPrize.remainingQuantity : 0;

  // Maximum winners per district based on remaining prize quantity (5 districts)
  const maxPerDistrictByPrize = Math.floor(availableQty / 5);
  // Also limited by minimum eligible in any district
  const minDistrictEligible = Math.min(...DISTRICTS.map((d) => districtEligibleCounts[d] || 0));
  const maxPerDistrict = Math.min(maxPerDistrictByPrize, minDistrictEligible);

  // Total winners for the planned round
  const totalWinnersToDraw =
    distributionMode === 'EQUAL_PER_DISTRICT'
      ? winnersPerDistrict * 5
      : combinedWinnersCount;

  const roundPrizeValue = currentPrize ? currentPrize.unitValue * totalWinnersToDraw : 0;

  // Validation checks
  const canEqualDistribute = availableQty >= 5 && minDistrictEligible >= 1;
  const isDistrictPoolInsufficient =
    distributionMode === 'EQUAL_PER_DISTRICT' &&
    DISTRICTS.some((d) => (districtEligibleCounts[d] || 0) < winnersPerDistrict);
  const isCombinedPoolInsufficient =
    distributionMode === 'COMBINED_POOL' && combinedWinnersCount > eligiblePoolCount;
  const isQuantityExceeded = totalWinnersToDraw > availableQty || totalWinnersToDraw <= 0;
  const isButtonDisabled =
    availableQty <= 0 ||
    isDistrictPoolInsufficient ||
    isCombinedPoolInsufficient ||
    isQuantityExceeded ||
    isDrawing;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in font-mono">
      <div className="bg-[var(--surface-card)] border border-[var(--border)] p-6 sm:p-7 rounded-2xl shadow-2xl relative border-t-4 border-t-[var(--accent)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-6">
          <div className="p-2.5 rounded-xl bg-[var(--badge-bg)] text-[var(--accent)] border border-[var(--border-accent)]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-display font-black text-[var(--ink)] uppercase tracking-tight leading-none">
              RAFFLE DRAW CONTROLLER
            </h3>
            <p className="text-[10px] text-[var(--ink-muted)] font-bold uppercase tracking-[0.2em] mt-1">
              Select prize &amp; configure winner selection criteria
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 1. SELECT PRIZE TO DRAW */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-2">
              SELECT PRIZE TO DRAW:
            </label>
            <select
              id="admin-prize-dropdown"
              value={selectedPrizeId}
              onChange={(e) => onSelectPrize(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-4 py-3 text-[var(--ink)] font-black text-sm uppercase tracking-wide outline-none transition-colors cursor-pointer"
            >
              {prizes.length === 0 && (
                <option value="" disabled>
                  No prizes registered — please add prizes in Prize Inventory
                </option>
              )}
              {prizes.map((prize) => (
                <option
                  key={prize.id}
                  value={prize.id}
                  disabled={prize.remainingQuantity <= 0}
                  className="bg-[var(--surface)] text-[var(--ink)] py-2"
                >
                  {prize.name} — (Remaining: {prize.remainingQuantity} / {prize.quantity})
                  {prize.unitValue > 0
                    ? ` • ₱${prize.unitValue.toLocaleString()} each`
                    : (prize.description ? ` • ${prize.description}` : ' • Physical Item')}
                  {prize.remainingQuantity <= 0 ? ' [EXHAUSTED]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. DISTRIBUTION MODE */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-2">
              DISTRIBUTION MODE:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-mode-equal"
                onClick={() => onDistributionModeChange('EQUAL_PER_DISTRICT')}
                className={`px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                  distributionMode === 'EQUAL_PER_DISTRICT'
                    ? 'bg-[var(--accent)] text-black border-[var(--border-accent)] shadow-md font-black'
                    : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)] hover:text-[var(--ink)] hover:border-[var(--border-accent)]'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>🎯 Equal Per District</span>
              </button>

              <button
                type="button"
                id="btn-mode-combined"
                onClick={() => onDistributionModeChange('COMBINED_POOL')}
                className={`px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                  distributionMode === 'COMBINED_POOL'
                    ? 'bg-[var(--accent)] text-black border-[var(--border-accent)] shadow-md font-black'
                    : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)] hover:text-[var(--ink)] hover:border-[var(--border-accent)]'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>🌐 Combined Pool</span>
              </button>
            </div>
            <p className="text-[11px] text-[var(--ink-muted)] mt-2 font-medium">
              {distributionMode === 'EQUAL_PER_DISTRICT'
                ? 'Guarantees equal winners across all 5 municipal districts (North, South, East, West, Private).'
                : 'Picks winners completely at random from all eligible participants without district quotas.'}
            </p>
          </div>

          {/* 3. WINNERS QUANTITY CONTROLLER (EQUAL vs COMBINED) */}
          {distributionMode === 'EQUAL_PER_DISTRICT' ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-5 space-y-4 shadow-inner">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                WINNERS PER DISTRICT:
              </label>

              <div className="flex flex-wrap items-center gap-4">
                {/* Stepper */}
                <div className="flex items-center border border-[var(--border)] bg-[var(--surface-card)] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    id="btn-stepper-minus"
                    disabled={winnersPerDistrict <= 1}
                    onClick={() => onWinnersPerDistrictChange(Math.max(1, winnersPerDistrict - 1))}
                    className="p-3 text-[var(--ink)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-black text-xl text-[var(--ink)] font-mono">
                    {winnersPerDistrict}
                  </span>
                  <button
                    type="button"
                    id="btn-stepper-plus"
                    disabled={winnersPerDistrict >= maxPerDistrict || (winnersPerDistrict + 1) * 5 > availableQty}
                    onClick={() => onWinnersPerDistrictChange(winnersPerDistrict + 1)}
                    className="p-3 text-[var(--ink)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Total Winners Badge */}
                <div className="px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink)] font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-2">
                  <span className="text-[var(--ink-muted)]">=</span>
                  <span className="text-[var(--accent)] text-sm">{winnersPerDistrict * 5} TOTAL WINNERS</span>
                  <span className="text-[10px] text-[var(--ink-muted)] font-normal">({winnersPerDistrict} × 5 districts)</span>
                </div>
              </div>

              {/* QUICK PRESETS */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)] block mb-2">
                  QUICK PRESETS:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3].map((num) => {
                    const totalForPreset = num * 5;
                    const isPossible = totalForPreset <= availableQty && num <= maxPerDistrict;
                    const isCurrent = winnersPerDistrict === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={!isPossible}
                        onClick={() => onWinnersPerDistrictChange(num)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          isCurrent
                            ? 'bg-[var(--surface-elevated)] text-[var(--accent)] border-[var(--border-accent)] shadow-xs'
                            : isPossible
                            ? 'bg-[var(--surface-card)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--border-accent)]'
                            : 'opacity-30 border-[var(--border)] cursor-not-allowed'
                        }`}
                      >
                        {num} each ({totalForPreset} winners)
                      </button>
                    );
                  })}

                  {maxPerDistrict >= 1 && (
                    <button
                      type="button"
                      onClick={() => onWinnersPerDistrictChange(maxPerDistrict)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${
                        winnersPerDistrict === maxPerDistrict
                          ? 'bg-[var(--accent)] text-black border-[var(--border-accent)]'
                          : 'bg-[var(--surface-card)] text-[var(--accent)] border-[var(--border-accent)]/50 hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      Max ({maxPerDistrict} each = {maxPerDistrict * 5} total)
                    </button>
                  )}
                </div>
              </div>

              {!canEqualDistribute && availableQty < 5 && (
                <div className="bg-amber-950/40 border border-amber-600/40 p-3 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Remaining prize quantity is less than 5. Equal per district mode requires at least 5 prize units (1 per district). Please switch to <strong>Combined Pool</strong> or select another prize.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-5 space-y-4 shadow-inner">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                WINNERS TO DRAW (COMBINED POOL):
              </label>

              <div className="flex flex-wrap items-center gap-4">
                {/* Stepper */}
                <div className="flex items-center border border-[var(--border)] bg-[var(--surface-card)] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    disabled={combinedWinnersCount <= 1}
                    onClick={() => onCombinedWinnersCountChange(Math.max(1, combinedWinnersCount - 1))}
                    className="p-3 text-[var(--ink)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-black text-xl text-[var(--ink)] font-mono">
                    {combinedWinnersCount}
                  </span>
                  <button
                    type="button"
                    disabled={combinedWinnersCount >= availableQty || combinedWinnersCount >= eligiblePoolCount}
                    onClick={() => onCombinedWinnersCountChange(combinedWinnersCount + 1)}
                    className="p-3 text-[var(--ink)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Total Winners Badge */}
                <div className="px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink)] font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-2">
                  <span className="text-[var(--ink-muted)]">=</span>
                  <span className="text-[var(--accent)] text-sm">{combinedWinnersCount} TOTAL WINNERS</span>
                  <span className="text-[10px] text-[var(--ink-muted)] font-normal">(Free pool shuffle)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)] block mb-2">
                  QUICK PRESETS:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 5, 10, 15].map((preset) => {
                    if (preset > availableQty && preset !== 1) return null;
                    const isCurrent = combinedWinnersCount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onCombinedWinnersCountChange(preset)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          isCurrent
                            ? 'bg-[var(--surface-elevated)] text-[var(--accent)] border-[var(--border-accent)] shadow-xs'
                            : 'bg-[var(--surface-card)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--border-accent)]'
                        }`}
                      >
                        {preset} Winner{preset > 1 ? 's' : ''}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onCombinedWinnersCountChange(availableQty)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider transition-colors ${
                      combinedWinnersCount === availableQty
                        ? 'bg-[var(--accent)] text-black border-[var(--border-accent)]'
                        : 'bg-[var(--surface-card)] text-[var(--accent)] border-[var(--border-accent)]/50 hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    All ({availableQty} Winners)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. DISTRICT ELIGIBILITY STATUS BREAKDOWN */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                DISTRICT ELIGIBLE POOL BREAKDOWN:
              </span>
              <span className="text-xs font-black text-[var(--ink)] font-mono">
                Total: {eligiblePoolCount} Qualified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DISTRICTS.map((d) => {
                const count = districtEligibleCounts[d] || 0;
                const isShort = distributionMode === 'EQUAL_PER_DISTRICT' && count < winnersPerDistrict;
                return (
                  <div
                    key={d}
                    className={`p-2.5 rounded-lg border text-center ${
                      isShort
                        ? 'border-red-500/60 bg-red-950/30 text-red-200'
                        : 'border-[var(--border)] bg-[var(--surface-card)] text-[var(--ink)]'
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-wider text-[var(--ink-muted)]">
                      {d === 'PRIVATE' ? 'PRIVATE' : d}
                    </div>
                    <div className="text-base font-black text-[var(--ink)] font-mono mt-0.5">
                      {count}
                    </div>
                    <div className="text-[9px] text-[var(--ink-muted)] uppercase font-bold">
                      {distributionMode === 'EQUAL_PER_DISTRICT' ? `draw ${winnersPerDistrict}` : 'pool'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. BIG DRAW ACTION BUTTON */}
          <button
            id="btn-admin-draw"
            disabled={isButtonDisabled}
            onClick={onLaunchDraw}
            className={`btn-draw w-full py-4 rounded-xl font-black text-base uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2.5 transition-all ${
              isButtonDisabled
                ? 'opacity-40 cursor-not-allowed shadow-none'
                : 'active:scale-98'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>
              {isDrawing
                ? 'DRAW IN PROGRESS...'
                : distributionMode === 'EQUAL_PER_DISTRICT'
                ? `DRAW ${winnersPerDistrict} PER DISTRICT (${totalWinnersToDraw} TOTAL)`
                : `DRAW ${totalWinnersToDraw} FROM COMBINED POOL`}
            </span>
          </button>

          {/* Calculation and Warning details */}
          <div className="flex flex-wrap items-center justify-between text-xs border-t border-[var(--border)] pt-4 text-[var(--ink-muted)]">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider">Status: </span>
              <strong className="text-[var(--ink)]">Ready to Draw</strong>
            </div>
            <div>
              <span>Remaining after round: </span>
              <strong className="text-[var(--accent)] font-mono">
                {Math.max(0, availableQty - totalWinnersToDraw)} / {currentPrize?.quantity || 0}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
