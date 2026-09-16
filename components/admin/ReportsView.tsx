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
    <div className="space-y-6 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5] print:bg-white print:text-black print:space-y-4">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: letter portrait;
              margin: 0.4in;
            }
            body {
              background: white !important;
              color: black !important;
            }
            .print-card {
              border: 1px solid black !important;
              box-shadow: none !important;
              background: white !important;
              page-break-inside: avoid !important;
            }
            .print-table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .print-table th, .print-table td {
              border: 1px solid black !important;
              color: black !important;
            }
          }
        `
      }} />

      {/* Screen Header Bar */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl flex justify-between items-center relative border-t-4 border-t-[#FF1E1E] print:hidden">
        <div>
          <h3 className="font-black text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
            OFFICIAL EVENT RAFFLE REPORT
          </h3>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
            Municipal Teachers&apos; Day 2026 • Malungon, Sarangani Province
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2.5 bg-[#FF1E1E] hover:bg-[#ff3838] text-white font-black text-xs uppercase tracking-wider shadow transition-all flex items-center gap-2 rounded-none cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Print-Only Official Government Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-xs uppercase font-serif tracking-widest">Republic of the Philippines</p>
        <p className="text-sm font-bold uppercase font-serif">Department of Education • Region XII</p>
        <p className="text-xs uppercase font-serif">Schools Division of Sarangani • Municipality of Malungon</p>
        <h1 className="text-xl font-black uppercase tracking-tight mt-2">
          OFFICIAL EVENT RAFFLE REPORT &amp; AUDIT SUMMARY
        </h1>
        <p className="text-xs uppercase font-mono font-bold mt-0.5">
          Municipal Teachers&apos; Day 2026 Celebration • Grand Raffle System
        </p>
        <p className="text-[10px] text-neutral-600 font-mono mt-1">
          Generated on: {new Date().toLocaleString()} • Certified Official Audit Report
        </p>
      </div>

      {/* 1. Overall Metrics Summary */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-xl print:border-gray-300">
        <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-4 pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10 print:text-black">
          1. Overall Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Total Participants:</span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white mt-1 block print:text-black">{totalParticipants.toLocaleString()}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Eligible Participants:</span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white mt-1 block print:text-black">{eligibleParticipants.toLocaleString()}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Total Official Winners:</span>
            <span className="text-xl font-black text-[#FF1E1E] mt-1 block print:text-black">{totalWinners}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Total Prize Value:</span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white mt-1 block print:text-black">₱{totalPrizeValue.toLocaleString()}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Total Prize Units:</span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white mt-1 block print:text-black">{totalPrizeUnits}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Claimed Prizes:</span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white mt-1 block print:text-black">{claimedCount}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Unclaimed Prizes:</span>
            <span className="text-xl font-black text-[#FF1E1E] mt-1 block print:text-black">{unclaimedCount}</span>
          </div>
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3.5 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200">
            <span className="text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase tracking-wider block">Prizes Remaining:</span>
            <span className="text-xl font-black text-[#1a1a1a] dark:text-white mt-1 block print:text-black">
              {prizes.reduce((s, p) => s + p.remainingQuantity, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. District & Personnel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-xl print:border-gray-300">
          <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3 pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10 print:text-black">
            2. Winners by District
          </h4>
          <div className="space-y-2 text-xs">
            {(['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'] as District[]).map((d) => (
              <div
                key={d}
                className="flex justify-between items-center bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200"
              >
                <span className="font-black text-[#1a1a1a] dark:text-white text-xs uppercase tracking-wider print:text-black">
                  {d === 'PRIVATE' ? 'PRIVATE (ECCD + PRIVATE SCHOOL + LSB):' : `${d} DISTRICT:`}
                </span>
                <span className="font-black text-[#FF1E1E] text-sm print:text-black">{districtWinners[d]} Winners</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-xl print:border-gray-300">
          <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3 pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10 print:text-black">
            3. Winners by Personnel Type
          </h4>
          <div className="space-y-3 text-xs">
            <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-black text-[#1a1a1a] dark:text-white text-xs uppercase tracking-wider print:text-black block">TEACHING PERSONNEL:</span>
                <span className="text-neutral-600 dark:text-neutral-400 text-[11px]">Educators, Master Teachers, Head Teachers</span>
              </div>
              <span className="font-black text-[#1a1a1a] dark:text-white text-base print:text-black">{teachingWinners} Winners</span>
            </div>

            <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10 print:border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-black text-[#1a1a1a] dark:text-white text-xs uppercase tracking-wider print:text-black block">NON-TEACHING PERSONNEL:</span>
                <span className="text-neutral-600 dark:text-neutral-400 text-[11px]">Registrars, Admin Officers, Security, Utility</span>
              </div>
              <span className="font-black text-[#1a1a1a] dark:text-white text-base print:text-black">{nonTeachingWinners} Winners</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Prize Disbursement Breakdown */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-xl print:border-gray-300">
        <h4 className="font-black text-xs uppercase tracking-widest text-[#FF1E1E] mb-3 pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10 print:text-black">
          4. Prize Disbursement Status
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1a1a1a]/20 dark:border-white/20 text-neutral-600 dark:text-neutral-400 font-black uppercase text-[10px] tracking-wider print:border-gray-300 print:text-black">
                <th className="py-2.5">Prize Name</th>
                <th className="py-2.5 text-center">Initial Qty</th>
                <th className="py-2.5 text-center">Drawn</th>
                <th className="py-2.5 text-center">Remaining</th>
                <th className="py-2.5 text-center">Claimed</th>
                <th className="py-2.5 text-center">Unclaimed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5 print:divide-gray-200 font-sans">
              {prizes.map((p) => {
                const prizeWinners = winners.filter((w) => w.prizeName === p.name);
                const prizeClaimed = prizeWinners.filter((w) => w.claimStatus === 'CLAIMED').length;
                const prizeUnclaimed = prizeWinners.filter((w) => w.claimStatus === 'UNCLAIMED').length;

                return (
                  <tr key={p.id} className="text-[#1a1a1a] dark:text-white print:text-black">
                    <td className="py-2.5 font-bold uppercase">{p.name}</td>
                    <td className="py-2.5 text-center font-mono">{p.quantity}</td>
                    <td className="py-2.5 text-center font-mono font-black text-[#1a1a1a] dark:text-white print:text-black">{p.drawnQuantity}</td>
                    <td className="py-2.5 text-center font-mono text-neutral-600 dark:text-neutral-400">{p.remainingQuantity}</td>
                    <td className="py-2.5 text-center font-mono text-[#1a1a1a] dark:text-white font-bold print:text-black">{prizeClaimed}</td>
                    <td className="py-2.5 text-center font-mono text-[#FF1E1E] font-black print:text-black">{prizeUnclaimed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print-Only Official Audit Certification Signatures */}
      <div className="hidden print:grid grid-cols-3 gap-8 mt-8 pt-4 border-t-2 border-black text-center text-xs">
        <div>
          <div className="border-b border-black h-10"></div>
          <p className="font-bold uppercase mt-1">Prepared By:</p>
          <p className="text-[10px] text-neutral-600 uppercase">Raffle Committee Secretariat</p>
        </div>
        <div>
          <div className="border-b border-black h-10"></div>
          <p className="font-bold uppercase mt-1">Certified Correct:</p>
          <p className="text-[10px] text-neutral-600 uppercase">Raffle Committee Chair</p>
        </div>
        <div>
          <div className="border-b border-black h-10"></div>
          <p className="font-bold uppercase mt-1">Attested &amp; Observed:</p>
          <p className="text-[10px] text-neutral-600 uppercase">LGU Representative</p>
        </div>
      </div>
    </div>
  );
};
