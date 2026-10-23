import { expect, test } from "bun:test";
import { drive } from "./drive";
import { assignRefs } from "./locator";

const page = () => {
  const d = new DOMParser().parseFromString(
    `<div class="ui-blockui" style="display: none"></div><input id="t" name="t"><input id="c" type="checkbox"><button id="b">go</button>`,
    "text/html",
  );
  assignRefs(d);
  const ref = (id: string) => d.getElementById(id)!.getAttribute("data-mu-ref")!;
  return { d, ref };
};
const fast = { startMs: 40, quietMs: 10, timeoutMs: 300 };

test("set / check / click を順に実行し、click が ajax を起こせば done", async () => {
  const { d, ref } = page();
  const block = d.querySelector<HTMLElement>(".ui-blockui")!;
  d.getElementById("b")!.addEventListener("click", () => {
    block.style.display = "block"; // ajax の開始を模擬
    setTimeout(() => (block.style.display = "none"), 20);
  });
  const r = await drive(d, [{ kind: "set", ref: ref("t"), value: "v" }, { kind: "check", ref: ref("c"), checked: true }, { kind: "click", ref: ref("b") }], fast);
  expect(r).toBe("done");
  expect((d.getElementById("t") as HTMLInputElement).value).toBe("v");
  expect((d.getElementById("c") as HTMLInputElement).checked).toBe(true);
});

test("ajax が起きなければ none。最後が set でも change の ajax を待つ", async () => {
  const { d, ref } = page();
  expect(await drive(d, [{ kind: "click", ref: ref("b") }], fast)).toBe("none");
  const block = d.querySelector<HTMLElement>(".ui-blockui")!;
  d.getElementById("t")!.addEventListener("change", () => {
    block.style.display = "block";
    setTimeout(() => (block.style.display = "none"), 20);
  });
  expect(await drive(d, [{ kind: "set", ref: ref("t"), value: "x" }], fast)).toBe("done");
});

test("ref が無ければ Error(何も操作しない)", async () => {
  const { d, ref } = page();
  await expect(drive(d, [{ kind: "set", ref: ref("t"), value: "x" }, { kind: "click", ref: "c999" }], fast)).rejects.toThrow();
  expect((d.getElementById("t") as HTMLInputElement).value).toBe("");
});
