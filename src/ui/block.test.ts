import { expect, test } from "bun:test";
import { blockNativeScripts, unblockNativeScripts } from "./block";

const tick = () => new Promise((r) => setTimeout(r, 10));

test("パーサーが足した script と modulepreload を実行前に無効にする", async () => {
  const stop = blockNativeScripts(document);
  const inline = document.createElement("script");
  inline.textContent = "window.__ran = 1";
  const ext = document.createElement("script");
  ext.type = "module";
  ext.setAttribute("src", "/static/app.js");
  const other = document.createElement("script");
  other.setAttribute("src", "https://cdn.example/x.js");
  const pre = document.createElement("link");
  pre.rel = "modulepreload";
  pre.href = "/static/chunk.js";
  document.head.append(inline, ext, other, pre);
  await tick();
  expect(inline.type).toBe("text/x-mu-blocked");
  expect(ext.type).toBe("text/x-mu-blocked");
  expect(ext.hasAttribute("src")).toBe(false);
  expect(ext.getAttribute("data-mu-src")).toBe("/static/app.js");
  expect(other.hasAttribute("src")).toBe(true); // 別オリジンは触らない
  expect(pre.isConnected).toBe(false);
  stop();
  const later = document.createElement("script");
  document.head.append(later);
  await tick();
  expect(later.type).toBe(""); // 止めた後は触らない
  [inline, ext, other, later].forEach((s) => s.remove());
});

test("unblock: 止めた script を元の type・中身で作り直して動かす", async () => {
  const stop = blockNativeScripts(document);
  const a = document.createElement("script");
  a.id = "ub";
  a.setAttribute("type", "text/javascript");
  a.textContent = "window.__ub = (window.__ub || 0) + 1";
  document.head.append(a);
  await tick();
  stop();
  expect(a.type).toBe("text/x-mu-blocked");
  expect(a.getAttribute("data-mu-type")).toBe("text/javascript");
  await unblockNativeScripts(document);
  const now = document.getElementById("ub") as HTMLScriptElement;
  expect(now).not.toBe(a);
  expect(now.getAttribute("type")).toBe("text/javascript");
  expect(now.hasAttribute("data-mu-type")).toBe(false);
  expect(now.textContent).toContain("__ub");
  now.remove();
});
