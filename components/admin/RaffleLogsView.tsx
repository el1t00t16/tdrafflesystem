'use client';

import React from 'react';
import { RaffleLog } from '../../lib/types';
import { FileText, Shield, CheckCircle, RotateCcw, XCircle } from 'lucide-react';

interface RaffleLogsViewProps {
  logs: RaffleLog[];
}

export const RaffleLogsView: React.FC<RaffleLogsViewProps> = ({ logs }) => {
  return (
    <div className="space-y-4 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl relative border-t-4 border-t-[#FF1E1E]">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-[#FF1E1E]" />
          <div>
            <h3 className="font-black text-lg sm:text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">RAFFLE AUDIT LOG</h3>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
              Immutable log of every draw attempt, confirmed result, or discarded redraw
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#1a1a1a] dark:border-white/20 text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                <th className="p-3">Log ID</th>
                <th className="p-3">Draw #</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Prize</th>
                <th className="p-3 text-center">Winners</th>
                <th className="p-3 text-center">Eligible Pool</th>
                <th className="p-3">Winner Participant IDs</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5 font-sans">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-neutral-500 font-bold uppercase tracking-wider">
                    No raffle rounds logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="p-3 font-mono font-black text-[#1a1a1a] dark:text-white">{log.logId}</td>
                    <td className="p-3 font-mono font-black text-[#FF1E1E]">{log.drawNumber}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">{log.prizeName}</td>
                    <td className="p-3 text-center font-black text-[#1a1a1a] dark:text-white">
                      {log.numberOfWinners}
                    </td>
                    <td className="p-3 text-center text-neutral-600 dark:text-neutral-400 font-mono">
                      {log.eligiblePoolSize.toLocaleString()}
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono text-[11px] max-w-xs truncate">
                      {log.winnerIds.join(', ')}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest inline-flex items-center gap-1 ${
                          log.status === 'CONFIRMED'
                            ? 'bg-[#1a1a1a] dark:bg-neutral-900 text-white border border-[#1a1a1a] dark:border-white/30'
                            : log.status === 'REDRAWN'
                            ? 'bg-[#FF1E1E]/10 dark:bg-[#FF1E1E]/20 text-[#FF1E1E] border border-[#FF1E1E]'
                            : 'bg-neutral-200 dark:bg-neutral-950 text-neutral-500 border border-[#1a1a1a]/20 dark:border-white/10'
                        }`}
                      >
                        {log.status === 'CONFIRMED' && <CheckCircle className="w-3 h-3 text-[#22c55e]" />}
                        {log.status === 'REDRAWN' && <RotateCcw className="w-3 h-3" />}
                        {log.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 text-[11px] uppercase font-bold">{log.admin}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
