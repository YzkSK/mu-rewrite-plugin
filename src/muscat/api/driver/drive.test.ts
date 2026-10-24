import { expect, test } from "bun:test";
import type { ObserveXhr } from "./busy";
import { drive, looksAjax } from "./drive";
import { assignRefs } from "./locator";

const page = () => {
  const d = new DOMParser().parseFromString(
    `<div id="w"></div><input id="t" name="t"><input id="c" type="checkbox"><button id="b" type="button">go</button>
     <button id="pf" type="button" onclick="PrimeFaces.ab({s:1})">pf</button><a id="cl" class="ui-commandlink">x</a><input id="sub" type="submit">`,
    "text/html",
  );
  assignRefs(d);
  const ref = (id: string) => d.getElementById(id)!.getAttribute("data-mu-ref")!;
  return { d, ref };
};
/** 偽の観測。observed は「観測が始まった時点で、どの step がまだ実行されていないか」を見るための記録 */
const fake = () => {
  let on: ((e: { startTime: number }) => void) | undefined;
  const log: string[] = [];
  const observeXhr: ObserveXhr = (cb) => (log.push("observe"), (on = cb), () => (on = undefined));
  return { observeXhr, emit: () => on?.({ startTime: performance.now() }), log };
};
const fast = { quietMs: 20, timeoutMs: 300 };

test("click の ajax 既定: PrimeFaces.ab / commandlink / submit は true、ふつうは false", () => {
  const { d } = page();
  const g = (id: string) => looksAjax(d.getElementById(id)!);
  expect([g("b"), g("pf"), g("cl"), g("sub")]).toEqual([false, true, true, true]);
});

test("最初の step の前に見張りを始め、XHR を受けて done", async () => {
  const { d, ref } = page();
  const f = fake();
  d.getElementById("t")!.addEventListener("change", () => f.log.push("change"));
  d.getElementById("pf")!.addEventListener("click", () => {
    f.log.push("click");
    setTimeout(f.emit, 10);
    setTimeout(() => d.getElementById("w")!.appendChild(d.createElement("p")), 15);
  });
  const r = await drive(d, [{ kind: "set", ref: ref("t"), value: "v" }, { kind: "check", ref: ref("c"), checked: true }, { kind: "click", ref: ref("pf") }], { ...fast, observeXhr: f.observeXhr });
  expect(r).toBe("done");
  expect(f.log).toEqual(["observe", "change", "click"]);
  expect((d.getElementById("c") as HTMLInputElement).checked).toBe(true);
});

test("ajax でない click は短く待って none。step の ajax: true なら長く待つ(opts.expectAjax が優先)", async () => {
  const { d, ref } = page();
  const f = fake();
  expect(await drive(d, [{ kind: "click", ref: ref("b") }], { ...fast, observeXhr: f.observeXhr })).toBe("none");
  const slow = await Promise.race([
    drive(d, [{ kind: "click", ref: ref("b"), ajax: true }], { ...fast, timeoutMs: 400, observeXhr: f.observeXhr }),
    new Promise((res) => setTimeout(() => res("pending"), 350)),
  ]);
  expect(slow).toBe("pending");
  // opts.expectAjax: false は step の ajax: true より優先
  expect(await drive(d, [{ kind: "click", ref: ref("pf") }], { ...fast, expectAjax: false, observeXhr: f.observeXhr })).toBe("none");
});

// ページサイズの select は change で ajax が走る。set だけでも、ajax: true なら一覧の書き換えまで待つ
test("set は既定で ajax を待たず、ajax: true なら長く待つ", async () => {
  const { d, ref } = page();
  const f = fake();
  expect(await drive(d, [{ kind: "set", ref: ref("t"), value: "v" }], { ...fast, observeXhr: f.observeXhr })).toBe("none");
  const slow = await Promise.race([
    drive(d, [{ kind: "set", ref: ref("t"), value: "w", ajax: true }], { ...fast, timeoutMs: 400, observeXhr: f.observeXhr }),
    new Promise((res) => setTimeout(() => res("pending"), 350)),
  ]);
  expect(slow).toBe("pending");
});

test("ref が無ければ Error(何も操作しない)", async () => {
  const { d, ref } = page();
  await expect(drive(d, [{ kind: "set", ref: ref("t"), value: "x" }, { kind: "click", ref: "c999" }], fast)).rejects.toThrow();
  expect((d.getElementById("t") as HTMLInputElement).value).toBe("");
});
