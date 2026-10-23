import { expect, test } from "bun:test";
import { createCore } from "./core";
import { getAttendance } from "./attendance";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const menu = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form>`;
const func = (key: string) =>
  `<form id="funcForm" action="/f" method="post"><input name="rx-token" value="t">
  <select name="funcForm:kaikoNendoGakki_input"><option value="2026|03"${key === "2026|03" ? " selected" : ""}>2026年度 3学期</option><option value="2025|03"${key === "2025|03" ? " selected" : ""}>2025年度 3学期</option></select>
  <input name="funcForm:baseDate1:baseDate1_input" value="2026/10/24">
  <table id="funcForm:jugyoKaisuTbl"><tr><th>曜日時限</th><th>授業科目</th><th>出席率</th></tr></table></form>`;
const pageDoc = (inner: string) => new DOMParser().parseFromString(menu + inner, "text/html");
const ids = { 出席確認: "A|1" };

function fake(respond: (body: string) => string) {
  const bodies: string[] = [];
  const f: Fetch = async (_u, init) => {
    bodies.push(String(init?.body));
    return new Response(respond(String(init?.body)));
  };
  return { f, bodies };
}

test("前の画面から来たとき: メニュー POST 1 回", async () => {
  const { f, bodies } = fake(() => menu + func("2026|03"));
  const core = createCore({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  const a = await getAttendance(core);
  expect(bodies.length).toBe(1);
  expect(a.termKey).toBe("2026|03");
});

test("同じ学期なら通信 0 回", async () => {
  const { f, bodies } = fake(() => "");
  const core = createCore({ fetch: f, doc: pageDoc(func("2026|03")), ids, now });
  await getAttendance(core, "2026|03");
  expect(bodies.length).toBe(0);
});

test("学期を変えると部分更新 1 回(render に 4 つの id)", async () => {
  const xml = `<partial-response><changes><update id="funcForm"><![CDATA[${func("2025|03")}]]></update></changes></partial-response>`;
  const { f, bodies } = fake(() => xml);
  const core = createCore({ fetch: f, doc: pageDoc(func("2026|03")), ids, now });
  const a = await getAttendance(core, "2025|03");
  expect(bodies.length).toBe(1);
  const b = new URLSearchParams(bodies[0]);
  expect(b.get("jakarta.faces.source")).toBe("funcForm:btnHyoji");
  expect(b.get("funcForm:kaikoNendoGakki_input")).toBe("2025|03");
  expect(b.get("jakarta.faces.partial.render")!.split(" ").sort()).toEqual(
    ["funcForm:btnHyoji", "funcForm:conditionArea", "funcForm:jugyoKaisuInfo", "funcForm:jugyoKaisuTbl"],
  );
  expect(a.termKey).toBe("2025|03");
});
