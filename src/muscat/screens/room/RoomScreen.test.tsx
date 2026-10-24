import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { CheckOption, RoomPage, RoomResult, SelectField } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import type { LiveState } from "../useLiveScreen";
import { RoomScreen } from "./RoomScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState<RoomPage>) => renderToString(<RoomScreen client={client} doc={doc} initial={initial} />);

let n = 0;
const sel = (opts: string[], value = ""): SelectField => ({ ref: `s${n++}`, value, options: opts.map((o, i) => ({ value: i ? o : "", label: o })) });
const text = (value = "") => ({ ref: `t${n++}`, value });
const checks = (labels: string[], on: number[] = []): CheckOption[] => labels.map((label, i) => ({ label, ref: `k${n++}`, checked: on.includes(i) }));
const range = () => ({ from: text(), to: text() });
const base = (): RoomPage => ({
  period: { from: text("2026/10/24"), to: text("2026/10/25") },
  targets: checks(["本人の予約", "職員の予約", "教員の予約", "学生の予約"]),
  free: { boxRef: "fb", on: false, time: range(), hour: text(), minute: text() },
  days: checks(["月", "火"]),
  campus: sel(["すべて対象", "有明キャンパス"]), building: sel(["すべて対象"]), floor: sel(["すべて対象", "1階"]),
  capacity: { regular: range(), exam: range(), entrance: range() },
  showCapacity: checks(["一覧に列を表示しない", "一覧に列を表示する"], [0]),
  capacityKind: sel(["平常時", "試験時"]),
  searchRef: "go", clearRef: "clr", result: null,
});
const result = (rooms: RoomResult["rooms"]): RoomResult => ({
  date: "2026/10/24(土)", dates: { ref: "d", value: "index_1", options: [{ value: "index_1", label: "2026/10/24" }] },
  moveRef: "mv", prevRef: "pv", nextRef: "nx", from: 480, to: 1440,
  legend: [{ kind: "jugyo", label: "授業" }, { kind: "resOther", label: "他ユーザ予約" }], rooms,
});
const bar = (o = {}) => ({ kind: "jugyo", text: "情報リテラシー", title: "13:10～14:50 情報リテラシー", start: 790, end: 890, lane: 0, openRef: "b1", ...o });
const ready = (p: Partial<RoomPage> = {}, busy = false): LiveState<RoomPage> => ({ status: "ready", page: { ...base(), ...p }, busy });

test("初期: 見出し・期間・表示のチップ・絞り込み・クリア・検索、結果なし、出力とダウンロードは無い", () => {
  const html = render(ready());
  for (const s of ["教室予約", "参照のみ", "期間", "本人の予約", "学生の予約", "絞り込み", "クリア", "検索"]) expect(html).toContain(s);
  expect(html).not.toContain("教室利用状況表を出力");
  expect(html).not.toContain("ダウンロード");
  expect(html).not.toContain("教室 · ");
});

test("絞り込み: 選んだ条件の数がバッジに出る(無いときは幅だけ残して隠す)", () => {
  expect(render(ready())).toMatch(/invisible[^>]*>0</);
  const p = base();
  const html = render(ready({ days: checks(["月"], [0]), free: { ...p.free!, on: true }, floor: sel(["すべて対象", "1階"], "1階") }));
  expect(html).toMatch(/bg-primary[^>]*>3</);
  expect(html).not.toMatch(/invisible[^>]*>3</);
});

test("結果あり: 凡例・日付移動・教室名・予約・下の件数", () => {
  const html = render(ready({ result: result([{ name: "有明１－１１Ａ", capacity: "", infoRef: "i1", bars: [bar(), bar({ kind: "resOther", text: "TOEIC", start: 480, end: 1440, openRef: "b2" })] }, { name: "有明１－１２Ｂ", capacity: "", infoRef: "i2", bars: [] }]) }));
  for (const s of ["授業", "他ユーザ予約", "この日へ移動", "‹ 前へ", "次へ ›", "2026/10/24(土)", "有明１－１１Ａ", "情報リテラシー", "TOEIC", "mu-row", "#fbd6ee", "#cfd0f7", "2 教室 · 8:00 から 23:00", "有明１－１１Ａの情報"]) expect(html).toContain(s);
  // 1 時間 96px: 13:10 は (790-480)/60*96 = 496px
  expect(html).toContain("left:496px");
});

test("0 教室", () => {
  const html = render(ready({ result: result([]) }));
  expect(html).toContain("該当する教室はありません");
});

test("通信中: 結果は薄く(inert)、検索は押せない", () => {
  const html = render(ready({ result: result([{ name: "R", capacity: "", infoRef: "", bars: [bar()] }]) }, true));
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("opacity-45");
  expect(html).toMatch(/disabled=""[^>]*>検索</);
});

test("初回の読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "失敗しました" })).toContain("失敗しました");
});
