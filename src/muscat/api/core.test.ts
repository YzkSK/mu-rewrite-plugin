import { expect, test } from "bun:test";
import { createCore } from "./core";
import { MuscatDownError, SupersededError } from "./errors";
import { fetchTeacherEvents } from "./teacherEvents";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const menu = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form>`;
const doc = () => new DOMParser().parseFromString(menu + "<p>x</p>", "text/html");
const relay = `<form id="loginForm" action="/login"></form>`;


function make(texts: string[]) {
  const calls: string[] = [];
  const f: Fetch = async (url) => {
    calls.push(url);
    return new Response(texts[Math.min(calls.length - 1, texts.length - 1)]);
  };
  return { core: createCore({ fetch: f, doc: doc(), ids: { 出席確認: "A|1" }, now }), calls };
}

test("run は直列: 同時に 2 回呼んでも開始が重ならない", async () => {
  const { core } = make([""]);
  let active = 0;
  let max = 0;
  const op = async () => {
    active++;
    max = Math.max(max, active);
    await new Promise((r) => setTimeout(r, 3));
    active--;
    return 1;
  };
  expect(await Promise.all([core.run(op), core.run(op)])).toEqual([1, 1]);
  expect(max).toBe(1);
});

test("runLive は run と同じ直列キュー。live.doc は渡した doc、op の例外はそのまま出て、次は動く", async () => {
  const { core, calls } = make([""]);
  const order: string[] = [];
  const a = core.runLive(async (l) => {
    await new Promise((r) => setTimeout(r, 5));
    order.push("a");
    return l.doc.body.textContent;
  });
  const b = core.run(async () => (order.push("b"), 1));
  expect(await Promise.all([a, b])).toEqual(["x", 1]);
  expect(order).toEqual(["a", "b"]);
  await expect(core.runLive(async () => { throw new TypeError("boom"); })).rejects.toThrow(TypeError);
  expect(await core.runLive(async () => 2)).toBe(2);
  expect(calls.length).toBe(0);
});

test("runLive の doc は生きた doc の複製。drive の通信は直列 post で送り、生きた doc は変わらない", async () => {
  const live = new DOMParser().parseFromString(
    `${menu}<form id="funcForm" action="/f" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"><button id="funcForm:b" type="button" onclick="PrimeFaces.ab({s:&quot;funcForm:b&quot;,f:&quot;funcForm&quot;});">b</button></form>`,
    "text/html",
  );
  const before = live.documentElement.outerHTML;
  const bodies: string[] = [];
  const f: Fetch = async (_u, init) => (bodies.push(String(init?.body)), new Response(`<partial-response><changes><update id="jakarta.faces.ViewState"><![CDATA[vs2]]></update></changes></partial-response>`));
  const core = createCore({ fetch: f, doc: live, ids: {}, now });
  const r = await core.runLive(async (l) => {
    expect(l.doc).not.toBe(live);
    const b = l.doc.getElementById("funcForm:b")!;
    b.setAttribute("data-mu-ref", "c1");
    const res = await l.drive([{ kind: "click", ref: "c1" }]);
    return [res, l.doc.querySelector<HTMLInputElement>('[name="jakarta.faces.ViewState"]')!.value];
  });
  expect(r).toEqual(["done", "vs2"]);
  expect(bodies).toHaveLength(1);
  expect(live.documentElement.outerHTML).toBe(before);
});

const shell = (body: string) =>
  `<form id="headerForm" action="/h" method="post"><input name="rx-token" value="t"><input type="hidden" name="jakarta.faces.ViewState" value="vsH">
    <button id="headerForm:logoutButton" type="button" onclick="PrimeFaces.confirm({source:'headerForm:logoutButton'});return false;" data-pfconfirmcommand="PrimeFaces.bcn(this,event,[function(event){PrimeFaces.ab({s:'headerForm:logoutButton',f:'headerForm',p:'@this'});return false;}]);">ログアウト</button></form>
  <form id="menuForm" action="/m"><input name="rx-token" value="t"></form>${body}`;

/** 呼ばれた順に応答を返す fetch。呼び出し(url と本文)を記録する */
function scripted(texts: (string | (() => Promise<string>))[]) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const f: Fetch = async (url, init) => {
    calls.push({ url, body: new URLSearchParams(String(init?.body ?? "")) });
    const t = texts[Math.min(calls.length - 1, texts.length - 1)]!;
    return new Response(typeof t === "function" ? await t() : t);
  };
  return { f, calls };
}
const make2 = (f: Fetch) => createCore({ fetch: f, doc: new DOMParser().parseFromString(shell("<p>first</p>"), "text/html"), ids: { 出席確認: "A|1" }, now });

test("navigate(メニューの項目): メニューを POST し、応答を新しい画面にする(通し番号が増え、購読者に知らせる)", async () => {
  const { f, calls } = scripted([shell("<p>attendance</p>")]);
  const core = make2(f);
  const first = core.shown();
  expect(first.seq).toBe(0);
  let notified = 0;
  core.subscribe(() => notified++);
  await core.navigate("出席確認");
  expect(calls).toHaveLength(1);
  expect(calls[0]!.url.endsWith("/m")).toBe(true);
  expect(calls[0]!.body.get("menuForm:mainMenu_menuid")).toBe("A|1");
  expect(core.shown()).not.toBe(first);
  expect(core.shown().seq).toBe(1);
  expect(core.shown().doc.body.textContent).toContain("attendance");
  expect(notified).toBe(1);
});

test("要求 7(ホーム・個人設定): headerForm の全項目 + `<id>=`(空)+ rx.sync.source。画面は応答の Document", async () => {
  const { f, calls } = scripted([shell("<p>home</p>"), shell("<p>setting</p>")]);
  const core = make2(f);
  await core.navigate("ホーム");
  expect(calls[0]!.url.endsWith("/h")).toBe(true);
  expect([...calls[0]!.body]).toEqual([["rx-token", "t"], ["jakarta.faces.ViewState", "vsH"], ["headerForm:logo", ""], ["rx.sync.source", "headerForm:logo"]]);
  await core.navigate("個人設定");
  expect([...calls[1]!.body].slice(-2)).toEqual([["headerForm:setting", ""], ["rx.sync.source", "headerForm:setting"]]);
  expect(core.shown().doc.body.textContent).toContain("setting");
});

test("navigate: 応答がログイン画面などで状態喪失なら、復帰して一度だけやり直す", async () => {
  const { f, calls } = scripted(["<p>login</p>", relay, shell(""), shell("<p>attendance</p>")]);
  const core = make2(f);
  await core.navigate("出席確認");
  expect(calls).toHaveLength(4); // メニュー POST → 中継ページ → autoLogin → メニュー POST
  expect(core.shown().doc.body.textContent).toContain("attendance");
});

test("navigate: 古い ViewState で喪失になっても、ホームを取り直して送り直す(30 秒の復帰制限は受けない。続けて 2 回でも通る)", async () => {
  const { f, calls } = scripted(["<p>lost</p>", relay, shell(""), shell("<p>one</p>"), "<p>lost</p>", relay, shell(""), shell("<p>two</p>")]);
  const core = make2(f);
  await core.navigate("出席確認");
  expect(core.shown().doc.body.textContent).toContain("one");
  await core.navigate("出席確認");
  expect(core.shown().doc.body.textContent).toContain("two");
  expect(calls).toHaveLength(8);
});

test("新しい移動が来たら: 待っていた古い移動と、移動より前に積まれて動き出していない操作は捨てる。動いている操作は終わるまで待つ", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const { f, calls } = scripted([shell("<p>b</p>")]);
  const core = make2(f);
  const order: string[] = [];
  const inflight = core.runLive(async () => (await gate, order.push("inflight"), "ok"));
  await new Promise((r) => setTimeout(r, 0)); // 動き出させる
  const stale = core.runLive(async () => (order.push("stale"), "x"));
  const staleRun = core.run(async () => (order.push("staleRun"), 1));
  const a = core.navigate("出席確認");
  const b = core.navigate("出席確認");
  const during = core.runLive(async () => (order.push("during"), "y")); // 移動の完了待ちの間に、移る前の画面が積んだ操作
  release();
  await Promise.all([a, b]);
  expect(await inflight).toBe("ok");
  await expect(stale).rejects.toThrow(SupersededError);
  await expect(staleRun).rejects.toThrow(SupersededError);
  await expect(during).rejects.toThrow(SupersededError);
  expect(order).toEqual(["inflight"]);
  expect(calls).toHaveLength(1); // a は捨てられ、b だけ送った
  expect(core.shown().seq).toBe(1);
  // 移動のあとに積んだ操作は動く
  expect(await core.runLive(async (l) => l.doc.body.textContent)).toContain("b");
});

const vsOf = (d: Document) => d.querySelector<HTMLInputElement>('#funcForm [name="jakarta.faces.ViewState"]')?.value;
const withVs = (vs: string, body = "") => shell(`<form id="funcForm" action="/f" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="${vs}">${body}</form>`);

test("aside: 別の画面を開いて読んでも、見せている画面の Document と ViewState は変わらず、session も元に戻る", async () => {
  const { f, calls } = scripted([withVs("vsA", "<p>attendance</p>")]);
  const doc = new DOMParser().parseFromString(withVs("vsT", "<p>timetable</p>"), "text/html");
  const core = createCore({ fetch: f, doc, ids: { 出席確認: "A|1" }, now });
  const shown = core.shown();
  let notified = 0;
  core.subscribe(() => notified++);
  const read = await core.aside(async (ctx) => ((await ctx.open("出席確認", () => false)) ? vsOf(ctx.doc()) : null));
  expect(read).toBe("vsA");
  expect(calls).toHaveLength(1);
  expect(core.shown()).toBe(shown);
  expect(vsOf(core.shown().doc)).toBe("vsT");
  expect(notified).toBe(0);
  expect(await core.runLive(async (l) => l.doc)).toBe(shown.doc); // 続く操作は見せている画面に対して動く
});

test("aside: 見せている画面がホームで、ホームを取り直したら、ホームは作り直さず隠し項目(ViewState・rx-token)だけ写す", async () => {
  const home = (vs: string) => withVs(vs, '<div id="portalCont"></div>');
  const { f } = scripted([withVs("vsA"), relay, home("vsH2").replace('name="rx-token" value="t"', 'name="rx-token" value="fresh"')]);
  const core = createCore({ fetch: f, doc: new DOMParser().parseFromString(home("vsH1"), "text/html"), ids: { 出席確認: "A|1" }, now });
  const old = core.shown();
  let notified = 0;
  core.subscribe(() => notified++);
  await core.aside(async (ctx) => {
    if (!(await ctx.open("出席確認", () => false))) return null;
    return (await ctx.openHome()) ? 1 : null;
  });
  expect(core.shown()).toBe(old); // seq も Document も同じ(ref や開いている状態を保つ)
  expect(notified).toBe(0);
  expect(vsOf(core.shown().doc)).toBe("vsH2");
  expect(core.shown().doc.querySelector<HTMLInputElement>('#headerForm [name="rx-token"]')!.value).toBe("fresh");
  expect(await core.runLive(async (l) => l.doc)).toBe(old.doc); // session も見せているホーム
});

test("runLive の drive: ViewRoot の応答は新しい画面として取り込んで見せる(session も替わる)", async () => {
  const root = `<partial-response id="j_id__v_0"><changes><update id="jakarta.faces.ViewRoot"><![CDATA[${withVs("vsN", "<p>teacher</p>")}]]></update></changes></partial-response>`;
  const { f } = scripted([root]);
  const core = createCore({
    fetch: f,
    doc: new DOMParser().parseFromString(withVs("vs1", `<button id="funcForm:b" type="button" onclick="PrimeFaces.ab({s:'funcForm:b',f:'funcForm'});">x</button>`), "text/html"),
    ids: {},
    now,
  });
  let notified = 0;
  core.subscribe(() => notified++);
  const res = await core.runLive((l) => {
    l.doc.getElementById("funcForm:b")!.setAttribute("data-mu-ref", "c1");
    return l.drive([{ kind: "click", ref: "c1" }]);
  });
  expect(res).toBe("done");
  expect(core.shown().seq).toBe(1);
  expect(notified).toBe(1);
  expect(core.shown().doc.body.textContent).toContain("teacher");
  expect(await core.runLive(async (l) => l.doc)).toBe(core.shown().doc);
});

const errPage = `<partial-response><changes><update id="jakarta.faces.ViewRoot"><![CDATA[<html><title>Error Page</title></html>]]></update></changes></partial-response>`;
const okPartial = `<partial-response><changes><update id="jakarta.faces.ViewState"><![CDATA[vs2]]></update></changes></partial-response>`;
const btnPage = (vs: string) => withVs(vs, `<button id="funcForm:b" type="button" onclick="PrimeFaces.ab({s:'funcForm:b',f:'funcForm'});">x</button>`);
const clickOp = (n = 1) => (l: import("./core").LiveCtx) => {
  l.doc.getElementById("funcForm:b")!.setAttribute("data-mu-ref", "c1");
  return l.drive(Array.from({ length: n }, () => ({ kind: "click" as const, ref: "c1" })));
};

test("runLive: 最初の通信が状態喪失なら、ホームとメニューを取り直して画面は作り直さずやり直す", async () => {
  const { f, calls } = scripted([btnPage("v1"), errPage, relay, shell(""), btnPage("v2"), okPartial]);
  const core = make2(f);
  await core.navigate("出席確認");
  const before = core.shown();
  let notified = 0;
  core.subscribe(() => notified++);
  expect(await core.runLive(clickOp())).toBe("done");
  expect(calls).toHaveLength(6); // メニュー → 喪失 → 中継 → autoLogin → メニュー → やり直し
  expect(calls[4]!.body.get("menuForm:mainMenu_menuid")).toBe("A|1");
  expect(core.shown().seq).toBe(before.seq);
  expect(core.shown().doc).not.toBe(before.doc);
  expect(notified).toBe(1);
});

test("runLive: 見せている画面が不明(navigate 前)なら、状態喪失はそのまま投げてやり直さない", async () => {
  const { f, calls } = scripted([errPage]);
  const core = createCore({ fetch: f, doc: new DOMParser().parseFromString(btnPage("v1"), "text/html"), ids: {}, now });
  await expect(core.runLive(clickOp())).rejects.toThrow(MuscatDownError);
  expect(calls).toHaveLength(1);
});

test("runLive: 受け付けられたか分からない喪失(空の応答)はやり直さない", async () => {
  const { f, calls } = scripted([btnPage("v1"), ""]);
  const core = make2(f);
  await core.navigate("出席確認");
  await expect(core.runLive(clickOp())).rejects.toThrow(MuscatDownError);
  expect(calls).toHaveLength(2);
});

test("runLive: 2 通信目の喪失はやり直さない(二重送信を避ける)", async () => {
  const { f, calls } = scripted([btnPage("v1"), okPartial, errPage]);
  const core = make2(f);
  await core.navigate("出席確認");
  await expect(core.runLive(clickOp(2))).rejects.toThrow(MuscatDownError);
  expect(calls).toHaveLength(3);
});

test("navigate: 応答の URL がその画面の基準 URL(相対の action・予定の取得もそれに対して解決する)", async () => {
  const page = shell(`<form id="funcForm" action="Bsa01101.xhtml" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="v"><div id="funcForm:s" class="kyoinSchedule"></div></form>`);
  const calls: string[] = [];
  const f: Fetch = async (url) => {
    calls.push(url);
    const res = new Response(calls.length === 1 ? page : `<partial-response><changes><update id="funcForm:s"><![CDATA[{"events":[]}]]></update></changes></partial-response>`);
    if (calls.length === 1) Object.defineProperty(res, "url", { value: "https://muscat.example/uprx/up/bs/bsa011/Bsa01101.xhtml" });
    return res;
  };
  const core = make2(f);
  await core.navigate("出席確認");
  await core.runLive((l) => fetchTeacherEvents(l.doc, f, new Date(2026, 9, 1), new Date(2026, 10, 1)));
  expect(calls[1]).toBe("https://muscat.example/uprx/up/bs/bsa011/Bsa01101.xhtml"); // /uprx/up/bs/bsa001/ や今のブラウザの URL ではない
});

test("logout: 確認付きボタンの data-pfconfirmcommand の ab を送り、<redirect> の行き先を返す。無ければ /uprx/", async () => {
  const { f, calls } = scripted([`<partial-response><redirect url="/uprx/bye"/></partial-response>`, `<partial-response><changes></changes></partial-response>`]);
  const core = make2(f);
  expect(await core.logout()).toBe("/uprx/bye");
  expect(calls[0]!.body.get("jakarta.faces.source")).toBe("headerForm:logoutButton");
  expect(calls[0]!.body.get("jakarta.faces.partial.execute")).toBe("headerForm:logoutButton");
  expect(await core.logout()).toBe("/uprx/");
});

test("logout: ab が無いボタンなら画面ごとの POST(ヘッダーのフォームの項目 + id= + rx.sync.source)", async () => {
  const { f, calls } = scripted(["<p>login</p>"]);
  const core = createCore({ fetch: f, doc: new DOMParser().parseFromString(`<form id="headerForm" action="/h"><input name="a" value="1"><button id="headerForm:logoutButton"></button></form>`, "text/html"), ids: {}, now });
  expect(await core.logout()).toBe("/uprx/");
  expect([...calls[0]!.body]).toEqual([["a", "1"], ["headerForm:logoutButton", ""], ["rx.sync.source", "headerForm:logoutButton"]]);
});

test("喪失 → 復帰 → 一度だけやり直して成功", async () => {
  const { core, calls } = make([relay, menu]);
  let n = 0;
  const v = await core.run(async () => (++n === 1 ? null : "ok"));
  expect(v).toBe("ok");
  expect(n).toBe(2);
  expect(calls.length).toBe(2); // 中継ページ + autoLogin
});

test("やり直しも喪失 → MuscatDownError、op は 2 回まで", async () => {
  const { core } = make([relay, menu]);
  let n = 0;
  await expect(core.run(async () => (n++, null))).rejects.toThrow(MuscatDownError);
  expect(n).toBe(2);
});

test("open: 満たされていれば通信 0 回、満たされなければメニュー POST 1 回", async () => {
  const { core, calls } = make([`${menu}<form id="funcForm"></form>`]);
  const ready = (d: Document) => !!d.getElementById("funcForm");
  const opened = await core.run(async (c) => ((await c.open("出席確認", ready)) ? 1 : null));
  expect(opened).toBe(1);
  expect(calls.length).toBe(1);
  expect(calls[0]!.endsWith("/m")).toBe(true);
  await core.run(async (c) => ((await c.open("出席確認", ready)) ? 1 : null));
  expect(calls.length).toBe(1);
});
