'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Participant } from '../../lib/types';
import {
  DuplicateCluster,
  DuplicateMatchType,
  findDuplicateParticipants,
  mergeParticipants,
  scoreParticipant
} from '../../lib/duplicateChecker';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Trash2,
  GitMerge,
  EyeOff,
  Search,
  Filter,
  X,
  Sparkles,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  onDeleteParticipant: (id: string) => Promise<void> | void;
  onBatchDeleteParticipants: (ids: string[]) => Promise<void> | void;
  onMergeParticipants: (primaryId: string, mergedData: Participant, secondaryIds: string[]) => Promise<void> | void;
}

export const DuplicateResolutionModal: React.FC<DuplicateResolutionModalProps> = ({
  isOpen,
  onClose,
  participants,
  onDeleteParticipant,
  onBatchDeleteParticipants,
  onMergeParticipants
}) => {
  const [filterType, setFilterType] = useState<'ALL' | DuplicateMatchType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Load ignored keys from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('td26_ignored_duplicate_keys');
      if (saved) {
        setIgnoredKeys(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveIgnoredKeys = (next: Set<string>) => {
    setIgnoredKeys(next);
    try {
      localStorage.setItem('td26_ignored_duplicate_keys', JSON.stringify(Array.from(next)));
    } catch (e) {
      console.error(e);
    }
  };

  // Compute duplicate clusters
  const clusters = useMemo(() => {
    return findDuplicateParticipants(participants, ignoredKeys);
  }, [participants, ignoredKeys]);

  // Compute counts
  const totalRedundantRecords = useMemo(() => {
    return clusters.reduce((acc, c) => acc + (c.participants.length - 1), 0);
  }, [clusters]);

  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (filterType !== 'ALL' && c.matchType !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVal = c.matchValue.toLowerCase();
        const hasPart = c.participants.some(
          (p) =>
            p.fullName.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            (p.depedId && p.depedId.toLowerCase().includes(q)) ||
            p.school.toLowerCase().includes(q)
        );
        return matchVal.includes(q) || hasPart;
      }
      return true;
    });
  }, [clusters, filterType, searchQuery]);

  // Handle single cluster merge
  const handleMergeCluster = async (cluster: DuplicateCluster) => {
    if (cluster.participants.length < 2) return;
    setIsProcessing(true);

    try {
      const primary = cluster.participants.find((p) => p.id === cluster.recommendedKeepId) || cluster.participants[0];
      const secondaries = cluster.participants.filter((p) => p.id !== primary.id);

      let merged = { ...primary };
      for (const sec of secondaries) {
        merged = mergeParticipants(merged, sec);
      }

      const secondaryIds = secondaries.map((s) => s.id);
      await onMergeParticipants(primary.id, merged, secondaryIds);

      setStatusMsg({
        text: `Successfully merged into ${primary.fullName} (${primary.id}). Removed ${secondaryIds.length} duplicate copy.`
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: `Merge error: ${err?.message || err}`, error: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle keeping a specific participant and deleting all other copies in the cluster
  const handleKeepSpecific = async (cluster: DuplicateCluster, keepId: string) => {
    setIsProcessing(true);
    try {
      const toDelete = cluster.participants.filter((p) => p.id !== keepId).map((p) => p.id);
      if (toDelete.length === 1) {
        await onDeleteParticipant(toDelete[0]);
      } else {
        await onBatchDeleteParticipants(toDelete);
      }

      const kept = cluster.participants.find((p) => p.id === keepId);
      setStatusMsg({
        text: `Kept ${kept?.fullName || keepId}. Removed ${toDelete.length} duplicate record(s).`
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: `Deletion error: ${err?.message || err}`, error: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle ignoring a false-positive cluster
  const handleIgnoreCluster = (cluster: DuplicateCluster) => {
    const key = `${cluster.matchType}:${cluster.matchValue}`;
    const next = new Set(ignoredKeys);
    next.add(key);
    saveIgnoredKeys(next);
    setStatusMsg({ text: `Marked "${cluster.matchValue}" as intentional / not duplicate.` });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Auto-resolve all safe identical duplicate clusters
  const handleAutoResolveSafeDuplicates = async () => {
    // Exact identical = same DepEd ID, or identical normalized name + same district
    const safeClusters = clusters.filter(
      (c) => c.confidence === 'HIGH' && c.participants.length === 2
    );

    if (safeClusters.length === 0) {
      alert('No high-confidence 2-record duplicate pairs found to auto-resolve.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to automatically resolve ${safeClusters.length} duplicate cluster(s)?\n\nThe system will preserve the best record (retaining attendance check-in & complete profile info) and remove redundant duplicate rows.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    let resolvedCount = 0;

    try {
      for (const cluster of safeClusters) {
        const primary = cluster.participants.find((p) => p.id === cluster.recommendedKeepId) || cluster.participants[0];
        const secondaries = cluster.participants.filter((p) => p.id !== primary.id);

        let merged = { ...primary };
        for (const sec of secondaries) {
          merged = mergeParticipants(merged, sec);
        }

        const secondaryIds = secondaries.map((s) => s.id);
        await onMergeParticipants(primary.id, merged, secondaryIds);
        resolvedCount++;
      }

      setStatusMsg({
        text: `Auto-resolved ${resolvedCount} duplicate clusters cleanly!`
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ text: `Auto-resolve error: ${err?.message || err}`, error: true });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-fade-in text-[#1a1a1a]">
      <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="bg-[#1a1a1a] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#ff6a00] text-black">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-lg sm:text-xl uppercase tracking-tight leading-none text-white">
                  TEACHER PROFILING DUPLICATION RESOLUTION
                </h3>
                {clusters.length > 0 ? (
                  <span className="bg-amber-400 text-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider">
                    {clusters.length} CONFLICTS ({totalRedundantRecords} REDUNDANT)
                  </span>
                ) : (
                  <span className="bg-emerald-500 text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    ROSTER CLEAN
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
                Municipal Teachers&apos; Day 2026 • Automated Duplicate Detection &amp; Merging
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="bg-white border-b border-[#1a1a1a]/20 p-3 sm:p-4 space-y-3 shrink-0">
          {statusMsg && (
            <div
              className={`p-2.5 text-xs font-mono font-bold flex items-center justify-between border ${
                statusMsg.error
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 uppercase font-bold border transition-colors whitespace-nowrap ${
                  filterType === 'ALL'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-[#f8f7f4] text-neutral-600 border-[#1a1a1a]/20 hover:bg-neutral-200'
                }`}
              >
                All Conflicts ({clusters.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('DEPED_ID')}
                className={`px-3 py-1.5 uppercase font-bold border transition-colors whitespace-nowrap ${
                  filterType === 'DEPED_ID'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-[#f8f7f4] text-neutral-600 border-[#1a1a1a]/20 hover:bg-neutral-200'
                }`}
              >
                DepEd ID Matches ({clusters.filter((c) => c.matchType === 'DEPED_ID').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('FULL_NAME')}
                className={`px-3 py-1.5 uppercase font-bold border transition-colors whitespace-nowrap ${
                  filterType === 'FULL_NAME'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-[#f8f7f4] text-neutral-600 border-[#1a1a1a]/20 hover:bg-neutral-200'
                }`}
              >
                Name Matches ({clusters.filter((c) => c.matchType === 'FULL_NAME').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('CONTACT_NUMBER')}
                className={`px-3 py-1.5 uppercase font-bold border transition-colors whitespace-nowrap ${
                  filterType === 'CONTACT_NUMBER'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-[#f8f7f4] text-neutral-600 border-[#1a1a1a]/20 hover:bg-neutral-200'
                }`}
              >
                Contact Matches ({clusters.filter((c) => c.matchType === 'CONTACT_NUMBER').length})
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter duplicate entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 pl-8 pr-2.5 py-1 text-xs font-mono font-bold text-[#1a1a1a] outline-none uppercase"
                />
              </div>

              {clusters.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleAutoResolveSafeDuplicates}
                  className="px-3 py-1.5 bg-[#ff6a00] hover:bg-[#ff7e1d] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                  title="Automatically merges 2-record identical clusters, keeping gate attendance & complete data"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Resolve ({clusters.filter((c) => c.confidence === 'HIGH').length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clusters Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-100">
          {filteredClusters.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-neutral-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="font-display font-bold text-lg uppercase text-[#1a1a1a]">
                NO DUPLICATES DETECTED
              </h4>
              <p className="font-mono text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                All teacher records have distinct identifiers. Gate attendance scanning and raffle prize draws will run without risk of double entries.
              </p>
            </div>
          ) : (
            filteredClusters.map((cluster, idx) => (
              <div
                key={cluster.id}
                className="bg-white border-2 border-[#1a1a1a] shadow-sm overflow-hidden"
              >
                {/* Cluster Card Header */}
                <div className="bg-[#1a1a1a] text-white px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-1.5 py-0.5 bg-amber-400 text-black uppercase">
                      #{idx + 1} {cluster.matchType.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-200">
                      {cluster.reason}
                    </span>
                    <span className="text-[10px] font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.5 border border-neutral-700 uppercase">
                      {cluster.participants.length} Records
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleMergeCluster(cluster)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Merge records: keeps best data and deletes duplicate copy"
                    >
                      <GitMerge className="w-3 h-3" />
                      <span>Merge &amp; Keep Best</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleIgnoreCluster(cluster)}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 border border-neutral-700 transition-colors cursor-pointer"
                      title="Ignore this cluster (not a duplicate)"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Dismiss</span>
                    </button>
                  </div>
                </div>

                {/* Comparative Records Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 p-3 gap-3 bg-neutral-50/50">
                  {cluster.participants.map((p) => {
                    const isRecommended = p.id === cluster.recommendedKeepId;
                    const score = scoreParticipant(p);

                    return (
                      <div
                        key={p.id}
                        className={`p-3 space-y-2.5 border transition-all ${
                          isRecommended
                            ? 'bg-amber-50/60 border-amber-400 shadow-xs'
                            : 'bg-white border-neutral-200'
                        }`}
                      >
                        {/* Top Identification Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-black text-black">
                                {p.id}
                              </span>
                              {isRecommended && (
                                <span className="bg-amber-400 text-black font-mono text-[9px] font-black uppercase px-1.5 py-0.2 tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  RECOMMENDED RECORD
                                </span>
                              )}
                            </div>
                            <div className="font-display font-bold text-sm text-[#1a1a1a] uppercase mt-0.5 leading-snug">
                              {p.fullName}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleKeepSpecific(cluster, p.id)}
                            className="px-2 py-1 bg-white hover:bg-black hover:text-white border border-[#1a1a1a] font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                            title="Keep this exact record and delete all others in cluster"
                          >
                            Keep Only This
                          </button>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono border-t border-b border-black/10 py-1.5">
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase block">DepEd Employee ID:</span>
                            <strong className="text-neutral-900">{p.depedId || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase block">District:</span>
                            <span className="font-bold text-black uppercase">{p.district}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase block">School Assigned:</span>
                            <span className="font-medium text-neutral-800 truncate block" title={p.school}>
                              {p.school}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase block">Position:</span>
                            <span className="font-medium text-neutral-800 truncate block" title={p.position}>
                              {p.position}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase block">Contact Number:</span>
                            <span className="text-neutral-900">{p.contactNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase block">Email:</span>
                            <span className="text-neutral-900 truncate block" title={p.email || '—'}>
                              {p.email || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Attendance & Eligibility Status Badges */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 font-bold uppercase ${
                                p.attendedAt
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-neutral-200 text-neutral-600'
                              }`}
                            >
                              {p.attendedAt ? `Attended (${p.attendedAt.slice(11, 16)})` : 'Not Attended'}
                            </span>

                            <span
                              className={`px-1.5 py-0.5 font-bold uppercase ${
                                p.eligible === 'ELIGIBLE'
                                  ? 'bg-black text-white'
                                  : 'bg-red-100 text-red-700 border border-red-300'
                              }`}
                            >
                              {p.eligible}
                            </span>

                            {p.winner === 'YES' && (
                              <span className="px-1.5 py-0.5 bg-[#ff6a00] text-white font-bold uppercase">
                                Won Prize
                              </span>
                            )}
                          </div>

                          <span className="text-neutral-400 text-[9px]">
                            Completeness: {score} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-5 py-3 border-t-2 border-[#1a1a1a] flex items-center justify-between text-xs font-mono text-neutral-600 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-neutral-400" />
            <span>
              Merging automatically updates local storage and syncs to Supabase Cloud in real-time.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-[#1a1a1a] hover:bg-neutral-800 text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
