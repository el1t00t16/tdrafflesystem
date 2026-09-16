'use client';

import React from 'react';
import { Lock, ExternalLink, Palette } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../lib/theme';

interface HeaderProps {
  currentView: 'display' | 'admin' | 'claim' | 'attendance' | 'gas';
  onViewChange: (view: 'display' | 'admin' | 'claim' | 'attendance' | 'gas') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  unclaimedCount?: number;
  presentCount?: number;
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  unclaimedCount = 0,
  presentCount = 0,
  onLock
}) => {
  const [isMounted, setIsMounted] = React.useState(false);
  const { theme, setTheme, allThemes, themeConfig } = useTheme();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCycleTheme = () => {
    const currentIndex = allThemes.findIndex((t) => t.id === theme);
    const nextIndex = (currentIndex + 1) % allThemes.length;
    setTheme(allThemes[nextIndex].id);
  };

  return (
    <>
      {/* Technical Navigation Bar (Variation 3 .admin-nav) */}
      <div className="admin-nav bg-[#1a1a1a] px-4 sm:px-12 py-2 flex flex-wrap items-center justify-between text-[#f8f7f4] border-b border-black select-none">
        <div className="flex items-center gap-1 flex-wrap">
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
          <div className="flex items-center">
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
            <a
              href="/attendance"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Standalone Attendance Scanner Station in new window (/attendance)"
              className="p-1 hover:text-[#22c55e] text-neutral-400 transition-colors ml-0.5"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center">
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
            <a
              href="/claims"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Standalone Prize Claim Workstation in new window (/claims)"
              className="p-1 hover:text-[#ff6a00] text-neutral-400 transition-colors ml-0.5"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            id="nav-btn-gas"
            onClick={() => onViewChange('gas')}
            className={`nav-item ${currentView === 'gas' ? 'active' : ''}`}
          >
            Google Apps Script
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isMounted && (
            <div
              className={`flex items-center gap-1.5 font-mono text-[9px] px-2 py-1 border transition-colors ${
                isSupabaseConfigured()
                  ? 'border-emerald-500/30 text-emerald-300 bg-emerald-950/20'
                  : 'border-yellow-500/30 text-yellow-300 bg-yellow-950/20'
              }`}
              title={isSupabaseConfigured() ? 'Connected to Supabase Cloud' : 'Running in Local/Offline Mode'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConfigured() ? 'bg-[#22c55e] animate-pulse' : 'bg-yellow-400'
                }`}
              />
              <span className="font-bold uppercase tracking-wider">
                {isSupabaseConfigured() ? 'Cloud Live' : 'Offline Mode'}
              </span>
            </div>
          )}

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

          {/* Quick Theme Switcher Button */}
          {isMounted && (
            <button
              id="header-theme-toggle"
              onClick={handleCycleTheme}
              className="nav-item flex items-center gap-1.5 border border-white/20 hover:border-[var(--accent)] hover:text-white transition-all"
              title={`Active Visual Theme: ${themeConfig.name} (${themeConfig.tag})\nClick to cycle palettes instantly.`}
            >
              <Palette className="w-3 h-3 text-[var(--accent)]" />
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40 inline-block shrink-0 shadow-xs"
                style={{ backgroundColor: themeConfig.colors.accent }}
              />
              <span className="hidden sm:inline font-mono text-[9px] font-bold uppercase tracking-wider">
                {themeConfig.name.split('&')[0].trim()}
              </span>
            </button>
          )}

          {onLock && (
            <button
              id="header-lock-toggle"
              onClick={onLock}
              className="nav-item flex items-center gap-1 text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/60 bg-red-950/20"
              title="Lock Master Admin Console"
            >
              <Lock className="w-3 h-3 text-[#FF1E1E]" />
              <span>Lock Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Editorial Style Layout Header */}
      <header className="bg-[var(--header-bg)] text-[var(--ink)] px-6 sm:px-12 py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between sm:items-end gap-3 border-b-2 border-[var(--border)] transition-colors">
        <div className="header-title">
          <div className="header-meta font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] mb-0.5">
            SARANGANI PROVINCE / REGION XII
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold uppercase leading-none text-[var(--ink)] -mb-0.5">
            Teachers&apos; Day 2026
          </h1>
        </div>
        <div className="header-meta font-mono text-[10px] sm:text-xs uppercase tracking-wider text-left sm:text-right leading-relaxed text-[var(--ink-muted)]">
          MUNICIPALITY OF MALUNGON<br />
          GRAND RAFFLE SYSTEM V2.6
        </div>
      </header>
    </>
  );
};

