const pad = (n: number): string => String(n).padStart(2, '0');

export const DAY_MS = 24 * 60 * 60 * 1000;

/** ローカルタイムの YYYY-MM-DD */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function isDateKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** YYYY-MM-DD のローカル 0:00 */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** YYYY-MM-DD の翌日 0:00（その日の終わり） */
export function endOfKey(key: string): Date {
  const d = parseKey(key);
  d.setDate(d.getDate() + 1);
  return d;
}

export function labelOf(key: string): string {
  const d = parseKey(key);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 始めた日からの経過日数（始めた日を1日目とする） */
export function daysSince(key: string, now = new Date()): number {
  const start = parseKey(key).getTime();
  const today = parseKey(dateKey(now)).getTime();
  return Math.round((today - start) / DAY_MS) + 1;
}

/** 1日の区切り（深夜4時までは前日の「寝る前」として扱う） */
const DAY_START_HOUR = 4;

/** アプリ上の「今日」（4:00 区切り）の YYYY-MM-DD */
export function appTodayKey(now = new Date()): string {
  return dateKey(new Date(now.getTime() - DAY_START_HOUR * 60 * 60 * 1000));
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** 今の時刻にあたる便（〜11時：朝便／〜21時：帰宅便／それ以降：おやすみ便） */
export function currentSlotOf(now = new Date()): 'morning' | 'evening' | 'night' {
  const h = now.getHours();
  if (h >= DAY_START_HOUR && h < 11) return 'morning';
  if (h >= 11 && h < 21) return 'evening';
  return 'night';
}

export function shortLabelOf(key: string): string {
  const d = parseKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
}
