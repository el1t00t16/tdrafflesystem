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
  isBatchChild?: boolean;
}

export const WinnerVerificationStub: React.FC<WinnerVerificationStubProps> = ({
  winner,
  onClose,
  onMarkPrinted,
  isModal = false,
  isBatchChild = false
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
    <>
      {!isBatchChild && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 0.15in;
              }
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .winner-stub-printable {
                width: 4.0in !important;
                height: 5.25in !important;
                max-width: 4.0in !important;
                max-height: 5.25in !important;
                margin-left: 0 !important;
                margin-right: auto !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                float: none !important;
                clear: both !important;
                display: block !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                border: 2px solid black !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `
        }} />
      )}
      <div className={`w-full max-w-[3.95in] min-h-[5.15in] max-h-[5.18in] p-2.5 sm:p-3 bg-white text-black border-2 border-black flex flex-col justify-between text-[10.5px] leading-tight font-sans relative overflow-hidden select-none box-border ${!isBatchChild ? 'winner-stub-printable' : ''} print:border-black print:border-solid print:m-0 print:p-2.5`}>
        {/* Top Government & Event Header */}
        <div className="text-center border-b border-black pb-1 space-y-0.5">
          <div className="text-[7.5px] font-mono uppercase tracking-widest text-neutral-600 font-bold leading-none">
            Republic of the Philippines • Region XII
          </div>
          <div className="text-[8.5px] font-mono font-black uppercase text-black leading-none tracking-wider">
            MUNICIPALITY OF MALUNGON • DEPED SUB-OFFICE
          </div>
          <div className="text-xs font-serif font-black uppercase tracking-tight text-black pt-0.5">
            MUNICIPAL TEACHERS&apos; DAY 2026
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="inline-block bg-black text-white text-[7px] font-mono font-black uppercase px-2 py-0.5 tracking-widest">
              OFFICIAL PRIZE CLAIM &amp; VERIFICATION STUB
            </span>
            <span className="font-mono font-black text-[8.5px] text-red-700 print:text-black tracking-wider border border-black px-1.5 py-0.5 bg-neutral-100 whitespace-nowrap">
              {winner.district} • {winner.drawNumber}
            </span>
          </div>
        </div>

        {/* Prize Callout Box */}
        <div className="my-1 p-1.5 bg-neutral-100 border border-black text-center">
          <span className="text-[7.5px] font-mono uppercase tracking-wider text-neutral-600 font-bold block">
            PRIZE AWARDED
          </span>
          <div className="font-serif font-black text-xs sm:text-sm uppercase text-black leading-tight">
            {winner.prizeName}
          </div>
          {winner.unitValue > 0 && (
            <div className="font-mono text-[9px] font-bold text-neutral-800 mt-0.5">
              Value: ₱{winner.unitValue.toLocaleString()}
            </div>
          )}
        </div>

        {/* Middle Grid: Winner Information + QR Code */}
        <div className="grid grid-cols-3 gap-1.5 items-center my-0.5">
          {/* Left 2 Cols: Winner Details */}
          <div className="col-span-2 space-y-1">
            <div>
              <span className="text-[7.5px] font-mono uppercase text-neutral-500 font-bold block">
                WINNER NAME
              </span>
              <div className="font-black text-xs sm:text-sm uppercase text-black leading-tight truncate">
                {winner.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[8.5px]">
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
              <div className="font-bold text-[8.5px] text-neutral-900 truncate">
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
                className="w-14 h-14 object-contain"
              />
            ) : (
              <div className="w-14 h-14 flex items-center justify-center bg-neutral-100 text-neutral-400">
                <QrIcon className="w-5 h-5 animate-pulse" />
              </div>
            )}
            <span className="font-mono text-[6.5px] font-bold text-neutral-600 block mt-0.5 truncate max-w-full">
              SCAN TO CLAIM
            </span>
          </div>
        </div>

        {/* Ticket & Batch Metadata Bar with High-Visibility Serial & District Sorting */}
        <div className="grid grid-cols-12 gap-1.5 py-1 px-1.5 bg-neutral-100 border-2 border-black font-mono items-center my-0.5">
          {/* Left: Identification Codes (5 cols) */}
          <div className="col-span-5 flex flex-col justify-center space-y-1 border-r border-black/30 pr-1">
            <div>
              <span className="text-[6.5px] text-neutral-500 block uppercase font-bold leading-none">TICKET ID:</span>
              <strong className="text-black font-black text-[9px] leading-tight block">{winner.winnerId}</strong>
            </div>
            <div>
              <span className="text-[6.5px] text-neutral-500 block uppercase font-bold leading-none">PROFILING ID:</span>
              <strong className="text-black font-black text-[8px] leading-tight block truncate">{winner.participantId || 'N/A'}</strong>
            </div>
          </div>

          {/* Right: Prominent Serial Type BATCH # & DISTRICT Sorting Tag (7 cols) */}
          <div className="col-span-7 flex flex-col justify-center pl-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[7px] text-neutral-600 uppercase font-black tracking-wider">
                DISTRICT:
              </span>
              <span className="px-1.5 py-0.5 bg-black text-white font-mono font-black text-[9px] uppercase tracking-widest leading-none">
                {winner.district}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 pt-0.5 border-t border-black/20">
              <span className="text-[7px] text-neutral-600 uppercase font-black tracking-wider">
                BATCH #:
              </span>
              <span className="font-mono font-black text-xs sm:text-[13px] tracking-wider text-red-700 print:text-black leading-none bg-white px-2 py-0.5 border border-black/40 shadow-xs">
                № {winner.drawNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex justify-between items-center text-[7px] font-mono text-neutral-500 pt-0.5">
          <span>Draw Timestamp: {winner.date} {winner.time}</span>
          <span className="uppercase">{winner.drawType === 'PRE_DRAW' ? 'Advance Pre-Draw' : 'Stage Draw'}</span>
        </div>

        {/* Bottom Dual Signatures */}
        <div className="grid grid-cols-2 gap-3 pt-1.5 mt-0.5 border-t border-dashed border-neutral-400 text-center">
          <div>
            <div className="border-b border-black h-4"></div>
            <span className="text-[7px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
              Claimant Signature
            </span>
          </div>
          <div>
            <div className="border-b border-black h-4"></div>
            <span className="text-[7px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
              Disbursing Officer
            </span>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center text-[6.5px] text-neutral-500 uppercase tracking-tight pt-0.5">
          Present stub with DepEd ID at Prize Claim Station • Valid for Teachers&apos; Day 2026
        </div>
      </div>
    </>
  );

  if (!isModal) {
    return stubContent;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex justify-center items-center print:p-0 print:m-0 print:bg-white print:static print:block"
    >
      <div className="bg-white text-black w-full max-w-md shadow-2xl border-2 border-black overflow-hidden print:border-0 print:shadow-none print:max-w-none print:w-auto print:block print:m-0 print:p-0">
        {/* Top Control Bar (Screen only) */}
        <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between border-b-2 border-black print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              Verification Stub Preview (Pre-Cut 1/4 Letter)
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
        <div className="p-4 flex justify-center bg-neutral-200 print:bg-white print:p-0 print:m-0 print:block">
          {stubContent}
        </div>
      </div>
    </div>
  );
};
