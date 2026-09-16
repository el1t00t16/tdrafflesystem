'use client';

import React, { useState, useMemo } from 'react';
import { District, Participant, EligibilityStatus, YesNo } from '../../lib/types';
import { parseProfilingTSV } from '../../lib/data';
import { Search, Filter, CheckCircle, XCircle, Trophy, UserCheck, ChevronLeft, ChevronRight, UploadCloud, FileSpreadsheet, X, Check, Cloud, CloudOff, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured, batchSyncParticipantsToSupabase } from '../../lib/supabase';

interface ParticipantsManagerProps {
  participants: Participant[];
  onToggleEligibility: (id: string) => void;
  onImportParticipants?: (newParticipants: Participant[]) => void;
  onClearAllParticipants?: () => void;
}

export const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  participants,
  onToggleEligibility,
  onImportParticipants,
  onClearAllParticipants
}) => {
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [eligibleFilter, setEligibleFilter] = useState<string>('ALL');
  const [winnerFilter, setWinnerFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedTsv, setPastedTsv] = useState('');
  const [importEligibilityMode, setImportEligibilityMode] = useState<EligibilityStatus>('INELIGIBLE');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [cloudMsg, setCloudMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const pageSize = 25;

  const handleConfirmPurge = async () => {
    if (purgeInput !== 'PURGE') return;
    setIsPurging(true);
    try {
      if (onClearAllParticipants) {
        await onClearAllParticipants();
      }
      setCloudMsg({ text: 'All participants have been wiped from local cache and Supabase Cloud.' });
      setIsPurgeModalOpen(false);
      setPurgeInput('');
    } catch (err: any) {
      setCloudMsg({ text: `Purge error: ${err?.message || err}`, error: true });
    } finally {
      setIsPurging(false);
    }
  };

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      if (districtFilter !== 'ALL') {
        if (districtFilter === 'ECCD') {
          if (!p.originalDistrict?.toLowerCase().includes('eccd') && !p.school.toLowerCase().includes('eccd')) return false;
        } else if (districtFilter === 'LSB') {
          if (!p.position?.toLowerCase().includes('lsb') && !p.typeOfPersonnel?.toLowerCase().includes('lsb')) return false;
        } else if (p.district !== districtFilter) {
          return false;
        }
      }
      if (typeFilter !== 'ALL' && p.personnelType !== typeFilter) return false;
      if (eligibleFilter !== 'ALL' && p.eligible !== eligibleFilter) return false;
      if (winnerFilter !== 'ALL' && p.winner !== winnerFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.depedId && p.depedId.toLowerCase().includes(q)) ||
          p.school.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q) ||
          (p.contactNumber && p.contactNumber.includes(q))
        );
      }
      return true;
    });
  }, [participants, districtFilter, typeFilter, eligibleFilter, winnerFilter, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePushAllToCloud = async () => {
    if (!isSupabaseConfigured()) {
      alert('Supabase is currently in Offline Mode. Please configure your URL & Anon Key in the Settings tab first.');
      return;
    }
    if (participants.length === 0) {
      alert('No participants in roster to sync.');
      return;
    }

    setSyncingCloud(true);
    setSyncProgress(`0 / ${participants.length}...`);

    const res = await batchSyncParticipantsToSupabase(participants, (processed, total) => {
      setSyncProgress(`${processed.toLocaleString()} / ${total.toLocaleString()}`);
    });

    setSyncingCloud(false);
    setSyncProgress(null);

    if (res.success) {
      setCloudMsg({ text: `Successfully synced ${res.count.toLocaleString()} participants to Supabase Cloud!` });
      setTimeout(() => setCloudMsg(null), 5000);
    } else {
      setCloudMsg({ text: `Sync error: ${res.error}`, error: true });
    }
  };

  const handleProcessImport = async () => {
    if (!pastedTsv.trim()) return;
    const parsed = parseProfilingTSV(pastedTsv, importEligibilityMode);
    if (parsed.length === 0) {
      setImportStatus('No valid teacher profiling records could be parsed. Check column format.');
      return;
    }
    if (onImportParticipants) {
      onImportParticipants(parsed);
      
      if (isSupabaseConfigured()) {
        setImportStatus(`Imported locally! Syncing ${parsed.length} records to Supabase Cloud...`);
        const res = await batchSyncParticipantsToSupabase(parsed, (done, total) => {
          setImportStatus(`Syncing to Supabase Cloud: ${done} / ${total}...`);
        });
        if (res.success) {
          setImportStatus(`Successfully synced ${res.count} participants to Supabase Cloud!`);
        } else {
          setImportStatus(`Saved locally. Supabase error: ${res.error}`);
        }
      } else {
        setImportStatus(`Loaded ${parsed.length} teacher records in Offline Mode (saved to browser storage).`);
      }

      setTimeout(() => {
        setIsImportModalOpen(false);
        setPastedTsv('');
        setImportStatus(null);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-[#1a1a1a]">
      {/* Offline Alert */}
      {!isSupabaseConfigured() && (
        <div className="bg-yellow-50 border border-yellow-300 p-3.5 text-xs flex items-start gap-2.5 text-yellow-900 font-mono">
          <CloudOff className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider">Offline Mode Active (Supabase Disconnected):</span>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              Imported participants are stored only in your local browser cache. To sync them into your live Supabase database so that entrance check-in stations and projector devices can see them, configure your <strong>Supabase URL &amp; Anon Key</strong> in the <strong>Settings</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* Cloud Sync Feedback Banner */}
      {cloudMsg && (
        <div
          className={`p-3 text-xs font-mono flex items-center justify-between border ${
            cloudMsg.error
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {cloudMsg.error ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-bold">{cloudMsg.text}</span>
          </div>
          <button onClick={() => setCloudMsg(null)} className="text-neutral-500 hover:text-black p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Filter Bar */}
      <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm space-y-4 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-xl sm:text-2xl text-[#1a1a1a] uppercase tracking-tight leading-none">
                TEACHERS & STAFF PROFILING ROSTER
              </h3>
              <span className="font-mono text-[10px] bg-[#1a1a1a] text-white px-2 py-0.5 font-bold uppercase tracking-wider">
                {participants.length} TOTAL
              </span>
              <span
                className={`font-mono text-[9px] px-2 py-0.5 border font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isSupabaseConfigured()
                    ? 'border-emerald-500/40 text-emerald-700 bg-emerald-50'
                    : 'border-yellow-500/40 text-yellow-800 bg-yellow-50'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'
                  }`}
                />
                {isSupabaseConfigured() ? 'Cloud Live' : 'Offline Mode'}
              </span>
            </div>
            <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mt-1">
              Showing {filtered.length.toLocaleString()} of {participants.length.toLocaleString()} verified personnel
            </p>
          </div>

          {/* Quick Actions & Search */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {isSupabaseConfigured() && participants.length > 0 && (
              <button
                onClick={handlePushAllToCloud}
                disabled={syncingCloud}
                className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Push all participants to Supabase Cloud database"
              >
                <UploadCloud className={`w-4 h-4 text-[#ff6a00] hover:text-white ${syncingCloud ? 'animate-bounce' : ''}`} />
                <span>{syncingCloud ? (syncProgress || 'Syncing...') : 'Sync to Cloud'}</span>
              </button>
            )}

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#ff6a00] hover:text-white" />
              <span>Import Sheet</span>
            </button>

            {participants.length > 0 && onClearAllParticipants && (
              <button
                onClick={() => {
                  setIsPurgeModalOpen(true);
                  setPurgeInput('');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Completely purge all participants from Supabase Cloud and local storage"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Purge Roster</span>
              </button>
            )}

            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, ID, school..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-[#1a1a1a] focus:border-[#1a1a1a] outline-none uppercase"
              />
            </div>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[#1a1a1a]/15 font-mono text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              District:
            </label>
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 px-2 py-1.5 font-bold text-[#1a1a1a] outline-none uppercase"
            >
              <option value="ALL">All Districts</option>
              <option value="NORTH">North District</option>
              <option value="EAST">East District</option>
              <option value="WEST">West District</option>
              <option value="SOUTH">South District</option>
              <option value="PRIVATE">Private (ECCD + Private School + LSB)</option>
              <option value="LSB">-- Filter Only LSB</option>
              <option value="ECCD">-- Filter Only ECCD</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Personnel Type:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 px-2 py-1.5 font-bold text-[#1a1a1a] outline-none uppercase"
            >
              <option value="ALL">All Personnel Types</option>
              <option value="TEACHING">Teaching</option>
              <option value="NON-TEACHING">Non-Teaching</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Eligibility:
            </label>
            <select
              value={eligibleFilter}
              onChange={(e) => {
                setEligibleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 px-2 py-1.5 font-bold text-[#1a1a1a] outline-none uppercase"
            >
              <option value="ALL">All Eligibility</option>
              <option value="ELIGIBLE">Eligible (In Pool)</option>
              <option value="INELIGIBLE">Ineligible</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Winner Status:
            </label>
            <select
              value={winnerFilter}
              onChange={(e) => {
                setWinnerFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 px-2 py-1.5 font-bold text-[#1a1a1a] outline-none uppercase"
            >
              <option value="ALL">All Status</option>
              <option value="NO">Not Won Yet</option>
              <option value="YES">Won (Drawn)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white border-2 border-[#1a1a1a] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#1a1a1a] text-white uppercase font-mono font-bold tracking-wider text-[10px]">
                <th className="p-3">Profiling ID</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">District</th>
                <th className="p-3">Type / Position</th>
                <th className="p-3">School Assigned</th>
                <th className="p-3">DepEd ID</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-center">Eligibility</th>
                <th className="p-3 text-center">Won?</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/15 font-sans">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-neutral-500 font-mono font-bold uppercase tracking-wider">
                    No participants found matching the current criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f8f7f4] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#1a1a1a] text-[11px] whitespace-nowrap">
                      {p.id}
                    </td>
                    <td className="p-3">
                      <div className="font-display font-bold text-sm text-[#1a1a1a] uppercase whitespace-nowrap">
                        {p.fullName}
                      </div>
                      {p.sex && (
                        <div className="font-mono text-[10px] text-neutral-500 uppercase">
                          {p.sex}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="bg-[#1a1a1a] text-white font-mono font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap">
                        {p.district === 'PRIVATE' ? `PRIVATE (${p.originalDistrict || 'LSB/ECCD'})` : `${p.district}`}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-[#1a1a1a] text-xs uppercase">{p.position}</div>
                      <div className="font-mono text-[10px] text-neutral-500 uppercase">
                        {p.typeOfPersonnel || p.personnelType}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-neutral-800 whitespace-nowrap max-w-xs truncate">
                      {p.school}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-neutral-600">
                      {p.depedId || '—'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-neutral-600 whitespace-nowrap">
                      {p.contactNumber ? `0${p.contactNumber.replace(/^0+/, '')}` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 font-mono font-bold text-[9px] uppercase tracking-widest ${
                          p.eligible === 'ELIGIBLE'
                            ? 'bg-[#1a1a1a] text-white'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {p.eligible}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {p.winner === 'YES' ? (
                        <span className="inline-flex items-center gap-1 text-[#ff6a00] font-mono font-bold text-[11px] tracking-wider">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>WON</span>
                        </span>
                      ) : (
                        <span className="font-mono text-neutral-400 text-[10px] uppercase">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onToggleEligibility(p.id)}
                        className="text-[10px] px-2.5 py-1 bg-white hover:bg-[#1a1a1a] hover:text-white border border-[#1a1a1a] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                        title="Toggle Eligibility"
                      >
                        {p.eligible === 'ELIGIBLE' ? 'Flag Ineligible' : 'Set Eligible'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-[#f8f7f4] px-4 py-3 border-t border-[#1a1a1a]/15 flex items-center justify-between text-xs text-neutral-600 font-mono">
          <div className="font-bold uppercase tracking-wider text-[10px]">
            Page <strong className="text-[#1a1a1a]">{currentPage}</strong> of <strong className="text-[#1a1a1a]">{totalPages}</strong> ({filtered.length} entries)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="p-1.5 border border-[#1a1a1a] bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="p-1.5 border border-[#1a1a1a] bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Import / Paste Profiling Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] max-w-2xl w-full shadow-2xl relative text-[#1a1a1a] overflow-hidden">
            <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#ff6a00]" />
                <h3 className="font-display font-bold text-lg uppercase tracking-tight">
                  IMPORT PROFILING DATA (TSV / GOOGLE SHEETS)
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="font-mono text-xs text-neutral-600 leading-relaxed uppercase tracking-wider">
                Paste your tab-separated teacher profiling rows copied from Google Sheets or Excel with columns:
                <br />
                <span className="text-[#1a1a1a] font-bold">
                  TIMESTAMP • PROFILING ID • Deped Employee ID • TYPE OF PERSONNEL • DISTRICT • SCHOOL ASSIGNED • POSITION • LAST NAME • FIRST NAME • MIDDLE NAME • SUFFIX • SEX • CONTACT NUMBER • EMAIL
                </span>
              </p>

              <div className="bg-neutral-100 p-3 border border-[#1a1a1a]/20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] mb-2">
                  Initial Raffle Eligibility for Imported Batch:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setImportEligibilityMode('INELIGIBLE')}
                    className={`p-2.5 text-left border-2 flex items-start gap-2 transition-all ${
                      importEligibilityMode === 'INELIGIBLE'
                        ? 'border-[#ff6a00] bg-white text-[#1a1a1a] shadow-xs'
                        : 'border-transparent bg-white/70 text-neutral-600 hover:bg-white'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      importEligibilityMode === 'INELIGIBLE' ? 'border-[#ff6a00]' : 'border-neutral-400'
                    }`}>
                      {importEligibilityMode === 'INELIGIBLE' && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />}
                    </span>
                    <div>
                      <div className="font-bold text-[#1a1a1a]">INELIGIBLE (Default)</div>
                      <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">
                        Requires scanning teacher QR code at Attendance station to become eligible for raffle draw.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportEligibilityMode('ELIGIBLE')}
                    className={`p-2.5 text-left border-2 flex items-start gap-2 transition-all ${
                      importEligibilityMode === 'ELIGIBLE'
                        ? 'border-[#22c55e] bg-white text-[#1a1a1a] shadow-xs'
                        : 'border-transparent bg-white/70 text-neutral-600 hover:bg-white'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      importEligibilityMode === 'ELIGIBLE' ? 'border-[#22c55e]' : 'border-neutral-400'
                    }`}>
                      {importEligibilityMode === 'ELIGIBLE' && <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
                    </span>
                    <div>
                      <div className="font-bold text-[#1a1a1a]">INSTANTLY ELIGIBLE</div>
                      <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">
                        Marks all imported teachers as eligible immediately without gate QR attendance check-in.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <textarea
                value={pastedTsv}
                onChange={(e) => setPastedTsv(e.target.value)}
                placeholder="Paste tab-separated rows here..."
                rows={8}
                className="w-full bg-white border-2 border-[#1a1a1a] p-3 text-xs font-mono text-[#1a1a1a] focus:outline-none"
              />

              {importStatus && (
                <div className="p-3 bg-white border border-[#1a1a1a] font-mono text-xs font-bold text-[#1a1a1a]">
                  {importStatus}
                </div>
              )}
            </div>

            <div className="bg-white px-6 py-3.5 border-t border-[#1a1a1a]/15 flex justify-end gap-3 font-mono text-xs font-bold uppercase">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-[#1a1a1a] hover:bg-[#f8f7f4]"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessImport}
                className="px-5 py-2 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white transition-colors"
              >
                Process & Load Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#121212] border-2 border-red-500 max-w-md w-full p-5 space-y-4 shadow-2xl text-white font-mono text-xs">
            <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>DANGER: PURGE ENTIRE PARTICIPANTS ROSTER</span>
            </div>

            <p className="text-neutral-300 leading-relaxed">
              This action will permanently delete all <strong>{participants.length.toLocaleString()} participants</strong> from your browser local cache and Supabase Cloud database.
            </p>

            <div className="bg-red-950/40 border border-red-500/30 p-3 text-[11px] text-red-200 leading-relaxed">
              ⚠️ Warning: This cannot be undone. You will need to re-import your masterlist TSV/CSV file to load participants again.
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-neutral-300 font-bold uppercase text-[10px] tracking-wider">
                Type <strong className="text-white font-mono">PURGE</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="PURGE"
                value={purgeInput}
                onChange={(e) => setPurgeInput(e.target.value)}
                disabled={isPurging}
                className="w-full bg-black border border-red-500 p-2.5 text-white font-mono text-xs outline-none uppercase font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => {
                  setIsPurgeModalOpen(false);
                  setPurgeInput('');
                }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/20 text-neutral-300 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgeInput !== 'PURGE' || isPurging}
                onClick={handleConfirmPurge}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold uppercase flex items-center gap-1.5"
              >
                {isPurging ? 'Purging...' : 'Permanently Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

