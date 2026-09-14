'use client';

import React from 'react';
import { District, DistributionMode, Participant, Prize } from '../lib/types';
import { Trophy, Minus, Plus } from 'lucide-react';

interface ProjectorDisplayProps {
  selectedPrize: Prize | null;
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
}

const DISTRICT_CONFIG: { id: District; number: string; title: string; isPrivate?: boolean }[] = [
  { id: 'NORTH', number: '01', title: 'North' },
  { id: 'SOUTH', number: '02', title: 'South' },
  { id: 'EAST', number: '03', title: 'East' },
  { id: 'WEST', number: '04', title: 'West' },
  { id: 'PRIVATE', number: '05', title: 'Private Schools', isPrivate: true }
];

export const ProjectorDisplay: React.FC<ProjectorDisplayProps> = ({
  selectedPrize,
  isDrawing,
  shufflingNames,
  revealedWinners,
  countdown,
  onOpenDrawPreview,
  drawStatus,
  distributionMode,
  winnersPerDistrict,
  combinedWinnersCount,
  onDistributionModeChange,
  onWinnersPerDistrictChange,
  onCombinedWinnersCountChange
}) => {
  // Group revealed winners by district
  const winnersByDistrict: Record<District, Participant[]> = {
    NORTH: [],
    SOUTH: [],
    EAST: [],
    WEST: [],
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

  const availableQty = selectedPrize ? selectedPrize.remainingQuantity : 0;
  const maxPerDistrict = Math.floor(availableQty / 5);

  const isButtonDisabled =
    isDrawing ||
    !selectedPrize ||
    selectedPrize.remainingQuantity <= 0 ||
    totalWinnersToDraw <= 0 ||
    totalWinnersToDraw > availableQty;

  return (
    <div className="flex-1 flex flex-col justify-between relative">
      {/* Countdown Overlay (Variation 3 Minimalist Editorial Style) */}
      {countdown !== null && countdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f7f4]/95 backdrop-blur-md animate-fade-in select-none">
          <div className="text-center">
            <div className="font-display text-8xl sm:text-9xl md:text-[14rem] font-bold text-[#1a1a1a] leading-none drop-shadow-md">
              {countdown}
            </div>
            <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#ff6a00] font-bold mt-4">
              [ COMMENCING SIMULTANEOUS DRAW IN {countdown} ]
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Grid (.container) */}
      <div className="container flex-1 w-full grid grid-cols-1 lg:grid-cols-[1.1fr_2fr] bg-[#f8f7f4] min-h-[calc(100vh-140px)]">
        {/* Editorial Sidebar */}
        <aside className="sidebar p-6 sm:p-10 lg:p-12 lg:border-r-2 lg:border-[#1a1a1a] bg-white flex flex-col justify-between">
          <div>
            <div
              className="header-meta font-mono text-xs uppercase tracking-wider mb-3"
              style={{ color: 'var(--accent)' }}
            >
              {isDrawing
                ? '[ Status: Drawing in Progress... ]'
                : drawStatus === 'REVEALED'
                ? '[ Status: Winners Announced ]'
                : '[ Status: Ready ]'}
            </div>

            <h2 className="hero-title text-[#1a1a1a]">Grand Raffle Draw</h2>

            {/* Criteria Row with Monospace Tags */}
            <div className="criteria-row flex flex-wrap gap-2 my-4">
              <button
                type="button"
                onClick={() => onDistributionModeChange?.('EQUAL_PER_DISTRICT')}
                className={`tag ${distributionMode === 'EQUAL_PER_DISTRICT' ? 'active' : ''}`}
              >
                Equal Per District
              </button>
              <button
                type="button"
                onClick={() => onDistributionModeChange?.('COMBINED_POOL')}
                className={`tag ${distributionMode === 'COMBINED_POOL' ? 'active' : ''}`}
              >
                Combined Pool
              </button>
            </div>

            {/* Draw Count & Total Winners Info */}
            <div className="header-meta font-mono text-xs sm:text-sm text-[#1a1a1a] mb-6 leading-relaxed">
              <div>
                Draw Count:{' '}
                <span className="font-bold">
                  {distributionMode === 'EQUAL_PER_DISTRICT'
                    ? `${winnersPerDistrict} Per District`
                    : `${combinedWinnersCount} Combined`}
                </span>
              </div>
              <div className="mt-1">
                Total Winners:{' '}
                <span className="font-bold text-[#ff6a00]">
                  {totalWinnersToDraw} TOTAL
                </span>
              </div>
            </div>

            {/* Quick Adjust Stepper Controls */}
            {selectedPrize && selectedPrize.remainingQuantity > 0 && (
              <div className="flex items-center gap-2 mb-6 pt-2 border-t border-[#1a1a1a]/10">
                <span className="font-mono text-[11px] text-[#1a1a1a]/60 uppercase">Adjust:</span>
                {distributionMode === 'EQUAL_PER_DISTRICT' && onWinnersPerDistrictChange && (
                  <div className="inline-flex border border-[#1a1a1a]">
                    <button
                      type="button"
                      disabled={winnersPerDistrict <= 1}
                      onClick={() => onWinnersPerDistrictChange(Math.max(1, winnersPerDistrict - 1))}
                      className="px-2.5 py-0.5 text-xs font-mono font-bold hover:bg-[#1a1a1a] hover:text-white disabled:opacity-30 transition-colors"
                      title="Decrease count per district"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-0.5 text-xs font-mono font-bold bg-[#f8f7f4]">
                      {winnersPerDistrict} / dist
                    </span>
                    <button
                      type="button"
                      disabled={winnersPerDistrict >= maxPerDistrict}
                      onClick={() => onWinnersPerDistrictChange(winnersPerDistrict + 1)}
                      className="px-2.5 py-0.5 text-xs font-mono font-bold hover:bg-[#1a1a1a] hover:text-white disabled:opacity-30 transition-colors"
                      title="Increase count per district"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {distributionMode === 'COMBINED_POOL' && onCombinedWinnersCountChange && (
                  <div className="inline-flex border border-[#1a1a1a]">
                    <button
                      type="button"
                      disabled={combinedWinnersCount <= 1}
                      onClick={() => onCombinedWinnersCountChange(Math.max(1, combinedWinnersCount - 1))}
                      className="px-2.5 py-0.5 text-xs font-mono font-bold hover:bg-[#1a1a1a] hover:text-white disabled:opacity-30 transition-colors"
                      title="Decrease combined winners count"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-0.5 text-xs font-mono font-bold bg-[#f8f7f4]">
                      {combinedWinnersCount} pool
                    </span>
                    <button
                      type="button"
                      disabled={combinedWinnersCount >= availableQty}
                      onClick={() => onCombinedWinnersCountChange(combinedWinnersCount + 1)}
                      className="px-2.5 py-0.5 text-xs font-mono font-bold hover:bg-[#1a1a1a] hover:text-white disabled:opacity-30 transition-colors"
                      title="Increase combined winners count"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prize Banner Section */}
          <div className="prize-banner border-t border-[#1a1a1a] pt-6 mt-6">
            <div className="header-meta font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a]/70 mb-1">
              Current Reward
            </div>
            <div className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-none text-[#1a1a1a] tracking-tight">
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
            <div className="header-meta font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a]/50 mt-1">
              {selectedPrize ? (
                `${selectedPrize.name} • ${availableQty} AVAILABLE`
              ) : (
                'NO PRIZE SELECTED'
              )}
            </div>

            <button
              id="btn-trigger-draw"
              disabled={isButtonDisabled}
              onClick={onOpenDrawPreview}
              className="btn-draw w-full p-4 sm:p-5 mt-6 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
            >
              <span>{isDrawing ? 'Drawing in Progress' : 'Commence Draw'}</span>
              <span className="text-xl">→</span>
            </button>
          </div>
        </aside>

        {/* Main Stage: 5-District Grid Layout */}
        <main className="main-stage grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-3 gap-0 bg-[#f8f7f4] overflow-hidden border-t sm:border-t-0 border-[#1a1a1a]/10">
          {DISTRICT_CONFIG.map(({ id, number, title, isPrivate }) => {
            const winners = winnersByDistrict[id];
            const hasWinner = drawStatus === 'REVEALED' && winners.length > 0;
            const isCardDrawing = isDrawing;

            return (
              <div
                key={id}
                id={`card-${id}`}
                className={`district-pane border-b border-r border-[#1a1a1a]/10 p-6 sm:p-8 flex flex-col justify-between transition-colors ${
                  isPrivate ? 'pane-private sm:col-span-2' : ''
                } ${isCardDrawing ? 'bg-orange-50/50' : 'hover:bg-white'}`}
              >
                <div>
                  <div className="pane-label font-mono text-[11px] text-[#1a1a1a]/50 uppercase tracking-wider mb-2">
                    {`${number} // DISTRICT`}
                  </div>
                  <h3 className="pane-title font-display text-2xl sm:text-3xl font-bold uppercase text-[#1a1a1a]">
                    {title}
                  </h3>
                </div>

                {/* Pane Status / Content */}
                <div className="mt-4">
                  {isCardDrawing ? (
                    <div className="space-y-1 animate-pulse">
                      <div className="font-display text-xl sm:text-2xl font-bold text-[#1a1a1a] uppercase leading-tight">
                        {shufflingNames[id].name}
                      </div>
                      <div className="font-mono text-xs text-[#ff6a00] font-bold uppercase">
                        {shufflingNames[id].school}
                      </div>
                      <div className="font-mono text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest pt-1">
                        [ SHUFFLING CANDIDATE POOL... ]
                      </div>
                    </div>
                  ) : hasWinner ? (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      <div className="font-mono text-[11px] uppercase tracking-wider text-[#ff6a00] font-bold mb-1">
                        🏆 {winners.length} Winner{winners.length > 1 ? 's' : ''} Drawn
                      </div>
                      {winners.map((w, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-[#1a1a1a]/15 p-2.5 shadow-sm text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-display font-bold text-base sm:text-lg text-[#1a1a1a] uppercase leading-none flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-[#ff6a00] flex-shrink-0" />
                                <span>{w.fullName}</span>
                              </div>
                              <div className="font-mono text-xs text-[#1a1a1a]/70 mt-1">
                                {w.school}
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#1a1a1a] text-[#f8f7f4] uppercase">
                              {w.personnelType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : drawStatus === 'REVEALED' ? (
                    <div
                      id={`badge-${id}`}
                      className="pane-status font-mono text-xs text-[#1a1a1a]/50"
                    >
                      No winners in this round
                    </div>
                  ) : (
                    <div
                      id={`badge-${id}`}
                      className="pane-status font-mono text-xs text-[#1a1a1a]/50"
                    >
                      Waiting for raffle draw...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};
