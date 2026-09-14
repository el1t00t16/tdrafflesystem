'use client';

import React from 'react';

interface HeaderProps {
  currentView: 'display' | 'admin' | 'claim' | 'attendance' | 'gas';
  onViewChange: (view: 'display' | 'admin' | 'claim' | 'attendance' | 'gas') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  unclaimedCount?: number;
  presentCount?: number;
}

const emptySubscribe = () => () => {};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  unclaimedCount = 0,
  presentCount = 0
}) => {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <>
      {/* Technical Navigation Bar (Variation 3 .admin-nav) */}
      <div className="admin-nav bg-[#1a1a1a] px-4 sm:px-12 py-2 flex flex-wrap items-center justify-between text-[#f8f7f4] border-b border-black select-none">
        <div className="flex items-center gap-1">
          <button
            id="nav-btn-display"
            onClick={() => onViewChange('display')}
            className={`nav-item ${currentView === 'display' ? 'active' : ''}`}
          >
            Projector
          </button>
          <button
            id="nav-btn-admin"
            onClick={() => onViewChange('admin')}
            className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}
          >
            Admin Console
          </button>
          <button
            id="nav-btn-attendance"
            onClick={() => onViewChange('attendance')}
            className={`nav-item flex items-center gap-1.5 ${currentView === 'attendance' ? 'active' : ''}`}
          >
            <span>Attendance &amp; Gate</span>
            {isMounted && (presentCount !== undefined && presentCount > 0) && (
              <span
                suppressHydrationWarning
                className="font-mono text-[9px] bg-[#22c55e] text-black px-1.5 py-0.2 rounded-xs font-bold"
              >
                {presentCount}
              </span>
            )}
          </button>
          <button
            id="nav-btn-claim"
            onClick={() => onViewChange('claim')}
            className={`nav-item flex items-center gap-1.5 ${currentView === 'claim' ? 'active' : ''}`}
          >
            <span>Prize Claim</span>
            {isMounted && unclaimedCount > 0 && (
              <span
                suppressHydrationWarning
                className="font-mono text-[9px] bg-[#ff6a00] text-white px-1.5 py-0.2 rounded-xs font-bold"
              >
                {unclaimedCount}
              </span>
            )}
          </button>
          <button
            id="nav-btn-gas"
            onClick={() => onViewChange('gas')}
            className={`nav-item ${currentView === 'gas' ? 'active' : ''}`}
          >
            Google Apps Script
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="header-sound-toggle"
            onClick={onToggleSound}
            className="nav-item"
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
          >
            {soundEnabled ? 'Audio ON' : 'Audio OFF'}
          </button>
          <button
            id="header-fullscreen-toggle"
            onClick={onToggleFullscreen}
            className="nav-item"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Editorial Style Layout Header */}
      <header className="bg-[#f8f7f4] text-[#1a1a1a] px-6 sm:px-12 py-6 sm:py-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b-2 border-[#1a1a1a]">
        <div className="header-title">
          <div className="header-meta font-mono text-[11px] uppercase tracking-widest text-[#1a1a1a]/60 mb-1">
            SARANGANI PROVINCE / REGION XII
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-none text-[#1a1a1a] -mb-1">
            Teachers&apos; Day 2026
          </h1>
        </div>
        <div className="header-meta font-mono text-[10px] sm:text-xs uppercase tracking-wider text-left sm:text-right leading-relaxed text-[#1a1a1a]/70">
          MUNICIPALITY OF MALUNGON<br />
          GRAND RAFFLE SYSTEM V2.6
        </div>
      </header>
    </>
  );
};

