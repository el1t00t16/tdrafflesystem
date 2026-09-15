'use client';

import React, { useState } from 'react';
import { District, DistributionMode, Participant, Prize, RaffleLog, SystemSettings, Winner } from '../lib/types';
import { DashboardOverview } from './admin/DashboardOverview';
import { RaffleController } from './admin/RaffleController';
import { ParticipantsManager } from './admin/ParticipantsManager';
import { PrizesManager } from './admin/PrizesManager';
import { WinnersManager } from './admin/WinnersManager';
import { ClaimsStation } from './admin/ClaimsStation';
import { RaffleLogsView } from './admin/RaffleLogsView';
import { ReportsView } from './admin/ReportsView';
import { SettingsManager } from './admin/SettingsManager';
import {
  LayoutDashboard,
  PlayCircle,
  Users,
  Gift,
  Trophy,
  ShieldCheck,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react';

interface AdminDashboardProps {
  participants: Participant[];
  prizes: Prize[];
  winners: Winner[];
  logs: RaffleLog[];
  settings: SystemSettings;
  selectedPrizeId: string;
  onSelectPrize: (id: string) => void;
  onLaunchDraw: () => void;
  onToggleEligibility: (id: string) => void;
  onImportParticipants?: (newParticipants: Participant[]) => void;
  onAddPrize: (prize: Prize) => void;
  onDeletePrize?: (prizeId: string) => void;
  onClearAllPrizes?: () => void;
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
  onUpdateSettings: (settings: SystemSettings) => void;
  onPrepareNewEvent: () => void;
  eligiblePoolCount: number;
  isDrawing: boolean;
  distributionMode: DistributionMode;
  onDistributionModeChange: (mode: DistributionMode) => void;
  winnersPerDistrict: number;
  onWinnersPerDistrictChange: (count: number) => void;
  combinedWinnersCount: number;
  onCombinedWinnersCountChange: (count: number) => void;
  districtEligibleCounts: Record<District, number>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  participants,
  prizes,
  winners,
  logs,
  settings,
  selectedPrizeId,
  onSelectPrize,
  onLaunchDraw,
  onToggleEligibility,
  onImportParticipants,
  onAddPrize,
  onDeletePrize,
  onClearAllPrizes,
  onClaimPrize,
  onUnclaimPrize,
  onForfeitPrize,
  onUpdateSettings,
  onPrepareNewEvent,
  eligiblePoolCount,
  isDrawing,
  distributionMode,
  onDistributionModeChange,
  winnersPerDistrict,
  onWinnersPerDistrictChange,
  combinedWinnersCount,
  onCombinedWinnersCountChange,
  districtEligibleCounts
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'dash'
    | 'raffle'
    | 'participants'
    | 'prizes'
    | 'winners'
    | 'claims'
    | 'logs'
    | 'reports'
    | 'settings'
  >('dash');

  const navItems = [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'raffle', label: 'Raffle Draw', icon: PlayCircle },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'prizes', label: 'Prizes', icon: Gift },
    { id: 'winners', label: 'Winners', icon: Trophy },
    { id: 'claims', label: 'Prize Claims', icon: ShieldCheck },
    { id: 'logs', label: 'Raffle Log', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b-2 border-[#1a1a1a] scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-nav-${item.id}`}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all border border-[#1a1a1a] ${
                isActive
                  ? 'bg-[#1a1a1a] text-white shadow-sm'
                  : 'bg-white text-[#1a1a1a] hover:bg-[#f8f7f4]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ff6a00]' : 'text-[#1a1a1a]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'dash' && (
        <DashboardOverview
          participants={participants}
          prizes={prizes}
          winners={winners}
          onNavigateToTab={(tab) => setActiveTab(tab as typeof activeTab)}
        />
      )}

      {activeTab === 'raffle' && (
        <RaffleController
          prizes={prizes}
          selectedPrizeId={selectedPrizeId}
          onSelectPrize={onSelectPrize}
          onLaunchDraw={onLaunchDraw}
          eligiblePoolCount={eligiblePoolCount}
          isDrawing={isDrawing}
          distributionMode={distributionMode}
          onDistributionModeChange={onDistributionModeChange}
          winnersPerDistrict={winnersPerDistrict}
          onWinnersPerDistrictChange={onWinnersPerDistrictChange}
          combinedWinnersCount={combinedWinnersCount}
          onCombinedWinnersCountChange={onCombinedWinnersCountChange}
          districtEligibleCounts={districtEligibleCounts}
        />
      )}

      {activeTab === 'participants' && (
        <ParticipantsManager
          participants={participants}
          onToggleEligibility={onToggleEligibility}
          onImportParticipants={onImportParticipants}
        />
      )}

      {activeTab === 'prizes' && (
        <PrizesManager
          prizes={prizes}
          onAddPrize={onAddPrize}
          onDeletePrize={onDeletePrize}
          onClearAllPrizes={onClearAllPrizes}
        />
      )}

      {activeTab === 'winners' && <WinnersManager winners={winners} />}

      {activeTab === 'claims' && (
        <ClaimsStation
          winners={winners}
          onClaimPrize={onClaimPrize}
          onUnclaimPrize={onUnclaimPrize}
          onForfeitPrize={onForfeitPrize}
        />
      )}

      {activeTab === 'logs' && <RaffleLogsView logs={logs} />}

      {activeTab === 'reports' && (
        <ReportsView
          participants={participants}
          prizes={prizes}
          winners={winners}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsManager
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onPrepareNewEvent={onPrepareNewEvent}
          totalParticipants={participants.length}
          totalWinners={winners.length}
        />
      )}
    </div>
  );
};
