'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { District, Winner } from '../../lib/types';
import { 
  Trophy, 
  Search, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  SlidersHorizontal, 
  ArrowLeft, 
  School, 
  Award, 
  CheckCircle2, 
  Printer,
  X,
  Tv,
  LayoutGrid,
  User,
  Clock,
  Layers
} from 'lucide-react';
import { soundSynthesizer } from '../../lib/sound';

interface PreDrawWinnerViewerProps {
  winners: Winner[];
  onBack?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  eventName?: string;
  initialDrawSource?: 'ALL' | 'LIVE' | 'PRE_DRAW';
}

export interface WinnerBatchGroup {
  batchId: string;
  batchNumber: number;
  drawNumber: string;
  drawType: 'LIVE' | 'PRE_DRAW';
  prizeId: string;
  prizeName: string;
  unitValue: number;
  date: string;
  time: string;
  winners: Winner[];
}

const DISTRICT_CONFIG: { id: District; number: string; title: string; color: string; border: string; bg: string; badgeBg: string; isPrivate?: boolean }[] = [
  { 
    id: 'NORTH', 
    number: '01', 
    title: 'North District', 
    color: 'text-emerald-400', 
    border: 'border-emerald-500/40', 
    bg: 'bg-emerald-950/20', 
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
  },
  { 
    id: 'EAST', 
    number: '02', 
    title: 'East District', 
    color: 'text-sky-400', 
    border: 'border-sky-500/40', 
    bg: 'bg-sky-950/20', 
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30' 
  },
  { 
    id: 'WEST', 
    number: '03', 
    title: 'West District', 
    color: 'text-purple-400', 
    border: 'border-purple-500/40', 
    bg: 'bg-purple-950/20', 
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
  },
  { 
    id: 'SOUTH', 
    number: '04', 
    title: 'South District', 
    color: 'text-amber-400', 
    border: 'border-amber-500/40', 
    bg: 'bg-amber-950/20', 
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
  },
  { 
    id: 'PRIVATE', 
    number: '05', 
    title: 'Private (ECCD + Private School + LSB)', 
    color: 'text-rose-400', 
    border: 'border-rose-500/40', 
    bg: 'bg-rose-950/20', 
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    isPrivate: true
  }
];

export const PreDrawWinnerViewer: React.FC<PreDrawWinnerViewerProps> = ({
  winners,
  onBack,
  isFullscreen,
  onToggleFullscreen,
  soundEnabled = false,
  onToggleSound,
  eventName = "MUNICIPAL TEACHERS' DAY 2026",
  initialDrawSource = 'ALL'
}) => {
  // Draw Source Filter: 'ALL' | 'LIVE' | 'PRE_DRAW'
  const [drawSource, setDrawSource] = useState<'ALL' | 'LIVE' | 'PRE_DRAW'>(initialDrawSource);
  const [selectedPrizeFilter, setSelectedPrizeFilter] = useState<string>('ALL');

  // Classification Helpers
  const isLiveWinner = useCallback((w: Winner) => {
    const dt = String(w.drawType || '').toUpperCase();
    const dn = String(w.drawNumber || '').toUpperCase();
    return dt === 'LIVE' || (dt !== 'PRE_DRAW' && !dn.startsWith('PRE'));
  }, []);

  const isPreDrawWinner = useCallback((w: Winner) => {
    const dt = String(w.drawType || '').toUpperCase();
    const dn = String(w.drawNumber || '').toUpperCase();
    return dt === 'PRE_DRAW' || dn.startsWith('PRE');
  }, []);

  // Summary counts
  const liveWinnersCount = useMemo(() => winners.filter(isLiveWinner).length, [winners, isLiveWinner]);
  const preDrawWinnersCount = useMemo(() => winners.filter(isPreDrawWinner).length, [winners, isPreDrawWinner]);
  const totalWinnersCount = winners.length;

  // Filter pool based on active draw source
  const sourceFilteredWinners = useMemo(() => {
    if (drawSource === 'LIVE') return winners.filter(isLiveWinner);
    if (drawSource === 'PRE_DRAW') return winners.filter(isPreDrawWinner);
    return winners;
  }, [winners, drawSource, isLiveWinner, isPreDrawWinner]);

  // Available prizes inside the active source
  const availablePrizes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    sourceFilteredWinners.forEach((w) => {
      const key = w.prizeId || w.prizeName;
      if (!map.has(key)) {
        map.set(key, { id: key, name: w.prizeName, count: 0 });
      }
      map.get(key)!.count += 1;
    });
    return Array.from(map.values());
  }, [sourceFilteredWinners]);

  // Final active pool after prize filtering
  const activeWinners = useMemo(() => {
    if (selectedPrizeFilter === 'ALL') return sourceFilteredWinners;
    return sourceFilteredWinners.filter((w) => (w.prizeId || w.prizeName) === selectedPrizeFilter);
  }, [sourceFilteredWinners, selectedPrizeFilter]);

  // Group active winners into draw batches
  const winnerBatches = useMemo<WinnerBatchGroup[]>(() => {
    const map = new Map<string, WinnerBatchGroup>();
    let batchSeq = 1;
    activeWinners.forEach((w) => {
      const key = w.drawNumber || `${w.prizeId || w.prizeName}_${w.date}_${w.time || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          batchId: key,
          batchNumber: batchSeq++,
          drawNumber: w.drawNumber || `BATCH-${batchSeq - 1}`,
          drawType: (w.drawType as 'LIVE' | 'PRE_DRAW') || (isLiveWinner(w) ? 'LIVE' : 'PRE_DRAW'),
          prizeId: w.prizeId || '',
          prizeName: w.prizeName || 'Special Prize',
          unitValue: w.unitValue || 0,
          date: w.date || '',
          time: w.time || '',
          winners: []
        });
      }
      map.get(key)!.winners.push(w);
    });
    return Array.from(map.values());
  }, [activeWinners, isLiveWinner]);

  // Viewer Display Modes:
  // 'batchCard': Per-Batch Draw Card (Default for Live Stage, auto-cycling Batch 1 -> Batch 2 -> ...)
  // 'stageCard': 5-District Projector Card (Screenshot #2 style, auto-cycling North -> East -> West -> South -> Private)
  // 'spotlight': 1 Winner per Card, cycling every 5s across active winners
  // 'grid': Multi-winner overview grid
  const [viewerMode, setViewerMode] = useState<'batchCard' | 'stageCard' | 'spotlight' | 'grid'>(
    initialDrawSource === 'LIVE' ? 'batchCard' : 'batchCard'
  );

  // Presentation Indices
  const [carouselBatchIndex, setCarouselBatchIndex] = useState(0);
  const [carouselDistrictIndex, setCarouselDistrictIndex] = useState(0);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  // Crossfade Animation Controller (Smooth Fade-Out -> Data Swap -> Fade-In)
  const [fadeState, setFadeState] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const isTransitioningRef = useRef(false);

  const triggerTransition = useCallback((callback: () => void) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setFadeState('fading-out');

    setTimeout(() => {
      callback();
      setFadeState('fading-in');
      setTimeout(() => {
        setFadeState('visible');
        isTransitioningRef.current = false;
      }, 50);
    }, 350);
  }, []);

  // Auto-Cycle Engine (Defaults to Active with 5s per card)
  const [isSlideshowActive, setIsSlideshowActive] = useState<boolean>(true);
  const [slideIntervalSeconds, setSlideIntervalSeconds] = useState<number>(5);
  const [slideProgress, setSlideProgress] = useState(0);

  // Stage UI Visibility (H to toggle)
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);

  // Search & Filter (for Grid Mode)
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Reset pagination, batch index & spotlight when source or prize filter changes
  useEffect(() => {
    setCarouselBatchIndex(0);
    setSpotlightIndex(0);
    setSlideProgress(0);
    setCurrentPage(1);
    if (drawSource === 'LIVE') {
      setViewerMode('batchCard');
    } else if (drawSource === 'PRE_DRAW') {
      setViewerMode('stageCard');
    }
  }, [drawSource, selectedPrizeFilter]);

  // Group winners by district
  const winnersByDistrict = useMemo(() => {
    const map: Record<District, Winner[]> = {
      NORTH: [],
      EAST: [],
      WEST: [],
      SOUTH: [],
      PRIVATE: []
    };
    activeWinners.forEach((w) => {
      const d = (w.district || 'SOUTH') as District;
      if (map[d]) {
        map[d].push(w);
      } else {
        map.SOUTH.push(w);
      }
    });
    return map;
  }, [activeWinners]);

  // Filtered list based on District and Search Query (for grid mode)
  const filteredWinners = useMemo(() => {
    let list = selectedDistrict === 'ALL' ? activeWinners : winnersByDistrict[selectedDistrict] || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((w) => 
        w.name.toLowerCase().includes(q) ||
        w.school.toLowerCase().includes(q) ||
        w.prizeName.toLowerCase().includes(q) ||
        (w.depedId && w.depedId.toLowerCase().includes(q)) ||
        w.winnerId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedDistrict, activeWinners, winnersByDistrict, searchQuery]);

  // Pagination for grid mode
  const totalPages = useMemo(() => {
    if (pageSize === 0 || filteredWinners.length === 0) return 1;
    return Math.ceil(filteredWinners.length / pageSize);
  }, [filteredWinners.length, pageSize]);

  const paginatedWinners = useMemo(() => {
    if (pageSize === 0) return filteredWinners;
    const start = (currentPage - 1) * pageSize;
    return filteredWinners.slice(start, start + pageSize);
  }, [filteredWinners, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDistrict, searchQuery, pageSize]);

  // --- Step Functions with Smooth Crossfade Animation ---
  const handleNextBatch = useCallback(() => {
    if (winnerBatches.length === 0) return;
    if (soundEnabled) soundSynthesizer.playClick();
    triggerTransition(() => {
      setCarouselBatchIndex((prev) => (prev + 1) % winnerBatches.length);
      setSlideProgress(0);
    });
  }, [winnerBatches.length, soundEnabled, triggerTransition]);

  const handlePrevBatch = useCallback(() => {
    if (winnerBatches.length === 0) return;
    if (soundEnabled) soundSynthesizer.playClick();
    triggerTransition(() => {
      setCarouselBatchIndex((prev) => (prev - 1 + winnerBatches.length) % winnerBatches.length);
      setSlideProgress(0);
    });
  }, [winnerBatches.length, soundEnabled, triggerTransition]);

  const handleNextDistrict = useCallback(() => {
    if (soundEnabled) soundSynthesizer.playClick();
    triggerTransition(() => {
      setCarouselDistrictIndex((prev) => (prev + 1) % DISTRICT_CONFIG.length);
      setSlideProgress(0);
    });
  }, [soundEnabled, triggerTransition]);

  const handlePrevDistrict = useCallback(() => {
    if (soundEnabled) soundSynthesizer.playClick();
    triggerTransition(() => {
      setCarouselDistrictIndex((prev) => (prev - 1 + DISTRICT_CONFIG.length) % DISTRICT_CONFIG.length);
      setSlideProgress(0);
    });
  }, [soundEnabled, triggerTransition]);

  const handleNextSpotlight = useCallback(() => {
    if (activeWinners.length === 0) return;
    if (soundEnabled) soundSynthesizer.playClick();
    triggerTransition(() => {
      setSpotlightIndex((prev) => (prev + 1) % activeWinners.length);
      setSlideProgress(0);
    });
  }, [activeWinners.length, soundEnabled, triggerTransition]);

  const handlePrevSpotlight = useCallback(() => {
    if (activeWinners.length === 0) return;
    if (soundEnabled) soundSynthesizer.playClick();
    triggerTransition(() => {
      setSpotlightIndex((prev) => (prev - 1 + activeWinners.length) % activeWinners.length);
      setSlideProgress(0);
    });
  }, [activeWinners.length, soundEnabled, triggerTransition]);

  const handleNextSlide = useCallback(() => {
    if (viewerMode === 'batchCard') {
      handleNextBatch();
    } else if (viewerMode === 'stageCard') {
      handleNextDistrict();
    } else if (viewerMode === 'spotlight') {
      handleNextSpotlight();
    } else {
      triggerTransition(() => {
        if (currentPage < totalPages) {
          setCurrentPage((prev) => prev + 1);
        } else {
          const districts: (District | 'ALL')[] = ['ALL', 'NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];
          const currentIdx = districts.indexOf(selectedDistrict);
          const nextDistrict = districts[(currentIdx + 1) % districts.length];
          setSelectedDistrict(nextDistrict);
          setCurrentPage(1);
        }
        setSlideProgress(0);
      });
    }
  }, [viewerMode, handleNextBatch, handleNextDistrict, handleNextSpotlight, currentPage, totalPages, selectedDistrict, triggerTransition]);

  const handlePrevSlide = useCallback(() => {
    if (viewerMode === 'batchCard') {
      handlePrevBatch();
    } else if (viewerMode === 'stageCard') {
      handlePrevDistrict();
    } else if (viewerMode === 'spotlight') {
      handlePrevSpotlight();
    } else {
      triggerTransition(() => {
        if (currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else {
          const districts: (District | 'ALL')[] = ['ALL', 'NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];
          const currentIdx = districts.indexOf(selectedDistrict);
          const prevDistrict = districts[(currentIdx - 1 + districts.length) % districts.length];
          setSelectedDistrict(prevDistrict);
          setCurrentPage(1);
        }
        setSlideProgress(0);
      });
    }
  }, [viewerMode, handlePrevBatch, handlePrevDistrict, handlePrevSpotlight, currentPage, selectedDistrict, triggerTransition]);

  // 5-Second Interval Timer Engine
  useEffect(() => {
    if (!isSlideshowActive) return;

    const updateIntervalMs = 50;
    const stepIncrement = (updateIntervalMs / (slideIntervalSeconds * 1000)) * 100;

    const interval = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          handleNextSlide();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [isSlideshowActive, slideIntervalSeconds, handleNextSlide]);

  // Keyboard Stage Navigation (Emcee Cues & Operator Controls)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsSlideshowActive((prev) => !prev);
      } else if (e.key === '1') {
        setCarouselDistrictIndex(0);
        setSelectedDistrict('NORTH');
      } else if (e.key === '2') {
        setCarouselDistrictIndex(1);
        setSelectedDistrict('EAST');
      } else if (e.key === '3') {
        setCarouselDistrictIndex(2);
        setSelectedDistrict('WEST');
      } else if (e.key === '4') {
        setCarouselDistrictIndex(3);
        setSelectedDistrict('SOUTH');
      } else if (e.key === '5') {
        setCarouselDistrictIndex(4);
        setSelectedDistrict('PRIVATE');
      } else if (e.key.toLowerCase() === 'b') {
        handleNextBatch();
      } else if (e.key.toLowerCase() === 't') {
        // Toggle Draw Source: ALL -> LIVE -> PRE_DRAW -> ALL
        setDrawSource((prev) => (prev === 'ALL' ? 'LIVE' : prev === 'LIVE' ? 'PRE_DRAW' : 'ALL'));
        setSelectedPrizeFilter('ALL');
      } else if (e.key.toLowerCase() === 'h') {
        setIsControlsVisible((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f' && onToggleFullscreen) {
        onToggleFullscreen();
      } else if (e.key.toLowerCase() === 'm' && onToggleSound) {
        onToggleSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, handleNextBatch, onToggleFullscreen, onToggleSound]);

  // Active district data for Stage Card View
  const currentDistrictConfig = DISTRICT_CONFIG[carouselDistrictIndex] || DISTRICT_CONFIG[0];
  const currentDistrictWinners = winnersByDistrict[currentDistrictConfig.id] || [];

  // Active batch data for Batch Stage Card View
  const currentBatch = winnerBatches.length > 0 ? winnerBatches[carouselBatchIndex % winnerBatches.length] : null;

  // Active winner for Spotlight View
  const currentSpotlightWinner = activeWinners.length > 0 ? activeWinners[spotlightIndex % activeWinners.length] : null;

  // Crossfade Card Animation Classes (Fade Out -> Fade In with zero snapping)
  const fadeCardClasses = `transition-all duration-350 ease-in-out ${
    fadeState === 'fading-out'
      ? 'opacity-0 scale-[0.985] blur-[1px]'
      : fadeState === 'fading-in'
      ? 'opacity-0 scale-[1.01]'
      : 'opacity-100 scale-100 blur-0'
  }`;
  // Dynamic typography scaler for Hero / Spotlight cards to maintain uniform height and prevent overflow
  const getHeroNameFontClass = (name: string) => {
    const cleanName = (name || '').trim();
    const len = cleanName.length;
    const words = cleanName.split(/\s+/).filter(Boolean).length;

    // Ultra long names (>= 36 chars or >= 5 words)
    if (len >= 36 || words >= 5) {
      return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-[4rem] leading-[1.1]';
    }
    // Very long names (>= 28 chars or >= 4 words, e.g. "PASAMANERO, SHAJARA MAE FERNANDEZ")
    if (len >= 28 || words >= 4) {
      return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-[4.85rem] leading-[1.08]';
    }
    // Medium-long names (>= 20 chars or >= 3 words, e.g. "CADIENTE, JONA MAE MONTEBON")
    if (len >= 20 || words >= 3) {
      return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[6.25rem] leading-[1.04]';
    }
    // Short names (< 20 chars, e.g. "ESCANER, ROY O")
    return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[8rem] leading-[1.02]';
  };

  return (
    <div className={`bg-[#0d0d0e] text-[#f8f7f4] flex flex-col select-none relative font-sans ${
      viewerMode === 'grid' ? 'min-h-screen overflow-x-hidden' : 'h-screen max-h-screen overflow-hidden'
    }`}>
      {/* Top 5-Second Progress Bar for LED Wall */}
      {isSlideshowActive && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-neutral-900 z-50 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-[#ff6a00] to-emerald-400 transition-all duration-75 ease-linear shadow-[0_0_12px_rgba(255,106,0,0.8)]"
            style={{ width: `${slideProgress}%` }}
          />
        </div>
      )}

      {/* Control Header Bar */}
      {isControlsVisible && (
        <header className="bg-[#141416] border-b border-white/10 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-40 shadow-lg">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/15 text-xs font-mono font-bold uppercase transition-colors cursor-pointer rounded-xs"
                title="Return to main stage / console"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Console</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-xs shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  {eventName}
                </h1>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-mono">
                  LED Wall Showcase • <span className="text-[#ff6a00] font-bold">{activeWinners.length}</span> Shown ({totalWinnersCount} Total Previous Winners)
                </p>
              </div>
            </div>
          </div>

          {/* Draw Source Switcher Pills */}
          <div className="flex items-center gap-2">
            <div className="inline-flex border border-white/20 rounded-lg p-0.5 bg-neutral-900 shrink-0 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setDrawSource('ALL');
                  setSelectedPrizeFilter('ALL');
                  setSlideProgress(0);
                }}
                className={`px-2.5 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  drawSource === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Show all previous winners (Live Stage + Pre-Draw) [Key: T]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>All ({totalWinnersCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawSource('LIVE');
                  setSelectedPrizeFilter('ALL');
                  setSlideProgress(0);
                }}
                className={`px-2.5 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  drawSource === 'LIVE'
                    ? 'bg-amber-500 text-black shadow-xs font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Show only Main Live Stage Raffle winners [Key: T]"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Live Stage ({liveWinnersCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawSource('PRE_DRAW');
                  setSelectedPrizeFilter('ALL');
                  setSlideProgress(0);
                }}
                className={`px-2.5 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  drawSource === 'PRE_DRAW'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Show only Pre-Draw batch winners [Key: T]"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Pre-Draw ({preDrawWinnersCount})</span>
              </button>
            </div>

            {/* Optional Specific Prize Filter */}
            {availablePrizes.length > 1 && (
              <select
                value={selectedPrizeFilter}
                onChange={(e) => {
                  setSelectedPrizeFilter(e.target.value);
                  setSlideProgress(0);
                }}
                className="bg-neutral-900 border border-white/20 text-neutral-200 text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-md cursor-pointer hover:border-[#ff6a00] transition-colors"
                title="Filter by specific prize"
              >
                <option value="ALL">All Prizes ({sourceFilteredWinners.length})</option>
                {availablePrizes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.count})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mode Switcher: Per Batch vs District Card vs 1-by-1 Spotlight vs Grid */}
          <div className="inline-flex border border-white/20 rounded-lg p-0.5 bg-neutral-900 shrink-0 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                triggerTransition(() => {
                  setViewerMode('batchCard');
                  setSlideProgress(0);
                });
              }}
              className={`px-3 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewerMode === 'batchCard'
                  ? 'bg-amber-500 text-black shadow-xs font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Per-Batch Draw Card (Auto-cycles Batch 1 -> Batch 2 -> ... every 5s with crossfade)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Per Batch</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerTransition(() => {
                  setViewerMode('stageCard');
                  setSlideProgress(0);
                });
              }}
              className={`px-3 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewerMode === 'stageCard'
                  ? 'bg-[#ff6a00] text-white shadow-xs font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Full Projector District Card (5-district rotation, auto-cycling every 5s)"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>District Card</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerTransition(() => {
                  setViewerMode('spotlight');
                  setSlideProgress(0);
                });
              }}
              className={`px-3 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewerMode === 'spotlight'
                  ? 'bg-amber-500 text-black shadow-xs font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="1-by-1 Winner Spotlight (Rotates 1 winner every 5s)"
            >
              <User className="w-3.5 h-3.5" />
              <span>1-by-1 Hero</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerTransition(() => {
                  setViewerMode('grid');
                  setSlideProgress(0);
                });
              }}
              className={`px-3 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewerMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Overview Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {/* Stage Controls: Play/Pause, Speed, Sound, Fullscreen, Hide UI */}
          <div className="flex items-center gap-2">
            {/* Auto-Cycle Play / Pause */}
            <button
              type="button"
              onClick={() => setIsSlideshowActive((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono font-black uppercase transition-all cursor-pointer shadow-sm rounded-xs ${
                isSlideshowActive
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-white/10 text-neutral-300 border-white/20 hover:bg-white/20 hover:text-white'
              }`}
              title="Toggle Auto-Cycle (Spacebar)"
            >
              {isSlideshowActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSlideshowActive ? `CYCLING (${slideIntervalSeconds}S)` : 'PAUSED'}</span>
            </button>

            {/* Interval Selector */}
            <select
              value={slideIntervalSeconds}
              onChange={(e) => {
                setSlideIntervalSeconds(Number(e.target.value));
                setSlideProgress(0);
              }}
              className="bg-black border border-white/20 text-amber-400 font-mono text-xs px-2 py-1.5 outline-none cursor-pointer rounded-xs"
              title="Change auto-cycle interval"
            >
              <option value={3}>3s / card</option>
              <option value={5}>5s / card (Default)</option>
              <option value={8}>8s / card</option>
              <option value={10}>10s / card</option>
            </select>

            {/* Sound Toggle */}
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer rounded-xs"
                title={soundEnabled ? 'Mute Transition Chimes' : 'Unmute Chimes'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#ff6a00]" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
              </button>
            )}

            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer rounded-xs"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Stage Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {/* Hide UI for Clean LED Broadcast */}
            <button
              type="button"
              onClick={() => setIsControlsVisible(false)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-400 hover:text-white text-xs font-mono transition-colors rounded-xs cursor-pointer"
              title="Hide top bar for 100% clean LED Wall view (Press 'H' to show again)"
            >
              Hide UI (H)
            </button>
          </div>
        </header>
      )}

      {/* Floating Unhide Button when Header is Hidden */}
      {!isControlsVisible && (
        <button
          type="button"
          onClick={() => setIsControlsVisible(true)}
          className="fixed top-3 right-3 z-50 p-2.5 bg-black/80 hover:bg-black border border-white/30 text-neutral-300 hover:text-white rounded-full transition-all shadow-2xl backdrop-blur-md cursor-pointer group"
          title="Show stage controls (Press 'H')"
        >
          <SlidersHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform text-[#ff6a00]" />
        </button>
      )}

      {/* Empty State when no winners exist in active filter */}
      {activeWinners.length === 0 ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto my-auto animate-fade-in">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-indigo-600/20 border-2 border-indigo-500/50 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 animate-pulse" />
          </div>
          <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-[#ff6a00] mb-2">
            OFFICIAL LED WALL BROADCAST
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase text-white tracking-tight leading-tight">
            {drawSource === 'LIVE'
              ? 'STANDBY FOR LIVE STAGE RAFFLE WINNERS'
              : drawSource === 'PRE_DRAW'
              ? 'STANDBY FOR PRE-DRAW WINNERS'
              : 'STANDBY FOR RAFFLE WINNERS'}
          </h2>
          <p className="text-neutral-400 font-mono text-sm sm:text-base max-w-xl mt-3 leading-relaxed">
            {drawSource === 'LIVE'
              ? 'Live stage raffle winners will automatically appear and cycle here on the LED Wall in real-time as rounds are drawn.'
              : drawSource === 'PRE_DRAW'
              ? 'Pre-draw winners will automatically appear and cycle here on the LED Wall in real-time as batches are confirmed by the raffle committee.'
              : 'Previous winners will automatically appear and cycle here on the LED Wall in real-time.'}
          </p>
          <div className="mt-8 px-6 py-2.5 bg-neutral-900 border border-white/10 rounded-full font-mono text-xs text-neutral-300 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>LISTENING FOR LIVE SUPABASE REALTIME SYNC</span>
          </div>
        </main>
      ) : viewerMode === 'batchCard' && currentBatch ? (
          <main className="flex-1 flex flex-col justify-between p-2.5 sm:p-4 lg:p-6 max-w-[1700px] w-full mx-auto min-h-0 overflow-hidden">
            {/* Top Projector Header Bar */}
            <div className="bg-[#111827] rounded-xl p-3 sm:p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-white shrink-0 shadow-xl">
              {/* Left: Status Badge */}
              <div className="flex items-center gap-2 w-full sm:w-1/4 justify-start">
                <span className={`px-3.5 py-1.5 font-mono text-xs font-black uppercase rounded shadow-xs flex items-center gap-2 ${
                  currentBatch.drawType === 'LIVE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{currentBatch.drawType === 'LIVE' ? 'LIVE STAGE RAFFLE' : 'PRE-DRAW BATCH'}</span>
                </span>
              </div>

              {/* Center: Large Prize & Value */}
              <div className="text-center w-full sm:w-2/4">
                <div className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black text-[#ff6a00] tracking-tight uppercase truncate drop-shadow-md">
                  {currentBatch.prizeName}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1 text-xs font-mono">
                  {currentBatch.unitValue > 0 && (
                    <span className="text-amber-300 font-bold px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 rounded-xs">
                      ₱{currentBatch.unitValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ea
                    </span>
                  )}
                  <span className="text-neutral-400 uppercase tracking-widest font-black">
                    LGU MALUNGON • BATCH {currentBatch.batchNumber} OF {winnerBatches.length} ({isSlideshowActive ? `${slideIntervalSeconds}S ROTATION` : 'PAUSED'})
                  </span>
                </div>
              </div>

              {/* Right: Quick Batch Cue */}
              <div className="flex items-center gap-2 w-full sm:w-1/4 justify-end font-mono text-xs text-neutral-400">
                <span className="px-2.5 py-1 bg-black/40 border border-white/10 rounded font-black text-amber-400">
                  REF: #{currentBatch.drawNumber}
                </span>
              </div>
            </div>

            {/* Massive Projector Stage Card with Fade In/Out */}
            <div className={`my-2 sm:my-3 flex-1 bg-[#121418] border-3 sm:border-4 border-amber-500 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl ring-4 ring-amber-500/20 flex flex-col justify-between min-h-0 overflow-hidden ${fadeCardClasses}`}>
              {/* Card Header */}
              <div className="pb-2.5 mb-2.5 border-b-2 border-amber-500/40 flex items-center justify-between gap-2 px-1 sm:px-2 shrink-0">
                <div className="flex items-center justify-start gap-1.5 sm:gap-2 shrink-0">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                  <span className="font-mono text-xs sm:text-base font-black text-amber-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    OFFICIAL BATCH WINNERS
                  </span>
                </div>

                <div className="flex-1 text-center px-2 min-w-0 flex flex-col items-center justify-center">
                  <h3 className="font-mono text-xl sm:text-3xl lg:text-4xl font-black uppercase tracking-[0.15em] text-white leading-none truncate max-w-full">
                    {currentBatch.drawNumber}
                  </h3>
                  {(currentBatch.date || currentBatch.time) && (
                    <span className="font-mono text-[10px] sm:text-xs text-neutral-400 tracking-widest uppercase mt-1">
                      DRAW RECORD: {currentBatch.date} {currentBatch.time}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end shrink-0">
                  <div className="font-mono text-xs sm:text-base font-black text-amber-300 bg-amber-950/40 border border-amber-700/50 px-3.5 sm:px-5 py-1.5 rounded-full whitespace-nowrap shadow-xs">
                    {currentBatch.winners.length} {currentBatch.winners.length === 1 ? 'Winner' : 'Winners'}
                  </div>
                </div>
              </div>

              {/* Card Center: Winner Names */}
              <div className="flex-1 flex flex-col justify-center items-center py-2 sm:py-3 px-2 overflow-hidden min-h-0">
                {currentBatch.winners.length === 1 ? (
                  <div className="text-center w-full py-2 space-y-2 sm:space-y-3 my-auto">
                    <div className={`font-winner font-black uppercase text-white tracking-tight drop-shadow-2xl max-w-full break-words px-2 ${getHeroNameFontClass(currentBatch.winners[0].name)}`}>
                      {currentBatch.winners[0].name}
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl xl:text-3xl text-amber-300 font-semibold font-mono truncate max-w-full">
                      {currentBatch.winners[0].school}
                    </div>
                    <div className="text-[11px] sm:text-xs md:text-sm text-neutral-300 font-mono flex items-center justify-center gap-2 flex-wrap">
                      {currentBatch.winners[0].position && <span>{currentBatch.winners[0].position}</span>}
                      <span>•</span>
                      <span className="px-2.5 py-0.5 rounded font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {currentBatch.winners[0].district} DISTRICT
                      </span>
                      <span>•</span>
                      <span className="text-neutral-400 font-bold">{currentBatch.winners[0].winnerId || currentBatch.winners[0].depedId}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`w-full flex flex-col justify-center items-center ${
                    currentBatch.winners.length <= 3 ? 'space-y-4 sm:space-y-6' : 'space-y-2 sm:space-y-3'
                  }`}>
                    {currentBatch.winners.map((w, idx) => (
                      <div key={idx} className="text-center w-full border-b border-white/10 pb-3 last:border-0 last:pb-0">
                        <div
                          className={`font-winner font-black text-white uppercase tracking-tight leading-[1.06] drop-shadow-lg ${
                            currentBatch.winners.length <= 3
                              ? 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl'
                              : currentBatch.winners.length <= 5
                              ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
                              : 'text-xl sm:text-2xl md:text-3xl'
                          }`}
                        >
                          {w.name}
                        </div>
                        <div className="text-xs sm:text-base md:text-lg font-mono text-neutral-300 mt-1 flex items-center justify-center gap-2 flex-wrap">
                          <span className="text-amber-300 font-bold">{w.school}</span>
                          {w.position && <span>• {w.position}</span>}
                          <span className="px-2 py-0.5 rounded font-black text-[10px] sm:text-xs uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            {w.district}
                          </span>
                          <span className="text-neutral-400 font-bold text-xs">{w.winnerId || w.depedId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Event Title */}
              <div className="shrink-0 text-center pt-3 flex flex-col items-center">
                <div className="w-36 sm:w-56 h-0.5 bg-gradient-to-r from-transparent via-neutral-600 to-transparent mb-2 rounded-full" />
                <span className="font-mono text-xs sm:text-sm text-neutral-400 font-bold uppercase tracking-[0.25em]">
                  MALUNGON MUNICIPAL TEACHERS&apos; DAY 2026
                </span>
              </div>
            </div>

            {/* Batch Carousel Navigation Strip */}
            <div className="flex flex-col items-center justify-center gap-2 pt-1 font-mono shrink-0">
              <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap max-w-full">
                <button
                  type="button"
                  onClick={handlePrevBatch}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                  title="Previous Batch (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Clickable Batch Indicator Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[80vw] py-1 px-2 no-scrollbar">
                  {winnerBatches.map((b, idx) => {
                    const isCurrent = idx === carouselBatchIndex;
                    return (
                      <button
                        key={b.batchId}
                        type="button"
                        onClick={() => {
                          triggerTransition(() => {
                            setCarouselBatchIndex(idx);
                            setSlideProgress(0);
                          });
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.8)] font-black scale-105'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10'
                        }`}
                        title={`Batch ${b.batchNumber}: ${b.prizeName} (${b.winners.length} winners)`}
                      >
                        <span>Batch {b.batchNumber}</span>
                        <span className="text-[10px] opacity-75">({b.winners.length})</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleNextBatch}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                  title="Next Batch (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSlideshowActive(!isSlideshowActive)}
                  className={`p-2 rounded-full text-white transition-colors cursor-pointer ${
                    isSlideshowActive ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                  title={isSlideshowActive ? 'Pause Auto-cycling' : 'Resume Auto-cycling'}
                >
                  {isSlideshowActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-neutral-400 tracking-wider uppercase">
                ‹ › ARROW KEYS • [B] NEXT BATCH • [T] TOGGLE SOURCE • {isSlideshowActive ? `AUTO CYCLING EVERY ${slideIntervalSeconds} SECONDS (CROSSFADE)` : 'ROTATION PAUSED'}
              </div>
            </div>
          </main>
        ) : viewerMode === 'stageCard' ? (
          <main className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto min-h-0">
            {/* Top Projector Header Bar */}
            <div className="bg-[#111827] rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-white shrink-0 shadow-xl">
              {/* Left: Status Badge */}
              <div className="flex items-center gap-2 w-full sm:w-1/4 justify-start">
                {drawSource === 'LIVE' ? (
                  <span className="px-3.5 py-1.5 font-mono text-xs font-black uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    <span>LIVE STAGE RAFFLE</span>
                  </span>
                ) : drawSource === 'PRE_DRAW' ? (
                  <span className="px-3.5 py-1.5 font-mono text-xs font-black uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>PRE-DRAW BATCH</span>
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 font-mono text-xs font-black uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-indigo-300" />
                    <span>OFFICIAL WINNERS</span>
                  </span>
                )}
              </div>

              {/* Center: Large Prize & Allocation Subtext */}
              <div className="text-center w-full sm:w-2/4">
                <div className="font-mono text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase truncate">
                  {selectedPrizeFilter !== 'ALL'
                    ? selectedPrizeFilter
                    : currentDistrictWinners.length > 0 && currentDistrictWinners[0].unitValue > 0
                    ? `₱ ${currentDistrictWinners[0].unitValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : currentDistrictWinners.length > 0
                    ? currentDistrictWinners[0].prizeName
                    : drawSource === 'LIVE'
                    ? 'LIVE STAGE RAFFLE'
                    : drawSource === 'PRE_DRAW'
                    ? 'OFFICIAL PRE-DRAW'
                    : 'RAFFLE WINNERS'}
                </div>
                <div className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#ff6a00] mt-1">
                  LGU MALUNGON • 5-DISTRICT ROTATION ({isSlideshowActive ? `${slideIntervalSeconds}S PER CARD` : 'PAUSED'})
                </div>
              </div>

              {/* Right: Quick Navigation Cues */}
              <div className="flex items-center gap-2 w-full sm:w-1/4 justify-end font-mono text-xs text-neutral-400">
                <span className="hidden sm:inline">DISTRICT {carouselDistrictIndex + 1} OF 5</span>
              </div>
            </div>

            {/* Massive Projector Stage Card (Screenshot #2) */}
            <div className={`my-2 sm:my-3 flex-1 bg-[#121418] border-3 sm:border-4 border-emerald-500 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl ring-4 ring-emerald-500/20 flex flex-col justify-between min-h-0 overflow-hidden ${fadeCardClasses}`}>
              {/* Card Header */}
              <div className="pb-2.5 mb-2.5 border-b-2 border-[#ff6a00]/30 flex items-center justify-between gap-2 px-1 sm:px-2 shrink-0 relative">
                <div className="flex items-center justify-start gap-1.5 sm:gap-2 shrink-0 z-10">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                  <span className="font-mono text-xs sm:text-base font-black text-emerald-400 uppercase tracking-[0.2em] whitespace-nowrap">
                    DISTRICT WINNERS
                  </span>
                </div>

                <div className="flex-1 text-center px-2 min-w-0 flex flex-col items-center justify-center">
                  <h3 className="font-mono text-xl sm:text-3xl lg:text-4xl font-black uppercase tracking-[0.2em] text-[#ff6a00] leading-none truncate max-w-full">
                    {currentDistrictConfig.id === 'PRIVATE' ? 'PRIVATE' : currentDistrictConfig.title}
                  </h3>
                  {currentDistrictConfig.id === 'PRIVATE' && (
                    <span className="font-mono text-xs sm:text-sm font-bold text-neutral-400 tracking-wider uppercase mt-1 truncate max-w-full">
                      ECCD • Private School • LSB
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end shrink-0 z-10">
                  <div className="font-mono text-xs sm:text-base font-black text-[#ff6a00] bg-orange-950/40 border border-orange-700/50 px-3.5 sm:px-5 py-1.5 rounded-full whitespace-nowrap shadow-xs">
                    {currentDistrictWinners.length} {currentDistrictWinners.length === 1 ? 'Winner' : 'Winners'}
                  </div>
                </div>
              </div>

              {/* Card Center: Winner Names */}
              <div className="flex-1 flex flex-col justify-center items-center py-2 sm:py-3 px-2 overflow-hidden min-h-0">
                {currentDistrictWinners.length > 0 ? (
                  <div className={`flex flex-col justify-center items-center w-full ${
                    currentDistrictWinners.length <= 3 ? 'space-y-4 sm:space-y-6' : 'space-y-2 sm:space-y-3'
                  }`}>
                    {currentDistrictWinners.map((w, idx) => (
                      <div key={idx} className="text-center w-full animate-fade-in">
                        <div
                          className={`font-winner font-black text-white uppercase tracking-tight leading-[1.06] drop-shadow-lg max-w-full break-words px-2 ${
                            currentDistrictWinners.length === 1
                              ? getHeroNameFontClass(w.name)
                              : currentDistrictWinners.length <= 3
                              ? 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl'
                              : currentDistrictWinners.length <= 5
                              ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                              : 'text-lg sm:text-xl md:text-2xl'
                          }`}
                        >
                          {w.name}
                        </div>
                        <div className="text-xs sm:text-base md:text-lg font-mono text-neutral-300 mt-1 sm:mt-2">
                          <span className="text-amber-300 font-bold">{w.school}</span>
                          {w.position ? ` • ${w.position}` : ''} • <span className="font-bold text-indigo-400">{w.winnerId || w.depedId}</span>
                          {drawSource === 'ALL' && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                              isLiveWinner(w)
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {isLiveWinner(w) ? 'LIVE STAGE' : 'PRE-DRAW'}
                            </span>
                          )}
                        </div>
                        {(currentDistrictWinners.length > 1 || selectedPrizeFilter === 'ALL') && (
                          <div className="text-[11px] sm:text-xs font-mono text-[#ff6a00] font-black uppercase mt-0.5">
                            PRIZE: {w.prizeName} {w.unitValue > 0 ? `(₱${w.unitValue.toLocaleString()})` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-2 text-neutral-400 font-mono">
                    <div className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-neutral-400">
                      No winners recorded yet for {currentDistrictConfig.title}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Auto-advancing to next district in {slideIntervalSeconds}s...
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Event Title (Screenshot #2) */}
              <div className="shrink-0 text-center pt-3 flex flex-col items-center">
                <div className="w-36 sm:w-56 h-0.5 bg-gradient-to-r from-transparent via-neutral-600 to-transparent mb-2 rounded-full" />
                <span className="font-mono text-xs sm:text-sm text-neutral-400 font-bold uppercase tracking-[0.25em]">
                  MALUNGON MUNICIPAL TEACHERS&apos; DAY 2026
                </span>
              </div>
            </div>

            {/* Carousel Navigation Strip */}
            <div className="flex flex-col items-center justify-center gap-2 pt-1 font-mono shrink-0">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevDistrict}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                  title="Previous District (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {DISTRICT_CONFIG.map((d, idx) => {
                  const hasWin = (winnersByDistrict[d.id] || []).length > 0;
                  const isCurrent = idx === carouselDistrictIndex;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setCarouselDistrictIndex(idx);
                        setSlideProgress(0);
                      }}
                      className={`transition-all duration-300 rounded-full cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'w-10 sm:w-12 h-3.5 bg-[#ff6a00] shadow-[0_0_12px_rgba(255,106,0,0.8)]'
                          : hasWin
                          ? 'w-3.5 h-3.5 bg-emerald-400 hover:bg-emerald-300 hover:scale-125'
                          : 'w-3.5 h-3.5 bg-neutral-600 hover:bg-neutral-500'
                      }`}
                      title={`${d.title} (${(winnersByDistrict[d.id] || []).length} winners)`}
                    />
                  );
                })}

                <button
                  type="button"
                  onClick={handleNextDistrict}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                  title="Next District (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSlideshowActive(!isSlideshowActive)}
                  className={`p-2 rounded-full text-white transition-colors cursor-pointer ${
                    isSlideshowActive ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                  title={isSlideshowActive ? 'Pause Auto-cycling' : 'Resume Auto-cycling'}
                >
                  {isSlideshowActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-neutral-400 tracking-wider uppercase">
                ‹ › ARROW KEYS TO NAVIGATE • [T] TOGGLE SOURCE • {isSlideshowActive ? `AUTO CYCLING EVERY ${slideIntervalSeconds} SECONDS` : 'ROTATION PAUSED'}
              </div>
            </div>
          </main>
        ) : /* ========================================================================= */
        /* MODE 2: 1-BY-1 WINNER SPOTLIGHT (Single Winner per 5-Second Card)          */
        /* ========================================================================= */
        viewerMode === 'spotlight' && currentSpotlightWinner ? (
          <main className="flex-1 flex flex-col justify-between p-2.5 sm:p-4 lg:p-5 max-w-[1550px] w-full mx-auto animate-fade-in min-h-0 overflow-hidden">
            {/* Top Meta Bar */}
            <div className="bg-[#111827] rounded-xl px-4 py-2 border border-white/10 flex items-center justify-between text-white shadow-xl shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-black tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>WINNER {spotlightIndex + 1} OF {activeWinners.length}</span>
                </span>
                <span className="font-mono text-xs uppercase px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded font-bold">
                  {currentSpotlightWinner.district} DISTRICT
                </span>
                <span className={`font-mono text-xs uppercase px-3 py-1 rounded font-black tracking-wider ${
                  isLiveWinner(currentSpotlightWinner)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {isLiveWinner(currentSpotlightWinner) ? '🏆 LIVE STAGE' : '⚡ PRE-DRAW'}
                </span>
              </div>

              <div className="font-mono text-xs text-neutral-400 hidden sm:block">
                DRAW REF #{currentSpotlightWinner.drawNumber || 'TD-2026'}
              </div>
            </div>

            {/* Massive Cinema-Scale Hero Card (Guaranteed Uniform & No Cut Off) */}
            <div className={`my-2 sm:my-3 flex-1 bg-gradient-to-b from-[#14151a] to-[#0c0d10] border-3 sm:border-4 border-[#ff6a00] rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_0_80px_rgba(255,106,0,0.25)] flex flex-col justify-between text-center min-h-0 overflow-hidden ${fadeCardClasses}`}>
              {/* Badge */}
              <div className="shrink-0 flex items-center justify-center">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1 font-mono font-black text-xs sm:text-sm uppercase tracking-widest rounded-full shadow-md ${
                  isLiveWinner(currentSpotlightWinner) ? 'bg-amber-400 text-black' : 'bg-[#ff6a00] text-black'
                }`}>
                  <Trophy className="w-4 h-4 fill-current" />
                  <span>{isLiveWinner(currentSpotlightWinner) ? 'LIVE STAGE RAFFLE WINNER' : 'PRE-DRAW RAFFLE WINNER'}</span>
                </div>
              </div>

              {/* Huge Name with Dynamic Proportional Typography */}
              <div className="my-auto py-2 sm:py-3 flex-1 flex flex-col justify-center items-center min-h-0 overflow-hidden">
                <h2 className={`font-winner font-black uppercase text-white tracking-tight drop-shadow-2xl max-w-full break-words px-2 ${getHeroNameFontClass(currentSpotlightWinner.name)}`}>
                  {currentSpotlightWinner.name}
                </h2>
                <div className="text-base sm:text-xl lg:text-2xl xl:text-3xl text-amber-300 font-semibold mt-2 sm:mt-3 font-mono truncate max-w-full">
                  {currentSpotlightWinner.school}
                </div>
                {currentSpotlightWinner.position && (
                  <div className="text-[11px] sm:text-xs md:text-sm text-neutral-400 font-mono uppercase mt-1 tracking-wider">
                    {currentSpotlightWinner.position} • ID: <strong className="text-indigo-400">{currentSpotlightWinner.winnerId || currentSpotlightWinner.depedId}</strong>
                  </div>
                )}
              </div>

              {/* Awarded Prize Box */}
              <div className="shrink-0 max-w-xl w-full mx-auto p-3 sm:p-4 bg-black/60 border-2 border-amber-500/60 rounded-2xl shadow-lg">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-neutral-400 block mb-0.5">
                  {isLiveWinner(currentSpotlightWinner) ? 'LIVE STAGE RAFFLE AWARD' : 'OFFICIAL PRE-DRAW AWARD'}
                </span>
                <span className="text-xl sm:text-3xl lg:text-4xl font-black uppercase text-[#ff6a00] block tracking-wide truncate">
                  {currentSpotlightWinner.prizeName}
                </span>
                {currentSpotlightWinner.unitValue > 0 && (
                  <span className="text-xs sm:text-sm font-mono text-neutral-300 mt-0.5 block">
                    Cash Value: ₱{currentSpotlightWinner.unitValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Step Controls */}
            <div className="flex items-center justify-center gap-4 font-mono text-xs shrink-0 pt-1">
              <button
                type="button"
                onClick={handlePrevSpotlight}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded border border-white/20 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <span className="text-neutral-400 uppercase tracking-wider">
                CARD {spotlightIndex + 1} OF {activeWinners.length} • AUTO-CYCLING EVERY {slideIntervalSeconds}S
              </span>
              <button
                type="button"
                onClick={handleNextSpotlight}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded border border-white/20 flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </main>
        ) : (
          /* ========================================================================= */
          /* MODE 3: OVERVIEW GRID (Multi-card overview)                                */
          /* ========================================================================= */
          <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-[1920px] w-full mx-auto justify-between animate-fade-in">
            {/* Headline */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6 border-b border-white/15 pb-4">
              <div>
                <span className="font-mono text-xs uppercase px-2.5 py-0.5 bg-[#ff6a00] text-black font-black tracking-widest">
                  OFFICIAL ANNOUNCEMENT
                </span>
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mt-1.5">
                  {drawSource === 'LIVE'
                    ? `LIVE STAGE RAFFLE WINNERS (${filteredWinners.length})`
                    : drawSource === 'PRE_DRAW'
                    ? `PRE-DRAW BATCH WINNERS (${filteredWinners.length})`
                    : `ALL RAFFLE WINNERS (${filteredWinners.length})`}
                </h2>
              </div>
              <div className="text-right font-mono text-xs text-neutral-400">
                PAGE {currentPage} OF {totalPages}
              </div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-1 content-start">
              {paginatedWinners.map((winner, idx) => {
                const dConfig = DISTRICT_CONFIG.find((d) => d.id === winner.district);
                const isLive = isLiveWinner(winner);
                return (
                  <div
                    key={`${winner.winnerId}-${idx}`}
                    className="bg-[#151518] hover:bg-[#1c1c20] border-2 border-white/15 hover:border-[#ff6a00] p-4 sm:p-5 flex flex-col justify-between transition-all duration-150 rounded-xl shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-black text-neutral-400">
                        #{(currentPage - 1) * (pageSize || 0) + idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                          isLive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {isLive ? 'LIVE' : 'PRE-DRAW'}
                        </span>
                        {dConfig && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 border ${dConfig.badgeBg} font-black uppercase tracking-wider`}>
                            {dConfig.number} {dConfig.id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black uppercase text-white leading-tight">
                        {winner.name}
                      </h4>
                      <p className="text-xs text-neutral-300 mt-1 truncate">
                        {winner.school}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-[#ff6a00] font-black truncate">{winner.prizeName}</span>
                      <span className="text-neutral-500 text-[10px]">{winner.winnerId}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Page Controls */}
            <footer className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span>SHOW:</span>
                {[8, 12, 16].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPageSize(sz)}
                    className={`px-2 py-0.5 border ${
                      pageSize === sz ? 'bg-[#ff6a00] text-black border-[#ff6a00] font-black' : 'bg-white/5 border-white/15'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded border border-white/20"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded border border-white/20"
                >
                  Next
                </button>
              </div>
            </footer>
          </main>
        )}
      </div>
  );
};
