import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { ListPager, SelectField, SyllabusPage, SyllabusRow } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import type { LiveState } from "../useLiveScreen";
import { SyllabusScreen } from "./SyllabusScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState<SyllabusPage>) => renderToString(<SyllabusScreen client={client} doc={doc} initial={initial} />);

const sel = (opts: string[]): SelectField => ({ ref: "s", value: "", options: opts.map((o) => ({ value: o, label: o })) });
const text = (value = "") => ({ ref: "t", value });
const checks = (labels: string[]) => labels.map((label, i) => ({ label, ref: `k${i}`, checked: false }));
const row = (o: Partial<SyllabusRow> = {}): SyllabusRow => ({ time: "月4", code: "0010", title: "情報リテラシー", teachers: "教員 A／教員 B", kind: "週間授業", terms: ["2026年度 3学期", "2026年度 4学期"], credit: "2.0単位", openRef: "o1", ...o });
const pager = (o: Partial<ListPager> = {}): ListPager => ({
  total: 406, page: 1, pages: 41, pageLinks: [1, 2].map((n) => ({ n, ref: `p${n}`, current: n === 1 })),
  firstRef: "", prevRef: "", nextRef: "n", lastRef: "l", size: sel(["10", "25"]), ...o,
});
const base: SyllabusPage = {
  year: text("2026"), term: { ...sel(["すべて対象", "1学期", "3学期"]), value: "3学期" }, subject: text(), teacher: text(), keyword: text(),
  dept: sel(["すべて対象"]), category: sel(["すべて対象"]), campus: sel(["すべて対象"]),
  days: checks(["月", "火"]), grades: checks(["1年"]), kinds: checks(["週間授業"]), periods: checks(["1限"]),
  searchRef: "s1", clearRef: "c1", noteRef: "n1", result: null,
};
const ready = (p: Partial<SyllabusPage> = {}, busy = false): LiveState<SyllabusPage> => ({ status: "ready", page: { ...base, ...p }, busy });

test("初期: 主な条件と詳細条件、検索前は一覧なし", () => {
  const html = render(ready());
  for (const s of ["シラバス検索", "開講年度学期", "授業科目", "担当教員", "キーワード", "曜日", "詳細条件", "ふせんを貼った授業一覧", "クリア", "検索"]) expect(html).toContain(s);
  expect(html).not.toContain("該当する授業はありません");
  expect(html).not.toContain("1 ページ");
});

test("結果あり: 件数・開講年度学期・行・ページ送り", () => {
  const html = render(ready({ result: { pager: pager(), rows: [row(), row({ title: "統計学入門", code: "0011" })], empty: false } }));
  for (const s of ["406 件", "開講 2026年度 3学期", "情報リテラシー", "統計学入門", "教員 A／教員 B", "週間授業", "2026年度 4学期", "2.0単位", "mu-row", "1 / 41 ページ", "次 ›"]) expect(html).toContain(s);
});

test("0 件", () => {
  const html = render(ready({ result: { pager: pager({ total: 0, pages: 1, pageLinks: [] }), rows: [], empty: true } }));
  expect(html).toContain("0 件");
  expect(html).toContain("該当する授業はありません");
});

test("通信中: 結果は薄く(inert)・丸いアイコン、条件は押せない", () => {
  const html = render(ready({ result: { pager: pager(), rows: [row()], empty: false } }, true));
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("opacity-45");
  expect(html).toMatch(/disabled=""[^>]*>検索</);
});

// 授業を開くと Kmh006 のまま詳細に変わる: 空の検索フォームを出さず、汎用画面に任せる
test("検索欄が無い(詳細)ときは汎用画面", () => {
  const html = render(ready({ searchRef: "" }));
  expect(html).not.toContain("詳細条件");
  expect(html).toContain("読み込んでいます");
});

test("初回の読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
