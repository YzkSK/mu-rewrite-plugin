import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { NewsDetail, NewsGroup, NewsItem, NewsPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { NewsScreen } from "./NewsScreen";
import { canSave, markAllReadSteps, toggleSteps } from "./newsSteps";
import type { NewsState } from "./useNews";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: NewsState, opened = "c1") => renderToString(<NewsScreen client={client} doc={doc} initial={initial} initialOpened={opened} />);

const item = (o: Partial<NewsItem> = {}): NewsItem => ({
  title: "件名A", category: "授業", source: "テスト部署", date: "2026/10/12", important: false, isNew: false, unread: false, flagged: false, openRef: "c1", flagRef: "c2", readRef: "c3", updateRef: "u1", ...o,
});
const group = (o: Partial<NewsGroup> = {}): NewsGroup => ({ title: "授業関連", description: "授業のお知らせ", moreRef: "", updateRef: "gu", items: [item()], ...o });
const tabs = ["グループ", "全表示", "未読", "授業"].map((name, i) => ({ name, ref: `t${i}`, selected: name === "全表示" }));
const base: NewsPage = { tabs, keyword: "", course: "", keywordRef: "k", courseRef: "j", searchRef: "s", confirmYesRef: "y", groups: null, items: [item()], empty: false, detail: null };
const ready = (p: Partial<NewsPage> = {}, busy = false): NewsState => ({ status: "ready", page: { ...base, ...p }, busy });
const disabledBtn = (label: string) => new RegExp(`aria-label="${label}"[^>]*disabled=""|disabled=""[^>]*aria-label="${label}"`);

test("平らな一覧: 件名・差出人・MM/DD、未読は太字と点、重要の札、並び替えは無い", () => {
  const html = render(ready({ items: [item({ unread: true, important: true })] }));
  for (const s of ["件名A", "テスト部署", "10/12", "重要", "font-bold", "bg-primary", "未読 1", "検索", "分類ごとにまとめる", "未読を新しい順に読む"]) expect(html).toContain(s);
  expect(html).not.toContain("2026/10/12");
  expect(html).not.toContain("並び");
  const read = render(ready());
  expect(read).not.toContain("font-bold");
  expect(read).not.toContain("bg-primary\"");
});

test("フラグ付きは「フラグを外す」で紫", () => {
  const html = render(ready({ items: [item({ flagged: true })] }));
  expect(html).toContain("フラグを外す");
  expect(html).toContain("text-primary");
  expect(render(ready())).toContain("フラグをつける");
});

test("グループ: 帯に分類名・説明・件数・すべて既読にする、moreRef があれば「すべて表示する」", () => {
  const html = render(ready({ groups: [group({ items: [item({ unread: true }), item({ title: "B" })], moreRef: "m" }), group({ title: "その他", items: [] })] }));
  for (const s of ["授業関連", "授業のお知らせ", "2件", "その他", "0件", "すべて既読にする", "すべて表示する"]) expect(html).toContain(s);
  expect(html.match(/すべて表示する/g)).toHaveLength(1);
});

test("操作中・更新や確認の OK が無いときは、フラグとすべて既読にするが無効", () => {
  const unread = [item({ unread: true })];
  expect(render(ready({ items: unread }, true))).toMatch(disabledBtn("フラグをつける"));
  expect(render(ready({ items: unread }))).not.toMatch(disabledBtn("フラグをつける"));
  expect(render(ready({ items: [item({ updateRef: "" })] }))).toMatch(disabledBtn("フラグをつける"));
  expect(render(ready({ items: unread, confirmYesRef: "" }))).toMatch(disabledBtn("フラグをつける"));
  const dis = /disabled=""[^>]*>すべて既読にする/;
  expect(render(ready({ groups: [group({ items: unread })] }))).not.toMatch(dis);
  expect(render(ready({ groups: [group({ items: unread })] }, true))).toMatch(dis);
  expect(render(ready({ groups: [group({ items: unread, updateRef: "" })] }))).toMatch(dis);
  expect(render(ready({ groups: [group({ items: unread })], confirmYesRef: "" }))).toMatch(dis);
  expect(render(ready({ groups: [group({ items: [item()] })] }))).toMatch(dis);
});

test("操作の steps: 行の切り替えは 切り替え → 更新 → OK(最後だけ ajax)", () => {
  const p = { ...base };
  expect(toggleSteps(p, "c2", "u1")).toEqual([
    { kind: "click", ref: "c2", ajax: false },
    { kind: "click", ref: "u1", ajax: false },
    { kind: "click", ref: "y", ajax: true },
  ]);
  expect(canSave(p, "u1")).toBe(true);
  expect(canSave(p, "")).toBe(false);
  expect(canSave({ ...p, confirmYesRef: "" }, "u1")).toBe(false);
});

test("操作の steps: すべて既読にするは未読の行の既読ボタンだけ → グループの更新 → OK", () => {
  const g = group({ items: [item({ unread: true, readRef: "r1" }), item({ unread: false, readRef: "r2" }), item({ unread: true, readRef: "r3" })] });
  expect(markAllReadSteps(base, g)).toEqual([
    { kind: "click", ref: "r1", ajax: false },
    { kind: "click", ref: "r3", ajax: false },
    { kind: "click", ref: "gu", ajax: false },
    { kind: "click", ref: "y", ajax: true },
  ]);
  expect(markAllReadSteps(base, group({ items: [item()] }))).toBeNull();
  expect(markAllReadSteps({ ...base, confirmYesRef: "" }, g)).toBeNull();
  expect(markAllReadSteps(base, { ...g, updateRef: "" })).toBeNull();
});

test("未読を新しい順に読む: 未読が無ければ無効", () => {
  const dis = /disabled=""[^>]*>未読を新しい順に読む/;
  expect(render(ready())).toMatch(dis);
  expect(render(ready({ items: [item({ unread: true })] }))).not.toMatch(dis);
});

const detail: NewsDetail = {
  title: "詳細の件名",
  fields: [{ label: "件名", text: "詳細の件名", html: "" }, { label: "本文", text: "", html: `<p onclick="x()">本文<script>alert(1)</script></p>` }],
  flagged: false, flagRef: "d1", prevRef: "d2", nextRef: "d3", closeRef: "d4",
};

test("詳細: 項目名と値、本文はサニタイズ、前の掲示・次の掲示・未読に戻す・閉じる。無ければ出ない", () => {
  const html = render(ready({ detail, items: [item({ title: "詳細の件名" })] }));
  for (const s of ["詳細の件名", "本文", "前の掲示", "次の掲示", "未読に戻す", "閉じる", "‹ 掲示板", "min-[768px]:grid-cols-2"]) expect(html).toContain(s);
  expect(html).toContain("<p>本文</p>");
  expect(html).not.toContain("onclick");
  const none = render(ready());
  expect(none).not.toContain("前の掲示");
  expect(none).not.toContain("grid-cols-2");
});

test("詳細の「未読に戻す」は、一覧から開いた行が保存できる既読の行のときだけ(同じ件名の別の行では出さない)", () => {
  expect(render(ready({ detail, items: [item({ title: "詳細の件名" })] }))).toContain("未読に戻す");
  expect(render(ready({ detail, items: [item({ title: "詳細の件名" })] }), "")).not.toContain("未読に戻す");
  expect(render(ready({ detail, items: [item({ title: "詳細の件名", openRef: "other" })] }))).not.toContain("未読に戻す");
  expect(render(ready({ detail, items: [item({ title: "詳細の件名", unread: true })] }))).not.toContain("未読に戻す");
  expect(render(ready({ detail, items: [item({ title: "詳細の件名", updateRef: "" })] }))).not.toContain("未読に戻す");
});

test("データなし・読み込み中・エラー", () => {
  expect(render(ready({ items: [], empty: true }))).toContain("該当する掲示はありません");
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
