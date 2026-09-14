'use client';

import React, { useState, useMemo } from 'react';
import { Winner } from '../../lib/types';
import { Search, Trophy, Download, CheckCircle2, Clock } from 'lucide-react';

interface WinnersManagerProps {
  winners: Winner[];
}

export const WinnersManager: React.FC<WinnersManagerProps> = ({ winners }) => {
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [claimFilter, setClaimFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return winners.filter((w) => {
      if (districtFilter !== 'ALL' && w.district !== districtFilter) return false;
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
    <div className="space-y-4 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-[#121212] border border-white/10 p-5 shadow-2xl space-y-4 relative border-t-2 border-t-[#FF1E1E]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-lg sm:text-xl text-white uppercase tracking-tight leading-none">OFFICIAL WINNERS HISTORY</h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">
              Total Recorded Winners: {winners.length}
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={winners.length === 0}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 text-white font-black text-xs uppercase tracking-wider shadow transition-all flex items-center gap-2 rounded-none"
          >
            <Download className="w-4 h-4 text-[#FF1E1E]" />
            <span>Export Winners CSV</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search winner name, ID, prize..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-white/10 pl-9 pr-3 py-2 text-xs font-bold text-white outline-none focus:border-[#FF1E1E] uppercase"
            />
          </div>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-neutral-950 border border-white/10 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#FF1E1E] uppercase"
          >
            <option value="ALL">All Districts (5)</option>
            <option value="NORTH">NORTH DISTRICT</option>
            <option value="SOUTH">SOUTH DISTRICT</option>
            <option value="EAST">EAST DISTRICT</option>
            <option value="WEST">WEST DISTRICT</option>
            <option value="PRIVATE">PRIVATE DISTRICT</option>
          </select>

          <select
            value={claimFilter}
            onChange={(e) => setClaimFilter(e.target.value)}
            className="bg-neutral-950 border border-white/10 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#FF1E1E] uppercase"
          >
            <option value="ALL">All Claim Statuses</option>
            <option value="UNCLAIMED">UNCLAIMED</option>
            <option value="CLAIMED">CLAIMED</option>
          </select>
        </div>
      </div>

      {/* Winners Table */}
      <div className="bg-[#121212] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-black border-b border-white/20 text-neutral-300 uppercase font-black tracking-widest text-[10px]">
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
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-neutral-500 font-bold uppercase tracking-wider">
                    {winners.length === 0
                      ? 'No official winners recorded yet. Start a draw from the Raffle Console!'
                      : 'No winners matching your filter criteria.'}
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.winnerId} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="p-3 font-mono font-black text-[#FF1E1E]">{w.winnerId}</td>
                    <td className="p-3 font-mono font-bold text-neutral-400">{w.participantId}</td>
                    <td className="p-3 font-black text-white uppercase whitespace-nowrap">{w.name}</td>
                    <td className="p-3">
                      <span className="bg-neutral-950 text-white font-black text-[10px] px-2 py-0.5 border border-white/10 uppercase tracking-wider">
                        {w.district}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-300 font-bold text-[11px] uppercase">{w.personnelType}</td>
                    <td className="p-3 text-neutral-300 whitespace-nowrap max-w-xs truncate font-medium">
                      {w.school}
                    </td>
                    <td className="p-3 font-black text-white whitespace-nowrap uppercase">
                      {w.prizeName}
                    </td>
                    <td className="p-3 font-mono font-bold text-neutral-400">{w.drawNumber}</td>
                    <td className="p-3 text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                      {w.date} {w.time}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-widest inline-flex items-center gap-1 ${
                          w.claimStatus === 'CLAIMED'
                            ? 'bg-neutral-900 text-white border border-white/30'
                            : 'bg-[#FF1E1E]/20 text-[#FF1E1E] border border-[#FF1E1E]'
                        }`}
                      >
                        {w.claimStatus === 'CLAIMED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>CLAIMED</span>
                          </>
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
      </div>
    </div>
  );
};
