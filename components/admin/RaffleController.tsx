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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-6 shadow-sm dark:shadow-2xl relative border-t-4 border-t-[#FF6A00]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#1a1a1a]/15 dark:border-white/10 pb-4 mb-6">
          <Trophy className="w-6 h-6 text-[#FF6A00]" />
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
              RAFFLE DRAW CONTROLLER
            </h3>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
              Select prize &amp; configure winner selection criteria
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 1. SELECT PRIZE TO DRAW */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 mb-2">
              SELECT PRIZE TO DRAW:
            </label>
            <select
              id="admin-prize-dropdown"
              value={selectedPrizeId}
              onChange={(e) => onSelectPrize(e.target.value)}
              className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/20 focus:border-[#FF6A00] px-4 py-3 text-[#1a1a1a] dark:text-white font-black text-sm uppercase tracking-wide outline-none transition-colors"
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
                  className="bg-white dark:bg-neutral-900 text-black dark:text-white py-2"
                >
                  [{prize.category || 'MINOR'}] {prize.name} — (Remaining: {prize.remainingQuantity} / {prize.quantity})
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
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 mb-2">
              DISTRIBUTION MODE:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-mode-equal"
                onClick={() => onDistributionModeChange('EQUAL_PER_DISTRICT')}
                className={`px-4 py-3 border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                  distributionMode === 'EQUAL_PER_DISTRICT'
                    ? 'bg-[#FF6A00] text-white border-[#FF6A00] shadow-md shadow-[#FF6A00]/20'
                    : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:text-[#1a1a1a] dark:hover:text-white hover:border-[#1a1a1a]'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Equal Per District</span>
              </button>

              <button
                type="button"
                id="btn-mode-combined"
                onClick={() => onDistributionModeChange('COMBINED_POOL')}
                className={`px-4 py-3 border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                  distributionMode === 'COMBINED_POOL'
                    ? 'bg-[#FF6A00] text-white border-[#FF6A00] shadow-md shadow-[#FF6A00]/20'
                    : 'bg-[#f8f7f4] dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-[#1a1a1a]/20 dark:border-white/15 hover:text-[#1a1a1a] dark:hover:text-white hover:border-[#1a1a1a]'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Combined Pool</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2 font-medium">
              {distributionMode === 'EQUAL_PER_DISTRICT'
                ? 'Guarantees equal winners across all 5 municipal districts (North, South, East, West, Private).'
                : 'Picks winners completely at random from all eligible participants without district quotas.'}
            </p>
          </div>

          {/* 3. WINNERS QUANTITY CONTROLLER (EQUAL vs COMBINED) */}
          {distributionMode === 'EQUAL_PER_DISTRICT' ? (
            <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 sm:p-5 space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                WINNERS PER DISTRICT:
              </label>

              <div className="flex flex-wrap items-center gap-4">
                {/* Stepper */}
                <div className="flex items-center border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-black">
                  <button
                    type="button"
                    id="btn-stepper-minus"
                    disabled={winnersPerDistrict <= 1}
                    onClick={() => onWinnersPerDistrictChange(Math.max(1, winnersPerDistrict - 1))}
                    className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:hover:bg-transparent transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-black text-xl text-[#1a1a1a] dark:text-white font-mono">
                    {winnersPerDistrict}
                  </span>
                  <button
                    type="button"
                    id="btn-stepper-plus"
                    disabled={winnersPerDistrict >= maxPerDistrict || (winnersPerDistrict + 1) * 5 > availableQty}
                    onClick={() => onWinnersPerDistrictChange(winnersPerDistrict + 1)}
                    className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:hover:bg-transparent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Total Winners Badge */}
                <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/15 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className="text-neutral-400">=</span>
                  <span className="text-[#FF6A00] text-sm">{winnersPerDistrict * 5} TOTAL WINNERS</span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">({winnersPerDistrict} × 5 districts)</span>
                </div>
              </div>

              {/* QUICK PRESETS */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 block mb-2">
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
                        className={`px-3 py-1.5 border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          isCurrent
                            ? 'bg-[#1a1a1a] dark:bg-neutral-800 text-white border-[#1a1a1a] dark:border-white/40 shadow-sm'
                            : isPossible
                            ? 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:text-black dark:hover:text-white hover:border-[#1a1a1a]'
                            : 'bg-neutral-100 dark:bg-neutral-950 text-neutral-400 dark:text-neutral-600 border-neutral-200 dark:border-white/5 cursor-not-allowed'
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
                      className={`px-3 py-1.5 border text-[11px] font-black uppercase tracking-wider transition-colors ${
                        winnersPerDistrict === maxPerDistrict
                          ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
                          : 'bg-white dark:bg-neutral-900 text-[#FF6A00] border-[#FF6A00]/40 hover:bg-[#FF6A00]/10'
                      }`}
                    >
                      Max ({maxPerDistrict} each = {maxPerDistrict * 5} total)
                    </button>
                  )}
                </div>
              </div>

              {!canEqualDistribute && availableQty < 5 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 p-3 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Remaining prize quantity is less than 5. Equal per district mode requires at least 5 prize units (1 per district). Please switch to <strong>Combined Pool</strong> or select another prize.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 sm:p-5 space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400">
                WINNERS TO DRAW (COMBINED POOL):
              </label>

              <div className="flex flex-wrap items-center gap-4">
                {/* Stepper */}
                <div className="flex items-center border border-[#1a1a1a]/30 dark:border-white/20 bg-white dark:bg-black">
                  <button
                    type="button"
                    disabled={combinedWinnersCount <= 1}
                    onClick={() => onCombinedWinnersCountChange(Math.max(1, combinedWinnersCount - 1))}
                    className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:hover:bg-transparent transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-black text-xl text-[#1a1a1a] dark:text-white font-mono">
                    {combinedWinnersCount}
                  </span>
                  <button
                    type="button"
                    disabled={combinedWinnersCount >= availableQty || combinedWinnersCount >= eligiblePoolCount}
                    onClick={() => onCombinedWinnersCountChange(combinedWinnersCount + 1)}
                    className="p-3 text-[#1a1a1a] dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:hover:bg-transparent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Total Winners Badge */}
                <div className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/15 text-[#1a1a1a] dark:text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className="text-neutral-400">=</span>
                  <span className="text-[#FF6A00] text-sm">{combinedWinnersCount} TOTAL WINNERS</span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">(Free pool shuffle)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 block mb-2">
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
                        className={`px-3 py-1.5 border text-[11px] font-black uppercase tracking-wider transition-colors ${
                          isCurrent
                            ? 'bg-[#1a1a1a] dark:bg-neutral-800 text-white border-[#1a1a1a] dark:border-white/40 shadow-sm'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/10 hover:text-black dark:hover:text-white hover:border-[#1a1a1a]'
                        }`}
                      >
                        {preset} Winner{preset > 1 ? 's' : ''}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onCombinedWinnersCountChange(availableQty)}
                    className={`px-3 py-1.5 border text-[11px] font-black uppercase tracking-wider transition-colors ${
                      combinedWinnersCount === availableQty
                        ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
                        : 'bg-white dark:bg-neutral-900 text-[#FF6A00] border-[#FF6A00]/40 hover:bg-[#FF6A00]/10'
                    }`}
                  >
                    All ({availableQty} Winners)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. DISTRICT ELIGIBILITY STATUS BREAKDOWN */}
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#1a1a1a] dark:text-white" />
                DISTRICT ELIGIBLE POOL BREAKDOWN:
              </span>
              <span className="text-xs font-black text-[#1a1a1a] dark:text-white font-mono">
                Total: {eligiblePoolCount} Personnel
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DISTRICTS.map((d) => {
                const count = districtEligibleCounts[d] || 0;
                const isShort = distributionMode === 'EQUAL_PER_DISTRICT' && count < winnersPerDistrict;
                return (
                  <div
                    key={d}
                    className={`p-2.5 border text-center ${
                      isShort
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200'
                        : 'border-[#1a1a1a]/20 dark:border-white/10 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {d === 'PRIVATE' ? 'PRIVATE (ECCD+LSB)' : d}
                    </div>
                    <div className="text-base font-black text-[#1a1a1a] dark:text-white font-mono mt-0.5">
                      {count}
                    </div>
                    <div className="text-[9px] text-neutral-500 uppercase font-bold">
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
            className={`w-full py-4 font-black text-base uppercase tracking-wider shadow-md flex items-center justify-center gap-2.5 transition-all ${
              isButtonDisabled
                ? 'bg-neutral-200 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-300 dark:border-white/10 cursor-not-allowed'
                : 'bg-[#FF6A00] hover:bg-[#FF7E1D] text-white hover:scale-[1.01] active:scale-[0.99] shadow-[#FF6A00]/30'
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
          <div className="flex flex-wrap items-center justify-between text-xs border-t border-[#1a1a1a]/15 dark:border-white/10 pt-4 text-neutral-600 dark:text-neutral-400">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider">Status: </span>
              <strong className="text-[#1a1a1a] dark:text-white">Live Configured</strong>
            </div>
            <div>
              <span>Remaining after draw: </span>
              <strong className="text-[#1a1a1a] dark:text-white font-mono">
                {Math.max(0, availableQty - totalWinnersToDraw)} / {currentPrize?.quantity || 0}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
