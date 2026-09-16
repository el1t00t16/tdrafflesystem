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
    <div className="space-y-4 animate-fade-in text-[#1a1a1a] dark:text-[#f4f4f5]">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 p-5 shadow-sm dark:shadow-2xl space-y-4 relative border-t-4 border-t-[#FF1E1E]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-lg sm:text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight leading-none">OFFICIAL WINNERS HISTORY</h3>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
              Total Recorded Winners: {winners.length}
              {filtered.length !== winners.length ? ` • Filtered: ${filtered.length}` : ''}
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={winners.length === 0}
            className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#ff6a00] disabled:opacity-30 disabled:cursor-not-allowed border border-[#1a1a1a] dark:border-white/20 text-white font-black text-xs uppercase tracking-wider shadow transition-all flex items-center gap-2 rounded-none"
          >
            <Download className="w-4 h-4 text-[#ff6a00]" />
            <span>Export Winners CSV ({filtered.length})</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#1a1a1a]/15 dark:border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search winner name, ID, prize..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/10 pl-9 pr-3 py-2 text-xs font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] uppercase"
            />
          </div>

          <select
            value={districtFilter}
            onChange={(e) => {
              setDistrictFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/10 px-3 py-2 text-xs font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] uppercase"
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
            className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/30 dark:border-white/10 px-3 py-2 text-xs font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-[#FF1E1E] uppercase"
          >
            <option value="ALL">All Claim Statuses</option>
            <option value="UNCLAIMED">UNCLAIMED</option>
            <option value="CLAIMED">CLAIMED</option>
            <option value="FORFEITED">FORFEITED</option>
          </select>
        </div>
      </div>

      {/* Winners Table */}
      <div className="bg-white dark:bg-[#121212] border-2 border-[#1a1a1a] dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#1a1a1a] dark:border-white/20 text-white uppercase font-mono font-bold tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-white/5 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-neutral-500 font-bold uppercase tracking-wider">
                    {winners.length === 0
                      ? 'No official winners recorded yet. Start a draw from the Raffle Console!'
                      : 'No winners matching your filter criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedWinners.map((w, idx) => (
                  <tr key={w.winnerId} className="hover:bg-[#f8f7f4] dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="p-3 font-mono text-neutral-500 text-[11px]">{startIndex + idx + 1}</td>
                    <td className="p-3 font-mono font-black text-[#FF1E1E]">{w.winnerId}</td>
                    <td className="p-3 font-mono font-bold text-neutral-600 dark:text-neutral-400">{w.participantId}</td>
                    <td className="p-3 font-black text-[#1a1a1a] dark:text-white uppercase whitespace-nowrap">{w.name}</td>
                    <td className="p-3">
                      <span className="bg-[#1a1a1a] dark:bg-neutral-950 text-white font-black text-[10px] px-2 py-0.5 border border-[#1a1a1a] dark:border-white/10 uppercase tracking-wider">
                        {w.district}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">{w.personnelType}</td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={w.school}>
                      {w.school}
                    </td>
                    <td className="p-3 font-bold text-[#1a1a1a] dark:text-white whitespace-nowrap">{w.prizeName}</td>
                    <td className="p-3 font-mono font-bold text-neutral-600 dark:text-neutral-400">{w.drawNumber}</td>
                    <td className="p-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                      {w.date} {w.time}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest inline-flex items-center gap-1 ${
                          w.claimStatus === 'CLAIMED'
                            ? 'bg-[#1a1a1a] dark:bg-neutral-900 text-white border border-[#1a1a1a] dark:border-white/30'
                            : w.claimStatus === 'FORFEITED'
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 line-through'
                            : 'bg-[#FF1E1E]/10 dark:bg-[#FF1E1E]/20 text-[#FF1E1E] border border-[#FF1E1E]'
                        }`}
                      >
                        {w.claimStatus === 'CLAIMED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
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
        <div className="bg-[#f8f7f4] dark:bg-black/80 border-t border-[#1a1a1a]/15 dark:border-white/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400 flex-wrap">
            <span className="font-medium">
              Showing <span className="text-[#1a1a1a] dark:text-white font-bold">{filtered.length === 0 ? 0 : startIndex + 1}</span> to{' '}
              <span className="text-[#1a1a1a] dark:text-white font-bold">{endIndex}</span> of{' '}
              <span className="text-[#1a1a1a] dark:text-white font-bold">{filtered.length}</span> winners
            </span>
            <div className="flex items-center gap-1.5 ml-0 sm:ml-2 border-l-0 sm:border-l border-[#1a1a1a]/15 dark:border-white/10 sm:pl-3">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white dark:bg-neutral-900 border border-[#1a1a1a]/30 dark:border-white/20 text-[#1a1a1a] dark:text-white font-bold px-2 py-1 text-xs outline-none focus:border-[#FF1E1E]"
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
            <span className="text-neutral-600 dark:text-neutral-400 text-xs mr-2 font-mono">
              Page <strong className="text-[#1a1a1a] dark:text-white">{currentPage}</strong> of <strong className="text-[#1a1a1a] dark:text-white">{totalPages}</strong>
            </span>
            <div className="inline-flex border border-[#1a1a1a]/30 dark:border-white/20 divide-x divide-[#1a1a1a]/20 dark:divide-white/20">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
                title="First Page"
                className="p-1.5 bg-white dark:bg-neutral-900 hover:bg-[#f8f7f4] dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-[#1a1a1a] dark:text-white transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title="Previous Page"
                className="p-1.5 bg-white dark:bg-neutral-900 hover:bg-[#f8f7f4] dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-[#1a1a1a] dark:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title="Next Page"
                className="p-1.5 bg-white dark:bg-neutral-900 hover:bg-[#f8f7f4] dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-[#1a1a1a] dark:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                title="Last Page"
                className="p-1.5 bg-white dark:bg-neutral-900 hover:bg-[#f8f7f4] dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-[#1a1a1a] dark:text-white transition-colors"
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
