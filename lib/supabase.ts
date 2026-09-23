import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Participant, AttendanceRecord, Winner, Prize, PrizeCategory, RaffleLog, EligibilityStatus } from './types';

let supabaseInstance: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabaseCredentials = (): { url: string; anonKey: string; source: 'ENV' | 'LOCAL_STORAGE' | 'NONE' } => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('teachers_day_supabase_url');
    const savedKey = localStorage.getItem('teachers_day_supabase_anon_key');
    if (savedUrl && savedKey && savedUrl.startsWith('http') && savedKey.length > 10) {
      return { url: savedUrl.trim(), anonKey: savedKey.trim(), source: 'LOCAL_STORAGE' };
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (envUrl && envKey && envUrl.startsWith('http') && envKey.length > 10) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), source: 'ENV' };
  }

  return { url: '', anonKey: '', source: 'NONE' };
};

export const setSupabaseCredentials = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    if (url && anonKey) {
      localStorage.setItem('teachers_day_supabase_url', url.trim());
      localStorage.setItem('teachers_day_supabase_anon_key', anonKey.trim());
    } else {
      localStorage.removeItem('teachers_day_supabase_url');
      localStorage.removeItem('teachers_day_supabase_anon_key');
    }
    supabaseInstance = null;
    lastUsedUrl = '';
    lastUsedKey = '';
  }
};

export const isSupabaseConfigured = (): boolean => {
  try {
    const creds = getSupabaseCredentials();
    return Boolean(creds.url && creds.anonKey && creds.url.startsWith('http'));
  } catch {
    return false;
  }
};

export const getSupabase = (): SupabaseClient | null => {
  try {
    const creds = getSupabaseCredentials();
    if (!creds.url || !creds.anonKey || !creds.url.startsWith('http')) {
      return null;
    }

    if (!supabaseInstance || lastUsedUrl !== creds.url || lastUsedKey !== creds.anonKey) {
      supabaseInstance = createClient(creds.url, creds.anonKey, {
        auth: {
          persistSession: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      lastUsedUrl = creds.url;
      lastUsedKey = creds.anonKey;
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Supabase client initialization error:', err);
    return null;
  }
};

export const formatSupabaseError = (err: any): string => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  const parts = [
    err.message,
    err.details && `Details: ${err.details}`,
    err.hint && `Hint: ${err.hint}`,
    err.code ? `[Code: ${err.code}]` : null
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : JSON.stringify(err);
};

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = customUrl || getSupabaseCredentials().url;
    const anonKey = customKey || getSupabaseCredentials().anonKey;

    if (!url || !anonKey) {
      return { success: false, message: 'URL and Anon Public Key are required.' };
    }

    const testClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error } = await testClient.from('participants').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase! (Note: Tables not created yet. Copy and run the SQL schema in SQL Editor).'
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Successfully connected and verified Supabase tables!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}

// SQL Schema generator for users to paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- Municipal Teachers' Day 2026 - Supabase SQL Schema
-- Copy and run this in your Supabase Project -> SQL Editor
-- =========================================================================

-- 1. Participants Table (DepEd Profiling & Attendance)
create table if not exists public.participants (
  id text primary key, -- Profiling ID e.g. W-2026-49550
  deped_id text,
  full_name text not null,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  district text not null,
  original_district text,
  personnel_type text not null,
  type_of_personnel text,
  school text not null,
  position text not null,
  sex text,
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
create index if not exists idx_participants_winner on public.participants(winner);

-- 2. Attendance Scan Audit Logs
create table if not exists public.attendance_records (
  id text primary key, -- ATT-0001
  participant_id text not null,
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

create index if not exists idx_attendance_participant_id on public.attendance_records(participant_id);
create index if not exists idx_attendance_scanned_at on public.attendance_records(scanned_at desc);

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
  status text not null default 'AVAILABLE',
  category text not null default 'MINOR',
  updated_at timestamp with time zone default now()
);

-- Ensure category column exists if table was previously created
alter table public.prizes add column if not exists category text default 'MINOR';

-- 4. Winners Table
create table if not exists public.winners (
  winner_id text primary key, -- WN-0001
  participant_id text not null,
  deped_id text,
  name text not null,
  district text not null,
  original_district text,
  personnel_type text,
  school text not null,
  position text not null,
  contact_number text,
  email text,
  sex text,
  prize_id text not null,
  prize_name text not null,
  unit_value numeric not null default 0,
  draw_number text not null,
  drawn_at timestamp with time zone default now(),
  date text,
  time text,
  claim_status text not null default 'UNCLAIMED',
  claimed_at timestamp with time zone,
  claimed_by text,
  id_presented text,
  is_proxy_claim boolean default false,
  proxy_name text,
  proxy_relationship text,
  claim_notes text
);

create index if not exists idx_winners_claim_status on public.winners(claim_status);
create index if not exists idx_winners_draw_number on public.winners(draw_number);

-- 5. Raffle Audit Logs Table
create table if not exists public.raffle_logs (
  log_id text primary key, -- LOG-0001
  draw_number text not null,
  timestamp text not null,
  prize_id text not null,
  prize_name text not null,
  number_of_winners integer not null default 1,
  eligible_pool_size integer not null default 0,
  winner_ids jsonb not null default '[]'::jsonb,
  winner_names jsonb not null default '[]'::jsonb,
  status text not null default 'CONFIRMED',
  admin text not null default 'Event Admin',
  distribution_mode text not null default 'EQUAL_PER_DISTRICT',
  winners_per_district integer,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) & Public Anon read/write policies for local station devices
alter table public.participants enable row level security;
alter table public.attendance_records enable row level security;
alter table public.prizes enable row level security;
alter table public.winners enable row level security;
alter table public.raffle_logs enable row level security;

-- Policies for public access (Anon Key)
create policy "Allow anon read participants" on public.participants for select using (true);
create policy "Allow anon write participants" on public.participants for all using (true) with check (true);

create policy "Allow anon read att" on public.attendance_records for select using (true);
create policy "Allow anon write att" on public.attendance_records for all using (true) with check (true);

create policy "Allow anon read prizes" on public.prizes for select using (true);
create policy "Allow anon write prizes" on public.prizes for all using (true) with check (true);

create policy "Allow anon read winners" on public.winners for select using (true);
create policy "Allow anon write winners" on public.winners for all using (true) with check (true);

create policy "Allow anon read logs" on public.raffle_logs for select using (true);
create policy "Allow anon write logs" on public.raffle_logs for all using (true) with check (true);

-- Enable Realtime Broadcast on all core tables
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.attendance_records;
alter publication supabase_realtime add table public.prizes;
alter publication supabase_realtime add table public.winners;
alter publication supabase_realtime add table public.raffle_logs;
`;

// Helper: Push Attendance Record to Supabase
export async function pushAttendanceToSupabase(record: AttendanceRecord): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // 1. Upsert scan record (ignore duplicate conflicts if already scanned)
    const { error: insertErr } = await client.from('attendance_records').upsert(
      {
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
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (insertErr) {
      console.warn('Attendance scan record upsert notice:', formatSupabaseError(insertErr));
    }

    // 2. Update participant to ELIGIBLE & attended_at
    const { error: updateErr } = await client
      .from('participants')
      .update({
        eligible: 'ELIGIBLE',
        attended_at: record.scannedAt,
        attended_by: `${record.scannerOfficer} (${record.stationId})`
      })
      .eq('id', record.participantId);
    if (updateErr) throw updateErr;

    return true;
  } catch (err) {
    console.error('Supabase attendance sync error:', formatSupabaseError(err));
    return false;
  }
}

// Helper: Push Winner to Supabase
export async function pushWinnerToSupabase(winner: Winner): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error: winnerErr } = await client.from('winners').upsert({
      winner_id: winner.winnerId,
      participant_id: winner.participantId,
      deped_id: winner.depedId || null,
      name: winner.name,
      district: winner.district,
      original_district: winner.originalDistrict || null,
      personnel_type: winner.personnelType || null,
      school: winner.school,
      position: winner.position,
      contact_number: winner.contactNumber || null,
      email: winner.email || null,
      sex: winner.sex || null,
      prize_id: winner.prizeId,
      prize_name: winner.prizeName,
      unit_value: winner.unitValue,
      draw_number: winner.drawNumber,
      drawn_at: `${winner.date} ${winner.time}`,
      date: winner.date,
      time: winner.time,
      claim_status: winner.claimStatus,
      claimed_at: winner.claimedAt || null,
      claimed_by: winner.claimedBy || null,
      id_presented: winner.idPresented || null,
      is_proxy_claim: Boolean(winner.isProxyClaim),
      proxy_name: winner.proxyName || null,
      proxy_relationship: winner.proxyRelationship || null,
      claim_notes: winner.claimNotes || null
    });
    if (winnerErr) throw winnerErr;

    // Mark participant as WINNER = YES in participants table
    const { error: partErr } = await client
      .from('participants')
      .update({ winner: 'YES' })
      .eq('id', winner.participantId);
    if (partErr) throw partErr;

    return true;
  } catch (err) {
    console.error('Supabase winner sync error:', err);
    return false;
  }
}

// Helper: Update Claim Status in Supabase
export async function updateClaimInSupabase(
  winnerId: string,
  claimData: {
    claimStatus: 'CLAIMED' | 'UNCLAIMED' | 'FORFEITED';
    claimedAt?: string;
    claimedBy?: string;
    idPresented?: string;
    isProxyClaim?: boolean;
    proxyName?: string;
    proxyRelationship?: string;
    claimNotes?: string;
    forfeitedAt?: string;
    forfeitReason?: string;
  }
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const updatePayload: Record<string, any> = {
      claim_status: claimData.claimStatus,
      claimed_at: claimData.claimedAt || null,
      claimed_by: claimData.claimedBy || null,
      id_presented: claimData.idPresented || null,
      is_proxy_claim: claimData.isProxyClaim ?? false,
      proxy_name: claimData.proxyName || null,
      proxy_relationship: claimData.proxyRelationship || null,
      claim_notes: claimData.claimNotes || null
    };

    if (claimData.forfeitedAt !== undefined) {
      updatePayload.forfeited_at = claimData.forfeitedAt;
    }
    if (claimData.forfeitReason !== undefined) {
      updatePayload.forfeit_reason = claimData.forfeitReason;
    }

    const { error } = await client.from('winners').update(updatePayload).eq('winner_id', winnerId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase claim update error:', err);
    return false;
  }
}

// Helper: Update Winner Print Status in Supabase
export async function syncWinnerPrintStatusToSupabase(
  winnerIds: string[],
  isPrinted: boolean,
  printedBy?: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client || winnerIds.length === 0) return false;

  try {
    const timestamp = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      is_printed: isPrinted,
      printed_at: isPrinted ? timestamp : null,
      printed_by: isPrinted ? (printedBy || 'Print Station') : null
    };

    const { error } = await client
      .from('winners')
      .update(updatePayload)
      .in('winner_id', winnerIds);

    if (error) {
      console.warn('Supabase print status update note (local storage fallback active):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error syncing print status to Supabase:', err);
    return false;
  }
}


// Helper: Update participant eligibility directly
export async function updateParticipantEligibilityInSupabase(
  id: string,
  eligible: EligibilityStatus
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('participants')
      .update({ eligible })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase eligibility update error:', err);
    return false;
  }
}

// Helper: Batch upload participants to Supabase
export async function batchSyncParticipantsToSupabase(
  participants: Participant[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, count: 0, error: 'Supabase client is in Offline Mode. Configure URL & Anon Key in Settings.' };

  try {
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize).map((p) => ({
        id: String(p.id).trim(),
        deped_id: p.depedId ? String(p.depedId).trim() : null,
        full_name: String(p.fullName || '').trim(),
        first_name: p.firstName ? String(p.firstName).trim() : null,
        middle_name: p.middleName ? String(p.middleName).trim() : null,
        last_name: p.lastName ? String(p.lastName).trim() : null,
        suffix: p.suffix ? String(p.suffix).trim() : null,
        district: String(p.district || 'NORTH').trim(),
        original_district: p.originalDistrict ? String(p.originalDistrict).trim() : null,
        personnel_type: String(p.personnelType || 'TEACHING').trim(),
        type_of_personnel: p.typeOfPersonnel ? String(p.typeOfPersonnel).trim() : null,
        school: String(p.school || '').trim(),
        position: String(p.position || '').trim(),
        sex: p.sex ? String(p.sex).trim() : null,
        contact_number: p.contactNumber ? String(p.contactNumber).trim() : null,
        email: p.email ? String(p.email).trim() : null,
        eligible: String(p.eligible || 'INELIGIBLE'),
        winner: String(p.winner || 'NO'),
        claimed: String(p.claimed || 'NO'),
        attended_at: p.attendedAt || null,
        attended_by: p.attendedBy || null,
        status: String(p.status || 'ACTIVE')
      }));

      const { error } = await client.from('participants').upsert(batch, { onConflict: 'id' });
      if (error) {
        const msg = formatSupabaseError(error);
        console.error('Supabase batch upload error:', msg, error);
        throw new Error(msg);
      }

      processed += batch.length;
      if (onProgress) onProgress(processed, participants.length);
    }

    return { success: true, count: processed };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Supabase batch upload error:', msg, err);
    return { success: false, count: 0, error: msg };
  }
}

// Helper: Batch upload attendance records to Supabase
export async function batchSyncAttendanceToSupabase(
  records: AttendanceRecord[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, count: 0, error: 'Supabase client is in Offline Mode.' };

  try {
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((r) => ({
        id: String(r.id).trim(),
        participant_id: String(r.participantId).trim(),
        deped_id: r.depedId ? String(r.depedId).trim() : null,
        name: String(r.name || '').trim(),
        district: String(r.district || '').trim(),
        school: String(r.school || '').trim(),
        position: String(r.position || '').trim(),
        scanned_at: r.scannedAt || new Date().toISOString(),
        station_id: String(r.stationId || 'GATE-1').trim(),
        scanner_officer: String(r.scannerOfficer || 'Admin').trim(),
        method: String(r.method || 'MANUAL').trim()
      }));

      const { error } = await client.from('attendance_records').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        const msg = formatSupabaseError(error);
        console.error('Supabase attendance batch upload error:', msg, error);
        throw new Error(msg);
      }

      processed += batch.length;
      if (onProgress) onProgress(processed, records.length);
    }

    return { success: true, count: processed };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Supabase attendance batch upload error:', msg, err);
    return { success: false, count: 0, error: msg };
  }
}

// =========================================================================
// PULL / FETCH HELPERS (Supabase -> Client State)
// =========================================================================

export async function fetchParticipantsFromSupabase(): Promise<Participant[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const allParticipants: Participant[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('participants')
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          allParticipants.push({
            id: String(row.id || ''),
            depedId: row.deped_id || undefined,
            timestamp: row.created_at || undefined,
            lastName: String(row.last_name || ''),
            firstName: String(row.first_name || ''),
            middleName: String(row.middle_name || ''),
            suffix: row.suffix || undefined,
            fullName: String(row.full_name || row.fullName || '').trim() || String(row.id || ''),
            district: row.district || 'SOUTH',
            originalDistrict: row.original_district || undefined,
            personnelType: (row.personnel_type || row.personnelType || 'TEACHING') as any,
            typeOfPersonnel: row.type_of_personnel || undefined,
            school: String(row.school || '').trim(),
            position: String(row.position || '').trim(),
            sex: row.sex || undefined,
            contactNumber: String(row.contact_number || ''),
            email: row.email || undefined,
            eligible: row.eligible || 'INELIGIBLE',
            winner: row.winner || 'NO',
            claimed: row.claimed || 'NO',
            attendedAt: row.attended_at || undefined,
            attendedBy: row.attended_by || undefined,
            status: row.status || 'ACTIVE',
            createdAt: row.created_at || new Date().toISOString()
          });
        });

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return allParticipants;
  } catch (err) {
    console.error('Error fetching participants from Supabase:', err);
    return null;
  }
}

export async function fetchAttendanceRecordsFromSupabase(): Promise<AttendanceRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('attendance_records')
      .select('*')
      .order('scanned_at', { ascending: false });

    if (error) throw error;

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      participantId: row.participant_id,
      depedId: row.deped_id || undefined,
      name: row.name,
      district: row.district,
      school: row.school,
      position: row.position,
      scannedAt: row.scanned_at,
      stationId: row.station_id,
      scannerOfficer: row.scanner_officer,
      method: row.method
    }));
  } catch (err) {
    console.error('Error fetching attendance records from Supabase:', err);
    return null;
  }
}

export async function fetchWinnersFromSupabase(): Promise<Winner[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('winners')
      .select('*')
      .order('drawn_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      winnerId: String(row.winner_id || row.winnerId || ''),
      participantId: String(row.participant_id || row.participantId || ''),
      depedId: row.deped_id || undefined,
      contactNumber: String(row.contact_number || ''),
      email: row.email || undefined,
      sex: row.sex || undefined,
      name: String(row.name || '').trim(),
      district: row.district || 'SOUTH',
      originalDistrict: row.original_district || undefined,
      personnelType: (row.personnel_type || 'TEACHING') as any,
      school: String(row.school || '').trim(),
      position: String(row.position || '').trim(),
      prizeId: String(row.prize_id || ''),
      prizeName: String(row.prize_name || '').trim(),
      unitValue: Number(row.unit_value) || 0,
      drawNumber: String(row.draw_number || ''),
      date: row.date || (row.drawn_at ? row.drawn_at.slice(0, 10) : ''),
      time: row.time || (row.drawn_at ? row.drawn_at.slice(11, 19) : ''),
      claimStatus: row.claim_status || 'UNCLAIMED',
      claimedAt: row.claimed_at || undefined,
      claimedBy: row.claimed_by || undefined,
      idPresented: row.id_presented || undefined,
      isProxyClaim: Boolean(row.is_proxy_claim),
      proxyName: row.proxy_name || undefined,
      proxyRelationship: row.proxy_relationship || undefined,
      forfeitedAt: row.forfeited_at || undefined,
      forfeitReason: row.forfeit_reason || undefined,
      drawType: row.draw_type || (row.draw_number && String(row.draw_number).toUpperCase().startsWith('PRE') ? 'PRE_DRAW' : 'LIVE_STAGE'),
      isPrinted: Boolean(row.is_printed),
      printedAt: row.printed_at || undefined,
      printedBy: row.printed_by || undefined
    }));
  } catch (err) {
    console.error('Error fetching winners from Supabase:', err);
    return null;
  }
}

export async function fetchPrizesFromSupabase(): Promise<Prize[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('prizes')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      unitValue: Number(row.unit_value) || 0,
      quantity: Number(row.quantity) || 1,
      drawnQuantity: Number(row.drawn_quantity) || 0,
      remainingQuantity: Number(row.remaining_quantity) || 0,
      totalValue: Number(row.total_value) || 0,
      status: row.status || 'AVAILABLE',
      category: (row.category as PrizeCategory) || 'MINOR'
    }));
  } catch (err) {
    console.error('Error fetching prizes from Supabase:', err);
    return null;
  }
}

export async function savePrizeToSupabase(prize: Prize): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      error: 'Supabase is in Offline Mode. Please configure your URL & Anon Key in Admin -> Settings.'
    };
  }

  try {
    const row = {
      id: prize.id,
      name: prize.name,
      description: prize.description || null,
      unit_value: prize.unitValue,
      quantity: prize.quantity,
      drawn_quantity: prize.drawnQuantity,
      remaining_quantity: prize.remainingQuantity,
      total_value: prize.totalValue,
      status: prize.status,
      category: prize.category || 'MINOR'
    };

    let { error } = await client.from('prizes').upsert([row], { onConflict: 'id' });
    if (error && (error.message?.includes('category') || error.details?.includes('category') || (error as any).code === '42703')) {
      // Graceful fallback if database does not have category column yet
      const { category, ...fallbackRow } = row;
      const retry = await client.from('prizes').upsert([fallbackRow], { onConflict: 'id' });
      error = retry.error;
    }
    if (error) {
      const formatted = formatSupabaseError(error);
      console.error('Supabase save prize error:', formatted, error);
      return { success: false, error: formatted };
    }
    return { success: true };
  } catch (err: any) {
    const formatted = formatSupabaseError(err);
    console.error('Error saving prize to Supabase:', formatted, err);
    return { success: false, error: formatted };
  }
}

export async function deletePrizeFromSupabase(prizeId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase not connected' };
  }

  try {
    const { error } = await client.from('prizes').delete().eq('id', prizeId);
    if (error) {
      const formatted = formatSupabaseError(error);
      console.error('Supabase delete prize error:', formatted, error);
      return { success: false, error: formatted };
    }
    return { success: true };
  } catch (err: any) {
    const formatted = formatSupabaseError(err);
    console.error('Error deleting prize from Supabase:', formatted, err);
    return { success: false, error: formatted };
  }
}

export async function clearAllPrizesFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase not connected' };
  }

  try {
    const { error } = await client.from('prizes').delete().neq('id', '___NEVER_MATCH___');
    if (error) {
      const formatted = formatSupabaseError(error);
      console.error('Supabase clear prizes error:', formatted, error);
      return { success: false, error: formatted };
    }
    return { success: true };
  } catch (err: any) {
    const formatted = formatSupabaseError(err);
    console.error('Error clearing prizes from Supabase:', formatted, err);
    return { success: false, error: formatted };
  }
}

export async function syncPrizesToSupabase(prizes: Prize[]): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase is in Offline Mode. Enter credentials in Admin -> Settings.' };
  }

  try {
    if (prizes.length === 0) {
      await clearAllPrizesFromSupabase();
      return { success: true, count: 0 };
    }

    const rows = prizes.map((p) => ({
      id: String(p.id).trim(),
      name: String(p.name || '').trim(),
      description: p.description ? String(p.description).trim() : null,
      unit_value: Number(p.unitValue) || 0,
      quantity: Math.max(1, Number(p.quantity) || 1),
      drawn_quantity: Math.max(0, Number(p.drawnQuantity) || 0),
      remaining_quantity: Math.max(0, Number(p.remainingQuantity) || 0),
      total_value: (Number(p.unitValue) || 0) * (Number(p.quantity) || 1),
      status: String(p.status || 'AVAILABLE'),
      category: String(p.category || 'MINOR')
    }));

    let { error } = await client.from('prizes').upsert(rows, { onConflict: 'id' });
    if (error && (error.message?.includes('category') || error.details?.includes('category') || (error as any).code === '42703')) {
      // Graceful fallback if database does not have category column yet
      const fallbackRows = rows.map(({ category, ...rest }) => rest);
      const retry = await client.from('prizes').upsert(fallbackRows, { onConflict: 'id' });
      error = retry.error;
    }
    if (error) {
      const formatted = formatSupabaseError(error);
      console.error('Error syncing prizes to Supabase:', formatted, error);
      return { success: false, count: 0, error: formatted };
    }
    return { success: true, count: rows.length };
  } catch (err: any) {
    const formatted = formatSupabaseError(err);
    console.error('Error syncing prizes to Supabase:', formatted, err);
    return { success: false, count: 0, error: formatted };
  }
}

export async function fetchLogsFromSupabase(): Promise<RaffleLog[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('raffle_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      logId: row.log_id,
      drawNumber: row.draw_number,
      timestamp: row.timestamp,
      prizeId: row.prize_id,
      prizeName: row.prize_name,
      numberOfWinners: row.number_of_winners,
      eligiblePoolSize: row.eligible_pool_size,
      winnerIds: Array.isArray(row.winner_ids) ? row.winner_ids : [],
      winnerNames: Array.isArray(row.winner_names) ? row.winner_names : [],
      status: row.status,
      admin: row.admin,
      distributionMode: row.distribution_mode,
      winnersPerDistrict: row.winners_per_district || undefined,
      drawType: row.draw_type || (row.draw_number && String(row.draw_number).toUpperCase().startsWith('PRE') ? 'PRE_DRAW' : 'LIVE_STAGE')
    }));
  } catch (err) {
    console.error('Error fetching logs from Supabase:', err);
    return null;
  }
}

export async function pushLogToSupabase(log: RaffleLog): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('raffle_logs').upsert({
      log_id: log.logId,
      draw_number: log.drawNumber,
      timestamp: log.timestamp,
      prize_id: log.prizeId,
      prize_name: log.prizeName,
      number_of_winners: log.numberOfWinners,
      eligible_pool_size: log.eligiblePoolSize,
      winner_ids: log.winnerIds,
      winner_names: log.winnerNames,
      status: log.status,
      admin: log.admin,
      distribution_mode: log.distributionMode,
      winners_per_district: log.winnersPerDistrict || null
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error pushing log to Supabase:', err);
    return false;
  }
}

// =========================================================================
// EVENT PREPARATION & RESET HELPERS (Supabase Cloud Wipes & Normalization)
// =========================================================================

export async function clearWinnersFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is in Offline Mode' };
  }
  try {
    const { error } = await client.from('winners').delete().neq('winner_id', '___NEVER_MATCH___');
    if (error) {
      const msg = formatSupabaseError(error);
      console.error('Supabase clear winners error:', msg, error);
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Error clearing winners from Supabase:', msg, err);
    return { success: false, error: msg };
  }
}

export async function clearRaffleLogsFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is in Offline Mode' };
  }
  try {
    const { error } = await client.from('raffle_logs').delete().neq('log_id', '___NEVER_MATCH___');
    if (error) {
      const msg = formatSupabaseError(error);
      console.error('Supabase clear raffle logs error:', msg, error);
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Error clearing raffle logs from Supabase:', msg, err);
    return { success: false, error: msg };
  }
}

export async function clearAttendanceRecordsFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is in Offline Mode' };
  }
  try {
    const { error } = await client.from('attendance_records').delete().neq('id', '___NEVER_MATCH___');
    if (error) {
      const msg = formatSupabaseError(error);
      console.error('Supabase clear attendance records error:', msg, error);
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Error clearing attendance records from Supabase:', msg, err);
    return { success: false, error: msg };
  }
}

export async function clearAllParticipantsFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is in Offline Mode' };
  }
  try {
    const { error } = await client.from('participants').delete().neq('id', '___NEVER_MATCH___');
    if (error) {
      const msg = formatSupabaseError(error);
      console.error('Supabase clear participants error:', msg, error);
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Error clearing participants from Supabase:', msg, err);
    return { success: false, error: msg };
  }
}

// Delete a single participant from Supabase
export async function deleteParticipantFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('participants').delete().eq('id', id);
    if (error) {
      console.error('Error deleting participant from Supabase:', formatSupabaseError(error));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting participant from Supabase:', err);
    return false;
  }
}

// Delete multiple participants from Supabase (for duplicate removal)
export async function deleteParticipantsBatchFromSupabase(ids: string[]): Promise<boolean> {
  const client = getSupabase();
  if (!client || ids.length === 0) return false;
  try {
    const { error } = await client.from('participants').delete().in('id', ids);
    if (error) {
      console.error('Error batch deleting participants from Supabase:', formatSupabaseError(error));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error batch deleting participants from Supabase:', err);
    return false;
  }
}

// Upsert a single participant to Supabase
export async function upsertSingleParticipantToSupabase(p: Participant): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const row = {
      id: String(p.id).trim(),
      deped_id: p.depedId ? String(p.depedId).trim() : null,
      last_name: String(p.lastName || '').trim(),
      first_name: String(p.firstName || '').trim(),
      middle_name: String(p.middleName || '').trim(),
      suffix: p.suffix ? String(p.suffix).trim() : null,
      full_name: String(p.fullName || '').trim() || String(p.id).trim(),
      district: String(p.district || 'SOUTH').trim(),
      original_district: p.originalDistrict ? String(p.originalDistrict).trim() : null,
      personnel_type: String(p.personnelType || 'TEACHING').trim(),
      type_of_personnel: p.typeOfPersonnel ? String(p.typeOfPersonnel).trim() : null,
      school: String(p.school || '').trim(),
      position: String(p.position || '').trim(),
      sex: p.sex ? String(p.sex).trim() : null,
      contact_number: p.contactNumber ? String(p.contactNumber).trim() : null,
      email: p.email ? String(p.email).trim() : null,
      eligible: String(p.eligible || 'INELIGIBLE'),
      winner: String(p.winner || 'NO'),
      claimed: String(p.claimed || 'NO'),
      attended_at: p.attendedAt || null,
      attended_by: p.attendedBy || null,
      status: String(p.status || 'ACTIVE')
    };
    const { error } = await client.from('participants').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Error upserting participant to Supabase:', formatSupabaseError(error));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error upserting participant to Supabase:', err);
    return false;
  }
}

export async function resetParticipantsInSupabase(options?: {
  resetAttendance?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is in Offline Mode' };
  }
  try {
    const updatePayload: Record<string, any> = {
      winner: 'NO',
      claimed: 'NO'
    };
    if (options?.resetAttendance) {
      updatePayload.eligible = 'INELIGIBLE';
      updatePayload.attended_at = null;
      updatePayload.attended_by = null;
    }

    const { error } = await client
      .from('participants')
      .update(updatePayload)
      .neq('id', '___NEVER_MATCH___');

    if (error) {
      const msg = formatSupabaseError(error);
      console.error('Supabase reset participants error:', msg, error);
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Error resetting participants in Supabase:', msg, err);
    return { success: false, error: msg };
  }
}

export async function resetPrizesInventoryInSupabase(
  prizes: Prize[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase client is in Offline Mode' };
  }
  try {
    const resetList = prizes.map((p) => ({
      ...p,
      drawnQuantity: 0,
      remainingQuantity: p.quantity,
      status: 'AVAILABLE' as const
    }));
    return await syncPrizesToSupabase(resetList);
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Error resetting prizes inventory in Supabase:', msg, err);
    return { success: false, count: 0, error: msg };
  }
}

export async function executeFullEventResetInSupabase(options: {
  resetAttendance?: boolean;
  deleteParticipants?: boolean;
  prizes?: Prize[];
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is in Offline Mode' };
  }

  try {
    // 1. Clear Winners table
    const winnersRes = await clearWinnersFromSupabase();
    if (!winnersRes.success) throw new Error(`Winners reset failed: ${winnersRes.error}`);

    // 2. Clear Raffle Logs table
    const logsRes = await clearRaffleLogsFromSupabase();
    if (!logsRes.success) throw new Error(`Raffle logs reset failed: ${logsRes.error}`);

    // 3. Clear Attendance Scan Records table if requested or when purging participants
    if (options.resetAttendance || options.deleteParticipants) {
      const attRes = await clearAttendanceRecordsFromSupabase();
      if (!attRes.success) throw new Error(`Attendance records reset failed: ${attRes.error}`);
    }

    // 4. Either completely purge participants or reset participant winner flags
    if (options.deleteParticipants) {
      const delPartRes = await clearAllParticipantsFromSupabase();
      if (!delPartRes.success) throw new Error(`Participants purge failed: ${delPartRes.error}`);
    } else {
      const partRes = await resetParticipantsInSupabase({ resetAttendance: options.resetAttendance });
      if (!partRes.success) throw new Error(`Participants reset failed: ${partRes.error}`);
    }

    // 5. Reset prizes inventory if provided
    if (options.prizes && options.prizes.length > 0) {
      await resetPrizesInventoryInSupabase(options.prizes);
    }

    return { success: true };
  } catch (err: any) {
    const msg = formatSupabaseError(err);
    console.error('Supabase full event reset error:', msg, err);
    return { success: false, error: msg };
  }
}

// =========================================================================
// REALTIME SUBSCRIPTIONS (Live multi-device websocket channels)
// =========================================================================

export function subscribeToRealtimeUpdates({
  onAttendanceScan,
  onWinnerChange,
  onWinnerDelete,
  onParticipantChange,
  onPrizeChange,
  onLogAdded
}: {
  onAttendanceScan?: (record: AttendanceRecord) => void;
  onWinnerChange?: (winner: Winner) => void;
  onWinnerDelete?: (winnerId: string) => void;
  onParticipantChange?: (participantUpdate: { id: string; eligible?: string; winner?: string; attended_at?: string; attended_by?: string }) => void;
  onPrizeChange?: (prize: Prize) => void;
  onLogAdded?: (log: RaffleLog) => void;
}): (() => void) | null {
  const client = getSupabase();
  if (!client) return null;

  try {
    const channelTopic = `td2026_realtime_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const channel: RealtimeChannel = client
      .channel(channelTopic)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_records' },
        (payload) => {
          if (onAttendanceScan && payload.new && (payload.new as any).id) {
            const row = payload.new as any;
            onAttendanceScan({
              id: row.id,
              participantId: row.participant_id,
              depedId: row.deped_id || undefined,
              name: row.name,
              district: row.district,
              school: row.school,
              position: row.position,
              scannedAt: row.scanned_at,
              stationId: row.station_id,
              scannerOfficer: row.scanner_officer,
              method: row.method
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'winners' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            const deletedId = oldRow?.winner_id || oldRow?.id;
            if (onWinnerDelete && deletedId) {
              onWinnerDelete(deletedId);
            }
            return;
          }

          if (onWinnerChange && payload.new && (payload.new as any).winner_id) {
            const row = payload.new as any;
            onWinnerChange({
              winnerId: String(row.winner_id || row.winnerId || ''),
              participantId: String(row.participant_id || row.participantId || ''),
              depedId: row.deped_id || undefined,
              contactNumber: String(row.contact_number || ''),
              email: row.email || undefined,
              sex: row.sex || undefined,
              name: String(row.name || '').trim(),
              district: row.district || 'SOUTH',
              originalDistrict: row.original_district || undefined,
              personnelType: (row.personnel_type || 'TEACHING') as any,
              school: String(row.school || '').trim(),
              position: String(row.position || '').trim(),
              prizeId: String(row.prize_id || ''),
              prizeName: String(row.prize_name || '').trim(),
              unitValue: Number(row.unit_value) || 0,
              drawNumber: String(row.draw_number || ''),
              date: row.date || (row.drawn_at ? row.drawn_at.slice(0, 10) : ''),
              time: row.time || (row.drawn_at ? row.drawn_at.slice(11, 19) : ''),
              claimStatus: row.claim_status || 'UNCLAIMED',
              claimedAt: row.claimed_at || undefined,
              claimedBy: row.claimed_by || undefined,
              idPresented: row.id_presented || undefined,
              isProxyClaim: Boolean(row.is_proxy_claim),
              proxyName: row.proxy_name || undefined,
              proxyRelationship: row.proxy_relationship || undefined,
              claimNotes: row.claim_notes || undefined
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants' },
        (payload) => {
          if (onParticipantChange && payload.new && (payload.new as any).id) {
            const row = payload.new as any;
            onParticipantChange({
              id: row.id,
              eligible: row.eligible,
              winner: row.winner,
              attended_at: row.attended_at,
              attended_by: row.attended_by
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prizes' },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          if (onPrizeChange && payload.new && (payload.new as any).id) {
            const row = payload.new as any;
            onPrizeChange({
              id: row.id,
              name: row.name,
              description: row.description || '',
              unitValue: Number(row.unit_value) || 0,
              quantity: Number(row.quantity) || 1,
              drawnQuantity: Number(row.drawn_quantity) || 0,
              remainingQuantity: Number(row.remaining_quantity) || 0,
              totalValue: Number(row.total_value) || 0,
              status: row.status || 'AVAILABLE'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'raffle_logs' },
        (payload) => {
          if (onLogAdded && payload.new && (payload.new as any).log_id) {
            const row = payload.new as any;
            onLogAdded({
              logId: row.log_id,
              drawNumber: row.draw_number,
              timestamp: row.timestamp,
              prizeId: row.prize_id,
              prizeName: row.prize_name,
              numberOfWinners: row.number_of_winners,
              eligiblePoolSize: row.eligible_pool_size,
              winnerIds: Array.isArray(row.winner_ids) ? row.winner_ids : [],
              winnerNames: Array.isArray(row.winner_names) ? row.winner_names : [],
              status: row.status,
              admin: row.admin,
              distributionMode: row.distribution_mode,
              winnersPerDistrict: row.winners_per_district || undefined
            });
          }
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing channel:', e);
      }
    };
  } catch (err) {
    console.error('Failed to subscribe to realtime updates:', err);
    return null;
  }
}
