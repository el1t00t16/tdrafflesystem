'use client';

import React, { useState, useEffect } from 'react';
import { Winner } from '../../lib/types';
import { Printer, X, ShieldCheck, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';

interface WinnerVerificationStubProps {
  winner: Winner;
  onClose?: () => void;
  onMarkPrinted?: (winnerId: string) => void;
  isModal?: boolean;
}

export const WinnerVerificationStub: React.FC<WinnerVerificationStubProps> = ({
  winner,
  onClose,
  onMarkPrinted,
  isModal = false
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const qrPayload = winner.participantId || winner.winnerId;
    QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 120,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.warn('QR Code generation failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [winner.participantId, winner.winnerId]);

  // Keyboard shortcut for modal
  useEffect(() => {
    if (!isModal || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose]);

  const handlePrint = () => {
    if (onMarkPrinted) {
      onMarkPrinted(winner.winnerId);
    }
    window.print();
  };

  const stubContent = (
    <div className="w-full max-w-[4.25in] min-h-[5.3in] p-3 sm:p-3.5 bg-white text-black border-2 border-dashed border-black flex flex-col justify-between text-[11px] leading-tight font-sans relative overflow-hidden select-none box-border print:border-black print:border-dashed print:m-0 print:p-3">
      {/* Top Government & Event Header */}
      <div className="text-center border-b border-black pb-1.5 space-y-0.5">
        <div className="text-[8px] font-mono uppercase tracking-widest text-neutral-600 font-bold leading-none">
          Republic of the Philippines • Region XII
        </div>
        <div className="text-[9px] font-mono font-black uppercase text-black leading-none tracking-wider">
          MUNICIPALITY OF MALUNGON • DEPED SUB-OFFICE
        </div>
        <div className="text-xs font-serif font-black uppercase tracking-tight text-black pt-0.5">
          MUNICIPAL TEACHERS&apos; DAY 2026
        </div>
        <div className="inline-block bg-black text-white text-[8px] font-mono font-black uppercase px-2 py-0.5 tracking-widest mt-0.5">
          OFFICIAL PRIZE CLAIM &amp; VERIFICATION STUB
        </div>
      </div>

      {/* Prize Callout Box */}
      <div className="my-1.5 p-2 bg-neutral-100 border border-black text-center">
        <span className="text-[8px] font-mono uppercase tracking-wider text-neutral-600 font-bold block">
          PRIZE AWARDED
        </span>
        <div className="font-serif font-black text-sm sm:text-base uppercase text-black leading-tight">
          {winner.prizeName}
        </div>
        {winner.unitValue > 0 && (
          <div className="font-mono text-[10px] font-bold text-neutral-800 mt-0.5">
            Value: ₱{winner.unitValue.toLocaleString()}
          </div>
        )}
      </div>

      {/* Middle Grid: Winner Information + QR Code */}
      <div className="grid grid-cols-3 gap-2 items-center my-1">
        {/* Left 2 Cols: Winner Details */}
        <div className="col-span-2 space-y-1">
          <div>
            <span className="text-[8px] font-mono uppercase text-neutral-500 font-bold block">
              WINNER NAME
            </span>
            <div className="font-black text-xs sm:text-sm uppercase text-black leading-tight truncate">
              {winner.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[9px]">
            <div>
              <span className="text-[7px] font-mono uppercase text-neutral-500 font-bold block">
                DISTRICT
              </span>
              <span className="font-black font-mono text-black uppercase">{winner.district}</span>
            </div>
            <div>
              <span className="text-[7px] font-mono uppercase text-neutral-500 font-bold block">
                POSITION
              </span>
              <span className="font-bold text-neutral-800 truncate block">{winner.position}</span>
            </div>
          </div>

          <div>
            <span className="text-[7px] font-mono uppercase text-neutral-500 font-bold block">
              SCHOOL / STATION
            </span>
            <div className="font-bold text-[9px] text-neutral-900 truncate">
              {winner.school}
            </div>
          </div>
        </div>

        {/* Right 1 Col: High-Contrast QR Code for Instant Scanner Verification */}
        <div className="col-span-1 flex flex-col items-center justify-center p-1 bg-white border border-neutral-300 text-center">
          {qrCodeDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCodeDataUrl}
              alt={`QR code for ${winner.participantId || winner.winnerId}`}
              className="w-16 h-16 object-contain"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-neutral-100 text-neutral-400">
              <QrIcon className="w-6 h-6 animate-pulse" />
            </div>
          )}
          <span className="font-mono text-[7px] font-bold text-neutral-600 block mt-0.5 truncate max-w-full">
            SCAN TO CLAIM
          </span>
        </div>
      </div>

      {/* Ticket & Batch Metadata Bar */}
      <div className="grid grid-cols-3 gap-1 py-1 px-1.5 bg-neutral-100 border-t border-b border-black font-mono text-[8px]">
        <div>
          <span className="text-neutral-500 block uppercase">Ticket ID:</span>
          <strong className="text-black font-black text-[9px]">{winner.winnerId}</strong>
        </div>
        <div>
          <span className="text-neutral-500 block uppercase">Profiling ID:</span>
          <strong className="text-black font-black text-[9px]">{winner.participantId || 'N/A'}</strong>
        </div>
        <div>
          <span className="text-neutral-500 block uppercase">Batch #:</span>
          <strong className="text-indigo-900 font-black text-[9px]">{winner.drawNumber}</strong>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex justify-between items-center text-[7.5px] font-mono text-neutral-500 pt-1">
        <span>Draw Timestamp: {winner.date} {winner.time}</span>
        <span className="uppercase">{winner.drawType === 'PRE_DRAW' ? 'Advance Pre-Draw' : 'Stage Draw'}</span>
      </div>

      {/* Bottom Dual Signatures */}
      <div className="grid grid-cols-2 gap-3 pt-2 mt-1 border-t border-dashed border-neutral-400 text-center">
        <div>
          <div className="border-b border-black h-5"></div>
          <span className="text-[7.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
            Claimant Signature
          </span>
        </div>
        <div>
          <div className="border-b border-black h-5"></div>
          <span className="text-[7.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
            Disbursing Officer
          </span>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div className="text-center text-[6.5px] text-neutral-500 uppercase tracking-tight pt-1">
        Present stub with DepEd ID at Prize Claim Station • Valid for Teachers&apos; Day 2026
      </div>
    </div>
  );

  if (!isModal) {
    return stubContent;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex justify-center items-center print:p-0 print:bg-white print:static"
    >
      <div className="bg-white text-black w-full max-w-md shadow-2xl border-2 border-black overflow-hidden print:border-0 print:shadow-none print:max-w-none">
        {/* Top Control Bar (Screen only) */}
        <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between border-b-2 border-black print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Verification Stub Preview (1/4 Letter)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Stub</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-white/20 transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stub Display */}
        <div className="p-4 flex justify-center bg-neutral-200 print:bg-white print:p-0">
          {stubContent}
        </div>
      </div>
    </div>
  );
};
