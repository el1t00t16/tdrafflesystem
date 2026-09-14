'use client';

import React from 'react';
import { District, Participant, Prize, Winner } from '../../lib/types';
import { Users, CheckCircle2, Trophy, Gift, Building2, GraduationCap } from 'lucide-react';

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

  // District breakdowns
  const districtCounts: Record<District, { total: number; winners: number }> = {
    NORTH: { total: 0, winners: 0 },
    SOUTH: { total: 0, winners: 0 },
    EAST: { total: 0, winners: 0 },
    WEST: { total: 0, winners: 0 },
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
    <div className="space-y-6 animate-fade-in">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative border-t-2 border-t-[#FF1E1E]">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Participants</span>
            <Users className="w-4 h-4 text-[#FF1E1E]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {totalParticipants.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mt-1">Malungon Educators Pool</p>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative border-t-2 border-t-white">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Eligible Pool</span>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {eligibleCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mt-1">
              {((eligibleCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% Qualified for Draw
            </p>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative border-t-2 border-t-[#FF1E1E]">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Winners</span>
            <Trophy className="w-4 h-4 text-[#FF1E1E]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {winnerCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mt-1">Confirmed Official Winners</p>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative border-t-2 border-t-white">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Remaining Prizes</span>
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {remainingPrizes.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mt-1">Valued at ₱{totalPrizeValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* District & Personnel Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Statistics Card */}
        <div className="bg-[#121212] border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF1E1E]" />
              <h3 className="font-black text-base sm:text-lg text-white uppercase tracking-tight">
                5 Districts Participation
              </h3>
            </div>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Simultaneous Cards</span>
          </div>

          <div className="space-y-3">
            {(['NORTH', 'SOUTH', 'EAST', 'WEST', 'PRIVATE'] as District[]).map((d) => {
              const data = districtCounts[d];
              const percent = ((data.total / Math.max(1, totalParticipants)) * 100).toFixed(0);

              return (
                <div key={d} className="bg-neutral-950 border border-white/10 p-3">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider mb-1.5">
                    <span className="text-white">{d} DISTRICT</span>
                    <span className="text-neutral-300">
                      {data.total.toLocaleString()} <span className="text-neutral-500 font-normal">({percent}%)</span>
                    </span>
                  </div>

                  <div className="w-full bg-neutral-900 h-2 overflow-hidden flex">
                    <div
                      className="bg-[#FF1E1E] h-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-neutral-400 uppercase font-bold mt-1.5">
                    <span>Active pool: {data.total - data.winners} remaining</span>
                    <span className="text-white font-black">🏆 {data.winners} Winners</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personnel Type Statistics Card */}
        <div className="bg-[#121212] border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#FF1E1E]" />
                <h3 className="font-black text-base sm:text-lg text-white uppercase tracking-tight">
                  Personnel Composition
                </h3>
              </div>
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Teaching &amp; Non-Teaching</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-neutral-950 border border-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Teaching Personnel</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {teachingCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#FF1E1E] font-black uppercase tracking-wider mt-1">
                  {((teachingCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% of total
                </div>
                <div className="text-xs text-white font-black uppercase tracking-wider mt-2 pt-2 border-t border-white/10">
                  🏆 {teachingWinners} Winners
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Non-Teaching Personnel</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {nonTeachingCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#FF1E1E] font-black uppercase tracking-wider mt-1">
                  {((nonTeachingCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% of total
                </div>
                <div className="text-xs text-white font-black uppercase tracking-wider mt-2 pt-2 border-t border-white/10">
                  🏆 {nonTeachingWinners} Winners
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-neutral-950 border border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-sm text-white uppercase tracking-tight">Ready for the Next Prize Draw?</h4>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                Launch the simultaneous 5-district raffle console.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('raffle')}
              className="px-4 py-2.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all whitespace-nowrap"
            >
              Go to Raffle Console →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
