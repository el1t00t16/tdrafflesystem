'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Monitor, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { AttendanceScannerModule } from '../../components/attendance/AttendanceScannerModule';
import { Participant, AttendanceRecord } from '../../lib/types';
import { INITIAL_PARTICIPANTS } from '../../lib/data';

export default function AttendancePage() {
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronize with local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const cached = localStorage.getItem('td26_profiling_participants');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setParticipants(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load participants cache:', e);
      }

      try {
        const cachedAttendance = localStorage.getItem('td26_attendance_records');
        if (cachedAttendance) {
          const parsed = JSON.parse(cachedAttendance);
          if (Array.isArray(parsed)) {
            setAttendanceRecords(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load attendance cache:', e);
      }

      setIsLoaded(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      try {
        localStorage.setItem('td26_profiling_participants', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleAddAttendanceRecord = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const next = [record, ...prev];
      try {
        localStorage.setItem('td26_attendance_records', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const presentCount = participants.filter((p) => p.eligible === 'ELIGIBLE' || p.attendedAt).length;

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col font-sans">
      {/* Top Station Bar */}
      <header className="bg-[#1a1a1a] text-[#f8f7f4] border-b border-black px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main Raffle Console</span>
          </Link>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-200">
              GATE ATTENDANCE STATION (LIVE)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-neutral-400">CHECKED-IN / ELIGIBLE:</span>
          <span className="px-2 py-0.5 bg-[#22c55e] text-black font-bold font-mono text-xs">
            {presentCount} / {participants.length}
          </span>
          <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />
          <Link
            href="/?page=claim"
            className="text-neutral-300 hover:text-white flex items-center gap-1 hover:underline ml-2"
          >
            <Trophy className="w-3 h-3 text-[#ff6a00]" />
            <span>Prize Claim</span>
          </Link>
          <Link
            href="/?page=admin"
            className="text-neutral-300 hover:text-white flex items-center gap-1 hover:underline ml-2"
          >
            <ShieldCheck className="w-3 h-3 text-[#ff6a00]" />
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Scanner Workstation */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <AttendanceScannerModule
          participants={participants}
          attendanceRecords={attendanceRecords}
          onUpdateParticipant={handleUpdateParticipant}
          onAddAttendanceRecord={handleAddAttendanceRecord}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#1a1a1a]/15 px-6 py-4 text-center font-mono text-[11px] text-neutral-500 uppercase tracking-widest">
        Municipal Teachers&apos; Day 2026 • Malungon Entrance Gate QR System • Region XII
      </footer>
    </div>
  );
}
