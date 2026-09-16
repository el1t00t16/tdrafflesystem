'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Winner } from '../../lib/types';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  Building,
  UserCheck,
  AlertTriangle,
  QrCode,
  Zap,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  Check,
  User,
  X,
  RefreshCw,
  Bell,
  Camera,
  CameraOff,
  FlipHorizontal,
  FileText
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { soundSynthesizer } from '../../lib/sound';
import { ClaimSlipReceipt } from './ClaimSlipReceipt';
import { WinnerVerificationStub } from './WinnerVerificationStub';
import { subscribeToRealtimeUpdates } from '../../lib/supabase';

interface RealtimeClaimsWorkstationProps {
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
  stationId?: string;
  officerName?: string;
  isStandalone?: boolean;
  onRefreshCloud?: () => Promise<void>;
  isCloudConfigured?: boolean;
  onOpenPrintQueue?: () => void;
  onMarkAsPrinted?: (winnerId: string) => void;
}

export const RealtimeClaimsWorkstation: React.FC<RealtimeClaimsWorkstationProps> = ({
  winners,
  onClaimPrize,
  onUnclaimPrize,
  onForfeitPrize,
  stationId = 'CLAIM-DESK-1',
  officerName = 'Disbursing Officer',
  isStandalone = false,
  onRefreshCloud,
  isCloudConfigured = false,
  onOpenPrintQueue,
  onMarkAsPrinted
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'UNCLAIMED' | 'ALL' | 'CLAIMED' | 'FORFEITED' | 'PENDING_PRINT'>('UNCLAIMED');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [verifyingStubWinner, setVerifyingStubWinner] = useState<Winner | null>(null);

  // Smooth scroll reference to Verification card on mobile
  const verificationCardRef = useRef<HTMLDivElement>(null);

  // Safe disbursement confirmation states (prevents accidental clicks on mobile)
  const [confirmingWinnerId, setConfirmingWinnerId] = useState<string | null>(null);
  const [safeConfirmationMode, setSafeConfirmationMode] = useState<boolean>(true);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  // Scanner Input State & Ref
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [newWinnerAlert, setNewWinnerAlert] = useState<{ name: string; prize: string; time: string } | null>(null);

  // Camera QR Scanner States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    status: 'MATCH' | 'NOT_FOUND';
    message: string;
    winner?: Winner;
    rawCode?: string;
  } | null>(null);
  const scannerContainerId = 'html5qr-claim-reader';
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedTextRef = useRef<string>('');

  // Modals State
  const [printingWinner, setPrintingWinner] = useState<Winner | null>(null);
  const [proxyModalWinner, setProxyModalWinner] = useState<Winner | null>(null);
  const [proxyName, setProxyName] = useState('');
  const [proxyRelationship, setProxyRelationship] = useState('');
  const [proxyIdPresented, setProxyIdPresented] = useState('Authorized Representative ID + DepEd ID Copy');
  const [proxyAuthConfirmed, setProxyAuthConfirmed] = useState(false);
  const [claimNotes, setClaimNotes] = useState('');

  // Undo / Forfeiture Confirmation Modals
  const [revertingWinner, setRevertingWinner] = useState<Winner | null>(null);
  const [forfeitingWinner, setForfeitingWinner] = useState<Winner | null>(null);
  const [forfeitReason, setForfeitReason] = useState('Unclaimed by deadline / Absent on stage');

  // Success Claim Notification
  const [lastClaimedWinner, setLastClaimedWinner] = useState<Winner | null>(null);

  // Real-time listener for live draws from Stage Operator
  useEffect(() => {
    if (!isCloudConfigured) return;

    const unsubscribe = subscribeToRealtimeUpdates({
      onWinnerChange: (updatedWinner) => {
        if (!updatedWinner.winnerId) return;
        // Check if this is a newly drawn winner
        const existing = winners.find((w) => w.winnerId === updatedWinner.winnerId);
        if (!existing) {
          // Newly drawn! Alert the station
          soundSynthesizer.playSuccess();
          setNewWinnerAlert({
            name: updatedWinner.name,
            prize: updatedWinner.prizeName,
            time: updatedWinner.time || new Date().toLocaleTimeString()
          });
          setTimeout(() => setNewWinnerAlert(null), 8000);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCloudConfigured, winners]);

  // Keep scanner focused on initial load
  useEffect(() => {
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, []);

  // Robust Resolver for scanned badge code to Winner
  const resolveScannedCode = useCallback(
    (rawCode: string): Winner | undefined => {
      const clean = String(rawCode).trim();
      if (!clean) return undefined;

      // 1. Direct match on Winner Ticket ID (e.g. WN-0001)
      let match = winners.find((w) => w.winnerId.toLowerCase() === clean.toLowerCase());
      if (match) return match;

      // 2. Direct match on Participant Profiling ID (e.g. W-2026-49550)
      match = winners.find((w) => w.participantId.toLowerCase() === clean.toLowerCase());
      if (match) return match;

      // 3. Direct match on DepEd Employee ID
      match = winners.find((w) => w.depedId && w.depedId.toLowerCase() === clean.toLowerCase());
      if (match) return match;

      // 4. Try parsing JSON (if QR encoded object)
      try {
        if (clean.startsWith('{') && clean.endsWith('}')) {
          const parsed = JSON.parse(clean);
          const id = parsed.id || parsed.winnerId || parsed.participantId || parsed.profilingId || parsed.depedId;
          if (id) {
            match = winners.find(
              (w) =>
                w.winnerId.toLowerCase() === String(id).toLowerCase() ||
                w.participantId.toLowerCase() === String(id).toLowerCase() ||
                (w.depedId && w.depedId.toLowerCase() === String(id).toLowerCase())
            );
            if (match) return match;
          }
        }
      } catch (e) {
        // ignore json error
      }

      // 5. Try URL query param match (e.g. ?id=W-2026-XXXXX)
      if (clean.includes('=')) {
        const parts = clean.split(/[?&=]/);
        for (const part of parts) {
          match = winners.find(
            (w) =>
              w.winnerId.toLowerCase() === part.toLowerCase() ||
              w.participantId.toLowerCase() === part.toLowerCase()
          );
          if (match) return match;
        }
      }

      // 6. Name match
      match = winners.find((w) => w.name.toLowerCase() === clean.toLowerCase());
      if (match) return match;

      return undefined;
    },
    [winners]
  );

  // Process decoded text from Camera QR scanner or Barcode Gun
  const handleProcessScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      // 2-second debounce for identical scans
      if (decodedText === lastScannedTextRef.current && now - lastScanTimeRef.current < 2000) {
        return;
      }
      lastScanTimeRef.current = now;
      lastScannedTextRef.current = decodedText;

      const matchedWinner = resolveScannedCode(decodedText);

      if (matchedWinner) {
        soundSynthesizer.playSuccess();
        setSelectedWinnerId(matchedWinner.winnerId);
        setConfirmingWinnerId(null);
        setLastScannedCode(decodedText);

        if (matchedWinner.claimStatus !== statusTab && statusTab !== 'ALL') {
          setStatusTab('ALL');
        }

        setScanFeedback({
          status: 'MATCH',
          winner: matchedWinner,
          message: `QR Verified: ${matchedWinner.name} won "${matchedWinner.prizeName}"`,
          rawCode: decodedText
        });

        if (typeof window !== 'undefined' && window.innerWidth < 1024 && verificationCardRef.current) {
          verificationCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        soundSynthesizer.playCountdownTick();
        setScanFeedback({
          status: 'NOT_FOUND',
          message: `Scanned code "${decodedText}" has not won any raffle prize yet.`,
          rawCode: decodedText
        });
      }
    },
    [resolveScannedCode, statusTab]
  );

  // Camera QR Scanner lifecycle
  useEffect(() => {
    let isSubscribed = true;

    if (isCameraActive) {
      setCameraError(null);
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerInstanceRef.current = scanner;

      scanner
        .start(
          { facingMode: cameraFacingMode },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 }
          },
          (decodedText) => {
            if (isSubscribed) {
              handleProcessScan(decodedText);
            }
          },
          () => {} // frame error callback ignored
        )
        .catch((err) => {
          if (isSubscribed) {
            console.error('Camera QR scan error:', err);
            setCameraError(
              'Unable to access camera. Please allow camera permissions in your browser or use the Barcode Gun / Search box.'
            );
            setIsCameraActive(false);
          }
        });
    }

    return () => {
      isSubscribed = false;
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current
          .stop()
          .then(() => {
            scannerInstanceRef.current?.clear();
            scannerInstanceRef.current = null;
          })
          .catch(() => {
            scannerInstanceRef.current = null;
          });
      }
    };
  }, [isCameraActive, cameraFacingMode, handleProcessScan]);

  // Filtered Winners List
  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      // Tab filter
      if (statusTab === 'PENDING_PRINT') {
        if (w.isPrinted) return false;
      } else if (statusTab !== 'ALL' && w.claimStatus !== statusTab) {
        return false;
      }

      // District filter
      if (districtFilter !== 'ALL') {
        if (districtFilter === 'ECCD') {
          if (!w.originalDistrict?.toLowerCase().includes('eccd') && !w.school.toLowerCase().includes('eccd')) {
            return false;
          }
        } else if (districtFilter === 'LSB') {
          if (!w.position?.toLowerCase().includes('lsb') && !w.personnelType?.toLowerCase().includes('lsb')) {
            return false;
          }
        } else if (w.district !== districtFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesWinnerId = w.winnerId.toLowerCase().includes(q);
        const matchesPartId = w.participantId.toLowerCase().includes(q);
        const matchesDeped = w.depedId ? w.depedId.toLowerCase().includes(q) : false;
        const matchesSchool = w.school.toLowerCase().includes(q);
        const matchesPrize = w.prizeName.toLowerCase().includes(q);
        const matchesContact = w.contactNumber ? w.contactNumber.includes(q) : false;

        return (
          matchesName ||
          matchesWinnerId ||
          matchesPartId ||
          matchesDeped ||
          matchesSchool ||
          matchesPrize ||
          matchesContact
        );
      }

      return true;
    });
  }, [winners, statusTab, districtFilter, searchQuery]);

  // Active Selected Winner
  const selectedWinner = useMemo(() => {
    if (selectedWinnerId) {
      const found = winners.find((w) => w.winnerId === selectedWinnerId);
      if (found) return found;
    }
    return filteredWinners.length > 0 ? filteredWinners[0] : null;
  }, [winners, selectedWinnerId, filteredWinners]);

  // Handle Barcode Gun / Search Input submission
  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    handleProcessScan(query);
  };

  // 1-Click Express Disburse (Under 2 seconds)
  const handleExpressClaim = (winner: Winner) => {
    soundSynthesizer.playCelebrationFanfare();
    const claimedByFormatted = `${officerName} (${stationId})`;

    onClaimPrize(winner.winnerId, claimedByFormatted, {
      idPresented: 'DepEd Employee ID / Physical Badge',
      isProxyClaim: false
    });

    setLastClaimedWinner({ ...winner, claimStatus: 'CLAIMED', claimedBy: claimedByFormatted });
    setTimeout(() => setLastClaimedWinner(null), 6000);

    // Auto clear search & re-focus scanner for next teacher
    setSearchQuery('');
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  };

  // Safe Selection of winner with auto-scroll to verification on mobile
  const handleSelectWinner = (winnerId: string) => {
    soundSynthesizer.playClick();
    setSelectedWinnerId(winnerId);
    setConfirmingWinnerId(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && verificationCardRef.current) {
      verificationCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Safe Disburse Handler with 2-tap protection against accidental touch on mobile
  const handleDisburseTrigger = (winner: Winner) => {
    if (!safeConfirmationMode) {
      handleExpressClaim(winner);
      return;
    }

    if (confirmingWinnerId === winner.winnerId) {
      // Confirmed! Execute claim
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      setConfirmingWinnerId(null);
      handleExpressClaim(winner);
    } else {
      // Step 1: Prompt for confirmation
      soundSynthesizer.playCountdownTick();
      setConfirmingWinnerId(winner.winnerId);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmingWinnerId(null);
      }, 4500);
    }
  };

  // Confirm Proxy Claim
  const handleConfirmProxyClaim = () => {
    if (!proxyModalWinner) return;
    if (!proxyName.trim()) {
      alert('Please enter the name of the authorized representative.');
      return;
    }
    if (!proxyAuthConfirmed) {
      alert('Please confirm verification of the authorization letter and valid ID.');
      return;
    }

    soundSynthesizer.playCelebrationFanfare();
    const claimedByFormatted = `${officerName} (${stationId})`;

    onClaimPrize(proxyModalWinner.winnerId, claimedByFormatted, {
      idPresented: proxyIdPresented,
      isProxyClaim: true,
      proxyName: proxyName.trim(),
      proxyRelationship: proxyRelationship.trim(),
      claimNotes: claimNotes.trim() ? claimNotes : undefined
    });

    setProxyModalWinner(null);
    setProxyName('');
    setProxyRelationship('');
    setProxyAuthConfirmed(false);
    setClaimNotes('');

    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  };

  // Undo Claim
  const handleExecuteUnclaim = (winnerId: string) => {
    soundSynthesizer.playClick();
    if (onUnclaimPrize) {
      onUnclaimPrize(winnerId);
    }
    setRevertingWinner(null);
  };

  // Forfeit Prize
  const handleExecuteForfeit = () => {
    if (!forfeitingWinner) return;
    soundSynthesizer.playClick();
    if (onForfeitPrize) {
      onForfeitPrize(forfeitingWinner.winnerId, forfeitReason);
    }
    setForfeitingWinner(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    soundSynthesizer.playClick();
    if (winners.length === 0) return;

    const headers = [
      'WINNER TICKET ID',
      'PROFILING ID',
      'DEPED EMPLOYEE ID',
      'NAME',
      'DISTRICT',
      'SCHOOL',
      'POSITION',
      'PERSONNEL TYPE',
      'PRIZE NAME',
      'UNIT VALUE (PHP)',
      'DRAW ROUND',
      'DRAW TIMESTAMP',
      'CLAIM STATUS',
      'CLAIMED AT',
      'CLAIMED BY OFFICER / STATION',
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
      `"${w.school.replace(/"/g, '""')}"`,
      `"${w.position.replace(/"/g, '""')}"`,
      `"${w.personnelType}"`,
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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `TeachersDay2026_Disbursement_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live Stats
  const totalCount = winners.length;
  const claimedCount = winners.filter((w) => w.claimStatus === 'CLAIMED').length;
  const unclaimedCount = winners.filter((w) => w.claimStatus === 'UNCLAIMED').length;
  const forfeitedCount = winners.filter((w) => w.claimStatus === 'FORFEITED').length;
  const pendingPrintCount = winners.filter((w) => !w.isPrinted).length;
  const totalValue = winners.reduce((sum, w) => sum + (w.unitValue || 0), 0);
  const disbursedValue = winners
    .filter((w) => w.claimStatus === 'CLAIMED')
    .reduce((sum, w) => sum + (w.unitValue || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in font-sans selection:bg-[#ff6a00] selection:text-white">
      {/* On-Screen Claims Workstation UI (Hidden during receipt/stub printing so it takes zero space) */}
      <div className={`space-y-4 ${printingWinner || verifyingStubWinner ? 'print:hidden' : ''}`}>
        {/* Real-time Alert Toast when new winners are drawn on Stage */}
      {newWinnerAlert && (
        <div className="bg-gradient-to-r from-[#ff6a00] to-amber-500 text-black px-4 py-3 shadow-2xl flex items-center justify-between border-2 border-white animate-bounce">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-white rounded-full">
              <Bell className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest font-black">
                ⚡ NEW WINNER DRAWN ON STAGE • {newWinnerAlert.time}
              </div>
              <div className="font-serif font-black text-sm sm:text-base uppercase tracking-tight">
                {newWinnerAlert.name} — won <span className="underline">{newWinnerAlert.prize}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setNewWinnerAlert(null)}
            className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Success Notification after claim */}
      {lastClaimedWinner && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between border border-emerald-400 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span className="font-mono text-xs">
              Prize successfully disbursed to <strong>{lastClaimedWinner.name}</strong> ({lastClaimedWinner.prizeName})
            </span>
          </div>
          <button
            onClick={() => setPrintingWinner(lastClaimedWinner)}
            className="px-3 py-1 bg-white text-emerald-950 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-800" />
            <span>Print Voucher</span>
          </button>
        </div>
      )}

      {/* Station Control & KPI Header */}
      <div className="bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/10 p-4 sm:p-5 shadow-sm dark:shadow-2xl space-y-4 border-t-4 border-t-[#ff6a00]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1a1a1a]/15 dark:border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse" />
              <h2 className="font-mono text-sm sm:text-base font-black text-[#1a1a1a] dark:text-white uppercase tracking-wider">
                {stationId}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#ff6a00]/20 text-[#ff6a00] border border-[#ff6a00]/40 font-bold uppercase tracking-wider">
                Fast Real-time Claiming
              </span>
            </div>
            <p className="font-mono text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Officer in-charge: <strong className="text-[#1a1a1a] dark:text-white">{officerName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {onOpenPrintQueue && (
              <button
                type="button"
                onClick={onOpenPrintQueue}
                className="px-3.5 py-2 bg-[#1a1a1a] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Open Winner Print Queue & Batch Stub Dispatch"
              >
                <Printer className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Print Queue</span>
                {pendingPrintCount > 0 && (
                  <span className="bg-[#FF1E1E] text-white text-[9px] px-1.5 py-0.2 rounded-full font-black font-mono leading-none animate-pulse">
                    {pendingPrintCount}
                  </span>
                )}
              </button>
            )}

            {onRefreshCloud && isCloudConfigured && (
              <button
                onClick={onRefreshCloud}
                title="Refresh winners from Supabase Cloud"
                className="px-3 py-2 bg-[#f8f7f4] hover:bg-[#eae8e3] dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-[#1a1a1a]/20 dark:border-white/20 text-neutral-700 dark:text-neutral-300 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span className="hidden sm:inline">Sync Cloud</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={winners.length === 0}
              className="px-3.5 py-2 bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 disabled:opacity-30 border-2 border-[#1a1a1a] dark:border-white/20 text-[#1a1a1a] dark:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#ff6a00]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 font-mono text-xs">
          <button
            type="button"
            onClick={onOpenPrintQueue ? onOpenPrintQueue : () => setStatusTab('PENDING_PRINT')}
            className="p-3 bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 shadow-xs text-left transition-colors cursor-pointer group"
            title="View stubs awaiting print"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-800 dark:text-amber-400 uppercase font-bold tracking-wider block">
                Pending Print
              </span>
              <Printer className="w-3 h-3 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
              {pendingPrintCount}
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Stubs to print &amp; dispatch</span>
          </button>

          <div className="p-3 bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 shadow-xs">
            <span className="text-[10px] text-neutral-600 dark:text-neutral-500 uppercase font-bold tracking-wider block">
              Pending Unclaimed
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-black text-[#ff6a00] mt-0.5">
              {unclaimedCount}
            </div>
            <span className="text-[10px] text-neutral-500">Awaiting disbursement</span>
          </div>

          <div className="p-3 bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 shadow-xs">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase font-bold tracking-wider block">
              Claimed &amp; Disbursed
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {claimedCount} <span className="text-xs text-neutral-500 font-normal">/ {totalCount}</span>
            </div>
            <span className="text-[10px] text-neutral-500">Released to teachers</span>
          </div>

          <div className="p-3 bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 shadow-xs">
            <span className="text-[10px] text-neutral-600 dark:text-neutral-500 uppercase font-bold tracking-wider block">
              Value Disbursed
            </span>
            <div className="font-serif text-xl sm:text-2xl font-black text-[#1a1a1a] dark:text-white mt-0.5">
              ₱{disbursedValue.toLocaleString()}
            </div>
            <span className="text-[10px] text-neutral-500">of ₱{totalValue.toLocaleString()} total</span>
          </div>

          <div className="p-3 bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 shadow-xs">
            <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold tracking-wider block">
              Forfeited
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-black text-neutral-700 dark:text-neutral-400 mt-0.5">
              {forfeitedCount}
            </div>
            <span className="text-[10px] text-neutral-500">Expired / Absent</span>
          </div>
        </div>
      </div>

      {/* Main Responsive Claiming Workstation:
          On Mobile (< lg):
            1. Camera & Scanner (order-1)
            2. DISBURSEMENT VERIFICATION (order-2)
            3. Winners Directory / Queue (order-3)
          On Desktop (>= lg):
            - Left Column: Scanner (Row 1) & Queue (Row 2)
            - Right Column: Sticky DISBURSEMENT VERIFICATION (Rows 1-2)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* BLOCK 1: Barcode Gun / Search & Live Camera QR Scanner */}
        <div className="order-1 lg:order-1 lg:col-span-7 lg:col-start-1 lg:row-start-1 bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/10 p-4 shadow-sm dark:shadow-xl space-y-4">
          {/* Hardware Barcode Gun, Quick Search & Camera QR Scanner Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-neutral-700 dark:text-neutral-300">
              <span className="flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Barcode Gun / Badge Scanner / Search</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  soundSynthesizer.playClick();
                  setIsCameraActive(!isCameraActive);
                }}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 rounded-xs transition-all shadow ${
                  isCameraActive
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-[#ff6a00] hover:bg-[#e05e00] text-black'
                }`}
              >
                {isCameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{isCameraActive ? 'Close Camera' : 'Camera QR Scanner'}</span>
              </button>
            </div>

            <form onSubmit={handleScannerSubmit} className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan badge with gun, or search name / ID..."
                  className="w-full bg-[#f8f7f4] dark:bg-black border-2 border-[#1a1a1a]/30 dark:border-white/20 pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-[#1a1a1a] dark:text-white focus:border-[#ff6a00] outline-none uppercase shadow-inner"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (scannerInputRef.current) scannerInputRef.current.focus();
                  }}
                  className="px-2.5 bg-[#f8f7f4] dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/20 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Camera Viewport (When camera is active) */}
          {isCameraActive && (
            <div className="bg-black border-2 border-[#ff6a00] p-3 rounded-sm space-y-2 relative animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-bold text-white uppercase">LIVE CAMERA QR SCANNER</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynthesizer.playClick();
                      setCameraFacingMode(cameraFacingMode === 'environment' ? 'user' : 'environment');
                    }}
                    title="Flip camera (Front/Back)"
                    className="p-1 bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white rounded-xs flex items-center gap-1 text-[10px] font-mono px-2"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                    <span>Flip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="p-1 bg-white/10 hover:bg-red-900 text-neutral-400 hover:text-white rounded-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xs bg-[#09090b] flex items-center justify-center min-h-[220px]">
                <div id={scannerContainerId} className="w-full max-w-sm mx-auto" />
              </div>

              <p className="text-center text-[10px] text-neutral-400 font-mono">
                Hold the teacher&apos;s badge QR code steady in front of the lens for instant verification.
              </p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="bg-red-950/80 border border-red-500/60 p-3 rounded-xs text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{cameraError}</div>
              <button onClick={() => setCameraError(null)} className="text-neutral-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* QR Scan Result Feedback Toast / Banner */}
          {scanFeedback && (
            <div
              className={`p-3 rounded-xs border-2 shadow-lg flex items-center justify-between gap-3 text-xs font-mono animate-fade-in ${
                scanFeedback.status === 'MATCH'
                  ? 'bg-emerald-950/90 border-emerald-500 text-white'
                  : 'bg-red-950/90 border-red-500 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {scanFeedback.status === 'MATCH' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-neutral-300">
                    {scanFeedback.status === 'MATCH' ? 'QR BADGE MATCH VERIFIED' : 'NO WINNING RECORD FOUND'}
                  </div>
                  <div className="font-sans font-bold text-sm uppercase truncate text-white">
                    {scanFeedback.status === 'MATCH'
                      ? `${scanFeedback.winner?.name} — ${scanFeedback.winner?.prizeName}`
                      : scanFeedback.message}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {scanFeedback.status === 'MATCH' && scanFeedback.winner?.claimStatus === 'UNCLAIMED' && (
                  <button
                    onClick={() => {
                      if (scanFeedback.winner) {
                        handleSelectWinner(scanFeedback.winner.winnerId);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#ff6a00] hover:bg-[#e05e00] text-black font-black uppercase text-xs flex items-center gap-1 shadow transition-all active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Verify Recipient</span>
                    <span className="sm:hidden">Verify</span>
                  </button>
                )}
                <button
                  onClick={() => setScanFeedback(null)}
                  className="p-1 hover:bg-white/10 text-neutral-400 hover:text-white rounded-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BLOCK 2: Selected Winner Verification & Actions (Mobile Order 2, Desktop Order 2 / Right Column) */}
        <div
          ref={verificationCardRef}
          className="order-2 lg:order-2 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4 bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/10 p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 dark:border-white/10 pb-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#ff6a00]" />
              <span>DISBURSEMENT VERIFICATION</span>
            </h3>
            {selectedWinner && (
              <span className="font-mono text-[11px] font-bold text-[#ff6a00]">
                {selectedWinner.winnerId}
              </span>
            )}
          </div>

          {selectedWinner ? (
            <div className="space-y-4">
              {/* Prize Header Card */}
              <div className="bg-[#f8f7f4] dark:bg-black border-2 border-[#ff6a00] p-4 text-center space-y-1 shadow-sm">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 dark:text-neutral-400 block">
                  PRIZE TO BE DISBURSED
                </span>
                <div className="font-serif font-black text-xl text-[#1a1a1a] dark:text-white uppercase tracking-tight">
                  {selectedWinner.prizeName}
                </div>
                {selectedWinner.unitValue > 0 && (
                  <div className="font-mono text-xs font-bold text-[#ff6a00]">
                    Valuation: ₱{selectedWinner.unitValue.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Recipient Details */}
              <div className="bg-[#f8f7f4] dark:bg-neutral-950 border border-[#1a1a1a]/15 dark:border-white/10 p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-start pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10">
                  <span className="text-neutral-600 dark:text-neutral-400">Recipient:</span>
                  <strong className="text-[#1a1a1a] dark:text-white uppercase font-sans text-sm text-right">
                    {selectedWinner.name}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">District:</span>
                  <span className="px-2 py-0.2 bg-white dark:bg-black text-[#1a1a1a] dark:text-white font-bold border border-[#1a1a1a]/20 dark:border-white/10 uppercase text-[10px]">
                    {selectedWinner.district}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-neutral-600 dark:text-neutral-400">School:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 text-right max-w-[200px] truncate">
                    {selectedWinner.school}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Role / Position:</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {selectedWinner.position} ({selectedWinner.personnelType})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Profiling ID:</span>
                  <span className="text-[#1a1a1a] dark:text-neutral-300 font-bold">{selectedWinner.participantId}</span>
                </div>
                {selectedWinner.depedId && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">DepEd ID:</span>
                    <span className="text-[#1a1a1a] dark:text-neutral-300 font-bold">{selectedWinner.depedId}</span>
                  </div>
                )}
                {selectedWinner.contactNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Contact:</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{selectedWinner.contactNumber}</span>
                  </div>
                )}
              </div>

              {/* Status Section */}
              {selectedWinner.claimStatus === 'CLAIMED' ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase font-mono">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>PRIZE OFFICIALLY DISBURSED</span>
                  </div>
                  <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                    <div>
                      Disbursed At: <strong>{selectedWinner.claimedAt}</strong>
                    </div>
                    <div>
                      Disbursed By: <strong>{selectedWinner.claimedBy || 'Claims Desk'}</strong>
                    </div>
                    <div>
                      ID Presented: <strong>{selectedWinner.idPresented || 'DepEd Employee ID'}</strong>
                    </div>
                    {selectedWinner.isProxyClaim && (
                      <div className="text-amber-800 dark:text-amber-300">
                        Proxy: <strong>{selectedWinner.proxyName}</strong> ({selectedWinner.proxyRelationship})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/30">
                    <button
                      onClick={() => setPrintingWinner(selectedWinner)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow"
                    >
                      <Printer className="w-3.5 h-3.5 text-white dark:text-black" />
                      <span>Print Voucher Slip</span>
                    </button>

                    {onUnclaimPrize && (
                      <button
                        onClick={() => setRevertingWinner(selectedWinner)}
                        className="px-3 py-2 bg-[#f8f7f4] hover:bg-red-50 dark:bg-neutral-900 dark:hover:bg-red-950/50 border border-[#1a1a1a]/20 dark:border-white/20 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-300 font-mono text-xs transition-colors"
                        title="Revert Claim Status to Unclaimed"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedWinner.claimStatus === 'FORFEITED' ? (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-500/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-bold text-xs uppercase font-mono">
                    <AlertTriangle className="w-5 h-5" />
                    <span>PRIZE FORFEITED</span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 font-mono">
                    Reason: {selectedWinner.forfeitReason || 'Absent / Unclaimed by deadline'}
                  </p>
                  {onUnclaimPrize && (
                    <button
                      onClick={() => handleExecuteUnclaim(selectedWinner.winnerId)}
                      className="w-full py-2 bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-[#1a1a1a]/20 dark:border-white/20 text-[#1a1a1a] dark:text-white font-mono text-xs font-bold uppercase"
                    >
                      Re-activate Prize to Unclaimed
                    </button>
                  )}
                </div>
              ) : (
                /* Unclaimed Actions: 1-Click Fast Disburse with 2-tap protection against accidental touch */
                <div className="space-y-3">
                  {confirmingWinnerId === selectedWinner.winnerId ? (
                    <div className="space-y-1.5 animate-fade-in">
                      <button
                        onClick={() => handleDisburseTrigger(selectedWinner)}
                        className="w-full py-3.5 sm:py-4 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-[0.98] ring-2 ring-white animate-pulse"
                      >
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 fill-black text-amber-500 shrink-0" />
                        <span className="truncate">
                          ⚠️ TAP TO CONFIRM DISBURSEMENT
                        </span>
                      </button>
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 dark:text-neutral-400 px-1">
                        <span>Tap again to disburse to {selectedWinner.name.split(' ')[0]}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
                            setConfirmingWinnerId(null);
                          }}
                          className="text-[#ff6a00] hover:underline font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDisburseTrigger(selectedWinner)}
                      className="w-full py-3.5 sm:py-4 bg-[#22c55e] hover:bg-[#16a34a] text-black font-mono font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-[0.98]"
                    >
                      <Zap className="w-5 h-5 fill-black" />
                      <span>1-CLICK FAST DISBURSE</span>
                    </button>
                  )}

                  {/* Safety confirmation mode toggle */}
                  <div className="flex items-center justify-between px-1 text-[10px] font-mono text-neutral-600 dark:text-neutral-400">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={safeConfirmationMode}
                        onChange={(e) => {
                          setSafeConfirmationMode(e.target.checked);
                          setConfirmingWinnerId(null);
                        }}
                        className="accent-[#ff6a00] w-3.5 h-3.5"
                      />
                      <span>2-Tap Mobile Safe Confirmation</span>
                    </label>
                    {safeConfirmationMode ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🛡️ Protected against mis-clicks</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">⚠️ Instant 1-tap</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setProxyModalWinner(selectedWinner);
                        setProxyName('');
                        setProxyRelationship('');
                        setProxyAuthConfirmed(false);
                        setClaimNotes('');
                      }}
                      className="py-2.5 bg-[#f8f7f4] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-[#1a1a1a]/20 dark:border-white/20 text-neutral-800 dark:text-neutral-200 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#ff6a00]" />
                      <span>Proxy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVerifyingStubWinner(selectedWinner)}
                      className="py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700/60 text-indigo-900 dark:text-indigo-200 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Print Official 1/4 Letter Verification Stub with QR Code"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>1/4 Stub</span>
                    </button>

                    <button
                      onClick={() => setPrintingWinner(selectedWinner)}
                      className="py-2.5 bg-[#f8f7f4] hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-[#1a1a1a]/20 dark:border-white/20 text-neutral-800 dark:text-neutral-200 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Preview Claim Slip Voucher"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                      <span>Slip</span>
                    </button>
                  </div>

                  {/* Verification Stub Status Box */}
                  <div className="flex items-center justify-between p-2 bg-[#f8f7f4] dark:bg-neutral-900 border border-[#1a1a1a]/15 dark:border-white/10 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-neutral-600 dark:text-neutral-400 uppercase text-[10px]">Stub:</span>
                      {selectedWinner.isPrinted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Printed</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold uppercase flex items-center gap-1 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>Pending Print</span>
                        </span>
                      )}
                    </div>
                    {onMarkAsPrinted && !selectedWinner.isPrinted && (
                      <button
                        type="button"
                        onClick={() => onMarkAsPrinted(selectedWinner.winnerId)}
                        className="text-[10px] uppercase font-bold text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 underline cursor-pointer"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>

                  {onForfeitPrize && (
                    <button
                      onClick={() => setForfeitingWinner(selectedWinner)}
                      className="w-full py-2 bg-[#f8f7f4] hover:bg-red-50 dark:bg-neutral-950 dark:hover:bg-red-950/60 border border-[#1a1a1a]/15 dark:border-white/10 hover:border-red-500/40 text-neutral-600 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-300 font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Mark as Forfeited (Absent / Expired)
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#f8f7f4] dark:bg-black/40 border border-dashed border-[#1a1a1a]/20 dark:border-white/10 text-neutral-500 font-mono text-xs">
              Select a winner ticket from the list or scan a badge to start disbursement.
            </div>
          )}
        </div>

        {/* BLOCK 3: Winners Table / Queue (Mobile Order 3, Desktop Order 3 / Left Bottom Column) */}
        <div className="order-3 lg:order-3 lg:col-span-7 lg:col-start-1 lg:row-start-2 bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/10 p-4 shadow-sm dark:shadow-xl space-y-3">
          {/* Queue Tab Selectors & District Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#1a1a1a]/15 dark:border-white/10 text-xs font-mono">
            <div className="inline-flex border border-[#1a1a1a]/20 dark:border-white/20 divide-x divide-[#1a1a1a]/20 dark:divide-white/20 bg-[#f8f7f4] dark:bg-black overflow-x-auto max-w-full">
              <button
                onClick={() => setStatusTab('UNCLAIMED')}
                className={`px-3 py-1.5 font-bold uppercase flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'UNCLAIMED'
                    ? 'bg-[#ff6a00] text-black font-black'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Unclaimed ({unclaimedCount})</span>
              </button>
              <button
                onClick={() => setStatusTab('PENDING_PRINT')}
                className={`px-3 py-1.5 font-bold uppercase flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'PENDING_PRINT'
                    ? 'bg-amber-500 text-black font-black'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Pending Print ({pendingPrintCount})</span>
              </button>
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'ALL'
                    ? 'bg-[#1a1a1a] text-white dark:bg-neutral-800 dark:text-white font-black'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setStatusTab('CLAIMED')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 ${
                  statusTab === 'CLAIMED'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Claimed ({claimedCount})
              </button>
              <button
                onClick={() => setStatusTab('FORFEITED')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 ${
                  statusTab === 'FORFEITED'
                    ? 'bg-red-800 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Forfeited ({forfeitedCount})
              </button>
            </div>

            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-white dark:bg-black border border-[#1a1a1a]/30 dark:border-white/20 px-2.5 py-1.5 text-[11px] font-mono font-bold text-[#1a1a1a] dark:text-white outline-none focus:border-[#ff6a00] uppercase w-full sm:w-auto"
            >
              <option value="ALL">All Districts</option>
              <option value="NORTH">North</option>
              <option value="EAST">East</option>
              <option value="WEST">West</option>
              <option value="SOUTH">South</option>
              <option value="PRIVATE">Private (ECCD + Private + LSB)</option>
              <option value="LSB">-- LSB Personnel</option>
              <option value="ECCD">-- ECCD Personnel</option>
            </select>
          </div>

          {/* Queue List Cards */}
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredWinners.length === 0 ? (
              <div className="p-8 text-center bg-[#f8f7f4] dark:bg-black/40 border border-dashed border-[#1a1a1a]/20 dark:border-white/10 text-neutral-500 font-mono text-xs">
                No winners found matching the current search criteria or status filter.
              </div>
            ) : (
              filteredWinners.map((w) => {
                const isSelected = selectedWinner?.winnerId === w.winnerId;
                const isClaimed = w.claimStatus === 'CLAIMED';
                const isForfeited = w.claimStatus === 'FORFEITED';

                return (
                  <div
                    key={w.winnerId}
                    onClick={() => handleSelectWinner(w.winnerId)}
                    className={`p-3 border-2 transition-all cursor-pointer relative select-none ${
                      isSelected
                        ? 'border-[#ff6a00] bg-orange-50/50 dark:bg-neutral-900 shadow-md ring-1 ring-[#ff6a00]'
                        : isClaimed
                        ? 'border-emerald-600/40 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-neutral-950/80 hover:border-emerald-600'
                        : isForfeited
                        ? 'border-red-600/40 dark:border-red-950 bg-red-50/30 dark:bg-red-950/20 opacity-70'
                        : 'border-[#1a1a1a]/15 dark:border-white/10 hover:border-[#1a1a1a]/40 dark:hover:border-white/30 bg-[#f8f7f4] dark:bg-neutral-950 active:bg-neutral-200 dark:active:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-[#ff6a00]">
                            {w.winnerId}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-white dark:bg-black text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-white/10 uppercase">
                            {w.district}
                          </span>
                          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">
                            {w.participantId}
                          </span>
                          {w.drawNumber && (
                            <span className="font-mono text-[10px] text-neutral-500">
                              • {w.drawNumber}
                            </span>
                          )}
                        </div>

                        <div className="font-sans font-bold text-sm text-[#1a1a1a] dark:text-white uppercase tracking-tight truncate">
                          {w.name}
                        </div>

                        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                          {w.school} • <span className="text-neutral-500">{w.position}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-sans font-bold text-xs text-[#1a1a1a] dark:text-white uppercase max-w-[150px] sm:max-w-[180px] truncate">
                          {w.prizeName}
                        </div>

                        {/* Status Badge */}
                        <div className="inline-block">
                          <span
                            className={`px-2 py-0.5 font-mono font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1 ${
                              isClaimed
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500 dark:border-emerald-600'
                                : isForfeited
                                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-500 dark:border-red-700 line-through'
                                : 'bg-[#ff6a00]/15 dark:bg-[#ff6a00]/20 text-[#d45800] dark:text-[#ff6a00] border border-[#ff6a00]'
                            }`}
                          >
                            {isClaimed ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>CLAIMED</span>
                              </>
                            ) : isForfeited ? (
                              <span>FORFEITED</span>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>UNCLAIMED</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Safe Card Footer */}
                    <div className="mt-2 pt-2 border-t border-[#1a1a1a]/10 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-neutral-500">
                        {isClaimed
                          ? `Disbursed: ${w.claimedAt || 'Yes'}`
                          : `Won: ${w.date} ${w.time}`}
                      </span>

                      {!isClaimed && !isForfeited ? (
                        <div className="flex items-center gap-1">
                          {isSelected ? (
                            <span className="px-2 py-0.5 bg-[#ff6a00] text-black font-mono font-bold text-[10px] uppercase flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Active in Verification</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-[#1a1a1a]/20 dark:border-white/10 hover:border-[#ff6a00] text-neutral-800 dark:text-neutral-300 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                              <span>Verify &amp; Disburse</span>
                              <ChevronRight className="w-3 h-3 text-[#ff6a00]" />
                            </span>
                          )}
                        </div>
                      ) : isClaimed ? (
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                          Disbursed by {w.claimedBy?.split(' ')[0] || 'Officer'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Proxy Claim Modal */}
      {proxyModalWinner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/20 text-[#1a1a1a] dark:text-white w-full max-w-md shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#1a1a1a]/15 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#ff6a00]" />
                <h3 className="font-bold uppercase tracking-wider text-[#1a1a1a] dark:text-white">
                  Authorized Proxy Claim
                </h3>
              </div>
              <button
                onClick={() => setProxyModalWinner(null)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#f8f7f4] dark:bg-black p-3 border border-[#1a1a1a]/15 dark:border-white/10 space-y-1">
              <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase">Winning Teacher:</span>
              <div className="font-sans font-bold text-sm text-[#1a1a1a] dark:text-white uppercase">
                {proxyModalWinner.name}
              </div>
              <div className="text-[11px] text-[#ff6a00]">
                Prize: {proxyModalWinner.prizeName}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-neutral-700 dark:text-neutral-300 font-bold uppercase text-[11px]">
                  Representative / Proxy Full Name:
                </label>
                <input
                  type="text"
                  value={proxyName}
                  onChange={(e) => setProxyName(e.target.value)}
                  placeholder="e.g. Maria Santos (Spouse / Co-Teacher)"
                  className="w-full bg-white dark:bg-black border border-[#1a1a1a]/20 dark:border-white/20 px-3 py-2 text-[#1a1a1a] dark:text-white font-sans text-xs focus:border-[#ff6a00] outline-none uppercase"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-700 dark:text-neutral-300 font-bold uppercase text-[11px]">
                  Relationship to Teacher:
                </label>
                <input
                  type="text"
                  value={proxyRelationship}
                  onChange={(e) => setProxyRelationship(e.target.value)}
                  placeholder="e.g. Spouse / School Representative / Principal"
                  className="w-full bg-white dark:bg-black border border-[#1a1a1a]/20 dark:border-white/20 px-3 py-2 text-[#1a1a1a] dark:text-white font-sans text-xs focus:border-[#ff6a00] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-700 dark:text-neutral-300 font-bold uppercase text-[11px]">
                  ID Presented by Proxy:
                </label>
                <input
                  type="text"
                  value={proxyIdPresented}
                  onChange={(e) => setProxyIdPresented(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-[#1a1a1a]/20 dark:border-white/20 px-3 py-2 text-[#1a1a1a] dark:text-white font-sans text-xs focus:border-[#ff6a00] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-700 dark:text-neutral-300 font-bold uppercase text-[11px]">
                  Remarks / Notes:
                </label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Optional claim notes or receipt serial #"
                  className="w-full bg-white dark:bg-black border border-[#1a1a1a]/20 dark:border-white/20 px-3 py-2 text-[#1a1a1a] dark:text-white font-sans text-xs focus:border-[#ff6a00] outline-none"
                />
              </div>

              <div className="pt-1 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="proxyAuthConfirmed"
                  checked={proxyAuthConfirmed}
                  onChange={(e) => setProxyAuthConfirmed(e.target.checked)}
                  className="accent-[#ff6a00] w-4 h-4 mt-0.5"
                />
                <label
                  htmlFor="proxyAuthConfirmed"
                  className="text-[11px] text-neutral-700 dark:text-neutral-300 cursor-pointer select-none leading-tight"
                >
                  I have physically verified the signed authorization letter and valid government ID of the representative.
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#1a1a1a]/15 dark:border-white/10">
              <button
                type="button"
                onClick={() => setProxyModalWinner(null)}
                className="flex-1 py-2 bg-[#f8f7f4] hover:bg-[#eae8e3] dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold uppercase text-xs border border-[#1a1a1a]/20 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProxyClaim}
                className="flex-1 py-2 bg-[#ff6a00] hover:bg-[#e05e00] text-black font-black uppercase text-xs shadow-lg"
              >
                Disburse to Proxy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Claim Modal */}
      {revertingWinner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/20 text-[#1a1a1a] dark:text-white w-full max-w-sm p-5 space-y-3 font-mono text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-red-600 dark:text-red-400 uppercase">Revert Claim Status?</h4>
            <p className="text-neutral-700 dark:text-neutral-300 leading-normal">
              Are you sure you want to revert <strong>{revertingWinner.name}</strong>&apos;s prize (
              {revertingWinner.prizeName}) back to <strong>UNCLAIMED</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRevertingWinner(null)}
                className="flex-1 py-2 bg-[#f8f7f4] dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-[#1a1a1a]/20 font-bold uppercase text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteUnclaim(revertingWinner.winnerId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs"
              >
                Revert to Unclaimed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Modal */}
      {forfeitingWinner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border-2 border-[#1a1a1a] dark:border-white/20 text-[#1a1a1a] dark:text-white w-full max-w-sm p-5 space-y-3 font-mono text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-red-600 dark:text-red-400 uppercase">Forfeit Prize?</h4>
            <p className="text-neutral-700 dark:text-neutral-300 leading-normal">
              Forfeit <strong>{forfeitingWinner.name}</strong>&apos;s prize ({forfeitingWinner.prizeName})?
            </p>
            <div className="space-y-1">
              <label className="text-neutral-600 dark:text-neutral-400 uppercase text-[10px]">Reason for Forfeiture:</label>
              <input
                type="text"
                value={forfeitReason}
                onChange={(e) => setForfeitReason(e.target.value)}
                className="w-full bg-white dark:bg-black border border-[#1a1a1a]/20 dark:border-white/20 px-2.5 py-1.5 text-[#1a1a1a] dark:text-white font-sans text-xs focus:border-red-500 outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setForfeitingWinner(null)}
                className="flex-1 py-2 bg-[#f8f7f4] dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-[#1a1a1a]/20 font-bold uppercase text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteForfeit}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs"
              >
                Confirm Forfeit
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Printable Claim Slip Receipt Overlay */}
      {printingWinner && (
        <ClaimSlipReceipt
          winner={printingWinner}
          onClose={() => setPrintingWinner(null)}
          stationId={stationId}
          officerName={officerName}
        />
      )}

      {/* Official 1/4 Letter Verification Stub Modal */}
      {verifyingStubWinner && (
        <WinnerVerificationStub
          winner={verifyingStubWinner}
          isModal={true}
          onClose={() => setVerifyingStubWinner(null)}
          onMarkPrinted={(id) => {
            if (onMarkAsPrinted) onMarkAsPrinted(id);
            setVerifyingStubWinner(null);
          }}
        />
      )}
    </div>
  );
};
