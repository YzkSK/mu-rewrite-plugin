import { afterEach, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { setSesskey } from "./api";
import type { RawState } from "./course";
import { LtiScreen } from "./LtiScreen";
import { navOf, readLtiPage } from "./lti";
import { ProfileScreen } from "./ProfileScreen";
import { readProfile } from "./profile";
import { SearchScreen } from "./SearchScreen";
import { loadSearch, pickItems, toOthers } from "./search";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });

const cm = (id: number, name: string, module: string, extra: object = {}) => ({ id, name, module, url: `https://x/m/${id}`, ...extra });
const state: RawState = {
  section: [
    { id: 1, number: 0, title: "", cmlist: ["1", "2"], hassummary: false },
    { id: 2, number: 1, title: "第1回", cmlist: ["3", "4", "5", "6"], hassummary: false },
  ],
  cm: [cm(1, "お知らせ", "label"), cm(2, "動画0", "lti"), cm(3, "動画1", "lti"), cm(4, "非表示", "lti", { uservisible: false }), cm(5, "小節", "subsection"), cm(6, "動画2", "lti")],
};

test("navOf: 前後の教材(ラベル・サブセクション・見えないものは飛ばす)と節の名前", () => {
  const n = navOf(state, 3)!;
  expect(n.section).toBe("第1回");
  expect(n.prev).toEqual({ name: "動画0", url: "https://x/m/2" });
  expect(n.next).toEqual({ name: "動画2", url: "https://x/m/6" });
  expect(navOf(state, 2)).toMatchObject({ section: "最初のページ", prev: null, next: { name: "動画1" } });
  expect(navOf(state, 99)).toBeNull();
});

test("readLtiPage・LtiScreen: 題名・iframe・別の窓", () => {
  const doc = parse(`<html><head><title>deploy3: 第1回の動画 | MU-LMS</title></head><body><nav class="breadcrumb"><a href="/course/view.php?id=12">333 専門</a></nav><script>var c={"courseId":12};</script></body></html>`);
  const page = readLtiPage(doc, "?id=3");
  expect(page).toEqual({ id: 3, courseId: 12, courseName: "専門", title: "第1回の動画" });
  const h = renderToString(<LtiScreen page={page} nav={navOf(state, 3)} />);
  for (const t of ["‹ 専門、第1回", "前の教材", "次の教材", "別の窓で開く", 'src="/mod/lti/launch.php?id=3&amp;triggerview=0"', "microphone; camera; autoplay; encrypted-media; fullscreen", "allowFullScreen"]) expect(h.replace("allowfullscreen", "allowFullScreen")).toContain(t);
});

test("pickItems: 名前に含むものだけ・label と subsection は除く・30 件まで", () => {
  const course = { id: 1, name: "333 専門", url: "u" };
  const s: RawState = { section: [], cm: [cm(1, "第1回 動画", "lti"), cm(2, "第1回 ラベル", "label"), cm(3, "第1回 小節", "subsection"), cm(4, "別", "lti"), cm(5, "第1回 隠し", "lti", { uservisible: false })] };
  expect(pickItems([{ course, state: s }], "第1回").map((i) => i.name)).toEqual(["第1回 動画"]);
  const many: RawState = { section: [], cm: Array.from({ length: 40 }, (_, i) => cm(i, `動画${i}`, "lti")) };
  expect(pickItems([{ course, state: many }], "動画")).toHaveLength(30);
});

test("toOthers: 自分のコースは除く", () => {
  expect(toOthers([{ id: 1, fullname: "A" }, { id: 2, fullname: "111 B", contacts: [{ fullname: "碧海　寿広 オオミ" }] }], [{ id: 1, name: "A", url: "" }]))
    .toEqual([{ id: 2, name: "B", teachers: "碧海 寿広" }]);
});

test("loadSearch: 自分のコース名と教材、ほかのコース", async () => {
  setSesskey("S");
  let args: unknown;
  globalThis.fetch = (async (_u: string, init: { body: string }) => {
    const [{ methodname, args: a }] = JSON.parse(init.body);
    const data = methodname === "core_course_get_enrolled_courses_by_timeline_classification" ? { courses: [{ id: 1, fullname: "333 動画の授業", viewurl: "u1" }, { id: 2, fullname: "111 英語", viewurl: "u2" }] }
      : methodname === "core_courseformat_get_state" ? { section: [], cm: [cm(10 + a.courseid, a.courseid === 2 ? "動画課題" : "資料", "assign")] }
      : (args = a, { courses: [{ id: 1, fullname: "333 動画の授業" }, { id: 3, fullname: "222 動画編集", contacts: [{ fullname: "a b" }] }] });
    return new Response(JSON.stringify([{ error: false, data }]));
  }) as unknown as typeof fetch;
  const r = await loadSearch("動画");
  expect(args).toEqual({ criterianame: "search", criteriavalue: "動画", page: 0, perpage: 20 });
  expect(r.courses.map((c) => c.id)).toEqual([1]);
  expect(r.items.map((i) => i.name)).toEqual(["動画課題"]);
  expect(r.others.map((c) => c.id)).toEqual([3]);
  const h = renderToString(<SearchScreen search="?search=動画" initial={r} />);
  for (const t of ["自分のコース(2 件)", "ほかのコース(1 件)", "動画課題", "222 動画編集".slice(4)]) expect(h).toContain(t);
  expect(renderToString(<SearchScreen search="" />)).toContain("検索語を入れて");
});

test("readProfile・ProfileScreen: 名前・メール・タイムゾーン、設定のリンク", () => {
  const doc = parse(`<html><head><title>碧海　寿広 オオミ: パブリックプロファイル | MU-LMS</title></head><body><div id="region-main">
<section><h3>詳細</h3><dl><dt>メールアドレス</dt><dd><a href="mailto:a@x">a@x</a></dd></dl><dl><dt>国</dt><dd>日本</dd></dl><dl><dt>タイムゾーン</dt><dd>Asia/Tokyo</dd></dl><dl><dt>最終アクセス</dt><dd>今</dd></dl></section></div></body></html>`);
  const p = readProfile(doc);
  expect(p).toEqual({ name: "碧海 寿広", items: [{ label: "メールアドレス", value: "a@x" }, { label: "国", value: "日本" }, { label: "タイムゾーン", value: "Asia/Tokyo" }] });
  const h = renderToString(<ProfileScreen page={p} />);
  for (const t of ["碧海 寿広", "a@x", "Asia/Tokyo", 'href="/user/edit.php"', 'href="/user/preferences.php"', 'href="/user/files.php"']) expect(h).toContain(t);
  expect(h).not.toContain("最終アクセス");
});
