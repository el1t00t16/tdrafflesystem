'use client';

import React, { useState, useEffect } from 'react';
import { Winner } from '../../lib/types';
import { Printer, X, ShieldCheck, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';

export type StubLayoutFormat = 'HALF_LANDSCAPE' | 'QUARTER_PORTRAIT';

interface WinnerVerificationStubProps {
  winner: Winner;
  onClose?: () => void;
  onMarkPrinted?: (winnerId: string) => void;
  isModal?: boolean;
  isBatchChild?: boolean;
  layoutFormat?: StubLayoutFormat;
}

export const WinnerVerificationStub: React.FC<WinnerVerificationStubProps> = ({
  winner,
  onClose,
  onMarkPrinted,
  isModal = false,
  isBatchChild = false,
  layoutFormat = 'HALF_LANDSCAPE'
}) => {
  const [activeFormat, setActiveFormat] = useState<StubLayoutFormat>(layoutFormat);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    setActiveFormat(layoutFormat);
  }, [layoutFormat]);

  useEffect(() => {
    let isMounted = true;
    const qrPayload = winner.participantId || winner.winnerId;
    QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: activeFormat === 'HALF_LANDSCAPE' ? 140 : 120,
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
  }, [winner.participantId, winner.winnerId, activeFormat]);

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

  // 1. Half Sheet Landscape Voucher Content (New Default: Fast & Easy)
  const landscapeContent = (
    <>
      {!isBatchChild && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 0.25in;
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
              .winner-stub-landscape-printable {
                width: 8.0in !important;
                height: 5.1in !important;
                max-width: 8.0in !important;
                max-height: 5.1in !important;
                margin: 0 auto !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
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
      <div className={`w-full max-w-[8.0in] min-h-[4.9in] max-h-[5.15in] p-3 sm:p-3.5 bg-white text-black border-2 border-black flex flex-col justify-between text-[11px] leading-tight font-sans relative overflow-hidden select-none box-border ${!isBatchChild ? 'winner-stub-landscape-printable' : ''} print:border-black print:border-solid print:m-0 print:p-2.5`}>
        {/* Top Government & Event Header */}
        <div className="border-b-2 border-black pb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img
              src="/LGU_LOGO1.png"
              alt="LGU Malungon Seal"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain flex-shrink-0"
            />
            <div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-700">
                Republic of the Philippines • Department of Education • Region XII
              </div>
              <div className="text-[12px] sm:text-[13px] font-serif font-black uppercase tracking-tight text-black leading-none pt-0.5">
                MUNICIPALITY OF MALUNGON • MUNICIPAL TEACHERS&apos; DAY 2026
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="inline-block bg-black text-white text-[8px] font-mono font-black uppercase px-2.5 py-1 tracking-widest">
              OFFICIAL PRIZE CLAIM VOUCHER
            </span>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="grid grid-cols-12 gap-3 my-1.5 items-stretch flex-1">
          {/* Left 7 Columns: Prize & Winner Details */}
          <div className="col-span-7 flex flex-col justify-between space-y-1.5 pr-2 border-r border-black/30">
            {/* Prize Callout Box */}
            <div className="p-2 bg-neutral-100 border-2 border-black">
              <span className="text-[8px] font-mono uppercase tracking-wider text-neutral-600 font-bold block">
                PRIZE AWARDED
              </span>
              <div className="font-serif font-black text-sm sm:text-base uppercase text-black leading-tight break-words">
                {winner.prizeName}
              </div>
              {winner.unitValue ? (
                <div className="text-[9px] font-mono font-bold text-neutral-700 mt-0.5">
                  Est. Value: ₱{winner.unitValue.toLocaleString()}
                </div>
              ) : null}
            </div>

            {/* Winner Information */}
            <div className="space-y-1 bg-white p-1">
              <span className="text-[8px] font-mono uppercase text-neutral-500 font-bold block">
                OFFICIAL WINNER
              </span>
              <div className="font-black text-sm sm:text-base uppercase text-black leading-tight break-words">
                {winner.name}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9.5px]">
                <div>
                  <span className="text-[7.5px] font-mono uppercase text-neutral-500 font-bold block">
                    DISTRICT
                  </span>
                  <span className="font-black font-mono text-black uppercase bg-neutral-100 px-1.5 py-0.5 border border-black/20 inline-block mt-0.5">
                    {winner.district}
                  </span>
                </div>
                <div>
                  <span className="text-[7.5px] font-mono uppercase text-neutral-500 font-bold block">
                    POSITION
                  </span>
                  <span className="font-bold text-neutral-900 break-words block mt-0.5">{winner.position}</span>
                </div>
              </div>

              <div className="pt-0.5">
                <span className="text-[7.5px] font-mono uppercase text-neutral-500 font-bold block">
                  SCHOOL / STATION
                </span>
                <div className="font-bold text-[9.5px] text-neutral-900 leading-tight break-words">
                  {winner.school}
                </div>
              </div>
            </div>

            {/* Draw Meta Tag */}
            <div className="flex justify-between items-center text-[7.5px] font-mono text-neutral-600 pt-1 border-t border-black/20">
              <span>Draw: {winner.date} {winner.time}</span>
              <span className="uppercase font-bold">{winner.drawType === 'PRE_DRAW' ? 'Advance Pre-Draw' : 'Stage Draw'}</span>
            </div>
          </div>

          {/* Right 5 Columns: QR Code, Identification & Signatures */}
          <div className="col-span-5 flex flex-col justify-between space-y-1.5 pl-1">
            {/* QR Code and Ticket Identification */}
            <div className="flex items-center gap-2 p-1.5 bg-neutral-50 border border-black">
              <div className="flex flex-col items-center justify-center p-1 bg-white border border-neutral-300 shrink-0">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR code for ${winner.participantId || winner.winnerId}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-neutral-100 text-neutral-400">
                    <QrIcon className="w-6 h-6 animate-pulse" />
                  </div>
                )}
                <span className="font-mono text-[6.5px] font-bold text-neutral-600 block mt-0.5">
                  SCAN TO CLAIM
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-1 font-mono">
                <div>
                  <span className="text-[7px] text-neutral-500 uppercase font-bold block">TICKET ID:</span>
                  <strong className="text-black font-black text-xs sm:text-sm block leading-none">{winner.winnerId}</strong>
                </div>
                <div>
                  <span className="text-[7px] text-neutral-500 uppercase font-bold block">BATCH #:</span>
                  <span className="font-black text-[10px] text-red-700 print:text-black block leading-none">
                    № {winner.drawNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[7px] text-neutral-500 uppercase font-bold block">DEPED / PROF ID:</span>
                  <span className="font-bold text-[8.5px] text-black block truncate leading-none">
                    {winner.depedId || winner.participantId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Signatures */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-neutral-400 text-center">
              <div>
                <div className="border-b border-black h-4 sm:h-5"></div>
                <span className="text-[7.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
                  Claimant Signature
                </span>
              </div>
              <div>
                <div className="border-b border-black h-4 sm:h-5"></div>
                <span className="text-[7.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
                  Disbursing Officer
                </span>
              </div>
            </div>

            {/* Security Footer Notice */}
            <div className="text-center text-[7px] text-neutral-600 uppercase tracking-tight pt-0.5 border-t border-black/15">
              Present stub with DepEd ID at Prize Claim Station
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 2. 1/4 Letter Portrait Format (Compact Legacy)
  const portraitContent = (
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
        <div className="border-b border-black pb-1.5 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <img
              src="/LGU_LOGO1.png"
              alt="LGU Malungon Seal"
              className="w-8 h-8 object-contain flex-shrink-0"
            />
            <div className="text-center flex-1">
              <div className="text-[9px] font-mono font-black uppercase text-black leading-none tracking-wider">
                MUNICIPALITY OF MALUNGON
              </div>
              <div className="text-[11px] font-serif font-black uppercase tracking-tight text-black pt-0.5">
                MUNICIPAL TEACHERS&apos; DAY CELEBRATION
              </div>
            </div>
            <div className="w-8 flex-shrink-0" />
          </div>
          <div className="text-center mt-1">
            <span className="inline-block bg-black text-white text-[7.5px] font-mono font-black uppercase px-2.5 py-0.5 tracking-widest">
              OFFICIAL PRIZE CLAIM &amp; DISBURSEMENT VOUCHER
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
        </div>

        {/* Middle Grid: Winner Information + QR Code */}
        <div className="grid grid-cols-3 gap-1.5 items-center my-0.5">
          <div className="col-span-2 space-y-1">
            <div>
              <span className="text-[7.5px] font-mono uppercase text-neutral-500 font-bold block">
                WINNER NAME
              </span>
              <div className="font-black text-xs sm:text-sm uppercase text-black leading-tight break-words">
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
                <span className="font-bold text-neutral-800 break-words block">{winner.position}</span>
              </div>
            </div>

            <div>
              <span className="text-[7px] font-mono uppercase text-neutral-500 font-bold block">
                SCHOOL / STATION
              </span>
              <div className="font-bold text-[8.5px] text-neutral-900 leading-tight break-words">
                {winner.school}
              </div>
            </div>
          </div>

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

        {/* Ticket & Batch Metadata Bar */}
        <div className="grid grid-cols-12 gap-1.5 py-1 px-1.5 bg-neutral-100 border-2 border-black font-mono items-center my-0.5">
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
            <span className="text-[7.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
              Claimant Signature
            </span>
          </div>
          <div>
            <div className="border-b border-black h-4"></div>
            <span className="text-[7.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5">
              Disbursing Officer
            </span>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center text-[6.5px] text-neutral-500 uppercase tracking-tight pt-0.5">
          Present stub with DepEd ID at Prize Claim Station • Valid for Teachers&apos; Day Celebration
        </div>
      </div>
    </>
  );

  const stubContent = activeFormat === 'HALF_LANDSCAPE' ? landscapeContent : portraitContent;

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
      <div className={`bg-white text-black w-full ${activeFormat === 'HALF_LANDSCAPE' ? 'max-w-4xl' : 'max-w-md'} shadow-2xl border-2 border-black overflow-hidden print:border-0 print:shadow-none print:max-w-none print:w-auto print:block print:m-0 print:p-0 transition-all`}>
        {/* Top Control Bar (Screen only) */}
        <div className="bg-[#1a1a1a] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-black print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              {activeFormat === 'HALF_LANDSCAPE' ? 'Half Sheet (Landscape) Voucher' : '1/4 Letter (Portrait) Stub'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle Pill */}
            <div className="flex items-center bg-black/50 p-0.5 border border-white/20 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setActiveFormat('HALF_LANDSCAPE')}
                className={`px-2 py-1 uppercase font-bold transition-all ${
                  activeFormat === 'HALF_LANDSCAPE' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Half Landscape
              </button>
              <button
                type="button"
                onClick={() => setActiveFormat('QUARTER_PORTRAIT')}
                className={`px-2 py-1 uppercase font-bold transition-all ${
                  activeFormat === 'QUARTER_PORTRAIT' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                1/4 Portrait
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
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
        <div className="p-4 flex justify-center bg-neutral-200 print:bg-white print:p-0 print:m-0 print:block overflow-x-auto">
          {stubContent}
        </div>
      </div>
    </div>
  );
};
