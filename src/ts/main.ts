import { User } from 'firebase/auth';
import { onAuthChange, loginWithGoogle, logout } from './auth';
import { showToast, openOverlay, closeOverlay, textEl, iconEl, button } from './ui';
import { submitFeedback } from './feedback';
import { appTodayKey, addDays, currentSlotOf, dateKey, labelOf, shortLabelOf } from './dates';
import {
  SLOTS, SLOT_INFO, AI_KINDS, AI_INFO, STATUS_LABEL, WEEKDAY_LABEL, IDEAS, LIMITS, FORMAT_EXAMPLES,
  isSentStatus, buildPrompt, Idea,
} from './templates';
import {
  subscribeRequests, createRequest, updateRequest, deleteRequest,
  subscribeRoutines, createRoutine, updateRoutine, deleteRoutine,
} from './store';
import {
  slotsByDate, streakOf, bestStreakOf, fullDaysOf, slotCounts, savedTotalOf, averageRating, routineAppliesOn,
  formatMinutes,
} from './stats';
import { AiKind, Request, RequestInput, Routine, RoutineInput, Slot, Status } from './types';

// ============================================================
// DOM refs
// ============================================================
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const loginScreen = $('login-screen');
const appEl = $('app');
const userInfo = $('user-info');
const userAvatar = $<HTMLImageElement>('user-avatar');
const userName = $('user-name');
const btnGoogleLogin = $<HTMLButtonElement>('btn-google-login');
const btnLogout = $<HTMLButtonElement>('btn-logout');

const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tabs__btn'));
const panels = Array.from(document.querySelectorAll<HTMLElement>('.panel'));
const countInbox = $('count-inbox');

const todayLoading = $('today-loading');
const todayBody = $('today-body');
const todayDate = $('today-date');
const todayTitle = $('today-title');
const todayStreak = $('today-streak');
const todayDots = $('today-dots');
const waitingBox = $('waiting-box');
const waitingCount = $('waiting-count');
const waitingList = $('waiting-list');
const slotList = $('slot-list');

const btnInboxAdd = $<HTMLButtonElement>('btn-inbox-add');
const inboxList = $('inbox-list');
const inboxEmpty = $('inbox-empty');
const carryBox = $('carry-box');
const carryList = $('carry-list');
const futureBox = $('future-box');
const futureList = $('future-list');
const ideaFilter = $('idea-filter');
const ideaList = $('idea-list');

const btnRoutineAdd = $<HTMLButtonElement>('btn-routine-add');
const routineList = $('routine-list');
const routineEmpty = $('routine-empty');

const statStreak = $('stat-streak');
const statBest = $('stat-best');
const statFull = $('stat-full');
const statSaved = $('stat-saved');
const calTitle = $('cal-title');
const calendarEl = $('calendar');
const calMonthSummary = $('cal-month-summary');
const btnCalPrev = $<HTMLButtonElement>('btn-cal-prev');
const btnCalNext = $<HTMLButtonElement>('btn-cal-next');
const slotBars = $('slot-bars');
const ratingSummary = $('rating-summary');
const goodList = $('good-list');
const goodEmpty = $('good-empty');

const btnFab = $<HTMLButtonElement>('btn-fab');

const reqOverlay = $('req-modal-overlay');
const reqForm = $<HTMLFormElement>('req-form');
const reqModalTitle = $('req-modal-title');
const inputReqTitle = $<HTMLInputElement>('input-req-title');
const builder = $<HTMLDetailsElement>('builder');
const inputBPurpose = $<HTMLTextAreaElement>('input-b-purpose');
const inputBContext = $<HTMLTextAreaElement>('input-b-context');
const inputBFormat = $<HTMLInputElement>('input-b-format');
const formatChips = $('format-chips');
const btnBuild = $<HTMLButtonElement>('btn-build');
const inputReqBody = $<HTMLTextAreaElement>('input-req-body');
const reqAi = $('req-ai');
const reqPlaceField = $('req-place-field');
const reqDay = $('req-day');
const reqSlot = $('req-slot');
const inputReqSaved = $<HTMLInputElement>('input-req-saved');
const btnReqDelete = $<HTMLButtonElement>('btn-req-delete');
const btnReqSubmit = $<HTMLButtonElement>('btn-req-submit');

const routineOverlay = $('routine-modal-overlay');
const routineForm = $<HTMLFormElement>('routine-form');
const routineModalTitle = $('routine-modal-title');
const inputRoutineTitle = $<HTMLInputElement>('input-routine-title');
const inputRoutineBody = $<HTMLTextAreaElement>('input-routine-body');
const routineAi = $('routine-ai');
const routineSlot = $('routine-slot');
const routineWeekdays = $('routine-weekdays');
const inputRoutineSaved = $<HTMLInputElement>('input-routine-saved');
const routineActiveRow = $('routine-active-row');
const inputRoutineActive = $<HTMLInputElement>('input-routine-active');
const btnRoutineDelete = $<HTMLButtonElement>('btn-routine-delete');
const btnRoutineSubmit = $<HTMLButtonElement>('btn-routine-submit');

const pickOverlay = $('pick-modal-overlay');
const pickModalTitle = $('pick-modal-title');
const btnPickNew = $<HTMLButtonElement>('btn-pick-new');
const pickList = $('pick-list');
const pickIdeas = $('pick-ideas');

const loadOverlay = $('load-modal-overlay');
const loadTarget = $('load-target');
const loadDay = $('load-day');
const loadSlots = $('load-slots');

const receiveOverlay = $('receive-modal-overlay');
const receiveForm = $<HTMLFormElement>('receive-form');
const receiveTarget = $('receive-target');
const receiveStars = $('receive-stars');
const inputReceiveMemo = $<HTMLTextAreaElement>('input-receive-memo');
const inputReceiveSaved = $<HTMLInputElement>('input-receive-saved');
const receiveStatus = $('receive-status');
const btnReceiveRoutine = $<HTMLButtonElement>('btn-receive-routine');
const btnReceiveSubmit = $<HTMLButtonElement>('btn-receive-submit');

const confirmOverlay = $('confirm-dialog-overlay');
const confirmTitle = $('confirm-dialog-title');
const confirmText = $('confirm-dialog-text');
const btnConfirmCancel = $<HTMLButtonElement>('btn-confirm-cancel');
const btnConfirmOk = $<HTMLButtonElement>('btn-confirm-ok');

const feedbackBtn = $<HTMLButtonElement>('feedback-btn');
const feedbackOverlay = $('feedback-modal-overlay');
const inputFeedbackMessage = $<HTMLTextAreaElement>('input-feedback-message');
const btnFeedbackClose = $<HTMLButtonElement>('btn-feedback-close');
const btnFeedbackSend = $<HTMLButtonElement>('btn-feedback-send');

// ============================================================
// Icons（開発者定義の固定SVGのみ）
// ============================================================
const svg = (inner: string, size = 22): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const SLOT_ICON: Record<Slot, string> = {
  morning: '<circle cx="32" cy="32" r="10"/><path d="M32 10 V16"/><path d="M32 48 V54"/><path d="M10 32 H16"/><path d="M48 32 H54"/><path d="M16.4 16.4 L20.7 20.7"/><path d="M43.3 43.3 L47.6 47.6"/><path d="M16.4 47.6 L20.7 43.3"/><path d="M43.3 20.7 L47.6 16.4"/>',
  evening: '<path d="M12 30 L32 14 L52 30"/><path d="M18 26 V50 H46 V26"/><path d="M28 50 V38 H36 V50"/>',
  night: '<path d="M38 12 A20 20 0 1 0 52 42 A16 16 0 0 1 38 12 Z"/><path d="M18 14 V20"/><path d="M15 17 H21"/>',
};

const slotIcon = (slot: Slot, size = 22): HTMLElement => iconEl(svg(SLOT_ICON[slot], size), 'slot-icon');

// ============================================================
// State
// ============================================================
type Tab = 'today' | 'inbox' | 'routine' | 'review';

interface State {
  uid: string | null;
  unsubscribes: (() => void)[];
  requests: Request[];
  routines: Routine[];
  loaded: { requests: boolean; routines: boolean };
  tab: Tab;
  ideaSlot: Slot;
  calMonth: { y: number; m: number };
  pending: Set<string>;
  confirmAction: (() => Promise<void>) | null;
  /** 依頼モーダル */
  editingReqId: string | null;
  formAi: AiKind;
  /** 'stock'（受け箱）または YYYY-MM-DD */
  formDay: string;
  formDayOptions: string[];
  formSlot: Slot;
  /** 定番モーダル */
  editingRoutineId: string | null;
  routineFormAi: AiKind;
  routineFormSlot: Slot;
  routineFormWeekdays: Set<number>;
  /** 便に載せる（受け箱から選ぶ） */
  pickSlot: Slot;
  /** 便を選ぶ */
  loadReqId: string | null;
  loadDayKey: string;
  /** 受け取り */
  receiveReqId: string | null;
  receiveRating: number;
  receiveStatus: Status;
}

const now = new Date();
const state: State = {
  uid: null,
  unsubscribes: [],
  requests: [],
  routines: [],
  loaded: { requests: false, routines: false },
  tab: 'today',
  ideaSlot: currentSlotOf(),
  calMonth: { y: now.getFullYear(), m: now.getMonth() },
  pending: new Set(),
  confirmAction: null,
  editingReqId: null,
  formAi: 'chatgpt',
  formDay: 'stock',
  formDayOptions: [],
  formSlot: 'morning',
  editingRoutineId: null,
  routineFormAi: 'chatgpt',
  routineFormSlot: 'morning',
  routineFormWeekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
  pickSlot: 'morning',
  loadReqId: null,
  loadDayKey: '',
  receiveReqId: null,
  receiveRating: 0,
  receiveStatus: 'received',
};

// ============================================================
// Helpers
// ============================================================
const allLoaded = (): boolean => state.loaded.requests && state.loaded.routines;
const today = (): string => appTodayKey();
const findReq = (id: string | null): Request | undefined => state.requests.find((r) => r.id === id);
const findRoutine = (id: string | null): Routine | undefined => state.routines.find((r) => r.id === id);

const stockList = (): Request[] => state.requests.filter((r) => r.status === 'stock');
const carryOverList = (): Request[] =>
  state.requests.filter((r) => r.status === 'planned' && (r.date as string) < today());
const futureListOf = (): Request[] =>
  state.requests.filter((r) => r.status === 'planned' && (r.date as string) > today())
    .sort((a, b) => (a.date as string).localeCompare(b.date as string) || SLOTS.indexOf(a.slot as Slot) - SLOTS.indexOf(b.slot as Slot));
const waitingListOf = (): Request[] =>
  state.requests.filter((r) => r.status === 'sent' && (r.date as string) < today())
    .sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
const slotItems = (key: string, slot: Slot): Request[] =>
  state.requests.filter((r) => r.status !== 'stock' && r.date === key && r.slot === slot)
    .sort((a, b) => a.createdAt - b.createdAt);
/** 今日その便に載る定番のうち、まだ依頼していないもの */
const pendingRoutines = (key: string, slot: Slot): Routine[] =>
  state.routines.filter((rt) => rt.slot === slot && routineAppliesOn(rt, key)
    && !state.requests.some((r) => r.routineId === rt.id && r.date === key));
const sentSlotsOn = (key: string): Set<Slot> => slotsByDate(state.requests).get(key) ?? new Set();

const dayLabel = (key: string): string => {
  if (key === 'stock') return '受け箱';
  if (key === today()) return '今日';
  if (key === addDays(today(), 1)) return '明日';
  return shortLabelOf(key);
};

const binLabel = (r: Pick<Request, 'date' | 'slot'>): string =>
  r.date && r.slot ? `${dayLabel(r.date)}の${SLOT_INFO[r.slot].name}` : '受け箱';

const timeLabel = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 同じキーの処理が進行中なら何もしない（二重送信防止） */
async function withLock(key: string, fn: () => Promise<void>, errorMessage = '保存に失敗しました。通信環境を確認してください'): Promise<boolean> {
  if (state.pending.has(key)) return false;
  state.pending.add(key);
  renderAll();
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(err);
    showToast(errorMessage);
    return false;
  } finally {
    state.pending.delete(key);
    renderAll();
  }
}

function askConfirm(title: string, text: string, action: () => Promise<void>, okLabel = '削除する', danger = true): void {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  btnConfirmOk.textContent = okLabel;
  btnConfirmOk.className = danger ? 'btn btn--danger' : 'btn btn--primary';
  state.confirmAction = action;
  openOverlay(confirmOverlay);
  btnConfirmCancel.focus();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** 依頼文をコピーしてAIを新しいタブで開く（ポップアップブロックを避けるため、開くのはクリック直後に同期で行う） */
async function copyAndOpen(text: string, ai: AiKind): Promise<boolean> {
  const copying = copyText(text);
  const url = AI_INFO[ai].url;
  if (url) window.open(url, '_blank', 'noopener');
  const ok = await copying;
  showToast(ok
    ? (url ? `コピーしました。${AI_INFO[ai].label}に貼り付けて送ってください` : 'コピーしました')
    : 'コピーできませんでした。依頼文を長押ししてコピーしてください');
  return ok;
}

const textOf = (r: Pick<Request, 'title' | 'body'>): string => r.body.trim() || r.title;

/** 満便になったらお祝いを出す（出したら true） */
function notifyIfFull(key: string, before: number): boolean {
  const full = before < SLOTS.length && sentSlotsOn(key).size === SLOTS.length;
  if (full) showToast('満便の日！今日は3便すべてAIにゆだねました');
  return full;
}

// ============================================================
// Actions
// ============================================================
function markSent(r: Request, copy: boolean): void {
  if (copy) void copyAndOpen(textOf(r), r.ai);
  if (!state.uid || isSentStatus(r.status)) return;
  const uid = state.uid;
  const key = r.date as string;
  const before = sentSlotsOn(key).size;
  void withLock(r.id, async () => {
    await updateRequest(uid, r.id, { status: 'sent', sentAt: Date.now() });
    if (!notifyIfFull(key, before) && !copy) showToast(`${SLOT_INFO[r.slot as Slot].name}に依頼しました`);
  });
}

function sendRoutine(rt: Routine, copy: boolean): void {
  if (copy) void copyAndOpen(textOf(rt), rt.ai);
  if (!state.uid) return;
  const uid = state.uid;
  const key = today();
  const before = sentSlotsOn(key).size;
  void withLock(`routine:${rt.id}`, async () => {
    await createRequest(uid, {
      title: rt.title, body: rt.body, ai: rt.ai, status: 'sent', slot: rt.slot, date: key,
      savedMin: rt.savedMin, rating: 0, memo: '', routineId: rt.id, sentAt: Date.now(),
    });
    if (!notifyIfFull(key, before) && !copy) showToast(`${SLOT_INFO[rt.slot].name}に依頼しました`);
  });
}

function unsend(r: Request): void {
  if (!state.uid) return;
  const uid = state.uid;
  // 定番から作った依頼は、未依頼に戻すときは削除して定番の表示に戻す
  if (r.routineId) {
    void withLock(r.id, () => deleteRequest(uid, r.id));
    return;
  }
  void withLock(r.id, () => updateRequest(uid, r.id, { status: 'planned', sentAt: null }));
}

function moveToStock(r: Request): void {
  if (!state.uid) return;
  const uid = state.uid;
  void withLock(r.id, async () => {
    await updateRequest(uid, r.id, { status: 'stock', date: null, slot: null });
    showToast('受け箱に戻しました');
  });
}

function loadTo(r: Request, key: string, slot: Slot): void {
  if (!state.uid) return;
  const uid = state.uid;
  void withLock(r.id, async () => {
    await updateRequest(uid, r.id, { status: 'planned', date: key, slot });
    showToast(`${dayLabel(key)}の${SLOT_INFO[slot].name}に載せました`);
  });
}

function confirmDeleteRequest(r: Request, after?: () => void): void {
  askConfirm('依頼を削除しますか？', `「${r.title}」を削除します。元に戻せません。`, async () => {
    if (!state.uid) return;
    const uid = state.uid;
    const ok = await withLock(r.id, () => deleteRequest(uid, r.id), '削除に失敗しました');
    if (ok) {
      after?.();
      showToast('削除しました');
    }
  });
}

// ============================================================
// Card builders
// ============================================================
function tag(text: string, className = ''): HTMLElement {
  return textEl('span', `tag ${className}`.trim(), text);
}

function preview(text: string): HTMLElement {
  const p = textEl('p', 'req-card__body', text);
  if (text.length > 80 || text.includes('\n')) {
    p.classList.add('is-clamped');
    p.title = 'タップで全文を表示';
    p.addEventListener('click', () => p.classList.toggle('is-clamped'));
  }
  return p;
}

function starsText(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function cardShell(title: string, tags: HTMLElement[], body: string, extraClass = ''): { card: HTMLElement; actions: HTMLElement } {
  const card = document.createElement('article');
  card.className = `req-card ${extraClass}`.trim();
  const head = document.createElement('div');
  head.className = 'req-card__head';
  head.append(textEl('h3', 'req-card__title', title));
  const tagWrap = document.createElement('div');
  tagWrap.className = 'req-card__tags';
  tagWrap.append(...tags);
  card.append(head, tagWrap);
  if (body.trim()) card.append(preview(body));
  const actions = document.createElement('div');
  actions.className = 'req-card__actions';
  card.append(actions);
  return { card, actions };
}

const copyLabel = (ai: AiKind): string => (AI_INFO[ai].url ? `コピーして${AI_INFO[ai].label}を開く` : '依頼文をコピー');

type CardContext = 'slot' | 'waiting' | 'inbox' | 'carry' | 'future' | 'good';

function requestCard(r: Request, ctx: CardContext): HTMLElement {
  const busy = state.pending.has(r.id);
  const tags = [tag(AI_INFO[r.ai].label, 'tag--ai')];
  if (r.routineId) tags.push(tag('定番', 'tag--routine'));
  if (r.status !== 'stock') tags.push(tag(STATUS_LABEL[r.status], `tag--${r.status}`));
  if (ctx === 'waiting' || ctx === 'carry' || ctx === 'future' || ctx === 'good') tags.push(tag(binLabel(r), 'tag--bin'));
  if (r.savedMin > 0) tags.push(tag(`自分なら${formatMinutes(r.savedMin)}`, 'tag--saved'));

  const { card, actions } = cardShell(r.title, tags, ctx === 'good' ? '' : r.body, `is-${r.status}`);

  if ((r.status === 'received' || r.status === 'used') && (r.rating > 0 || r.memo)) {
    const result = document.createElement('div');
    result.className = 'req-card__result';
    if (r.rating > 0) result.append(textEl('span', 'req-card__stars', starsText(r.rating)));
    if (r.memo) result.append(textEl('p', 'req-card__memo', r.memo));
    actions.before(result);
  }
  if (r.status === 'sent' && r.sentAt) {
    actions.before(textEl('p', 'req-card__meta', `${timeLabel(r.sentAt)} に依頼`));
  }

  const add = (label: string, cls: string, fn: () => void): void => {
    const b = button(label, `btn ${cls} btn--sm`, fn);
    b.disabled = busy;
    actions.append(b);
  };

  if (ctx === 'good') {
    add('もう一度', 'btn--primary', () => openRequestModal({ prefill: r, day: today(), slot: r.slot ?? currentSlotOf() }));
    add('コピー', 'btn--ghost', () => { void copyText(textOf(r)).then((ok) => showToast(ok ? 'コピーしました' : 'コピーできませんでした')); });
    return card;
  }

  switch (r.status) {
    case 'stock':
      add('便に載せる', 'btn--primary', () => openLoadModal(r));
      add('編集', 'btn--ghost', () => openRequestModal({ edit: r }));
      add('削除', 'btn--ghost is-danger', () => confirmDeleteRequest(r));
      break;
    case 'planned':
      if (ctx === 'carry') {
        add('便に載せ直す', 'btn--primary', () => openLoadModal(r));
        add('受け箱に戻す', 'btn--ghost', () => moveToStock(r));
        add('削除', 'btn--ghost is-danger', () => confirmDeleteRequest(r));
      } else if (ctx === 'future') {
        add('編集', 'btn--ghost', () => openRequestModal({ edit: r }));
        add('受け箱に戻す', 'btn--ghost', () => moveToStock(r));
      } else {
        add(copyLabel(r.ai), 'btn--primary', () => markSent(r, true));
        add('依頼した', 'btn--ghost', () => markSent(r, false));
        add('編集', 'btn--ghost', () => openRequestModal({ edit: r }));
      }
      break;
    case 'sent':
      add('受け取った', 'btn--primary', () => openReceiveModal(r));
      add('コピー', 'btn--ghost', () => { void copyText(textOf(r)).then((ok) => showToast(ok ? 'コピーしました' : 'コピーできませんでした')); });
      if (ctx === 'slot') add('依頼前に戻す', 'btn--ghost', () => unsend(r));
      break;
    default:
      add('ふりかえり', 'btn--ghost', () => openReceiveModal(r));
      add('編集', 'btn--ghost', () => openRequestModal({ edit: r }));
  }
  return card;
}

function routineTodayCard(rt: Routine): HTMLElement {
  const busy = state.pending.has(`routine:${rt.id}`);
  const tags = [tag(AI_INFO[rt.ai].label, 'tag--ai'), tag('定番', 'tag--routine'), tag('未依頼', 'tag--planned')];
  const { card, actions } = cardShell(rt.title, tags, rt.body, 'is-planned is-routine');
  const b1 = button(copyLabel(rt.ai), 'btn btn--primary btn--sm', () => sendRoutine(rt, true));
  const b2 = button('依頼した', 'btn btn--ghost btn--sm', () => sendRoutine(rt, false));
  b1.disabled = busy;
  b2.disabled = busy;
  actions.append(b1, b2);
  return card;
}

const weekdaysText = (days: number[]): string => {
  const set = new Set(days);
  if (set.size === 7) return '毎日';
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return '平日';
  if (set.size === 2 && set.has(0) && set.has(6)) return '土日';
  if (set.size === 0) return '曜日なし';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => WEEKDAY_LABEL[d]).join('・');
};

function routineCard(rt: Routine): HTMLElement {
  const busy = state.pending.has(`routine:${rt.id}`);
  const tags = [
    tag(`${SLOT_INFO[rt.slot].name}（${SLOT_INFO[rt.slot].when}）`, 'tag--bin'),
    tag(weekdaysText(rt.weekdays), 'tag--routine'),
    tag(AI_INFO[rt.ai].label, 'tag--ai'),
  ];
  if (!rt.active) tags.unshift(tag('お休み中', 'tag--off'));
  const { card, actions } = cardShell(rt.title, tags, rt.body, rt.active ? '' : 'is-off');
  const toggle = button(rt.active ? 'お休みする' : '再開する', 'btn btn--ghost btn--sm', () => {
    if (!state.uid) return;
    const uid = state.uid;
    void withLock(`routine:${rt.id}`, () => updateRoutine(uid, rt.id, { active: !rt.active }));
  });
  const edit = button('編集', 'btn btn--ghost btn--sm', () => openRoutineModal({ edit: rt }));
  const del = button('削除', 'btn btn--ghost is-danger btn--sm', () => confirmDeleteRoutine(rt));
  [toggle, edit, del].forEach((b) => { b.disabled = busy; });
  actions.append(edit, toggle, del);
  return card;
}

function confirmDeleteRoutine(rt: Routine, after?: () => void): void {
  askConfirm('定番の依頼を削除しますか？', `「${rt.title}」を削除します。これまでに依頼した記録は残ります。`, async () => {
    if (!state.uid) return;
    const uid = state.uid;
    const ok = await withLock(`routine:${rt.id}`, () => deleteRoutine(uid, rt.id), '削除に失敗しました');
    if (ok) {
      after?.();
      showToast('削除しました');
    }
  });
}

function ideaCard(idea: Idea, onPick: () => void): HTMLElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'idea-card';
  b.append(
    textEl('span', 'idea-card__title', idea.title),
    textEl('span', 'idea-card__meta', `自分なら${formatMinutes(idea.savedMin)}くらい`),
  );
  b.addEventListener('click', onPick);
  return b;
}

// ============================================================
// Render
// ============================================================
function renderTabs(): void {
  tabButtons.forEach((b) => {
    const active = b.dataset.tab === state.tab;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-selected', String(active));
  });
  panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== state.tab));
  const n = stockList().length + carryOverList().length;
  countInbox.textContent = n > 0 ? String(n) : '';
}

function renderToday(): void {
  const loaded = allLoaded();
  todayLoading.classList.toggle('hidden', loaded);
  todayBody.classList.toggle('hidden', !loaded);
  if (!loaded) return;

  const key = today();
  const nowSlot = currentSlotOf();
  const sent = sentSlotsOn(key);
  todayDate.textContent = labelOf(key);
  todayStreak.textContent = String(streakOf(slotsByDate(state.requests), key));
  if (sent.size === SLOTS.length) {
    todayTitle.textContent = '満便の日です。おつかれさまでした！';
  } else if (sent.size === 0) {
    todayTitle.textContent = `まだ0便。いまは${SLOT_INFO[nowSlot].name}（${SLOT_INFO[nowSlot].when}）の時間です`;
  } else {
    todayTitle.textContent = `今日は${sent.size}便ゆだねました。あと${SLOTS.length - sent.size}便で満便`;
  }
  todayDots.replaceChildren(...SLOTS.map((s) => {
    const dot = document.createElement('span');
    dot.className = `bin-dot${sent.has(s) ? ' is-done' : ''}${s === nowSlot ? ' is-now' : ''}`;
    dot.append(slotIcon(s, 18), textEl('span', 'bin-dot__label', SLOT_INFO[s].name));
    return dot;
  }));

  const waiting = waitingListOf();
  waitingBox.classList.toggle('hidden', waiting.length === 0);
  waitingCount.textContent = String(waiting.length);
  waitingList.replaceChildren(...waiting.map((r) => requestCard(r, 'waiting')));

  slotList.replaceChildren(...SLOTS.map((s) => {
    const items = slotItems(key, s);
    const routines = pendingRoutines(key, s);
    const done = sent.has(s);
    const section = document.createElement('section');
    section.className = `slot${s === nowSlot ? ' is-now' : ''}${done ? ' is-done' : ''}`;

    const head = document.createElement('div');
    head.className = 'slot__head';
    const name = document.createElement('div');
    name.className = 'slot__name';
    name.append(slotIcon(s, 26), textEl('span', 'slot__label', SLOT_INFO[s].name), textEl('span', 'slot__when', SLOT_INFO[s].when));
    head.append(name);
    if (done) head.append(textEl('span', 'slot__badge is-done', '依頼済み'));
    else if (s === nowSlot) head.append(textEl('span', 'slot__badge', 'いまの便'));
    section.append(head);

    if (items.length === 0 && routines.length === 0) {
      section.append(textEl('p', 'slot__hint', SLOT_INFO[s].hint));
    }
    const list = document.createElement('div');
    list.className = 'req-list';
    list.append(...items.map((r) => requestCard(r, 'slot')), ...routines.map(routineTodayCard));
    section.append(list);
    section.append(button('＋ この便に載せる', 'btn btn--ghost btn--block slot__add', () => openPickModal(s)));
    return section;
  }));
}

function renderInbox(): void {
  const stock = stockList();
  inboxList.replaceChildren(...stock.map((r) => requestCard(r, 'inbox')));
  inboxEmpty.classList.toggle('hidden', !allLoaded() || stock.length > 0);

  const carry = carryOverList();
  carryBox.classList.toggle('hidden', carry.length === 0);
  carryList.replaceChildren(...carry.map((r) => requestCard(r, 'carry')));

  const future = futureListOf();
  futureBox.classList.toggle('hidden', future.length === 0);
  futureList.replaceChildren(...future.map((r) => requestCard(r, 'future')));

  ideaFilter.replaceChildren(...SLOTS.map((s) => {
    const b = button(`${SLOT_INFO[s].name}`, `segmented__btn${state.ideaSlot === s ? ' is-active' : ''}`, () => {
      state.ideaSlot = s;
      renderInbox();
    });
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.ideaSlot === s));
    return b;
  }));
  ideaList.replaceChildren(...IDEAS.filter((i) => i.slot === state.ideaSlot).map((idea) =>
    ideaCard(idea, () => openRequestModal({ prefill: idea, day: 'stock', slot: idea.slot }))));
}

function renderRoutines(): void {
  routineList.replaceChildren(...state.routines.map(routineCard));
  routineEmpty.classList.toggle('hidden', !allLoaded() || state.routines.length > 0);
}

function renderReview(): void {
  const byDate = slotsByDate(state.requests);
  const key = today();
  statStreak.textContent = `${streakOf(byDate, key)}日`;
  statBest.textContent = `${bestStreakOf(byDate)}日`;
  statFull.textContent = `${fullDaysOf(byDate)}日`;
  statSaved.textContent = formatMinutes(savedTotalOf(state.requests));

  // カレンダー
  const { y, m } = state.calMonth;
  calTitle.textContent = `${y}年${m + 1}月`;
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const cells: HTMLElement[] = WEEKDAY_LABEL.map((w) => textEl('span', 'calendar__wd', w));
  for (let i = 0; i < first.getDay(); i += 1) cells.push(textEl('span', 'calendar__cell is-blank', ''));
  let monthSent = 0;
  let monthFull = 0;
  for (let d = 1; d <= days; d += 1) {
    const k = dateKey(new Date(y, m, d));
    const n = byDate.get(k)?.size ?? 0;
    monthSent += n;
    if (n === SLOTS.length) monthFull += 1;
    const cell = textEl('span', `calendar__cell level-${n}${k === key ? ' is-today' : ''}${k > key ? ' is-future' : ''}`, String(d));
    cell.title = `${m + 1}月${d}日：${n}便`;
    cells.push(cell);
  }
  calendarEl.replaceChildren(...cells);
  calMonthSummary.textContent = `この月：${monthSent}便（満便 ${monthFull}日）`;
  const thisMonth = new Date();
  btnCalNext.disabled = y > thisMonth.getFullYear() || (y === thisMonth.getFullYear() && m >= thisMonth.getMonth());

  // 時間帯ごと
  const counts = slotCounts(state.requests);
  const max = Math.max(1, ...SLOTS.map((s) => counts[s]));
  slotBars.replaceChildren(...SLOTS.map((s) => {
    const row = document.createElement('div');
    row.className = 'slot-bar';
    const label = document.createElement('div');
    label.className = 'slot-bar__label';
    label.append(slotIcon(s, 18), textEl('span', '', SLOT_INFO[s].name));
    const track = document.createElement('div');
    track.className = 'slot-bar__track';
    const fill = document.createElement('div');
    fill.className = 'slot-bar__fill';
    fill.style.width = `${Math.round((counts[s] / max) * 100)}%`;
    track.append(fill);
    row.append(label, track, textEl('span', 'slot-bar__value', `${counts[s]}件`));
    return row;
  }));
  const avg = averageRating(state.requests);
  const received = state.requests.filter((r) => r.status === 'received' || r.status === 'used');
  const used = received.filter((r) => r.status === 'used').length;
  ratingSummary.textContent = received.length > 0
    ? `受け取った ${received.length}件のうち、活用した ${used}件${avg !== null ? `／平均の役立ち度 ★${avg.toFixed(1)}` : ''}`
    : '受け取った結果を記録すると、役立ち度の平均もここに出ます。';

  const good = received.filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || (b.sentAt ?? 0) - (a.sentAt ?? 0)).slice(0, 10);
  goodList.replaceChildren(...good.map((r) => requestCard(r, 'good')));
  goodEmpty.classList.toggle('hidden', good.length > 0);
}

function renderAll(): void {
  renderTabs();
  if (!state.uid) return;
  if (state.tab === 'today') renderToday();
  if (state.tab === 'inbox') renderInbox();
  if (state.tab === 'routine') renderRoutines();
  if (state.tab === 'review') renderReview();
  if (reqOverlay.classList.contains('is-open')) renderRequestForm();
  if (loadOverlay.classList.contains('is-open')) renderLoadModal();
  if (pickOverlay.classList.contains('is-open')) renderPickModal();
  btnReqSubmit.disabled = state.pending.has('req-form');
  btnRoutineSubmit.disabled = state.pending.has('routine-form');
  btnReceiveSubmit.disabled = state.pending.has('receive-form');
}

// ============================================================
// 共通の選択UI
// ============================================================
function renderChoice<T extends string | number>(
  el: HTMLElement, options: T[], current: T, label: (v: T) => string, onPick: (v: T) => void, cls = 'chip',
): void {
  el.replaceChildren(...options.map((v) => {
    const b = button(label(v), `${cls}${v === current ? ' is-active' : ''}`, () => onPick(v));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(v === current));
    return b;
  }));
}

// ============================================================
// 依頼モーダル
// ============================================================
interface RequestModalOptions {
  edit?: Request;
  prefill?: Partial<Pick<Request, 'title' | 'body' | 'ai' | 'savedMin'>>;
  day?: string;
  slot?: Slot;
}

function renderRequestForm(): void {
  const editing = findReq(state.editingReqId);
  renderChoice(reqAi, AI_KINDS, state.formAi, (v) => AI_INFO[v].label, (v) => { state.formAi = v; renderRequestForm(); });
  const placeable = !editing || editing.status === 'stock' || editing.status === 'planned';
  reqPlaceField.classList.toggle('hidden', !placeable);
  renderChoice(reqDay, state.formDayOptions, state.formDay, dayLabel, (v) => { state.formDay = v; renderRequestForm(); }, 'segmented__btn');
  reqSlot.classList.toggle('hidden', state.formDay === 'stock');
  renderChoice(reqSlot, SLOTS, state.formSlot, (s) => `${SLOT_INFO[s].name}`, (v) => { state.formSlot = v; renderRequestForm(); }, 'segmented__btn');
}

function openRequestModal(opts: RequestModalOptions = {}): void {
  const { edit, prefill } = opts;
  state.editingReqId = edit?.id ?? null;
  reqModalTitle.textContent = edit ? '依頼を編集する' : '依頼を書く';
  inputReqTitle.value = edit?.title ?? prefill?.title ?? '';
  inputReqBody.value = edit?.body ?? prefill?.body ?? '';
  const saved = edit?.savedMin ?? prefill?.savedMin ?? 0;
  inputReqSaved.value = saved > 0 ? String(saved) : '';
  state.formAi = edit?.ai ?? prefill?.ai ?? state.formAi;
  inputBPurpose.value = '';
  inputBContext.value = '';
  inputBFormat.value = '';
  builder.open = false;

  const t = today();
  const options = ['stock', t, addDays(t, 1)];
  const editDay = edit ? (edit.status === 'stock' ? 'stock' : edit.date ?? 'stock') : null;
  if (editDay && !options.includes(editDay)) options.push(editDay);
  state.formDayOptions = options;
  state.formDay = editDay ?? opts.day ?? t;
  state.formSlot = edit?.slot ?? opts.slot ?? currentSlotOf();

  btnReqDelete.classList.toggle('hidden', !edit);
  renderRequestForm();
  closeOverlay(pickOverlay);
  openOverlay(reqOverlay);
  inputReqTitle.focus();
}

function closeRequestModal(): void {
  closeOverlay(reqOverlay);
  state.editingReqId = null;
}

function readMinutes(input: HTMLInputElement): number | null {
  const raw = input.value.trim();
  if (!raw) return 0;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0 || v > LIMITS.savedMin) return null;
  return Math.round(v);
}

reqForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.uid) return;
  const uid = state.uid;
  const body = inputReqBody.value.trim();
  let title = inputReqTitle.value.trim();
  if (!title && body) title = body.split('\n')[0].slice(0, 30);
  if (!title) {
    showToast('何を頼むかを入力してください');
    inputReqTitle.focus();
    return;
  }
  if (title.length > LIMITS.title || body.length > LIMITS.body) {
    showToast('文字数が多すぎます');
    return;
  }
  const savedMin = readMinutes(inputReqSaved);
  if (savedMin === null) {
    showToast(`時間は0〜${LIMITS.savedMin}分で入力してください`);
    inputReqSaved.focus();
    return;
  }
  const editing = findReq(state.editingReqId);
  const placeable = !editing || editing.status === 'stock' || editing.status === 'planned';
  const toStock = state.formDay === 'stock';
  const place: Partial<RequestInput> = placeable
    ? (toStock
      ? { status: 'stock', date: null, slot: null }
      : { status: 'planned', date: state.formDay, slot: state.formSlot })
    : {};

  const ok = await withLock('req-form', async () => {
    if (editing) {
      await updateRequest(uid, editing.id, { title, body, ai: state.formAi, savedMin, ...place });
    } else {
      await createRequest(uid, {
        title, body, ai: state.formAi, status: 'stock', slot: null, date: null,
        savedMin, rating: 0, memo: '', routineId: null, sentAt: null, ...place,
      });
    }
  });
  if (!ok) return;
  closeRequestModal();
  showToast(editing ? '保存しました' : (toStock ? '受け箱に入れました' : `${dayLabel(state.formDay)}の${SLOT_INFO[state.formSlot].name}に載せました`));
});

btnBuild.addEventListener('click', () => {
  const purpose = inputBPurpose.value.trim();
  const context = inputBContext.value.trim();
  const format = inputBFormat.value.trim();
  if (!purpose) {
    showToast('目的を入力してください');
    inputBPurpose.focus();
    return;
  }
  const built = buildPrompt(purpose, context, format);
  const apply = (): void => {
    inputReqBody.value = built.slice(0, LIMITS.body);
    if (!inputReqTitle.value.trim()) inputReqTitle.value = purpose.split('\n')[0].slice(0, 30);
    builder.open = false;
    inputReqBody.focus();
  };
  if (inputReqBody.value.trim()) {
    askConfirm('依頼文を置き換えますか？', '今書いてある依頼文は、ビルダーで組み立てた文章に置き換わります。', async () => apply(), '置き換える', false);
  } else {
    apply();
  }
});

formatChips.replaceChildren(...FORMAT_EXAMPLES.map((f) => button(f, 'chip chip--example', () => {
  const cur = inputBFormat.value.trim();
  inputBFormat.value = cur ? `${cur}、${f}` : f;
})));

btnReqDelete.addEventListener('click', () => {
  const r = findReq(state.editingReqId);
  if (r) confirmDeleteRequest(r, closeRequestModal);
});
$('btn-req-close').addEventListener('click', closeRequestModal);
$('btn-req-cancel').addEventListener('click', closeRequestModal);

// ============================================================
// 定番モーダル
// ============================================================
interface RoutineModalOptions {
  edit?: Routine;
  prefill?: Partial<Pick<Routine, 'title' | 'body' | 'ai' | 'slot' | 'savedMin'>>;
}

function renderRoutineForm(): void {
  renderChoice(routineAi, AI_KINDS, state.routineFormAi, (v) => AI_INFO[v].label, (v) => { state.routineFormAi = v; renderRoutineForm(); });
  renderChoice(routineSlot, SLOTS, state.routineFormSlot, (s) => SLOT_INFO[s].name, (v) => { state.routineFormSlot = v; renderRoutineForm(); }, 'segmented__btn');
  routineWeekdays.replaceChildren(...[1, 2, 3, 4, 5, 6, 0].map((d) => {
    const on = state.routineFormWeekdays.has(d);
    const b = button(WEEKDAY_LABEL[d], `weekdays__btn${on ? ' is-active' : ''}`, () => {
      if (on) state.routineFormWeekdays.delete(d);
      else state.routineFormWeekdays.add(d);
      renderRoutineForm();
    });
    b.setAttribute('aria-pressed', String(on));
    return b;
  }));
}

function openRoutineModal(opts: RoutineModalOptions = {}): void {
  const { edit, prefill } = opts;
  state.editingRoutineId = edit?.id ?? null;
  routineModalTitle.textContent = edit ? '定番の依頼を編集する' : '定番の依頼を登録する';
  inputRoutineTitle.value = edit?.title ?? prefill?.title ?? '';
  inputRoutineBody.value = edit?.body ?? prefill?.body ?? '';
  const saved = edit?.savedMin ?? prefill?.savedMin ?? 0;
  inputRoutineSaved.value = saved > 0 ? String(saved) : '';
  state.routineFormAi = edit?.ai ?? prefill?.ai ?? 'chatgpt';
  state.routineFormSlot = edit?.slot ?? prefill?.slot ?? currentSlotOf();
  state.routineFormWeekdays = new Set(edit?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  routineActiveRow.classList.toggle('hidden', !edit);
  inputRoutineActive.checked = edit?.active ?? true;
  btnRoutineDelete.classList.toggle('hidden', !edit);
  renderRoutineForm();
  openOverlay(routineOverlay);
  inputRoutineTitle.focus();
}

function closeRoutineModal(): void {
  closeOverlay(routineOverlay);
  state.editingRoutineId = null;
}

document.querySelectorAll<HTMLButtonElement>('.weekdays__quick .chip').forEach((b) => {
  b.addEventListener('click', () => {
    const preset = b.dataset.preset;
    state.routineFormWeekdays = new Set(preset === 'weekday' ? [1, 2, 3, 4, 5] : preset === 'weekend' ? [0, 6] : [0, 1, 2, 3, 4, 5, 6]);
    renderRoutineForm();
  });
});

routineForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.uid) return;
  const uid = state.uid;
  const title = inputRoutineTitle.value.trim();
  const body = inputRoutineBody.value.trim();
  if (!title) {
    showToast('何を頼むかを入力してください');
    inputRoutineTitle.focus();
    return;
  }
  if (title.length > LIMITS.title || body.length > LIMITS.body) {
    showToast('文字数が多すぎます');
    return;
  }
  if (state.routineFormWeekdays.size === 0) {
    showToast('載せる曜日を1つ以上選んでください');
    return;
  }
  const savedMin = readMinutes(inputRoutineSaved);
  if (savedMin === null) {
    showToast(`時間は0〜${LIMITS.savedMin}分で入力してください`);
    inputRoutineSaved.focus();
    return;
  }
  const editing = findRoutine(state.editingRoutineId);
  const input: RoutineInput = {
    title, body, ai: state.routineFormAi, slot: state.routineFormSlot,
    weekdays: Array.from(state.routineFormWeekdays).sort(), savedMin,
    active: editing ? inputRoutineActive.checked : true,
  };
  const ok = await withLock('routine-form', () => (editing ? updateRoutine(uid, editing.id, input) : createRoutine(uid, input)));
  if (!ok) return;
  closeRoutineModal();
  showToast(editing ? '保存しました' : `定番に登録しました。${weekdaysText(input.weekdays)}の${SLOT_INFO[input.slot].name}に載ります`);
});

btnRoutineDelete.addEventListener('click', () => {
  const rt = findRoutine(state.editingRoutineId);
  if (rt) confirmDeleteRoutine(rt, closeRoutineModal);
});
$('btn-routine-close').addEventListener('click', closeRoutineModal);
$('btn-routine-cancel').addEventListener('click', closeRoutineModal);

// ============================================================
// 便に載せる（受け箱から選ぶ）
// ============================================================
function renderPickModal(): void {
  const s = state.pickSlot;
  pickModalTitle.textContent = `今日の${SLOT_INFO[s].name}に載せる`;
  const stock = stockList();
  if (stock.length === 0) {
    pickList.replaceChildren(textEl('p', 'pick-list__empty', '受け箱は空です。'));
  } else {
    pickList.replaceChildren(...stock.map((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick-item';
      b.disabled = state.pending.has(r.id);
      b.append(textEl('span', 'pick-item__title', r.title), textEl('span', 'pick-item__meta', AI_INFO[r.ai].label));
      b.addEventListener('click', () => {
        loadTo(r, today(), s);
        closeOverlay(pickOverlay);
      });
      return b;
    }));
  }
  pickIdeas.replaceChildren(...IDEAS.filter((i) => i.slot === s).map((idea) =>
    ideaCard(idea, () => openRequestModal({ prefill: idea, day: today(), slot: s }))));
}

function openPickModal(slot: Slot): void {
  state.pickSlot = slot;
  renderPickModal();
  openOverlay(pickOverlay);
}

btnPickNew.addEventListener('click', () => openRequestModal({ day: today(), slot: state.pickSlot }));
$('btn-pick-close').addEventListener('click', () => closeOverlay(pickOverlay));

// ============================================================
// 便を選ぶ
// ============================================================
function renderLoadModal(): void {
  const r = findReq(state.loadReqId);
  if (!r) {
    closeOverlay(loadOverlay);
    return;
  }
  loadTarget.textContent = `「${r.title}」を載せる便を選んでください。`;
  const t = today();
  renderChoice(loadDay, [t, addDays(t, 1)], state.loadDayKey, dayLabel, (v) => { state.loadDayKey = v; renderLoadModal(); }, 'segmented__btn');
  const sent = sentSlotsOn(state.loadDayKey);
  loadSlots.replaceChildren(...SLOTS.map((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `load-slot${state.loadDayKey === t && s === currentSlotOf() ? ' is-now' : ''}`;
    b.disabled = state.pending.has(r.id);
    const n = slotItems(state.loadDayKey, s).length + (state.loadDayKey === t ? pendingRoutines(t, s).length : 0);
    b.append(
      slotIcon(s, 26),
      textEl('span', 'load-slot__name', `${SLOT_INFO[s].name}（${SLOT_INFO[s].when}）`),
      textEl('span', 'load-slot__meta', sent.has(s) ? '依頼済み' : (n > 0 ? `${n}件 載っています` : '空き')),
    );
    b.addEventListener('click', () => {
      loadTo(r, state.loadDayKey, s);
      closeOverlay(loadOverlay);
    });
    return b;
  }));
}

function openLoadModal(r: Request): void {
  state.loadReqId = r.id;
  state.loadDayKey = today();
  renderLoadModal();
  openOverlay(loadOverlay);
}

$('btn-load-close').addEventListener('click', () => closeOverlay(loadOverlay));

// ============================================================
// 受け取り・ふりかえり
// ============================================================
function renderReceiveForm(): void {
  receiveStars.replaceChildren(...[1, 2, 3, 4, 5].map((n) => {
    const b = button(n <= state.receiveRating ? '★' : '☆', `stars__btn${n <= state.receiveRating ? ' is-on' : ''}`, () => {
      state.receiveRating = state.receiveRating === n ? 0 : n;
      renderReceiveForm();
    });
    b.setAttribute('aria-label', `${n}`);
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.receiveRating === n));
    return b;
  }));
  renderChoice<Status>(receiveStatus, ['received', 'used'], state.receiveStatus,
    (v) => (v === 'used' ? '活用した' : '受け取っただけ'), (v) => { state.receiveStatus = v; renderReceiveForm(); }, 'segmented__btn');
}

function openReceiveModal(r: Request): void {
  state.receiveReqId = r.id;
  state.receiveRating = r.rating;
  state.receiveStatus = r.status === 'used' ? 'used' : 'received';
  receiveTarget.textContent = `「${r.title}」（${binLabel(r)}）`;
  inputReceiveMemo.value = r.memo;
  inputReceiveSaved.value = r.savedMin > 0 ? String(r.savedMin) : '';
  btnReceiveRoutine.classList.toggle('hidden', Boolean(r.routineId));
  renderReceiveForm();
  openOverlay(receiveOverlay);
}

function closeReceiveModal(): void {
  closeOverlay(receiveOverlay);
  state.receiveReqId = null;
}

receiveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.uid) return;
  const uid = state.uid;
  const r = findReq(state.receiveReqId);
  if (!r) return;
  const memo = inputReceiveMemo.value.trim();
  if (memo.length > LIMITS.memo) {
    showToast('メモが長すぎます');
    return;
  }
  const savedMin = readMinutes(inputReceiveSaved);
  if (savedMin === null) {
    showToast(`時間は0〜${LIMITS.savedMin}分で入力してください`);
    inputReceiveSaved.focus();
    return;
  }
  const ok = await withLock('receive-form', () => updateRequest(uid, r.id, {
    status: state.receiveStatus, rating: state.receiveRating, memo, savedMin,
  }));
  if (!ok) return;
  closeReceiveModal();
  showToast(state.receiveStatus === 'used' ? '活用した、を記録しました' : '受け取りを記録しました');
});

btnReceiveRoutine.addEventListener('click', () => {
  const r = findReq(state.receiveReqId);
  if (!r) return;
  closeReceiveModal();
  openRoutineModal({ prefill: { title: r.title, body: r.body, ai: r.ai, slot: r.slot ?? currentSlotOf(), savedMin: r.savedMin } });
});
$('btn-receive-close').addEventListener('click', closeReceiveModal);

// ============================================================
// Events
// ============================================================
tabButtons.forEach((b) => {
  b.addEventListener('click', () => {
    state.tab = (b.dataset.tab as Tab) ?? 'today';
    renderAll();
    window.scrollTo({ top: 0 });
  });
});

btnFab.addEventListener('click', () => {
  if (state.tab === 'routine') openRoutineModal();
  else if (state.tab === 'inbox') openRequestModal({ day: 'stock' });
  else openRequestModal({ day: today(), slot: currentSlotOf() });
});
btnInboxAdd.addEventListener('click', () => openRequestModal({ day: 'stock' }));
btnRoutineAdd.addEventListener('click', () => openRoutineModal());

btnCalPrev.addEventListener('click', () => {
  const { y, m } = state.calMonth;
  state.calMonth = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
  renderReview();
});
btnCalNext.addEventListener('click', () => {
  const { y, m } = state.calMonth;
  state.calMonth = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
  renderReview();
});

// Confirm dialog
btnConfirmCancel.addEventListener('click', () => {
  state.confirmAction = null;
  closeOverlay(confirmOverlay);
});
btnConfirmOk.addEventListener('click', async () => {
  const action = state.confirmAction;
  state.confirmAction = null;
  closeOverlay(confirmOverlay);
  if (action) await action();
});

// 背景クリック・Escで閉じる（確認ダイアログを最優先）
const overlayClosers: [HTMLElement, () => void][] = [
  [confirmOverlay, () => { state.confirmAction = null; closeOverlay(confirmOverlay); }],
  [loadOverlay, () => closeOverlay(loadOverlay)],
  [receiveOverlay, closeReceiveModal],
  [reqOverlay, closeRequestModal],
  [routineOverlay, closeRoutineModal],
  [pickOverlay, () => closeOverlay(pickOverlay)],
  [feedbackOverlay, () => closeOverlay(feedbackOverlay)],
];
overlayClosers.forEach(([overlay, close]) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = overlayClosers.find(([o]) => o.classList.contains('is-open'));
  if (open) open[1]();
});

// Feedback
feedbackBtn.addEventListener('click', () => {
  openOverlay(feedbackOverlay);
  inputFeedbackMessage.focus();
});
btnFeedbackClose.addEventListener('click', () => closeOverlay(feedbackOverlay));
btnFeedbackSend.addEventListener('click', async () => {
  const message = inputFeedbackMessage.value.trim();
  if (!message) {
    showToast('メッセージを入力してください');
    return;
  }
  if (btnFeedbackSend.disabled) return;
  btnFeedbackSend.disabled = true;
  btnFeedbackSend.textContent = '送信中…';
  const ok = await submitFeedback(message);
  btnFeedbackSend.disabled = false;
  btnFeedbackSend.textContent = '送信する';
  if (ok) {
    inputFeedbackMessage.value = '';
    closeOverlay(feedbackOverlay);
    showToast('送信しました。ありがとうございます！');
  } else {
    showToast('送信に失敗しました。時間をおいて再度お試しください');
  }
});

// 開きっぱなしでも「いまの便」や日付の切り替わりに追従する
window.setInterval(() => {
  if (state.uid && !document.hidden) renderAll();
}, 60000);
document.addEventListener('visibilitychange', () => {
  if (state.uid && !document.hidden) renderAll();
});

// ============================================================
// Auth
// ============================================================
btnGoogleLogin.addEventListener('click', async () => {
  if (btnGoogleLogin.disabled) return;
  btnGoogleLogin.disabled = true;
  try {
    await loginWithGoogle();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      console.error(err);
      showToast('ログインに失敗しました。もう一度お試しください');
    }
  } finally {
    btnGoogleLogin.disabled = false;
  }
});

btnLogout.addEventListener('click', async () => {
  try {
    await logout();
  } catch (err) {
    console.error(err);
    showToast('ログアウトに失敗しました');
  }
});

const onLoadError = (err: Error): void => {
  console.error(err);
  showToast('データの読み込みに失敗しました。再読み込みしてください');
};

function onLogin(user: User): void {
  state.uid = user.uid;
  loginScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  userInfo.classList.remove('hidden');
  userAvatar.src = user.photoURL ?? '';
  userAvatar.classList.toggle('hidden', !user.photoURL);
  userAvatar.alt = user.displayName ?? '';
  userName.textContent = user.displayName ?? '';
  state.unsubscribes = [
    subscribeRequests(user.uid, (list) => {
      state.requests = list;
      state.loaded.requests = true;
      renderAll();
    }, onLoadError),
    subscribeRoutines(user.uid, (list) => {
      state.routines = list;
      state.loaded.routines = true;
      renderAll();
    }, onLoadError),
  ];
  renderAll();
}

function onLogout(): void {
  state.unsubscribes.forEach((u) => u());
  state.unsubscribes = [];
  state.uid = null;
  state.requests = [];
  state.routines = [];
  state.loaded = { requests: false, routines: false };
  [reqOverlay, routineOverlay, pickOverlay, loadOverlay, receiveOverlay, confirmOverlay].forEach(closeOverlay);
  state.editingReqId = null;
  state.editingRoutineId = null;
  appEl.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  userInfo.classList.add('hidden');
}

onAuthChange((user) => (user ? onLogin(user) : onLogout()));
