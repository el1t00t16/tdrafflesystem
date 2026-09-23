import { Participant, District, EligibilityStatus, YesNo } from './types';

export type DuplicateMatchType = 'DEPED_ID' | 'FULL_NAME' | 'CONTACT_NUMBER' | 'PROFILING_ID';

export interface DuplicateCluster {
  id: string; // e.g. DUP-DEPED-12345
  matchType: DuplicateMatchType;
  matchValue: string; // The duplicate key (e.g. DepEd ID "1098234" or name "DELA CRUZ, JUAN")
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
  participants: Participant[];
  recommendedKeepId: string; // ID of the best record to keep
}

/**
 * Normalizes text by removing non-alphanumeric chars (except single spaces) and lowercasing.
 */
export function normalizeText(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation/symbols with space
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Normalizes phone numbers (strips leading 0 or +63, spaces, dashes)
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Normalizes DepEd ID (numeric string, trimmed)
 */
export function normalizeDepedId(depedId?: string | null): string {
  if (!depedId) return '';
  const cleaned = depedId.trim().replace(/^0+/, ''); // remove leading zeroes if present
  // Treat placeholder strings like "N/A", "NONE", "—", "-" as empty
  if (['na', 'none', 'n/a', '-', '--'].includes(cleaned.toLowerCase())) {
    return '';
  }
  return cleaned;
}

/**
 * Normalizes a full name for duplicate comparison.
 * Extracts core tokens (last name, first name) to catch order variations or middle initials.
 */
export function getNormalizedNameKey(p: Participant): string {
  const last = normalizeText(p.lastName);
  const first = normalizeText(p.firstName);
  const middle = normalizeText(p.middleName);

  if (last && first) {
    // If middle name exists, take middle initial
    const mi = middle ? middle.charAt(0) : '';
    return `${last}__${first}__${mi}`;
  }

  // Fallback to fullName
  const normFull = normalizeText(p.fullName);
  // Sort tokens so "Juan Dela Cruz" and "Dela Cruz, Juan" match closely
  const tokens = normFull.split(' ').filter(Boolean).sort().join('_');
  return tokens;
}

/**
 * Computes a score representing the completeness, activity, and value of a participant record.
 * Higher score = preferred record to KEEP.
 */
export function scoreParticipant(p: Participant): number {
  let score = 0;

  // 1. Has attended gate (Critical: attendance check-in must never be thrown away!)
  if (p.attendedAt) score += 1000;
  if (p.attendedBy) score += 100;

  // 2. Won in raffle (Critical: cannot discard a winning ticket record!)
  if (p.winner === 'YES') score += 5000;
  if (p.claimed === 'YES') score += 2000;

  // 3. Eligibility status
  if (p.eligible === 'ELIGIBLE') score += 500;

  // 4. Data completeness
  if (normalizeDepedId(p.depedId)) score += 50;
  if (normalizePhone(p.contactNumber)) score += 30;
  if (p.email && p.email.includes('@')) score += 20;
  if (p.sex) score += 10;
  if (p.position && p.position !== 'Teacher') score += 10;
  if (p.school && p.school !== 'Malungon School') score += 10;
  if (p.middleName) score += 15;
  if (p.suffix) score += 5;

  return score;
}

/**
 * Discovers duplicate participant clusters using multi-tier criteria.
 */
export function findDuplicateParticipants(
  participants: Participant[],
  ignoredClusterKeys: Set<string> = new Set()
): DuplicateCluster[] {
  if (!participants || participants.length < 2) return [];

  const clusters: DuplicateCluster[] = [];
  const assignedParticipantIds = new Set<string>();

  // Helper to add a cluster
  const addCluster = (
    matchType: DuplicateMatchType,
    matchValue: string,
    reason: string,
    confidence: 'HIGH' | 'MEDIUM',
    group: Participant[]
  ) => {
    const key = `${matchType}:${matchValue}`;
    if (ignoredClusterKeys.has(key)) return;

    // Filter to only participants not already in an earlier high-confidence cluster
    const uniqueGroup = group.filter((p) => !assignedParticipantIds.has(p.id));
    if (uniqueGroup.length < 2) return;

    uniqueGroup.forEach((p) => assignedParticipantIds.add(p.id));

    // Determine recommended keep ID
    const sorted = [...uniqueGroup].sort((a, b) => scoreParticipant(b) - scoreParticipant(a));
    const recommendedKeepId = sorted[0].id;

    clusters.push({
      id: `DUP-${matchType}-${matchValue.slice(0, 20)}`,
      matchType,
      matchValue,
      reason,
      confidence,
      participants: sorted,
      recommendedKeepId
    });
  };

  // Tier 1: Exact DepEd Employee ID Match (Highest Confidence)
  const depedIdMap = new Map<string, Participant[]>();
  for (const p of participants) {
    const depedKey = normalizeDepedId(p.depedId);
    if (depedKey && depedKey.length >= 4) {
      const list = depedIdMap.get(depedKey) || [];
      list.push(p);
      depedIdMap.set(depedKey, list);
    }
  }

  for (const [depedId, group] of depedIdMap.entries()) {
    if (group.length > 1) {
      addCluster(
        'DEPED_ID',
        depedId,
        `Matching DepEd Employee ID #${depedId}`,
        'HIGH',
        group
      );
    }
  }

  // Tier 2: Normalized Name Key Match (Last + First + Middle initial)
  const nameMap = new Map<string, Participant[]>();
  for (const p of participants) {
    if (assignedParticipantIds.has(p.id)) continue;
    const nameKey = getNormalizedNameKey(p);
    if (nameKey && nameKey.length >= 5) {
      const list = nameMap.get(nameKey) || [];
      list.push(p);
      nameMap.set(nameKey, list);
    }
  }

  for (const [nameKey, group] of nameMap.entries()) {
    if (group.length > 1) {
      const sample = group[0];
      const displayName = sample.lastName && sample.firstName
        ? `${sample.lastName}, ${sample.firstName}`
        : sample.fullName;

      addCluster(
        'FULL_NAME',
        displayName,
        `Identical Full Name (${displayName})`,
        'HIGH',
        group
      );
    }
  }

  // Tier 3: Same Contact Number with Matching Surname
  const phoneMap = new Map<string, Participant[]>();
  for (const p of participants) {
    if (assignedParticipantIds.has(p.id)) continue;
    const phone = normalizePhone(p.contactNumber);
    if (phone && phone.length >= 7) {
      const list = phoneMap.get(phone) || [];
      list.push(p);
      phoneMap.set(phone, list);
    }
  }

  for (const [phone, group] of phoneMap.entries()) {
    if (group.length > 1) {
      // Check if they share at least the same last name or first letter of last name
      const lastNames = group.map((p) => normalizeText(p.lastName || p.fullName));
      const hasSurnameMatch = lastNames.some((l1, i) =>
        lastNames.some((l2, j) => i !== j && l1 && l2 && (l1 === l2 || l1.includes(l2) || l2.includes(l1)))
      );

      if (hasSurnameMatch) {
        addCluster(
          'CONTACT_NUMBER',
          `0${phone}`,
          `Identical Contact Number (0${phone}) & matching surname`,
          'MEDIUM',
          group
        );
      }
    }
  }

  // Tier 4: Exact Profiling ID Match (if any legacy duplicates had same ID)
  const idMap = new Map<string, Participant[]>();
  for (const p of participants) {
    if (assignedParticipantIds.has(p.id)) continue;
    const list = idMap.get(p.id) || [];
    list.push(p);
    idMap.set(p.id, list);
  }

  for (const [id, group] of idMap.entries()) {
    if (group.length > 1) {
      addCluster(
        'PROFILING_ID',
        id,
        `Duplicate Profiling ID (${id})`,
        'HIGH',
        group
      );
    }
  }

  return clusters;
}

/**
 * Merges a secondary participant record into a primary participant record.
 * Retains all high-value activity flags (attendance, winner, claim, eligibility)
 * and fills any blank profile fields in primary using secondary.
 */
export function mergeParticipants(primary: Participant, secondary: Participant): Participant {
  return {
    ...primary,
    // Keep whichever has DepEd ID
    depedId: primary.depedId || secondary.depedId,
    // Keep whichever has contact number
    contactNumber: primary.contactNumber || secondary.contactNumber,
    // Keep whichever has email
    email: primary.email || secondary.email,
    // Keep whichever has sex
    sex: primary.sex || secondary.sex,
    // Keep whichever has middle name / suffix
    middleName: primary.middleName || secondary.middleName,
    suffix: primary.suffix || secondary.suffix,
    // Prioritize attended status
    attendedAt: primary.attendedAt || secondary.attendedAt,
    attendedBy: primary.attendedBy || secondary.attendedBy,
    // Prioritize ELIGIBLE status
    eligible:
      primary.eligible === 'ELIGIBLE' || secondary.eligible === 'ELIGIBLE'
        ? 'ELIGIBLE'
        : primary.eligible,
    // Prioritize YES for winner/claimed
    winner: primary.winner === 'YES' || secondary.winner === 'YES' ? 'YES' : 'NO',
    claimed: primary.claimed === 'YES' || secondary.claimed === 'YES' ? 'YES' : 'NO',
    // Preserve more descriptive position/school if primary is generic
    position:
      primary.position === 'Teacher' && secondary.position !== 'Teacher'
        ? secondary.position
        : primary.position,
    school:
      primary.school === 'Malungon School' && secondary.school !== 'Malungon School'
        ? secondary.school
        : primary.school
  };
}

/**
 * Deduplicates a newly parsed batch of participants against itself and optionally
 * against existing participants.
 */
export function deduplicateBatch(
  batch: Participant[],
  existingParticipants: Participant[] = [],
  mode: 'SKIP_EXISTING' | 'OVERWRITE_EXISTING' | 'APPEND_ALL' = 'SKIP_EXISTING'
): {
  finalList: Participant[];
  internalDuplicatesRemoved: number;
  existingSkippedOrMerged: number;
} {
  if (mode === 'APPEND_ALL') {
    return {
      finalList: [...existingParticipants, ...batch],
      internalDuplicatesRemoved: 0,
      existingSkippedOrMerged: 0
    };
  }

  // 1. Deduplicate within the batch itself
  const seenBatchKeys = new Set<string>();
  const cleanBatch: Participant[] = [];
  let internalDuplicatesRemoved = 0;

  for (const p of batch) {
    const deped = normalizeDepedId(p.depedId);
    const nameKey = getNormalizedNameKey(p);
    const idKey = p.id;

    const isDup =
      (deped && seenBatchKeys.has(`deped:${deped}`)) ||
      (nameKey && seenBatchKeys.has(`name:${nameKey}`)) ||
      seenBatchKeys.has(`id:${idKey}`);

    if (isDup) {
      internalDuplicatesRemoved++;
      continue;
    }

    if (deped) seenBatchKeys.add(`deped:${deped}`);
    if (nameKey) seenBatchKeys.add(`name:${nameKey}`);
    seenBatchKeys.add(`id:${idKey}`);
    cleanBatch.push(p);
  }

  // If no existing participants, cleanBatch is our result
  if (existingParticipants.length === 0) {
    return {
      finalList: cleanBatch,
      internalDuplicatesRemoved,
      existingSkippedOrMerged: 0
    };
  }

  // 2. Resolve against existing participants
  const existingMapById = new Map<string, Participant>();
  const existingMapByDeped = new Map<string, string>(); // deped -> id
  const existingMapByName = new Map<string, string>(); // nameKey -> id

  existingParticipants.forEach((p) => {
    existingMapById.set(p.id, p);
    const deped = normalizeDepedId(p.depedId);
    if (deped) existingMapByDeped.set(deped, p.id);
    const nameKey = getNormalizedNameKey(p);
    if (nameKey) existingMapByName.set(nameKey, p.id);
  });

  let existingSkippedOrMerged = 0;
  const mergedExisting = new Map<string, Participant>(existingMapById);
  const brandNew: Participant[] = [];

  for (const p of cleanBatch) {
    const deped = normalizeDepedId(p.depedId);
    const nameKey = getNormalizedNameKey(p);

    let matchExistingId: string | undefined = undefined;
    if (existingMapById.has(p.id)) {
      matchExistingId = p.id;
    } else if (deped && existingMapByDeped.has(deped)) {
      matchExistingId = existingMapByDeped.get(deped);
    } else if (nameKey && existingMapByName.has(nameKey)) {
      matchExistingId = existingMapByName.get(nameKey);
    }

    if (matchExistingId) {
      existingSkippedOrMerged++;
      if (mode === 'OVERWRITE_EXISTING') {
        const existing = mergedExisting.get(matchExistingId)!;
        mergedExisting.set(matchExistingId, mergeParticipants(p, existing));
      }
      // If mode === 'SKIP_EXISTING', simply ignore p
    } else {
      brandNew.push(p);
    }
  }

  return {
    finalList: [...Array.from(mergedExisting.values()), ...brandNew],
    internalDuplicatesRemoved,
    existingSkippedOrMerged
  };
}
