'use client';

import React, { useState, useMemo } from 'react';
import { Winner } from '../../lib/types';
import {
  Search,
  Trophy,
  Download,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface WinnersManagerProps {
  winners: Winner[];
}

export const WinnersManager: React.FC<WinnersManagerProps> = ({ winners }) => {
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [claimFilter, setClaimFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filtered = useMemo(() => {
    return winners.filter((w) => {
      if (districtFilter !== 'ALL') {
        if (districtFilter === 'ECCD') {
          if (!w.originalDistrict?.toLowerCase().includes('eccd') && !w.school?.toLowerCase().includes('eccd')) return false;
        } else if (districtFilter === 'LSB') {
          if (!w.position?.toLowerCase().includes('lsb') && !w.personnelType?.toLowerCase().includes('lsb')) return false;
        } else if (w.district !== districtFilter) {
          return false;
        }
      }
      if (claimFilter !== 'ALL' && w.claimStatus !== claimFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.winnerId.toLowerCase().includes(q) ||
          w.participantId.toLowerCase().includes(q) ||
          w.prizeName.toLowerCase().includes(q) ||
          w.school.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [winners, districtFilter, claimFilter, search]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedWinners = filtered.slice(startIndex, endIndex);

  const exportCSV = () => {
    const headers = [
      'Winner ID', 'Participant ID', 'Name', 'District', 'Personnel Type',
      'School', 'Position', 'Prize', 'Unit Value', 'Draw Number', 'Date', 'Time', 'Claim Status'
    ];
    const rows = filtered.map((w) => [
      w.winnerId,
      w.participantId,
      `"${w.name}"`,
      w.district,
      w.personnelType,
      `"${w.school}"`,
      `"${w.position}"`,
      `"${w.prizeName}"`,
      w.unitValue,
      w.drawNumber,
      w.date,
      w.time,
      w.claimStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `malungon_teachers_day_winners_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Controls */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-lg sm:text-xl text-[var(--ink)] uppercase tracking-tight leading-none">OFFICIAL WINNERS HISTORY</h3>
            <p className="text-[11px] text-[var(--ink-muted)] font-medium mt-1">
              Total Recorded Winners: <span className="font-bold text-[var(--ink)]">{winners.length}</span>
              {filtered.length !== winners.length ? ` • Filtered: ${filtered.length}` : ''}
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={winners.length === 0}
            className="px-4 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--border)] text-[var(--ink)] font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Export Winners CSV ({filtered.length})</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search winner name, ID, prize..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-[var(--ink)] outline-none focus:border-[var(--accent)] uppercase"
            />
          </div>

          <select
            value={districtFilter}
            onChange={(e) => {
              setDistrictFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--ink)] outline-none focus:border-[var(--accent)] uppercase cursor-pointer"
          >
            <option value="ALL">All Districts (5)</option>
            <option value="NORTH">NORTH DISTRICT</option>
            <option value="EAST">EAST DISTRICT</option>
            <option value="WEST">WEST DISTRICT</option>
            <option value="SOUTH">SOUTH DISTRICT</option>
            <option value="PRIVATE">PRIVATE (ECCD + PRIVATE SCHOOL + LSB)</option>
            <option value="LSB">-- Filter Only LSB</option>
            <option value="ECCD">-- Filter Only ECCD</option>
          </select>

          <select
            value={claimFilter}
            onChange={(e) => {
              setClaimFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--ink)] outline-none focus:border-[var(--accent)] uppercase cursor-pointer"
          >
            <option value="ALL">All Claim Statuses</option>
            <option value="UNCLAIMED">UNCLAIMED</option>
            <option value="CLAIMED">CLAIMED</option>
            <option value="FORFEITED">FORFEITED</option>
          </select>
        </div>
      </div>

      {/* Winners Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] uppercase font-bold tracking-wider text-[10px]">
                <th className="p-3">#</th>
                <th className="p-3">Winner ID</th>
                <th className="p-3">Participant ID</th>
                <th className="p-3">Winner Name</th>
                <th className="p-3">District</th>
                <th className="p-3">Type</th>
                <th className="p-3">School</th>
                <th className="p-3">Prize Won</th>
                <th className="p-3">Draw #</th>
                <th className="p-3">Date &amp; Time</th>
                <th className="p-3 text-center">Claim Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[var(--ink-muted)] font-bold uppercase tracking-wider">
                    {winners.length === 0
                      ? 'No official winners recorded yet. Start a draw from the Raffle Console!'
                      : 'No winners matching your filter criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedWinners.map((w, idx) => (
                  <tr key={w.winnerId} className="hover:bg-[var(--surface-elevated)] transition-colors">
                    <td className="p-3 font-mono text-[var(--ink-muted)] text-[11px]">{startIndex + idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-[var(--accent)]">{w.winnerId}</td>
                    <td className="p-3 font-mono font-bold text-[var(--ink-muted)]">{w.participantId}</td>
                    <td className="p-3 font-bold text-[var(--ink)] uppercase whitespace-nowrap">{w.name}</td>
                    <td className="p-3">
                      <span className="bg-[var(--surface-elevated)] text-[var(--ink)] font-bold text-[10px] px-2 py-0.5 rounded-md border border-[var(--border)] uppercase tracking-wider">
                        {w.district}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--ink-muted)]">{w.personnelType}</td>
                    <td className="p-3 text-[var(--ink-muted)] truncate max-w-[200px]" title={w.school}>
                      {w.school}
                    </td>
                    <td className="p-3 font-bold text-[var(--ink)] whitespace-nowrap">{w.prizeName}</td>
                    <td className="p-3 font-mono font-bold text-[var(--ink-muted)]">{w.drawNumber}</td>
                    <td className="p-3 text-[var(--ink-muted)] whitespace-nowrap font-mono text-[11px]">
                      {w.date} {w.time}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          w.claimStatus === 'CLAIMED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : w.claimStatus === 'FORFEITED'
                            ? 'bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/30 line-through'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {w.claimStatus === 'CLAIMED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>CLAIMED</span>
                          </>
                        ) : w.claimStatus === 'FORFEITED' ? (
                          <span>FORFEITED</span>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>UNCLAIMED</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-[var(--ink-muted)] flex-wrap">
            <span className="font-medium">
              Showing <span className="text-[var(--ink)] font-bold">{filtered.length === 0 ? 0 : startIndex + 1}</span> to{' '}
              <span className="text-[var(--ink)] font-bold">{endIndex}</span> of{' '}
              <span className="text-[var(--ink)] font-bold">{filtered.length}</span> winners
            </span>
            <div className="flex items-center gap-1.5 ml-0 sm:ml-2 border-l-0 sm:border-l border-[var(--border)] sm:pl-3">
              <span className="text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--ink)] font-bold px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--ink-muted)] text-xs mr-2 font-mono">
              Page <strong className="text-[var(--ink)]">{currentPage}</strong> of <strong className="text-[var(--ink)]">{totalPages}</strong>
            </span>
            <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden divide-x divide-[var(--border)]">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
                title="First Page"
                className="p-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--ink)] transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title="Previous Page"
                className="p-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--ink)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title="Next Page"
                className="p-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--ink)] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                title="Last Page"
                className="p-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--ink)] transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
