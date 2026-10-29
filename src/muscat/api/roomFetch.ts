import { MuscatDownError, NoticeError, ParseError } from "./errors";
import { applyPartialResponse, buildPartialRequest, updateText } from "./partial";
import { squash } from "./parse/genericControls";
import { isRoomRow, parseRoomResult, parseRoomRows, roomNameOf, tableLayout } from "./parse/roomTimeline";
import type { Fetch } from "./recover";
import type { RoomInfo, RoomRow } from "./types";
import { scriptIdWith } from "./virtual/widgets";

const DATA_LIST = "funcForm:dataList";
const INFO = "funcForm:kstOverlay"; // ⓘ を押すと描き直される小窓
const BOOKING = "funcForm:yoyakOverlay"; // 予約の帯を押すと描き直される小窓
const FORWARD = "funcForm:forwardBtn"; // 元の画面の「次へ」(名前は逆で、nextBtn が前へ)

async function send(doc: Document, fetch: Fetch, source: string, extra: Record<string, string | null>, render: string, execute: string): Promise<string> {
  const form = doc.getElementById("funcForm") as HTMLFormElement | null;
  if (!form) throw new ParseError("funcForm がありません");
  const req = buildPartialRequest(form, source, extra, render, execute);
  const res = await fetch(req.url, { method: "POST", headers: req.headers, body: req.body, credentials: "include" });
  if (!res.ok) throw new MuscatDownError(`教室の予約を取れませんでした (${res.status})`);
  return res.text();
}

/**
 * 元のページのボタンと同じ通信を直接送り、応答を生きたページに反映する(<eval> は動かさない)。
 * 元のページに押させると、続きの取得のたびに 1,400 個の update の反映で画面が止まった(実機で測定)
 */
export async function roomSubmit(doc: Document, fetch: Fetch, source: string, execute: string): Promise<void> {
  const xml = await send(doc, fetch, source, {}, DATA_LIST, execute);
  applyPartialResponse(doc, xml); // 失敗でも反映する(rx-token が替わり、しないと次の通信が通らない)
  // 表が新しいページに替わったので、ⓘ と予約の指し方を覚え直す(先頭 40 行は各ボタン・帯の id)
  const page = { drained: false, rooms: new Map<string, Addr>(), bookings: new Map<string, Addr>() };
  pages.set(doc, page);
  remember(page, [...doc.querySelectorAll("#funcForm\\:yoyakuArea tbody.ui-datatable-data > tr")]);
  // 結果が多すぎる(999 件超)・期間が 30 日を超えるなどでは、元のページはメッセージの小窓を出して検索をやめ、前の結果を残す(実機で確認)
  const notice = dialogMessages(xml);
  if (notice) throw new NoticeError(notice);
}

/**
 * 応答の <eval> にある、元のページのエラー・警告の小窓の文。MessageDialog.openDialog('errorMessageDialog', 設定, 'errDialogOpen', "<li>文<li>文")
 * の最後の文字列に入る(実機で確認)。<eval> は動かさないので、ここで読まないと何も出ない。無ければ ""
 */
export function dialogMessages(xml: string): string {
  const html = [...xml.matchAll(/MessageDialog\.openDialog\('(?:error|warning)MessageDialog'[\s\S]*?,\s*"((?:[^"\\]|\\.)*)"\s*\)/g)].map((m) => m[1]!).join("");
  return html.split(/<li>/i).map((s) => squash(s.replace(/<[^>]*>/g, " ").replace(/\\(.)/g, "$1"))).filter(Boolean).join(" ");
}

/** 応答の中の、ある id の update の HTML を別の Document として読む。無ければ null */
function updateOf(xml: string, id: string): Document | null {
  const html = updateText(xml, id);
  return html === undefined ? null : new DOMParser().parseFromString(html, "text/html");
}

/** 続きの行(1 回 40 行)を取る。応答の ViewState は生きたページに反映する(しないと次の通信が通らない) */
async function moreRows(doc: Document, fetch: Fetch) {
  const rc = scriptIdWith(doc, "subTableRun"); // script は取り込み時に控えへ移してある(widgets.ts)
  const sub = doc.getElementById("subTbody")?.parentElement?.closest("[id]")?.id; // すぐ上の table と div には id が無い(実機で確認)
  const table = doc.getElementById("funcForm:yoyakuArea")?.querySelector("table");
  const layout = table && tableLayout(table);
  if (!rc || !sub || !layout) throw new ParseError("教室の続きを取る部品がありません");
  // 「次へ」も描き直してもらう(ページの最後まで取ると押せる状態で返る。roomNext はそれを見て次のページへ進む)
  const xml = await send(doc, fetch, rc, { "primefaces.resetvalues": "true" }, `${sub} ${FORWARD}`, rc);
  applyPartialResponse(doc, xml, [sub]); // 行の update は適用しない(適用すると本表の入れ物が替わる)。ViewState だけ入れ替える
  const part = updateOf(xml, sub);
  if (!part) throw new ParseError("教室の続きが応答にありません");
  const rows = [...part.querySelectorAll("#subTbody > tr")];
  const page = pages.get(doc);
  if (page) {
    remember(page, rows);
    if (!rows.some(isRoomRow)) page.drained = true;
  }
  return { rows, layout };
}

/**
 * 行の ⓘ と予約の帯の指し方を覚える。先頭 40 行はボタン・帯の id、続きの行は id が無く「このページの何日目(keyIndex)の何番目(valIndex)」
 * (予約はさらに行の何番目か yykIndex)で指す(元の画面の kstOverlayShowPreProc / yoyakOverlayShowPreProc。実機で確認)。同じものは先に出た方
 */
function remember(page: Page, rows: Element[]): void {
  const args = (el: Element | null | undefined, fn: string): Addr | undefined =>
    el?.id || new RegExp(`${fn}\\(([\\d\\s,]+)\\)`).exec(el?.getAttribute("onclick") ?? "")?.[1]!.split(",").map((s) => s.trim()) || undefined;
  for (const tr of rows.filter(isRoomRow)) {
    const name = roomNameOf(tr);
    const info = args(tr.querySelector(".roomInfoBtn"), "kstOverlayShowPreProc");
    if (info && !page.rooms.has(name)) page.rooms.set(name, info);
    // 帯は説明文(予約番号・授業コードを含む)で見分ける
    for (const a of tr.querySelectorAll("a.timezone")) {
      const key = squash(a.getAttribute("title"));
      const at = args(a, "yoyakOverlayShowPreProc");
      if (key && at && !page.bookings.has(key)) page.bookings.set(key, at);
    }
  }
}

/** 続きの教室(1 回 40 行)を取る。空なら終わり */
export async function roomMore(doc: Document, fetch: Fetch): Promise<RoomRow[]> {
  const { rows, layout } = await moreRows(doc, fetch);
  return parseRoomRows(rows, layout, () => "");
}

/** 小窓(overlay)を頼む。id ならそのボタン・帯と同じ通信、番号なら元の画面の remoteCommand(onco で proc を呼ぶもの)に番号を付けて送る */
async function overlay(doc: Document, fetch: Fetch, at: Addr, render: string, proc: string, names: string[]): Promise<string> {
  let xml: string;
  if (typeof at === "string") xml = await send(doc, fetch, at, {}, render, at);
  else {
    const cmd = scriptIdWith(doc, proc);
    if (!cmd) throw new ParseError("小窓を開く部品がありません");
    xml = await send(doc, fetch, cmd, { "primefaces.resetvalues": "true", ...Object.fromEntries(names.map((n, i) => [n, at[i]!])) }, render, cmd);
  }
  applyPartialResponse(doc, xml);
  return xml;
}

/** ⓘ の中身(教室ごとに決まっている)。place は「武蔵野６号館5F」、fields は [教室グループ] などの見出しと中身 */
async function infoOf(doc: Document, fetch: Fetch, at: Addr, name: string): Promise<RoomInfo> {
  const xml = await overlay(doc, fetch, at, INFO, "kstOverlayShowProc", ["keyIndex", "valIndex"]);
  const text = squash(updateOf(xml, INFO)?.body.textContent).normalize("NFKC");
  const [head = "", ...rest] = text.split(/\[([^\]]+)\]/);
  const fields = rest.flatMap((x, i) => (i % 2 ? [] : [{ label: x, value: (rest[i + 1] ?? "").trim().replace(/\s*\/$/, "") }])); // 収容人数は「…40名 /」と区切りで終わる
  if (!fields.length) throw new ParseError("教室の情報が応答にありません");
  return { place: head.replace(name, "").trim(), fields }; // 先頭は教室名 + 建物と階がつながって来る
}

/** 指し方。先頭 40 行はボタン・帯の id、続きの行は番号の並び */
type Addr = string | string[];
type Page = { drained: boolean; rooms: Map<string, Addr>; bookings: Map<string, Addr> };
// サーバーが受け付けるのは、いま出しているページのものだけ(前のページの指し方は別の教室になる。実機で確認)。ページごとに覚え直す
const pages = new WeakMap<Document, Page>();

/**
 * 読み切ったページで覚えた指し方を探す。ページの続きを読み切る前に頼むと中身が空で返る(実機で確認)ので、読み切っていなければ使わない。
 * 検索のあとは最後のページにいるので、ふつうはそのまま見つかる。無ければ同じ条件で検索し直し、ページを読み切るたびに探して、無ければ次のページへ進む
 */
async function locate(doc: Document, fetch: Fetch, pick: (p: Page) => Addr | undefined): Promise<Addr | undefined> {
  const found = () => {
    const p = pages.get(doc);
    return p?.drained ? pick(p) : undefined;
  };
  let at = found();
  if (!at) {
    await roomSubmit(doc, fetch, "funcForm:search", "funcForm:search funcForm:conditionArea");
    // 999 件の上限までで 30 回(1,200 行)あれば足りる
    for (let i = 0; !at && i < 30; i++) {
      const { rows } = await moreRows(doc, fetch);
      if (rows.some(isRoomRow)) continue;
      at = found();
      const next = doc.getElementById(FORWARD) as HTMLButtonElement | null;
      if (at || !next || next.disabled) break;
      await roomSubmit(doc, fetch, FORWARD, FORWARD);
    }
  }
  return at;
}

/** 教室の ⓘ を取る */
export async function roomInfo(doc: Document, fetch: Fetch, name: string): Promise<RoomInfo> {
  const at = await locate(doc, fetch, (p) => p.rooms.get(name));
  if (!at) throw new NoticeError("この教室の情報は見つかりませんでした");
  return infoOf(doc, fetch, at, name);
}

/**
 * 予約の詳細(元の画面の「教室予約登録」: 承認状況・一次責任者・予約番号・教室名・日時・予約者・利用目的など)を取る。
 * 帯の小窓を頼み、その中の「詳細」と同じ通信を送ると、応答に画面の中身(ksa00804:dialogPanel)が入る(実機で確認)。title は帯の説明文
 */
export async function roomBooking(doc: Document, fetch: Fetch, title: string, lesson = false): Promise<{ label: string; value: string }[]> {
  const at = await locate(doc, fetch, (p) => p.bookings.get(squash(title)));
  if (!at) throw new NoticeError("この予約の詳細は見つかりませんでした");
  const xml = await overlay(doc, fetch, at, BOOKING, "yoyakOverlayShowProc", ["keyIndex", "valIndex", "yykIndex"]);
  if (lesson) return lessonFields(updateOf(xml, BOOKING));
  const detail = [...(updateOf(xml, BOOKING)?.querySelectorAll("button, a") ?? [])].find((b) => squash(b.textContent) === "詳細")?.id;
  if (!detail) throw new ParseError("予約の詳細を開く部品がありません");
  // 元の画面のこの通信は描き直す先を指定しない(サーバーが画面の中身を返す)
  const res = await send(doc, fetch, detail, { "jakarta.faces.partial.render": null }, "", detail);
  applyPartialResponse(doc, res);
  const panel = updateOf(res, "ksa00804:dialogPanel");
  panel?.querySelectorAll("script").forEach((s) => s.remove()); // ボタンの作成スクリプトが文として混ざった(実機で確認)
  const rows = [...(panel?.querySelectorAll("tr") ?? [])].filter((tr) => tr.children.length === 2);
  const fields = rows.map((tr) => ({ label: squash(tr.children[0]!.textContent), value: squash(tr.children[1]!.textContent).normalize("NFKC") })).filter((f) => f.label && f.value);
  if (!fields.length) throw new ParseError("予約の詳細が応答にありません");
  // 一次責任者は「承認済 musashino2026/08/21(金) 15:31:28 学務課」と 1 つの欄に入っている(実機で確認)ので分ける
  return fields.flatMap((f) => {
    const m = /^(\S+)\s*(.*?)\s*(\d{4}\/\d{1,2}\/\d{1,2}\(.\)\s*\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)$/.exec(f.value);
    if (f.label !== "一次責任者" || !m) return [f];
    return [{ label: f.label, value: m[1]! }, { label: "承認者", value: m[2]! }, { label: "承認日時", value: m[3]! }, { label: "所属", value: m[4]! }].filter((x) => x.value);
  });
}

/**
 * 授業の帯の小窓。「16:50 ～18:30 / 日5 / 5400100641 プロジェクト基礎B / 佐藤　大吾／津吹　達也」と行が分かれて来る(実機で確認)。
 * 説明文は 1 行につながっていて、英語の授業名や教員名だと区切れなかった
 */
function lessonFields(part: Document | null): { label: string; value: string }[] {
  const walk = part ? part.createTreeWalker(part.body, NodeFilter.SHOW_TEXT) : null;
  const texts: string[] = [];
  for (let n = walk?.nextNode(); n; n = walk!.nextNode()) {
    const t = squash(n.textContent);
    if (t && t !== "詳細") texts.push(t);
  }
  const code = texts.findIndex((t) => /^\d{6,}/.test(t));
  if (code < 0) throw new ParseError("授業の小窓が読めません");
  const [, num, rest] = /^(\d{6,})\s*(.*)$/.exec(texts[code]!)!;
  const courseAt = rest ? code : code + 1;
  return [
    { label: "時限", value: texts.find((t) => /^[月火水木金土日]\d/.test(t)) ?? "" },
    { label: "授業コード", value: num! },
    { label: "授業", value: rest || (texts[code + 1] ?? "") },
    { label: "教員", value: texts.slice(courseAt + 1).join(" ") },
  ].filter((f) => f.value);
}

/**
 * 次のページ(サーバーは約 340 件ずつ返し、残りは元の画面の「次へ」で出す。実機で確認)へ進み、その最初の教室を読む。
 * 「次へ」が押せない(最後のページ)なら null。新しいページの続きは、また roomMore で取る
 */
export async function roomNext(doc: Document, fetch: Fetch): Promise<RoomRow[] | null> {
  const b = doc.getElementById(FORWARD) as HTMLButtonElement | null;
  if (!b || b.disabled) return null;
  await roomSubmit(doc, fetch, FORWARD, FORWARD);
  return parseRoomResult(doc)?.rooms ?? [];
}
