'use client';

import React, { useState, useEffect } from 'react';
import { Winner } from '../../lib/types';
import { Printer, X, ShieldCheck, QrCode as QrIcon, AlignLeft, AlignRight, AlignCenter, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

export type StubLayoutFormat = 'HALF_LANDSCAPE' | 'QUARTER_PORTRAIT';
export type PrintPosition = 'UPPER_LEFT' | 'UPPER_RIGHT' | 'CENTER' | 'EXACT_11X7';

interface WinnerVerificationStubProps {
  winner: Winner;
  onClose?: () => void;
  onMarkPrinted?: (winnerId: string) => void;
  isModal?: boolean;
  isBatchChild?: boolean;
  layoutFormat?: StubLayoutFormat;
  positionProp?: PrintPosition;
  isGrid?: boolean;
}

export const WinnerVerificationStub: React.FC<WinnerVerificationStubProps> = ({
  winner,
  onClose,
  onMarkPrinted,
  isModal = false,
  isBatchChild = false,
  layoutFormat = 'HALF_LANDSCAPE',
  positionProp,
  isGrid = false
}) => {
  const [activeFormat, setActiveFormat] = useState<StubLayoutFormat>(layoutFormat);
  const [printPosition, setPrintPosition] = useState<PrintPosition>(positionProp || 'UPPER_LEFT');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const [prevLayoutFormat, setPrevLayoutFormat] = useState(layoutFormat);
  if (layoutFormat !== prevLayoutFormat) {
    setPrevLayoutFormat(layoutFormat);
    setActiveFormat(layoutFormat);
  }

  const [prevPositionProp, setPrevPositionProp] = useState(positionProp);
  if (positionProp !== prevPositionProp) {
    setPrevPositionProp(positionProp);
    if (positionProp) {
      setPrintPosition(positionProp);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const qrPayload = winner.participantId || winner.winnerId;
    QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 140,
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

  // 1. Half Landscape Stub (Exact 10cm in width by 6cm in height inside 11cm x 7cm pre-cut paper / 1/8 Letter)
  const landscapeContent = (
    <>
      {!isBatchChild && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${printPosition === 'EXACT_11X7' ? '11cm 7cm landscape' : 'letter portrait'};
                margin: 0;
              }
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                height: 100% !important;
                width: 100% !important;
                position: relative !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .winner-stub-landscape-printable {
                width: 10cm !important;
                height: 6cm !important;
                max-width: 10cm !important;
                max-height: 6cm !important;
                min-width: 10cm !important;
                min-height: 6cm !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                border: 2px solid black !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                position: absolute !important;
                ${
                  printPosition === 'UPPER_LEFT'
                    ? 'top: 0.5cm !important; left: 0.5cm !important; right: auto !important; margin: 0 !important; float: none !important;'
                    : printPosition === 'UPPER_RIGHT'
                    ? 'top: 0.5cm !important; right: 0.5cm !important; left: auto !important; margin: 0 !important; float: none !important;'
                    : printPosition === 'CENTER'
                    ? 'top: 0.5cm !important; left: 50% !important; transform: translateX(-50%) !important; margin: 0 !important; float: none !important;'
                    : 'top: 0.5cm !important; left: 0.5cm !important; margin: 0 !important; float: none !important;'
                }
              }
            }
          `
        }} />
      )}
      <div
        className={`bg-white text-black border-2 border-black flex flex-col justify-between text-[10px] leading-tight font-sans relative overflow-hidden select-none box-border ${
          isBatchChild && isGrid
            ? 'w-[10cm] h-[6cm] p-1.5'
            : 'w-[10cm] max-w-[10cm] h-[6cm] max-h-[6cm] min-h-[6cm] p-1.5 winner-stub-landscape-printable'
        } print:border-black print:border-solid print:m-0`}
        style={{ width: '10cm', height: '6cm' }}
      >
        {/* Top Government & Event Header */}
        <div className="border-b-2 border-black pb-1 mb-1 flex items-center justify-between gap-1.5 shrink-0 bg-white">
          <div className="flex items-center gap-1.5">
            <img
              src="/LGU_LOGO1.png"
              alt="LGU Malungon Seal"
              className="w-7 h-7 object-contain flex-shrink-0"
            />
            <div className="leading-tight">
              <div className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 leading-none">
                Republic of the Philippines • DepEd Region XII
              </div>
              <div className="text-[10px] font-serif font-black uppercase tracking-tight text-black leading-none pt-0.5">
                MUNICIPALITY OF MALUNGON
              </div>
              <div className="text-[7px] font-mono font-black uppercase tracking-wide text-neutral-800 leading-none pt-0.5">
                TEACHERS&apos; DAY CELEBRATION 2026
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end shrink-0 pr-1">
            <span className="inline-block bg-black text-white text-[6.5px] font-mono font-black uppercase px-1.5 py-0.5 tracking-wider">
              CLAIM STUB
            </span>
            <span className="text-[7px] font-mono font-black text-red-700 print:text-black mt-0.5 tracking-tight">
              № {winner.drawNumber} • {winner.drawType === 'PRE_DRAW' ? 'PRE-DRAW' : 'STAGE'}
            </span>
          </div>
        </div>

        {/* Main Balanced 2-Column Body */}
        <div className="grid grid-cols-12 gap-1.5 my-0.5 items-stretch flex-1 min-h-0">
          {/* Left 7 Columns: Prize & Winner Details */}
          <div className="col-span-7 flex flex-col justify-between space-y-1 pr-1 border-r-2 border-black/30 min-h-0">
            {/* 1. Prize Card */}
            <div className="p-1 bg-neutral-100 border border-black flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[6px] font-mono uppercase tracking-widest text-neutral-700 font-black">
                  ★ PRIZE AWARDED ★
                </span>
                <span className="text-[6.5px] font-mono font-black text-black bg-white px-1 border border-black/40 leading-none">
                  {winner.unitValue ? `₱${winner.unitValue.toLocaleString()}` : 'OFFICIAL PRIZE'}
                </span>
              </div>
              <div className="font-serif font-black text-[12px] uppercase text-black leading-tight tracking-tight mt-0.5 line-clamp-1 truncate">
                {winner.prizeName}
              </div>
              <div className="flex items-center justify-between text-[6px] font-mono text-neutral-600 pt-0.5 border-t border-black/20 mt-0.5">
                <span>Draw: {winner.date} {winner.time}</span>
                <span className="font-bold uppercase">{winner.drawType === 'PRE_DRAW' ? 'Advance Draw' : 'Live Draw'}</span>
              </div>
            </div>

            {/* 2. Official Winner Card */}
            <div className="p-1.5 bg-white border border-black flex flex-col justify-between flex-1 min-h-0">
              <div>
                <span className="text-[6px] font-mono uppercase tracking-wider text-neutral-500 font-bold block leading-none">
                  OFFICIAL WINNER / CLAIMANT
                </span>
                {/* Bigger & bolder winner name */}
                <div className="font-black text-[13.5px] sm:text-[14.5px] uppercase text-black leading-tight tracking-tight break-words line-clamp-2 mt-0.5">
                  {winner.name}
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-0.5 text-[7.5px]">
                <span className="font-black font-mono text-[7px] text-white uppercase bg-black px-1.5 py-0.5 shrink-0 tracking-wide leading-none">
                  {winner.district}
                </span>
                <span className="font-bold text-neutral-900 truncate">
                  {winner.position}
                </span>
              </div>

              <div className="pt-0.5 border-t border-black/15 mt-0.5 flex items-center justify-between text-[7px]">
                <div className="font-bold text-neutral-800 truncate max-w-[125px]">
                  {winner.school}
                </div>
                <div className="font-mono text-[6.5px] text-neutral-600 shrink-0">
                  ID: {winner.depedId || winner.participantId || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: QR Code, Ticket ID & Dual Signatures */}
          <div className="col-span-5 flex flex-col justify-between space-y-1 pl-0.5 min-h-0">
            {/* 3. QR Verification Box */}
            <div className="p-1 bg-neutral-50 border border-black flex flex-col items-center justify-between text-center shrink-0">
              <span className="text-[5.5px] font-mono uppercase font-black tracking-widest text-neutral-600 block leading-none mb-0.5">
                QR VERIFICATION
              </span>
              <div className="p-0.5 bg-white border border-black shrink-0">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR code for ${winner.participantId || winner.winnerId}`}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-neutral-100 text-neutral-400">
                    <QrIcon className="w-5 h-5 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="mt-0.5 font-mono leading-tight">
                <span className="text-[5px] text-neutral-500 uppercase font-bold block leading-none">TICKET NO.</span>
                <strong className="text-black font-black text-[9px] tracking-wider block leading-none mt-0.5">{winner.winnerId}</strong>
              </div>
            </div>

            {/* 4. Dual Signatures Box */}
            <div className="p-1 bg-white border border-black flex flex-col justify-between flex-1 min-h-0 text-center">
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <div>
                  <div className="border-b border-black h-3"></div>
                  <span className="text-[5.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5 leading-none">
                    Claimant
                  </span>
                </div>
                <div>
                  <div className="border-b border-black h-3"></div>
                  <span className="text-[5.5px] font-mono uppercase font-bold text-neutral-800 block mt-0.5 leading-none">
                    Officer
                  </span>
                </div>
              </div>
              <div className="text-[5px] font-mono text-neutral-500 uppercase tracking-tight border-t border-black/15 pt-0.5 leading-none mt-0.5">
                Present with DepEd ID
              </div>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="pt-0.5 mt-0.5 border-t border-black/25 flex items-center justify-between text-[5.5px] font-mono uppercase text-neutral-600 shrink-0 pr-1">
          <span>Sunken Arena Station</span>
          <span className="font-bold">Official Claim Voucher</span>
          <span>Non-Transferable</span>
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
      <div className={`bg-white text-black w-full ${activeFormat === 'HALF_LANDSCAPE' ? 'max-w-2xl' : 'max-w-md'} shadow-2xl border-2 border-black overflow-hidden print:border-0 print:shadow-none print:max-w-none print:w-auto print:block print:m-0 print:p-0 transition-all`}>
        {/* Top Control Bar (Screen only) */}
        <div className="bg-[#1a1a1a] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-black print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider block">
                {activeFormat === 'HALF_LANDSCAPE' ? 'Pre-Cut Stub (10cm × 6cm inside 11cm × 7cm)' : '1/4 Letter (Portrait) Stub'}
              </span>
              <span className="font-mono text-[10px] text-neutral-400 block">
                {activeFormat === 'HALF_LANDSCAPE'
                  ? 'Feed Position: ' +
                    (printPosition === 'UPPER_LEFT'
                      ? 'Upper-Left (Left Guide)'
                      : printPosition === 'UPPER_RIGHT'
                      ? 'Upper-Right (Right Guide)'
                      : printPosition === 'CENTER'
                      ? 'Center Sliders'
                      : 'Exact 11cm × 7cm Paper')
                  : 'Legacy 1/4 Sheet Format'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Position Selector (Upper-Left / Upper-Right / Center / Exact 11x7) */}
            {activeFormat === 'HALF_LANDSCAPE' && (
              <div className="flex items-center bg-black/60 p-0.5 border border-white/20 text-[10px] font-mono">
                <span className="text-neutral-400 px-1.5 uppercase font-bold text-[9px] hidden sm:inline">Position:</span>
                <button
                  type="button"
                  onClick={() => setPrintPosition('UPPER_LEFT')}
                  className={`px-2 py-1 uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    printPosition === 'UPPER_LEFT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Left side edge of Letter size (0.5cm from top-left) - matches Epson right-side tray guide feed"
                >
                  <AlignLeft className="w-3 h-3" />
                  <span>Left Side Edge (Epson)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPosition('UPPER_RIGHT')}
                  className={`px-2 py-1 uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    printPosition === 'UPPER_RIGHT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Upper-Right corner (feed 11cm x 7cm slip on right guide of Letter tray)"
                >
                  <AlignRight className="w-3 h-3" />
                  <span>Right Guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPosition('CENTER')}
                  className={`px-2 py-1 uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    printPosition === 'CENTER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Center sliders of printer tray"
                >
                  <AlignCenter className="w-3 h-3" />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPosition('EXACT_11X7')}
                  className={`px-2 py-1 uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    printPosition === 'EXACT_11X7' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Exact 11cm x 7cm Custom Paper Size selected in printer settings"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Exact 11×7cm</span>
                </button>
              </div>
            )}

            {/* Format Toggle Pill */}
            <div className="flex items-center bg-black/50 p-0.5 border border-white/20 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setActiveFormat('HALF_LANDSCAPE')}
                className={`px-2 py-1 uppercase font-bold transition-all cursor-pointer ${
                  activeFormat === 'HALF_LANDSCAPE' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="10cm width by 6cm height inside 11cm x 7cm pre-cut slip (0.5cm safe margins)"
              >
                10cm × 6cm
              </button>
              <button
                type="button"
                onClick={() => setActiveFormat('QUARTER_PORTRAIT')}
                className={`px-2 py-1 uppercase font-bold transition-all cursor-pointer ${
                  activeFormat === 'QUARTER_PORTRAIT' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="1/4 Letter Portrait"
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

        {/* Stub Display with realistic placement preview */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-neutral-200 print:bg-white print:p-0 print:m-0 print:block overflow-x-auto">
          {activeFormat === 'HALF_LANDSCAPE' ? (
            /* Virtual Pre-cut Paper (11cm x 7cm) Simulation */
            <div className="flex flex-col items-center print:block print:w-full print:m-0 print:p-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-600 print:hidden">
                <span className="font-bold text-neutral-800 bg-white px-2 py-0.5 border border-neutral-300">
                  Pre-Cut Paper: 11cm × 7cm
                </span>
                <span>➜</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-200">
                  Printed Content: 10cm × 6cm (0.5cm Margins)
                </span>
              </div>
              <div
                className={`bg-white border-2 border-dashed border-neutral-400 shadow-xl flex ${
                  printPosition === 'UPPER_LEFT'
                    ? 'justify-start'
                    : printPosition === 'UPPER_RIGHT'
                    ? 'justify-end'
                    : 'justify-center'
                } items-center relative box-border print:border-0 print:shadow-none print:!p-0 print:!m-0 print:!w-full print:!min-h-0 print:block print:static`}
                style={{ width: '11cm', minHeight: '7cm', padding: '0.5cm' }}
              >
                <div className="absolute -top-3 left-2 bg-neutral-800 text-white text-[8px] font-mono px-1.5 py-0.5 uppercase tracking-wider print:hidden">
                  Pre-Cut Paper (11cm × 7cm)
                </div>
                {stubContent}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[13cm] bg-white p-3 border border-neutral-300 shadow-inner flex justify-center print:border-0 print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-auto">
              {stubContent}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-neutral-600 uppercase tracking-wider print:hidden">
            <span>Content: 10cm × 6cm</span>
            <span>•</span>
            <span>Paper: 11cm × 7cm (1/8 Letter)</span>
            <span>•</span>
            <span className="font-bold text-indigo-900">
              {printPosition === 'UPPER_LEFT'
                ? 'Feed: Upper-Left (Left Guide)'
                : printPosition === 'UPPER_RIGHT'
                ? 'Feed: Upper-Right (Right Guide)'
                : printPosition === 'CENTER'
                ? 'Feed: Center Sliders'
                : 'Page: Exact 11cm × 7cm'}
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 font-sans mt-1 text-center max-w-md print:hidden">
            💡 <strong>1 Letter whole sheet cut into 8 pcs = 11cm × 7cm each.</strong> The content is sized exactly 10cm × 6cm, leaving 0.5cm (5mm) safe borders all around.
          </p>
        </div>
      </div>
    </div>
  );
};
