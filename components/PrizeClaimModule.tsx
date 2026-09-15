'use client';

import React, { useState, useMemo } from 'react';
import { Winner, District } from '../lib/types';
import {
  Search,
  CheckCircle,
  ShieldCheck,
  Trophy,
  User,
  Clock,
  Check,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Building,
  Phone,
  Mail,
  UserCheck,
  FileCheck,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  X,
  ExternalLink
} from 'lucide-react';
import { soundSynthesizer } from '../lib/sound';

interface PrizeClaimModuleProps {
  winners: Winner[];
  onClaimPrize: (
    winnerId: string,
    claimedBy: string,
    details?: {
      idPresented?: string;
      isProxyClaim?: boolean;
      proxyName?: string;
      proxyRelationship?: string;
      claimNotes?: string;
    }
  ) => void;
  onUnclaimPrize?: (winnerId: string) => void;
  onForfeitPrize?: (winnerId: string, reason?: string) => void;
}

export const PrizeClaimModule: React.FC<PrizeClaimModuleProps> = ({
  winners,
  onClaimPrize,
  onUnclaimPrize,
  onForfeitPrize
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNCLAIMED' | 'CLAIMED' | 'FORFEITED'>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(() => {
    return winners.length > 0 ? winners[0].winnerId : null;
  });

  // Disbursement Form State
  const [officerName, setOfficerName] = useState('Malungon Claims Desk - Station 1');
  const [idPresented, setIdPresented] = useState('DepEd Employee ID');
  const [isProxyClaim, setIsProxyClaim] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [proxyRelationship, setProxyRelationship] = useState('');
  const [proxyAuthConfirmed, setProxyAuthConfirmed] = useState(false);
  const [claimNotes, setClaimNotes] = useState('');

  // Print Voucher Modal
  const [printingWinner, setPrintingWinner] = useState<Winner | null>(null);

  // Undo Confirmation Dialog
  const [revertingWinnerId, setRevertingWinnerId] = useState<string | null>(null);

  // Forfeiture Confirmation Dialog
  const [forfeitingWinner, setForfeitingWinner] = useState<Winner | null>(null);
  const [forfeitReason, setForfeitReason] = useState('Unclaimed by deadline / Absent on stage');

  // Stats
  const totalWinners = winners.length;
  const claimedCount = winners.filter((w) => w.claimStatus === 'CLAIMED').length;
  const forfeitedCount = winners.filter((w) => w.claimStatus === 'FORFEITED').length;
  const unclaimedCount = winners.filter((w) => w.claimStatus === 'UNCLAIMED').length;
  const totalValue = winners.reduce((sum, w) => sum + (w.unitValue || 0), 0);
  const disbursedValue = winners
    .filter((w) => w.claimStatus === 'CLAIMED')
    .reduce((sum, w) => sum + (w.unitValue || 0), 0);
  const claimRate = totalWinners > 0 ? Math.round((claimedCount / totalWinners) * 100) : 0;

  // Filtered Winners List
  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      if (statusFilter !== 'ALL' && w.claimStatus !== statusFilter) return false;
      if (districtFilter !== 'ALL') {
        if (districtFilter === 'ECCD') {
          if (!w.originalDistrict?.toLowerCase().includes('eccd') && !w.school.toLowerCase().includes('eccd')) return false;
        } else if (districtFilter === 'LSB') {
          if (!w.position?.toLowerCase().includes('lsb') && !w.personnelType?.toLowerCase().includes('lsb')) return false;
        } else if (w.district !== districtFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesWinnerId = w.winnerId.toLowerCase().includes(q);
        const matchesPartId = w.participantId.toLowerCase().includes(q);
        const matchesDeped = w.depedId ? w.depedId.toLowerCase().includes(q) : false;
        const matchesSchool = w.school.toLowerCase().includes(q);
        const matchesPrize = w.prizeName.toLowerCase().includes(q);
        const matchesContact = w.contactNumber ? w.contactNumber.includes(q) : false;

        if (
          !matchesName &&
          !matchesWinnerId &&
          !matchesPartId &&
          !matchesDeped &&
          !matchesSchool &&
          !matchesPrize &&
          !matchesContact
        ) {
          return false;
        }
      }
      return true;
    });
  }, [winners, statusFilter, districtFilter, searchQuery]);

  // Currently Selected Winner Object
  const selectedWinner = useMemo(() => {
    if (!selectedWinnerId && filteredWinners.length > 0) {
      return filteredWinners[0];
    }
    return winners.find((w) => w.winnerId === selectedWinnerId) || null;
  }, [winners, selectedWinnerId, filteredWinners]);

  // Execute Claim
  const handleConfirmClaim = () => {
    if (!selectedWinner) return;
    if (isProxyClaim && (!proxyName.trim() || !proxyAuthConfirmed)) {
      alert('Please provide the authorized representative name and confirm inspection of the authorization letter.');
      return;
    }

    soundSynthesizer.playCelebrationFanfare();
    onClaimPrize(selectedWinner.winnerId, officerName, {
      idPresented,
      isProxyClaim,
      proxyName: isProxyClaim ? proxyName : undefined,
      proxyRelationship: isProxyClaim ? proxyRelationship : undefined,
      claimNotes: claimNotes.trim() ? claimNotes : undefined
    });

    // Reset proxy fields
    setIsProxyClaim(false);
    setProxyName('');
    setProxyRelationship('');
    setProxyAuthConfirmed(false);
    setClaimNotes('');
  };

  // Revert / Undo Claim
  const handleExecuteUnclaim = (winnerId: string) => {
    soundSynthesizer.playClick();
    if (onUnclaimPrize) {
      onUnclaimPrize(winnerId);
    }
    setRevertingWinnerId(null);
  };

  // Export Claims CSV
  const handleExportCSV = () => {
    soundSynthesizer.playClick();
    if (winners.length === 0) return;

    const headers = [
      'WINNER TICKET ID',
      'PROFILING ID',
      'DEPED EMPLOYEE ID',
      'NAME',
      'DISTRICT',
      'ORIGINAL DISTRICT',
      'PERSONNEL TYPE',
      'SCHOOL',
      'POSITION',
      'CONTACT NUMBER',
      'PRIZE NAME',
      'UNIT VALUE (PHP)',
      'DRAW ROUND',
      'WINNING TIMESTAMP',
      'CLAIM STATUS',
      'CLAIMED AT',
      'CLAIMED BY OFFICER',
      'ID PRESENTED',
      'IS PROXY CLAIM',
      'PROXY NAME',
      'PROXY RELATIONSHIP',
      'REMARKS'
    ];

    const rows = winners.map((w) => [
      `"${w.winnerId}"`,
      `"${w.participantId}"`,
      `"${w.depedId || ''}"`,
      `"${w.name.replace(/"/g, '""')}"`,
      `"${w.district}"`,
      `"${w.originalDistrict || w.district}"`,
      `"${w.personnelType}"`,
      `"${w.school.replace(/"/g, '""')}"`,
      `"${w.position.replace(/"/g, '""')}"`,
      `"${w.contactNumber || ''}"`,
      `"${w.prizeName.replace(/"/g, '""')}"`,
      w.unitValue || 0,
      `"${w.drawNumber}"`,
      `"${w.date} ${w.time}"`,
      `"${w.claimStatus}"`,
      `"${w.claimedAt || ''}"`,
      `"${w.claimedBy || ''}"`,
      `"${w.idPresented || ''}"`,
      w.isProxyClaim ? 'YES' : 'NO',
      `"${w.proxyName || ''}"`,
      `"${w.proxyRelationship || ''}"`,
      `"${w.claimNotes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DepEd_Malungon_TeachersDay2026_Prize_Claims_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1a1a1a]">
      {/* Top Banner / Metrics Dashboard */}
      <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1a1a1a]/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#ff6a00]" />
              <h2 className="font-display font-bold text-2xl sm:text-3xl uppercase tracking-tight text-[#1a1a1a]">
                PRIZE CLAIM &amp; DISBURSEMENT STATION
              </h2>
            </div>
            <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mt-1">
              Municipality of Malungon • Official Teachers&apos; Day 2026 Grand Raffle Claims Verification
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap"
              title="Download full claims audit CSV"
            >
              <Download className="w-4 h-4 text-[#ff6a00]" />
              <span>Export Claims CSV</span>
            </button>
          </div>
        </div>

        {/* Real-time Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-3 bg-[#f8f7f4] border border-[#1a1a1a]/20">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Total Winners</span>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-0.5">{totalWinners}</div>
            <span className="text-[10px] text-neutral-500 uppercase">Official Drawn Tickets</span>
          </div>

          <div className="p-3 bg-[#f8f7f4] border border-[#1a1a1a]/20">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Claimed Prizes</span>
            <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 mt-0.5">
              {claimedCount} <span className="text-xs font-mono font-normal text-neutral-500">({claimRate}%)</span>
            </div>
            <span className="text-[10px] text-neutral-500 uppercase">Released to Teachers</span>
          </div>

          <div className="p-3 bg-[#f8f7f4] border border-[#1a1a1a]/20">
            <span className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-wider block">Unclaimed Pending</span>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#ff6a00] mt-0.5">{unclaimedCount}</div>
            <span className="text-[10px] text-neutral-500 uppercase">Awaiting Verification</span>
          </div>

          <div className="p-3 bg-[#f8f7f4] border border-[#1a1a1a]/20">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Value Disbursed</span>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-0.5">
              ₱{disbursedValue.toLocaleString()}
            </div>
            <span className="text-[10px] text-neutral-500 uppercase">of ₱{totalValue.toLocaleString()} total</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Claim Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Winners Roster (5 Cols) */}
        <div className="lg:col-span-5 bg-white border-2 border-[#1a1a1a] p-4 shadow-sm space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a1a1a] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#ff6a00]" />
                <span>WINNERS ROSTER ({filteredWinners.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-neutral-500">Click to Verify</span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, Profiling ID, DepEd ID..."
                className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 pl-9 pr-3 py-2 text-xs font-mono font-bold text-[#1a1a1a] focus:border-[#1a1a1a] outline-none uppercase"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <div className="flex border border-[#1a1a1a]/30 bg-[#f8f7f4] p-0.5 text-[10px] font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2 py-1 uppercase ${statusFilter === 'ALL' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-600 hover:text-black'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('UNCLAIMED')}
                  className={`px-2 py-1 uppercase ${statusFilter === 'UNCLAIMED' ? 'bg-[#ff6a00] text-white' : 'text-neutral-600 hover:text-black'}`}
                >
                  Unclaimed ({unclaimedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('CLAIMED')}
                  className={`px-2 py-1 uppercase ${statusFilter === 'CLAIMED' ? 'bg-[#1a1a1a] text-white' : 'text-neutral-600 hover:text-black'}`}
                >
                  Claimed ({claimedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('FORFEITED')}
                  className={`px-2 py-1 uppercase ${statusFilter === 'FORFEITED' ? 'bg-red-700 text-white' : 'text-neutral-600 hover:text-black'}`}
                >
                  Forfeited ({forfeitedCount})
                </button>
              </div>

              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="bg-[#f8f7f4] border border-[#1a1a1a]/30 px-2 py-1 text-[10px] font-mono font-bold text-[#1a1a1a] outline-none uppercase"
              >
                <option value="ALL">All Districts</option>
                <option value="NORTH">North</option>
                <option value="EAST">East</option>
                <option value="WEST">West</option>
                <option value="SOUTH">South</option>
                <option value="PRIVATE">Private (ECCD + Private School + LSB)</option>
                <option value="LSB">-- Filter Only LSB</option>
                <option value="ECCD">-- Filter Only ECCD</option>
              </select>
            </div>
          </div>

          {/* Winners Scrollable List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredWinners.length === 0 ? (
              <div className="p-8 text-center bg-[#f8f7f4] border border-dashed border-[#1a1a1a]/20 text-neutral-500 font-mono text-xs">
                No winners found matching the current search criteria.
              </div>
            ) : (
              filteredWinners.map((w) => {
                const isSelected = selectedWinner?.winnerId === w.winnerId;
                const isClaimed = w.claimStatus === 'CLAIMED';
                const isForfeited = w.claimStatus === 'FORFEITED';

                return (
                  <div
                    key={w.winnerId}
                    onClick={() => setSelectedWinnerId(w.winnerId)}
                    className={`p-3 border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#1a1a1a] bg-[#f8f7f4] shadow-sm ring-1 ring-[#1a1a1a]'
                        : isForfeited
                        ? 'border-red-200 bg-red-50/30 opacity-75'
                        : 'border-[#1a1a1a]/20 hover:border-[#1a1a1a]/50 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-neutral-500">
                            {w.winnerId}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-[#1a1a1a] text-white">
                            {w.participantId}
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-[#1a1a1a] uppercase mt-1 leading-snug">
                          {w.name}
                        </h4>
                        <div className="font-sans text-[11px] text-neutral-600 truncate max-w-[240px]">
                          {w.school}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`inline-block font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                            isClaimed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isForfeited
                              ? 'bg-red-100 text-red-800 border border-red-300 line-through'
                              : 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                          }`}
                        >
                          {w.claimStatus}
                        </span>
                        {w.unitValue > 0 ? (
                          <div className="font-mono text-[11px] font-bold text-[#1a1a1a] mt-1">
                            ₱{w.unitValue.toLocaleString()}
                          </div>
                        ) : (
                          <div className="font-mono text-[10px] font-bold text-neutral-500 mt-1 uppercase">
                            Item Prize
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1a1a1a]/10 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                      <span className="truncate max-w-[180px] font-semibold text-[#1a1a1a]">
                        {w.prizeName}
                      </span>
                      <span>{w.originalDistrict || w.district}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Verification & Claim Terminal (7 Cols) */}
        <div className="lg:col-span-7 bg-white border-2 border-[#1a1a1a] p-6 shadow-sm space-y-6">
          {selectedWinner ? (
            <div className="space-y-6">
              {/* Winner Dossier Header */}
              <div className="border-b-2 border-[#1a1a1a] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-[#1a1a1a] text-white px-2 py-0.5">
                      {selectedWinner.winnerId}
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-500">
                      ROUND: {selectedWinner.drawNumber}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider ${
                      selectedWinner.claimStatus === 'CLAIMED'
                        ? 'bg-emerald-700 text-white'
                        : selectedWinner.claimStatus === 'FORFEITED'
                        ? 'bg-red-700 text-white'
                        : 'bg-[#ff6a00] text-white'
                    }`}
                  >
                    {selectedWinner.claimStatus === 'CLAIMED'
                      ? 'OFFICIALLY CLAIMED'
                      : selectedWinner.claimStatus === 'FORFEITED'
                      ? 'TICKET FORFEITED (RETURNED TO RAFFLE)'
                      : 'READY FOR VERIFICATION & CLAIM'}
                  </span>
                </div>

                <h3 className="font-display font-bold text-2xl sm:text-3xl text-[#1a1a1a] uppercase mt-2 tracking-tight">
                  {selectedWinner.name}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Profiling ID</span>
                    <strong className="text-[#1a1a1a] text-sm">{selectedWinner.participantId}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">DepEd Employee ID</span>
                    <strong className="text-[#1a1a1a] text-sm">{selectedWinner.depedId || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">District</span>
                    <strong className="text-[#1a1a1a] text-sm">{selectedWinner.originalDistrict || selectedWinner.district}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-neutral-500 uppercase block">School Assigned</span>
                    <strong className="text-[#1a1a1a]">{selectedWinner.school}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase block">Position</span>
                    <strong className="text-[#1a1a1a]">{selectedWinner.position}</strong>
                  </div>
                </div>

                {(selectedWinner.contactNumber || selectedWinner.email) && (
                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-2 border-t border-[#1a1a1a]/10 text-xs font-mono text-neutral-600">
                    {selectedWinner.contactNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                        <span>0{selectedWinner.contactNumber.replace(/^0+/, '')}</span>
                      </span>
                    )}
                    {selectedWinner.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{selectedWinner.email}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Awarded Prize Card */}
              <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#1a1a1a] text-[#ff6a00] flex items-center justify-center font-bold text-xl flex-shrink-0">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                      Awarded Prize
                    </span>
                    <h4 className="font-display font-bold text-lg sm:text-xl text-[#1a1a1a] uppercase leading-tight">
                      {selectedWinner.prizeName}
                    </h4>
                    <span className="font-mono text-xs text-neutral-600">
                      Draw Time: {selectedWinner.date} {selectedWinner.time}
                    </span>
                  </div>
                </div>

                {selectedWinner.unitValue > 0 ? (
                  <div className="text-right sm:border-l sm:border-[#1a1a1a]/20 sm:pl-4">
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase block">
                      Valued At
                    </span>
                    <div className="font-mono font-bold text-xl text-[#1a1a1a]">
                      ₱{selectedWinner.unitValue.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-right sm:border-l sm:border-[#1a1a1a]/20 sm:pl-4">
                    <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase block">
                      Reward Type
                    </span>
                    <div className="font-mono font-bold text-xs px-2 py-0.5 bg-[#1a1a1a] text-white uppercase tracking-wider mt-1 inline-block">
                      Physical Item
                    </div>
                  </div>
                )}
              </div>

              {/* Status Specific Section */}
              {selectedWinner.claimStatus === 'CLAIMED' ? (
                /* CLAIMED STATE CARD */
                <div className="bg-white border-2 border-emerald-700 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <h4 className="font-mono font-bold text-sm uppercase tracking-wide">
                        PRIZE OFFICIALLY RELEASED &amp; RECORDED
                      </h4>
                      <p className="font-mono text-[11px] text-emerald-900/80">
                        Disbursed on {selectedWinner.claimedAt} by {selectedWinner.claimedBy || 'Claims Committee'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#f8f7f4] border border-[#1a1a1a]/15 p-3 text-xs font-mono space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block">ID Verified:</span>
                        <strong className="text-[#1a1a1a]">{selectedWinner.idPresented || 'DepEd Employee ID'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block">Claim Type:</span>
                        <strong className="text-[#1a1a1a]">
                          {selectedWinner.isProxyClaim ? 'Authorized Representative / Proxy' : 'Personal (Winner in person)'}
                        </strong>
                      </div>
                    </div>

                    {selectedWinner.isProxyClaim && selectedWinner.proxyName && (
                      <div className="pt-2 border-t border-[#1a1a1a]/10">
                        <span className="text-[10px] text-neutral-500 uppercase block">Representative Name:</span>
                        <strong className="text-[#1a1a1a]">
                          {selectedWinner.proxyName} ({selectedWinner.proxyRelationship || 'Representative'})
                        </strong>
                      </div>
                    )}

                    {selectedWinner.claimNotes && (
                      <div className="pt-2 border-t border-[#1a1a1a]/10">
                        <span className="text-[10px] text-neutral-500 uppercase block">Remarks / Serial #:</span>
                        <span className="text-[#1a1a1a]">{selectedWinner.claimNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Claimed Winner */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setPrintingWinner(selectedWinner)}
                      className="flex-1 py-3 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Official Claim Slip / Receipt</span>
                    </button>

                    {onUnclaimPrize && (
                      <button
                        onClick={() => setRevertingWinnerId(selectedWinner.winnerId)}
                        className="py-3 px-4 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                        title="Revert claim status back to unclaimed"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Unclaimed</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedWinner.claimStatus === 'FORFEITED' ? (
                /* FORFEITED STATE CARD */
                <div className="bg-red-50 border-2 border-red-700 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-700" />
                    <div>
                      <h4 className="font-mono font-bold text-sm uppercase tracking-wide">
                        TICKET OFFICIALLY FORFEITED &amp; CANCELLED
                      </h4>
                      <p className="font-mono text-[11px] text-red-900/80">
                        Forfeited on {selectedWinner.forfeitedAt || 'Event Day'} • Reason: {selectedWinner.forfeitReason || 'Unclaimed / Absent'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-red-200 p-3 text-xs font-mono space-y-2 text-neutral-800">
                    <p className="text-xs">
                      1 unit of <strong>{selectedWinner.prizeName}</strong> was returned to the Active Raffle Pool and made available for redraw on stage.
                    </p>
                    <div className="text-[10px] text-neutral-500 uppercase">
                      Audit Trail: Ticket {selectedWinner.winnerId} cannot be disbursed.
                    </div>
                  </div>
                </div>
              ) : (
                /* UNCLAIMED DISBURSEMENT VERIFICATION FORM */
                <div className="bg-[#f8f7f4] border-2 border-[#1a1a1a] p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1a1a1a]/15 pb-3">
                    <FileCheck className="w-5 h-5 text-[#ff6a00]" />
                    <h4 className="font-mono font-bold text-sm uppercase tracking-wider text-[#1a1a1a]">
                      CLAIM DISBURSEMENT VERIFICATION FORM
                    </h4>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Disbursing Officer */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                        Disbursing Committee Officer / Station:
                      </label>
                      <input
                        type="text"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        className="w-full bg-white border border-[#1a1a1a]/40 px-3 py-2 text-xs font-mono font-bold text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                      />
                    </div>

                    {/* ID Presented */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                          Official ID Presented:
                        </label>
                        <select
                          value={idPresented}
                          onChange={(e) => setIdPresented(e.target.value)}
                          className="w-full bg-white border border-[#1a1a1a]/40 px-3 py-2 text-xs font-mono font-bold text-[#1a1a1a] outline-none"
                        >
                          <option value="DepEd Employee ID">DepEd Employee ID</option>
                          <option value="PRC Professional Teacher License">PRC Teacher&apos;s License</option>
                          <option value="PhilSys National ID">PhilSys National ID</option>
                          <option value="Driver's License">Driver&apos;s License</option>
                          <option value="UMID / SSS / GSIS ID">UMID / SSS / GSIS ID</option>
                          <option value="School Principal Certification">Principal Endorsement Slip</option>
                          <option value="Other Valid ID">Other Valid Photo ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                          Item Serial # / Voucher Code (Optional):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SN-892144 or Voucher #04"
                          value={claimNotes}
                          onChange={(e) => setClaimNotes(e.target.value)}
                          className="w-full bg-white border border-[#1a1a1a]/40 px-3 py-2 text-xs font-mono text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                        />
                      </div>
                    </div>

                    {/* Proxy Claim Toggle */}
                    <div className="pt-2 border-t border-[#1a1a1a]/10">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                        <input
                          type="checkbox"
                          checked={isProxyClaim}
                          onChange={(e) => setIsProxyClaim(e.target.checked)}
                          className="w-4 h-4 accent-[#1a1a1a]"
                        />
                        <span>Claimed by Authorized Proxy / Representative</span>
                      </label>

                      {isProxyClaim && (
                        <div className="mt-3 p-3 bg-white border border-[#1a1a1a]/20 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                                Representative Full Name:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Maria Santos"
                                value={proxyName}
                                onChange={(e) => setProxyName(e.target.value)}
                                className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 px-3 py-1.5 text-xs font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                                Relationship / Affiliation:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Co-Teacher / Spouse / Sibling"
                                value={proxyRelationship}
                                onChange={(e) => setProxyRelationship(e.target.value)}
                                className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/30 px-3 py-1.5 text-xs font-mono font-bold"
                              />
                            </div>
                          </div>

                          <label className="flex items-start gap-2 cursor-pointer text-[11px] text-neutral-700">
                            <input
                              type="checkbox"
                              checked={proxyAuthConfirmed}
                              onChange={(e) => setProxyAuthConfirmed(e.target.checked)}
                              className="w-4 h-4 accent-[#ff6a00] mt-0.5"
                            />
                            <span>
                              I confirm verification of the written authorization letter and photocopy of the teacher&apos;s official ID.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Release Action Button */}
                  <button
                    onClick={handleConfirmClaim}
                    className="w-full py-4 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:translate-y-0.5"
                  >
                    <Check className="w-5 h-5 text-[#ff6a00] hover:text-white" />
                    <span>CONFIRM CLAIM &amp; RELEASE PRIZE</span>
                  </button>

                  {/* Secondary Action: Forfeit Unclaimed & Return to Raffle Pool */}
                  {onForfeitPrize && (
                    <div className="pt-2 border-t border-[#1a1a1a]/15">
                      <button
                        type="button"
                        onClick={() => {
                          setForfeitingWinner(selectedWinner);
                          setForfeitReason('Unclaimed by deadline / Absent on stage');
                        }}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-300 hover:border-red-500 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-red-600" />
                        <span>FORFEIT TICKET &amp; RETURN 1 PRIZE TO RAFFLE FOR REDRAW</span>
                      </button>
                      <p className="text-[10px] text-neutral-500 font-mono mt-1 text-center">
                        This marks this ticket as forfeited and immediately restores 1 unit back to the active raffle inventory for redraw on stage.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500 font-mono space-y-2">
              <Trophy className="w-8 h-8 text-neutral-400 mx-auto" />
              <div className="font-bold uppercase text-sm">No Winner Selected</div>
              <p className="text-xs max-w-sm mx-auto">
                Select a winner record from the roster on the left or search by name / Profiling ID to begin verification.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Revert Confirmation Modal */}
      {revertingWinnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border-2 border-[#1a1a1a] max-w-md w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <h4 className="font-bold text-base uppercase">REVERT CLAIM CONFIRMATION</h4>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed">
              Are you sure you want to revert ticket <strong className="text-black">{revertingWinnerId}</strong> back to <span className="text-amber-700 font-bold">UNCLAIMED</span> status? This action should only be taken if an entry was marked in error.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRevertingWinnerId(null)}
                className="px-4 py-2 border border-[#1a1a1a] text-xs uppercase font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteUnclaim(revertingWinnerId)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs uppercase font-bold"
              >
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forfeiture Confirmation Modal */}
      {forfeitingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border-2 border-[#1a1a1a] max-w-lg w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-2 text-red-700 border-b border-red-200 pb-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-base uppercase">CONFIRM TICKET FORFEITURE &amp; REDRAW</h4>
                <span className="text-[10px] text-neutral-500 uppercase">Malungon Teachers&apos; Day 2026 Audit Protocol</span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 text-xs space-y-2 text-red-950">
              <p className="leading-relaxed">
                You are about to forfeit ticket <strong className="font-bold">{forfeitingWinner.winnerId}</strong> belonging to:
              </p>
              <div className="bg-white p-2.5 border border-red-200 font-bold uppercase text-xs space-y-0.5">
                <div className="text-black text-sm">{forfeitingWinner.name}</div>
                <div className="text-neutral-600 text-[11px]">{forfeitingWinner.school} • {forfeitingWinner.originalDistrict || forfeitingWinner.district}</div>
                <div className="text-red-700 text-[11px]">PRIZE: {forfeitingWinner.prizeName}</div>
              </div>
              <p className="text-[11px] text-red-800 leading-snug">
                ⚠️ <strong>Inventory Action:</strong> 1 unit of <strong>{forfeitingWinner.prizeName}</strong> will immediately be restored to the <strong>Active Raffle Pool</strong> so the Stage Operator can redraw it!
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-neutral-600">
                Official Reason for Forfeiture:
              </label>
              <select
                value={forfeitReason}
                onChange={(e) => setForfeitReason(e.target.value)}
                className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/40 p-2 text-xs font-mono font-bold text-[#1a1a1a] outline-none"
              >
                <option value="Unclaimed by deadline / Absent on stage">Unclaimed by deadline / Absent on stage</option>
                <option value="No-show after 3 stage announcements">No-show after 3 stage announcements</option>
                <option value="Disqualified / Ineligible Personnel">Disqualified / Ineligible Personnel</option>
                <option value="Voluntary prize surrender / Declined">Voluntary prize surrender / Declined</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1a1a1a]/15">
              <button
                type="button"
                onClick={() => setForfeitingWinner(null)}
                className="px-4 py-2.5 border border-[#1a1a1a] text-xs uppercase font-bold hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onForfeitPrize && forfeitingWinner) {
                    onForfeitPrize(forfeitingWinner.winnerId, forfeitReason);
                  }
                  setForfeitingWinner(null);
                }}
                className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs uppercase font-bold flex items-center gap-2 transition-colors shadow"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Forfeit &amp; Return Prize</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Claim Slip / Voucher Modal */}
      {printingWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#f8f7f4] border-4 border-[#1a1a1a] max-w-2xl w-full p-8 shadow-2xl relative text-[#1a1a1a] space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between border-b border-[#1a1a1a]/20 pb-3 print:hidden">
              <div className="font-mono text-xs font-bold text-neutral-600 uppercase flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#ff6a00]" />
                <span>OFFICIAL PRINTABLE CLAIM CERTIFICATE</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#ff6a00] text-white font-mono text-xs font-bold uppercase transition-colors"
                >
                  Print Voucher
                </button>
                <button
                  onClick={() => setPrintingWinner(null)}
                  className="p-1 hover:bg-[#1a1a1a]/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Claim Slip Layout */}
            <div className="border-2 border-[#1a1a1a] p-6 bg-white space-y-6">
              {/* Slip Header */}
              <div className="text-center border-b-2 border-[#1a1a1a] pb-4 space-y-1">
                <div className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
                  Republic of the Philippines • Department of Education
                </div>
                <div className="font-mono text-[10px] tracking-widest text-neutral-600 uppercase">
                  Region XII - SOCCSKSARGEN • Division of Sarangani
                </div>
                <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-[#1a1a1a]">
                  MUNICIPALITY OF MALUNGON
                </h2>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#ff6a00]">
                  TEACHERS&apos; DAY CELEBRATION 2026 GRAND RAFFLE
                </div>
                <div className="font-display text-sm font-bold uppercase tracking-widest bg-[#1a1a1a] text-white py-0.5 mt-2">
                  OFFICIAL PRIZE CLAIM SLIP &amp; ACKNOWLEDGMENT RECEIPT
                </div>
              </div>

              {/* Slip Identifiers */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-[#1a1a1a]/15 pb-4">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Claim Voucher No:</span>
                  <strong className="text-sm font-bold text-[#1a1a1a]">
                    CLAIM-{printingWinner.winnerId}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 uppercase block">Date &amp; Time Released:</span>
                  <strong className="text-[#1a1a1a]">
                    {printingWinner.claimedAt || new Date().toISOString().replace('T', ' ').slice(0, 19)}
                  </strong>
                </div>
              </div>

              {/* Winner Profile Summary */}
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-[#f8f7f4] p-3 border border-[#1a1a1a]/20 space-y-1.5">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase">Winner Details:</div>
                  <div className="font-display text-lg font-bold uppercase text-[#1a1a1a]">
                    {printingWinner.name}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#1a1a1a]/10">
                    <div>Profiling ID: <strong>{printingWinner.participantId}</strong></div>
                    <div>DepEd ID: <strong>{printingWinner.depedId || '—'}</strong></div>
                    <div>Position: <strong>{printingWinner.position}</strong></div>
                    <div>District: <strong>{printingWinner.originalDistrict || printingWinner.district}</strong></div>
                  </div>
                  <div className="text-[11px]">
                    School: <strong>{printingWinner.school}</strong>
                  </div>
                </div>

                {/* Prize Breakdown */}
                <div className="bg-[#f8f7f4] p-3 border border-[#1a1a1a]/20 space-y-1">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase">Disbursed Prize:</div>
                  <div className="flex justify-between items-center">
                    <span className="font-display font-bold text-base uppercase text-[#1a1a1a]">
                      {printingWinner.prizeName}
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {printingWinner.unitValue > 0 ? `₱${printingWinner.unitValue.toLocaleString()}` : 'Physical Item / Gift'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    Drawn on Round {printingWinner.drawNumber} ({printingWinner.date} {printingWinner.time})
                  </div>
                  {printingWinner.claimNotes && (
                    <div className="text-[11px] pt-1 border-t border-[#1a1a1a]/10">
                      Serial / Voucher Code: <strong>{printingWinner.claimNotes}</strong>
                    </div>
                  )}
                  {printingWinner.isProxyClaim && (
                    <div className="text-[11px] pt-1 border-t border-[#1a1a1a]/10 text-[#ff6a00] font-bold">
                      Claimed by Representative: {printingWinner.proxyName} ({printingWinner.proxyRelationship})
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures Row */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center font-mono text-xs">
                <div className="space-y-1">
                  <div className="border-b border-black pb-8"></div>
                  <div className="font-bold text-[11px] uppercase pt-1">
                    {printingWinner.isProxyClaim && printingWinner.proxyName
                      ? `${printingWinner.proxyName} (Representative)`
                      : printingWinner.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    Recipient Signature Over Printed Name
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-black pb-8"></div>
                  <div className="font-bold text-[11px] uppercase pt-1">
                    {printingWinner.claimedBy || officerName}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    Disbursing Officer / Committee Member
                  </div>
                </div>
              </div>

              {/* Security Footer */}
              <div className="text-center font-mono text-[9px] text-neutral-500 uppercase tracking-widest pt-2 border-t border-[#1a1a1a]/10">
                Official Document • DepEd Malungon Municipality Teachers&apos; Day 2026 Grand Raffle
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
