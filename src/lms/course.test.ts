import { expect, test } from "bun:test";
import { composeCourse, isLate, nameFromTitle, parseSectionHtml, readCoursePage, shortStatus, termLabel } from "./course";

test("shortStatus: Snap の状態の文字を縮める", () => {
  expect(shortStatus("未提出2026年 10月 7日 に開始済み期日 2026年 10月 29日")).toBe("未提出・10/29 まで");
  expect(shortStatus("提出済み 2026年 09月 24日2026年 09月 24日 に開始済み期日 2026年 09月 24日")).toBe("提出済み・9/24");
  expect(shortStatus("未受験")).toBe("未受験");
  expect(shortStatus("ほかの文")).toBe("ほかの文");
});

test("composeCourse: visible=false で uservisible の無い教材は出さない", () => {
  const s = composeCourse({ section: [{ id: 1, number: 1, title: "W1", cmlist: ["9"], hassummary: false }], cm: [{ id: 9, name: "隠し", module: "assign", visible: false }] }, { 1: null });
  expect(s[0]!.items.length).toBe(0);
});

test("termLabel: 3 桁の読み", () => {
  expect(termLabel("333 専門デプロイメントコースⅢ")).toBe("3学期 水曜 3限");
  expect(termLabel("399 英語基礎C")).toBe("3学期");
  expect(termLabel("199 x")).toBe("1学期");
  expect(termLabel("320 x")).toBeNull();
  expect(termLabel("英語 333")).toBeNull();
  expect(termLabel("3333 x")).toBeNull();
});

test("nameFromTitle", () => {
  expect(nameFromTitle("コース: 333 専門デプロイメントコースⅢ(月) | MU-LMS")).toBe("333 専門デプロイメントコースⅢ(月)");
});

test("readCoursePage: 先生・shortname・コース名", () => {
  document.head.innerHTML = '<title>コース: 333 専門 | MU-LMS</title><script>var c={"shortname":"deploy3"}</script>';
  document.body.innerHTML = `<div><h4>コース管理者</h4><a href="/user/profile.php?id=7">碧海　寿広 アオミ</a><a href="/user/profile.php?id=7">dup</a></div>
    <div><h4>他</h4><a href="/user/profile.php?id=9">x y</a></div>`;
  expect(readCoursePage(document, "?id=42")).toEqual({ id: 42, name: "333 専門", shortname: "deploy3", teachers: [{ id: 7, name: "碧海 寿広" }] });
  expect(readCoursePage(document, "").id).toBeNull();
});

test("isLate: 未提出で期日が過去だけ", () => {
  const now = new Date(2026, 9, 27, 12, 0).getTime();
  expect(isLate("未提出 期限: 2026年10月5日(月曜日) 23:59", now)).toBe(true);
  expect(isLate("未提出 期限: 2026年11月5日(木曜日) 23:59", now)).toBe(false);
  expect(isLate("提出済み 期限: 2026年10月5日", now)).toBe(false);
  expect(isLate("未提出", now)).toBe(false);
});

const sectionHtml = `<ul><li class="section"><div class="summary"><p>第1回の説明 <script>x()</script></p></div>
<ul><li class="activity resource" data-id="11"><img class="activityicon" src="https://x/f/pdf-24"><div class="snap-completion-meta">
  未提出   2026年10月5日 </div></li>
<li class="activity modtype_label" data-id="12"><div class="contentwithoutlink"><p>ラベル本文</p>
<video><source src="/pluginfile.php/1/a.mp4"></video><a href="/pluginfile.php/1/b.mp4">b</a><a href="https://evil.example/c.mp4">c</a></div></li>
<li class="activity assign" data-id="13"><div class="snap-completion-meta">済</div></li></ul></li></ul>`;
const state = {
  section: [
    { id: 1, number: 0, title: "", cmlist: [], hassummary: false, visible: true },
    { id: 2, number: 1, title: "第1回", cmlist: ["13", "11", "12", "14"], hassummary: true, visible: true },
    { id: 3, number: 2, title: "第2回", cmlist: [], hassummary: false, visible: true },
  ],
  cm: [
    { id: 11, name: "資料", module: "resource", url: "https://x/r", uservisible: true },
    { id: 12, name: "ラベル", module: "label", uservisible: true },
    { id: 13, name: "課題1", module: "assign", url: "https://x/a", uservisible: true },
    { id: 14, name: "隠し", module: "assign", url: "https://x/h", uservisible: false },
  ],
};

test("parseSectionHtml", () => {
  const p = parseSectionHtml(sectionHtml);
  expect(p.summary).toContain("第1回の説明");
  expect(p.acts.get("11")).toEqual({ status: "未提出 2026年10月5日", type: "PDF", html: null });
  expect(parseSectionHtml("<li class='section'><div class='summary'> \n </div></li>").summary).toBeNull();
});

test("composeCourse: state の並び + HTML の情報・ラベル・非表示・空の節", () => {
  const s = composeCourse(state, { 2: sectionHtml });
  expect(s.map((x) => x.title)).toEqual(["最初のページ", "第1回", "第2回"]);
  expect(s[0]!.items).toEqual([]);
  const sec = s[1]!;
  expect(sec.summary).toContain("第1回の説明");
  expect(sec.summary).not.toContain("script");
  expect(sec.items.map((i) => i.id)).toEqual(["13", "11", "12"]);
  expect(sec.items[1]).toMatchObject({ name: "資料", url: "https://x/r", mod: "resource", type: "PDF", status: "未提出 2026年10月5日" });
  const label = sec.items[2]!;
  expect(label.html).toContain("ラベル本文");
  expect(label.html).not.toContain("<video");
  expect(label.videos).toEqual(["https://muscat.example/pluginfile.php/1/a.mp4", "https://muscat.example/pluginfile.php/1/b.mp4"]);
});

test("composeCourse: 節の HTML が読めなくても state だけで出す(ラベルは落ちる)", () => {
  const sec = composeCourse(state, { 2: null })[1]!;
  expect(sec.items.map((i) => i.id)).toEqual(["13", "11"]);
  expect(sec.summary).toBeNull();
});
