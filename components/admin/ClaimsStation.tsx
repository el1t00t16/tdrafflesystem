'use client';

import React, { useState } from 'react';
import { Winner, Prize, RaffleLog } from '../../lib/types';
import { RealtimeClaimsWorkstation } from '../claims/RealtimeClaimsWorkstation';
import { PrizeClaimModule } from '../PrizeClaimModule';
import { PrintQueueStation } from './PrintQueueStation';
import { ExternalLink, Zap, LayoutList, Printer } from 'lucide-react';

interface ClaimsStationProps {
  winners: Winner[];
  prizes?: Prize[];
  logs?: RaffleLog[];
  onClaimPrize: (
    winnerId: string,
    claimedBy: string,
    details?: {
      idPresented?: string;
      isProxyClaim?: boolean;
      proxyName?: string;
      proxyRelationship?: string;
      claimNotes?: string;
    }
  ) => void;
  onUnclaimPrize?: (winnerId: string) => void;
  onForfeitPrize?: (winnerId: string, reason?: string) => void;
  onMarkAsPrinted?: (winnerId: string) => void;
  onMarkBatchAsPrinted?: (winnerIds: string[]) => void;
  onRequeueWinner?: (winnerId: string) => void;
}

export const ClaimsStation: React.FC<ClaimsStationProps> = ({
  winners,
  prizes = [],
  logs = [],
  onClaimPrize,
  onUnclaimPrize,
  onForfeitPrize,
  onMarkAsPrinted,
  onMarkBatchAsPrinted,
  onRequeueWinner
}) => {
  const [viewMode, setViewMode] = useState<'FAST' | 'LEGACY' | 'PRINT_QUEUE'>('FAST');
  const pendingPrintCount = winners.filter((w) => !w.isPrinted).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/10 p-3 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-600 dark:text-neutral-400 uppercase font-bold">Claim View Mode:</span>
          <button
            onClick={() => setViewMode('FAST')}
            className={`px-3 py-1 uppercase font-bold flex items-center gap-1.5 transition-colors border border-[#1a1a1a] dark:border-transparent cursor-pointer ${
              viewMode === 'FAST'
                ? 'bg-[#ff6a00] text-black font-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast Realtime Station</span>
          </button>
          <button
            onClick={() => setViewMode('LEGACY')}
            className={`px-3 py-1 uppercase font-bold flex items-center gap-1.5 transition-colors border border-[#1a1a1a] dark:border-transparent cursor-pointer ${
              viewMode === 'LEGACY'
                ? 'bg-[#1a1a1a] dark:bg-neutral-700 text-white font-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Standard View</span>
          </button>
          <button
            onClick={() => setViewMode('PRINT_QUEUE')}
            className={`px-3 py-1 uppercase font-bold flex items-center gap-1.5 transition-colors border border-[#1a1a1a] dark:border-transparent cursor-pointer ${
              viewMode === 'PRINT_QUEUE'
                ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black font-black shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Printer className={`w-3.5 h-3.5 ${viewMode === 'PRINT_QUEUE' ? 'text-[#ff6a00]' : 'text-neutral-500'}`} />
            <span>Winner Print Queue</span>
            {pendingPrintCount > 0 && (
              <span className="bg-[#FF1E1E] text-white text-[9px] px-1.5 py-0.2 rounded-xs font-mono font-black animate-pulse">
                {pendingPrintCount}
              </span>
            )}
          </button>
        </div>

        <a
          href="/claims"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-[#ff6a00]/15 hover:bg-[#ff6a00]/30 border border-[#ff6a00]/40 text-[#ff6a00] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <span>Launch Dedicated Station Window (/claims)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {viewMode === 'FAST' && (
        <RealtimeClaimsWorkstation
          winners={winners}
          onClaimPrize={onClaimPrize}
          onUnclaimPrize={onUnclaimPrize}
          onForfeitPrize={onForfeitPrize}
          stationId="Admin Console Desk"
          officerName="Admin Lead"
          onOpenPrintQueue={() => setViewMode('PRINT_QUEUE')}
          onMarkAsPrinted={onMarkAsPrinted}
        />
      )}

      {viewMode === 'LEGACY' && (
        <PrizeClaimModule
          winners={winners}
          onClaimPrize={onClaimPrize}
          onUnclaimPrize={onUnclaimPrize}
          onForfeitPrize={onForfeitPrize}
        />
      )}

      {viewMode === 'PRINT_QUEUE' && (
        <PrintQueueStation
          winners={winners}
          prizes={prizes}
          logs={logs}
          onMarkAsPrinted={onMarkAsPrinted}
          onMarkBatchAsPrinted={onMarkBatchAsPrinted}
          onRequeueWinner={onRequeueWinner}
        />
      )}
    </div>
  );
};

