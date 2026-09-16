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
  FlipHorizontal
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { soundSynthesizer } from '../../lib/sound';
import { ClaimSlipReceipt } from './ClaimSlipReceipt';
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
  isCloudConfigured = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'UNCLAIMED' | 'ALL' | 'CLAIMED' | 'FORFEITED'>('UNCLAIMED');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);

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
      if (statusTab !== 'ALL' && w.claimStatus !== statusTab) {
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
  const totalValue = winners.reduce((sum, w) => sum + (w.unitValue || 0), 0);
  const disbursedValue = winners
    .filter((w) => w.claimStatus === 'CLAIMED')
    .reduce((sum, w) => sum + (w.unitValue || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in font-sans selection:bg-[#ff6a00] selection:text-white">
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
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
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
            className="px-3 py-1 bg-white text-emerald-950 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-50 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-800" />
            <span>Print Voucher</span>
          </button>
        </div>
      )}

      {/* Station Control & KPI Header */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-mono text-sm sm:text-base font-black text-[var(--ink)] uppercase tracking-wider">
                {stationId}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 font-bold uppercase tracking-wider">
                Fast Real-time Claiming
              </span>
            </div>
            <p className="font-mono text-xs text-[var(--ink-muted)] mt-0.5">
              Officer in-charge: <strong className="text-[var(--ink)]">{officerName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onRefreshCloud && isCloudConfigured && (
              <button
                onClick={onRefreshCloud}
                title="Refresh winners from Supabase Cloud"
                className="px-3 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                <span className="hidden sm:inline">Sync Cloud</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={winners.length === 0}
              className="px-3.5 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] disabled:opacity-30 border border-[var(--border)] text-[var(--ink)] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase font-bold tracking-wider block">
              Pending Unclaimed
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-black text-[var(--accent)] mt-0.5">
              {unclaimedCount}
            </div>
            <span className="text-[10px] text-[var(--ink-muted)]">Awaiting disbursement</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider block">
              Claimed &amp; Disbursed
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {claimedCount} <span className="text-xs text-[var(--ink-muted)] font-normal">/ {totalCount}</span>
            </div>
            <span className="text-[10px] text-[var(--ink-muted)]">Released to teachers</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase font-bold tracking-wider block">
              Value Disbursed
            </span>
            <div className="font-serif text-xl sm:text-2xl font-black text-[var(--ink)] mt-0.5">
              ₱{disbursedValue.toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--ink-muted)]">of ₱{totalValue.toLocaleString()} total</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--ink-muted)] uppercase font-bold tracking-wider block">
              Forfeited
            </span>
            <div className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink-muted)] mt-0.5">
              {forfeitedCount}
            </div>
            <span className="text-[10px] text-[var(--ink-muted)]">Expired / Absent</span>
          </div>
        </div>
      </div>

      {/* Main Responsive Claiming Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* BLOCK 1: Barcode Gun / Search & Live Camera QR Scanner */}
        <div className="order-1 lg:order-1 lg:col-span-7 lg:col-start-1 lg:row-start-1 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-sm space-y-4">
          {/* Hardware Barcode Gun, Quick Search & Camera QR Scanner Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-[var(--ink)]">
              <span className="flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Barcode Gun / Badge Scanner / Search</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  soundSynthesizer.playClick();
                  setIsCameraActive(!isCameraActive);
                }}
                className={`px-3 py-1 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 rounded-lg transition-all shadow-xs cursor-pointer ${
                  isCameraActive
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-[var(--accent)] hover:opacity-90 text-white'
                }`}
              >
                {isCameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{isCameraActive ? 'Close Camera' : 'Camera QR Scanner'}</span>
              </button>
            </div>

            <form onSubmit={handleScannerSubmit} className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan badge with gun, or search name / ID..."
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-[var(--ink)] focus:border-[var(--accent)] outline-none uppercase shadow-inner"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (scannerInputRef.current) scannerInputRef.current.focus();
                  }}
                  className="px-2.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Camera Viewport (When camera is active) */}
          {isCameraActive && (
            <div className="bg-[var(--surface)] border border-[var(--accent)] p-3.5 rounded-xl space-y-2 relative animate-fade-in shadow-xl">
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-bold text-[var(--ink)] uppercase">LIVE CAMERA QR SCANNER</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynthesizer.playClick();
                      setCameraFacingMode(cameraFacingMode === 'environment' ? 'user' : 'environment');
                    }}
                    title="Flip camera (Front/Back)"
                    className="p-1 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--ink)] flex items-center gap-1 text-[10px] font-mono px-2 cursor-pointer transition-colors"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                    <span>Flip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="p-1 rounded-md bg-[var(--surface-elevated)] hover:text-red-500 text-[var(--ink-muted)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-black/90 flex items-center justify-center min-h-[220px]">
                <div id={scannerContainerId} className="w-full max-w-sm mx-auto" />
              </div>

              <p className="text-center text-[10px] text-[var(--ink-muted)] font-mono">
                Hold the teacher&apos;s badge QR code steady in front of the lens for instant verification.
              </p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="bg-red-500/15 border border-red-500/40 p-3 rounded-lg text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{cameraError}</div>
              <button onClick={() => setCameraError(null)} className="text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* QR Scan Result Feedback Toast / Banner */}
          {scanFeedback && (
            <div
              className={`p-3 rounded-xl border shadow-lg flex items-center justify-between gap-3 text-xs font-mono animate-fade-in ${
                scanFeedback.status === 'MATCH'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-[var(--ink)]'
                  : 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {scanFeedback.status === 'MATCH' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    {scanFeedback.status === 'MATCH' ? 'QR BADGE MATCH VERIFIED' : 'NO WINNING RECORD FOUND'}
                  </div>
                  <div className="font-bold text-sm uppercase truncate text-[var(--ink)]">
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
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold uppercase text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Verify Recipient</span>
                    <span className="sm:hidden">Verify</span>
                  </button>
                )}
                <button
                  onClick={() => setScanFeedback(null)}
                  className="p-1 hover:bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BLOCK 2: Selected Winner Verification & Actions */}
        <div
          ref={verificationCardRef}
          className="order-2 lg:order-2 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <span>DISBURSEMENT VERIFICATION</span>
            </h3>
            {selectedWinner && (
              <span className="font-mono text-[11px] font-bold text-[var(--accent)]">
                {selectedWinner.winnerId}
              </span>
            )}
          </div>

          {selectedWinner ? (
            <div className="space-y-4">
              {/* Prize Header Card */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-center space-y-1 shadow-sm">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] block">
                  PRIZE TO BE DISBURSED
                </span>
                <div className="font-display font-bold text-xl text-[var(--ink)] uppercase tracking-tight">
                  {selectedWinner.prizeName}
                </div>
                {selectedWinner.unitValue > 0 && (
                  <div className="font-mono text-xs font-bold text-[var(--accent)]">
                    Valuation: ₱{selectedWinner.unitValue.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Recipient Details */}
              <div className="rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-start pb-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-muted)]">Recipient:</span>
                  <strong className="text-[var(--ink)] uppercase font-sans text-sm text-right">
                    {selectedWinner.name}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">District:</span>
                  <span className="px-2 py-0.2 bg-black text-white font-bold border border-white/10 uppercase text-[10px]">
                    {selectedWinner.district}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-neutral-400">School:</span>
                  <span className="text-neutral-200 text-right max-w-[200px] truncate">
                    {selectedWinner.school}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Role / Position:</span>
                  <span className="text-neutral-300">
                    {selectedWinner.position} ({selectedWinner.personnelType})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Profiling ID:</span>
                  <span className="text-neutral-300 font-bold">{selectedWinner.participantId}</span>
                </div>
                {selectedWinner.depedId && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">DepEd ID:</span>
                    <span className="text-neutral-300 font-bold">{selectedWinner.depedId}</span>
                  </div>
                )}
                {selectedWinner.contactNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Contact:</span>
                    <span className="text-neutral-300">{selectedWinner.contactNumber}</span>
                  </div>
                )}
              </div>

              {/* Status Section */}
              {selectedWinner.claimStatus === 'CLAIMED' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase font-mono">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>PRIZE OFFICIALLY DISBURSED</span>
                  </div>
                  <div className="font-mono text-xs text-[var(--ink)] space-y-1">
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
                      <div className="text-amber-500">
                        Proxy: <strong>{selectedWinner.proxyName}</strong> ({selectedWinner.proxyRelationship})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                    <button
                      onClick={() => setPrintingWinner(selectedWinner)}
                      className="flex-1 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] text-[var(--ink)] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer border border-[var(--border)]"
                    >
                      <Printer className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                      <span>Print Voucher Slip</span>
                    </button>

                    {onUnclaimPrize && (
                      <button
                        onClick={() => setRevertingWinner(selectedWinner)}
                        className="px-3 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-red-500/10 border border-[var(--border)] text-[var(--ink-muted)] hover:text-red-500 font-mono text-xs transition-colors cursor-pointer"
                        title="Revert Claim Status to Unclaimed"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedWinner.claimStatus === 'FORFEITED' ? (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase font-mono">
                    <AlertTriangle className="w-5 h-5" />
                    <span>PRIZE FORFEITED</span>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] font-mono">
                    Reason: {selectedWinner.forfeitReason || 'Absent / Unclaimed by deadline'}
                  </p>
                  {onUnclaimPrize && (
                    <button
                      onClick={() => handleExecuteUnclaim(selectedWinner.winnerId)}
                      className="w-full py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-mono text-xs font-bold uppercase cursor-pointer"
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
                        className="w-full py-3.5 sm:py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] ring-2 ring-white animate-pulse cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 fill-black text-amber-500 shrink-0" />
                        <span className="truncate">
                          ⚠️ TAP TO CONFIRM DISBURSEMENT
                        </span>
                      </button>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)] px-1">
                        <span>Tap again to disburse to {selectedWinner.name.split(' ')[0]}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
                            setConfirmingWinnerId(null);
                          }}
                          className="text-[var(--accent)] hover:underline font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDisburseTrigger(selectedWinner)}
                      className="w-full py-3.5 sm:py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Zap className="w-5 h-5 fill-current" />
                      <span>⚡ 1-CLICK FAST DISBURSE</span>
                    </button>
                  )}

                  {/* Safety confirmation mode toggle */}
                  <div className="flex items-center justify-between px-1 text-[10px] font-mono text-[var(--ink-muted)]">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={safeConfirmationMode}
                        onChange={(e) => {
                          setSafeConfirmationMode(e.target.checked);
                          setConfirmingWinnerId(null);
                        }}
                        className="accent-[var(--accent)] w-3.5 h-3.5"
                      />
                      <span>2-Tap Mobile Safe Confirmation</span>
                    </label>
                    {safeConfirmationMode ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🛡️ Protected against mis-clicks</span>
                    ) : (
                      <span className="text-amber-500 font-bold">⚠️ Instant 1-tap</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setProxyModalWinner(selectedWinner);
                        setProxyName('');
                        setProxyRelationship('');
                        setProxyAuthConfirmed(false);
                        setClaimNotes('');
                      }}
                      className="py-2.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Proxy Claim</span>
                    </button>

                    <button
                      onClick={() => setPrintingWinner(selectedWinner)}
                      className="py-2.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                      <span>Preview Slip</span>
                    </button>
                  </div>

                  {onForfeitPrize && (
                    <button
                      onClick={() => setForfeitingWinner(selectedWinner)}
                      className="w-full py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-red-500/10 border border-[var(--border)] hover:border-red-500/40 text-[var(--ink-muted)] hover:text-red-500 font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Mark as Forfeited (Absent / Expired)
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-[var(--surface-elevated)] border border-dashed border-[var(--border)] text-[var(--ink-muted)] font-mono text-xs">
              Select a winner ticket from the list or scan a badge to start disbursement.
            </div>
          )}
        </div>

        {/* BLOCK 3: Winners Table / Queue (Mobile Order 3, Desktop Order 3 / Left Bottom Column) */}
        <div className="order-3 lg:order-3 lg:col-span-7 lg:col-start-1 lg:row-start-2 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-sm space-y-3">
          {/* Queue Tab Selectors & District Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--border)] text-xs font-mono">
            <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden divide-x divide-[var(--border)] bg-[var(--surface)] max-w-full overflow-x-auto">
              <button
                onClick={() => setStatusTab('UNCLAIMED')}
                className={`px-3 py-1.5 font-bold uppercase flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'UNCLAIMED'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Unclaimed ({unclaimedCount})</span>
              </button>
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'ALL'
                    ? 'bg-[var(--surface-elevated)] text-[var(--ink)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setStatusTab('CLAIMED')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'CLAIMED'
                    ? 'bg-emerald-600 text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Claimed ({claimedCount})
              </button>
              <button
                onClick={() => setStatusTab('FORFEITED')}
                className={`px-3 py-1.5 font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                  statusTab === 'FORFEITED'
                    ? 'bg-red-600 text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Forfeited ({forfeitedCount})
              </button>
            </div>

            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold text-[var(--ink)] outline-none focus:border-[var(--accent)] uppercase w-full sm:w-auto cursor-pointer"
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
              <div className="p-8 text-center rounded-xl bg-[var(--surface-elevated)] border border-dashed border-[var(--border)] text-[var(--ink-muted)] font-mono text-xs">
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
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative select-none ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--surface-elevated)] shadow-md ring-2 ring-[var(--accent-glow)]'
                        : isClaimed
                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                        : isForfeited
                        ? 'border-red-500/20 bg-red-500/5 opacity-70'
                        : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface-card)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[var(--accent)]">
                            {w.winnerId}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--border)] uppercase">
                            {w.district}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                            {w.participantId}
                          </span>
                          {w.drawNumber && (
                            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                              • {w.drawNumber}
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-sm text-[var(--ink)] uppercase tracking-tight truncate">
                          {w.name}
                        </div>

                        <div className="text-xs text-[var(--ink-muted)] truncate">
                          {w.school} • <span>{w.position}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-bold text-xs text-[var(--ink)] uppercase max-w-[150px] sm:max-w-[180px] truncate">
                          {w.prizeName}
                        </div>

                        {/* Status Badge */}
                        <div className="inline-block">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1 ${
                              isClaimed
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : isForfeited
                                ? 'bg-red-500/15 text-red-500 border border-red-500/30 line-through'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
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
                    <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                        {isClaimed
                          ? `Disbursed: ${w.claimedAt || 'Yes'}`
                          : `Won: ${w.date} ${w.time}`}
                      </span>

                      {!isClaimed && !isForfeited ? (
                        <div className="flex items-center gap-1">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--accent)] text-white font-mono font-bold text-[10px] uppercase flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Active in Verification</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--ink)] font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                              <span>Verify &amp; Disburse</span>
                              <ChevronRight className="w-3 h-3 text-[var(--accent)]" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink)] w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-bold uppercase tracking-wider">
                  Authorized Proxy Claim
                </h3>
              </div>
              <button
                onClick={() => setProxyModalWinner(null)}
                className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[var(--surface-elevated)] p-3.5 rounded-xl border border-[var(--border)] space-y-1">
              <span className="text-[10px] text-[var(--ink-muted)] uppercase">Winning Teacher:</span>
              <div className="font-bold text-sm text-[var(--ink)] uppercase font-sans">
                {proxyModalWinner.name}
              </div>
              <div className="text-[11px] text-[var(--accent)] font-bold">
                Prize: {proxyModalWinner.prizeName}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[var(--ink-muted)] font-bold uppercase text-[11px]">
                  Representative / Proxy Full Name:
                </label>
                <input
                  type="text"
                  value={proxyName}
                  onChange={(e) => setProxyName(e.target.value)}
                  placeholder="e.g. Maria Santos (Spouse / Co-Teacher)"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-sans text-xs focus:border-[var(--accent)] outline-none uppercase"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--ink-muted)] font-bold uppercase text-[11px]">
                  Relationship to Teacher:
                </label>
                <input
                  type="text"
                  value={proxyRelationship}
                  onChange={(e) => setProxyRelationship(e.target.value)}
                  placeholder="e.g. Spouse / School Representative / Principal"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-sans text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--ink-muted)] font-bold uppercase text-[11px]">
                  ID Presented by Proxy:
                </label>
                <input
                  type="text"
                  value={proxyIdPresented}
                  onChange={(e) => setProxyIdPresented(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-sans text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--ink-muted)] font-bold uppercase text-[11px]">
                  Remarks / Notes:
                </label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Optional claim notes or receipt serial #"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] font-sans text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div className="pt-1 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="proxyAuthConfirmed"
                  checked={proxyAuthConfirmed}
                  onChange={(e) => setProxyAuthConfirmed(e.target.checked)}
                  className="accent-[var(--accent)] w-4 h-4 mt-0.5"
                />
                <label
                  htmlFor="proxyAuthConfirmed"
                  className="text-[11px] text-[var(--ink-muted)] cursor-pointer select-none leading-tight"
                >
                  I have physically verified the signed authorization letter and valid government ID of the representative.
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setProxyModalWinner(null)}
                className="flex-1 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] font-bold uppercase text-xs border border-[var(--border)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProxyClaim}
                className="flex-1 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold uppercase text-xs shadow-md cursor-pointer"
              >
                Disburse to Proxy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Claim Modal */}
      {revertingWinner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink)] w-full max-w-sm rounded-2xl p-5 space-y-3 font-mono text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-red-500 uppercase">Revert Claim Status?</h4>
            <p className="text-[var(--ink-muted)] leading-normal">
              Are you sure you want to revert <strong className="text-[var(--ink)]">{revertingWinner.name}</strong>&apos;s prize (
              {revertingWinner.prizeName}) back to <strong>UNCLAIMED</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRevertingWinner(null)}
                className="flex-1 py-2 rounded-lg bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] font-bold uppercase text-xs cursor-pointer border border-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteUnclaim(revertingWinner.winnerId)}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs cursor-pointer"
              >
                Revert to Unclaimed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Modal */}
      {forfeitingWinner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] text-[var(--ink)] w-full max-w-sm rounded-2xl p-5 space-y-3 font-mono text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-red-500 uppercase">Forfeit Prize?</h4>
            <p className="text-[var(--ink-muted)] leading-normal">
              Forfeit <strong className="text-[var(--ink)]">{forfeitingWinner.name}</strong>&apos;s prize ({forfeitingWinner.prizeName})?
            </p>
            <div className="space-y-1">
              <label className="text-[var(--ink-muted)] uppercase text-[10px]">Reason for Forfeiture:</label>
              <input
                type="text"
                value={forfeitReason}
                onChange={(e) => setForfeitReason(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--ink)] font-sans text-xs focus:border-red-500 outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setForfeitingWinner(null)}
                className="flex-1 py-2 rounded-lg bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] font-bold uppercase text-xs cursor-pointer border border-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteForfeit}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs cursor-pointer"
              >
                Confirm Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Claim Slip Receipt Overlay */}
      {printingWinner && (
        <ClaimSlipReceipt
          winner={printingWinner}
          onClose={() => setPrintingWinner(null)}
          stationId={stationId}
          officerName={officerName}
        />
      )}
    </div>
  );
};
