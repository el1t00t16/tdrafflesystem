'use client';

import React, { useState, useMemo } from 'react';
import { RaffleLog, Winner } from '../../lib/types';
import {
  FileText,
  Shield,
  CheckCircle,
  RotateCcw,
  XCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  FileSpreadsheet,
  Search,
  Eye,
  Sparkles,
  CheckCheck,
  AlertCircle,
  Filter,
  Calendar,
  Award,
  ChevronDown,
  Layers,
  X
} from 'lucide-react';
import {
  isSupabaseConfigured,
  fetchLogsFromSupabase,
  batchSyncLogsToSupabase,
  generateLogsFromWinners
} from '../../lib/supabase';

interface RaffleLogsViewProps {
  logs: RaffleLog[];
  winners?: Winner[];
  onRefreshLogs?: () => Promise<void>;
  onSyncLogsToCloud?: () => Promise<void>;
  onReconstructLogs?: () => Promise<void>;
}

export const RaffleLogsView: React.FC<RaffleLogsViewProps> = ({
  logs,
  winners = [],
  onRefreshLogs,
  onSyncLogsToCloud,
  onReconstructLogs
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'REDRAWN' | 'CANCELLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LIVE_STAGE' | 'PRE_DRAW'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [notification, setNotification] = useState<{ text: string; error?: boolean } | null>(null);
  const [selectedLogForInspection, setSelectedLogForInspection] = useState<RaffleLog | null>(null);

  const isConnected = isSupabaseConfigured();

  // Show notification for 5 seconds
  const showNotify = (text: string, error?: boolean) => {
    setNotification({ text, error });
    setTimeout(() => setNotification(null), 5000);
  };

  // Manual Refresh from Supabase
  const handleManualRefresh = async () => {
    if (!isConnected) {
      showNotify('Supabase is offline. Configure credentials in Settings tab.', true);
      return;
    }
    setIsRefreshing(true);
    try {
      if (onRefreshLogs) {
        await onRefreshLogs();
        showNotify('Successfully refreshed audit logs from Supabase Cloud!');
      } else {
        const cloudLogs = await fetchLogsFromSupabase();
        if (cloudLogs) {
          showNotify(`Fetched ${cloudLogs.length} audit logs from Supabase!`);
        } else {
          showNotify('Notice: Could not load logs from Supabase.', true);
        }
      }
    } catch (e: any) {
      showNotify(`Error refreshing logs: ${e?.message || e}`, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sync all local logs to Supabase
  const handleSyncToCloud = async () => {
    if (!isConnected) {
      showNotify('Supabase is offline. Configure credentials in Settings tab.', true);
      return;
    }
    if (logs.length === 0) {
      showNotify('No logs to upload.', true);
      return;
    }
    setIsSyncing(true);
    try {
      if (onSyncLogsToCloud) {
        await onSyncLogsToCloud();
        showNotify(`Successfully synced ${logs.length} audit logs to Supabase Cloud!`);
      } else {
        const res = await batchSyncLogsToSupabase(logs);
        if (res.success) {
          showNotify(`Successfully synced ${res.count} audit logs to Supabase Cloud!`);
        } else {
          showNotify(`Sync error: ${res.error}`, true);
        }
      }
    } catch (e: any) {
      showNotify(`Error syncing logs: ${e?.message || e}`, true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reconstruct logs from existing confirmed winners
  const handleReconstruct = async () => {
    if (winners.length === 0) {
      showNotify('No winners found to reconstruct logs from.', true);
      return;
    }
    setIsReconstructing(true);
    try {
      if (onReconstructLogs) {
        await onReconstructLogs();
        showNotify('Reconstructed audit logs from winners and connected to Supabase!');
      } else {
        const generated = generateLogsFromWinners(winners);
        if (isConnected) {
          await batchSyncLogsToSupabase(generated);
        }
        showNotify(`Generated ${generated.length} audit log rounds and connected to Supabase!`);
      }
    } catch (e: any) {
      showNotify(`Reconstruct error: ${e?.message || e}`, true);
    } finally {
      setIsReconstructing(false);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;

      // Draw Type filter
      if (typeFilter !== 'ALL') {
        const isPre = log.drawType === 'PRE_DRAW' || String(log.drawNumber).toUpperCase().startsWith('PRE');
        if (typeFilter === 'PRE_DRAW' && !isPre) return false;
        if (typeFilter === 'LIVE_STAGE' && isPre) return false;
      }

      // Search query
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      const matchId = (log.logId || '').toLowerCase().includes(q);
      const matchDraw = (log.drawNumber || '').toLowerCase().includes(q);
      const matchPrize = (log.prizeName || '').toLowerCase().includes(q);
      const matchAdmin = (log.admin || '').toLowerCase().includes(q);
      const matchWinners = (log.winnerIds || []).some((id) => id.toLowerCase().includes(q));
      const matchWinnerNames = (log.winnerNames || []).some((name) => name.toLowerCase().includes(q));

      return matchId || matchDraw || matchPrize || matchAdmin || matchWinners || matchWinnerNames;
    });
  }, [logs, searchFilter, statusFilter, typeFilter]);

  // Overall Statistics
  const confirmedLogsCount = useMemo(() => logs.filter((l) => l.status === 'CONFIRMED').length, [logs]);
  const redrawnLogsCount = useMemo(() => logs.filter((l) => l.status === 'REDRAWN').length, [logs]);
  const totalAwardedInLogs = useMemo(() => {
    return logs
      .filter((l) => l.status === 'CONFIRMED')
      .reduce((sum, l) => sum + (l.numberOfWinners || 0), 0);
  }, [logs]);

  // Check if winners exist with draw numbers that could be logged
  const unloggedBatchCount = useMemo(() => {
    if (logs.length > 0) return 0;
    const drawSet = new Set(winners.map((w) => w.drawNumber).filter(Boolean));
    return drawSet.size;
  }, [logs, winners]);

  // Export CSV
  const exportLogsCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No logs to export.');
      return;
    }

    const headers = [
      'Log ID',
      'Draw Number',
      'Draw Type',
      'Timestamp',
      'Prize Name',
      'Prize ID',
      'Number of Winners',
      'Eligible Pool Size',
      'Winner Participant IDs',
      'Winner Names',
      'Status',
      'Admin Officer',
      'Distribution Mode'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredLogs.map((log) => [
      escapeCsv(log.logId),
      escapeCsv(log.drawNumber),
      escapeCsv(log.drawType || 'LIVE_STAGE'),
      escapeCsv(log.timestamp),
      escapeCsv(log.prizeName),
      escapeCsv(log.prizeId),
      log.numberOfWinners,
      log.eligiblePoolSize,
      escapeCsv((log.winnerIds || []).join(', ')),
      escapeCsv((log.winnerNames || []).join(', ')),
      escapeCsv(log.status),
      escapeCsv(log.admin),
      escapeCsv(log.distributionMode || 'EQUAL_PER_DISTRICT')
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `raffle_audit_log_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      {/* Top Banner & Supabase Connection Status Strip */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl relative border-t-4 border-t-[#FF1E1E]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF1E1E] text-white shadow-sm font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">
                  RAFFLE AUDIT LOG
                </h3>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    SUPABASE CONNECTED (LIVE SYNC)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase tracking-wider">
                    <CloudOff className="w-3 h-3 text-amber-600" />
                    OFFLINE / LOCAL STORAGE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider mt-1">
                Immutable audit trail of every draw attempt, confirmed result, or discarded redraw
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/30 dark:border-white/20 hover:border-black dark:hover:border-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Fetch latest audit logs directly from Supabase Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Cloud'}</span>
            </button>

            {logs.length > 0 && isConnected && (
              <button
                type="button"
                onClick={handleSyncToCloud}
                disabled={isSyncing}
                className="px-3 py-2 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/30 dark:border-white/20 hover:border-indigo-600 text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Force upload all local audit logs to Supabase"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-indigo-500' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync to Cloud'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={exportLogsCSV}
              disabled={logs.length === 0}
              className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#FF1E1E] text-white border border-[#1a1a1a] dark:border-white/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              title="Download official audit report spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Feedback notification banner */}
        {notification && (
          <div
            className={`mt-4 p-3 text-xs font-mono font-bold flex items-center justify-between border ${
              notification.error
                ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
                : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              <span>{notification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 hover:opacity-70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1a1a1a]/15 dark:border-white/10">
          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Draw Rounds Logged
            </span>
            <span className="text-2xl font-black font-mono text-[#1a1a1a] dark:text-white">
              {logs.length}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Total Winners Awarded
            </span>
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {totalAwardedInLogs}
            </span>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Confirmed vs Discarded
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black font-mono text-emerald-600">{confirmedLogsCount}</span>
              <span className="text-xs text-neutral-400">/</span>
              <span className="text-sm font-black font-mono text-amber-500">{redrawnLogsCount} redraws</span>
            </div>
          </div>

          <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Supabase Status
            </span>
            <span className={`text-sm font-black font-mono mt-1 block uppercase ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {isConnected ? 'ONLINE & SYNCED' : 'OFFLINE MODE'}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Reconstruct Alert if logs are empty but winners exist */}
      {unloggedBatchCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-black shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h4 className="font-mono font-black text-xs uppercase text-amber-900 dark:text-amber-200">
                AUDIT LOG DISCOVERY: {winners.length} WINNERS ({unloggedBatchCount} BATCHES) FOUND IN DATABASE!
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 font-sans">
                Confirmed winners already exist in your system without corresponding audit log entries. Click below to reconstruct official audit records and sync them directly to Supabase.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReconstruct}
            disabled={isReconstructing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isReconstructing ? 'animate-spin' : ''}`} />
            <span>{isReconstructing ? 'Connecting...' : 'Connect & Generate Logs from Winners'}</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-3 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Log ID, Draw #, Prize Name, Winner ID or Name, Admin..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/10 pl-9 pr-3 py-2 text-xs font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] uppercase"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#f8f7f4] dark:bg-neutral-950 p-1 border border-[#1a1a1a]/20 dark:border-white/10 text-[10px] font-mono font-bold">
            <span className="text-neutral-500 px-1 uppercase">Status:</span>
            {(['ALL', 'CONFIRMED', 'REDRAWN'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 uppercase transition-all ${
                  statusFilter === st
                    ? 'bg-[#1a1a1a] text-white dark:bg-white dark:text-black font-black'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-[#f8f7f4] dark:bg-neutral-950 p-1 border border-[#1a1a1a]/20 dark:border-white/10 text-[10px] font-mono font-bold">
            <span className="text-neutral-500 px-1 uppercase">Type:</span>
            {(['ALL', 'LIVE_STAGE', 'PRE_DRAW'] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setTypeFilter(tp)}
                className={`px-2 py-0.5 uppercase transition-all ${
                  typeFilter === tp
                    ? 'bg-[#FF1E1E] text-white font-black'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {tp === 'LIVE_STAGE' ? 'Stage' : tp === 'PRE_DRAW' ? 'Pre-Draw' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#1a1a1a] dark:border-white/20 text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                <th className="p-3 w-24">Log ID</th>
                <th className="p-3 w-28">Draw #</th>
                <th className="p-3 w-40">Timestamp</th>
                <th className="p-3">Prize</th>
                <th className="p-3 text-center w-20">Winners</th>
                <th className="p-3 text-center w-24">Pool Size</th>
                <th className="p-3">Winner Participant IDs</th>
                <th className="p-3 text-center w-28">Status</th>
                <th className="p-3 w-32">Admin Officer</th>
                <th className="p-3 text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-neutral-500 font-bold uppercase tracking-wider">
                    {logs.length === 0 ? (
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 text-neutral-400 mx-auto opacity-50" />
                        <p className="text-sm">No raffle rounds logged yet.</p>
                        <p className="text-[11px] text-neutral-400 font-normal font-mono">
                          {isConnected
                            ? 'Connected to Supabase table "raffle_logs". Logs will appear here automatically on each confirmed draw or redraw.'
                            : 'Logs are stored in local storage and will sync automatically when Supabase credentials are configured.'}
                        </p>
                      </div>
                    ) : (
                      'No raffle rounds matching current filters.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isPre = log.drawType === 'PRE_DRAW' || String(log.drawNumber).toUpperCase().startsWith('PRE');
                  return (
                    <tr key={log.logId} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                      <td className="p-3 font-mono font-black text-[#1a1a1a] dark:text-white whitespace-nowrap">
                        {log.logId}
                      </td>
                      <td className="p-3 font-mono whitespace-nowrap">
                        <span className="font-black text-[#FF1E1E] mr-1.5">{log.drawNumber}</span>
                        {isPre && (
                          <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1 py-0.2 border border-purple-300 dark:border-purple-800 uppercase font-mono font-bold">
                            PRE
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">
                        {log.prizeName}
                      </td>
                      <td className="p-3 text-center font-black text-[#1a1a1a] dark:text-white font-mono">
                        {log.numberOfWinners}
                      </td>
                      <td className="p-3 text-center text-neutral-600 dark:text-neutral-400 font-mono">
                        {log.eligiblePoolSize.toLocaleString()}
                      </td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono text-[11px] max-w-xs truncate" title={(log.winnerIds || []).join(', ')}>
                        {(log.winnerIds || []).join(', ')}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 font-black text-[9px] uppercase tracking-widest inline-flex items-center gap-1 ${
                            log.status === 'CONFIRMED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : log.status === 'REDRAWN'
                              ? 'bg-[#FF1E1E]/10 dark:bg-[#FF1E1E]/20 text-[#FF1E1E] border border-[#FF1E1E]'
                              : 'bg-neutral-200 dark:bg-neutral-950 text-neutral-500 border border-[#1a1a1a]/20 dark:border-white/10'
                          }`}
                        >
                          {log.status === 'CONFIRMED' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {log.status === 'REDRAWN' && <RotateCcw className="w-3 h-3 text-[#FF1E1E]" />}
                          {log.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-400 text-[11px] uppercase font-bold whitespace-nowrap">
                        {log.admin}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForInspection(log)}
                          className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#FF1E1E] text-white font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="View round audit certificate details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Draw Round Modal */}
      {selectedLogForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="bg-[#1a1a1a] text-white p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#FF1E1E]" />
                <div>
                  <h4 className="font-mono font-black text-sm uppercase">
                    AUDIT RECORD: {selectedLogForInspection.logId}
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">
                    Draw Round: {selectedLogForInspection.drawNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForInspection(null)}
                className="p-1 hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/15 dark:border-white/10">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">Prize</span>
                  <span className="text-sm font-black text-[#1a1a1a] dark:text-white uppercase">
                    {selectedLogForInspection.prizeName}
                  </span>
                </div>

                <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/15 dark:border-white/10">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">Status</span>
                  <span className="text-sm font-black uppercase text-emerald-600">
                    {selectedLogForInspection.status}
                  </span>
                </div>

                <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/15 dark:border-white/10">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">Timestamp</span>
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {selectedLogForInspection.timestamp}
                  </span>
                </div>

                <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/15 dark:border-white/10">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">Authorized Admin</span>
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase">
                    {selectedLogForInspection.admin}
                  </span>
                </div>
              </div>

              {/* Pool and Winners counts */}
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/15 dark:border-white/10 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Eligible Pool at Draw</span>
                  <span className="text-base font-black">{selectedLogForInspection.eligiblePoolSize.toLocaleString()} Teachers</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 uppercase block">Winners Awarded</span>
                  <span className="text-base font-black text-emerald-600">{selectedLogForInspection.numberOfWinners}</span>
                </div>
              </div>

              {/* Winner Participant IDs and Names */}
              <div>
                <span className="font-mono font-bold text-[11px] uppercase tracking-wider block mb-1">
                  Recorded Winner Participant IDs ({selectedLogForInspection.winnerIds?.length || 0}):
                </span>
                <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border border-[#1a1a1a]/20 dark:border-white/10 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {selectedLogForInspection.winnerIds?.map((id, idx) => {
                    const name = selectedLogForInspection.winnerNames?.[idx];
                    return (
                      <div key={id} className="py-0.5 flex items-center justify-between border-b border-dashed border-neutral-200 dark:border-neutral-800 last:border-none">
                        <span className="font-bold text-[#FF1E1E]">{id}</span>
                        {name && <span className="text-neutral-700 dark:text-neutral-300 uppercase">{name}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#f8f7f4] dark:bg-neutral-950 p-3 border-t border-[#1a1a1a]/15 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForInspection(null)}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#FF1E1E] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
