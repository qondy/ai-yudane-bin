/** 1日3便 */
export type Slot = 'morning' | 'evening' | 'night';

/** 使うAI */
export type AiKind = 'chatgpt' | 'claude' | 'gemini' | 'other';

/**
 * 依頼の状態
 * stock: 受け箱（まだ便に載せていない） / planned: 便に載せた / sent: 依頼中 /
 * received: 受け取った / used: 活用した
 */
export type Status = 'stock' | 'planned' | 'sent' | 'received' | 'used';

/** users/{uid}/requests/{id} AIへの依頼 */
export interface Request {
  id: string;
  title: string;
  body: string;
  ai: AiKind;
  status: Status;
  /** 載せた便（受け箱なら null） */
  slot: Slot | null;
  /** 載せた日（YYYY-MM-DD。受け箱なら null） */
  date: string | null;
  /** 自分でやったら何分かかるか（時短の見込み。未入力は 0） */
  savedMin: number;
  /** 受け取ったときの役立ち度（0=未評価, 1〜5） */
  rating: number;
  /** ふりかえりメモ */
  memo: string;
  /** 定番の依頼から作られた場合の元ID */
  routineId: string | null;
  /** 依頼した時刻（ms） */
  sentAt: number | null;
  createdAt: number;
}

export type RequestInput = Omit<Request, 'id' | 'createdAt'>;

/** users/{uid}/routines/{id} 定番の依頼（毎日・決まった曜日に自動で便に載る） */
export interface Routine {
  id: string;
  title: string;
  body: string;
  ai: AiKind;
  slot: Slot;
  /** 載せる曜日（0=日〜6=土） */
  weekdays: number[];
  savedMin: number;
  active: boolean;
  createdAt: number;
}

export type RoutineInput = Omit<Routine, 'id' | 'createdAt'>;
