'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { District, DistributionMode, Participant, Prize, Winner } from '../lib/types';
import { Trophy, Minus, Plus, CheckCircle, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, Settings, ChevronDown, Play, Pause, Gauge } from 'lucide-react';

interface ProjectorDisplayProps {
  selectedPrize: Prize | null;
  prizes?: Prize[];
  selectedPrizeId?: string;
  preDrawWinners?: Winner[];
  onSelectPrize?: (prizeId: string) => void;
  onOpenPreDrawViewer?: () => void;
  isDrawing: boolean;
  shufflingNames: Record<District, { name: string; school: string; topName?: string; bottomName?: string }>;
  revealedWinners: Participant[];
  countdown: number | null;
  onOpenDrawPreview: () => void;
  drawStatus: 'IDLE' | 'DRAWING' | 'REVEALED';
  distributionMode: DistributionMode;
  winnersPerDistrict: number;
  combinedWinnersCount: number;
  onDistributionModeChange?: (mode: DistributionMode) => void;
  onWinnersPerDistrictChange?: (count: number) => void;
  onCombinedWinnersCountChange?: (count: number) => void;
  hasPendingReview?: boolean;
  onConfirmWinners?: () => void;
  onRedraw?: () => void;
  candidatePoolByDistrict?: Record<District, string[]>;
  targetDistrict?: District | 'ALL';
  onTargetDistrictChange?: (district: District | 'ALL') => void;
  isFullStage?: boolean;
  onToggleFullStage?: (fullStage: boolean) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  eventName?: string;
}

const DISTRICT_CONFIG: { id: District; number: string; title: string; isPrivate?: boolean }[] = [
  { id: 'NORTH', number: '01', title: 'North' },
  { id: 'EAST', number: '02', title: 'East' },
  { id: 'WEST', number: '03', title: 'West' },
  { id: 'SOUTH', number: '04', title: 'South' },
  { id: 'PRIVATE', number: '05', title: 'Private (ECCD + Private School + LSB)', isPrivate: true }
];

export const ProjectorDisplay: React.FC<ProjectorDisplayProps> = ({
  selectedPrize,
  prizes,
  selectedPrizeId,
  preDrawWinners = [],
  onSelectPrize,
  onOpenPreDrawViewer,
  isDrawing,
  shufflingNames,
  candidatePoolByDistrict,
  revealedWinners,
  countdown,
  onOpenDrawPreview,
  drawStatus,
  distributionMode,
  winnersPerDistrict,
  combinedWinnersCount,
  onDistributionModeChange,
  onWinnersPerDistrictChange,
  onCombinedWinnersCountChange,
  targetDistrict = 'ALL',
  onTargetDistrictChange,
  hasPendingReview,
  onConfirmWinners,
  onRedraw,
  isFullStage,
  onToggleFullStage,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  eventName
}) => {
  const [internalFullStage, setInternalFullStage] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselMode, setCarouselMode] = useState<'carousel' | 'grid'>('carousel');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Pre-Draw Marquee Speed & Controls
  const [tickerSpeed, setTickerSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [isTickerPaused, setIsTickerPaused] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('td26_ticker_speed');
      if (saved === 'slow' || saved === 'normal' || saved === 'fast') {
        setTickerSpeed(saved);
      }
    }
  }, []);

  const handleCycleSpeed = () => {
    setTickerSpeed((prev) => {
      const next = prev === 'normal' ? 'slow' : prev === 'slow' ? 'fast' : 'normal';
      try {
        localStorage.setItem('td26_ticker_speed', next);
      } catch {}
      return next;
    });
  };

  // Dynamic marquee duration based on winner count to guarantee constant, comfortable reading pace
  const marqueeDuration = useMemo(() => {
    const count = preDrawWinners.length;
    if (count === 0) return 60;
    const secondsPerItem = tickerSpeed === 'slow' ? 8.5 : tickerSpeed === 'fast' ? 3.2 : 5.5;
    const minDuration = tickerSpeed === 'slow' ? 50 : tickerSpeed === 'fast' ? 25 : 40;
    return Math.max(minDuration, Math.round(count * secondsPerItem));
  }, [preDrawWinners.length, tickerSpeed]);

  // Seamless marquee loop duplication
  const marqueeList = useMemo(() => {
    if (preDrawWinners.length === 0) return [];
    let repeatCount = 1;
    if (preDrawWinners.length === 1) repeatCount = 8;
    else if (preDrawWinners.length === 2) repeatCount = 4;
    else if (preDrawWinners.length < 5) repeatCount = 2;

    const base: Winner[] = [];
    for (let i = 0; i < repeatCount; i++) {
      base.push(...preDrawWinners);
    }
    return [...base, ...base];
  }, [preDrawWinners]);

  const fullStageActive = isFullStage !== undefined ? isFullStage : internalFullStage;

  const setFullStage = (active: boolean) => {
    if (onToggleFullStage) {
      onToggleFullStage(active);
    }
    setInternalFullStage(active);
  };

  // Automatically collapse controls and hide header when a draw starts
  useEffect(() => {
    if (isDrawing) {
      setFullStage(true);
      setIsMenuOpen(false);
      setIsHovered(false);
    }
  }, [isDrawing]);

  // Click outside to dismiss stage menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Esc to close menu or exit full stage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMenuOpen) {
          setIsMenuOpen(false);
          return;
        }
        if (fullStageActive) {
          setFullStage(false);
        }
      }
      // Carousel arrow key navigation
      if (drawStatus === 'REVEALED' && carouselMode === 'carousel') {
        if (e.key === 'ArrowRight') {
          setCarouselIndex(prev => (prev + 1) % 5);
        } else if (e.key === 'ArrowLeft') {
          setCarouselIndex(prev => (prev - 1 + 5) % 5);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullStageActive, drawStatus, carouselMode, isMenuOpen]);

  // Group revealed winners by district
  const winnersByDistrict: Record<District, Participant[]> = {
    NORTH: [],
    EAST: [],
    WEST: [],
    SOUTH: [],
    PRIVATE: []
  };

  if (drawStatus === 'REVEALED') {
    revealedWinners.forEach((w) => {
      if (winnersByDistrict[w.district]) {
        winnersByDistrict[w.district].push(w);
      }
    });
  }

  const totalWinnersToDraw =
    distributionMode === 'EQUAL_PER_DISTRICT'
      ? winnersPerDistrict * 5
      : combinedWinnersCount;

  // Single Winner Hero Spotlight mode:
  // 1. If 1 winner is revealed -> ALWAYS Hero Spotlight (NEVER cycling carousel!)
  // 2. If Grand Prize is drawn/revealed -> ALWAYS Hero Spotlight!
  // 3. If in ready/drawing state with 1 planned winner -> Hero Spotlight!
  const isSingleWinnerHero =
    (drawStatus === 'REVEALED' && revealedWinners.length === 1) ||
    (selectedPrize?.category === 'GRAND' && revealedWinners.length <= 1) ||
    (drawStatus !== 'REVEALED' && (totalWinnersToDraw === 1 || selectedPrize?.category === 'GRAND')) ||
    (distributionMode === 'COMBINED_POOL' && totalWinnersToDraw === 1);

  // Auto-rotate carousel when winners are revealed, BUT ONLY for multi-district draws with >= 2 active districts!
  useEffect(() => {
    if (drawStatus !== 'REVEALED' || carouselMode !== 'carousel' || isSingleWinnerHero) return;

    // Find all districts that actually have at least 1 winner
    const activeDistrictIndices = DISTRICT_CONFIG.map((d, idx) => ({
      idx,
      hasWinners: (winnersByDistrict[d.id] || []).length > 0
    }))
      .filter((item) => item.hasWinners)
      .map((item) => item.idx);

    // If 1 or 0 districts have winners, NEVER rotate through empty districts!
    if (activeDistrictIndices.length <= 1) {
      if (activeDistrictIndices.length === 1) {
        setCarouselIndex(activeDistrictIndices[0]);
      }
      return;
    }

    const timer = setInterval(() => {
      setCarouselIndex((prev) => {
        const currentPos = activeDistrictIndices.indexOf(prev);
        if (currentPos === -1) return activeDistrictIndices[0];
        const nextPos = (currentPos + 1) % activeDistrictIndices.length;
        return activeDistrictIndices[nextPos];
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [drawStatus, carouselMode, isSingleWinnerHero, revealedWinners]);

  // Reset carousel index when a new draw starts or focus on first winning district
  useEffect(() => {
    if (isDrawing) {
      setCarouselIndex(0);
    } else if (drawStatus === 'REVEALED' && !isSingleWinnerHero) {
      const firstActive = DISTRICT_CONFIG.findIndex((d) => (winnersByDistrict[d.id] || []).length > 0);
      if (firstActive >= 0) {
        setCarouselIndex(firstActive);
      }
    }
  }, [isDrawing, drawStatus, isSingleWinnerHero, revealedWinners]);

  const singleWinnerShufflingName =
    targetDistrict && targetDistrict !== 'ALL'
      ? shufflingNames[targetDistrict]?.name || 'DepEd Participant'
      : Object.values(shufflingNames).find((n) => n.name !== 'Awaiting draw...')?.name || 'DepEd Participant';

  const getHeroNameFontSize = (name: string) => {
    const len = name.length;
    if (len <= 14) return 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl 2xl:text-[9.5rem] tracking-tight';
    if (len <= 22) return 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl 2xl:text-[7rem] tracking-tight';
    return 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl 2xl:text-[5.5rem] tracking-tight';
  };
  const availableQty = selectedPrize ? selectedPrize.remainingQuantity : 0;
  const maxPerDistrict = Math.floor(availableQty / 5);

  const isButtonDisabled =
    isDrawing ||
    !selectedPrize ||
    selectedPrize.remainingQuantity <= 0 ||
    totalWinnersToDraw <= 0 ||
    totalWinnersToDraw > availableQty;

  return (
    <div className={`flex-1 flex flex-col relative min-h-0 ${fullStageActive ? 'h-screen overflow-hidden' : ''}`}>
      {/* Cinematic Stage Top Bar when in Full Stage Mode */}
      {fullStageActive && (
        <div className="bg-[#1a1a1a] text-[#f8f7f4] px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 border-b-2 border-[#1a1a1a] shadow-md animate-fade-in select-none relative min-h-[68px] sm:min-h-[78px] shrink-0">
          {/* Left: Status Badge Container (Balanced width matching right side) */}
          <div className="w-32 sm:w-48 lg:w-56 flex items-center justify-start shrink-0">
            <span
              className={`font-mono text-xs sm:text-sm uppercase px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-white font-black tracking-wider shadow-sm rounded-xs ${
                isDrawing
                  ? 'bg-[#ff6a00] animate-pulse'
                  : hasPendingReview
                  ? 'bg-amber-600 animate-pulse'
                  : drawStatus === 'REVEALED'
                  ? 'bg-emerald-600'
                  : 'bg-neutral-800'
              }`}
            >
              {isDrawing
                ? '⚡ LIVE DRAW'
                : hasPendingReview
                ? '⏳ PENDING'
                : drawStatus === 'REVEALED'
                ? '🏆 WINNERS CONFIRMED'
                : 'READY TO DRAW'}
            </span>
          </div>

          {/* Center: The Name of the Prize Being Drawn - Maximized, Majestic & Centered */}
          <div className="flex-1 text-center px-2 sm:px-4 min-w-0 flex flex-col items-center justify-center">
            <div className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-lg truncate max-w-full">
              {selectedPrize ? selectedPrize.name : 'LIVE RAFFLE DRAW'}
            </div>
            <div className="font-mono text-[10px] sm:text-xs md:text-sm text-[#ff6a00] font-bold uppercase tracking-widest mt-1 sm:mt-1.5 truncate max-w-full flex items-center gap-1.5 justify-center">
              {selectedPrize?.description && (
                <span>{selectedPrize.description} • </span>
              )}
              <span>
                {distributionMode === 'EQUAL_PER_DISTRICT'
                  ? `${winnersPerDistrict} PER DISTRICT (5 DISTRICTS = ${totalWinnersToDraw} WINNERS)`
                  : targetDistrict && targetDistrict !== 'ALL'
                  ? `${totalWinnersToDraw} WINNER${totalWinnersToDraw > 1 ? 'S' : ''} • ${targetDistrict} DISTRICT EXCLUSIVE REDRAW`
                  : `${totalWinnersToDraw} WINNER${totalWinnersToDraw > 1 ? 'S' : ''} (COMBINED POOL — ALL DISTRICTS)`}
              </span>
            </div>
          </div>

          {/* Right: Actions & Hover Controls Dropdown (Balanced width matching left side) */}
          <div className="w-32 sm:w-48 lg:w-56 flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0 relative">
            {/* Primary Action Button: Confirm Winners directly visible when pending */}
            {hasPendingReview && onConfirmWinners && (
              <button
                type="button"
                onClick={onConfirmWinners}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 active:scale-95 animate-pulse rounded-xs shrink-0 cursor-pointer"
                title="Confirm winners and record permanently"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Confirm</span>
                <span className="sm:hidden">Confirm</span>
              </button>
            )}

            {/* Hover / Click Dropdown Menu for Controls */}
            <div
              ref={menuRef}
              className="relative"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 rounded-xs border shadow-xs cursor-pointer ${
                  isMenuOpen || isHovered
                    ? 'bg-neutral-700 text-white border-white/40'
                    : 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 hover:text-white border-white/20'
                }`}
                title="Stage Controls & Display Options"
                aria-expanded={isMenuOpen || isHovered}
              >
                <Settings className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                <span className="hidden md:inline">Controls</span>
                <ChevronDown
                  className={`w-3 h-3 text-neutral-400 transition-transform duration-200 shrink-0 ${
                    isMenuOpen || isHovered ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Floating Dropdown Panel */}
              <div
                className={`absolute right-0 top-full mt-2 w-64 sm:w-72 bg-[#18181b] border-2 border-neutral-700 shadow-2xl rounded-xl p-2.5 z-50 text-left transition-all duration-150 ${
                  isMenuOpen || isHovered
                    ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                    : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                }`}
              >
                {/* Section 1: Redraw (Only visible if pending review) */}
                {hasPendingReview && onRedraw && (
                  <div className="pb-2 mb-2 border-b border-white/10">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold px-1.5 pb-1">
                      Draw Actions
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsHovered(false);
                        if (confirm('Discard these drawn winners and redraw this round?')) {
                          onRedraw();
                        }
                      }}
                      className="w-full px-3 py-2 text-left font-mono text-xs font-bold uppercase tracking-wide text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/60 border border-red-800/40 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Discard & Redraw</span>
                    </button>
                  </div>
                )}

                {/* Section 2: Display Mode Toggle (Multi-District only) */}
                {drawStatus === 'REVEALED' && !isSingleWinnerHero && (
                  <div className="pb-2 mb-2 border-b border-white/10">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold px-1.5 pb-1">
                      Display Mode
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setCarouselMode('carousel');
                          setIsMenuOpen(false);
                          setIsHovered(false);
                        }}
                        className={`px-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          carouselMode === 'carousel'
                            ? 'bg-[#ff6a00] text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                        title="Auto-rotating carousel by district"
                      >
                        <span>📺</span>
                        <span>Carousel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCarouselMode('grid');
                          setIsMenuOpen(false);
                          setIsHovered(false);
                        }}
                        className={`px-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          carouselMode === 'grid'
                            ? 'bg-[#ff6a00] text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                        title="Show all 5 districts at once"
                      >
                        <span>🔲</span>
                        <span>Grid</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 3: Audio & Screen Quick Toggles */}
                <div className="pb-2 mb-2 border-b border-white/10 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold px-1.5 pb-0.5">
                    Stage Audio & Display
                  </div>
                  {onToggleSound && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleSound();
                      }}
                      className="w-full px-2.5 py-1.5 text-left font-mono text-xs font-bold uppercase tracking-wide text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {soundEnabled ? (
                          <Volume2 className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        )}
                        <span>Sound SFX</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          soundEnabled ? 'bg-[#ff6a00]/20 text-[#ff6a00]' : 'bg-neutral-800 text-neutral-500'
                        }`}
                      >
                        {soundEnabled ? 'ON' : 'MUTED'}
                      </span>
                    </button>
                  )}
                  {onToggleFullscreen && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleFullscreen();
                      }}
                      className="w-full px-2.5 py-1.5 text-left font-mono text-xs font-bold uppercase tracking-wide text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isFullscreen ? (
                          <Minimize2 className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                        )}
                        <span>Fullscreen</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-neutral-800 text-neutral-400">
                        {isFullscreen ? 'ACTIVE' : 'OFF'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Section 4: Exit Full Stage */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsHovered(false);
                      setFullStage(false);
                    }}
                    className="w-full px-2.5 py-2 text-left font-mono text-xs font-bold uppercase tracking-wide text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                    title="Exit full stage mode (Esc)"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>Exit Full Stage</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 font-mono rounded">
                      Esc
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Grid (Full-width 100% stage, zero horizontal margins) */}
      <div
        className={`w-full flex-1 min-h-0 bg-[#f8f7f4] flex flex-col ${
          fullStageActive
            ? 'overflow-hidden'
            : 'min-h-[calc(100vh-140px)] lg:grid lg:grid-cols-[1.1fr_2fr]'
        }`}
      >
        {/* Editorial Sidebar - Compact & Cohesive (Zero Dead Space) */}
        {!fullStageActive && (
          <aside className="sidebar p-4 sm:p-5 lg:p-6 lg:border-r-2 lg:border-[#1a1a1a] bg-white flex flex-col gap-4 animate-fade-in overflow-y-auto">
            {/* Top Status & Full Stage Toggle */}
            <div className="flex items-center justify-between pb-1 border-b border-[#1a1a1a]/10">
              <div
                className="header-meta font-mono text-xs uppercase tracking-wider font-bold"
                style={{ color: 'var(--accent)' }}
              >
                {isDrawing
                  ? '[ Status: Drawing in Progress... ]'
                  : drawStatus === 'REVEALED'
                  ? '[ Status: Winners Announced ]'
                  : '[ Status: Ready ]'}
              </div>
              <button
                type="button"
                onClick={() => setFullStage(true)}
                className="font-mono text-[11px] font-bold uppercase text-[#1a1a1a]/70 hover:text-[#ff6a00] border border-[#1a1a1a]/20 hover:border-[#ff6a00] px-2.5 py-1 transition-colors flex items-center gap-1.5 rounded-sm"
                title="Hide navigation and sidebar for clean full screen stage (or press Esc to exit)"
              >
                <span>Full Stage</span>
                <span>⛶</span>
              </button>
            </div>

            {/* Carousel Mode Toggle (visible when winners revealed for multi-district draws) */}
            {drawStatus === 'REVEALED' && !isSingleWinnerHero && (
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/50 font-bold">Display:</span>
                <div className="inline-flex border border-[#1a1a1a]/20 rounded-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCarouselMode('carousel')}
                    className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-all ${
                      carouselMode === 'carousel'
                        ? 'bg-[#ff6a00] text-white'
                        : 'bg-white text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
                    }`}
                  >
                    📺 Carousel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarouselMode('grid')}
                    className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-all ${
                      carouselMode === 'grid'
                        ? 'bg-[#ff6a00] text-white'
                        : 'bg-white text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
                    }`}
                  >
                    🔲 Grid
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Stage Title & Category Badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-[#1a1a1a] tracking-tight leading-none">
                {selectedPrize?.category === 'GRAND'
                  ? 'Grand Raffle Draw'
                  : selectedPrize?.category === 'MINOR'
                  ? 'Minor Raffle Draw'
                  : 'Live Raffle Draw'}
              </h2>
              {selectedPrize && (
                <span
                  className={`font-mono text-[10px] px-2.5 py-0.5 rounded-xs font-black uppercase tracking-wider border shadow-2xs ${
                    selectedPrize.category === 'GRAND'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-blue-100 text-blue-900 border-blue-300'
                  }`}
                >
                  {selectedPrize.category === 'GRAND' ? '👑 Grand Prize' : '🎁 Minor Prize'}
                </span>
              )}
            </div>

            {/* Active Prize Selection Card */}
            <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] p-3.5 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/70 font-bold">
                  Active Raffle Prize
                </span>
                {prizes && prizes.length > 1 && onSelectPrize && (
                  <span className="font-mono text-[9px] uppercase font-bold text-[#ff6a00] bg-[#ff6a00]/10 border border-[#ff6a00]/30 px-2 py-0.5 rounded-xs">
                    Select Below
                  </span>
                )}
              </div>

              {/* Quick Prize Selector Dropdown */}
              {prizes && prizes.length > 0 && onSelectPrize && (
                <select
                  id="projector-prize-select"
                  value={selectedPrizeId || selectedPrize?.id || ''}
                  onChange={(e) => onSelectPrize(e.target.value)}
                  disabled={isDrawing}
                  aria-label="Select Prize to Draw"
                  className="w-full bg-white hover:bg-neutral-50 border-2 border-[#1a1a1a] focus:border-[#ff6a00] p-2 text-xs font-mono font-bold uppercase tracking-wide text-[#1a1a1a] outline-none transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {prizes.map((p) => {
                    const isExhausted = p.remainingQuantity <= 0;
                    const catTag = p.category === 'GRAND' ? '👑 [GRAND]' : '🎁 [MINOR]';
                    const label = p.unitValue > 0
                      ? `${catTag} ${p.name} (₱${p.unitValue.toLocaleString()}) — ${p.remainingQuantity} Left`
                      : `${catTag} ${p.name}${p.description ? ` [${p.description}]` : ''} — ${p.remainingQuantity} Left`;
                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={isExhausted}
                        className="bg-white text-[#1a1a1a] py-1 font-bold"
                      >
                        {isExhausted ? `[DRAWN] ${label}` : label}
                      </option>
                    );
                  })}
                </select>
              )}

              <div className="pt-0.5">
                <div className="font-display text-2xl sm:text-3xl font-black leading-tight text-[#1a1a1a] tracking-tight truncate">
                  {selectedPrize ? selectedPrize.name : 'SELECT PRIZE'}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#1a1a1a]/70 font-semibold mt-0.5 flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    {selectedPrize ? (
                      `${selectedPrize.description ? `${selectedPrize.description} • ` : ''}${availableQty} AVAILABLE`
                    ) : (
                      'NO PRIZE SELECTED'
                    )}
                  </span>
                  {selectedPrize && (
                    <span className="text-[10px] font-bold text-[#1a1a1a]/70">
                      {selectedPrize.category === 'GRAND' ? 'Teaching Only' : 'Teaching & Non-Teaching'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Criteria & Stepper Card */}
            <div className="border border-[#1a1a1a]/15 dark:border-white/10 p-3.5 rounded-lg space-y-3 bg-white dark:bg-[#121212] shadow-xs">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/70 dark:text-neutral-400 font-bold">
                Distribution Criteria
              </div>

              {/* Criteria Row with Monospace Tags */}
              <div className="criteria-row flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDistributionModeChange?.('EQUAL_PER_DISTRICT')}
                  className={`tag text-xs font-mono font-bold uppercase px-3 py-1.5 border transition-all ${
                    distributionMode === 'EQUAL_PER_DISTRICT'
                      ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black border-[#1a1a1a] dark:border-white'
                      : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-neutral-300 border-[#1a1a1a]/30 dark:border-white/20 hover:border-[#1a1a1a]'
                  }`}
                >
                  Equal Per District
                </button>
                <button
                  type="button"
                  onClick={() => onDistributionModeChange?.('COMBINED_POOL')}
                  className={`tag text-xs font-mono font-bold uppercase px-3 py-1.5 border transition-all ${
                    distributionMode === 'COMBINED_POOL'
                      ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black border-[#1a1a1a] dark:border-white'
                      : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-neutral-300 border-[#1a1a1a]/30 dark:border-white/20 hover:border-[#1a1a1a]'
                  }`}
                >
                  Combined Pool
                </button>
              </div>

              {/* Draw Count & Adjust Stepper */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]/10 dark:border-white/10">
                <div className="font-mono text-xs text-[#1a1a1a] dark:text-neutral-200">
                  <span className="text-[#1a1a1a]/60 dark:text-neutral-400">Draw: </span>
                  <span className="font-bold">
                    {distributionMode === 'EQUAL_PER_DISTRICT'
                      ? `${winnersPerDistrict} / dist`
                      : `${combinedWinnersCount} pool`}
                  </span>
                  <span className="mx-1 text-[#1a1a1a]/30 dark:text-neutral-500">•</span>
                  <span className="font-bold text-[#ff6a00]">{totalWinnersToDraw} Total</span>
                </div>

                {/* Quick Adjust Stepper Controls */}
                {selectedPrize && selectedPrize.remainingQuantity > 0 && (
                  <div className="inline-flex border-2 border-[#1a1a1a] dark:border-white/30 rounded-sm overflow-hidden">
                    {distributionMode === 'EQUAL_PER_DISTRICT' && onWinnersPerDistrictChange && (
                      <>
                        <button
                          type="button"
                          disabled={winnersPerDistrict <= 1}
                          onClick={() => onWinnersPerDistrictChange(Math.max(1, winnersPerDistrict - 1))}
                          className="px-2 py-0.5 text-xs font-mono font-bold text-[#1a1a1a] dark:text-white hover:bg-[#1a1a1a] hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 transition-colors bg-neutral-100 dark:bg-neutral-800"
                          title="Decrease count per district"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-mono font-black text-[#1a1a1a] dark:text-white bg-white dark:bg-neutral-950 border-x border-[#1a1a1a]/20 dark:border-white/20">
                          {winnersPerDistrict}
                        </span>
                        <button
                          type="button"
                          disabled={winnersPerDistrict >= maxPerDistrict}
                          onClick={() => onWinnersPerDistrictChange(winnersPerDistrict + 1)}
                          className="px-2 py-0.5 text-xs font-mono font-bold text-[#1a1a1a] dark:text-white hover:bg-[#1a1a1a] hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 transition-colors bg-neutral-100 dark:bg-neutral-800"
                          title="Increase count per district"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </>
                    )}

                    {distributionMode === 'COMBINED_POOL' && onCombinedWinnersCountChange && (
                      <>
                        <button
                          type="button"
                          disabled={combinedWinnersCount <= 1}
                          onClick={() => onCombinedWinnersCountChange(Math.max(1, combinedWinnersCount - 1))}
                          className="px-2 py-0.5 text-xs font-mono font-bold text-[#1a1a1a] dark:text-white hover:bg-[#1a1a1a] hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 transition-colors bg-neutral-100 dark:bg-neutral-800"
                          title="Decrease combined winners count"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-mono font-black text-[#1a1a1a] dark:text-white bg-white dark:bg-neutral-950 border-x border-[#1a1a1a]/20 dark:border-white/20">
                          {combinedWinnersCount}
                        </span>
                        <button
                          type="button"
                          disabled={combinedWinnersCount >= availableQty}
                          onClick={() => onCombinedWinnersCountChange(combinedWinnersCount + 1)}
                          className="px-2 py-0.5 text-xs font-mono font-bold text-[#1a1a1a] dark:text-white hover:bg-[#1a1a1a] hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-30 transition-colors bg-neutral-100 dark:bg-neutral-800"
                          title="Increase combined winners count"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Choice A: District Target Scope Selector (When in Combined Pool / Redraw Mode) */}
              {distributionMode === 'COMBINED_POOL' && onTargetDistrictChange && (
                <div className="pt-2 border-t border-[#1a1a1a]/10 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-neutral-600 dark:text-neutral-400">
                    <span>Target District Scope:</span>
                    <span className="text-[#ff6a00]">
                      {targetDistrict === 'ALL' ? 'All 5 Districts' : `${targetDistrict} Only`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => onTargetDistrictChange('ALL')}
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-1 border transition-all text-center ${
                        targetDistrict === 'ALL'
                          ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black border-[#1a1a1a] dark:border-white'
                          : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/20 hover:border-black'
                      }`}
                    >
                      All (5)
                    </button>
                    {(['NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'] as District[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onTargetDistrictChange(d)}
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-1 border transition-all text-center ${
                          targetDistrict === d
                            ? 'bg-[#FF1E1E] text-white border-[#FF1E1E]'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-[#1a1a1a]/20 dark:border-white/20 hover:border-black'
                        }`}
                      >
                        {d === 'PRIVATE' ? 'Private' : d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Commence Draw or Confirm Winners */}
            {hasPendingReview && onConfirmWinners ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={onConfirmWinners}
                  className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 animate-pulse rounded-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Winners</span>
                </button>
                {onRedraw && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Discard these drawn winners and redraw this round?')) {
                        onRedraw();
                      }
                    }}
                    className="w-full p-2 border border-red-500/40 hover:bg-red-950/20 text-red-600 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 rounded-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redraw Round</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                id="btn-trigger-draw"
                disabled={isButtonDisabled}
                onClick={() => {
                  setFullStage(true);
                  onOpenDrawPreview();
                }}
                className={`w-full p-4 font-mono font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-between transition-all shadow-md rounded-md ${
                  isButtonDisabled
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border border-[#1a1a1a]/15 dark:border-white/10'
                    : 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black hover:bg-[#ff6a00] dark:hover:bg-[#ff6a00] dark:hover:text-white cursor-pointer active:scale-98'
                }`}
              >
                <span>{isDrawing ? 'Drawing in Progress' : 'Commence Draw'}</span>
                <span className="text-xl">→</span>
              </button>
            )}

            {/* Quick Operator Status Footer */}
            <div className="mt-auto pt-3 border-t border-[#1a1a1a]/10 font-mono text-[10px] text-[#1a1a1a]/50 flex items-center justify-between">
              <span>PROJECTOR READY</span>
              <span>PRESS ESC TO EXIT FULL STAGE</span>
            </div>
          </aside>
        )}

        {/* Main Stage: Single Winner Hero Spotlight OR Multi-District Layout */}
        <main className="main-stage flex-1 min-h-0 p-2 sm:p-2.5 lg:p-3 bg-[#f8f7f4] flex flex-col justify-center items-center overflow-hidden">
          {isSingleWinnerHero ? (
            /* Single Winner Hero Spotlight Card - Balanced, Proportional & Majestic */
            <div className="w-full max-w-4xl lg:max-w-5xl 2xl:max-w-6xl mx-auto flex flex-col justify-center animate-fade-in my-auto">
              <div
                className={`bg-white border-3 sm:border-4 rounded-3xl p-6 sm:p-9 lg:p-11 shadow-2xl flex flex-col justify-between h-[420px] sm:h-[480px] lg:h-[520px] max-h-[82vh] overflow-hidden ${
                  isDrawing
                    ? 'bg-orange-50/90 border-[#ff6a00] shadow-2xl ring-8 ring-[#ff6a00]/30'
                    : drawStatus === 'REVEALED' && revealedWinners.length > 0
                    ? 'border-emerald-600 bg-white shadow-2xl ring-4 ring-emerald-500/20 animate-grand-winner-pulse'
                    : 'border-[#1a1a1a]/30'
                }`}
              >
                {/* Celebratory Header: Centered with subtle gradient accent divider */}
                <div className="shrink-0 text-center flex flex-col items-center justify-center pb-2">
                  {drawStatus === 'REVEALED' && revealedWinners.length > 0 ? (
                    <>
                      {selectedPrize?.category === 'GRAND' ? (
                        <div className="font-mono text-xs sm:text-sm md:text-base font-black uppercase tracking-[0.25em] text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 px-3 py-1 rounded-full mb-1 flex items-center gap-2 shadow-xs">
                          <span>👑</span>
                          <span>GRAND PRIZE WINNER</span>
                          <span>👑</span>
                        </div>
                      ) : (
                        <div className="font-mono text-xs sm:text-sm md:text-base font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-600/40 px-3 py-1 rounded-full mb-1 flex items-center gap-2 shadow-xs">
                          <span>🎁</span>
                          <span>MINOR PRIZE WINNER</span>
                          <span>🎁</span>
                        </div>
                      )}
                      <div className="font-mono text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 sm:gap-3 drop-shadow-xs">
                        <span className="text-xl sm:text-3xl lg:text-4xl">🎉</span>
                        <span>CONGRATULATIONS!</span>
                        <span className="text-xl sm:text-3xl lg:text-4xl">🎉</span>
                      </div>
                      <div className="w-36 sm:w-56 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mt-2.5 rounded-full" />
                    </>
                  ) : isDrawing ? (
                    <>
                      <div className="font-mono text-xs sm:text-sm md:text-base font-black uppercase tracking-[0.25em] text-[#ff6a00] flex items-center gap-2 animate-pulse">
                        <span>⚡</span>
                        <span>
                          {targetDistrict && targetDistrict !== 'ALL'
                            ? `SHUFFLING ${targetDistrict} DISTRICT CANDIDATES...`
                            : 'SHUFFLING ALL DISTRICT CANDIDATES...'}
                        </span>
                        <span>⚡</span>
                      </div>
                      <div className="w-36 sm:w-56 h-1 bg-gradient-to-r from-transparent via-[#ff6a00]/40 to-transparent mt-2.5 rounded-full" />
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-neutral-400" />
                        <span>
                          {targetDistrict && targetDistrict !== 'ALL'
                            ? `${targetDistrict} DISTRICT EXCLUSIVE REDRAW`
                            : 'READY TO DRAW 1 LUCKY WINNER'}
                        </span>
                      </div>
                      <div className="w-28 sm:w-44 h-0.5 bg-gradient-to-r from-transparent via-neutral-300 to-transparent mt-2 rounded-full" />
                    </>
                  )}
                </div>

                {/* Hero Content Area: Strictly Centered & Proportional */}
                <div className="flex-1 flex flex-col justify-center items-center text-center overflow-hidden py-1">
                  {isDrawing ? (
                    <div className="w-full flex flex-col items-center justify-center">
                      {/* Fixed-height name container with mechanical sliding reel effect */}
                      <div className="h-[150px] sm:h-[190px] lg:h-[220px] w-full flex items-center justify-center px-2 sm:px-4 overflow-hidden relative">
                        <div
                          key={singleWinnerShufflingName}
                          className={`font-winner font-black text-[#111827] uppercase text-center leading-[1.05] drop-shadow-md animate-reel-slide ${getHeroNameFontSize(singleWinnerShufflingName)}`}
                        >
                          {singleWinnerShufflingName}
                        </div>
                      </div>
                      <div className="font-mono text-xs sm:text-sm md:text-base text-[#ff6a00] font-bold uppercase tracking-widest pt-3 animate-pulse">
                        [ SELECTING 1 WINNER... ]
                      </div>
                    </div>
                  ) : drawStatus === 'REVEALED' && revealedWinners.length > 0 ? (
                    <div className="w-full flex flex-col items-center justify-center animate-fade-in space-y-3 sm:space-y-4">
                      {/* Fixed-height name container: scaled font gives short names grand visual presence */}
                      <div className="h-[140px] sm:h-[180px] lg:h-[210px] w-full flex items-center justify-center px-4 overflow-hidden">
                        <div
                          className={`font-winner font-black text-[#111827] uppercase text-center leading-[1.05] drop-shadow-sm animate-winner-reveal ${getHeroNameFontSize(revealedWinners[0].fullName)}`}
                        >
                          {revealedWinners[0].fullName}
                        </div>
                      </div>

                      {/* Details Badge Row - Refined Spacing & High-Contrast Visual Balance */}
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1">
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-[#111827] text-white font-mono text-xs sm:text-sm md:text-base font-bold uppercase rounded-full shadow-xs">
                          {revealedWinners[0].district === 'PRIVATE'
                            ? (revealedWinners[0].originalDistrict?.toLowerCase().includes('eccd')
                                ? 'ECCD (PRIVATE)'
                                : revealedWinners[0].position?.toLowerCase().includes('lsb') || revealedWinners[0].typeOfPersonnel?.toLowerCase().includes('lsb')
                                ? 'LSB (PRIVATE)'
                                : 'PRIVATE SCHOOL')
                            : `${revealedWinners[0].originalDistrict || revealedWinners[0].district} DISTRICT`}
                        </span>
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-neutral-100 text-neutral-800 font-mono text-xs sm:text-sm md:text-base font-bold uppercase rounded-full border border-neutral-300/80 shadow-xs">
                          {revealedWinners[0].school}
                        </span>
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-amber-50 text-amber-800 font-mono text-xs sm:text-sm md:text-base font-black uppercase rounded-full border border-amber-300 shadow-xs">
                          {revealedWinners[0].position}
                        </span>
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-white text-neutral-600 font-mono text-xs sm:text-sm md:text-base font-bold uppercase rounded-full border border-neutral-200 shadow-xs">
                          ID: {revealedWinners[0].id}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-2 text-neutral-400 font-mono">
                      <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-neutral-300 stroke-1" />
                      <div className="text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-neutral-600">
                        READY TO COMMENCE DRAW
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400">
                        {targetDistrict !== 'ALL'
                          ? `Eligible pool: ${candidatePoolByDistrict?.[targetDistrict]?.length || 0} teachers in ${targetDistrict} District`
                          : 'Eligible pool: All eligible teachers across all 5 districts'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hero Footer - Balanced Centered Subtle Accent */}
                <div className="shrink-0 text-center pt-2 sm:pt-3 flex flex-col items-center">
                  <div className="w-28 sm:w-44 h-0.5 bg-gradient-to-r from-transparent via-neutral-300 to-transparent mb-2 rounded-full" />
                  <span className="font-mono text-[11px] sm:text-xs text-neutral-400 font-bold uppercase tracking-[0.25em]">
                    {eventName ? eventName.toUpperCase() : "MALUNGON MUNICIPAL TEACHERS' DAY 2026"}
                  </span>
                </div>
              </div>
            </div>
          ) : drawStatus === 'REVEALED' && carouselMode === 'carousel' ? (
            /* Auto-Rotating Carousel - One District at a Time (LED Optimized, Full Stage Balance) */
            <div className="w-full h-full max-w-[97vw] 2xl:max-w-[1850px] mx-auto flex flex-col items-center justify-between animate-fade-in min-h-0 py-1 sm:py-2">
              {(() => {
                const currentDistrict = DISTRICT_CONFIG[carouselIndex];
                const winners = winnersByDistrict[currentDistrict.id];
                const hasWinners = winners.length > 0;

                return (
                  <>
                    <div
                      key={carouselIndex}
                      className="w-full flex-1 min-h-0 bg-white border-3 sm:border-4 border-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 xl:p-9 shadow-2xl ring-4 ring-emerald-500/20 animate-grand-winner-pulse flex flex-col justify-between overflow-hidden"
                    >
                      {/* District Header - Balanced Horizontal Bar (Left: Tag, Center: District Title, Right: Winners Count) */}
                      <div className="shrink-0 pb-2 sm:pb-3 mb-2 sm:mb-3 border-b-2 border-[#ff6a00]/30 flex items-center justify-between gap-2 px-1 sm:px-2">
                        {/* Left: District Winners Label */}
                        <div className="w-1/3 flex items-center justify-start gap-1.5 sm:gap-2 min-w-0">
                          <span className="text-sm sm:text-base shrink-0">🏆</span>
                          <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 uppercase tracking-[0.2em] truncate">
                            District Winners
                          </span>
                        </div>

                        {/* Center: District Title (Strictly Centered) */}
                        <div className="w-1/3 text-center flex justify-center">
                          <h3 className="font-mono text-lg sm:text-2xl lg:text-3xl font-black uppercase tracking-[0.25em] text-[#ff6a00] leading-none whitespace-nowrap">
                            {currentDistrict.title}
                          </h3>
                        </div>

                        {/* Right: Winner Count Badge */}
                        <div className="w-1/3 flex items-center justify-end">
                          {hasWinners ? (
                            <div className="font-mono text-xs sm:text-sm font-black text-[#ff6a00] bg-[#ff6a00]/10 border border-[#ff6a00]/30 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full shadow-2xs whitespace-nowrap">
                              {winners.length} {winners.length === 1 ? 'Winner' : 'Winners'}
                            </div>
                          ) : (
                            <div className="font-mono text-[11px] sm:text-xs font-bold text-neutral-400 bg-neutral-100 px-2 sm:px-2.5 py-0.5 rounded-full whitespace-nowrap">
                              0 Winners
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Winner Names - Maximum Size for LED Readability */}
                      <div className="flex-1 flex flex-col justify-center items-center py-2 sm:py-4 overflow-hidden min-h-0">
                        {hasWinners ? (
                          <div className={`flex flex-col justify-center items-center w-full ${winners.length > 2 ? 'space-y-1.5 sm:space-y-3 lg:space-y-4' : 'space-y-3 sm:space-y-5 lg:space-y-6'}`}>
                            {winners.map((w, idx) => (
                              <div key={idx} className="text-center w-full animate-fade-in">
                                <div
                                  className={`font-winner font-black text-[#111827] uppercase tracking-wide leading-[1.12] drop-shadow-sm ${
                                    winners.length === 1
                                      ? 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl'
                                      : winners.length <= 3
                                      ? 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl'
                                      : winners.length <= 5
                                      ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
                                      : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                                  }`}
                                >
                                  {w.fullName}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="font-mono text-lg sm:text-2xl text-[#1a1a1a]/30 text-center font-semibold tracking-wider uppercase">
                            No winners in this district
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="shrink-0 text-center pt-2 sm:pt-2.5 flex flex-col items-center">
                        <div className="w-28 sm:w-44 h-0.5 bg-gradient-to-r from-transparent via-neutral-300 to-transparent mb-1.5 rounded-full" />
                        <span className="font-mono text-[10px] sm:text-xs text-neutral-400 font-bold uppercase tracking-[0.25em]">
                          MALUNGON MUNICIPAL TEACHERS&apos; DAY 2026
                        </span>
                      </div>
                    </div>

                    {/* Carousel Navigation Dots */}
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5 mt-2 sm:mt-2.5 shrink-0">
                      {DISTRICT_CONFIG.map((d, idx) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setCarouselIndex(idx)}
                          className={`transition-all duration-300 rounded-full cursor-pointer ${
                            idx === carouselIndex
                              ? 'w-7 sm:w-8 h-2.5 sm:h-3 bg-[#ff6a00] shadow-md'
                              : winnersByDistrict[d.id].length > 0
                              ? 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-emerald-400 hover:bg-emerald-500 hover:scale-110'
                              : 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-neutral-300 hover:bg-neutral-400 hover:scale-110'
                          }`}
                          title={`${d.title}${winnersByDistrict[d.id].length > 0 ? ` (${winnersByDistrict[d.id].length} winner${winnersByDistrict[d.id].length > 1 ? 's' : ''})` : ''}`}
                          aria-label={`Go to ${d.title}`}
                        />
                      ))}
                    </div>

                    {/* Keyboard hint */}
                    <div className="font-mono text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 tracking-wider uppercase shrink-0">
                      ← → Arrow keys to navigate • Auto-cycling every 5s
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* Multi-District 3 + 2 Layout (Zero-overflow, fits 100% on stage) */
            <div className="w-full h-full max-w-[98vw] 2xl:max-w-[1850px] mx-auto grid grid-cols-1 sm:grid-cols-6 sm:grid-rows-2 gap-2 sm:gap-2.5 lg:gap-3 items-stretch min-h-0">
              {DISTRICT_CONFIG.map(({ id, title, isPrivate }, idx) => {
                const winners = winnersByDistrict[id];
                const hasWinner = drawStatus === 'REVEALED' && winners.length > 0;
                const isCardDrawing = isDrawing;

                return (
                  <div
                    key={id}
                    id={`card-${id}`}
                    className={`district-pane bg-white border-2 sm:border-3 border-[#1a1a1a]/20 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 lg:p-3 shadow-xs transition-all flex flex-col justify-between min-h-0 overflow-hidden ${
                      isCardDrawing
                        ? 'bg-orange-50/80 border-[#ff6a00] shadow-md ring-4 ring-[#ff6a00]/25'
                        : 'hover:border-[#1a1a1a]/40 hover:shadow-sm'
                    } ${
                      idx < 3
                        ? 'col-span-1 sm:col-span-2'
                        : 'col-span-1 sm:col-span-3'
                    }`}
                  >
                    {/* District Header */}
                    <div className="text-center pb-1 mb-1 border-b-2 border-[#ff6a00]/25 relative flex items-center justify-center shrink-0">
                      <h3 className="font-mono text-xs sm:text-sm lg:text-base font-black uppercase tracking-[0.2em] text-[#ff6a00] truncate">
                        {title}
                      </h3>
                      {hasWinner && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] sm:text-xs font-bold text-[#ff6a00] bg-[#ff6a00]/15 border border-[#ff6a00]/30 px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs">
                          {winners.length} 🏆
                        </div>
                      )}
                    </div>

                    {/* Pane Content */}
                    <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden py-0.5">
                      {isCardDrawing ? (
                        <div className="flex-1 flex flex-col justify-between items-center py-0.5 w-full overflow-hidden min-h-0">
                          {/* 3-Line Rolling Mechanical Reel Tumbler */}
                          <div className="flex-1 flex flex-col justify-center items-center w-full px-1 min-h-0 overflow-hidden relative">
                            {/* Cylindrical Reel Top & Bottom Fading Gradients */}
                            <div className="absolute inset-x-0 top-0 h-3 sm:h-4 bg-gradient-to-b from-orange-50/95 to-transparent pointer-events-none z-10" />
                            <div className="absolute inset-x-0 bottom-0 h-3 sm:h-4 bg-gradient-to-t from-orange-50/95 to-transparent pointer-events-none z-10" />

                            <div
                              key={shufflingNames[id]?.name}
                              className="w-full flex-1 flex flex-col items-center justify-around py-0.5 min-h-0 animate-reel-slide"
                            >
                              {/* Line 1: Top / Incoming Candidate */}
                              <div className="w-full text-center px-1 sm:px-2 truncate font-winner font-bold text-xs sm:text-sm md:text-base lg:text-lg text-neutral-400 opacity-45 select-none transform scale-95">
                                {shufflingNames[id]?.topName || '••• DepEd Candidate •••'}
                              </div>

                              {/* Line 2: Center / Active Candidate (Prominent Highlighted Focal Point) */}
                              <div className="w-full text-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-[#ff6a00]/10 border border-[#ff6a00]/30 shadow-2xs">
                                <div className="font-winner font-black text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-[#111827] uppercase tracking-tight text-center leading-tight drop-shadow-xs truncate">
                                  {shufflingNames[id]?.name || 'DepEd Participant'}
                                </div>
                                {shufflingNames[id]?.school && shufflingNames[id]?.name !== 'Awaiting draw...' && (
                                  <div className="font-mono text-[9px] sm:text-[10px] md:text-xs text-[#ff6a00] font-bold uppercase tracking-wider truncate mt-0.5">
                                    {shufflingNames[id]?.school}
                                  </div>
                                )}
                              </div>

                              {/* Line 3: Bottom / Outgoing Candidate */}
                              <div className="w-full text-center px-1 sm:px-2 truncate font-winner font-bold text-xs sm:text-sm md:text-base lg:text-lg text-neutral-400 opacity-45 select-none transform scale-95">
                                {shufflingNames[id]?.bottomName || '••• DepEd Candidate •••'}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono text-[9px] sm:text-[11px] lg:text-xs text-[#ff6a00] font-bold uppercase tracking-widest pt-0.5 shrink-0 animate-pulse">
                            [ SHUFFLING ALL {candidatePoolByDistrict?.[id]?.length || 0} CANDIDATES... ]
                          </div>
                        </div>
                      ) : hasWinner ? (
                        <div className={`flex-1 flex flex-col justify-center min-h-0 ${winners.length > 2 ? 'space-y-0.5 py-0.5 overflow-y-auto pr-0.5' : 'overflow-hidden py-1'}`}>
                          {winners.map((w, idx) => (
                            <div
                              key={idx}
                              className={`text-center ${
                                winners.length > 1 ? 'py-0.5 border-b border-[#1a1a1a]/10 last:border-b-0' : 'py-0.5'
                              }`}
                            >
                              <div
                                className={`font-winner font-black text-[#111827] uppercase tracking-wide leading-tight ${
                                  winners.length === 1
                                    ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
                                    : winners.length <= 3
                                    ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl'
                                    : 'text-sm sm:text-base md:text-lg lg:text-xl'
                                }`}
                              >
                                {w.fullName}
                              </div>
                              {w.school && (
                                <div className="font-mono text-[10px] sm:text-xs md:text-sm text-[#ff6a00] font-bold uppercase tracking-wider truncate mt-0.5">
                                  {w.school}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : drawStatus === 'REVEALED' ? (
                        <div
                          id={`badge-${id}`}
                          className="pane-status font-mono text-xs sm:text-sm text-[#1a1a1a]/40 text-center py-2 font-semibold tracking-wider uppercase"
                        >
                          No winners in this round
                        </div>
                      ) : (
                        <div
                          id={`badge-${id}`}
                          className="pane-status font-mono text-xs sm:text-sm text-[#1a1a1a]/35 text-center py-2 font-semibold tracking-wider uppercase"
                        >
                          Waiting for raffle draw...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Bottom Scrolling Ticker for Pre-Draw Winners */}
        {preDrawWinners.length > 0 && !isDrawing && (
          <div className="bg-[#141414] dark:bg-black border-t-2 border-[#1a1a1a] dark:border-white/15 text-white py-2 px-3 overflow-hidden select-none shrink-0 z-20 flex items-center shadow-lg gap-2 sm:gap-3">
            {/* Header Badge & Operator Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 text-white font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
                <span className="animate-pulse">✨</span>
                <span>PRE-DRAW ({preDrawWinners.length})</span>
              </div>

              {/* Pause / Resume Button */}
              <button
                type="button"
                onClick={() => setIsTickerPaused((prev) => !prev)}
                className={`flex items-center gap-1 font-mono text-[10px] sm:text-xs font-bold uppercase px-2 py-1 border transition-colors cursor-pointer ${
                  isTickerPaused
                    ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400 font-black'
                    : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'
                }`}
                title={isTickerPaused ? 'Click to Resume Ticker Scroll' : 'Click to Pause Ticker (or hover mouse over names)'}
              >
                {isTickerPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                <span className="hidden sm:inline">{isTickerPaused ? 'RESUME' : 'PAUSE'}</span>
              </button>

              {/* Speed Mode Button */}
              <button
                type="button"
                onClick={handleCycleSpeed}
                className="flex items-center gap-1 font-mono text-[10px] sm:text-xs font-bold uppercase px-2 py-1 bg-white/10 text-neutral-200 border border-white/20 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                title="Click to toggle ticker scrolling speed (Normal / Relaxed / Brisk)"
              >
                <Gauge className="w-3 h-3 text-indigo-400" />
                <span className="hidden md:inline text-neutral-400">SPEED:</span>
                <span className="text-amber-400 font-mono font-black">
                  {tickerSpeed === 'slow' ? 'RELAXED' : tickerSpeed === 'fast' ? 'BRISK' : 'NORMAL'}
                </span>
              </button>

              {/* Full LED Wall Showcase Launcher */}
              {onOpenPreDrawViewer && (
                <button
                  type="button"
                  onClick={onOpenPreDrawViewer}
                  className="flex items-center gap-1 font-mono text-[10px] sm:text-xs font-bold uppercase px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 transition-colors cursor-pointer shadow-xs"
                  title="Flash full-screen Pre-Draw Winners Showcase on LED Wall"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">LED SHOWCASE</span>
                </button>
              )}
            </div>

            {/* Scrolling Viewport */}
            <div className="overflow-hidden relative flex-1 ml-1" title="Hover mouse over names to temporarily pause ticker">
              <div
                className="animate-marquee whitespace-nowrap flex items-center gap-8 text-xs sm:text-sm font-bold tracking-wide"
                style={
                  {
                    '--marquee-duration': `${marqueeDuration}s`,
                    '--marquee-play-state': isTickerPaused ? 'paused' : 'running',
                    animationDuration: `${marqueeDuration}s`,
                    animationPlayState: isTickerPaused ? 'paused' : 'running'
                  } as React.CSSProperties
                }
              >
                {marqueeList.map((w, idx) => (
                  <div key={`${w.winnerId}-${idx}`} className="inline-flex items-center gap-2 shrink-0">
                    <span className="text-white font-black uppercase text-xs sm:text-sm tracking-wide">{w.name}</span>
                    <span className="text-neutral-400 font-normal text-[11px] sm:text-xs">({w.school})</span>
                    <span className="text-[#FF6A00] font-black uppercase text-xs sm:text-sm">— {w.prizeName}</span>
                    {w.district && (
                      <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 bg-white/10 text-neutral-300 uppercase tracking-wider">
                        {w.district}
                      </span>
                    )}
                    <span className="text-neutral-600 font-mono text-[11px] ml-2">•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
