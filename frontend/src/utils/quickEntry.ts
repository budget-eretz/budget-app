/**
 * Helpers for deriving "quick entry" suggestions (frequently used funds and
 * descriptions) from a user's own reimbursement / planned-expense history.
 *
 * Everything here is computed client-side from records the user already has
 * access to, so no backend changes are required.
 */

export interface HistoryRecord {
  fund_id: number;
  description?: string | null;
  created_at?: string | null;
  planned_date?: string | null;
  expense_date?: string | null;
}

const getRecency = (record: HistoryRecord): number => {
  const raw = record.created_at || record.planned_date || record.expense_date;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Returns the most frequently used fund ids, ordered by usage count and then
 * by recency. Only fund ids present in `allowedFundIds` are returned (so we
 * never suggest a fund the user can no longer access).
 */
export function getFrequentFundIds(
  records: HistoryRecord[],
  allowedFundIds: Set<number>,
  limit = 5
): number[] {
  const stats = new Map<number, { count: number; lastUsed: number }>();

  for (const record of records) {
    const fundId = record.fund_id;
    if (!allowedFundIds.has(fundId)) continue;

    const recency = getRecency(record);
    const existing = stats.get(fundId);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = Math.max(existing.lastUsed, recency);
    } else {
      stats.set(fundId, { count: 1, lastUsed: recency });
    }
  }

  return [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].lastUsed - a[1].lastUsed)
    .slice(0, limit)
    .map(([fundId]) => fundId);
}

/**
 * Returns the most frequently used descriptions for a specific fund, ordered
 * by usage count and then recency. Descriptions are de-duplicated by their
 * trimmed/normalized form (keeping the most recent original casing).
 */
export function getFrequentDescriptions(
  records: HistoryRecord[],
  fundId: number | null,
  limit = 6
): string[] {
  if (!fundId) return [];

  const stats = new Map<
    string,
    { label: string; count: number; lastUsed: number }
  >();

  for (const record of records) {
    if (record.fund_id !== fundId) continue;
    const description = (record.description || '').trim();
    if (!description) continue;

    const key = description.toLowerCase();
    const recency = getRecency(record);
    const existing = stats.get(key);
    if (existing) {
      existing.count += 1;
      if (recency >= existing.lastUsed) {
        existing.lastUsed = recency;
        existing.label = description;
      }
    } else {
      stats.set(key, { label: description, count: 1, lastUsed: recency });
    }
  }

  return [...stats.values()]
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit)
    .map((entry) => entry.label);
}

/** Quick-add increments offered next to the amount field. */
export const AMOUNT_QUICK_ADDS = [1, 5, 10, 50, 100];

/** Adds an increment to the current amount string, returning a clean string. */
export function addToAmount(current: string, increment: number): string {
  const base = parseFloat(current);
  const next = (Number.isNaN(base) ? 0 : base) + increment;
  // Avoid trailing ".00" noise while keeping cents when present.
  return Number.isInteger(next) ? next.toString() : next.toFixed(2);
}
