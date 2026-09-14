'use client';

import React from 'react';
import { Winner } from '../../lib/types';
import { PrizeClaimModule } from '../PrizeClaimModule';

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
}

export const ClaimsStation: React.FC<ClaimsStationProps> = ({
  winners,
  onClaimPrize,
  onUnclaimPrize
}) => {
  return (
    <PrizeClaimModule
      winners={winners}
      onClaimPrize={onClaimPrize}
      onUnclaimPrize={onUnclaimPrize}
    />
  );
};
