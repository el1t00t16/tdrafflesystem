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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[var(--ink-muted)] uppercase font-bold">Claim View Mode:</span>
          <button
            onClick={() => setViewMode('FAST')}
            className={`px-3 py-1.5 rounded-lg uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'FAST'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Fast Realtime Station</span>
          </button>
          <button
            onClick={() => setViewMode('LEGACY')}
            className={`px-3 py-1.5 rounded-lg uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'LEGACY'
                ? 'bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--border)]'
                : 'bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
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
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
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

