import { expect, test } from "bun:test";
import { createMuscatClient, type MuscatClient } from "./client";
import type { Fetch } from "./recover";
import { now } from "./testClock";
import type { GradeFilter } from "./types";

// 成績照会の「表示する科目」を変えたときの通信を、2026-10-26 に実機(元の画面)で記録した本文と同じ並び・中身で固定する。
// 画面側から API 側へ移す前後で同じテストを通す(変わるのは changeFilter の中身だけ)

const FLAGS = ["fail", "rishu", "muhaito", "furikae"] as const;
const AB = `PrimeFaces.ab({s:&quot;funcForm:search&quot;,f:&quot;funcForm&quot;,u:&quot;funcForm&quot;});return false;`;
const box = (n: string, on: boolean) =>
  `<div class="ui-chkbox"><div class="ui-helper-hidden-accessible"><input type="checkbox" name="funcForm:${n}DispFlg_input"${on ? " checked" : ""}></div><div class="ui-chkbox-box${on ? " ui-state-active" : ""}"></div></div>`;
const func = (on: readonly string[]) => `<form id="funcForm" action="/uprx/up/km/kmg006/Kmg00601.xhtml" method="post">
  <input type="hidden" name="rx-token" value="t"><input type="hidden" name="rx-loginKey" value="k"><input type="hidden" name="rx-deviceKbn" value="d"><input type="hidden" name="rx-loginType" value="l">
  <input type="radio" name="funcForm:initPtn" value="1" checked>
  <div class="ui-chkbox"><div class="ui-helper-hidden-accessible"><input type="checkbox" name="funcForm:gpaKmkDispFlg_input" checked></div><div class="ui-chkbox-box ui-state-active"></div></div>
  ${FLAGS.map((n) => box(n, on.includes(n))).join("")}
  <button id="funcForm:search" type="button" onclick="${AB}">表示</button>
  <table><tr><th>印</th><th>科目</th><th>単位数</th><th>評価</th></tr></table>
  <input type="hidden" name="funcForm_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"></form>`;
const menu = `<form id="menuForm" action="/m" method="post"><input type="hidden" name="rx-token" value="t"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"></form>`;
const page = (on: readonly string[]) => new DOMParser().parseFromString(menu + func(on), "text/html");
const reply = (on: readonly string[]) =>
  `<partial-response><changes><update id="funcForm"><![CDATA[${func(on)}]]></update><update id="j_id__v_0:jakarta.faces.ViewState:1"><![CDATA[vs2]]></update></changes></partial-response>`;

function setup(start: readonly string[], after: readonly string[]) {
  const bodies: [string, string][][] = [];
  const f: Fetch = async (_u, init) => {
    bodies.push([...new URLSearchParams(String(init?.body ?? ""))]);
    return new Response(reply(after));
  };
  return { c: createMuscatClient({ fetch: f, doc: page(start), ids: { 成績照会: "G|1" }, now }), bodies };
}

/** 画面が条件を変えて読み直す操作。API の getGrades(filter) で送る */
async function changeFilter(c: MuscatClient, filter: GradeFilter) {
  return c.getGrades(filter);
}

const all: GradeFilter = { fail: true, inProgress: true, noCredit: true, transfer: true };
const head: [string, string][] = [["jakarta.faces.partial.ajax", "true"], ["jakarta.faces.source", "funcForm:search"], ["jakarta.faces.partial.execute", "@all"], ["jakarta.faces.partial.render", "funcForm"], ["funcForm:search", "funcForm:search"]];
const rx: [string, string][] = [["rx-token", "t"], ["rx-loginKey", "k"], ["rx-deviceKbn", "d"], ["rx-loginType", "l"], ["funcForm:initPtn", "1"], ["funcForm:gpaKmkDispFlg_input", "on"]];
const tail: [string, string][] = [["funcForm_SUBMIT", "1"], ["jakarta.faces.ViewState", "vs1"]];

test("不合格を外して表示: 実機と同じ本文(failDispFlg を送らない)を 1 回。結果の条件も外れている", async () => {
  const { c, bodies } = setup(FLAGS, ["rishu", "muhaito", "furikae"]);
  const g = await changeFilter(c, { ...all, fail: false });
  expect(bodies).toEqual([[...head, ...rx, ["funcForm:rishuDispFlg_input", "on"], ["funcForm:muhaitoDispFlg_input", "on"], ["funcForm:furikaeDispFlg_input", "on"], ...tail]]);
  expect(g.filter).toEqual({ ...all, fail: false });
});

test("戻して表示: failDispFlg=on を含む本文を 1 回", async () => {
  const { c, bodies } = setup(["rishu", "muhaito", "furikae"], FLAGS);
  const g = await changeFilter(c, all);
  expect(bodies).toEqual([[...head, ...rx, ...FLAGS.map((n): [string, string] => [`funcForm:${n}DispFlg_input`, "on"]), ...tail]]);
  expect(g.filter).toEqual(all);
});

test("条件が同じでも「表示」を押した扱いで 1 回送る(今の画面の動き)", async () => {
  const { c, bodies } = setup(FLAGS, FLAGS);
  await changeFilter(c, all);
  expect(bodies.length).toBe(1);
});
