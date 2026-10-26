import { expect, test } from "bun:test";
import { createMuscatClient } from "./client";
import { checksOf } from "./room";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const ab = (s: string) => `PrimeFaces.ab({s:&quot;${s}&quot;,f:&quot;funcForm&quot;,u:&quot;funcForm&quot;});return false;`;
const xml = `<partial-response><changes><update id="jakarta.faces.ViewState"><![CDATA[vs2]]></update></changes></partial-response>`;

/** onchange が無い欄は通信なし。year だけ onchange(source = funcForm:chg)を付けて、set の通信を見分ける */
const wrap = (body: string) => `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form><div id="funcContent"><form id="funcForm" action="/f" method="post">
  <input type="hidden" name="funcForm_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">${body}</form></div>`;

function setup(html: string) {
  const bodies: URLSearchParams[] = [];
  const f: Fetch = async (_url, init) => {
    bodies.push(new URLSearchParams(String(init?.body ?? "")));
    return new Response(xml, { status: 200 });
  };
  const doc = new DOMParser().parseFromString(wrap(html), "text/html");
  const c = createMuscatClient({ fetch: f, doc, ids: {}, now });
  // 操作されるのは複製なので、中身は readLive で見る
  return { c, bodies, look: <T>(fn: (d: Document) => T) => c.readLive(fn) };
}
const val = (d: Document, id: string) => d.getElementById(id)!.getAttribute("value");
const checked = (d: Document, id: string) => (d.getElementById(id) as HTMLInputElement).checked;

const sel = (id: string, opts: [string, string][], value = "") =>
  `<select id="funcForm:${id}_input" name="funcForm:${id}_input">${opts.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("")}</select>`;
const checks = (name: string, labels: string[], onAt: number[] = []) =>
  `<table id="funcForm:${name}" class="ui-selectmanycheckbox"><tr>${labels
    .map((l, i) => `<td><div class="ui-chkbox"><div><input id="funcForm:${name}:${i}" type="checkbox" name="funcForm:${name}" ${onAt.includes(i) ? "checked" : ""}></div><div class="ui-chkbox-box"></div></div><label>${l}</label></td>`)
    .join("")}</tr></table>`;
const inp = (id: string, value = "", extra = "") => `<input id="funcForm:${id}" name="funcForm:${id}" value="${value}" ${extra}>`;

const syllabus = `${inp("kaikoNendo_input", "2026", `onchange="${ab("funcForm:chg")}"`)}${sel("kaikoGakki", [["", "すべて"], ["01", "1学期"], ["02", "2学期"]], "01")}
  ${inp("jugyoKamoku")}${inp("tantoKyoin")}${inp("keyword")}
  ${sel("cgksSearchType0", [["", "すべて"], ["5A2", "文学部"]])}${sel("kmkbnr", [["", "すべて"], ["K", "教養"]])}${sel("campus", [["", "すべて"], ["C", "有明"]])}
  ${checks("gakunenList", ["1年", "2年"])}${checks("jugyoKbnList", ["週間授業"])}${checks("yobiList", ["月", "火", "水"], [0])}${checks("jigenList", ["1限"])}
  <button id="funcForm:search" type="button" onclick="${ab("funcForm:search")}">検索</button>`;

const BOX = (name: string, i: number) => `funcForm:${name}:${i}`;

test("syllabus.search: 全欄を set し、チェックは違うものだけ押し、検索の通信を最後に 1 回", async () => {
  const { c, bodies, look } = setup(syllabus);
  await c.syllabus.search({
    year: "2025", term: "02", subject: "数学", teacher: "山田", keyword: "統計", dept: "5A2", category: "K", campus: "C",
    picked: { days: ["火"], grades: ["2年"], kinds: [], periods: [] },
  });
  expect(bodies.map((b) => b.get("jakarta.faces.source"))).toEqual(["funcForm:chg", "funcForm:search"]);
  const b = bodies[1]!;
  expect(["kaikoNendo_input", "jugyoKamoku", "tantoKyoin", "keyword"].map((k) => b.get(`funcForm:${k}`))).toEqual(["2025", "数学", "山田", "統計"]);
  expect(["kaikoGakki", "cgksSearchType0", "kmkbnr", "campus"].map((k) => b.get(`funcForm:${k}_input`))).toEqual(["02", "5A2", "K", "C"]);
  // 月は外れ、火・2年は付く。1年・週間授業・1限は触らない
  expect(await look((d) => [BOX("yobiList", 0), BOX("yobiList", 1), BOX("gakunenList", 0), BOX("gakunenList", 1)].map((id) => checked(d, id)))).toEqual([false, true, false, true]);
});

test("syllabus.search: 省略した欄・グループは触らない({ year } だけなら年度の欄だけ変わる)", async () => {
  const { c, bodies, look } = setup(syllabus);
  await c.syllabus.search({ year: "2025" });
  expect(bodies.map((b) => b.get("jakarta.faces.source"))).toEqual(["funcForm:chg", "funcForm:search"]);
  expect(await look((d) => val(d, "funcForm:kaikoNendo_input"))).toBe("2025");
  expect(await look((d) => checked(d, BOX("yobiList", 0)))).toBe(true); // 月はそのまま
  expect(bodies[1]!.get("funcForm:kaikoGakki_input")).toBe("01");
});

test("syllabus.search: 検索ボタンが無ければ reject し、何も送らない", async () => {
  const { c, bodies } = setup(syllabus.replace('id="funcForm:search"', 'id="funcForm:other"').replace("検索</button>", "実行</button>"));
  await expect(c.syllabus.search({ year: "2025" })).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});

const teacher = `${inp("searchNameM4", "")}<select id="funcForm:orderM4:j_id_mz:0:j_id_n1_input" name="funcForm:orderM4_input"><option value="sortBy.kanaName" selected>カナ氏名</option><option value="sortBy.enName">英語氏名</option></select>
  <button id="funcForm:searchCommandM4" type="button" onclick="${ab("funcForm:searchCommandM4")}">検索</button>`;

test("teacherSchedule.search: 氏名と並び順を入れて検索の通信を 1 回", async () => {
  const { c, bodies } = setup(teacher);
  await c.teacherSchedule.search({ name: "麻田", sort: "sortBy.enName" });
  expect(bodies).toHaveLength(1);
  expect(bodies[0]!.get("jakarta.faces.source")).toBe("funcForm:searchCommandM4");
  expect(bodies[0]!.get("funcForm:searchNameM4")).toBe("麻田");
  expect(bodies[0]!.get("funcForm:orderM4_input")).toBe("sortBy.enName");
});

test("teacherSchedule.search: 検索欄が無ければ reject し、何も送らない", async () => {
  const { c, bodies } = setup("<p>なし</p>");
  await expect(c.teacherSchedule.search({ name: "麻田", sort: "" })).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});

const room = `${checks("hyojiTaisho", ["本人の予約", "職員の予約"], [1])}${inp("targetDateFrom:targetDateFrom_input", "2026/10/24")}${inp("targetDateTo:targetDateTo_input", "2026/10/25")}
  ${checks("j_id_4a", ["月", "火", "水"], [0])}${inp("shuyoNinzuHeijoTo", "50")}${inp("shuyoNinzuHeijoFrom")}
  ${sel("campus", [["", "すべて"], ["1", "有明"]])}<button id="funcForm:search" type="button" onclick="${ab("funcForm:search")}">検索</button>`;

test("room.fill: 違うチェックだけ押して欄に値を入れる。検索の通信は送らない", async () => {
  const { c, bodies, look } = setup(room);
  const p = await c.room.read();
  const on0 = Object.fromEntries(checksOf(p).map((k) => [k.ref, k.checked]));
  const [mon, tue] = p.days;
  const text = Object.fromEntries([[p.capacity.regular.to.ref, "80"], [p.campus.ref, "1"]]);
  await c.room.fill({ text, on: { ...on0, [mon!.ref]: false, [tue!.ref]: true } });
  expect(bodies).toHaveLength(0);
  const got = await look((d) => ({
    to: val(d, "funcForm:shuyoNinzuHeijoTo"),
    from: val(d, "funcForm:targetDateFrom:targetDateFrom_input"),
    campus: (d.getElementById("funcForm:campus_input") as HTMLSelectElement).value,
    days: [0, 1, 2].map((i) => checked(d, `funcForm:j_id_4a:${i}`)),
    target: checked(d, "funcForm:hyojiTaisho:1"),
  }));
  // 指定の無い欄・変えていないチェックは今の値のまま
  expect(got).toEqual({ to: "80", from: "2026/10/24", campus: "1", days: [false, true, false], target: true });
});

test("press / fill: それぞれ通信を 1 回送る", async () => {
  const { c, bodies } = setup(syllabus);
  const p = await c.syllabus.read();
  await c.fill(p.year.ref, "2030");
  expect(bodies).toHaveLength(1);
  expect(bodies[0]!.get("jakarta.faces.source")).toBe("funcForm:chg");
  expect(bodies[0]!.get("funcForm:kaikoNendo_input")).toBe("2030");
  await c.press(p.searchRef);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]!.get("jakarta.faces.source")).toBe("funcForm:search");
});
