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
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-card)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between shadow-lg relative border-t-4 border-t-[var(--accent)]">
          <div className="flex items-center justify-between text-[var(--ink-muted)]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Participants</span>
            <Users className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-display font-black text-[var(--ink)] tracking-tight">
              {totalParticipants.toLocaleString()}
            </div>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider font-bold mt-1">Malungon Educators Pool</p>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between shadow-lg relative border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between text-[var(--ink-muted)]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Eligible Pool</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-display font-black text-[var(--ink)] tracking-tight">
              {eligibleCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold mt-1">
              {((eligibleCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% Qualified for Draw
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between shadow-lg relative border-t-4 border-t-[var(--accent)]">
          <div className="flex items-center justify-between text-[var(--ink-muted)]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Winners</span>
            <Trophy className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-display font-black text-[var(--ink)] tracking-tight">
              {winnerCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider font-bold mt-1">Confirmed Official Winners</p>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between shadow-lg relative border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between text-[var(--ink-muted)]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Remaining Prizes</span>
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-display font-black text-[var(--ink)] tracking-tight">
              {remainingPrizes.toLocaleString()}
            </div>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider font-bold mt-1">Valued at ₱{totalPrizeValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* District & Personnel Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Statistics Card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border)] p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-display font-black text-base sm:text-lg text-[var(--ink)] uppercase tracking-tight">
                5 Districts Participation
              </h3>
            </div>
            <span className="text-[10px] font-black text-[var(--ink-muted)] uppercase tracking-widest">Simultaneous Cards</span>
          </div>

          <div className="space-y-3">
            {(['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'] as District[]).map((d) => {
              const data = districtCounts[d];
              const percent = ((data.total / Math.max(1, totalParticipants)) * 100).toFixed(0);

              return (
                <div key={d} className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-lg">
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider mb-1.5">
                    <span className="text-[var(--ink)]">{d === 'PRIVATE' ? 'PRIVATE (ECCD + PRIVATE SCHOOL + LSB)' : `${d} DISTRICT`}</span>
                    <span className="text-[var(--ink)]">
                      {data.total.toLocaleString()} <span className="text-[var(--ink-muted)] font-normal">({percent}%)</span>
                    </span>
                  </div>

                  <div className="w-full bg-[var(--surface-elevated)] h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[var(--accent)] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[var(--ink-muted)] uppercase font-bold mt-1.5">
                    <span>Active pool: {data.total - data.winners} remaining</span>
                    <span className="text-[var(--accent)] font-black">🏆 {data.winners} Winners</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personnel Type Statistics Card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border)] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-display font-black text-base sm:text-lg text-[var(--ink)] uppercase tracking-tight">
                  Personnel Composition
                </h3>
              </div>
              <span className="text-[10px] font-black text-[var(--ink-muted)] uppercase tracking-widest">Teaching &amp; Non-Teaching</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-lg">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)]">Teaching Personnel</div>
                <div className="text-2xl sm:text-3xl font-display font-black text-[var(--ink)] mt-1">
                  {teachingCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--accent)] font-black uppercase tracking-wider mt-1">
                  {((teachingCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% of total
                </div>
                <div className="text-xs text-[var(--ink)] font-black uppercase tracking-wider mt-2 pt-2 border-t border-[var(--border)]">
                  🏆 {teachingWinners} Winners
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-lg">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ink-muted)]">Non-Teaching Personnel</div>
                <div className="text-2xl sm:text-3xl font-display font-black text-[var(--ink)] mt-1">
                  {nonTeachingCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-[var(--accent)] font-black uppercase tracking-wider mt-1">
                  {((nonTeachingCount / Math.max(1, totalParticipants)) * 100).toFixed(1)}% of total
                </div>
                <div className="text-xs text-[var(--ink)] font-black uppercase tracking-wider mt-2 pt-2 border-t border-[var(--border)]">
                  🏆 {nonTeachingWinners} Winners
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <div>
              <h4 className="font-display font-black text-sm text-[var(--ink)] uppercase tracking-tight">Ready for the Next Prize Draw?</h4>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider font-bold">
                Launch the simultaneous 5-district raffle console.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('raffle')}
              className="px-5 py-2.5 bg-[var(--accent)] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider shadow-md rounded-lg transition-all whitespace-nowrap"
            >
              Go to Raffle Console →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
