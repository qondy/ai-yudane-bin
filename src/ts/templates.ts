import { AiKind, Slot, Status } from './types';

export const SLOTS: Slot[] = ['morning', 'evening', 'night'];

export const SLOT_INFO: Record<Slot, { name: string; when: string; hint: string }> = {
  morning: { name: '朝便', when: '出勤前', hint: 'すきま時間に、情報集めや今日の段取りを' },
  evening: { name: '帰宅便', when: '帰宅後', hint: '今日のことを整理したり、明日の下調べを' },
  night: { name: 'おやすみ便', when: '寝る前', hint: '時間のかかる調査やまとめを預けて、朝に受け取る' },
};

export const isSlot = (v: unknown): v is Slot => typeof v === 'string' && (SLOTS as string[]).includes(v);

export const AI_KINDS: AiKind[] = ['chatgpt', 'claude', 'gemini', 'other'];

export const AI_INFO: Record<AiKind, { label: string; url: string | null }> = {
  chatgpt: { label: 'ChatGPT', url: 'https://chatgpt.com/' },
  claude: { label: 'Claude', url: 'https://claude.ai/new' },
  gemini: { label: 'Gemini', url: 'https://gemini.google.com/app' },
  other: { label: 'その他', url: null },
};

export const isAiKind = (v: unknown): v is AiKind => typeof v === 'string' && (AI_KINDS as string[]).includes(v);

export const STATUSES: Status[] = ['stock', 'planned', 'sent', 'received', 'used'];

export const STATUS_LABEL: Record<Status, string> = {
  stock: '受け箱',
  planned: '未依頼',
  sent: '依頼中',
  received: '受け取った',
  used: '活用した',
};

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as string[]).includes(v);

/** 依頼済み（便として数える）状態 */
export const isSentStatus = (s: Status): boolean => s === 'sent' || s === 'received' || s === 'used';

export const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'];

export const LIMITS = {
  title: 60,
  body: 4000,
  memo: 500,
  builderPart: 1000,
  savedMin: 600,
};

export interface Idea {
  slot: Slot;
  title: string;
  body: string;
  savedMin: number;
}

/** 時間帯別の依頼アイデア集 */
export const IDEAS: Idea[] = [
  // 朝便：情報集め・今日の段取り
  {
    slot: 'morning', title: '今日の予定から段取りを組む', savedMin: 10,
    body: '今日の予定とやることを書きます。優先順位と、どの時間帯に何をやるかの段取りを提案してください。\n\n【予定】\n\n【やること】\n',
  },
  {
    slot: 'morning', title: '業界ニュースを3行で', savedMin: 15,
    body: '【分野】に関する最近のニュースや動きを、重要なものから3つ、それぞれ3行で要約してください。仕事にどう関係しそうかも一言ずつ添えてください。',
  },
  {
    slot: 'morning', title: '朝のメールの返信案', savedMin: 15,
    body: '次のメールへの返信文を、丁寧すぎず簡潔なビジネス文で作ってください。\n\n【受け取ったメール】\n\n【伝えたいこと】\n',
  },
  {
    slot: 'morning', title: '会議のアジェンダを作る', savedMin: 15,
    body: '今日の会議のアジェンダを作ってください。目的・話す順番・各項目の時間配分・決めるべきことを箇条書きで。\n\n【会議のテーマ】\n【参加者】\n【時間】\n',
  },
  {
    slot: 'morning', title: '今日の1問：英語フレーズ', savedMin: 5,
    body: '仕事で使える英語フレーズを1つ、例文と使う場面つきで教えてください。最後に、私が自分で英作文する練習問題を1問ください。',
  },
  // 帰宅便：今日の整理・明日の下調べ
  {
    slot: 'evening', title: '今日のふりかえりを整理', savedMin: 10,
    body: '今日あったことを箇条書きで書きます。「うまくいったこと」「改善したいこと」「明日やること」に整理して、改善には具体的な一歩も提案してください。\n\n【今日あったこと】\n',
  },
  {
    slot: 'evening', title: '冷蔵庫の中身で夕飯レシピ', savedMin: 15,
    body: '冷蔵庫にある材料で、30分以内に作れる夕飯のレシピを2案ください。手順は短く、足りない調味料があれば代わりも教えてください。\n\n【材料】\n',
  },
  {
    slot: 'evening', title: '明日の会議の下調べ', savedMin: 20,
    body: '明日の打ち合わせ相手について、事前に知っておくと良いこと（事業内容・最近の動き・聞くと良い質問）をまとめてください。\n\n【相手の会社・テーマ】\n',
  },
  {
    slot: 'evening', title: '買い物の比較', savedMin: 30,
    body: '【買いたいもの】を検討しています。予算【◯円】で、選ぶときのポイントと、候補の比較表（価格帯・長所・短所）を作ってください。',
  },
  {
    slot: 'evening', title: '週末の予定を考える', savedMin: 15,
    body: '今週末の過ごし方を3案ください。【誰と】【予算】【行きたいエリア】の条件で、雨の日の代わり案もつけてください。',
  },
  // おやすみ便：時間のかかる調査・まとめ
  {
    slot: 'night', title: 'じっくり調査レポート', savedMin: 60,
    body: '【テーマ】について、要点・背景・賛否の論点・最新の動向をまとめた調査レポートを作ってください。出典があれば添えて、最後に「明日の自分がすぐ使える結論」を3行で。',
  },
  {
    slot: 'night', title: '企画のたたき台', savedMin: 45,
    body: '【企画の目的】のための企画書のたたき台を作ってください。背景・ねらい・ターゲット・内容・スケジュール・リスクの見出しで、朝に読んで直せる粒度でお願いします。',
  },
  {
    slot: 'night', title: '長い資料の要約', savedMin: 40,
    body: '次の資料を、重要なポイント5つと、私が判断・対応すべきことに分けて要約してください。\n\n【資料】\n',
  },
  {
    slot: 'night', title: '学びたいことの学習プラン', savedMin: 30,
    body: '【学びたいこと】を【期間】で身につけたいです。1週間ごとの学習プランと、毎日15分でできる練習メニューを作ってください。',
  },
  {
    slot: 'night', title: '明日のやることリスト', savedMin: 10,
    body: '頭の中にあることを全部書き出します。明日やること・今週中・いつか、に仕分けて、明日やることは朝いちばんに着手する順に並べてください。\n\n【書き出し】\n',
  },
];

/** 依頼文ビルダー：目的・前提・出力形式から依頼文を組み立てる */
export function buildPrompt(purpose: string, context: string, format: string): string {
  const parts: string[] = [];
  if (purpose) parts.push(`【目的】\n${purpose}`);
  if (context) parts.push(`【前提・背景】\n${context}`);
  if (format) parts.push(`【出力形式】\n${format}`);
  if (parts.length > 0) parts.push('不明点があれば、作業の前に質問してください。');
  return parts.join('\n\n');
}

export const FORMAT_EXAMPLES = ['箇条書きで5つ', '表にまとめて', '300字以内で', '結論→理由→具体例の順に', '3案出して比較'];
