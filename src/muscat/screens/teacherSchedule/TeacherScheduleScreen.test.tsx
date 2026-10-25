import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { ListPager, TeacherSchedulePage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import type { LiveState } from "../useLiveScreen";
import { TeacherScheduleScreen } from "./TeacherScheduleScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState<TeacherSchedulePage>) => renderToString(<TeacherScheduleScreen client={client} doc={doc} initial={initial} />);

const search = {
  name: { ref: "n", value: "麻田" },
  sort: { ref: "s", value: "kana", options: [{ value: "kana", label: "カナ氏名" }, { value: "en", label: "英語氏名" }] },
  ascending: true, toggleRef: "t", clearRef: "c", searchRef: "q",
};
const pager = (o: Partial<ListPager> = {}): ListPager => ({ total: 1, page: 1, pages: 1, pageLinks: [], firstRef: "", prevRef: "", nextRef: "", lastRef: "", size: null, ...o });
const row = { name: "山田 太郎", kana: "ヤマダ タロウ", english: "Yamada Taro", dept: "データサイエンス学部", openRef: "o1" };
const base: TeacherSchedulePage = { teacher: "", search, list: null, scheduleId: "", backRef: "" };
const ready = (p: Partial<TeacherSchedulePage> = {}, busy = false): LiveState<TeacherSchedulePage> => ({ status: "ready", page: { ...base, ...p }, busy });

test("検索欄: 氏名・並び順(昇順の切替)・クリア・検索", () => {
  const html = render(ready());
  for (const s of ["氏名(姓か名の一部、カナでも)", "並び順", "カナ氏名", "昇順 ↑", "クリア", "検索"]) expect(html).toContain(s);
  expect(html).toMatch(/<button[^>]*bg-secondary[^>]*aria-label="昇順\(押すと降順\)"/); // 文字だけだとボタンに見えない
  expect(html).not.toContain("該当する教職員はいません");
});

test("一覧: 件数・氏名(読み)・英語名・所属", () => {
  const html = render(ready({ list: { pager: pager(), rows: [row], empty: false } }));
  for (const s of ["1 件", "山田 太郎", "(ヤマダ タロウ)", "Yamada Taro", "データサイエンス学部", "mu-row"]) expect(html).toContain(s);
});

test("0 件", () => {
  expect(render(ready({ list: { pager: pager({ total: 0 }), rows: [], empty: true } }))).toContain("該当する教職員はいません");
});

test("カレンダー: 教員名・月・移動・戻る・凡例・今日・斜めに出るマス", () => {
  const html = render(ready({ teacher: "山田 太郎", search: null, backRef: "b", scheduleId: "funcForm:j_id_3x" }));
  const now = new Date();
  for (const s of ["山田 太郎 の予定", "見るだけ。変更はできません", `${now.getFullYear()}年${now.getMonth() + 1}月`, 'aria-label="前の月"', 'aria-label="次の月"', "‹ 検索に戻る", "授業", "そのほかの予定", "mu-cell", "bg-primary", "text-error"]) expect(html).toContain(s);
  expect(html.match(/mu-cell/g)).toHaveLength(42);
  expect(html).not.toContain("昇順 ↑");
  expect(html).toMatch(/disabled=""[^>]*>今月</);
});

test("カレンダー: 予定の入れ物が無ければ出さない", () => {
  expect(render(ready({ teacher: "山田 太郎", search: null }))).not.toContain("の予定");
});

test("通信中: 結果は薄く、検索は押せない", () => {
  const html = render(ready({ list: { pager: pager(), rows: [row], empty: false } }, true));
  expect(html).toContain("opacity-45");
  expect(html).toMatch(/disabled=""[^>]*>検索</);
});

test("初回の読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
