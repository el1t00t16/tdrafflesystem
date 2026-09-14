import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Participant, AttendanceRecord, Winner, Prize } from './types';

let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 10);
};

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false
      }
    });
  }
  return supabaseInstance;
};

// SQL Schema generator for users to paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- Municipal Teachers' Day 2026 - Supabase SQL Schema
-- Copy and run this in your Supabase Project -> SQL Editor

-- 1. Participants Table (DepEd Profiling & Attendance)
create table if not exists public.participants (
  id text primary key, -- Profiling ID e.g. W-2026-49550
  deped_id text,
  full_name text not null,
  first_name text,
  middle_name text,
  last_name text,
  district text not null,
  original_district text,
  personnel_type text not null,
  school text not null,
  position text not null,
  contact_number text,
  email text,
  eligible text not null default 'INELIGIBLE',
  winner text not null default 'NO',
  claimed text not null default 'NO',
  attended_at timestamp with time zone,
  attended_by text,
  status text not null default 'ACTIVE',
  created_at timestamp with time zone default now()
);

-- Index for instant scanning and filtering
create index if not exists idx_participants_district on public.participants(district);
create index if not exists idx_participants_eligible on public.participants(eligible);
create index if not exists idx_participants_deped_id on public.participants(deped_id);

-- 2. Attendance Scan Audit Logs
create table if not exists public.attendance_records (
  id text primary key, -- ATT-0001
  participant_id text references public.participants(id) on delete cascade,
  deped_id text,
  name text not null,
  district text not null,
  school text not null,
  position text not null,
  scanned_at timestamp with time zone not null default now(),
  station_id text not null,
  scanner_officer text not null,
  method text not null
);

-- 3. Prizes Table
create table if not exists public.prizes (
  id text primary key, -- P001
  name text not null,
  description text,
  unit_value numeric not null default 0,
  quantity integer not null default 1,
  drawn_quantity integer not null default 0,
  remaining_quantity integer not null default 1,
  total_value numeric not null default 0,
  status text not null default 'AVAILABLE'
);

-- 4. Winners Table
create table if not exists public.winners (
  winner_id text primary key, -- WN-0001
  participant_id text not null,
  deped_id text,
  name text not null,
  district text not null,
  school text not null,
  position text not null,
  prize_id text not null,
  prize_name text not null,
  unit_value numeric not null default 0,
  draw_number text not null,
  drawn_at timestamp with time zone default now(),
  claim_status text not null default 'UNCLAIMED',
  claimed_at timestamp with time zone,
  claimed_by text,
  id_presented text,
  proxy_name text,
  proxy_relationship text,
  claim_notes text
);

-- Enable Row Level Security (RLS) & Public Anon read/write policies for local station devices
alter table public.participants enable row level security;
alter table public.attendance_records enable row level security;
alter table public.prizes enable row level security;
alter table public.winners enable row level security;

create policy "Allow anon read all" on public.participants for select using (true);
create policy "Allow anon write all" on public.participants for all using (true) with check (true);

create policy "Allow anon read att" on public.attendance_records for select using (true);
create policy "Allow anon write att" on public.attendance_records for all using (true) with check (true);

create policy "Allow anon read prizes" on public.prizes for select using (true);
create policy "Allow anon write prizes" on public.prizes for all using (true) with check (true);

create policy "Allow anon read winners" on public.winners for select using (true);
create policy "Allow anon write winners" on public.winners for all using (true) with check (true);
`;

// Helper: Push Attendance Record to Supabase
export async function pushAttendanceToSupabase(record: AttendanceRecord): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // 1. Insert scan record
    await client.from('attendance_records').insert({
      id: record.id,
      participant_id: record.participantId,
      deped_id: record.depedId || null,
      name: record.name,
      district: record.district,
      school: record.school,
      position: record.position,
      scanned_at: record.scannedAt,
      station_id: record.stationId,
      scanner_officer: record.scannerOfficer,
      method: record.method
    });

    // 2. Update participant to ELIGIBLE & attended_at
    await client
      .from('participants')
      .update({
        eligible: 'ELIGIBLE',
        attended_at: record.scannedAt,
        attended_by: `${record.scannerOfficer} (${record.stationId})`
      })
      .eq('id', record.participantId);

    return true;
  } catch (err) {
    console.error('Supabase attendance sync error:', err);
    return false;
  }
}
