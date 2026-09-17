'use client';

import React, { useEffect, useMemo } from 'react';
import { Winner } from '../../lib/types';
import { WinnerVerificationStub } from './WinnerVerificationStub';
import { Printer, X, CheckCheck, FileText, ArrowDownAZ } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/90 backdrop-blur-md overflow-y-auto flex flex-col items-center print:bg-white print:static print:inset-auto print:overflow-visible print:block print:p-0 print:m-0">
      {/* Top Floating Control Bar (Screen only, hidden in print) */}
      <div className="sticky top-0 z-40 w-full bg-[#1a1a1a] text-white border-b-2 border-black shadow-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-indigo-400 uppercase tracking-wider">
                BATCH {batchNumber}
              </span>
              <span className="text-[11px] bg-neutral-800 text-neutral-300 font-mono px-2 py-0.5 border border-white/10 uppercase">
                {sortedWinners.length} {sortedWinners.length === 1 ? 'Stub' : 'Stubs'} ({sortedWinners.length} {sortedWinners.length === 1 ? 'Sheet' : 'Sheets'})
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 border border-indigo-500/30 uppercase font-bold flex items-center gap-1">
                <ArrowDownAZ className="w-3 h-3" />
                <span>Sorted by District</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 border border-amber-500/30 uppercase font-bold">
                1-by-1 Pre-Cut 1/4 Letter
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-md font-sans mt-0.5">
              {prizeName} • 1 Stub per 1/4 Sheet (North → West → East → South → Private)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintAll}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print All Stubs ({sortedWinners.length})</span>
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

      {/* Sheet Previews / Printable Document */}
      <div className="batch-print-wrapper w-full max-w-3xl p-4 sm:p-6 space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0 print:block">
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

        {sortedWinners.map((winner, idx) => (
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
            <WinnerVerificationStub winner={winner} isModal={false} isBatchChild={true} />
          </div>
        ))}
      </div>
    </div>
  );
};
