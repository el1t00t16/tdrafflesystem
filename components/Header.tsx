'use client';

import React, { useState } from 'react';
import {
  Lock,
  ExternalLink,
  Palette,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  Code2,
  ChevronDown
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTheme, ThemeId } from '../lib/theme';

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
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const { theme, setTheme, allThemes, themeConfig, isDark, toggleDarkMode } = useTheme();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="w-full bg-[var(--header-bg)] border-b-2 border-[var(--border)] px-3 sm:px-6 py-2 sm:py-2.5 transition-colors sticky top-0 z-40 select-none shadow-md">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Event Branding & Live Cloud Indicator */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shadow-xs">
              <span className="text-base font-black">🏛️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg sm:text-xl font-black uppercase tracking-tight text-[var(--ink)] leading-none">
                  Teachers&apos; Day 2026
                </span>
                <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--border-accent)] hidden sm:inline-block">
                  V2.6
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-muted)] flex items-center gap-1.5 mt-0.5">
                <span>MALUNGON, SARANGANI</span>
                <span>•</span>
                <span className="text-[var(--accent)] font-semibold">REGION XII</span>
              </div>
            </div>
          </div>

          {/* Cloud Live / Offline Status */}
          {isMounted && (
            <div
              className={`flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-full border transition-all ${
                isSupabaseConfigured()
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30'
                  : 'border-amber-500/40 text-amber-300 bg-amber-950/30'
              }`}
              title={isSupabaseConfigured() ? 'Connected to Supabase Realtime Database' : 'Running in Local Browser Storage mode'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold uppercase tracking-wider">
                {isSupabaseConfigured() ? 'Cloud Live' : 'Offline'}
              </span>
            </div>
          )}
        </div>

        {/* Center: Segmented Navigation Pills */}
        <nav className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-none" aria-label="Main Navigation">
          {/* 1. Projector Stage */}
          <button
            id="nav-btn-display"
            type="button"
            onClick={() => onViewChange('display')}
            className={`nav-item ${currentView === 'display' ? 'active' : ''}`}
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span>Projector</span>
          </button>

          {/* 2. Admin Console */}
          <button
            id="nav-btn-admin"
            type="button"
            onClick={() => onViewChange('admin')}
            className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span>Admin</span>
          </button>

          {/* 3. Attendance & Gate */}
          <div className="flex items-center">
            <button
              id="nav-btn-attendance"
              type="button"
              onClick={() => onViewChange('attendance')}
              className={`nav-item flex items-center gap-1.5 ${currentView === 'attendance' ? 'active' : ''}`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Gate</span>
              {isMounted && presentCount > 0 && (
                <span className="font-mono text-[9px] bg-emerald-500 text-black px-1.5 py-0.2 rounded-full font-black">
                  {presentCount}
                </span>
              )}
            </button>
            <a
              href="/attendance"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Standalone Attendance Station in new window (/attendance)"
              className="p-1 hover:text-emerald-400 text-[var(--ink-muted)] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* 4. Prize Claim Workstation */}
          <div className="flex items-center">
            <button
              id="nav-btn-claim"
              type="button"
              onClick={() => onViewChange('claim')}
              className={`nav-item flex items-center gap-1.5 ${currentView === 'claim' ? 'active' : ''}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Claims</span>
              {isMounted && unclaimedCount > 0 && (
                <span className="font-mono text-[9px] bg-[var(--accent)] text-black px-1.5 py-0.2 rounded-full font-black">
                  {unclaimedCount}
                </span>
              )}
            </button>
            <a
              href="/claims"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Standalone Prize Claim Workstation in new window (/claims)"
              className="p-1 hover:text-[var(--accent)] text-[var(--ink-muted)] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* 5. Google Apps Script */}
          <button
            id="nav-btn-gas"
            type="button"
            onClick={() => onViewChange('gas')}
            className={`nav-item ${currentView === 'gas' ? 'active' : ''}`}
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Apps Script</span>
            <span className="sm:hidden">GAS</span>
          </button>
        </nav>

        {/* Right: Quick Stage Controls, Theme Switcher & Security */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound FX Toggle */}
          <button
            id="header-sound-toggle"
            type="button"
            onClick={onToggleSound}
            className={`p-2 rounded-md border font-mono text-xs transition-colors ${
              soundEnabled
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--badge-bg)]'
                : 'border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="header-fullscreen-toggle"
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 rounded-md border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink-muted)] hover:text-[var(--ink)] font-mono text-xs transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Theme Switcher Popover */}
          {isMounted && (
            <div className="relative">
              <button
                id="header-theme-toggle"
                type="button"
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--accent)] text-[var(--ink)] transition-colors text-xs font-mono font-bold"
                title={`Theme: ${themeConfig.name}`}
              >
                <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/40 inline-block shrink-0 shadow-xs"
                  style={{ backgroundColor: themeConfig.colors.accent }}
                />
                <span className="hidden md:inline font-mono text-[10px] uppercase font-bold tracking-wider max-w-[90px] truncate">
                  {themeConfig.name.split('&')[0].trim()}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--ink-muted)]" />
              </button>

              {themeDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-64 bg-[var(--surface-elevated)] border-2 border-[var(--border)] rounded-lg shadow-2xl p-2 z-50 animate-fade-in text-xs font-mono"
                  onMouseLeave={() => setThemeDropdownOpen(false)}
                >
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-black border-b border-[var(--border)] mb-1">
                    Select Stage Palette
                  </div>
                  <div className="space-y-1">
                    {allThemes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTheme(t.id);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-md transition-colors text-left ${
                          theme === t.id
                            ? 'bg-[var(--badge-bg)] text-[var(--badge-text)] font-black border border-[var(--border-accent)]'
                            : 'hover:bg-[var(--surface)] text-[var(--ink)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: t.colors.accent }}
                          />
                          <div>
                            <div className="font-display font-bold uppercase text-xs leading-none">
                              {t.name.split('&')[0].trim()}
                            </div>
                            <span className="text-[9px] text-[var(--ink-muted)]">{t.tag}</span>
                          </div>
                        </div>
                        <span className="text-[10px]">{t.mode === 'dark' ? '🌙' : '☀️'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dark / Light Mode Toggle */}
          {isMounted && (
            <button
              id="header-darkmode-toggle"
              type="button"
              onClick={toggleDarkMode}
              className={`p-2 rounded-md border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[var(--border)] text-amber-300 hover:border-amber-400'
                  : 'border-[var(--border)] text-amber-500 hover:border-neutral-900 bg-black/5'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark/Light Mode"
            >
              {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Lock Master Console */}
          {onLock && (
            <button
              id="header-lock-toggle"
              type="button"
              onClick={onLock}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/60 bg-red-950/30 text-xs font-mono font-bold"
              title="Lock Master Admin Console"
            >
              <Lock className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


