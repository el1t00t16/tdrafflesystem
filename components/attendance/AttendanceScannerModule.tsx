'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  QrCode,
  Camera,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Users,
  Building2,
  Sparkles,
  RefreshCw,
  Database,
  Copy,
  Check,
  UserCheck,
  UserX,
  Volume2,
  VolumeX,
  Clock,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Participant, District, AttendanceRecord } from '../../lib/types';
import { soundSynthesizer } from '../../lib/sound';
import {
  isSupabaseConfigured,
  SUPABASE_SQL_SCHEMA,
  pushAttendanceToSupabase,
  getSupabaseCredentials,
  setSupabaseCredentials,
  testSupabaseConnection,
  batchSyncParticipantsToSupabase,
  fetchParticipantsFromSupabase,
  fetchAttendanceRecordsFromSupabase,
  subscribeToRealtimeUpdates
} from '../../lib/supabase';

interface AttendanceScannerModuleProps {
  participants: Participant[];
  onUpdateParticipant: (updated: Participant) => void;
  onBatchUpdateParticipants?: (updated: Participant[]) => void;
  attendanceRecords?: AttendanceRecord[];
  onAddAttendanceRecord?: (record: AttendanceRecord) => void;
  initialStationId?: string;
  initialOfficerName?: string;
  isStandaloneGate?: boolean;
}

export const AttendanceScannerModule: React.FC<AttendanceScannerModuleProps> = ({
  participants,
  onUpdateParticipant,
  onBatchUpdateParticipants,
  attendanceRecords = [],
  onAddAttendanceRecord,
  initialStationId,
  initialOfficerName,
  isStandaloneGate = false
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'camera' | 'gun' | 'manual' | 'badges' | 'logs' | 'supabase'>('camera');

  // Scanner Station settings
  const [stationId, setStationId] = useState<string>(() => initialStationId || 'Station 1 - Main Entrance');
  const [officerName, setOfficerName] = useState<string>(() => initialOfficerName || 'Attendance Desk');
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);

  useEffect(() => {
    if (initialStationId) setStationId(initialStationId);
  }, [initialStationId]);

  useEffect(() => {
    if (initialOfficerName) setOfficerName(initialOfficerName);
  }, [initialOfficerName]);

  // Verification Display states
  const [lastScannedResult, setLastScannedResult] = useState<{
    status: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND';
    participant?: Participant;
    rawText: string;
    timestamp: string;
    message: string;
  } | null>(null);

  // Camera Scanner states
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5qr-attendance-reader';

  // Barcode Gun states
  const gunInputRef = useRef<HTMLInputElement | null>(null);
  const [gunInputValue, setGunInputValue] = useState<string>('');

  // Manual search states
  const [manualSearch, setManualSearch] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ELIGIBLE' | 'INELIGIBLE'>('ALL');

  // Badge print states
  const [badgeSearch, setBadgeSearch] = useState<string>('');
  const [badgeDistrict, setBadgeDistrict] = useState<string>('ALL');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  // Supabase live configuration states
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => getSupabaseCredentials().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(() => getSupabaseCredentials().anonKey);
  const [supabaseSource, setSupabaseSource] = useState<'ENV' | 'LOCAL_STORAGE' | 'NONE'>(
    () => getSupabaseCredentials().source
  );
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [isSyncingParticipants, setIsSyncingParticipants] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const handleTestSupabase = async () => {
    setTestStatus({ loading: true });
    const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestStatus({ loading: false, success: result.success, message: result.message });
  };

  const handleSaveSupabaseCreds = () => {
    setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    const creds = getSupabaseCredentials();
    setSupabaseSource(creds.source);
    setTestStatus({
      loading: false,
      success: true,
      message: 'Supabase credentials saved and active across all scanner stations!'
    });
  };

  const handleClearSupabaseCreds = () => {
    setSupabaseCredentials('', '');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setSupabaseSource('NONE');
    setTestStatus({ loading: false, message: 'Supabase credentials cleared.' });
  };

  // Deduplicated attendance records for accurate counts and display
  const uniqueAttendanceRecords = useMemo(() => {
    const seen = new Set<string>();
    const list: AttendanceRecord[] = [];
    for (const r of attendanceRecords) {
      const key = r.id || r.participantId;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(r);
      }
    }
    return list;
  }, [attendanceRecords]);

  // Live Realtime sync listener across multiple scanner stations
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = subscribeToRealtimeUpdates({
      onAttendanceScan: (record) => {
        if (onAddAttendanceRecord) {
          onAddAttendanceRecord(record);
        }
        const target = participants.find((p) => p.id === record.participantId);
        if (target && target.eligible !== 'ELIGIBLE') {
          onUpdateParticipant({
            ...target,
            eligible: 'ELIGIBLE',
            attendedAt: record.scannedAt,
            attendedBy: `${record.scannerOfficer} (${record.stationId})`
          });
        }
      },
      onParticipantChange: (change) => {
        const target = participants.find((p) => p.id === change.id);
        if (target) {
          onUpdateParticipant({
            ...target,
            eligible: (change.eligible as any) || target.eligible,
            winner: (change.winner as any) || target.winner,
            attendedAt: change.attended_at || target.attendedAt,
            attendedBy: change.attended_by || target.attendedBy
          });
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [participants, onAddAttendanceRecord, onUpdateParticipant]);

  const handlePullFromSupabase = async () => {
    setIsSyncingParticipants(true);
    setSyncProgress('Pulling live records from Supabase...');

    try {
      const [cloudParts, cloudAtt] = await Promise.all([
        fetchParticipantsFromSupabase(),
        fetchAttendanceRecordsFromSupabase()
      ]);

      if (cloudParts && cloudParts.length > 0) {
        if (onBatchUpdateParticipants) {
          onBatchUpdateParticipants(cloudParts);
        } else {
          cloudParts.forEach((p) => onUpdateParticipant(p));
        }
      }

      if (cloudAtt && cloudAtt.length > 0 && onAddAttendanceRecord) {
        cloudAtt.forEach((r) => onAddAttendanceRecord(r));
      }

      setSyncProgress(
        `Cloud sync complete! Loaded ${cloudParts?.length || 0} participants and ${cloudAtt?.length || 0} scan records.`
      );
    } catch (e: any) {
      setSyncProgress(`Pull error: ${e.message}`);
    } finally {
      setIsSyncingParticipants(false);
    }
  };

  const handlePushAllParticipants = async () => {
    if (participants.length === 0) {
      alert('No participants loaded to sync.');
      return;
    }
    setIsSyncingParticipants(true);
    setSyncProgress(`0 / ${participants.length} pushed...`);

    const res = await batchSyncParticipantsToSupabase(participants, (processed, total) => {
      setSyncProgress(`${processed.toLocaleString()} / ${total.toLocaleString()} synced`);
    });

    setIsSyncingParticipants(false);
    if (res.success) {
      setSyncProgress(`Successfully synced ${res.count.toLocaleString()} teachers to Supabase!`);
    } else {
      setSyncProgress(`Sync error: ${res.error}`);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = participants.length;
    const present = participants.filter((p) => p.eligible === 'ELIGIBLE' || p.attendedAt).length;
    const absent = total - present;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

    const districts: Record<District, { total: number; present: number }> = {
      NORTH: { total: 0, present: 0 },
      SOUTH: { total: 0, present: 0 },
      EAST: { total: 0, present: 0 },
      WEST: { total: 0, present: 0 },
      PRIVATE: { total: 0, present: 0 }
    };

    participants.forEach((p) => {
      const d = p.district as District;
      if (districts[d]) {
        districts[d].total++;
        if (p.eligible === 'ELIGIBLE' || p.attendedAt) {
          districts[d].present++;
        }
      }
    });

    return { total, present, absent, rate, districts };
  }, [participants]);

  // Clean and find participant from raw scanned code
  const resolveScannedCode = useCallback(
    (code: string): Participant | undefined => {
      const clean = code.trim();
      if (!clean) return undefined;

      // Try exact Profiling ID match
      let match = participants.find((p) => (p.id || '').toLowerCase() === clean.toLowerCase());
      if (match) return match;

      // Try DepEd ID match
      match = participants.find((p) => p.depedId && (p.depedId || '').toLowerCase() === clean.toLowerCase());
      if (match) return match;

      // Try JSON format match
      try {
        if (clean.startsWith('{') && clean.endsWith('}')) {
          const parsed = JSON.parse(clean);
          const id = parsed.id || parsed.profilingId || parsed.depedId;
          if (id) {
            const idStr = String(id).toLowerCase();
            match = participants.find(
              (p) => (p.id || '').toLowerCase() === idStr || (p.depedId && (p.depedId || '').toLowerCase() === idStr)
            );
            if (match) return match;
          }
        }
      } catch (e) {
        // ignore json parse error
      }

      // Try matching inside URL query param
      if (clean.includes('=')) {
        const parts = clean.split(/[?&=]/);
        for (const part of parts) {
          const partStr = part.toLowerCase();
          match = participants.find((p) => (p.id || '').toLowerCase() === partStr);
          if (match) return match;
        }
      }

      return undefined;
    },
    [participants]
  );

  // Process a scanned participant
  const handleProcessScan = useCallback(
    (rawCode: string, method: 'CAMERA_QR' | 'BARCODE_GUN' | 'MANUAL_ENTRY') => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const participant = resolveScannedCode(rawCode);

      if (!participant) {
        if (audioFeedback) soundSynthesizer.playCountdownTick();
        const emptyWarning = participants.length === 0
          ? ` However, this scanner currently has 0 registered participants loaded. Please sync with Supabase Cloud or import the participant roster.`
          : '';
        setLastScannedResult({
          status: 'NOT_FOUND',
          rawText: rawCode,
          timestamp: now,
          message: `Scanned code "${rawCode}" does not match any registered participant in the profiling database.${emptyWarning}`
        });
        return;
      }

      // Check if already checked in
      const isAlreadyCheckedIn = participant.eligible === 'ELIGIBLE' && Boolean(participant.attendedAt);
      if (isAlreadyCheckedIn) {
        if (audioFeedback) soundSynthesizer.playCountdownTick();
        setLastScannedResult({
          status: 'DUPLICATE',
          participant,
          rawText: rawCode,
          timestamp: now,
          message: `Participant has already checked in on ${participant.attendedAt} via ${participant.attendedBy || 'Attendance Desk'}.`
        });
        return;
      }

      // Mark as PRESENT & ELIGIBLE
      const updatedParticipant: Participant = {
        ...participant,
        eligible: 'ELIGIBLE',
        attendedAt: now,
        attendedBy: `${officerName} (${stationId})`
      };

      onUpdateParticipant(updatedParticipant);

      const record: AttendanceRecord = {
        id: `ATT-${String(attendanceRecords.length + 1).padStart(4, '0')}`,
        participantId: participant.id,
        depedId: participant.depedId,
        name: participant.fullName,
        district: participant.district,
        school: participant.school,
        position: participant.position,
        scannedAt: now,
        stationId,
        scannerOfficer: officerName,
        method
      };

      if (onAddAttendanceRecord) {
        onAddAttendanceRecord(record);
      }

      // Push to Supabase if configured
      if (isSupabaseConfigured()) {
        pushAttendanceToSupabase(record).catch(console.error);
      }

      if (audioFeedback) {
        soundSynthesizer.playSuccess();
      }

      setLastScannedResult({
        status: 'SUCCESS',
        participant: updatedParticipant,
        rawText: rawCode,
        timestamp: now,
        message: 'Attendance confirmed! Teacher is now ELIGIBLE for the raffle draw.'
      });
    },
    [resolveScannedCode, audioFeedback, officerName, stationId, onUpdateParticipant, attendanceRecords.length, onAddAttendanceRecord]
  );

  // Camera scanner lifecycle
  useEffect(() => {
    let isSubscribed = true;

    if (activeTab === 'camera' && cameraActive) {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerInstanceRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 }
          },
          (decodedText) => {
            if (isSubscribed) {
              handleProcessScan(decodedText, 'CAMERA_QR');
            }
          },
          () => {
            // scan error per frame - normal
          }
        )
        .catch((err) => {
          if (isSubscribed) {
            console.error('Camera QR scan error:', err);
            setCameraError('Unable to access camera. Please check browser permissions or use the Barcode Gun / Manual search.');
            setCameraActive(false);
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
  }, [activeTab, cameraActive, handleProcessScan]);

  // Keep gun input focused when on gun tab
  useEffect(() => {
    if (activeTab === 'gun' && gunInputRef.current) {
      gunInputRef.current.focus();
    }
  }, [activeTab]);

  // Generate QR Codes for the first 30 visible items in Badges tab
  const badgeFiltered = useMemo(() => {
    return participants.filter((p) => {
      if (badgeDistrict !== 'ALL' && p.district !== badgeDistrict) return false;
      if (badgeSearch) {
        const q = badgeSearch.toLowerCase();
        return (
          (p.fullName || '').toLowerCase().includes(q) ||
          (p.id || '').toLowerCase().includes(q) ||
          (p.depedId ? String(p.depedId).toLowerCase().includes(q) : false) ||
          (p.school || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [participants, badgeDistrict, badgeSearch]);

  useEffect(() => {
    if (activeTab === 'badges') {
      const generateVisibleQrs = async () => {
        const slice = badgeFiltered.slice(0, 40);
        const map: Record<string, string> = {};
        for (const p of slice) {
          try {
            const url = await QRCode.toDataURL(p.id, {
              width: 160,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            map[p.id] = url;
          } catch (e) {
            console.error(e);
          }
        }
        setQrDataUrls((prev) => ({ ...prev, ...map }));
      };
      generateVisibleQrs();
    }
  }, [activeTab, badgeFiltered]);

  // Manual list filtering
  const manualFiltered = useMemo(() => {
    return participants.filter((p) => {
      if (selectedDistrict !== 'ALL' && p.district !== selectedDistrict) return false;
      if (filterStatus === 'ELIGIBLE' && p.eligible !== 'ELIGIBLE') return false;
      if (filterStatus === 'INELIGIBLE' && p.eligible === 'ELIGIBLE') return false;
      if (manualSearch) {
        const q = manualSearch.toLowerCase();
        return (
          (p.fullName || '').toLowerCase().includes(q) ||
          (p.id || '').toLowerCase().includes(q) ||
          (p.depedId ? String(p.depedId).toLowerCase().includes(q) : false) ||
          (p.school || '').toLowerCase().includes(q) ||
          (p.position || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [participants, selectedDistrict, filterStatus, manualSearch]);

  // Export Attendance CSV
  const handleExportAttendanceCsv = () => {
    soundSynthesizer.playClick();
    const headers = [
      'Profiling ID',
      'DepEd Employee ID',
      'Full Name',
      'District',
      'Original District',
      'Personnel Type',
      'School',
      'Position',
      'Attendance Status',
      'Raffle Eligibility',
      'Attended At',
      'Attended By / Station',
      'Contact Number'
    ];

    const rows = participants.map((p) => [
      `"${p.id}"`,
      `"${p.depedId || ''}"`,
      `"${p.fullName.replace(/"/g, '""')}"`,
      `"${p.district}"`,
      `"${p.originalDistrict || ''}"`,
      `"${p.personnelType}"`,
      `"${p.school.replace(/"/g, '""')}"`,
      `"${p.position.replace(/"/g, '""')}"`,
      p.eligible === 'ELIGIBLE' || p.attendedAt ? '"PRESENT"' : '"ABSENT"',
      `"${p.eligible}"`,
      `"${p.attendedAt || ''}"`,
      `"${p.attendedBy || ''}"`,
      `"${p.contactNumber || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Malungon_TeachersDay2026_Attendance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Offline Disaster Recovery: Merge Attendance CSV from other offline scanner devices
  const handleImportAttendanceCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let text = (evt.target?.result as string) || '';
        if (!text.trim()) {
          alert('Selected file is empty.');
          return;
        }

        // 1. Strip UTF-8 BOM if present
        text = text.replace(/^\uFEFF/, '');

        // 2. Split lines and filter empty lines
        const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (rawLines.length === 0) {
          alert('CSV file contains no readable rows.');
          return;
        }

        // 3. Auto-detect delimiter from the first line
        const firstLine = rawLines[0];
        let delimiter = ',';
        if (firstLine.includes('\t')) {
          delimiter = '\t';
        } else if (firstLine.includes(';') && !firstLine.includes(',')) {
          delimiter = ';';
        }

        // Safe RFC-compliant row tokenizer
        const parseRow = (lineStr: string): string[] => {
          const cells: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let c = 0; c < lineStr.length; c++) {
            const char = lineStr[c];
            const nextChar = lineStr[c + 1];

            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                current += '"';
                c++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === delimiter && !inQuotes) {
              cells.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cells.push(current.trim());
          return cells;
        };

        // 4. Inspect header row
        const firstCells = parseRow(rawLines[0]);
        const headerTokens = firstCells.map((h) => h.replace(/["']/g, '').trim().toLowerCase());

        let idIdx = headerTokens.findIndex(
          (h) => h.includes('profiling') || h === 'id' || h.includes('ticket') || h.includes('code') || h.includes('qr')
        );
        let depedIdIdx = headerTokens.findIndex((h) => h.includes('deped') || h.includes('employee'));
        let nameIdx = headerTokens.findIndex((h) => h.includes('name') || h.includes('teacher'));
        let statusIdx = headerTokens.findIndex(
          (h) => h.includes('status') || h.includes('attendance') || h.includes('eligib')
        );
        let attendedAtIdx = headerTokens.findIndex(
          (h) => h.includes('attended at') || h.includes('scanned') || h.includes('time') || h.includes('timestamp')
        );
        let attendedByIdx = headerTokens.findIndex(
          (h) => h.includes('attended by') || h.includes('station') || h.includes('officer')
        );

        // Check if first row is actually data (no headers present)
        const hasHeaders = idIdx >= 0 || depedIdIdx >= 0 || nameIdx >= 0 || statusIdx >= 0;
        const startLine = hasHeaders ? 1 : 0;
        if (!hasHeaders) {
          idIdx = 0; // Default first column to ID if no recognized headers
        }

        let importedCount = 0;
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const updatedList = [...participants];

        for (let i = startLine; i < rawLines.length; i++) {
          const lineStr = rawLines[i];
          if (!lineStr) continue;

          const cells = parseRow(lineStr);
          if (cells.length === 0) continue;

          const rawId = (idIdx >= 0 && cells[idIdx] ? cells[idIdx] : cells[0] || '').replace(/["']/g, '').trim();
          const rawDepedId = (depedIdIdx >= 0 && cells[depedIdIdx] ? cells[depedIdIdx] : '').replace(/["']/g, '').trim();
          const rawName = (nameIdx >= 0 && cells[nameIdx] ? cells[nameIdx] : '').replace(/["']/g, '').trim();
          const rawStatus = (statusIdx >= 0 && cells[statusIdx] ? cells[statusIdx] : '').replace(/["']/g, '').trim().toUpperCase();

          // Skip row if explicitly recorded as ABSENT or INELIGIBLE
          if (rawStatus === 'ABSENT' || rawStatus === 'INELIGIBLE' || rawStatus === 'NO') {
            continue;
          }

          // Search matching participant in master list
          let targetIndex = -1;

          // 1st Priority: Match by Profiling ID
          if (rawId) {
            const searchId = String(rawId).toLowerCase();
            targetIndex = updatedList.findIndex(
              (p) => (p.id || '').toLowerCase() === searchId
            );
          }

          // 2nd Priority: Match by DepEd Employee ID
          if (targetIndex === -1 && (rawDepedId || rawId)) {
            const searchDeped = String(rawDepedId || rawId).toLowerCase();
            targetIndex = updatedList.findIndex(
              (p) => (p.depedId ? String(p.depedId).toLowerCase() === searchDeped : false)
            );
          }

          // 3rd Priority: Match by Full Name
          if (targetIndex === -1 && rawName) {
            const searchName = String(rawName).toLowerCase();
            targetIndex = updatedList.findIndex(
              (p) => (p.fullName || '').toLowerCase() === searchName
            );
          }

          // If participant found and not already eligible, mark them PRESENT
          if (targetIndex >= 0) {
            const currentP = updatedList[targetIndex];
            if (currentP.eligible !== 'ELIGIBLE') {
              const scannedTime = (attendedAtIdx >= 0 && cells[attendedAtIdx] ? cells[attendedAtIdx].replace(/["']/g, '').trim() : '') || now;
              const scannedBy = (attendedByIdx >= 0 && cells[attendedByIdx] ? cells[attendedByIdx].replace(/["']/g, '').trim() : '') || 'Offline CSV Import';

              const updatedParticipant: Participant = {
                ...currentP,
                eligible: 'ELIGIBLE',
                attendedAt: scannedTime,
                attendedBy: scannedBy
              };

              updatedList[targetIndex] = updatedParticipant;
              importedCount++;

              if (onAddAttendanceRecord) {
                onAddAttendanceRecord({
                  id: `ATT-OFFLINE-${String(Date.now()).slice(-5)}-${i}`,
                  participantId: currentP.id,
                  depedId: currentP.depedId,
                  name: currentP.fullName,
                  district: currentP.district,
                  school: currentP.school,
                  position: currentP.position,
                  scannedAt: scannedTime,
                  stationId: scannedBy,
                  scannerOfficer: 'Offline Sync',
                  method: 'MANUAL_ENTRY'
                });
              }
            }
          }
        }

        if (importedCount > 0) {
          if (onBatchUpdateParticipants) {
            onBatchUpdateParticipants(updatedList);
          } else {
            updatedList.forEach((p) => onUpdateParticipant(p));
          }
          soundSynthesizer.playSuccess();
          alert(`Successfully merged ${importedCount} offline attendees into the active raffle pool!`);
        } else {
          soundSynthesizer.playCountdownTick();
          alert('No new attendees were merged. Either all participants in the file were already marked PRESENT, or the IDs did not match your loaded roster.');
        }
      } catch (err: any) {
        console.error('Failed to import attendance CSV:', err);
        alert(`Failed to parse attendance CSV file: ${err?.message || 'Unknown error'}. Please verify the file format.`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    soundSynthesizer.playClick();
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div id="attendance-station-container" className="w-full flex flex-col gap-5">
      {/* Top Header & Operational Banner */}
      <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-4 sm:p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-sm bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00]">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-mono font-bold tracking-tight text-[#1a1a1a] dark:text-white uppercase">
                Attendance &amp; Eligibility Station
              </h1>
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-[#22c55e]/20 text-emerald-700 dark:text-[#22c55e] border border-[#22c55e]/30">
                LIVE GATE SCANNER
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-[#a1a1aa] mt-0.5">
              Only scanned attendees become <strong className="text-[#1a1a1a] dark:text-white">ELIGIBLE</strong> for the Municipal Teachers&apos; Day 2026 raffle.
            </p>
          </div>
        </div>

        {/* Station Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-[#f8f7f4] dark:bg-[#27272a] px-2.5 py-1.5 rounded-sm border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-xs">
            <span className="text-neutral-600 dark:text-[#a1a1aa] text-[11px] uppercase tracking-wider font-mono">Station:</span>
            {isStandaloneGate ? (
              <span className="text-emerald-700 dark:text-[#22c55e] font-mono font-bold text-xs max-w-[200px] truncate" title={stationId}>
                {stationId}
              </span>
            ) : (
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="bg-transparent text-[#1a1a1a] dark:text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="Station 1 - Main Entrance" className="bg-white text-black dark:bg-[#18181b] dark:text-white">Station 1 - Main Entrance</option>
                <option value="Station 2 - North Gate" className="bg-white text-black dark:bg-[#18181b] dark:text-white">Station 2 - North Gate</option>
                <option value="Station 3 - South Gate" className="bg-white text-black dark:bg-[#18181b] dark:text-white">Station 3 - South Gate</option>
                <option value="Station 4 - VIP / Fast Track" className="bg-white text-black dark:bg-[#18181b] dark:text-white">Station 4 - VIP / Fast Track</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[#f8f7f4] dark:bg-[#27272a] px-2.5 py-1.5 rounded-sm border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-xs">
            <span className="text-neutral-600 dark:text-[#a1a1aa] text-[11px] uppercase tracking-wider font-mono">Officer:</span>
            {isStandaloneGate ? (
              <span className="text-[#1a1a1a] dark:text-white font-mono font-bold text-xs max-w-[140px] truncate" title={officerName}>
                {officerName}
              </span>
            ) : (
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="Officer Name"
                className="bg-transparent text-[#1a1a1a] dark:text-white font-mono text-xs focus:outline-none w-28"
              />
            )}
          </div>

          <button
            onClick={() => setAudioFeedback((prev) => !prev)}
            title="Toggle Audio Feedback"
            className={`p-2 rounded-sm border text-xs flex items-center gap-1 transition-colors ${
              audioFeedback
                ? 'bg-[#ff6a00]/15 border-[#ff6a00]/40 text-[#ff6a00]'
                : 'bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-neutral-600 dark:text-[#71717a]'
            }`}
          >
            {audioFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Statistics Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-3.5 rounded-sm shadow-xs">
          <div className="flex items-center justify-between text-neutral-600 dark:text-[#71717a] text-[11px] font-mono uppercase">
            <span>Registered</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1a1a1a] dark:text-white mt-1">{stats.total}</div>
          <div className="text-[11px] text-neutral-500 dark:text-[#a1a1aa] mt-0.5">Imported Profiling</div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-[#18181b] border-2 border-emerald-600 dark:border-[#22c55e]/30 p-3.5 rounded-sm bg-gradient-to-br from-emerald-50/70 dark:from-[#18181b] to-emerald-100/40 dark:to-[#22c55e]/10 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-[#22c55e] text-[11px] font-mono uppercase font-semibold">
            <span>Checked In (Present)</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-[#22c55e] mt-1">{stats.present}</div>
          <div className="text-[11px] text-emerald-700 dark:text-[#22c55e]/80 mt-0.5">Active Raffle Pool</div>
        </div>

        <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-3.5 rounded-sm shadow-xs">
          <div className="flex items-center justify-between text-neutral-600 dark:text-[#71717a] text-[11px] font-mono uppercase">
            <span>Absent (Ineligible)</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-700 dark:text-[#a1a1aa] mt-1">{stats.absent}</div>
          <div className="text-[11px] text-neutral-500 dark:text-[#71717a] mt-0.5">Pending Entrance Scan</div>
        </div>

        <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-3.5 rounded-sm shadow-xs">
          <div className="flex items-center justify-between text-neutral-600 dark:text-[#71717a] text-[11px] font-mono uppercase">
            <span>Attendance Rate</span>
            <Sparkles className="w-4 h-4 text-[#ff6a00]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#ff6a00] mt-1">{stats.rate}%</div>
          <div className="text-[11px] text-neutral-500 dark:text-[#a1a1aa] mt-0.5">Turnout Percentage</div>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white dark:bg-[#18181b] border-2 border-emerald-600 dark:border-[#22c55e]/40 p-3 rounded-sm flex flex-col justify-between gap-1.5 shadow-xs">
          <div className="text-[11px] text-emerald-800 dark:text-[#22c55e] font-mono uppercase font-bold flex items-center justify-between">
            <span>OFFLINE SYNC / CSV</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-[#22c55e]" />
          </div>
          <p className="text-[10px] text-neutral-600 dark:text-[#a1a1aa] font-sans leading-tight">
            Backup or transfer scans without internet
          </p>
          <div className="grid grid-cols-2 gap-1.5 mt-0.5">
            <button
              onClick={handleExportAttendanceCsv}
              title="Download CSV of all scanned attendees from this device"
              className="py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-[#22c55e]/20 dark:hover:bg-[#22c55e]/30 text-emerald-800 dark:text-[#22c55e] border border-emerald-600 dark:border-[#22c55e]/40 rounded-sm text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-[#22c55e]" />
              <span>Export</span>
            </button>
            <label
              title="Merge attendance CSV from other offline scanner devices"
              className="py-1.5 px-2 bg-sky-100 hover:bg-sky-200 dark:bg-[#38bdf8]/20 dark:hover:bg-[#38bdf8]/30 text-sky-800 dark:text-[#38bdf8] border border-sky-500 dark:border-[#38bdf8]/40 rounded-sm text-[11px] font-mono font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-700 dark:text-[#38bdf8]" />
              <span>Merge</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportAttendanceCsv}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* District Attendance Breakdown Pills */}
      <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] px-4 py-2.5 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xs">
        <span className="text-neutral-600 dark:text-[#71717a] text-[11px] uppercase tracking-wider">Districts Turnout:</span>
        {(['NORTH', 'SOUTH', 'EAST', 'WEST', 'PRIVATE'] as District[]).map((d) => {
          const dStat = stats.districts[d] || { total: 0, present: 0 };
          const pct = dStat.total > 0 ? Math.round((dStat.present / dStat.total) * 100) : 0;
          return (
            <div key={d} className="flex items-center gap-1.5 bg-[#f8f7f4] dark:bg-[#27272a]/60 px-2.5 py-1 rounded-xs border border-[#1a1a1a]/20 dark:border-[#3f3f46]">
              <span className="font-bold text-[#1a1a1a] dark:text-white">{d}:</span>
              <span className="text-emerald-700 dark:text-[#22c55e] font-bold">{dStat.present}</span>
              <span className="text-neutral-400 dark:text-[#71717a]">/</span>
              <span className="text-neutral-600 dark:text-[#a1a1aa]">{dStat.total}</span>
              <span className="text-[10px] text-[#ff6a00] font-bold ml-1">({pct}%)</span>
            </div>
          );
        })}
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b-2 border-[#1a1a1a] dark:border-[#27272a] gap-1 overflow-x-auto pb-0">
        <button
          onClick={() => {
            soundSynthesizer.playClick();
            setActiveTab('camera');
          }}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-sm border-t-2 border-x-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'camera'
              ? 'bg-white dark:bg-[#18181b] text-[#ff6a00] border-[#1a1a1a] dark:border-[#3f3f46] border-b-transparent dark:border-b-transparent'
              : 'border-transparent text-neutral-600 dark:text-[#a1a1aa] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Camera QR Scanner</span>
        </button>

        <button
          onClick={() => {
            soundSynthesizer.playClick();
            setActiveTab('gun');
          }}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-sm border-t-2 border-x-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'gun'
              ? 'bg-white dark:bg-[#18181b] text-[#ff6a00] border-[#1a1a1a] dark:border-[#3f3f46] border-b-transparent dark:border-b-transparent'
              : 'border-transparent text-neutral-600 dark:text-[#a1a1aa] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Barcode / USB Gun Wedge</span>
        </button>

        <button
          onClick={() => {
            soundSynthesizer.playClick();
            setActiveTab('manual');
          }}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-sm border-t-2 border-x-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'manual'
              ? 'bg-white dark:bg-[#18181b] text-[#ff6a00] border-[#1a1a1a] dark:border-[#3f3f46] border-b-transparent dark:border-b-transparent'
              : 'border-transparent text-neutral-600 dark:text-[#a1a1aa] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Manual Lookup &amp; Toggle</span>
        </button>

        <button
          onClick={() => {
            soundSynthesizer.playClick();
            setActiveTab('badges');
          }}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-sm border-t-2 border-x-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'badges'
              ? 'bg-white dark:bg-[#18181b] text-[#ff6a00] border-[#1a1a1a] dark:border-[#3f3f46] border-b-transparent dark:border-b-transparent'
              : 'border-transparent text-neutral-600 dark:text-[#a1a1aa] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Printable QR Badges</span>
        </button>

        <button
          onClick={() => {
            soundSynthesizer.playClick();
            setActiveTab('logs');
          }}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-sm border-t-2 border-x-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-white dark:bg-[#18181b] text-[#ff6a00] border-[#1a1a1a] dark:border-[#3f3f46] border-b-transparent dark:border-b-transparent'
              : 'border-transparent text-neutral-600 dark:text-[#a1a1aa] hover:text-[#1a1a1a] dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Scan Audit Logs ({uniqueAttendanceRecords.length})</span>
        </button>

        {!isStandaloneGate && (
          <button
            onClick={() => {
              soundSynthesizer.playClick();
              setActiveTab('supabase');
            }}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-t-sm border-t-2 border-x-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'bg-white dark:bg-[#18181b] text-sky-600 dark:text-[#38bdf8] border-[#1a1a1a] dark:border-[#3f3f46] border-b-transparent dark:border-b-transparent'
                : 'border-transparent text-neutral-600 dark:text-[#a1a1aa] hover:text-[#1a1a1a] dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Cloud Sync</span>
          </button>
        )}
      </div>

      {/* Main Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Interactive Operation Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* TAB 1: Camera QR Scanner */}
          {activeTab === 'camera' && (
            <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-mono font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#ff6a00]" />
                    <span>Real-Time Camera Scanner</span>
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-[#a1a1aa]">
                    Position the participant&apos;s QR code in front of the camera lens for immediate verification.
                  </p>
                </div>
                <button
                  onClick={() => {
                    soundSynthesizer.playClick();
                    setCameraActive((prev) => !prev);
                  }}
                  className={`px-4 py-2 rounded-sm font-mono text-xs font-bold uppercase transition-colors flex items-center gap-2 ${
                    cameraActive
                      ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white'
                      : 'bg-[#ff6a00] hover:bg-[#e05d00] text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
                </button>
              </div>

              {/* Camera Scanner Viewport */}
              <div className="w-full bg-[#09090b] border-2 border-dashed border-[#27272a] rounded-sm min-h-[300px] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div id={scannerContainerId} className="w-full max-w-md mx-auto" />

                {!cameraActive && (
                  <div className="text-center p-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#27272a] flex items-center justify-center text-[#71717a] mb-3">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="text-sm font-mono font-bold text-white mb-1">Camera Scanner Offline</div>
                    <p className="text-xs text-[#71717a] max-w-sm mb-4">
                      Click the &quot;Start Camera&quot; button above to activate the device camera and scan QR codes from ID cards or mobile screens.
                    </p>
                    <button
                      onClick={() => {
                        soundSynthesizer.playClick();
                        setCameraActive(true);
                      }}
                      className="px-4 py-2 bg-[#ff6a00] hover:bg-[#e05d00] text-white rounded-sm font-mono text-xs font-bold uppercase flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Activate Camera</span>
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-[#09090b]/90 flex flex-col items-center justify-center p-6 text-center">
                    <AlertTriangle className="w-10 h-10 text-[#ef4444] mb-2" />
                    <div className="text-sm font-mono font-bold text-white mb-1">Camera Access Restricted</div>
                    <p className="text-xs text-[#a1a1aa] max-w-md mb-4">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('gun')}
                      className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-white border border-[#3f3f46] rounded-sm text-xs font-mono flex items-center gap-2"
                    >
                      <Barcode className="w-4 h-4 text-[#ff6a00]" />
                      <span>Switch to Barcode Gun Mode</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Barcode / USB Gun Wedge */}
          {activeTab === 'gun' && (
            <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 shadow-sm">
              <div>
                <h2 className="text-base font-mono font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-[#ff6a00]" />
                  <span>High-Speed Handheld Barcode Gun Terminal</span>
                </h2>
                <p className="text-xs text-neutral-600 dark:text-[#a1a1aa]">
                  Connect your USB or Bluetooth barcode scanner gun. The cursor remains locked in the active input box for sub-second beep scanning.
                </p>
              </div>

              <div className="bg-[#f8f7f4] dark:bg-[#09090b] border border-[#1a1a1a]/20 dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-3">
                <label className="text-xs font-mono text-neutral-600 dark:text-[#a1a1aa] uppercase flex items-center justify-between">
                  <span>Awaiting Scanner Signal...</span>
                  <span className="text-[10px] text-emerald-700 dark:text-[#22c55e] font-mono flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    KEYBOARD WEDGE ACTIVE
                  </span>
                </label>

                <div className="flex gap-2">
                  <input
                    ref={gunInputRef}
                    type="text"
                    value={gunInputValue}
                    onChange={(e) => setGunInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (gunInputValue.trim()) {
                          handleProcessScan(gunInputValue.trim(), 'BARCODE_GUN');
                          setGunInputValue('');
                        }
                      }
                    }}
                    placeholder="Scan barcode or type Profiling ID (e.g. S-2026-03004) and press Enter..."
                    className="flex-1 bg-white dark:bg-[#18181b] border-2 border-[#ff6a00] text-[#1a1a1a] dark:text-white font-mono text-base px-4 py-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/30 tracking-wider shadow-inner"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (gunInputValue.trim()) {
                        handleProcessScan(gunInputValue.trim(), 'BARCODE_GUN');
                        setGunInputValue('');
                      }
                    }}
                    className="px-5 py-3 bg-[#ff6a00] hover:bg-[#e05d00] text-black font-mono text-xs font-bold uppercase rounded-sm flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Process</span>
                  </button>
                </div>

                <div className="text-[11px] text-neutral-600 dark:text-[#71717a] font-mono flex items-center justify-between">
                  <span>Auto-processes on barcode terminator (CR / Enter).</span>
                  <button
                    onClick={() => gunInputRef.current?.focus()}
                    className="text-[#ff6a00] hover:underline font-bold"
                  >
                    Re-focus input
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Manual Lookup & Check-In */}
          {activeTab === 'manual' && (
            <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-mono font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#ff6a00]" />
                    <span>Manual Profiling Roster Search</span>
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-[#a1a1aa]">
                    Find teachers without printed tickets and manually activate their raffle eligibility.
                  </p>
                </div>
                <div className="text-xs font-mono text-neutral-600 dark:text-[#71717a]">
                  Showing <strong className="text-[#1a1a1a] dark:text-white">{manualFiltered.length}</strong> of {participants.length}
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 dark:text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Search by name, ID, school..."
                    className="w-full bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs pl-9 pr-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00]"
                  />
                </div>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00]"
                >
                  <option value="ALL">All Districts</option>
                  <option value="NORTH">North District</option>
                  <option value="EAST">East District</option>
                  <option value="WEST">West District</option>
                  <option value="SOUTH">South District</option>
                  <option value="PRIVATE">Private (ECCD + Private School + LSB)</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#ff6a00]"
                >
                  <option value="ALL">All Attendance Statuses</option>
                  <option value="INELIGIBLE">Absent / Pending Scan</option>
                  <option value="ELIGIBLE">Checked In / Eligible</option>
                </select>
              </div>

              {/* Roster List */}
              <div className="border border-[#1a1a1a]/20 dark:border-[#27272a] rounded-sm overflow-hidden max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#f8f7f4] dark:bg-[#27272a] text-neutral-700 dark:text-[#a1a1aa] uppercase text-[10px] sticky top-0 z-10 border-b border-[#1a1a1a]/15 dark:border-transparent">
                    <tr>
                      <th className="p-2.5">Teacher Name</th>
                      <th className="p-2.5">Profiling / DepEd ID</th>
                      <th className="p-2.5">District &amp; School</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-[#27272a]">
                    {manualFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-neutral-500 dark:text-[#71717a]">
                          No participants found matching the query.
                        </td>
                      </tr>
                    ) : (
                      manualFiltered.map((p) => {
                        const isPresent = p.eligible === 'ELIGIBLE' || p.attendedAt;
                        return (
                          <tr key={p.id} className="hover:bg-neutral-100 dark:hover:bg-[#27272a]/50 transition-colors">
                            <td className="p-2.5 font-medium text-[#1a1a1a] dark:text-white">
                              {p.fullName}
                              <div className="text-[10px] text-neutral-500 dark:text-[#71717a] font-normal">{p.position}</div>
                            </td>
                            <td className="p-2.5 text-neutral-700 dark:text-[#a1a1aa]">
                              <div>{p.id}</div>
                              {p.depedId && <div className="text-[10px] text-neutral-500 dark:text-[#71717a]">DepEd: {p.depedId}</div>}
                            </td>
                            <td className="p-2.5 text-neutral-700 dark:text-[#a1a1aa]">
                              <span className="text-[#ff6a00] font-semibold">{p.district}</span>
                              <div className="text-[10px] text-neutral-500 dark:text-[#71717a] truncate max-w-[180px]">{p.school}</div>
                            </td>
                            <td className="p-2.5 text-center">
                              {isPresent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#22c55e]/20 text-emerald-700 dark:text-[#22c55e] border border-[#22c55e]/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  ELIGIBLE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-100 dark:bg-[#71717a]/20 text-neutral-600 dark:text-[#a1a1aa] border border-neutral-300 dark:border-[#71717a]/30">
                                  ABSENT
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {isPresent ? (
                                <button
                                  onClick={() => {
                                    soundSynthesizer.playClick();
                                    const reverted: Participant = {
                                      ...p,
                                      eligible: 'INELIGIBLE',
                                      attendedAt: undefined,
                                      attendedBy: undefined
                                    };
                                    onUpdateParticipant(reverted);
                                  }}
                                  className="px-2.5 py-1 bg-[#f8f7f4] hover:bg-red-50 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-red-600 dark:text-[#ef4444] border border-[#1a1a1a]/20 dark:border-[#3f3f46] rounded-xs text-[11px] transition-colors"
                                >
                                  Undo Check-in
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleProcessScan(p.id, 'MANUAL_ENTRY')}
                                  className="px-2.5 py-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold rounded-xs text-[11px] transition-colors flex items-center gap-1 ml-auto"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mark Present</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Printable Badges / QR Slips */}
          {activeTab === 'badges' && (
            <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-mono font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#ff6a00]" />
                    <span>Printable QR Code Badges &amp; Slips</span>
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-[#a1a1aa]">
                    Print attendee cards with scannable QR codes for distribution prior to venue entrance.
                  </p>
                </div>
                <button
                  onClick={() => {
                    soundSynthesizer.playClick();
                    window.print();
                  }}
                  className="px-4 py-2 bg-[#ff6a00] hover:bg-[#e05d00] text-black rounded-sm font-mono text-xs font-bold uppercase flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Badges Page</span>
                </button>
              </div>

              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={badgeSearch}
                  onChange={(e) => setBadgeSearch(e.target.value)}
                  placeholder="Filter teachers for printing..."
                  className="bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none"
                />
                <select
                  value={badgeDistrict}
                  onChange={(e) => setBadgeDistrict(e.target.value)}
                  className="bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-3 py-2 rounded-sm focus:outline-none"
                >
                  <option value="ALL">All Districts</option>
                  <option value="NORTH">North District</option>
                  <option value="EAST">East District</option>
                  <option value="WEST">West District</option>
                  <option value="SOUTH">South District</option>
                  <option value="PRIVATE">Private (ECCD + Private School + LSB)</option>
                </select>
              </div>

              {/* Printable Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto p-1">
                {badgeFiltered.slice(0, 30).map((p) => {
                  const qr = qrDataUrls[p.id];
                  return (
                    <div
                      key={p.id}
                      className="bg-white text-black p-4 rounded-sm border-2 border-black flex items-center gap-4 relative shadow-sm"
                    >
                      {/* Left: QR Code */}
                      <div className="flex flex-col items-center justify-center">
                        {qr ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={qr} alt={p.id} className="w-24 h-24 object-contain border border-gray-300" />
                        ) : (
                          <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                            Generating...
                          </div>
                        )}
                        <span className="font-mono text-[9px] font-bold mt-1 text-gray-700">{p.id}</span>
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <div className="text-[9px] uppercase font-bold tracking-widest text-[#ff6a00]">
                            DepEd Malungon • Teachers&apos; Day 2026
                          </div>
                          <div className="text-sm font-bold text-black leading-snug mt-0.5 truncate">
                            {p.fullName}
                          </div>
                          <div className="text-[10px] text-gray-600 truncate">{p.position}</div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1 text-[10px] font-mono">
                          <div>
                            <span className="text-gray-400 block text-[8px] uppercase">District</span>
                            <span className="font-bold text-gray-900">{p.district}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[8px] uppercase">DepEd ID</span>
                            <span className="font-bold text-gray-900">{p.depedId || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 truncate">
                            <span className="text-gray-400 block text-[8px] uppercase">School</span>
                            <span className="text-gray-800 text-[9px] truncate block">{p.school}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: Attendance Scan Audit Logs */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-mono font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ff6a00]" />
                    <span>Real-Time Scan Audit Logs</span>
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-[#a1a1aa]">
                    Chronological record of every check-in scan performed at gate entrance stations.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAttendanceCsv}
                    className="px-3 py-1.5 bg-[#f8f7f4] hover:bg-neutral-100 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] rounded-sm text-xs font-mono flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-[#22c55e]" />
                    <span>Export Logs</span>
                  </button>
                  <label
                    title="Merge attendance CSV from another offline gate scanner device"
                    className="px-3 py-1.5 bg-[#f8f7f4] hover:bg-neutral-100 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] rounded-sm text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-sky-600 dark:text-[#38bdf8]" />
                    <span>Merge CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportAttendanceCsv}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="border border-[#1a1a1a]/20 dark:border-[#27272a] rounded-sm overflow-hidden max-h-[450px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#f8f7f4] dark:bg-[#27272a] text-neutral-700 dark:text-[#a1a1aa] uppercase text-[10px] sticky top-0 z-10 border-b border-[#1a1a1a]/15 dark:border-transparent">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Log ID</th>
                      <th className="p-2.5">Teacher Name</th>
                      <th className="p-2.5">District &amp; School</th>
                      <th className="p-2.5">Station &amp; Officer</th>
                      <th className="p-2.5 text-right">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/15 dark:divide-[#27272a]">
                    {uniqueAttendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-neutral-500 dark:text-[#71717a]">
                          No scan records logged yet today. Start scanning to see live activity.
                        </td>
                      </tr>
                    ) : (
                      uniqueAttendanceRecords.slice(-50).reverse().map((rec) => {
                        const cleanTime = rec.scannedAt ? rec.scannedAt.slice(11, 19) : '';
                        return (
                          <tr key={rec.id} className="hover:bg-neutral-100 dark:hover:bg-[#27272a]/50">
                            <td className="p-2.5 text-neutral-600 dark:text-[#a1a1aa] whitespace-nowrap">{cleanTime}</td>
                            <td className="p-2.5 text-[#1a1a1a] dark:text-white font-bold">{rec.id}</td>
                            <td className="p-2.5 font-medium text-[#1a1a1a] dark:text-white">{rec.name}</td>
                            <td className="p-2.5 text-neutral-600 dark:text-[#a1a1aa]">
                              <span className="text-[#ff6a00] font-semibold">{rec.district}</span> - {rec.school}
                            </td>
                            <td className="p-2.5 text-neutral-500 dark:text-[#71717a]">
                              {rec.stationId} ({rec.scannerOfficer})
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="px-2 py-0.5 rounded-xs text-[9px] font-bold bg-sky-50 dark:bg-[#27272a] border border-sky-300 dark:border-[#3f3f46] text-sky-700 dark:text-[#38bdf8]">
                                {rec.method}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: Supabase Cloud Sync */}
          {activeTab === 'supabase' && (
            <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 shadow-sm">
              <div>
                <h2 className="text-base font-mono font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#38bdf8]" />
                  <span>Supabase Backend Configuration</span>
                </h2>
                <p className="text-xs text-neutral-600 dark:text-[#a1a1aa]">
                  Connect your live PostgreSQL / Supabase cloud project so all entrance scanner devices stay synchronized across multiple mobile phones, laptops, and tablets.
                </p>
              </div>

              {/* Connection Status Card */}
              <div className="bg-[#f8f7f4] dark:bg-[#09090b] border border-[#1a1a1a]/20 dark:border-[#27272a] p-4 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      supabaseUrl && supabaseAnonKey ? 'bg-[#22c55e] animate-pulse' : 'bg-[#eab308]'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-mono font-bold text-[#1a1a1a] dark:text-white">
                      {supabaseUrl && supabaseAnonKey ? 'Supabase Cloud Connected' : 'Supabase Not Configured (Using Local Storage)'}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-[#71717a] font-mono">
                      {supabaseUrl && supabaseAnonKey
                        ? `Live sync active with ${supabaseUrl}`
                        : 'Connect your Supabase project below to synchronize multiple entrance devices.'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded-xs text-[10px] font-mono font-bold uppercase ${
                      supabaseUrl && supabaseAnonKey
                        ? 'bg-[#22c55e]/20 text-emerald-700 dark:text-[#22c55e] border border-[#22c55e]/30'
                        : 'bg-[#eab308]/20 text-amber-700 dark:text-[#eab308] border border-[#eab308]/30'
                    }`}
                  >
                    {supabaseUrl && supabaseAnonKey ? 'ONLINE' : 'LOCAL OFFLINE READY'}
                  </span>
                </div>
              </div>

              {/* Supabase Connection Setup & Credentials */}
              <div className="bg-[#f8f7f4] dark:bg-[#09090b] border border-[#1a1a1a]/20 dark:border-[#27272a] p-4 rounded-sm space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 dark:border-[#27272a] pb-2">
                  <span className="text-xs font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-[#22c55e]" />
                    <span>Project Credentials</span>
                  </span>
                  {supabaseSource !== 'NONE' && (
                    <span className="text-[10px] text-neutral-500 dark:text-[#71717a]">
                      Source: {supabaseSource === 'LOCAL_STORAGE' ? 'Saved in Browser' : 'Build Environment'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-neutral-700 dark:text-[#a1a1aa] mb-1 font-bold">
                      SUPABASE PROJECT URL:
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-project-id.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full bg-white dark:bg-[#18181b] border border-[#1a1a1a]/20 dark:border-[#27272a] px-3 py-2 text-[#1a1a1a] dark:text-white font-mono text-xs outline-none focus:border-[#22c55e]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-700 dark:text-[#a1a1aa] mb-1 font-bold">
                      SUPABASE ANON PUBLIC KEY:
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full bg-white dark:bg-[#18181b] border border-[#1a1a1a]/20 dark:border-[#27272a] px-3 py-2 text-[#1a1a1a] dark:text-white font-mono text-xs outline-none focus:border-[#22c55e]"
                    />
                  </div>

                  {testStatus.message && (
                    <div
                      className={`p-3 border text-xs flex items-center gap-2 ${
                        testStatus.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
                          : 'bg-red-50 dark:bg-red-950/40 border-red-500/50 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {testStatus.success ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      )}
                      <span>{testStatus.message}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTestSupabase}
                      disabled={testStatus.loading || !supabaseUrl || !supabaseAnonKey}
                      className="px-4 py-2 bg-white hover:bg-neutral-100 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-xs font-mono font-bold flex items-center gap-2 disabled:opacity-40 transition-colors"
                    >
                      {testStatus.loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22c55e]" />
                      ) : (
                        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-[#22c55e]" />
                      )}
                      <span>Test Connection</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveSupabaseCreds}
                      disabled={!supabaseUrl || !supabaseAnonKey}
                      className="px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-mono font-bold text-xs flex items-center gap-2 disabled:opacity-40 transition-colors shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save &amp; Connect Live</span>
                    </button>

                    {(supabaseUrl || supabaseAnonKey) && (
                      <button
                        type="button"
                        onClick={handleClearSupabaseCreds}
                        className="px-3 py-2 bg-white hover:bg-red-50 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-neutral-600 hover:text-red-600 dark:text-[#a1a1aa] dark:hover:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-xs transition-colors"
                        title="Clear credentials"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Sync & Push Card */}
              <div className="bg-[#f8f7f4] dark:bg-[#09090b] border border-[#1a1a1a]/20 dark:border-[#27272a] p-4 rounded-sm space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a1a1a] dark:text-white uppercase flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-[#ff6a00]" />
                    <span>Upload 2,000 Teachers to Cloud Database</span>
                  </span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-neutral-600 dark:text-[#71717a] hover:text-black dark:hover:text-white inline-flex items-center gap-1 underline"
                  >
                    Supabase Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-neutral-600 dark:text-[#a1a1aa]">
                  Syncs the complete municipal teacher masterlist into the cloud so every scanner station recognizes participant badges instantly.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePushAllParticipants}
                    disabled={isSyncingParticipants || !supabaseUrl || !supabaseAnonKey}
                    className="px-5 py-2.5 bg-[#ff6a00] hover:bg-[#ea580c] text-black font-mono font-bold text-xs uppercase tracking-wider disabled:opacity-40 flex items-center gap-2 transition-colors shadow"
                  >
                    {isSyncingParticipants ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Sync {participants.length.toLocaleString()} Teachers to Cloud</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSupabase}
                    disabled={isSyncingParticipants || !supabaseUrl || !supabaseAnonKey}
                    className="px-5 py-2.5 bg-white hover:bg-neutral-100 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] font-mono font-bold text-xs uppercase tracking-wider disabled:opacity-40 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-[#22c55e] ${isSyncingParticipants ? 'animate-spin' : ''}`} />
                    <span>Pull Live Records from Cloud</span>
                  </button>

                  {syncProgress && (
                    <span className="text-xs font-mono text-emerald-700 dark:text-[#22c55e]">
                      {syncProgress}
                    </span>
                  )}
                </div>
              </div>

              {/* SQL Schema Copy Card */}
              <div className="bg-[#f8f7f4] dark:bg-[#09090b] border border-[#1a1a1a]/20 dark:border-[#27272a] p-4 rounded-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-[#1a1a1a] dark:text-white uppercase">
                      Supabase SQL Schema (1-Click Copy)
                    </div>
                    <div className="text-[11px] text-neutral-600 dark:text-[#71717a]">
                      Paste this into your Supabase Dashboard &gt; SQL Editor &gt; New Query &gt; Run to provision tables.
                    </div>
                  </div>
                  <button
                    onClick={handleCopySchema}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#1a1a1a] dark:text-white border border-[#1a1a1a]/20 dark:border-[#3f3f46] rounded-sm text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSchema ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#22c55e]" />
                        <span className="text-emerald-700 dark:text-[#22c55e]">Copied SQL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-600 dark:text-[#38bdf8]" />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-white dark:bg-[#18181b] p-3 rounded-sm text-[10px] font-mono text-neutral-800 dark:text-[#a1a1aa] overflow-x-auto max-h-48 border border-[#1a1a1a]/20 dark:border-[#27272a]">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right Verification Card & Scanned Badge Area (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#18181b] border-2 border-[#1a1a1a] dark:border-[#27272a] p-5 rounded-sm flex flex-col gap-4 sticky top-4 shadow-sm">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-700 dark:text-[#a1a1aa] flex items-center justify-between">
              <span>Scan Verification Result</span>
              <ShieldCheck className="w-4 h-4 text-[#ff6a00]" />
            </h3>

            {lastScannedResult ? (
              <div
                className={`p-4 rounded-sm border flex flex-col gap-3 transition-all ${
                  lastScannedResult.status === 'SUCCESS'
                    ? 'bg-emerald-50 dark:bg-[#22c55e]/10 border-emerald-500/50 dark:border-[#22c55e]/40'
                    : lastScannedResult.status === 'DUPLICATE'
                    ? 'bg-amber-50 dark:bg-[#eab308]/10 border-amber-500/50 dark:border-[#eab308]/40'
                    : 'bg-red-50 dark:bg-[#ef4444]/10 border-red-500/50 dark:border-[#ef4444]/40'
                }`}
              >
                {/* Result Status Banner */}
                <div className="flex items-center gap-2">
                  {lastScannedResult.status === 'SUCCESS' && (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-[#22c55e]" />
                      <div>
                        <div className="text-xs font-mono font-bold text-emerald-700 dark:text-[#22c55e] uppercase">
                          CHECK-IN CONFIRMED
                        </div>
                        <div className="text-[10px] text-emerald-700/80 dark:text-[#22c55e]/80">ELIGIBLE FOR RAFFLE</div>
                      </div>
                    </>
                  )}
                  {lastScannedResult.status === 'DUPLICATE' && (
                    <>
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-[#eab308]" />
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-700 dark:text-[#eab308] uppercase">
                          ALREADY CHECKED IN
                        </div>
                        <div className="text-[10px] text-amber-700/80 dark:text-[#eab308]/80">DUPLICATE SCAN PREVENTED</div>
                      </div>
                    </>
                  )}
                  {lastScannedResult.status === 'NOT_FOUND' && (
                    <>
                      <UserX className="w-6 h-6 text-red-600 dark:text-[#ef4444]" />
                      <div>
                        <div className="text-xs font-mono font-bold text-red-700 dark:text-[#ef4444] uppercase">
                          UNKNOWN PARTICIPANT
                        </div>
                        <div className="text-[10px] text-red-700/80 dark:text-[#ef4444]/80">NOT IN PROFILING DATABASE</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Scanned Teacher Info Card */}
                {lastScannedResult.participant ? (
                  <div className="bg-[#f8f7f4] dark:bg-[#18181b]/90 border border-[#1a1a1a]/15 dark:border-[#27272a] p-3.5 rounded-sm flex flex-col gap-2 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 dark:text-[#71717a] uppercase block">Teacher Name</span>
                      <span className="text-sm font-bold text-[#1a1a1a] dark:text-white">{lastScannedResult.participant.fullName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a1a1a]/15 dark:border-[#27272a] text-[11px]">
                      <div>
                        <span className="text-[10px] text-neutral-500 dark:text-[#71717a] uppercase block">Profiling ID</span>
                        <span className="text-[#ff6a00] font-bold">{lastScannedResult.participant.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 dark:text-[#71717a] uppercase block">DepEd ID</span>
                        <span className="text-[#1a1a1a] dark:text-white">{lastScannedResult.participant.depedId || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1a1a1a]/15 dark:border-[#27272a] text-[11px]">
                      <span className="text-[10px] text-neutral-500 dark:text-[#71717a] uppercase block">District</span>
                      <span className="text-emerald-700 dark:text-[#22c55e] font-bold">{lastScannedResult.participant.district} DISTRICT</span>
                    </div>

                    <div className="text-[11px]">
                      <span className="text-[10px] text-neutral-500 dark:text-[#71717a] uppercase block">School</span>
                      <span className="text-[#1a1a1a] dark:text-white truncate block">{lastScannedResult.participant.school}</span>
                    </div>

                    <div className="text-[11px]">
                      <span className="text-[10px] text-neutral-500 dark:text-[#71717a] uppercase block">Position</span>
                      <span className="text-neutral-700 dark:text-[#a1a1aa]">{lastScannedResult.participant.position}</span>
                    </div>

                    <div className="pt-2 border-t border-[#1a1a1a]/15 dark:border-[#27272a] text-[10px] text-neutral-500 dark:text-[#71717a]">
                      Checked in at {lastScannedResult.timestamp}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-600 dark:text-[#a1a1aa] font-mono">{lastScannedResult.message}</p>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[#1a1a1a]/20 dark:border-[#27272a] rounded-sm p-6 text-center text-neutral-500 dark:text-[#71717a] flex flex-col items-center bg-[#f8f7f4]/50 dark:bg-transparent">
                <QrCode className="w-10 h-10 mb-2 opacity-40" />
                <div className="text-xs font-mono text-[#1a1a1a] dark:text-white mb-1">Awaiting Entrance Scan</div>
                <div className="text-[11px]">
                  Use the camera or barcode scanner to process arriving teachers.
                </div>
              </div>
            )}

            {/* Quick Manual Entry Bar */}
            <div className="pt-2 border-t border-[#1a1a1a]/15 dark:border-[#27272a] flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-600 dark:text-[#71717a] uppercase">
                Quick ID Verification
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. S-2026-03004"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        handleProcessScan(val, 'MANUAL_ENTRY');
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="flex-1 bg-[#f8f7f4] dark:bg-[#27272a] border border-[#1a1a1a]/20 dark:border-[#3f3f46] text-[#1a1a1a] dark:text-white text-xs px-2.5 py-1.5 rounded-sm font-mono focus:outline-none focus:border-[#ff6a00]"
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input && input.value.trim()) {
                      handleProcessScan(input.value.trim(), 'MANUAL_ENTRY');
                      input.value = '';
                    }
                  }}
                  className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-neutral-800 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-white rounded-sm text-xs font-mono"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
