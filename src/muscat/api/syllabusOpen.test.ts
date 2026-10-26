import { expect, test } from "bun:test";
import { createMuscatClient } from "./client";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const ab = (s: string) => `PrimeFaces.ab({s:&quot;${s}&quot;,f:&quot;funcForm&quot;,u:&quot;funcForm&quot;});return false;`;
const wrap = (body: string) => `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form><div id="funcContent"><form id="funcForm" action="/f" method="post">
  <input type="hidden" name="funcForm_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">${body}</form></div>`;
const page = `<input id="funcForm:jugyoKamoku" name="funcForm:jugyoKamoku" value="">
  <select id="funcForm:kaikoGakki_input" name="funcForm:kaikoGakki_input"><option value="">すべて</option><option value="01" selected>1学期</option></select>
  <button id="funcForm:search" type="button" onclick="${ab("funcForm:search")}">検索</button>
  <button id="funcForm:clear" type="button" onclick="${ab("funcForm:clear")}">クリア</button>
  <div id="funcForm:table"></div>`;
const tr = (i: number, name: string) =>
  `<tr><td>月1</td><td><a href="#" id="funcForm:open${i}" onclick="${ab(`funcForm:open${i}`)}">${name}</a></td><td>先生</td><td>講義</td><td><div>1学期</div></td><td>2</td></tr>`;
const table = (rows: string[]) => `<div id="funcForm:table"><table><tbody class="ui-datatable-data">${rows.join("")}</tbody></table></div>`;
const reply = (html = "") => `<partial-response><changes>${html && `<update id="funcForm:table"><![CDATA[${html}]]></update>`}<update id="jakarta.faces.ViewState"><![CDATA[vs2]]></update></changes></partial-response>`;

/** 検索のたびに rowsFor(送った学期) の行を出す偽 fetch。通信の本文を順に記録する */
function setup(rowsFor: (term: string) => string[]) {
  const bodies: URLSearchParams[] = [];
  const f: Fetch = async (_url, init) => {
    const b = new URLSearchParams(String(init?.body ?? ""));
    bodies.push(b);
    const hit = b.get("jakarta.faces.source") === "funcForm:search";
    return new Response(reply(hit ? table(rowsFor(b.get("funcForm:kaikoGakki_input") ?? "")) : ""), { status: 200 });
  };
  const doc = new DOMParser().parseFromString(wrap(page), "text/html");
  return { c: createMuscatClient({ fetch: f, doc, ids: { シラバス: "S|1" }, now }), bodies, sources: () => bodies.map((b) => b.get("jakarta.faces.source")) };
}

test("findAndOpen: クリア → 授業名で検索 → code が一致する行を開く", async () => {
  const { c, bodies, sources } = setup(() => [tr(0, "A001 画像認識"), tr(1, "A002 画像認識")]);
  await c.syllabus.findAndOpen({ title: "画像認識", code: "A002" });
  expect(sources()).toEqual(["funcForm:clear", "funcForm:search", "funcForm:open1"]);
  expect(bodies[1]!.get("funcForm:jugyoKamoku")).toBe("画像認識");
});

test("findAndOpen: code が合わなくても title が一致する行が 1 つならそれを開く", async () => {
  const { c, sources } = setup(() => [tr(0, "A001 画像認識"), tr(1, "A002 別の授業")]);
  await c.syllabus.findAndOpen({ title: "画像認識", code: "ZZZ" });
  expect(sources().at(-1)).toBe("funcForm:open0");
});

test("findAndOpen: 見つからず学期に「すべて」があれば、学期を空にしてもう一度検索する", async () => {
  const { c, bodies, sources } = setup((term) => (term === "" ? [tr(0, "A001 画像認識")] : []));
  await c.syllabus.findAndOpen({ title: "画像認識", code: "A001" });
  expect(sources()).toEqual(["funcForm:clear", "funcForm:search", "funcForm:search", "funcForm:open0"]);
  expect(bodies[1]!.get("funcForm:kaikoGakki_input")).toBe("01");
  expect(bodies[2]!.get("funcForm:kaikoGakki_input")).toBe("");
});

test("findAndOpen: それでも無ければ reject し、行は開かない", async () => {
  const { c, sources } = setup(() => []);
  await expect(c.syllabus.findAndOpen({ title: "画像認識" })).rejects.toThrow("シラバスが見つかりませんでした");
  expect(sources().some((s) => s?.startsWith("funcForm:open"))).toBe(false);
});

test("open: 予約は navigate の前に入り、移動中でも takePending で取れる。2 回目は null", async () => {
  let during: unknown;
  let c!: ReturnType<typeof setup>["c"];
  const f: Fetch = async () => {
    during = c.syllabus.takePending();
    return new Response(wrap(page), { status: 200 });
  };
  c = createMuscatClient({ fetch: f, doc: new DOMParser().parseFromString(wrap(page), "text/html"), ids: { シラバス: "S|1" }, now });
  await c.syllabus.open({ title: "画像認識", code: "A001" });
  expect(during).toEqual({ title: "画像認識", code: "A001" });
  expect(c.syllabus.takePending()).toBeNull();
});

test("open: 移った先がシラバス検索でなければ(追い越された・違う画面)、予約を消す", async () => {
  const f: Fetch = async () => new Response(wrap("<p>別の画面</p>"), { status: 200 });
  const c = createMuscatClient({ fetch: f, doc: new DOMParser().parseFromString(wrap(page), "text/html"), ids: { シラバス: "S|1" }, now });
  await c.syllabus.open({ title: "画像認識" });
  expect(c.syllabus.takePending()).toBeNull();
});
