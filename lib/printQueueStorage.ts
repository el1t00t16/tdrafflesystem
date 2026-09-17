import { Winner } from './types';

const STORAGE_KEY = 'td26_printed_winners_map';

export interface PrintedWinnerRecord {
  isPrinted: boolean;
  printedAt: string;
  printedBy: string;
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
 */
export function markWinnerAsUnprintedInStorage(winnerId: string): void {
  if (typeof window === 'undefined' || !winnerId) return;
  try {
    const map = getStoredPrintedWinnersMap();
    delete map[winnerId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error removing printed winner from localStorage:', e);
  }
}

/**
 * Merges a list of winners with persistent print records.
 * Ensures that hard refreshes or cloud re-syncs do NOT erase isPrinted state.
 */
export function mergeWinnersWithPrintStatus(winners: Winner[]): Winner[] {
  const map = getStoredPrintedWinnersMap();
  return winners.map((w) => {
    const record = map[w.winnerId];
    if (record && record.isPrinted) {
      return {
        ...w,
        isPrinted: true,
        printedAt: record.printedAt,
        printedBy: record.printedBy
      };
    }
    // If the winner object already had isPrinted (e.g. from local state) but wasn't in map yet, sync it
    if (w.isPrinted) {
      markWinnerAsPrintedInStorage(w.winnerId, w.printedBy);
      return w;
    }
    return {
      ...w,
      isPrinted: false
    };
  });
}
