'use client';

import React, { useState } from 'react';
import { Winner } from '../../lib/types';
import { RealtimeClaimsWorkstation } from '../claims/RealtimeClaimsWorkstation';
import { PrizeClaimModule } from '../PrizeClaimModule';
import { ExternalLink, Zap, LayoutList } from 'lucide-react';

interface ClaimsStationProps {
  winners: Winner[];
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
}

export const ClaimsStation: React.FC<ClaimsStationProps> = ({
  winners,
  onClaimPrize,
  onUnclaimPrize,
  onForfeitPrize
}) => {
  const [viewMode, setViewMode] = useState<'FAST' | 'LEGACY'>('FAST');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/10 p-3 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-neutral-600 dark:text-neutral-400 uppercase font-bold">Claim View Mode:</span>
          <button
            onClick={() => setViewMode('FAST')}
            className={`px-3 py-1 uppercase font-bold flex items-center gap-1.5 transition-colors border border-[#1a1a1a] dark:border-transparent ${
              viewMode === 'FAST'
                ? 'bg-[#ff6a00] text-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast Realtime Station</span>
          </button>
          <button
            onClick={() => setViewMode('LEGACY')}
            className={`px-3 py-1 uppercase font-bold flex items-center gap-1.5 transition-colors border border-[#1a1a1a] dark:border-transparent ${
              viewMode === 'LEGACY'
                ? 'bg-[#1a1a1a] dark:bg-neutral-700 text-white'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Standard View</span>
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

      {viewMode === 'FAST' ? (
        <RealtimeClaimsWorkstation
          winners={winners}
          onClaimPrize={onClaimPrize}
          onUnclaimPrize={onUnclaimPrize}
          onForfeitPrize={onForfeitPrize}
          stationId="Admin Console Desk"
          officerName="Admin Lead"
        />
      ) : (
        <PrizeClaimModule
          winners={winners}
          onClaimPrize={onClaimPrize}
          onUnclaimPrize={onUnclaimPrize}
          onForfeitPrize={onForfeitPrize}
        />
      )}
    </div>
  );
};

