// ポータル API の応答を扱う小さな純関数(旧 extension/lib.js からの移植)

export type Block = { type: string; data?: Record<string, any> };

/** type を省略すると全ブロックを出現順に返す(column の中も辿る) */
export function findBlocks(blocks: Block[] | null | undefined, type?: string): Block[] {
  const out: Block[] = [];
  for (const b of blocks ?? []) {
    if (!type || b.type === type) out.push(b);
    for (const col of (b.data?.cols as { blocks?: Block[] }[] | undefined) ?? []) out.push(...findBlocks(col.blocks, type));
  }
  return out;
}

export type InfoData = { itemNumber?: number; categories?: string[]; unreadOnly?: boolean; isPinned?: boolean };

export function infoQuery(data: InfoData): string {
  const p = ["page_size=" + data.itemNumber];
  const cats = data.categories ?? [];
  if (cats.length) p.push("category_uuid=" + cats.join(","));
  if (data.unreadOnly) p.push("status=unread");
  if (data.isPinned) p.push("is_pinned=1");
  return p.join("&");
}

export function linkLabel(url: string): string {
  if (url.includes("unipa.m-muscat") && url.includes("Mobile")) return "MUSCAT(スマートフォン)";
  if (url.includes("unipa.m-muscat")) return "MUSCAT";
  if (url.includes("myopenlms.net")) return "MU LMS";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export type Cat = "reg" | "exam" | "class" | "off" | "event";

/** 分類の順序が意味を持つ(登録→試験→授業→休み→その他) */
export function catOf(s: string): Cat {
  return /登録|人数制限/.test(s) ? "reg"
    : /試験|^テスト/.test(s) ? "exam"
    : /学期|授業/.test(s) ? "class"
    : /休講日|休業|休日|昭和の日|海の日|山の日|敬老の日|秋分の日|スポーツの日|文化の日|勤労感謝の日|成人の日|建国記念の日|天皇誕生日|春分の日/.test(s) ? "off"
    : "event";
}

/** 1マス幅のバーは折り返さず1行に収めるため名前を短くする */
export function shortLabel(s: string): string {
  return s
    .replace(/^(\d)学期－(.+)$/, "$1学期$2")
    .replace(/^試験・補講.*/, "試験・補講")
    .replace(/^訂正登録.*/, "訂正登録")
    .replace(/^履修登録予備日.*/, "履修予備日")
    .replace(/^予備登録.*/, "予備登録")
    .replace(/^前期卒業・修了式.*/, "卒業・入学式")
    .replace(/^大学入学共通テスト準備$/, "共通テスト準備")
    .replace(/^大学入学共通テスト$/, "共通テスト")
    .replace(/^卒業式・修了式$/, "卒業式")
    .replace(/^同慶節.*/, "創立記念日")
    .replace(/^摩耶祭片付け日$/, "摩耶祭片付け")
    .replace(/^摩耶祭準備日$/, "摩耶祭準備")
    .replace(/^.*の振替休講日$/, "振替休講日")
    .replace(/^.*（授業実施日）$/, "授業実施日");
}

const dayKey = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export type CalEvent = { summary: string; start_at: number; end_at: number };
export type Cell = { col: number; day: number; key: number; today: boolean; weekend: "sun" | "sat" | "" };
export type Bar = { c1: number; c2: number; lane: number; summary: string; cat: Cat; left: boolean; right: boolean };
export type Week = { cells: Cell[]; bars: Bar[]; lanes: number };

/** month は1〜12、todayKey は yyyymmdd の数値。events の end_at は終了日の翌日0時(排他的) */
export function buildMonthGrid(events: CalEvent[], year: number, month: number, todayKey: number): Week[] {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const evs = events.map((e) => {
    const a = dayKey(new Date(e.start_at * 1000));
    const b = e.end_at > e.start_at ? Math.max(a, dayKey(new Date((e.end_at - 1) * 1000))) : a;
    return { summary: e.summary, a, b, cat: catOf(e.summary) };
  });
  const weeks: Week[] = [];
  for (let w = 0; w < Math.ceil((first + days) / 7); w++) {
    const cells: Cell[] = [];
    for (let col = 1; col <= 7; col++) {
      const d = w * 7 - first + col;
      if (d < 1 || d > days) continue;
      const key = year * 10000 + month * 100 + d;
      cells.push({ col, day: d, key, today: key === todayKey, weekend: col === 1 ? "sun" : col === 7 ? "sat" : "" });
    }
    const bars: Bar[] = [];
    for (const e of evs) {
      let c1 = 0, c2 = 0, k1 = 0, k2 = 0;
      for (const c of cells) {
        if (c.key < e.a || c.key > e.b) continue;
        if (!c1) { c1 = c.col; k1 = c.key; }
        c2 = c.col; k2 = c.key;
      }
      if (c1) bars.push({ c1, c2, lane: 0, summary: e.summary, cat: e.cat, left: k1 === e.a, right: k2 === e.b });
    }
    bars.sort((x, y) => x.c1 - y.c1 || (y.c2 - y.c1) - (x.c2 - x.c1));
    const lanes: number[] = [];
    for (const g of bars) {
      let lane = lanes.findIndex((end) => end < g.c1);
      if (lane < 0) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = g.c2;
      g.lane = lane;
    }
    weeks.push({ cells, bars, lanes: lanes.length });
  }
  return weeks;
}

export function fileKind(mime: string | undefined): string {
  const m = (mime ?? "").toLowerCase();
  return m === "application/pdf" ? "PDF"
    : m.startsWith("image/") ? "画像"
    : /excel|spreadsheetml/.test(m) ? "Excel"
    : /powerpoint|presentationml/.test(m) ? "PowerPoint"
    : /word|wordprocessingml/.test(m) ? "Word"
    : "ファイル";
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** 今日なら HH:MM、それ以外は M/D */
export function fmtWhen(sec: number, now = new Date()): string {
  const d = new Date(sec * 1000);
  if (d.toDateString() === now.toDateString()) return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** M/D HH:MM */
export function fmtDue(sec: number): string {
  const d = new Date(sec * 1000);
  return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

const WEEKDAYS = "日月火水木金土";

/** y.m.d(曜) HH:MM */
export function fmtFull(sec: number): string {
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}(${WEEKDAYS[d.getDay()]}) ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export type NotifyOpts = { page?: number; query?: string; unread?: boolean; pinned?: boolean; category?: string };

/** お知らせ一覧の URL。検索語は 2 文字以上のときだけ付ける */
export function notifyQuery({ page, query, unread, pinned, category }: NotifyOpts = {}): string {
  const p = ["page_size=20", "recursive=true"];
  if (category) p.push("category_uuid=" + encodeURIComponent(category));
  if (unread) p.push("status=unread");
  if (pinned) p.push("is_pinned=1");
  const q = (query ?? "").trim();
  if (q.length >= 2) p.push("fulltext=" + encodeURIComponent(q));
  return "/api/information/" + (page || 1) + "?" + p.join("&");
}

/** 「すべて既読にする」の URL。カテゴリがあればそれを優先(検索・未読のみは対象外) */
export function readAllPath({ pinned, category }: { pinned?: boolean; category?: string } = {}): string {
  const base = "/api/information/set-read-all/";
  if (category) return base + encodeURIComponent(category);
  return pinned ? base + "?is_pinned=1" : base;
}

export type FlatCategory ={ uuid: string; name: string; name_en?: string; unread_count?: unknown; depth: number };

export function flattenCategories(items: any[] | undefined, depth = 0): FlatCategory[] {
  return (items ?? []).flatMap((c) => [
    { uuid: c.uuid, name: c.name, name_en: c.name_en, unread_count: c.unread_count, depth },
    ...flattenCategories(c.children, depth + 1),
  ]);
}

/** 親の unread_count は子を含むと仮定(実機未確認) */
export function unreadTotal(flat: FlatCategory[]): number {
  return flat.filter((c) => c.depth === 0).reduce((s, c) => s + (typeof c.unread_count === "number" ? c.unread_count : 0), 0);
}

const hasContent = (bs: Block[]) => bs.some((b) => b && (b.type !== "paragraph" || String(b.data?.text ?? "").replace(/<[^>]*>/g, "").trim() !== ""));

/**
 * 英語版が未翻訳のページは content_en が「空の段落1つ」だけ。中身のあるブロックが1つでもあるときだけ英語版を使う
 */
export function pickBlocks(result: any, lang: "ja" | "en"): Block[] | null {
  const blocks = (c: any): Block[] | null => (c && Array.isArray(c.blocks) ? c.blocks : null);
  const en = lang === "en" ? blocks(result?.content_en) : null;
  return en && hasContent(en) ? en : blocks(result?.content);
}
