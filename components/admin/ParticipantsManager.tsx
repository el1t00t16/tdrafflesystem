'use client';

import React, { useState, useMemo } from 'react';
import { District, Participant, EligibilityStatus, YesNo } from '../../lib/types';
import { parseProfilingTSV } from '../../lib/data';
import { Search, Filter, CheckCircle, XCircle, Trophy, UserCheck, ChevronLeft, ChevronRight, UploadCloud, FileSpreadsheet, X, Check } from 'lucide-react';

interface ParticipantsManagerProps {
  participants: Participant[];
  onToggleEligibility: (id: string) => void;
  onImportParticipants?: (newParticipants: Participant[]) => void;
}

export const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  participants,
  onToggleEligibility,
  onImportParticipants
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
  const pageSize = 25;

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      if (districtFilter !== 'ALL') {
        if (districtFilter === 'ECCD') {
          if (p.originalDistrict !== 'ECCD') return false;
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

  const handleProcessImport = () => {
    if (!pastedTsv.trim()) return;
    const parsed = parseProfilingTSV(pastedTsv, importEligibilityMode);
    if (parsed.length === 0) {
      setImportStatus('No valid teacher profiling records could be parsed. Check column format.');
      return;
    }
    if (onImportParticipants) {
      onImportParticipants(parsed);
      setImportStatus(`Successfully loaded ${parsed.length} teacher profiling records! (Initial Status: ${importEligibilityMode})`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setPastedTsv('');
        setImportStatus(null);
      }, 1200);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-[#1a1a1a]">
      {/* Header & Filter Bar */}
      <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm space-y-4 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-xl sm:text-2xl text-[#1a1a1a] uppercase tracking-tight leading-none">
                TEACHERS & STAFF PROFILING ROSTER
              </h3>
              <span className="font-mono text-[10px] bg-[#1a1a1a] text-white px-2 py-0.5 font-bold uppercase tracking-wider">
                {participants.length} TOTAL
              </span>
            </div>
            <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mt-1">
              Showing {filtered.length.toLocaleString()} of {participants.length.toLocaleString()} verified personnel
            </p>
          </div>

          {/* Quick Actions & Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#ff6a00] hover:text-white" />
              <span>Import Sheet</span>
            </button>

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
              <option value="SOUTH">South District</option>
              <option value="EAST">East District</option>
              <option value="WEST">West District</option>
              <option value="PRIVATE">Private Schools</option>
              <option value="ECCD">ECCD Workers</option>
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
                        {p.originalDistrict || p.district}
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
    </div>
  );
};

