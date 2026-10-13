'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Winner } from '../../lib/types';
import { WinnerVerificationStub } from './WinnerVerificationStub';
import { Printer, X, CheckCheck, FileText, ArrowDownAZ, Scissors, Sparkles, Layers } from 'lucide-react';

export type BatchPrintMode = '8_UP_LETTER' | '2_UP_QUARTER' | '1_UP_PORTRAIT';

interface BatchPrintDocumentProps {
  batchNumber: string;
  prizeName: string;
  winners: Winner[];
  onClose: () => void;
  onMarkBatchPrinted?: (winnerIds: string[]) => void;
}

const DISTRICT_SORT_PRIORITY: Record<string, number> = {
  NORTH: 1,
  WEST: 2,
  EAST: 3,
  SOUTH: 4,
  PRIVATE: 5
};

export const BatchPrintDocument: React.FC<BatchPrintDocumentProps> = ({
  batchNumber,
  prizeName,
  winners,
  onClose,
  onMarkBatchPrinted
}) => {
  // Format choice: Default to 8_UP_LETTER (8 stubs of 11cm x 7cm per Letter page for ultra-fast, jam-free printing)
  const [printMode, setPrintMode] = useState<BatchPrintMode>('8_UP_LETTER');

  // Sort winners by District (e.g. NORTH, WEST, EAST, SOUTH, PRIVATE) and then by Winner Name
  const sortedWinners = useMemo(() => {
    return [...winners].sort((a, b) => {
      const distA = String(a.district || '').trim().toUpperCase();
      const distB = String(b.district || '').trim().toUpperCase();
      const priorityA = DISTRICT_SORT_PRIORITY[distA] ?? 99;
      const priorityB = DISTRICT_SORT_PRIORITY[distB] ?? 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [winners]);

  // Group winners into chunks of 8 for 8-Up on Letter page (11cm x 7cm stubs)
  const chunks8Up = useMemo(() => {
    const chunks: Winner[][] = [];
    for (let i = 0; i < sortedWinners.length; i += 8) {
      chunks.push(sortedWinners.slice(i, i + 8));
    }
    return chunks;
  }, [sortedWinners]);

  // Group winners into pairs of 2 for 2-Up on 1/4 Letter sheet (11cm x 7cm stubs)
  const chunks2Up = useMemo(() => {
    const pairs: Winner[][] = [];
    for (let i = 0; i < sortedWinners.length; i += 2) {
      pairs.push(sortedWinners.slice(i, i + 2));
    }
    return pairs;
  }, [sortedWinners]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrintAll = () => {
    if (onMarkBatchPrinted && sortedWinners.length > 0) {
      onMarkBatchPrinted(sortedWinners.map((w) => w.winnerId));
    }
    window.print();
  };

  const totalPages = printMode === '8_UP_LETTER'
    ? Math.ceil(sortedWinners.length / 8)
    : printMode === '2_UP_QUARTER'
    ? Math.ceil(sortedWinners.length / 2)
    : sortedWinners.length;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/90 backdrop-blur-md overflow-y-auto flex flex-col items-center print:bg-white print:static print:inset-auto print:overflow-visible print:block print:p-0 print:m-0">
      {/* Top Floating Control Bar (Screen only, hidden in print) */}
      <div className="sticky top-0 z-40 w-full bg-[#1a1a1a] text-white border-b-2 border-black shadow-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-sm text-indigo-400 uppercase tracking-wider">
                BATCH {batchNumber}
              </span>
              <span className="text-[11px] bg-neutral-800 text-neutral-300 font-mono px-2 py-0.5 border border-white/10 uppercase">
                {sortedWinners.length} {sortedWinners.length === 1 ? 'Stub' : 'Stubs'} ({totalPages} {totalPages === 1 ? 'Page' : 'Pages'})
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 border border-indigo-500/30 uppercase font-bold flex items-center gap-1">
                <ArrowDownAZ className="w-3 h-3" />
                <span>Sorted by District</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 border border-emerald-500/30 uppercase font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>
                  {printMode === '8_UP_LETTER'
                    ? '8-Up Letter (11cm × 7cm — Ultra Fast)'
                    : printMode === '2_UP_QUARTER'
                    ? '2-Up 1/4 Sheet (11cm × 7cm)'
                    : '1/4 Letter Portrait'}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-md font-sans mt-0.5">
              {prizeName} • {printMode === '8_UP_LETTER'
                ? '8 Stubs per standard Letter Sheet (11cm × 7cm each, half of 1/4 Letter)'
                : printMode === '2_UP_QUARTER'
                ? '2 Stubs per 1/4 Letter Sheet (11cm × 7cm each with center cut line)'
                : '1 Stub per 1/4 Letter Sheet'}
            </p>
          </div>
        </div>

        {/* Format Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format Switcher */}
          <div className="flex items-center bg-black/60 p-0.5 border border-white/20 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPrintMode('8_UP_LETTER')}
              className={`px-3 py-1.5 uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                printMode === '8_UP_LETTER'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Prints 8 stubs (11cm x 7cm each) on each standard Letter page (Fastest throughput, saves paper)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>8-Up Letter (11×7cm)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('2_UP_QUARTER')}
              className={`px-3 py-1.5 uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                printMode === '2_UP_QUARTER'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Prints 2 stubs (11cm x 7cm each) per 1/4 Letter sheet"
            >
              <Scissors className="w-3.5 h-3.5 text-neutral-300" />
              <span>2-Up 1/4 Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('1_UP_PORTRAIT')}
              className={`px-3 py-1.5 uppercase font-bold transition-all cursor-pointer ${
                printMode === '1_UP_PORTRAIT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Prints 1 stub per 1/4 Letter page"
            >
              <span>1/4 Portrait</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintAll}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print All ({totalPages} {totalPages === 1 ? 'Page' : 'Pages'})</span>
          </button>

          {onMarkBatchPrinted && (
            <button
              type="button"
              onClick={() => {
                onMarkBatchPrinted(sortedWinners.map((w) => w.winnerId));
                onClose();
              }}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              title="Mark this entire batch as Printed without opening printer dialog"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark as Printed</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Sheet Previews / Printable Document Container */}
      <div className="batch-print-wrapper w-full max-w-5xl p-4 sm:p-6 space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0 print:block">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 0.15in;
              }
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
              }
              .batch-print-wrapper {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                position: static !important;
              }
              .batch-sheet-8up {
                width: 8.1in !important;
                height: 10.65in !important;
                max-width: 8.1in !important;
                max-height: 10.65in !important;
                margin: 0 auto !important;
                padding: 0.05in !important;
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                grid-template-rows: repeat(4, 1fr) !important;
                gap: 0.06in !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                background: white !important;
              }
              .batch-sheet-8up:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .batch-sheet-2up {
                width: 4.15in !important;
                height: 5.4in !important;
                max-width: 4.15in !important;
                max-height: 5.4in !important;
                margin: 0 auto !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                background: white !important;
              }
              .batch-sheet-2up:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .stub-sheet-page {
                width: 4.1in !important;
                height: 5.35in !important;
                max-width: 4.1in !important;
                max-height: 5.35in !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                clear: both !important;
                display: block !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                background: white !important;
              }
              .stub-sheet-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
          `
        }} />

        {/* 1. 8-UP LETTER MODE (8 STUBS OF 11cm x 7cm PER LETTER PAGE) */}
        {printMode === '8_UP_LETTER' && chunks8Up.map((chunk, pageIdx) => (
          <div
            key={`page-8up-${pageIdx}`}
            className="batch-sheet-8up bg-white shadow-xl border border-neutral-300 print:shadow-none print:border-0 rounded-none overflow-hidden mx-auto p-3 box-border grid grid-cols-2 gap-2 print:m-0 print:p-0 print:block"
          >
            {/* Screen Page Header Indicator */}
            <div className="col-span-2 pb-1 mb-1 border-b border-neutral-200 text-neutral-500 font-mono text-[11px] uppercase flex justify-between items-center print:hidden">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Letter Sheet {pageIdx + 1} of {chunks8Up.length} • 8 Stubs per Sheet (11cm × 7cm)</span>
              </span>
              <span className="text-neutral-500">
                Tickets: {chunk[0]?.winnerId} ... {chunk[chunk.length - 1]?.winnerId}
              </span>
            </div>

            {/* Render 8 Stubs in a 2x4 Grid */}
            {chunk.map((winner) => (
              <div key={winner.winnerId} className="w-full flex justify-center items-center p-0.5">
                <WinnerVerificationStub
                  winner={winner}
                  isModal={false}
                  isBatchChild={true}
                  layoutFormat="HALF_LANDSCAPE"
                />
              </div>
            ))}

            {/* Fill blank cells if odd number on final page */}
            {chunk.length < 8 && Array.from({ length: 8 - chunk.length }).map((_, emptyIdx) => (
              <div
                key={`empty-${emptyIdx}`}
                className="w-full min-h-[6.8cm] border border-dashed border-neutral-200 flex items-center justify-center text-neutral-400 font-mono text-[10px] uppercase print:hidden"
              >
                <span>Blank Space</span>
              </div>
            ))}
          </div>
        ))}

        {/* 2. 2-UP 1/4 SHEET MODE (2 STUBS PER 1/4 LETTER SHEET) */}
        {printMode === '2_UP_QUARTER' && chunks2Up.map((pair, pageIdx) => (
          <div
            key={`page-2up-${pageIdx}`}
            className="batch-sheet-2up bg-white shadow-xl border border-neutral-300 print:shadow-none print:border-0 rounded-none overflow-hidden mx-auto p-3 box-border flex flex-col justify-between print:m-0 print:p-0 print:block"
          >
            {/* Screen Page Header Indicator */}
            <div className="w-full pb-1 mb-2 border-b border-neutral-200 text-neutral-500 font-mono text-[11px] uppercase flex justify-between items-center print:hidden">
              <span className="font-bold text-indigo-900">
                1/4 Sheet {pageIdx + 1} of {chunks2Up.length} • (2 Vouchers per Sheet)
              </span>
              <span className="text-neutral-500">
                Tickets: {pair[0].winnerId} {pair[1] ? `& ${pair[1].winnerId}` : '(Single)'}
              </span>
            </div>

            {/* Top Half Stub */}
            <div className="w-full flex justify-center">
              <WinnerVerificationStub
                winner={pair[0]}
                isModal={false}
                isBatchChild={true}
                layoutFormat="HALF_LANDSCAPE"
              />
            </div>

            {/* Center Cut Guide Divider */}
            <div className="w-full max-w-[11cm] mx-auto my-1.5 py-0.5 flex items-center justify-between border-b-2 border-dashed border-neutral-400 print:border-black/50 text-[8px] font-mono font-bold uppercase tracking-widest text-neutral-600 print:text-black">
              <span className="flex items-center gap-1">
                <Scissors className="w-3 h-3 -scale-x-100" />
                <span>CUT HERE</span>
              </span>
              <span>11cm × 7cm STUB DIVIDER</span>
              <span className="flex items-center gap-1">
                <span>CUT HERE</span>
                <Scissors className="w-3 h-3" />
              </span>
            </div>

            {/* Bottom Half Stub */}
            {pair[1] ? (
              <div className="w-full flex justify-center">
                <WinnerVerificationStub
                  winner={pair[1]}
                  isModal={false}
                  isBatchChild={true}
                  layoutFormat="HALF_LANDSCAPE"
                />
              </div>
            ) : (
              <div className="w-full max-w-[11cm] min-h-[6.8cm] border border-dashed border-neutral-200 p-2 flex items-center justify-center text-neutral-400 font-mono text-[10px] uppercase print:hidden">
                <span>Blank Lower Half</span>
              </div>
            )}
          </div>
        ))}

        {/* 3. 1/4 LETTER PORTRAIT MODE (1 STUB PER SHEET) */}
        {printMode === '1_UP_PORTRAIT' && sortedWinners.map((winner, idx) => (
          <div
            key={winner.winnerId}
            className="stub-sheet-page bg-white shadow-xl border border-neutral-300 print:shadow-none print:border-0 rounded-none overflow-hidden mx-auto p-2 sm:p-4 box-border flex flex-col items-center justify-center print:m-0 print:p-0 print:block"
          >
            {/* Screen Header Indicator */}
            <div className="w-full max-w-[3.95in] pb-1.5 mb-2 border-b border-neutral-200 text-neutral-500 font-mono text-[10px] uppercase flex justify-between items-center print:hidden">
              <span className="font-bold text-indigo-900">
                Sheet {idx + 1} of {sortedWinners.length} • District: <strong className="text-black">{winner.district}</strong>
              </span>
              <span>Ticket: {winner.winnerId}</span>
            </div>

            {/* Verification Stub */}
            <WinnerVerificationStub
              winner={winner}
              isModal={false}
              isBatchChild={true}
              layoutFormat="QUARTER_PORTRAIT"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
