'use client';

import React from 'react';
import { District, Participant, Prize, Winner } from '../../lib/types';
import { Users, CheckCircle2, Trophy, Gift, Building2, GraduationCap, Printer, Clock } from 'lucide-react';

interface DashboardOverviewProps {
  participants: Participant[];
  prizes: Prize[];
  winners: Winner[];
  onNavigateToTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  participants,
  prizes,
  winners,
  onNavigateToTab
}) => {
  const totalParticipants = participants.length;
  const eligibleCount = participants.filter((p) => p.eligible === 'ELIGIBLE').length;
  const winnerCount = winners.length;
  const remainingPrizes = prizes.reduce((sum, p) => sum + p.remainingQuantity, 0);
  const totalPrizeValue = prizes.reduce((sum, p) => sum + p.totalValue, 0);

  // Print Queue & Verification Metrics
  const pendingPrintCount = winners.filter((w) => !w.isPrinted).length;
  const printedCount = winners.filter((w) => Boolean(w.isPrinted)).length;
  const unclaimedCount = winners.filter((w) => w.claimStatus === 'UNCLAIMED').length;
  const claimedCount = winners.filter((w) => w.claimStatus === 'CLAIMED').length;

  // District breakdowns
  const districtCounts: Record<District, { total: number; winners: number }> = {
    NORTH: { total: 0, winners: 0 },
    EAST: { total: 0, winners: 0 },
    WEST: { total: 0, winners: 0 },
    SOUTH: { total: 0, winners: 0 },
    PRIVATE: { total: 0, winners: 0 }
  };

  participants.forEach((p) => {
    if (districtCounts[p.district]) {
      districtCounts[p.district].total++;
    }
  });

  winners.forEach((w) => {
    if (districtCounts[w.district]) {
      districtCounts[w.district].winners++;
    }
  });

  // Personnel breakdowns
  const teachingCount = participants.filter((p) => p.personnelType === 'TEACHING').length;
  const nonTeachingCount = participants.filter((p) => p.personnelType === 'NON-TEACHING').length;
  const teachingWinners = winners.filter((w) => w.personnelType === 'TEACHING').length;
  const nonTeachingWinners = winners.filter((w) => w.personnelType === 'NON-TEACHING').length;

  return (
    <div className="space-y-6 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm dark:shadow-xl relative border-t-4 border-t-[#FF1E1E]">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Participants</span>
            <Users className="w-4 h-4 text-[#FF1E1E]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-[#1a1a1a] dark:text-white tracking-tight">
              {totalParticipants.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-bold mt-1">Malungon Educators Pool</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm dark:shadow-xl relative border-t-4 border-t-[#1a1a1a] dark:border-t-white">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Eligible Pool</span>
            <CheckCircle2 className="w-4 h-4 text-[#1a1a1a] dark:text-white" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-[#1a1a1a] dark:text-white tracking-tight">
              {eligibleCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-bold mt-1">
              {((eligibleCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% Qualified for Draw
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm dark:shadow-xl relative border-t-4 border-t-[#FF1E1E]">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Winners</span>
            <Trophy className="w-4 h-4 text-[#FF1E1E]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-[#1a1a1a] dark:text-white tracking-tight">
              {winnerCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-bold mt-1">Confirmed Official Winners</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm dark:shadow-xl relative border-t-4 border-t-[#1a1a1a] dark:border-t-white">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Remaining Prizes</span>
            <Gift className="w-4 h-4 text-[#1a1a1a] dark:text-white" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-[#1a1a1a] dark:text-white tracking-tight">
              {remainingPrizes.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-bold mt-1">Valued at ₱{totalPrizeValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Winner Verification & Stub Dispatch Operations */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 sm:p-5 shadow-sm dark:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1a1a1a]/15 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#FF1E1E]" />
            <h3 className="font-black text-sm sm:text-base text-[#1a1a1a] dark:text-white uppercase tracking-wider">
              Winner Verification &amp; Stub Dispatch Desk
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('print-queue')}
            className="text-[11px] font-black uppercase text-[#FF1E1E] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            Open Print Queue Desk →
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Pending Print Card */}
          <button
            onClick={() => onNavigateToTab('print-queue')}
            className="text-left bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/50 p-3.5 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Pending Print</span>
              <Printer className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200 mt-2 font-mono">
              {pendingPrintCount}
            </div>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 uppercase font-bold mt-0.5">
              Stubs Awaiting Print
            </p>
          </button>

          {/* Printed Card */}
          <button
            onClick={() => onNavigateToTab('print-queue')}
            className="text-left bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700/50 p-3.5 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Printed</span>
              <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-200 mt-2 font-mono">
              {printedCount}
            </div>
            <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80 uppercase font-bold mt-0.5">
              Dispatched to Desk
            </p>
          </button>

          {/* Unclaimed Card */}
          <button
            onClick={() => onNavigateToTab('claims')}
            className="text-left bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-700/50 p-3.5 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Unclaimed</span>
              <Clock className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-900 dark:text-purple-200 mt-2 font-mono">
              {unclaimedCount}
            </div>
            <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 uppercase font-bold mt-0.5">
              Awaiting Claimants
            </p>
          </button>

          {/* Claimed Card */}
          <button
            onClick={() => onNavigateToTab('claims')}
            className="text-left bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700/50 p-3.5 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Claimed</span>
              <Trophy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-200 mt-2 font-mono">
              {claimedCount}
            </div>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 uppercase font-bold mt-0.5">
              Prizes Disbursed
            </p>
          </button>
        </div>
      </div>

      {/* District & Personnel Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Statistics Card */}
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-[#1a1a1a]/15 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF1E1E]" />
              <h3 className="font-black text-base sm:text-lg text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                5 Districts Participation
              </h3>
            </div>
            <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Simultaneous Cards</span>
          </div>

          <div className="space-y-3">
            {(['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'] as District[]).map((d) => {
              const data = districtCounts[d];
              const percent = ((data.total / Math.max(1, totalParticipants)) * 100).toFixed(0);

              return (
                <div key={d} className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider mb-1.5">
                    <span className="text-[#1a1a1a] dark:text-white">{d === 'PRIVATE' ? 'PRIVATE (ECCD + PRIVATE SCHOOL + LSB)' : `${d} DISTRICT`}</span>
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {data.total.toLocaleString()} <span className="text-neutral-500 font-normal">({percent}%)</span>
                    </span>
                  </div>

                  <div className="w-full bg-neutral-300 dark:bg-neutral-900 h-2 overflow-hidden flex">
                    <div
                      className="bg-[#FF1E1E] h-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold mt-1.5">
                    <span>Active pool: {data.total - data.winners} remaining</span>
                    <span className="text-[#1a1a1a] dark:text-white font-black">🏆 {data.winners} Winners</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personnel Type Statistics Card */}
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#1a1a1a]/15 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#FF1E1E]" />
                <h3 className="font-black text-base sm:text-lg text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                  Personnel Composition
                </h3>
              </div>
              <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Teaching &amp; Non-Teaching</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Teaching Personnel</div>
                <div className="text-2xl sm:text-3xl font-black text-[#1a1a1a] dark:text-white mt-1">
                  {teachingCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#FF1E1E] font-black uppercase tracking-wider mt-1">
                  {((teachingCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% of total
                </div>
                <div className="text-xs text-[#1a1a1a] dark:text-white font-black uppercase tracking-wider mt-2 pt-2 border-t border-[#1a1a1a]/15 dark:border-white/10">
                  🏆 {teachingWinners} Winners
                </div>
              </div>

              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">Non-Teaching Personnel</div>
                <div className="text-2xl sm:text-3xl font-black text-[#1a1a1a] dark:text-white mt-1">
                  {nonTeachingCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#FF1E1E] font-black uppercase tracking-wider mt-1">
                  {((nonTeachingCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% of total
                </div>
                <div className="text-xs text-[#1a1a1a] dark:text-white font-black uppercase tracking-wider mt-2 pt-2 border-t border-[#1a1a1a]/15 dark:border-white/10">
                  🏆 {nonTeachingWinners} Winners
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel & Draw Type Breakdown */}
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/20 dark:border-white/10 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10 text-xs">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 uppercase text-[10px] tracking-wider">
                Draw Breakdown:
              </span>
              <div className="flex items-center gap-3 font-mono font-black text-xs">
                <span className="text-orange-600 dark:text-orange-400">
                  ⚡ Live Stage: {winners.filter((w) => w.drawType !== 'PRE_DRAW' && !w.drawNumber.startsWith('PRE')).length}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  ✨ Pre-Drawn: {winners.filter((w) => w.drawType === 'PRE_DRAW' || w.drawNumber.startsWith('PRE')).length}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-sm text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                  Prize Draw Consoles
                </h4>
                <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-bold">
                  Conduct advance pre-draws or start the live stage display.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onNavigateToTab('predraw')}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all whitespace-nowrap"
                >
                  Pre-Draw Station →
                </button>
                <button
                  onClick={() => onNavigateToTab('raffle')}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all whitespace-nowrap"
                >
                  Live Stage →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
