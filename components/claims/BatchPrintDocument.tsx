'use client';

import React, { useEffect } from 'react';
import { Winner } from '../../lib/types';
import { WinnerVerificationStub } from './WinnerVerificationStub';
import { Printer, X, CheckCheck, FileText, Scissors } from 'lucide-react';

interface BatchPrintDocumentProps {
  batchNumber: string;
  prizeName: string;
  winners: Winner[];
  onClose: () => void;
  onMarkBatchPrinted?: (winnerIds: string[]) => void;
}

export const BatchPrintDocument: React.FC<BatchPrintDocumentProps> = ({
  batchNumber,
  prizeName,
  winners,
  onClose,
  onMarkBatchPrinted
}) => {
  // Group winners into pages of 4 (2x2 grid on Letter paper)
  const pageSize = 4;
  const pages: Winner[][] = [];
  for (let i = 0; i < winners.length; i += pageSize) {
    pages.push(winners.slice(i, i + pageSize));
  }

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrintAll = () => {
    if (onMarkBatchPrinted && winners.length > 0) {
      onMarkBatchPrinted(winners.map((w) => w.winnerId));
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/90 backdrop-blur-md overflow-y-auto flex flex-col items-center print:bg-white print:static print:inset-auto print:overflow-visible">
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
                {winners.length} {winners.length === 1 ? 'Stub' : 'Stubs'} ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-md font-sans mt-0.5">
              {prizeName} • 1/4 Letter Sheet format (4 stubs per Letter page)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 text-neutral-400 font-mono text-[11px] mr-2">
            <Scissors className="w-3.5 h-3.5 text-neutral-500" />
            <span>Dashed lines guide paper cut</span>
          </div>

          <button
            type="button"
            onClick={handlePrintAll}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print All Stubs ({winners.length})</span>
          </button>

          {onMarkBatchPrinted && (
            <button
              type="button"
              onClick={() => {
                onMarkBatchPrinted(winners.map((w) => w.winnerId));
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
      <div className="w-full max-w-4xl p-4 sm:p-8 space-y-8 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 0.25in;
              }
              body {
                background: white !important;
                color: black !important;
              }
              .print-letter-page {
                page-break-after: always !important;
                break-after: page !important;
                width: 8in !important;
                min-height: 10.5in !important;
                max-height: 10.5in !important;
                margin: 0 auto !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
              .print-letter-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
          `
        }} />

        {pages.map((pageWinners, pageIdx) => (
          <div
            key={pageIdx}
            className="print-letter-page bg-white shadow-2xl border border-neutral-300 print:shadow-none print:border-0 rounded-none overflow-hidden mx-auto p-4 box-border"
            style={{ width: '8.5in', minHeight: '11in' }}
          >
            {/* Screen Page Header Indicator */}
            <div className="pb-2 mb-2 border-b border-neutral-200 text-neutral-400 font-mono text-[10px] uppercase flex justify-between items-center print:hidden">
              <span>Sheet {pageIdx + 1} of {pages.length} (4 Stubs per Letter Page)</span>
              <span>Batch {batchNumber}</span>
            </div>

            {/* 2x2 Grid of 1/4 Letter Stubs */}
            <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full items-stretch justify-items-stretch">
              {pageWinners.map((winner) => (
                <div key={winner.winnerId} className="flex justify-center items-center w-full h-full">
                  <WinnerVerificationStub winner={winner} isModal={false} />
                </div>
              ))}

              {/* Empty placeholder slots if page has less than 4 winners */}
              {Array.from({ length: 4 - pageWinners.length }).map((_, emptyIdx) => (
                <div
                  key={`empty-${emptyIdx}`}
                  className="w-full max-w-[4.25in] min-h-[5.3in] p-4 border-2 border-dashed border-neutral-300 print:border-neutral-200 flex flex-col justify-center items-center text-neutral-300 print:text-transparent font-mono text-xs uppercase"
                >
                  <span>[ Empty Slot • Cut Line ]</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
