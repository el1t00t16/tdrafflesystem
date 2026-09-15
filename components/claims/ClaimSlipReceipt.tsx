'use client';

import React from 'react';
import { Winner } from '../../lib/types';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface ClaimSlipReceiptProps {
  winner: Winner;
  onClose: () => void;
  stationId?: string;
  officerName?: string;
}

export const ClaimSlipReceipt: React.FC<ClaimSlipReceiptProps> = ({
  winner,
  onClose,
  stationId = 'CLAIM-DESK-1',
  officerName = 'Disbursing Officer'
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = winner.claimedAt
    ? winner.claimedAt
    : `${winner.date} ${winner.time}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-black w-full max-w-lg shadow-2xl border-2 border-black overflow-hidden print:border-0 print:shadow-none print:max-w-none">
        {/* Screen Top Action Bar (Hidden when printed) */}
        <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#ff6a00]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Official Prize Claim Voucher
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div className="p-6 sm:p-8 space-y-5 font-sans print:p-4 text-xs text-neutral-900 leading-normal">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 space-y-1">
            <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 font-bold">
              Republic of the Philippines • Province of Sarangani
            </div>
            <div className="font-mono text-[11px] tracking-wider uppercase font-black text-black">
              MUNICIPALITY OF MALUNGON • DEPED MALUNGON SUB-OFFICE
            </div>
            <h2 className="font-serif font-black text-lg sm:text-xl uppercase tracking-tight text-black pt-1">
              MUNICIPAL TEACHERS&apos; DAY 2026
            </h2>
            <div className="inline-block px-3 py-0.5 bg-black text-white font-mono text-[10px] uppercase font-bold tracking-widest mt-1">
              OFFICIAL PRIZE CLAIM &amp; DISBURSEMENT VOUCHER
            </div>
          </div>

          {/* Ticket Metadata Bar */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-neutral-100 p-2.5 border border-neutral-300">
            <div>
              <span className="text-neutral-500 uppercase text-[9px] block">Winner Ticket ID:</span>
              <strong className="text-[#FF1E1E] text-xs font-black">{winner.winnerId}</strong>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 uppercase text-[9px] block">Draw Round:</span>
              <strong className="text-black">{winner.drawNumber}</strong>
            </div>
            <div>
              <span className="text-neutral-500 uppercase text-[9px] block">Profiling ID:</span>
              <strong className="text-black">{winner.participantId}</strong>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 uppercase text-[9px] block">DepEd Employee ID:</span>
              <strong className="text-black">{winner.depedId || 'N/A'}</strong>
            </div>
          </div>

          {/* Prize Box */}
          <div className="border-2 border-black p-3.5 bg-neutral-50 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 block">
              AWARDED RAFFLE PRIZE
            </span>
            <div className="font-serif font-black text-lg sm:text-xl text-black uppercase tracking-tight">
              {winner.prizeName}
            </div>
            {winner.unitValue > 0 && (
              <div className="font-mono text-xs font-bold text-neutral-700">
                Official Valuation: ₱{winner.unitValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Winner Details Table */}
          <div className="border border-neutral-300 divide-y divide-neutral-200 text-[11px]">
            <div className="flex py-1.5 px-3">
              <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">Recipient Name:</span>
              <span className="font-black uppercase text-black flex-1">{winner.name}</span>
            </div>
            <div className="flex py-1.5 px-3">
              <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">District:</span>
              <span className="font-bold text-black flex-1 uppercase">{winner.district}</span>
            </div>
            <div className="flex py-1.5 px-3">
              <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">School / Station:</span>
              <span className="text-black flex-1 font-medium">{winner.school}</span>
            </div>
            <div className="flex py-1.5 px-3">
              <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">Position / Role:</span>
              <span className="text-black flex-1">{winner.position} ({winner.personnelType})</span>
            </div>
            {winner.contactNumber && (
              <div className="flex py-1.5 px-3">
                <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">Contact No:</span>
                <span className="font-mono text-black flex-1">{winner.contactNumber}</span>
              </div>
            )}
            <div className="flex py-1.5 px-3">
              <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">ID Presented:</span>
              <span className="font-mono text-black flex-1 font-bold">
                {winner.idPresented || 'DepEd Employee ID'}
              </span>
            </div>
            {winner.isProxyClaim && (
              <div className="flex py-1.5 px-3 bg-amber-50">
                <span className="w-32 font-bold text-amber-900 uppercase text-[10px]">Claimed by Proxy:</span>
                <span className="font-mono text-amber-950 flex-1 font-bold">
                  {winner.proxyName} ({winner.proxyRelationship || 'Representative'})
                </span>
              </div>
            )}
            {winner.claimNotes && (
              <div className="flex py-1.5 px-3">
                <span className="w-32 font-bold text-neutral-600 uppercase text-[10px]">Remarks:</span>
                <span className="text-black flex-1 italic">{winner.claimNotes}</span>
              </div>
            )}
          </div>

          {/* Audit Verification Note */}
          <div className="text-[10px] text-neutral-500 italic leading-snug border-l-2 border-black pl-2.5">
            I hereby certify that the above prize has been physically released and received in good condition in
            accordance with the Municipal Teachers&apos; Day 2026 Grand Raffle Guidelines.
          </div>

          {/* Signatures Block */}
          <div className="pt-6 grid grid-cols-2 gap-8 font-mono text-[11px]">
            <div className="text-center space-y-1">
              <div className="border-b border-black pb-1 min-h-[36px] flex items-end justify-center font-bold uppercase text-black">
                {winner.isProxyClaim ? winner.proxyName : winner.name}
              </div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-600 block">
                {winner.isProxyClaim ? 'Authorized Representative Signature' : 'Recipient / Teacher Signature'}
              </span>
            </div>

            <div className="text-center space-y-1">
              <div className="border-b border-black pb-1 min-h-[36px] flex items-end justify-center font-bold uppercase text-black">
                {winner.claimedBy || officerName}
              </div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-600 block">
                Disbursing Officer ({stationId})
              </span>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-dashed border-neutral-300 flex justify-between items-center font-mono text-[9px] text-neutral-500">
            <span>Disbursed: {formattedDate}</span>
            <span>Station: {stationId}</span>
            <span>COA Ref: {winner.winnerId}-{winner.drawNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
