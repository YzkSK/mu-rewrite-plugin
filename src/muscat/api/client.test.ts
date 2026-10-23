import { expect, test } from "bun:test";
import { createMuscatClient } from "./client";
import { MuscatDownError } from "./errors";
import type { Fetch } from "./recover";

const table = `<table class="classTable"><tr><th></th><th>月曜日</th><th>火曜日</th></tr><tr><td>1</td><td><div class="jugyo-info"><div class="fontB">合成科目</div><div>教員A</div><div><span>101</span><span>本館</span></div><div>0000000001</div><div class="taniSu">2.0単位</div></div></td><td><div class="jugyo-info"><div class="fontB"></div></div></td></tr></table>`;
const ttForm = (year: number) =>
  `<form id="funcForm" action="/f"><input name="rx-token" value="t"><input name="funcForm:nendo_input" value="${year}">${table}</form>`;
const menu = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form>`;
const pageDoc = (inner: string) => new DOMParser().parseFromString(menu + inner, "text/html");
const ids = { 学生時間割表: "A|1" };

// recover の 30 秒制限はモジュール内に残るため、他のテストファイルの時計と重ならない値から始める
let clock = 10_000_000;
const now = () => (clock += 100_000);

const relay = `<form id="loginForm" action="/login"></form>`;
const home = `<form id="menuForm" action="/m"></form>`;

function router(handlers: ((url: string, body: string) => string | Promise<string>)[] ) {
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;
  const f: Fetch = async (url, init) => {
    calls.push(url);
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 2));
    const h = handlers[Math.min(calls.length - 1, handlers.length - 1)]!;
    const text = await h(url, String(init?.body ?? ""));
    active--;
    return new Response(text, { status: text === "BOOM" ? 500 : 200 });
  };
  return { f, calls, max: () => maxActive };
}

test("時間割ページで年度指定なし → 通信 0 回", async () => {
  const { f, calls } = router([() => ""]);
  const c = createMuscatClient({ fetch: f, doc: pageDoc(ttForm(2026)), ids, now });
  const t = await c.getTimetable();
  expect(calls.length).toBe(0);
  expect(t.year).toBe(2026);
  expect(t.terms[0]!.entries.length).toBe(1);
});

test("別画面 → メニュー POST を 1 回送って parse", async () => {
  const { f, calls } = router([() => menu + ttForm(2026)]);
  const c = createMuscatClient({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  const t = await c.getTimetable();
  expect(calls.length).toBe(1);
  expect(calls[0]!.endsWith("/m")).toBe(true);
  expect(t.year).toBe(2026);
});

test("年度が違えば部分更新 1 回、同じなら 0 回", async () => {
  const xml = `<partial-response><changes><update id="funcForm"><![CDATA[${ttForm(2025)}]]></update></changes></partial-response>`;
  const { f, calls } = router([(_u, b) => (b.includes("partial.ajax") ? xml : "")]);
  const c = createMuscatClient({ fetch: f, doc: pageDoc(ttForm(2026)), ids, now });
  const t = await c.getTimetable(2025);
  expect(calls.length).toBe(1);
  expect(t.year).toBe(2025);
  await c.getTimetable(2025);
  expect(calls.length).toBe(1);
});

test("最初の応答が空 → 復帰して 1 回やり直し成功", async () => {
  const { f, calls } = router([() => "", () => relay, () => home, () => menu + ttForm(2026)]);
  const c = createMuscatClient({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  const t = await c.getTimetable();
  expect(t.year).toBe(2026);
  expect(calls.length).toBe(4);
});

test("やり直しも空 → MuscatDownError、通信は増え続けない", async () => {
  const { f, calls } = router([() => "", () => relay, () => home, () => ""]);
  const c = createMuscatClient({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  await expect(c.getTimetable()).rejects.toThrow(MuscatDownError);
  expect(calls.length).toBe(4);
});

test("同時に 2 回呼んでも直列で両方解決する", async () => {
  const r = router([() => menu + ttForm(2026)]);
  const c = createMuscatClient({ fetch: r.f, doc: pageDoc("<p>x</p>"), ids, now });
  const [a, b] = await Promise.all([c.getTimetable(), c.getTimetable()]);
  expect(a.year).toBe(2026);
  expect(b.year).toBe(2026);
  expect(r.max()).toBe(1);
});
