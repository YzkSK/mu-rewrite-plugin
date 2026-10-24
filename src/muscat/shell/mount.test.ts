import { expect, test } from "bun:test";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import { nativeNav } from "./nativeNav";

const fresh = () => new DOMParser().parseFromString("<html><head></head><body><div id=wrap></div></body></html>", "text/html");

test("ホストを 1 つ作り shadowRoot を返す(2 回呼んでも 1 つ)", () => {
  const doc = fresh();
  const a = mountShadowRoot(doc);
  const b = mountShadowRoot(doc);
  expect(doc.querySelectorAll("#mu-react-host")).toHaveLength(1);
  expect(a).toBe(b);
  expect(doc.getElementById("mu-react-host")?.shadowRoot).toBe(a);
});

test("head に本文を隠す style が 1 つ入る", () => {
  const doc = fresh();
  mountShadowRoot(doc);
  mountShadowRoot(doc);
  const styles = [...doc.head.querySelectorAll("style")].filter((s) => s.textContent?.includes("#mu-react-host"));
  expect(styles).toHaveLength(1);
});

test("css の @property だけをページ側の head にも入れる", () => {
  const doc = fresh();
  const root = mountShadowRoot(doc, "@property --x { syntax: '*'; inherits: false; }\n.a { color: red }");
  expect(doc.head.textContent).toContain("@property --x");
  expect(doc.head.textContent).not.toContain(".a {");
  expect(root.textContent).toContain(".a { color: red }");
});

test("unmount でホストと隠す style が消え、再マウントで 1 つだけ作られる", () => {
  const doc = fresh();
  mountShadowRoot(doc);
  unmountShadowRoot(doc);
  expect(doc.getElementById("mu-react-host")).toBeNull();
  expect(doc.getElementById("mu-react-hide")).toBeNull();
  mountShadowRoot(doc);
  expect(doc.querySelectorAll("#mu-react-host")).toHaveLength(1);
  expect(doc.querySelectorAll("#mu-react-hide")).toHaveLength(1);
});

// 実機で「サイドバーがスクロールで動く」: 元の body の下余白でページごと動いていた
test("ホストは画面に固定(ページごとスクロールしない)", () => {
  const doc = fresh();
  mountShadowRoot(doc);
  expect(doc.getElementById("mu-react-hide")!.textContent).toContain("#mu-react-host { position: fixed; inset: 0");
});

test("nativeNav: 一致するリンクを click、無ければ何もしない", () => {
  const doc = new DOMParser().parseFromString(
    '<form id="menuForm"><a id="x">出席確認</a><a id="y">成績照会</a></form>',
    "text/html",
  );
  let clicked = "";
  for (const a of doc.querySelectorAll("a")) a.addEventListener("click", () => (clicked += a.id));
  nativeNav(doc, "出席確認");
  expect(clicked).toBe("x");
  expect(() => nativeNav(doc, "存在しない")).not.toThrow();
  expect(clicked).toBe("x");
});
