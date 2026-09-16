'use client';

import React from 'react';
import { RaffleLog } from '../../lib/types';
import { FileText, Shield, CheckCircle, RotateCcw, XCircle } from 'lucide-react';

interface RaffleLogsViewProps {
  logs: RaffleLog[];
}

export const RaffleLogsView: React.FC<RaffleLogsViewProps> = ({ logs }) => {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg sm:text-xl text-[var(--ink)] uppercase tracking-tight leading-none">RAFFLE AUDIT LOG</h3>
            <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
              Immutable log of every draw attempt, confirmed result, or discarded redraw
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] uppercase font-bold tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-[var(--border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--ink-muted)] font-bold uppercase tracking-wider">
                    No raffle rounds logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-[var(--surface-elevated)] transition-colors">
                    <td className="p-3 font-mono font-bold text-[var(--ink)]">{log.logId}</td>
                    <td className="p-3 font-mono font-bold text-[var(--accent)]">{log.drawNumber}</td>
                    <td className="p-3 text-[var(--ink-muted)] font-mono text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-bold text-[var(--ink)] uppercase whitespace-nowrap">{log.prizeName}</td>
                    <td className="p-3 text-center font-bold text-[var(--ink)]">
                      {log.numberOfWinners}
                    </td>
                    <td className="p-3 text-center text-[var(--ink-muted)] font-mono">
                      {log.eligiblePoolSize.toLocaleString()}
                    </td>
                    <td className="p-3 text-[var(--ink-muted)] font-mono text-[11px] max-w-xs truncate">
                      {log.winnerIds.join(', ')}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          log.status === 'CONFIRMED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : log.status === 'REDRAWN'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                        }`}
                      >
                        {log.status === 'CONFIRMED' && <CheckCircle className="w-3 h-3" />}
                        {log.status === 'REDRAWN' && <RotateCcw className="w-3 h-3" />}
                        {log.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="p-3 text-[var(--ink-muted)] text-[11px] uppercase font-bold">{log.admin}</td>
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
