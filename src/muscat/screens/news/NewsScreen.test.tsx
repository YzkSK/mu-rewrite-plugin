import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { NewsDetail, NewsGroup, NewsItem, NewsPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { NewsScreen } from "./NewsScreen";
import { markAllReadSteps, toggleSteps } from "./newsSteps";
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
  for (const s of ["件名A", "テスト部署", "10/12", "重要", "font-bold", "bg-primary", "検索", "分類ごとにまとめる", "未読を新しい順に読む"]) expect(html).toContain(s);
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

test("グループ: 帯に分類名・説明・未読の数(無ければ出さない)・すべて既読にする、moreRef があれば「すべて表示する」", () => {
  const html = render(ready({ groups: [group({ items: [item({ unread: true }), item({ title: "B" })], moreRef: "m" }), group({ title: "その他", items: [] })] }));
  for (const s of ["授業関連", "授業のお知らせ", "未読 1", "その他", "すべて既読にする", "すべて表示する"]) expect(html).toContain(s);
  expect(html).not.toContain("件<");
  expect(html.match(/すべて表示する/g)).toHaveLength(1);
});

test("操作中・元のボタンが無いときは、フラグが無効。すべて既読にするは更新か確認の OK が無いと無効", () => {
  const unread = [item({ unread: true })];
  expect(render(ready({ items: unread }, true))).toMatch(disabledBtn("フラグをつける"));
  expect(render(ready({ items: unread }))).not.toMatch(disabledBtn("フラグをつける"));
  expect(render(ready({ items: [item({ flagRef: "" })] }))).toMatch(disabledBtn("フラグをつける"));
  expect(render(ready({ items: unread, confirmYesRef: "" }))).not.toMatch(disabledBtn("フラグをつける"));
  const dis = /disabled=""[^>]*>すべて既読にする/;
  expect(render(ready({ groups: [group({ items: unread })] }))).not.toMatch(dis);
  expect(render(ready({ groups: [group({ items: unread })] }, true))).toMatch(dis);
  expect(render(ready({ groups: [group({ items: unread, updateRef: "" })] }))).toMatch(dis);
  expect(render(ready({ groups: [group({ items: unread })], confirmYesRef: "" }))).toMatch(dis);
  expect(render(ready({ groups: [group({ items: [item()] })] }))).toMatch(dis);
});

// 「更新」はグループ全部を既読にする(利用者が実ページで確認)。行の切り替えでは押さない
test("操作の steps: 行の切り替えはその行のボタンだけで、更新は押さない", () => {
  expect(toggleSteps("c2")).toEqual([{ kind: "click", ref: "c2", ajax: true }]);
});

test("操作の steps: すべて既読にするは グループの更新 → OK。未読が無い・押せないときは null", () => {
  const g = group({ items: [item({ unread: true, readRef: "r1" }), item({ unread: false, readRef: "r2" })] });
  expect(markAllReadSteps(base, g)).toEqual([
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
  expect(render(ready({ items: [item({ unread: true })] }), "")).not.toMatch(dis);
});

const detail: NewsDetail = {
  title: "詳細の件名",
  fields: [{ label: "件名", text: "詳細の件名", html: "" }, { label: "本文", text: "", html: `<p onclick="x()">本文<script>alert(1)</script></p>` }],
  flagged: false, flagRef: "d1", prevRef: "d2", nextRef: "d3", closeRef: "d4",
};

test("詳細: 項目名と値、本文はサニタイズ、前の掲示・次の掲示・閉じる。未読に戻すは詳細に無い(一覧の行で切り替える)", () => {
  const html = render(ready({ detail, items: [item({ title: "詳細の件名" })] }));
  for (const s of ["詳細の件名", "本文", "前の掲示", "次の掲示", "閉じる", "‹ 掲示板", "min-[768px]:grid-cols-2"]) expect(html).toContain(s);
  expect(html).toContain("<p>本文</p>");
  expect(html).not.toContain("onclick");
  const none = render(ready());
  expect(none).not.toContain("前の掲示");
  expect(none).not.toContain("grid-cols-2");
});

test("一覧の行に既読・未読の切り替え。未読なら「既読にする」、既読なら「未読にする」、ボタンが無ければ押せない", () => {
  expect(render(ready({ items: [item({ unread: true })] }))).toContain(">既読にする<");
  expect(render(ready())).toContain(">未読にする<");
  expect(render(ready({ items: [item({ readRef: "" })] }))).toMatch(/disabled=""[^>]*>未読にする/);
  expect(render(ready({ detail, items: [item({ title: "詳細の件名" })] }))).not.toContain("未読に戻す");
});

test("データなし・読み込み中・エラー", () => {
  expect(render(ready({ items: [], empty: true }))).toContain("該当する掲示はありません");
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});

test("未読を新しい順に読む: 何も開いていなければ最初の未読、開いていればその後の未読へ(一覧はすぐ既読にならないため)", () => {
  const dis = /disabled=""[^>]*>未読を新しい順に読む/;
  const items = [item({ unread: true, openRef: "a" }), item({ unread: true, openRef: "" , title: "開けない" })];
  expect(render(ready({ items }), "")).not.toMatch(dis);
  expect(render(ready({ items }), "a")).toMatch(dis);
  expect(render(ready({ items: [...items, item({ unread: true, openRef: "b" })] }), "a")).not.toMatch(dis);
});

test("詳細: 分類の端では元の前後ボタンを使わず、隣の分類が無ければ押せない(元のサイトがエラーになる)", () => {
  const prevDis = /disabled=""[^>]*>前の掲示/;
  const nextDis = /disabled=""[^>]*>次の掲示/;
  const g = group({ items: [item({ title: "先頭" }), item({ title: "詳細の件名" }), item({ title: "最後" })] });
  const mid = render(ready({ detail, groups: [g] }));
  expect(mid).not.toMatch(prevDis);
  expect(mid).not.toMatch(nextDis);
  const last = render(ready({ detail: { ...detail, title: "最後" }, groups: [g] }));
  expect(last).toMatch(nextDis);
  // 次の分類があれば、その先頭の行を開く(押せる)
  expect(render(ready({ detail: { ...detail, title: "最後" }, groups: [g, group({ title: "次", items: [item({ title: "次の先頭", openRef: "n1" })] })] }))).not.toMatch(nextDis);
  expect(last).not.toMatch(prevDis);
  expect(render(ready({ detail: { ...detail, title: "先頭" }, groups: [g] }))).toMatch(prevDis);
});

test("詳細: 同じ件名が複数あるときは、端かどうか決められないので前後を押せるまま", () => {
  const g = group({ items: [item({ title: "詳細の件名" }), item({ title: "詳細の件名" })] });
  const html = render(ready({ detail, groups: [g] }));
  expect(html).not.toMatch(/disabled=""[^>]*>次の掲示/);
  expect(html).not.toMatch(/disabled=""[^>]*>前の掲示/);
});

test("詳細: 分類の最後でも、その分類に「すべて表示する」があれば次の掲示を押せる(広げてから次を開く)", () => {
  const g = group({ items: [item({ title: "先頭" }), item({ title: "最後" })], moreRef: "m" });
  expect(render(ready({ detail: { ...detail, title: "最後" }, groups: [g] }))).not.toMatch(/disabled=""[^>]*>次の掲示/);
});

test("未読を新しい順に読んでいる間は、詳細の次の掲示は次の未読へ。先に未読が無ければ押せない", () => {
  const nextDis = /disabled=""[^>]*>次の掲示/;
  const read = (items: NewsItem[]) =>
    renderToString(<NewsScreen client={client} doc={doc} initial={ready({ detail, items })} initialOpened="a" initialReading />);
  const a = item({ title: "詳細の件名", unread: true, openRef: "a" });
  expect(read([a, item({ title: "既読", openRef: "b" })])).toMatch(nextDis);
  expect(read([a, item({ title: "既読", openRef: "b" }), item({ title: "未読", unread: true, openRef: "c" })])).not.toMatch(nextDis);
});
