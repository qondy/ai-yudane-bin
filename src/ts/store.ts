import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { isDateKey } from './dates';
import { isAiKind, isSlot, isStatus, LIMITS } from './templates';
import { Request, RequestInput, Routine, RoutineInput } from './types';

type ErrorHandler = (err: Error) => void;

const toMillis = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : Date.now());
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const clampMin = (v: unknown): number => (isNum(v) ? Math.min(LIMITS.savedMin, Math.max(0, v)) : 0);

// ===== 依頼 =====
export function subscribeRequests(uid: string, onData: (list: Request[]) => void, onError: ErrorHandler): () => void {
  return onSnapshot(collection(db, 'users', uid, 'requests'), (snap) => {
    const list: Request[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (typeof data.title !== 'string' || !isStatus(data.status)) return;
      const slot = isSlot(data.slot) ? data.slot : null;
      const date = isDateKey(data.date) ? data.date : null;
      list.push({
        id: d.id,
        title: data.title,
        body: str(data.body),
        ai: isAiKind(data.ai) ? data.ai : 'other',
        // 便・日付が欠けている依頼は受け箱に戻す
        status: data.status !== 'stock' && (!slot || !date) ? 'stock' : data.status,
        slot,
        date,
        savedMin: clampMin(data.savedMin),
        rating: isNum(data.rating) ? Math.min(5, Math.max(0, Math.round(data.rating))) : 0,
        memo: str(data.memo),
        routineId: typeof data.routineId === 'string' ? data.routineId : null,
        sentAt: isNum(data.sentAt) ? data.sentAt : null,
        createdAt: toMillis(data.createdAt),
      });
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    onData(list);
  }, onError);
}

export async function createRequest(uid: string, input: RequestInput): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'requests'), { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

export function updateRequest(uid: string, id: string, patch: Partial<RequestInput>): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'requests', id), { ...patch });
}

export function deleteRequest(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'requests', id));
}

// ===== 定番の依頼 =====
export function subscribeRoutines(uid: string, onData: (list: Routine[]) => void, onError: ErrorHandler): () => void {
  return onSnapshot(collection(db, 'users', uid, 'routines'), (snap) => {
    const list: Routine[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (typeof data.title !== 'string' || !isSlot(data.slot) || !Array.isArray(data.weekdays)) return;
      list.push({
        id: d.id,
        title: data.title,
        body: str(data.body),
        ai: isAiKind(data.ai) ? data.ai : 'other',
        slot: data.slot,
        weekdays: data.weekdays.filter((w: unknown): w is number => isNum(w) && w >= 0 && w <= 6),
        savedMin: clampMin(data.savedMin),
        active: data.active !== false,
        createdAt: toMillis(data.createdAt),
      });
    });
    list.sort((a, b) => a.createdAt - b.createdAt);
    onData(list);
  }, onError);
}

export async function createRoutine(uid: string, input: RoutineInput): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'routines'), { ...input, createdAt: serverTimestamp() });
}

export function updateRoutine(uid: string, id: string, patch: Partial<RoutineInput>): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'routines', id), { ...patch });
}

export function deleteRoutine(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(db, 'users', uid, 'routines', id));
}
