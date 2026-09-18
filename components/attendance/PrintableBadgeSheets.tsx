'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  FileText,
  Loader2,
  Check,
  LayoutGrid,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { Participant, District } from '../../lib/types';
import { soundSynthesizer } from '../../lib/sound';

export type PaperSize = 'PHILIPPINE_FOLIO' | 'US_LEGAL' | 'US_LETTER';
export type BorderCutStyle = 'DASHED' | 'SOLID' | 'NONE';

interface PrintableBadgeSheetsProps {
  participants: Participant[];
}

const ITEMS_PER_SHEET = 21; // 3 columns x 7 rows

export const PrintableBadgeSheets: React.FC<PrintableBadgeSheetsProps> = ({
  participants
}) => {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  // Sheet configuration states (Philippine Long Bond 8.5" x 13" as primary requested default!)
  const [paperSize, setPaperSize] = useState<PaperSize>('PHILIPPINE_FOLIO');
  const [borderStyle, setBorderStyle] = useState<BorderCutStyle>('DASHED');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [printScope, setPrintScope] = useState<'CURRENT' | 'ALL'>('CURRENT');

  // QR code cache & batch generation
  const [qrCache, setQrCache] = useState<Record<string, string>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);

  // 1. Filter participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (selectedDistrict !== 'ALL' && p.district !== selectedDistrict) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.fullName || '').toLowerCase().includes(q);
        const matchId = (p.id || '').toLowerCase().includes(q);
        const matchDepedId = p.depedId ? String(p.depedId).toLowerCase().includes(q) : false;
        const matchSchool = (p.school || '').toLowerCase().includes(q);
        const matchPos = (p.position || '').toLowerCase().includes(q);
        return matchName || matchId || matchDepedId || matchSchool || matchPos;
      }
      return true;
    });
  }, [participants, selectedDistrict, searchQuery]);

  // Total sheets calculation
  const totalSheets = Math.max(1, Math.ceil(filteredParticipants.length / ITEMS_PER_SHEET));

  // Keep currentPage within bounds when filter changes
  useEffect(() => {
    if (currentPage > totalSheets) {
      setCurrentPage(1);
    }
  }, [totalSheets, currentPage]);

  // Attendees on current sheet
  const currentSheetParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_SHEET;
    return filteredParticipants.slice(startIndex, startIndex + ITEMS_PER_SHEET);
  }, [filteredParticipants, currentPage]);

  // Generate QR codes for a list of participants
  const generateQrsForSlice = useCallback(async (list: Participant[]) => {
    const missing = list.filter((p) => !qrCache[p.id]);
    if (missing.length === 0) return;

    const newEntries: Record<string, string> = {};
    for (const p of missing) {
      try {
        const url = await QRCode.toDataURL(p.id, {
          width: 140,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        newEntries[p.id] = url;
      } catch (err) {
        console.warn('Failed to generate QR for ' + p.id, err);
      }
    }

    if (Object.keys(newEntries).length > 0) {
      setQrCache((prev) => ({ ...prev, ...newEntries }));
    }
  }, [qrCache]);

  // Pre-generate QR codes for current page immediately
  useEffect(() => {
    if (currentSheetParticipants.length > 0) {
      generateQrsForSlice(currentSheetParticipants);
    }
  }, [currentSheetParticipants, generateQrsForSlice]);

  // Pre-generate QR codes for ALL filtered participants before printing ALL
  const handleGenerateAllAndPrint = async (scope: 'CURRENT' | 'ALL') => {
    soundSynthesizer.playClick();

    if (scope === 'CURRENT') {
      await generateQrsForSlice(currentSheetParticipants);
      setPrintScope('CURRENT');
      setTimeout(() => {
        window.print();
      }, 100);
      return;
    }

    // Print ALL sheets
    const missing = filteredParticipants.filter((p) => !qrCache[p.id]);
    if (missing.length > 0) {
      setIsGeneratingAll(true);
      setGenerationProgress({ current: 0, total: missing.length });

      const chunkSize = 25;
      const newEntries: Record<string, string> = {};

      for (let i = 0; i < missing.length; i += chunkSize) {
        const chunk = missing.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (p) => {
            try {
              const url = await QRCode.toDataURL(p.id, {
                width: 140,
                margin: 1,
                errorCorrectionLevel: 'M',
                color: { dark: '#000000', light: '#ffffff' }
              });
              newEntries[p.id] = url;
            } catch (e) {
              console.warn('QR error:', e);
            }
          })
        );
        setGenerationProgress({ current: Math.min(missing.length, i + chunkSize), total: missing.length });
      }

      setQrCache((prev) => ({ ...prev, ...newEntries }));
      setIsGeneratingAll(false);
      setGenerationProgress(null);
    }

    setPrintScope('ALL');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Build sheets array for rendering (either 1 sheet or all sheets depending on printScope)
  const sheetsToRender = useMemo(() => {
    if (printScope === 'CURRENT') {
      return [{ sheetNumber: currentPage, items: currentSheetParticipants }];
    }
    // ALL sheets
    const sheets = [];
    for (let i = 0; i < totalSheets; i++) {
      const start = i * ITEMS_PER_SHEET;
      sheets.push({
        sheetNumber: i + 1,
        items: filteredParticipants.slice(start, start + ITEMS_PER_SHEET)
      });
    }
    return sheets;
  }, [printScope, currentPage, currentSheetParticipants, totalSheets, filteredParticipants]);

  // Paper dimensions
  const paperSpecs = useMemo(() => {
    switch (paperSize) {
      case 'PHILIPPINE_FOLIO':
        return {
          name: 'Philippine Long Bond / Folio (8.5" × 13")',
          cssPageSize: '8.5in 13in portrait',
          margin: '0.20in',
          width: '8.10in',
          height: '12.60in',
          subLabel: 'Standard 8.5" x 13" Long Bond (DepEd PH Default)'
        };
      case 'US_LEGAL':
        return {
          name: 'US Legal (8.5" × 14")',
          cssPageSize: '8.5in 14in portrait',
          margin: '0.25in',
          width: '8.00in',
          height: '13.50in',
          subLabel: 'US Standard Legal (8.5" x 14")'
        };
      case 'US_LETTER':
      default:
        return {
          name: 'US Letter (8.5" × 11")',
          cssPageSize: 'letter portrait',
          margin: '0.25in',
          width: '8.00in',
          height: '10.50in',
          subLabel: 'Short Letter (8.5" x 11")'
        };
    }
  }, [paperSize]);

  return (
    <div className="printable-badges-workspace w-full flex flex-col gap-5">
      {/* Dynamic Print Stylesheet for exact 3x7 Legal / Folio Printing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${paperSpecs.cssPageSize};
                margin: ${paperSpecs.margin};
              }

              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                width: 100% !important;
              }

              /* Hide all surrounding interface elements */
              body * {
                visibility: hidden;
              }

              /* Isolate only the badges print container */
              .printable-badge-sheet-root,
              .printable-badge-sheet-root * {
                visibility: visible;
              }

              .printable-badge-sheet-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
              }

              .no-print,
              .print\\:hidden {
                display: none !important;
                height: 0 !important;
                overflow: hidden !important;
              }

              /* 3x7 Grid layout on physical paper */
              .legal-badge-sheet {
                width: ${paperSpecs.width} !important;
                height: ${paperSpecs.height} !important;
                max-width: ${paperSpecs.width} !important;
                max-height: ${paperSpecs.height} !important;
                margin: 0 auto !important;
                padding: 0 !important;
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                grid-template-rows: repeat(7, 1fr) !important;
                gap: 0.035in !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
              }

              .legal-badge-sheet:last-of-type {
                page-break-after: auto !important;
                break-after: auto !important;
              }

              .badge-card {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .badge-empty-slot {
                visibility: hidden !important;
                border: none !important;
              }
            }
          `
        }}
      />

      {/* Control Header Card (Hidden in Print) */}
      <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-4 sm:p-5 rounded-sm shadow-sm space-y-4 no-print">
        {/* Title and Print Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1a1a1a]/15 dark:border-[#27272a] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-mono font-black text-[#1a1a1a] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#ff6a00]" />
                <span>Printable QR Badges &amp; Slips</span>
              </h2>
              <span className="px-2 py-0.5 bg-[#ff6a00]/15 text-[#ff6a00] border border-[#ff6a00]/30 font-mono text-[10px] font-bold uppercase rounded-2xs">
                3×7 Grid • 21 per sheet
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-[#22c55e] border border-emerald-500/30 font-mono text-[10px] font-bold uppercase rounded-2xs">
                {paperSpecs.name}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-[#a1a1aa] mt-1">
              Print attendee admission cards with high-contrast scannable QR codes. Configured for Philippine Long Bond (8.5&quot; × 13&quot;) and Legal paper.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isGeneratingAll || filteredParticipants.length === 0}
              onClick={() => handleGenerateAllAndPrint('CURRENT')}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white dark:bg-neutral-100 dark:text-black dark:hover:bg-white rounded-sm font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Print the 21 badges currently shown on this sheet"
            >
              <Printer className="w-4 h-4 text-[#ff6a00]" />
              <span>Print Sheet {currentPage} (21 Badges)</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingAll || filteredParticipants.length === 0}
              onClick={() => handleGenerateAllAndPrint('ALL')}
              className="px-4 py-2 bg-[#ff6a00] hover:bg-[#ea580c] text-black rounded-sm font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
              title={`Print all ${totalSheets} sheets (${filteredParticipants.length} attendees)`}
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Generating ({generationProgress?.current}/{generationProgress?.total})...
                  </span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Print All {totalSheets} Sheets ({filteredParticipants.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters & Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">
              Search Attendees
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Name, School, ID..."
                className="w-full bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs pl-8 pr-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00]"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* District Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">
              Filter by District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00]"
            >
              <option value="ALL">All Districts ({participants.length})</option>
              <option value="NORTH">North District</option>
              <option value="EAST">East District</option>
              <option value="WEST">West District</option>
              <option value="SOUTH">South District</option>
              <option value="PRIVATE">Private (ECCD + Private + LSB)</option>
            </select>
          </div>

          {/* Paper Size Selector (Requested: Philippine Long Bond 8.5" x 13" as Default!) */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1 flex items-center justify-between">
              <span>Paper Size</span>
              <span className="text-emerald-700 dark:text-[#22c55e] font-black text-[9px]">
                {paperSize === 'PHILIPPINE_FOLIO' ? '★ PH Long Bond' : ''}
              </span>
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="w-full bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00] font-mono"
            >
              <option value="PHILIPPINE_FOLIO">Philippine Long Bond / Folio (8.5&quot; × 13&quot;) [Default]</option>
              <option value="US_LEGAL">US Legal (8.5&quot; × 14&quot;)</option>
              <option value="US_LETTER">US Letter (8.5&quot; × 11&quot;)</option>
            </select>
          </div>

          {/* Cut Line Style */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mb-1">
              Cut-Guide Border Style
            </label>
            <select
              value={borderStyle}
              onChange={(e) => setBorderStyle(e.target.value as BorderCutStyle)}
              className="w-full bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00] font-mono"
            >
              <option value="DASHED">Dashed Lines (Scissors Guide)</option>
              <option value="SOLID">Solid Thin Border</option>
              <option value="NONE">Clean / Borderless</option>
            </select>
          </div>
        </div>

        {/* Sheet Navigator & Quick Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1a1a1a]/15 dark:border-[#27272a] text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-[#a1a1aa]">
            <span className="font-bold text-neutral-900 dark:text-white">
              {filteredParticipants.length} Attendees
            </span>
            <span>•</span>
            <span>
              {totalSheets} {totalSheets === 1 ? 'Sheet' : 'Sheets'} ({ITEMS_PER_SHEET} per page)
            </span>
            <span>•</span>
            <span className="text-[#ff6a00] font-semibold">{paperSpecs.subLabel}</span>
          </div>

          {/* Sheet Pagination */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => {
                soundSynthesizer.playClick();
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              className="p-1.5 bg-[#f8f7f4] hover:bg-neutral-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white rounded-sm disabled:opacity-30 border border-[#1a1a1a]/20 dark:border-[#3f3f46] transition-colors cursor-pointer"
              title="Previous Sheet"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-[#f8f7f4] dark:bg-[#27272a] text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] rounded-sm font-bold text-xs">
              Sheet {currentPage} of {totalSheets}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalSheets}
              onClick={() => {
                soundSynthesizer.playClick();
                setCurrentPage((p) => Math.min(totalSheets, p + 1));
              }}
              className="p-1.5 bg-[#f8f7f4] hover:bg-neutral-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white rounded-sm disabled:opacity-30 border border-[#1a1a1a]/20 dark:border-[#3f3f46] transition-colors cursor-pointer"
              title="Next Sheet"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Helpful Printing Tip Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-sm flex items-center gap-2 text-[11px] text-amber-900 dark:text-amber-300 font-sans">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>DepEd Printing Guide:</strong> In your printer dialog, choose Paper Size: <strong>{paperSize === 'PHILIPPINE_FOLIO' ? '8.5 x 13 in / Folio / Long' : paperSize === 'US_LEGAL' ? 'Legal (8.5 x 14 in)' : 'Letter'}</strong>. Set Margins to <strong>None</strong> or <strong>Default</strong>, and ensure <strong>Background graphics</strong> is checked.
          </span>
        </div>
      </div>

      {/* Sheet Previews / Printable Root Container */}
      <div className="printable-badge-sheet-root w-full flex flex-col items-center gap-8 py-2">
        {sheetsToRender.map((sheet) => {
          // Calculate empty slots to keep 3x7 grid perfectly aligned
          const emptySlotCount = Math.max(0, ITEMS_PER_SHEET - sheet.items.length);
          const emptySlots = Array.from({ length: emptySlotCount });

          return (
            <div
              key={`sheet-${sheet.sheetNumber}`}
              className="w-full flex flex-col items-center"
            >
              {/* Screen-only Sheet Indicator */}
              <div className="w-full max-w-[8.10in] pb-1 mb-1.5 text-neutral-500 font-mono text-[11px] uppercase flex justify-between items-center no-print">
                <span className="font-bold text-neutral-800 dark:text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#ff6a00]" />
                  <span>
                    Sheet {sheet.sheetNumber} of {totalSheets} • {sheet.items.length} Badges
                  </span>
                </span>
                <span className="text-[10px] text-neutral-400">
                  {paperSpecs.name} (3 Cols × 7 Rows)
                </span>
              </div>

              {/* Physical Sheet Container (Exact 3x7 Grid) */}
              <div
                className="legal-badge-sheet bg-white shadow-2xl border border-neutral-300 print:shadow-none print:border-none p-1 box-border"
                style={{
                  width: paperSpecs.width,
                  minHeight: paperSpecs.height,
                  maxHeight: paperSpecs.height,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(7, 1fr)',
                  gap: '0.035in'
                }}
              >
                {sheet.items.map((participant) => {
                  const qr = qrCache[participant.id];
                  return (
                    <div
                      key={participant.id}
                      className={`badge-card relative box-border bg-white text-black p-1.5 sm:p-2 flex items-center gap-2 overflow-hidden ${
                        borderStyle === 'DASHED'
                          ? 'border-2 border-dashed border-black rounded-sm'
                          : borderStyle === 'SOLID'
                          ? 'border-2 border-black rounded-sm'
                          : 'border border-neutral-300 rounded-sm'
                      }`}
                    >
                      {/* Left: QR Code + Profiling ID */}
                      <div className="flex flex-col items-center justify-center shrink-0 w-[74px]">
                        <div className="w-[68px] h-[68px] bg-white border border-gray-200 flex items-center justify-center p-0.5">
                          {qr ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={qr}
                              alt={participant.id}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-neutral-50 flex items-center justify-center text-[7px] font-mono text-neutral-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            </div>
                          )}
                        </div>
                        <span className="font-mono font-bold text-[8px] text-gray-700 tracking-tight mt-0.5 truncate max-w-[74px] text-center select-all">
                          {participant.id}
                        </span>
                      </div>

                      {/* Right: Attendee Details (Exact structure as shown in Image 2) */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full overflow-hidden">
                        <div>
                          <div className="text-[7.5px] uppercase font-bold tracking-wider text-[#ff6a00] leading-tight">
                            DEPED MALUNGON • TEACHERS&apos; DAY 2026
                          </div>
                          <div className="text-[10.5px] font-bold text-black leading-tight mt-0.5 line-clamp-1 uppercase">
                            {participant.fullName}
                          </div>
                          <div className="text-[8px] text-gray-600 truncate leading-tight mt-0.5">
                            {participant.position || 'Teacher'}
                          </div>
                        </div>

                        <div className="pt-1 mt-1 border-t border-gray-200 grid grid-cols-2 gap-1 text-[8px] font-mono">
                          <div>
                            <span className="text-gray-400 block text-[6.5px] uppercase tracking-wider">DISTRICT</span>
                            <span className="font-bold text-gray-900 truncate block text-[8px]">{participant.district}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[6.5px] uppercase tracking-wider">DEPED ID</span>
                            <span className="font-bold text-gray-900 truncate block text-[8px]">{participant.depedId || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 truncate">
                            <span className="text-gray-400 block text-[6.5px] uppercase tracking-wider">SCHOOL</span>
                            <span className="text-gray-800 text-[7.5px] truncate block font-sans">{participant.school}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty Slot Fillers (keeps 3x7 grid aligned) */}
                {emptySlots.map((_, idx) => (
                  <div
                    key={`empty-slot-${idx}`}
                    className="badge-empty-slot border border-dashed border-neutral-200/50 p-1 flex items-center justify-center text-[7.5px] text-neutral-300 font-mono select-none"
                  >
                    <span>[ EMPTY CUT SLOT ]</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
