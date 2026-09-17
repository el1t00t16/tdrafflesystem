'use client';

import React, { useState, useMemo } from 'react';
import { Winner, Prize, RaffleLog, PrintBatchGroup } from '../../lib/types';
import { WinnerVerificationStub } from '../claims/WinnerVerificationStub';
import { BatchPrintDocument } from '../claims/BatchPrintDocument';
import {
  Printer,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Gift,
  Layers,
  Sparkles,
  CheckCheck,
  Eye
} from 'lucide-react';

interface PrintQueueStationProps {
  winners: Winner[];
  prizes: Prize[];
  logs: RaffleLog[];
  onMarkAsPrinted?: (winnerId: string) => void;
  onMarkBatchAsPrinted?: (winnerIds: string[]) => void;
  onRequeueWinner?: (winnerId: string) => void;
}

export const PrintQueueStation: React.FC<PrintQueueStationProps> = ({
  winners,
  prizes,
  logs,
  onMarkAsPrinted = () => {},
  onMarkBatchAsPrinted = () => {},
  onRequeueWinner = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  
  // Modals for printing
  const [activeBatchPrint, setActiveBatchPrint] = useState<{
    batchNumber: string;
    prizeName: string;
    winners: Winner[];
  } | null>(null);
  const [activeSinglePrint, setActiveSinglePrint] = useState<Winner | null>(null);

  // Group all winners by Raffle Batch (drawNumber)
  const batchGroups = useMemo<PrintBatchGroup[]>(() => {
    const map = new Map<string, Winner[]>();
    winners.forEach((w) => {
      const batchKey = w.drawNumber || 'UNASSIGNED';
      if (!map.has(batchKey)) {
        map.set(batchKey, []);
      }
      map.get(batchKey)!.push(w);
    });

    const groups: PrintBatchGroup[] = [];
    map.forEach((batchWinners, drawNum) => {
      const first = batchWinners[0];
      const pendingCount = batchWinners.filter((w) => !w.isPrinted).length;
      const printedCount = batchWinners.filter((w) => Boolean(w.isPrinted)).length;

      groups.push({
        drawNumber: drawNum,
        prizeId: first?.prizeId || '',
        prizeName: first?.prizeName || 'Special Raffle Prize',
        unitValue: first?.unitValue || 0,
        date: first?.date || '',
        time: first?.time || '',
        drawType: first?.drawType,
        winners: batchWinners,
        pendingCount,
        printedCount
      });
    });

    // Sort batches reverse chronologically (newest on top)
    return groups.sort((a, b) => {
      const numA = parseInt(a.drawNumber.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.drawNumber.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    });
  }, [winners]);

  // Overall Queue Metrics
  const totalPending = useMemo(() => winners.filter((w) => !w.isPrinted).length, [winners]);
  const totalPrinted = useMemo(() => winners.filter((w) => Boolean(w.isPrinted)).length, [winners]);
  const pendingBatchesCount = useMemo(
    () => batchGroups.filter((g) => g.pendingCount > 0).length,
    [batchGroups]
  );

  // Toggle batch card expansion (default is collapsed)
  const toggleBatchExpand = (batchNumber: string) => {
    setExpandedBatches((prev) => ({
      ...prev,
      [batchNumber]: !isBatchExpanded(batchNumber)
    }));
  };

  const isBatchExpanded = (batchNumber: string) => {
    // If user is actively searching, auto-expand to reveal matching winners
    if (searchFilter.trim()) {
      return expandedBatches[batchNumber] !== false;
    }
    return Boolean(expandedBatches[batchNumber]);
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    filteredQueueBatches.forEach((b) => {
      next[b.drawNumber] = true;
    });
    setExpandedBatches(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    filteredQueueBatches.forEach((b) => {
      next[b.drawNumber] = false;
    });
    setExpandedBatches(next);
  };

  // Filtered batches in active queue
  const filteredQueueBatches = useMemo(() => {
    return batchGroups
      .map((g) => {
        if (!searchFilter.trim()) return g;
        const q = searchFilter.toLowerCase();
        const matchesBatch =
          (g.drawNumber || '').toLowerCase().includes(q) ||
          (g.prizeName || '').toLowerCase().includes(q);
        const matchingWinners = g.winners.filter(
          (w) =>
            (w.name || '').toLowerCase().includes(q) ||
            (w.winnerId || '').toLowerCase().includes(q) ||
            (w.participantId ? String(w.participantId).toLowerCase().includes(q) : false) ||
            (w.school || '').toLowerCase().includes(q)
        );
        if (matchesBatch) return g;
        if (matchingWinners.length > 0) {
          return { ...g, winners: matchingWinners };
        }
        return null;
      })
      .filter((g): g is PrintBatchGroup => g !== null && g.pendingCount > 0);
  }, [batchGroups, searchFilter]);

  // Filtered winners for Print History
  const historyWinners = useMemo(() => {
    const printed = winners.filter((w) => Boolean(w.isPrinted));
    if (!searchFilter.trim()) return printed;
    const q = searchFilter.toLowerCase();
    return printed.filter(
      (w) =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.winnerId || '').toLowerCase().includes(q) ||
        (w.participantId ? String(w.participantId).toLowerCase().includes(q) : false) ||
        (w.school || '').toLowerCase().includes(q) ||
        (w.drawNumber ? String(w.drawNumber).toLowerCase().includes(q) : false) ||
        (w.prizeName || '').toLowerCase().includes(q)
    );
  }, [winners, searchFilter]);

  // Export Print History CSV
  const exportHistoryCSV = () => {
    const headers = [
      'Batch #',
      'Ticket ID',
      'Profiling ID',
      'Winner Name',
      'District',
      'School',
      'Position',
      'Prize Won',
      'Unit Value',
      'Drawn At',
      'Print Status',
      'Printed At'
    ];

    const rows = historyWinners.map((w) => [
      w.drawNumber,
      w.winnerId,
      w.participantId || 'N/A',
      `"${w.name}"`,
      w.district,
      `"${w.school}"`,
      `"${w.position}"`,
      `"${w.prizeName}"`,
      w.unitValue,
      `${w.date} ${w.time}`,
      w.isPrinted ? 'PRINTED' : 'PENDING',
      w.printedAt || 'N/A'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `raffle_print_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      {/* On-Screen Workstation View (Hidden during stub printing so it occupies zero space) */}
      <div className={`space-y-6 ${activeBatchPrint || activeSinglePrint ? 'print:hidden' : ''}`}>
        {/* Top Station Header & Sub-Nav */}
        <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl relative border-t-4 border-t-amber-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-black shadow-sm font-bold">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg sm:text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                  WINNER PRINT QUEUE &amp; STUB DISPATCH
                </h2>
                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 border border-amber-300 dark:border-amber-800 uppercase">
                  1/4 Letter Format
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 font-sans">
                Automated batch queue for official verification stubs with instant QR code verification.
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-[#1a1a1a] dark:border-white/20 flex items-center justify-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-amber-500 text-black shadow-sm font-black'
                  : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Active Queue</span>
              {totalPending > 0 && (
                <span className="bg-black text-white text-[10px] px-1.5 py-0.2 rounded-xs font-mono font-bold">
                  {totalPending}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-[#1a1a1a] dark:border-white/20 flex items-center justify-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-[#1a1a1a] dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Print History</span>
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-xs font-mono font-bold">
                {totalPrinted}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Operational Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#1a1a1a]/15 dark:border-white/10">
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Pending Print
            </span>
            <span className={`text-2xl font-black font-mono ${totalPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
              {totalPending}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Batches Awaiting Print
            </span>
            <span className="text-2xl font-black text-[#1a1a1a] dark:text-white font-mono">
              {pendingBatchesCount}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Total Stubs Printed
            </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {totalPrinted}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Print Progress
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {winners.length > 0 ? Math.round((totalPrinted / winners.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-3 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'queue'
                ? 'Search pending winner name, ticket ID, profiling ID, school, batch #...'
                : 'Search printed history by winner name, profiling ID, ticket ID, school, batch #...'
            }
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/10 pl-9 pr-3 py-2 text-xs font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-amber-500 uppercase"
          />
        </div>
      </div>

      {/* TAB 1: ACTIVE PRINT QUEUE (Grouped by Raffle Batch) */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {filteredQueueBatches.length > 0 && (
            <div className="flex items-center justify-between text-xs font-mono px-1 py-0.5">
              <span className="text-neutral-500 font-bold uppercase text-[11px]">
                {filteredQueueBatches.length} {filteredQueueBatches.length === 1 ? 'Batch' : 'Batches'} Awaiting Print
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#1a1a1a]/20 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold uppercase transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#1a1a1a]/20 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold uppercase transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>
          )}

          {filteredQueueBatches.length === 0 ? (
            <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                ALL BATCH STUBS PRINTED &amp; DISPATCHED!
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                {winners.length === 0
                  ? 'No winners have been drawn yet. When a winner is confirmed, they will appear here automatically.'
                  : 'There are no pending stubs in the print queue. All confirmed winners have been marked as printed.'}
              </p>
              {totalPrinted > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 mt-2 transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>View Print History ({totalPrinted})</span>
                </button>
              )}
            </div>
          ) : (
            filteredQueueBatches.map((batch) => {
              const expanded = isBatchExpanded(batch.drawNumber);
              const pendingWinners = batch.winners.filter((w) => !w.isPrinted);

              return (
                <div
                  key={batch.drawNumber}
                  className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 shadow-sm overflow-hidden"
                >
                  {/* Batch Card Header Strip */}
                  <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-4 border-b border-[#1a1a1a]/15 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => toggleBatchExpand(batch.drawNumber)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBatchExpand(batch.drawNumber);
                        }}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300"
                        title={expanded ? 'Collapse Batch' : 'Expand Batch to view winners'}
                      >
                        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#1a1a1a] dark:text-white uppercase tracking-wider">
                            BATCH {batch.drawNumber}
                          </span>
                          <span className="font-mono text-[10px] bg-amber-500 text-black font-black px-2 py-0.5 uppercase">
                            {batch.pendingCount} PENDING PRINT
                          </span>
                          {batch.printedCount > 0 && (
                            <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 border border-indigo-300 dark:border-indigo-800 uppercase">
                              {batch.printedCount} PRINTED
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-neutral-500 uppercase">
                            ({batch.winners.length} Total Winners)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                          <Gift className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-bold text-black dark:text-white">{batch.prizeName}</span>
                          {batch.unitValue > 0 && (
                            <span className="font-mono text-neutral-500">(₱{batch.unitValue.toLocaleString()} each)</span>
                          )}
                          <span className="text-neutral-400">•</span>
                          <span className="font-mono text-[11px] text-neutral-500">{batch.date} {batch.time}</span>
                        </div>
                      </div>
                    </div>

                    {/* Batch Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveBatchPrint({
                            batchNumber: batch.drawNumber,
                            prizeName: batch.prizeName,
                            winners: pendingWinners
                          })
                        }
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                        title={`Print all ${batch.pendingCount} pending stubs for Batch ${batch.drawNumber} in 1/4 Letter layout`}
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print All ({batch.pendingCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onMarkBatchAsPrinted(pendingWinners.map((w) => w.winnerId))}
                        className="px-3 py-2 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/10 hover:border-emerald-600 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Mark all pending stubs in this batch as Printed"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Mark All Printed</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Winners Table */}
                  {expanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#1a1a1a] text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                            <th className="p-3 w-12">#</th>
                            <th className="p-3 whitespace-nowrap">Ticket ID</th>
                            <th className="p-3 whitespace-nowrap">Profiling ID</th>
                            <th className="p-3 whitespace-nowrap">Winner Name</th>
                            <th className="p-3 whitespace-nowrap">District</th>
                            <th className="p-3 whitespace-nowrap">School</th>
                            <th className="p-3 whitespace-nowrap">Position</th>
                            <th className="p-3 text-center whitespace-nowrap">Print Status</th>
                            <th className="p-3 text-right whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5">
                          {batch.winners.map((w, idx) => (
                            <tr
                              key={w.winnerId}
                              className={`hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors ${
                                w.isPrinted ? 'opacity-60 bg-neutral-50 dark:bg-neutral-950/40' : ''
                              }`}
                            >
                              <td className="p-3 font-mono text-neutral-500">{idx + 1}</td>
                              <td className="p-3 font-mono font-black text-[#FF1E1E] whitespace-nowrap">{w.winnerId}</td>
                              <td className="p-3 font-mono font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                {w.participantId || 'N/A'}
                              </td>
                              <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">
                                {w.name}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="bg-[#1a1a1a] dark:bg-neutral-950 text-white font-black text-[10px] px-2 py-0.5 border border-[#1a1a1a] dark:border-white/10 uppercase tracking-wider">
                                  {w.district}
                                </span>
                              </td>
                              <td className="p-3 text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={w.school}>
                                {w.school}
                              </td>
                              <td className="p-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{w.position}</td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {w.isPrinted ? (
                                  <span className="font-mono text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-bold border border-emerald-300 dark:border-emerald-800 uppercase inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>PRINTED</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-bold border border-amber-300 dark:border-amber-800 uppercase inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>PENDING</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveSinglePrint(w)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                                  title="Print single verification stub (1/4 Letter)"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print</span>
                                </button>

                                {w.isPrinted ? (
                                  <button
                                    type="button"
                                    onClick={() => onRequeueWinner(w.winnerId)}
                                    className="px-2.5 py-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-amber-500 hover:text-black text-neutral-700 dark:text-neutral-300 font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                                    title="Re-queue this winner to pending print"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Re-queue</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onMarkAsPrinted(w.winnerId)}
                                    className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/10 hover:border-emerald-600 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                                    title="Mark as printed without opening printer"
                                  >
                                    <CheckCheck className="w-3 h-3" />
                                    <span>Done</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PRINT HISTORY (Audit Archive of Printed Stubs) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div>
              <h3 className="font-black text-base sm:text-lg text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                PRINTED STUBS AUDIT ARCHIVE
              </h3>
              <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                Total Stubs Printed: {historyWinners.length} of {totalPrinted}
              </p>
            </div>

            <button
              type="button"
              onClick={exportHistoryCSV}
              disabled={historyWinners.length === 0}
              className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed border border-[#1a1a1a] dark:border-white/20 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export History CSV</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1a1a1a] text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                    <th className="p-3">#</th>
                    <th className="p-3 whitespace-nowrap">Batch #</th>
                    <th className="p-3 whitespace-nowrap">Ticket ID</th>
                    <th className="p-3 whitespace-nowrap">Profiling ID</th>
                    <th className="p-3 whitespace-nowrap">Winner Name</th>
                    <th className="p-3 whitespace-nowrap">District</th>
                    <th className="p-3 whitespace-nowrap">School</th>
                    <th className="p-3 whitespace-nowrap">Prize Won</th>
                    <th className="p-3 whitespace-nowrap">Printed Timestamp</th>
                    <th className="p-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5">
                  {historyWinners.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-neutral-500 font-bold uppercase tracking-wider">
                        {totalPrinted === 0
                          ? 'No stubs have been printed yet.'
                          : 'No matching printed records found for this search filter.'}
                      </td>
                    </tr>
                  ) : (
                    historyWinners.map((w, idx) => (
                      <tr key={w.winnerId} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                        <td className="p-3 font-mono text-neutral-500">{idx + 1}</td>
                        <td className="p-3 font-mono font-black text-indigo-600 whitespace-nowrap">{w.drawNumber}</td>
                        <td className="p-3 font-mono font-black text-[#FF1E1E] whitespace-nowrap">{w.winnerId}</td>
                        <td className="p-3 font-mono font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {w.participantId || 'N/A'}
                        </td>
                        <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">
                          {w.name}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="bg-[#1a1a1a] dark:bg-neutral-950 text-white font-black text-[10px] px-2 py-0.5 border border-[#1a1a1a] dark:border-white/10 uppercase tracking-wider">
                            {w.district}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={w.school}>
                          {w.school}
                        </td>
                        <td className="p-3 font-bold text-[#1a1a1a] dark:text-white whitespace-nowrap">{w.prizeName}</td>
                        <td className="p-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                          {w.printedAt || `${w.date} ${w.time}`}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveSinglePrint(w)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                            title="Re-print this stub"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Re-print</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRequeueWinner(w.winnerId)}
                            className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/10 hover:border-amber-500 hover:text-amber-600 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                            title="Re-queue back to active pending print queue"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Re-queue</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Batch Print Document Modal (Pre-Cut 1/4 Letter Format) */}
      {activeBatchPrint && (
        <BatchPrintDocument
          batchNumber={activeBatchPrint.batchNumber}
          prizeName={activeBatchPrint.prizeName}
          winners={activeBatchPrint.winners}
          onClose={() => setActiveBatchPrint(null)}
          onMarkBatchPrinted={(winnerIds) => {
            onMarkBatchAsPrinted(winnerIds);
            setActiveBatchPrint(null);
          }}
        />
      )}

      {/* Individual Stub Print Modal (1/4 Letter Format) */}
      {activeSinglePrint && (
        <WinnerVerificationStub
          winner={activeSinglePrint}
          isModal={true}
          onClose={() => setActiveSinglePrint(null)}
          onMarkPrinted={(id) => {
            onMarkAsPrinted(id);
            setActiveSinglePrint(null);
          }}
        />
      )}
    </div>
  );
};
