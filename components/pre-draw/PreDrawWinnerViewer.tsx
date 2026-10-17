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
  X
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
}

const DISTRICT_CONFIG: { id: District; number: string; title: string; color: string; border: string; bg: string; badgeBg: string }[] = [
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
    title: 'Private / ECCD / LSB', 
    color: 'text-rose-400', 
    border: 'border-rose-500/40', 
    bg: 'bg-rose-950/20', 
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
  }
];

export const PreDrawWinnerViewer: React.FC<PreDrawWinnerViewerProps> = ({
  winners,
  onBack,
  isFullscreen,
  onToggleFullscreen,
  soundEnabled = true,
  onToggleSound,
  eventName = "MUNICIPAL TEACHERS' DAY 2026"
}) => {
  // Filter only pre-draw winners
  const preDrawWinners = useMemo(() => {
    return winners.filter((w) => w.drawType === 'PRE_DRAW' || String(w.drawNumber || '').toUpperCase().startsWith('PRE'));
  }, [winners]);

  // Active District Filter ('ALL' | District)
  const [selectedDistrict, setSelectedDistrict] = useState<District | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12); // 8, 12, 16, or 0 (All)
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideIntervalSeconds, setSlideIntervalSeconds] = useState(10);
  const [slideProgress, setSlideProgress] = useState(0);
  const [spotlightWinner, setSpotlightWinner] = useState<Winner | null>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Group winners by district
  const winnersByDistrict = useMemo(() => {
    const map: Record<District, Winner[]> = {
      NORTH: [],
      EAST: [],
      WEST: [],
      SOUTH: [],
      PRIVATE: []
    };
    preDrawWinners.forEach((w) => {
      const d = (w.district || 'SOUTH') as District;
      if (map[d]) {
        map[d].push(w);
      } else {
        map.SOUTH.push(w);
      }
    });
    return map;
  }, [preDrawWinners]);

  // Filtered list based on District and Search Query
  const filteredWinners = useMemo(() => {
    let list = selectedDistrict === 'ALL' ? preDrawWinners : winnersByDistrict[selectedDistrict] || [];
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
  }, [selectedDistrict, preDrawWinners, winnersByDistrict, searchQuery]);

  // Pagination calculation
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
  const [prevFilterKey, setPrevFilterKey] = useState(() => `${selectedDistrict}|${searchQuery}|${pageSize}`);
  const currentFilterKey = `${selectedDistrict}|${searchQuery}|${pageSize}`;
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
    setSlideProgress(0);
  }

  // Slideshow advance function
  const handleNextSlide = useCallback(() => {
    if (soundEnabled) {
      soundSynthesizer.playSuccess();
    }
    // If there are more pages in current district, advance page
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      return;
    }

    // Otherwise, advance to next district
    const districts: (District | 'ALL')[] = ['ALL', 'NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];
    const currentIdx = districts.indexOf(selectedDistrict);
    const nextDistrict = districts[(currentIdx + 1) % districts.length];
    setSelectedDistrict(nextDistrict);
    setCurrentPage(1);
  }, [currentPage, totalPages, selectedDistrict, soundEnabled]);

  const handlePrevSlide = useCallback(() => {
    if (soundEnabled) {
      soundSynthesizer.playClick();
    }
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      return;
    }

    const districts: (District | 'ALL')[] = ['ALL', 'NORTH', 'EAST', 'WEST', 'SOUTH', 'PRIVATE'];
    const currentIdx = districts.indexOf(selectedDistrict);
    const prevDistrict = districts[(currentIdx - 1 + districts.length) % districts.length];
    setSelectedDistrict(prevDistrict);
    setCurrentPage(1);
  }, [currentPage, selectedDistrict, soundEnabled]);

  // Slideshow Timer Effect
  const [prevIsSlideshowActive, setPrevIsSlideshowActive] = useState(isSlideshowActive);
  if (isSlideshowActive !== prevIsSlideshowActive) {
    setPrevIsSlideshowActive(isSlideshowActive);
    if (!isSlideshowActive) {
      setSlideProgress(0);
    }
  }

  useEffect(() => {
    if (!isSlideshowActive) return;

    const updateIntervalMs = 100;
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
      // Don't trigger hotkeys if typing in search bar
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
      } else if (e.key === '0') {
        setSelectedDistrict('ALL');
      } else if (e.key === '1') {
        setSelectedDistrict('NORTH');
      } else if (e.key === '2') {
        setSelectedDistrict('EAST');
      } else if (e.key === '3') {
        setSelectedDistrict('WEST');
      } else if (e.key === '4') {
        setSelectedDistrict('SOUTH');
      } else if (e.key === '5') {
        setSelectedDistrict('PRIVATE');
      } else if (e.key.toLowerCase() === 'h') {
        setIsControlsVisible((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f' && onToggleFullscreen) {
        onToggleFullscreen();
      } else if (e.key === 'Escape' && spotlightWinner) {
        setSpotlightWinner(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, onToggleFullscreen, spotlightWinner]);

  // Active district config
  const activeDistrictConfig = DISTRICT_CONFIG.find((d) => d.id === selectedDistrict);

  return (
    <div className="min-h-screen bg-[#0d0d0e] text-[#f8f7f4] flex flex-col select-none relative overflow-x-hidden font-sans">
      {/* Top Progress Bar for Slideshow */}
      {isSlideshowActive && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-neutral-900 z-50 overflow-hidden">
          <div 
            className="h-full bg-linear-to-r from-amber-500 via-orange-500 to-[#FF6A00] transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(255,106,0,0.8)]"
            style={{ width: `${slideProgress}%` }}
          />
        </div>
      )}

      {/* Control Header Bar */}
      {isControlsVisible && (
        <header className="bg-[#141416] border-b border-white/10 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-40 shadow-lg">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/15 text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                title="Return to main stage / console"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  {eventName}
                </h1>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-mono">
                  LED Wall Showcase • Pre-Draw Winners ({preDrawWinners.length} Total)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teacher, school, prize..."
              className="w-full bg-black/60 border border-white/20 focus:border-[#FF6A00] text-white text-xs pl-8 pr-7 py-1.5 outline-hidden transition-colors font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stage Cue & Playback Controls */}
          <div className="flex items-center gap-2">
            {/* Slideshow Toggle */}
            <button
              type="button"
              onClick={() => setIsSlideshowActive((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono font-black uppercase transition-all cursor-pointer shadow-sm ${
                isSlideshowActive
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20 hover:text-white'
              }`}
              title="Toggle Auto-Play Slideshow (Spacebar)"
            >
              {isSlideshowActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSlideshowActive ? 'PAUSE AUTO-CYCLE' : 'AUTO-CYCLE'}</span>
            </button>

            {/* Slideshow Speed Selector */}
            {isSlideshowActive && (
              <select
                value={slideIntervalSeconds}
                onChange={(e) => setSlideIntervalSeconds(Number(e.target.value))}
                className="bg-black border border-white/20 text-amber-400 font-mono text-xs px-2 py-1.5 outline-hidden cursor-pointer"
                title="Slide rotation time"
              >
                <option value={6}>6s / slide</option>
                <option value={10}>10s / slide</option>
                <option value={15}>15s / slide</option>
                <option value={20}>20s / slide</option>
              </select>
            )}

            {/* Sound Toggle */}
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FF6A00]" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
              </button>
            )}

            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Stage Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {/* Hide Controls Hint */}
            <button
              type="button"
              onClick={() => setIsControlsVisible(false)}
              className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-400 hover:text-white text-xs font-mono transition-colors"
              title="Hide top controls for broadcast / clean LED Wall view (Press 'H' to show again)"
            >
              Hide UI
            </button>
          </div>
        </header>
      )}

      {/* Floating Unhide Button when Header is Hidden */}
      {!isControlsVisible && (
        <button
          type="button"
          onClick={() => setIsControlsVisible(true)}
          className="fixed top-3 right-3 z-50 p-2 bg-black/70 hover:bg-black border border-white/20 text-neutral-400 hover:text-white rounded-full transition-all shadow-lg backdrop-blur-md"
          title="Show stage controls (Press 'H')"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      )}

      {/* District Presentation Navigation Tabs */}
      <nav className="bg-[#101012] border-b border-white/10 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-2 overflow-x-auto select-none shrink-0 z-30">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* ALL Districts Tab */}
          <button
            type="button"
            onClick={() => {
              if (soundEnabled) soundSynthesizer.playClick();
              setSelectedDistrict('ALL');
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-mono font-black uppercase tracking-wider transition-all cursor-pointer border ${
              selectedDistrict === 'ALL'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.02]'
                : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span>ALL DISTRICTS</span>
            <span className={`text-[10px] px-1.5 py-0.2 font-mono font-bold ${
              selectedDistrict === 'ALL' ? 'bg-black text-white' : 'bg-white/20 text-neutral-300'
            }`}>
              {preDrawWinners.length}
            </span>
          </button>

          {/* District Specific Tabs */}
          {DISTRICT_CONFIG.map((d) => {
            const count = (winnersByDistrict[d.id] || []).length;
            const isSelected = selectedDistrict === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  if (soundEnabled) soundSynthesizer.playClick();
                  setSelectedDistrict(d.id);
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-mono font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  isSelected
                    ? `${d.color} bg-black border-current shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-[1.02]`
                    : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-neutral-200'
                }`}
              >
                <span className="opacity-60">{d.number}</span>
                <span>{d.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-neutral-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Emcee Navigation Arrows & Page Info */}
        <div className="flex items-center gap-2 shrink-0">
          {totalPages > 1 && (
            <div className="text-xs font-mono text-neutral-400 mr-1">
              PAGE <span className="text-white font-bold">{currentPage}</span> / <span className="text-neutral-300">{totalPages}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrevSlide}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors cursor-pointer"
            title="Previous Page / District (Arrow Left / PageUp)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors cursor-pointer"
            title="Next Page / District (Arrow Right / PageDown)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Showcase Stage Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-[1920px] w-full mx-auto justify-between">
        {/* District Headline Banner */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 border-b border-white/15 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs uppercase px-2.5 py-0.5 bg-[#FF6A00] text-black font-black tracking-widest">
                OFFICIAL ANNOUNCEMENT
              </span>
              {activeDistrictConfig && (
                <span className={`font-mono text-xs uppercase px-2.5 py-0.5 border ${activeDistrictConfig.badgeBg} font-black tracking-wider`}>
                  DISTRICT {activeDistrictConfig.number}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mt-1.5 flex items-center gap-3">
              <span>{activeDistrictConfig ? activeDistrictConfig.title : 'ALL DISTRICT WINNERS'}</span>
              <span className="text-[#FF6A00] font-mono text-xl sm:text-3xl font-black">
                ({filteredWinners.length})
              </span>
            </h2>
          </div>

          {/* Quick Statistics Strip */}
          <div className="flex items-center gap-4 text-right">
            <div className="bg-white/5 border border-white/10 px-4 py-2">
              <span className="block text-[10px] uppercase font-mono text-neutral-400">Prizes Awarded</span>
              <span className="font-mono text-lg sm:text-xl font-black text-amber-400">
                {filteredWinners.length} Units
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-2">
              <span className="block text-[10px] uppercase font-mono text-neutral-400">Stage Status</span>
              <span className="font-mono text-lg sm:text-xl font-black text-emerald-400 flex items-center gap-1.5 justify-end">
                <CheckCircle2 className="w-4 h-4" />
                VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredWinners.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/10 p-8">
            <Trophy className="w-16 h-16 text-neutral-600 mb-4 animate-bounce" />
            <h3 className="text-xl sm:text-2xl font-black uppercase text-neutral-300">
              No Pre-Draw Winners Found
            </h3>
            <p className="text-neutral-400 text-sm max-w-md mt-2">
              {searchQuery 
                ? `No winners match "${searchQuery}". Clear your search query to view all.` 
                : `No pre-draw winners have been generated yet for ${activeDistrictConfig?.title || 'this selection'}. Generate draws in the Admin Pre-Draw Station.`}
            </p>
          </div>
        ) : (
          /* High-Impact LED Wall Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 flex-1 content-start">
            {paginatedWinners.map((winner, idx) => {
              const dConfig = DISTRICT_CONFIG.find((d) => d.id === winner.district);
              return (
                <div
                  key={`${winner.winnerId}-${idx}`}
                  onClick={() => setSpotlightWinner(winner)}
                  className="group relative bg-[#151518] hover:bg-[#1c1c20] border-2 border-white/15 hover:border-[#FF6A00] p-4 sm:p-5 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-lg hover:shadow-[0_0_25px_rgba(255,106,0,0.35)] hover:-translate-y-0.5"
                >
                  {/* Card Top: Number & District Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-xs font-black text-neutral-400 group-hover:text-amber-400 transition-colors">
                      #{(currentPage - 1) * (pageSize || 0) + idx + 1}
                    </span>

                    {dConfig && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 border ${dConfig.badgeBg} font-black uppercase tracking-wider`}>
                        {dConfig.number} {dConfig.id}
                      </span>
                    )}
                  </div>

                  {/* Winner Full Name (Big Screen Legibility) */}
                  <div className="my-1">
                    <h4 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-white group-hover:text-amber-200 transition-colors line-clamp-2 leading-tight">
                      {winner.name}
                    </h4>

                    {/* School / Station */}
                    <div className="flex items-center gap-1.5 text-neutral-300 font-medium text-xs sm:text-sm mt-1 line-clamp-1">
                      <School className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{winner.school}</span>
                    </div>

                    {/* Position / Role */}
                    {winner.position && (
                      <p className="text-[11px] font-mono text-neutral-400 uppercase mt-0.5 line-clamp-1">
                        {winner.position}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom: Assigned Prize */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Trophy className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      <span className="font-black uppercase text-xs sm:text-sm text-[#FF6A00] truncate">
                        {winner.prizeName}
                      </span>
                    </div>

                    <span className="font-mono text-[9px] text-neutral-400 shrink-0 uppercase">
                      {winner.drawNumber || winner.winnerId}
                    </span>
                  </div>

                  {/* Click to Spotlight Glow Effect */}
                  <div className="absolute inset-0 border border-transparent group-hover:border-[#FF6A00]/50 pointer-events-none transition-colors" />
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Pagination & Stage Help Bar */}
        <footer className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span>SHOW:</span>
            {[8, 12, 16, 0].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setPageSize(sz)}
                className={`px-2 py-0.5 border ${
                  pageSize === sz 
                    ? 'bg-[#FF6A00] text-black border-[#FF6A00] font-black' 
                    : 'bg-white/5 border-white/15 text-neutral-300 hover:bg-white/10'
                }`}
              >
                {sz === 0 ? 'ALL' : sz}
              </button>
            ))}
            <span className="ml-2 text-neutral-500 hidden sm:inline">
              (Viewing {paginatedWinners.length} of {filteredWinners.length})
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:inline text-neutral-500">
              Hotkeys: <kbd className="px-1.5 py-0.5 bg-white/10 text-neutral-300">1-5</kbd> Districts • <kbd className="px-1.5 py-0.5 bg-white/10 text-neutral-300">0</kbd> All • <kbd className="px-1.5 py-0.5 bg-white/10 text-neutral-300">←/→</kbd> Page • <kbd className="px-1.5 py-0.5 bg-white/10 text-neutral-300">Space</kbd> Slideshow • <kbd className="px-1.5 py-0.5 bg-white/10 text-neutral-300">F</kbd> Fullscreen
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1 text-neutral-300 hover:text-white px-2 py-1 bg-white/5 border border-white/15 cursor-pointer"
              title="Print current district winner list"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          </div>
        </footer>
      </main>

      {/* Grand Stage Winner Spotlight Modal (When clicked on the LED Wall) */}
      {spotlightWinner && (
        <div 
          onClick={() => setSpotlightWinner(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121215] border-3 border-[#FF6A00] p-6 sm:p-10 max-w-2xl w-full text-center relative shadow-[0_0_80px_rgba(255,106,0,0.4)] animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setSpotlightWinner(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2"
              title="Close Spotlight (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6A00] text-black font-mono font-black text-xs uppercase tracking-widest mb-4">
              <Sparkles className="w-4 h-4 fill-current" />
              <span>PRE-DRAW WINNER SPOTLIGHT</span>
            </div>

            {/* Huge Name */}
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight leading-tight my-2">
              {spotlightWinner.name}
            </h2>

            {/* School & District */}
            <p className="text-lg sm:text-2xl text-amber-300 font-semibold mt-1">
              {spotlightWinner.school}
            </p>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono uppercase mt-1">
              District: {spotlightWinner.district} • Position: {spotlightWinner.position || 'Teacher'}
            </p>

            {/* Prize Box */}
            <div className="my-6 p-4 sm:p-6 bg-gradient-to-r from-neutral-900 via-black to-neutral-900 border-2 border-amber-500/50">
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                AWARDED PRE-DRAW PRIZE
              </span>
              <span className="text-xl sm:text-3xl font-black uppercase text-[#FF6A00] block">
                {spotlightWinner.prizeName}
              </span>
              {spotlightWinner.unitValue > 0 && (
                <span className="text-xs font-mono text-neutral-400 mt-1 block">
                  Valued at ₱{spotlightWinner.unitValue.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-mono text-neutral-400">
              <span>WINNER ID: {spotlightWinner.winnerId}</span>
              <span>•</span>
              <span>DRAW: {spotlightWinner.drawNumber}</span>
              {spotlightWinner.depedId && (
                <>
                  <span>•</span>
                  <span>DEPED ID: {spotlightWinner.depedId}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
