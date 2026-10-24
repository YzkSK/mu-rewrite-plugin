import { expect, test } from "bun:test";
import { installPreHide, releasePreHide } from "./pre";

const root = document.documentElement;

test("install は冪等、release でスタイルごと消える(何度でも)", () => {
  installPreHide(document);
  installPreHide(document);
  expect(document.querySelectorAll("#mu-react-pre").length).toBe(1);
  expect(root.classList.contains("mu-pre")).toBe(true);
  releasePreHide(document);
  releasePreHide(document);
  expect(document.getElementById("mu-react-pre")).toBeNull();
  expect(root.classList.contains("mu-pre")).toBe(false);
});

// 実機で「ホームへの移動だけ白くなる」: 描画までの間も、枠の形と読み込みの帯を見せる
test("覆いは白一色でなく、上の段の線と読み込みの帯を描く。サイドバーを閉じていれば地を描かない", () => {
  localStorage.setItem("mu-m-drawer", "closed");
  installPreHide(document);
  const css = document.getElementById("mu-react-pre")!.textContent!;
  expect(css).toContain("html.mu-pre::after");
  expect(css).toContain("0 69px/100% 1px");
  expect(root.classList.contains("mu-pre-side")).toBe(false);
  releasePreHide(document);
  localStorage.removeItem("mu-m-drawer");
  installPreHide(document);
  expect(root.classList.contains("mu-pre-side")).toBe(!matchMedia("(max-width: 767.98px)").matches);
  releasePreHide(document);
  expect(root.classList.contains("mu-pre-side")).toBe(false);
});
