import { Winner } from './types';

const STORAGE_KEY = 'td26_printed_winners_map';

export interface PrintedWinnerRecord {
  isPrinted: boolean;
  printedAt: string;
  printedBy?: string;
}

export type PrintedWinnersMap = Record<string, PrintedWinnerRecord>;

/**
 * Retrieves the stored map of all winners that have been printed.
 */
export function getStoredPrintedWinnersMap(): PrintedWinnersMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Error reading printed winners map from localStorage:', e);
    return {};
  }
}

/**
 * Saves a single winner as printed in persistent storage.
 */
export function markWinnerAsPrintedInStorage(
  winnerId: string,
  printedBy: string = 'Claims Desk'
): void {
  if (typeof window === 'undefined' || !winnerId) return;
  try {
    const map = getStoredPrintedWinnersMap();
    map[winnerId] = {
      isPrinted: true,
      printedAt: new Date().toISOString(),
      printedBy
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving printed winner to localStorage:', e);
  }
}

/**
 * Saves a batch of winners as printed in persistent storage.
 */
export function markWinnersBatchAsPrintedInStorage(
  winnerIds: string[],
  printedBy: string = 'Claims Desk'
): void {
  if (typeof window === 'undefined' || !winnerIds.length) return;
  try {
    const map = getStoredPrintedWinnersMap();
    const timestamp = new Date().toISOString();
    winnerIds.forEach((id) => {
      map[id] = {
        isPrinted: true,
        printedAt: timestamp,
        printedBy
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving printed batch to localStorage:', e);
  }
}

/**
 * Removes a winner from the printed records (moves back to active queue).
 * Explicitly sets isPrinted: false so that hard refreshes (Ctrl+F5) and cloud re-syncs
 * do NOT accidentally re-mark this winner as printed.
 */
export function markWinnerAsUnprintedInStorage(winnerId: string): void {
  if (typeof window === 'undefined' || !winnerId) return;
  try {
    const map = getStoredPrintedWinnersMap();
    map[winnerId] = {
      isPrinted: false,
      printedAt: '',
      printedBy: ''
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error removing printed winner from localStorage:', e);
  }
}

/**
 * Removes a batch of winners from the printed records (moves whole batch back to active queue).
 * Explicitly sets isPrinted: false for each winner.
 */
export function markWinnersBatchAsUnprintedInStorage(winnerIds: string[]): void {
  if (typeof window === 'undefined' || !winnerIds.length) return;
  try {
    const map = getStoredPrintedWinnersMap();
    winnerIds.forEach((id) => {
      map[id] = {
        isPrinted: false,
        printedAt: '',
        printedBy: ''
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error removing printed batch from localStorage:', e);
  }
}

/**
 * Clears all printed winner records from persistent storage (used during event reset).
 */
export function clearPrintedWinnersMap(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing printed winners map:', e);
  }
}

/**
 * Merges a list of winners with persistent print records.
 * Ensures that hard refreshes (Ctrl+F5) or cloud re-syncs do NOT erase isPrinted state.
 * If an explicit entry exists in the local map, its isPrinted flag is the single source of truth.
 */
export function mergeWinnersWithPrintStatus(winners: Winner[]): Winner[] {
  const map = getStoredPrintedWinnersMap();
  let hasNewEntries = false;

  const result = winners.map((w) => {
    const record = map[w.winnerId];
    // If an explicit record exists in storage (true OR false), it takes precedence!
    if (record !== undefined) {
      return {
        ...w,
        isPrinted: Boolean(record.isPrinted),
        printedAt: record.isPrinted ? (record.printedAt || w.printedAt) : undefined,
        printedBy: record.isPrinted ? (record.printedBy || w.printedBy) : undefined
      };
    }
    // If the winner object already had isPrinted (e.g. from cloud or incoming state) but wasn't in map yet, sync it
    if (w.isPrinted) {
      map[w.winnerId] = {
        isPrinted: true,
        printedAt: w.printedAt || new Date().toISOString(),
        printedBy: w.printedBy
      };
      hasNewEntries = true;
      return w;
    }
    return {
      ...w,
      isPrinted: false
    };
  });

  if (hasNewEntries && typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      console.error('Error saving printed batch to localStorage:', e);
    }
  }

  return result;
}
