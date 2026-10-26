// ページのブロック列を節に分ける小さな純関数(旧 extension/lib.js からの移植。半幅カード用の wide は持たない)
import { findBlocks, type Block } from "./lib";

const SUPPORTED = new Set("column title paragraph list file image divider toc notification linkBox callout calendar fileShare".split(" "));

/** 描画できないブロックが 1 つでもあれば false(元の画面に任せる) */
export const isSupported = (blocks: Block[]): boolean => findBlocks(blocks).every((b) => SUPPORTED.has(b.type));

const levelOf = (b: Block): number => (b.type === "title" ? Number(b.data?.level) || 0 : 0);
const colsOf = (b: Block): { blocks?: Block[] }[] => (b.type === "column" ? b.data?.cols ?? [] : []);

/** 子が notification だけの column(お知らせページの左右 2 枚) */
export function isNotificationOnly(b: Block): boolean {
  const kids = colsOf(b).flatMap((c) => c.blocks ?? []);
  return kids.length > 0 && kids.every((k) => k.type === "notification");
}

const titled = (c: { blocks?: Block[] }) => !!c.blocks && c.blocks.length > 1 && c.blocks[0]!.type === "title";
const onlyNotes = (c: { blocks?: Block[] }) => !!c.blocks?.length && c.blocks.every((k) => k.type === "notification");

/**
 * 列ごとに別の節にする column(2 列以上): どの列も title で始まるか、お知らせだけ。少なくとも 1 列は title で始まる
 * (キャンパスライフの「学生生活ハンドブック」+「お知らせ」の 2 列。まとめて 1 節にすると左の見出しの列が空いた。実機で確認)
 */
export function isTitledColumns(b: Block): boolean {
  const cols = colsOf(b);
  return cols.length >= 2 && cols.every((c) => titled(c) || onlyNotes(c)) && cols.some(titled);
}

export type Section = { head: Block | null; blocks: Block[] };

const plain = (h: unknown) => String(h ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, "");

/**
 * ページごとに見出しレベルの使い方が違うので、区切りレベルは出現回数から決める。
 * title を渡すと、先頭の「ページ名と同じ見出し」または見出し無しで段落だけの節を lead として取り出す
 */
export function sectionize(blocks: Block[] | null | undefined, title?: string | string[]): { lead: Block[]; sections: Section[] } {
  const list = blocks ?? [];
  const count: Record<number, number> = {};
  for (const b of list) if (levelOf(b)) count[levelOf(b)] = (count[levelOf(b)] ?? 0) + 1;
  const levels = Object.keys(count).map(Number);
  const twice = levels.filter((l) => count[l]! >= 2);
  const S = Math.min(...(twice.length ? twice : levels)); // 見出しが無ければ Infinity で何も区切らない

  const sections: Section[] = [];
  let head: Block | null = null;
  let cur: Block[] = [];
  const flush = () => {
    if (cur.length) sections.push({ head, blocks: cur });
    head = null;
    cur = [];
  };
  for (const b of list) {
    const lv = levelOf(b);
    if (lv && lv <= S) { flush(); head = b; }
    else if (isTitledColumns(b)) {
      flush();
      for (const col of colsOf(b))
        sections.push(titled(col) ? { head: col.blocks![0]!, blocks: col.blocks!.slice(1) } : { head: null, blocks: col.blocks! });
    } else if (isNotificationOnly(b)) {
      flush();
      for (const col of colsOf(b)) for (const n of col.blocks ?? []) sections.push({ head: null, blocks: [n] });
    } else cur.push(b);
  }
  flush();

  const first = sections[0];
  let lead: Block[] = [];
  if (title != null && first && first.blocks.every((b) => b.type === "paragraph")
    && (!first.head || ([] as string[]).concat(title).some((x) => plain(first.head!.data?.text) === plain(x)))) lead = sections.shift()!.blocks;
  return { lead, sections };
}

/** 段落がファイルブロックと同じファイルへのリンク 1 つだけなら、二重になるので捨てる */
export function isDupFileLink(html: string | null | undefined, uuids: Set<string>): boolean {
  const m = /^\s*<a\b[^>]*href="[^"]*\/api\/file\/view\/([0-9a-f-]{36})[^"]*"[^>]*>[^<]*<\/a>\s*$/i.exec(html ?? "");
  return !!m && uuids.has(m[1]!);
}

export function fmtSize(n: unknown): string {
  if (typeof n !== "number" || !(n > 0)) return "";
  if (n < 1024) return Math.round(n) + " B";
  let v = n, i = 0;
  while (v >= 1024 && i < 3) { v /= 1024; i++; }
  return (v >= 10 ? Math.round(v) : v.toFixed(1)) + " " + ["B", "KB", "MB", "GB"][i];
}

/** YYYY/M/D(秒) */
export function fmtYmd(sec: unknown): string {
  if (typeof sec !== "number") return "";
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 元の文面の「MOREボタン」は、この画面では「すべて見る」ボタンにあたる */
export const reword = (h: unknown): string => String(h ?? "").replace(/MOREボタン/g, "「すべて見る」ボタン");

/** 電子キャビネットのページか(空の段落と見出しを除くと fileShare 1 つだけ) */
export function isSoleCabinet(blocks: Block[]): boolean {
  const rest = blocks.filter((b) => b.type !== "title" && !(b.type === "paragraph" && plain(b.data?.text) === ""));
  return rest.length === 1 && rest[0]!.type === "fileShare";
}
