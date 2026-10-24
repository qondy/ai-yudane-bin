import { addDays, parseKey } from './dates';
import { isSentStatus, SLOTS } from './templates';
import { Request, Routine, Slot } from './types';

/** 依頼済みの依頼（便として数える） */
export const sentRequests = (list: Request[]): Request[] =>
  list.filter((r) => isSentStatus(r.status) && r.date && r.slot);

/** 日付ごとの「依頼した便」の集合 */
export function slotsByDate(list: Request[]): Map<string, Set<Slot>> {
  const map = new Map<string, Set<Slot>>();
  sentRequests(list).forEach((r) => {
    const key = r.date as string;
    if (!map.has(key)) map.set(key, new Set());
    (map.get(key) as Set<Slot>).add(r.slot as Slot);
  });
  return map;
}

/**
 * 連続日数（1便でも依頼した日が続いた日数）。
 * 今日がまだ0便でも、昨日まで続いていれば途切れていない扱いにする
 */
export function streakOf(byDate: Map<string, Set<Slot>>, today: string): number {
  let key = byDate.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (byDate.has(key)) {
    count += 1;
    key = addDays(key, -1);
  }
  return count;
}

export function bestStreakOf(byDate: Map<string, Set<Slot>>): number {
  const keys = Array.from(byDate.keys()).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  keys.forEach((k) => {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  });
  return best;
}

export const fullDaysOf = (byDate: Map<string, Set<Slot>>): number =>
  Array.from(byDate.values()).filter((s) => s.size === SLOTS.length).length;

export function slotCounts(list: Request[]): Record<Slot, number> {
  const counts: Record<Slot, number> = { morning: 0, evening: 0, night: 0 };
  sentRequests(list).forEach((r) => { counts[r.slot as Slot] += 1; });
  return counts;
}

/** 受け取った依頼の時短見込み（分）の合計 */
export const savedTotalOf = (list: Request[]): number =>
  list.filter((r) => r.status === 'received' || r.status === 'used').reduce((sum, r) => sum + r.savedMin, 0);

export function averageRating(list: Request[]): number | null {
  const rated = list.filter((r) => r.rating > 0);
  if (rated.length === 0) return null;
  return rated.reduce((sum, r) => sum + r.rating, 0) / rated.length;
}

/** 指定日にその定番が載る日か */
export const routineAppliesOn = (routine: Routine, key: string): boolean =>
  routine.active && routine.weekdays.includes(parseKey(key).getDay());

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}時間` : `${h}時間${rest}分`;
}
