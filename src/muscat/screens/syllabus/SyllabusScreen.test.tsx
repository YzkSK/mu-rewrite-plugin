import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { ListPager, SelectField, SyllabusDetail, SyllabusPage, SyllabusRow } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import type { LiveState } from "../useLiveScreen";
import { SyllabusScreen } from "./SyllabusScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState<SyllabusPage>) => renderToString(<SyllabusScreen client={client} doc={doc} initial={initial} />);

const sel = (opts: string[]): SelectField => ({ ref: "s", value: "", options: opts.map((o) => ({ value: o, label: o })) });
const text = (value = "") => ({ ref: "t", value });
const checks = (labels: string[], on: string[] = []) => labels.map((label, i) => ({ label, ref: `k${i}`, checked: on.includes(label) }));
const row = (o: Partial<SyllabusRow> = {}): SyllabusRow => ({ time: "月4", code: "0010", title: "情報リテラシー", teachers: "教員 A／教員 B", kind: "週間授業", terms: ["2026年度 3学期", "2026年度 4学期"], credit: "2.0単位", openRef: "o1", ...o });
const pager = (o: Partial<ListPager> = {}): ListPager => ({
  total: 93, page: 1, pages: 10, pageLinks: [1, 2].map((n) => ({ n, ref: `p${n}`, current: n === 1 })),
  firstRef: "", prevRef: "", nextRef: "n", lastRef: "l", size: sel(["10", "25"]), ...o,
});
const base: SyllabusPage = {
  mode: "search", backRef: "",
  year: text("2026"), term: { ...sel(["すべて対象", "1学期", "3学期"]), value: "3学期" }, subject: text(), teacher: text(), keyword: text(),
  dept: sel(["すべて対象"]), category: sel(["すべて対象"]), campus: sel(["すべて対象"]),
  days: checks(["月", "火", "水", "木", "金", "土", "日"], ["月"]), grades: checks(["1年"]), kinds: checks(["週間授業"]), periods: checks(["1限", "2限"]),
  searchRef: "s1", clearRef: "c1", noteRef: "n1", result: null, detail: null,
};
const ready = (p: Partial<SyllabusPage> = {}, busy = false): LiveState<SyllabusPage> => ({ status: "ready", page: { ...base, ...p }, busy });
const withResult = (o: Partial<SyllabusPage> = {}) => ready({ result: { pager: pager(), rows: [row(), row({ title: "統計学入門", code: "0011" })], empty: false }, ...o });

const detail: SyllabusDetail = {
  title: "情報リテラシー", code: "0010010101", noteOn: false, noteRef: "d1", printRef: "d2", closeRef: "d3",
  rows: [
    { kind: "field", label: "年度", values: ["2026"] },
    { kind: "field", label: "開講期・曜日時限・教室", values: ["3学期 月4"] },
    { kind: "field", label: "単位数", values: ["2.0"] },
    { kind: "field", label: "授業概要", values: ["情報の基礎を学ぶ\n演習あり"] },
    { kind: "section", title: "授業計画" },
    { kind: "head", cells: ["授業回", "内容"] },
    { kind: "field", label: "第1回", values: ["第１回： イントロダクション"] },
  ],
};

test("検索欄: 4 つの欄・placeholder・曜日と時限のボタン・詳細条件・クリアと検索", () => {
  const html = render(ready());
  for (const s of ["開講年度学期", "授業科目", "担当教員", "キーワード", "名称かコード", "氏名の一部", "シラバスの本文から", "曜日", "時限", "水", "2限", "詳細条件(学科・科目分類・学年・キャンパス・開講区分 など)▾", "条件をクリア", "検索", "ふせんを貼った授業一覧"]) expect(html).toContain(s);
  expect(html).toContain('aria-pressed="true"'); // 選択中の月
  expect(html).not.toContain("該当する授業はありません");
  expect(html).not.toContain("1 ページ");
});

test("結果: 件数・条件の要約・表の列・コード・ふせん一覧のボタン", () => {
  const html = render(withResult({ periods: checks(["1限", "2限"], ["2限"]) }));
  for (const s of ["93 件", "2026年度 3学期、月曜、2限", "曜日時限", "担当教員", "開講区分", "単位", "情報リテラシー", "統計学入門", "0011", "教員 A／教員 B", "週間授業", "2.0単位", "mu-row", "ふせんを貼った授業の一覧", "1 / 10 ページ", "次 ›"]) expect(html).toContain(s);
  expect(html).not.toContain("開講年度学期</th>");
  expect(html).not.toContain("ふせんを貼った授業一覧"); // 結果があるときは帯の方だけ
});

test("0 件", () => {
  const html = render(ready({ result: { pager: pager({ total: 0, pages: 1, pageLinks: [] }), rows: [], empty: true } }));
  expect(html).toContain("0 件");
  expect(html).toContain("該当する授業はありません");
});

test("詳細: 題名・コード・ふせん/印刷/閉じる・目次 7 節・基本情報・授業計画", () => {
  const html = render(withResult({ detail }));
  for (const s of ["0010010101　3学期 月4　2.0", "ふせんを貼る", "印刷", 'aria-label="閉じる"', "目次", "基本情報", "授業概要と到達目標", "授業の進め方", "成績評価", "授業計画", "教科書・参考", "実務経験", "年度", "2026", "whitespace-pre-line", "授業回", "第１回： イントロダクション"]) expect(html).toContain(s);
  expect(html).not.toContain("ふせんを外す");
});

test("詳細: ふせんを貼ってあれば「ふせんを外す」", () => {
  expect(render(withResult({ detail: { ...detail, noteOn: true } }))).toContain("ふせんを外す");
});

test("詳細が無ければ引き出しは出ない", () => {
  expect(render(withResult())).not.toContain('role="dialog"');
});

test("通信中: 結果は薄く(inert)・丸いアイコン、条件は押せない", () => {
  const html = render(ready({ result: { pager: pager(), rows: [row()], empty: false } }, true));
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("opacity-45");
  expect(html).toMatch(/disabled=""[^>]*>検索</);
});

// 検索欄も詳細も無い画面: 空の検索フォームを出さず、汎用画面に任せる
test("検索欄も詳細も無いときは汎用画面", () => {
  const html = render(ready({ searchRef: "" }));
  expect(html).not.toContain("詳細条件");
  expect(html).toContain("読み込んでいます");
});

test("初回の読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
