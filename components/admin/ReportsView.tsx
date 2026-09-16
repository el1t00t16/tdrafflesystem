'use client';

import React from 'react';
import { District, Participant, Prize, Winner } from '../../lib/types';
import { Printer, BarChart3 } from 'lucide-react';

interface ReportsViewProps {
  participants: Participant[];
  prizes: Prize[];
  winners: Winner[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  participants,
  prizes,
  winners
}) => {
  const totalParticipants = participants.length;
  const eligibleParticipants = participants.filter((p) => p.eligible === 'ELIGIBLE').length;
  const totalWinners = winners.length;
  const totalPrizeUnits = prizes.reduce((s, p) => s + p.quantity, 0);
  const totalPrizeValue = prizes.reduce((s, p) => s + p.totalValue, 0);
  const claimedCount = winners.filter((w) => w.claimStatus === 'CLAIMED').length;
  const unclaimedCount = winners.filter((w) => w.claimStatus === 'UNCLAIMED').length;

  const districtWinners: Record<District, number> = {
    NORTH: 0,
    EAST: 0,
    WEST: 0,
    SOUTH: 0,
    PRIVATE: 0
  };
  winners.forEach((w) => {
    if (districtWinners[w.district] !== undefined) {
      districtWinners[w.district]++;
    }
  });

  const teachingWinners = winners.filter((w) => w.personnelType === 'TEACHING').length;
  const nonTeachingWinners = winners.filter((w) => w.personnelType === 'NON-TEACHING').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:text-black">
      {/* Header Bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-sm flex justify-between items-center print:border-none print:bg-transparent">
        <div>
          <h3 className="font-black text-xl text-[var(--ink)] uppercase tracking-tight leading-none print:text-black">
            OFFICIAL EVENT RAFFLE REPORT
          </h3>
          <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1 print:text-slate-600">
            Municipal Teachers&apos; Day 2026 • Malungon, Sarangani Province
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow transition-all flex items-center gap-2 print:hidden cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report</span>
        </button>
      </div>

      {/* 1. Overall Metrics Summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-sm print:border-gray-300">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--accent)] mb-4 pb-2 border-b border-[var(--border)] print:text-black">
          1. Overall Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Total Participants:</span>
            <span className="text-xl font-bold text-[var(--ink)] mt-1 block print:text-black">{totalParticipants.toLocaleString()}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Eligible Participants:</span>
            <span className="text-xl font-bold text-[var(--ink)] mt-1 block print:text-black">{eligibleParticipants.toLocaleString()}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Total Official Winners:</span>
            <span className="text-xl font-black text-[var(--accent)] mt-1 block print:text-black">{totalWinners}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Total Prize Value:</span>
            <span className="text-xl font-bold text-[var(--ink)] mt-1 block print:text-black">₱{totalPrizeValue.toLocaleString()}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Total Prize Units:</span>
            <span className="text-xl font-bold text-[var(--ink)] mt-1 block print:text-black">{totalPrizeUnits}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Claimed Prizes:</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block print:text-black">{claimedCount}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Unclaimed Prizes:</span>
            <span className="text-xl font-black text-amber-500 mt-1 block print:text-black">{unclaimedCount}</span>
          </div>
          <div className="rounded-lg bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] print:border-gray-200">
            <span className="text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-wider block">Prizes Remaining:</span>
            <span className="text-xl font-bold text-[var(--ink)] mt-1 block print:text-black">
              {prizes.reduce((s, p) => s + p.remainingQuantity, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. District & Personnel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-sm print:border-gray-300">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--accent)] mb-3 pb-2 border-b border-[var(--border)] print:text-black">
            2. Winners by District
          </h4>
          <div className="space-y-2 text-xs">
            {(['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'] as District[]).map((d) => (
              <div
                key={d}
                className="flex justify-between items-center rounded-lg bg-[var(--surface-elevated)] p-3 border border-[var(--border)] print:border-gray-200"
              >
                <span className="font-bold text-[var(--ink)] text-xs uppercase tracking-wider print:text-black">
                  {d === 'PRIVATE' ? 'PRIVATE (ECCD + PRIVATE SCHOOL + LSB):' : `${d} DISTRICT:`}
                </span>
                <span className="font-bold text-[var(--accent)] text-sm print:text-black">{districtWinners[d]} Winners</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-sm print:border-gray-300">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--accent)] mb-3 pb-2 border-b border-[var(--border)] print:text-black">
            3. Winners by Personnel Type
          </h4>
          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-[var(--surface-elevated)] p-3 border border-[var(--border)] print:border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-[var(--ink)] text-xs uppercase tracking-wider print:text-black block">TEACHING PERSONNEL:</span>
                <span className="text-[var(--ink-muted)] text-[11px]">Educators, Master Teachers, Head Teachers</span>
              </div>
              <span className="font-bold text-[var(--ink)] text-base print:text-black">{teachingWinners} Winners</span>
            </div>

            <div className="rounded-lg bg-[var(--surface-elevated)] p-3 border border-[var(--border)] print:border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-[var(--ink)] text-xs uppercase tracking-wider print:text-black block">NON-TEACHING PERSONNEL:</span>
                <span className="text-[var(--ink-muted)] text-[11px]">Registrars, Admin Officers, Security, Utility</span>
              </div>
              <span className="font-bold text-[var(--ink)] text-base print:text-black">{nonTeachingWinners} Winners</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Prize Disbursement Breakdown */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-sm print:border-gray-300">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--accent)] mb-3 pb-2 border-b border-[var(--border)] print:text-black">
          4. Prize Disbursement Status
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--ink-muted)] font-bold uppercase text-[10px] tracking-wider print:border-gray-300 print:text-black">
                <th className="py-2.5">Prize Name</th>
                <th className="py-2.5 text-center">Initial Qty</th>
                <th className="py-2.5 text-center">Drawn</th>
                <th className="py-2.5 text-center">Remaining</th>
                <th className="py-2.5 text-center">Claimed</th>
                <th className="py-2.5 text-center">Unclaimed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] print:divide-gray-200">
              {prizes.map((p) => {
                const prizeWinners = winners.filter((w) => w.prizeName === p.name);
                const prizeClaimed = prizeWinners.filter((w) => w.claimStatus === 'CLAIMED').length;
                const prizeUnclaimed = prizeWinners.filter((w) => w.claimStatus === 'UNCLAIMED').length;

                return (
                  <tr key={p.id} className="text-[var(--ink)] print:text-black">
                    <td className="py-2.5 font-bold uppercase">{p.name}</td>
                    <td className="py-2.5 text-center font-mono">{p.quantity}</td>
                    <td className="py-2.5 text-center font-mono font-bold text-[var(--ink)] print:text-black">{p.drawnQuantity}</td>
                    <td className="py-2.5 text-center font-mono text-[var(--ink-muted)]">{p.remainingQuantity}</td>
                    <td className="py-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold print:text-black">{prizeClaimed}</td>
                    <td className="py-2.5 text-center font-mono text-amber-500 font-bold print:text-black">{prizeUnclaimed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
