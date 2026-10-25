import { expect, test } from "bun:test";
import { installPreHide, preEpoch, releasePreHide } from "./pre";

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

// 枠や文字を描くと、そこで前のページの表示が終わり、枠 → 画面と切り替わってちらついた
test("覆いは元の画面を隠すだけで、枠も文字も描かない。掛けるたびに回数が進み、書体を先に読み始める", () => {
  const before = preEpoch();
  installPreHide(document);
  expect(preEpoch()).toBe(before + 1);
  const css = document.getElementById("mu-react-pre")!.textContent!;
  expect(css).toContain("visibility: hidden");
  expect(css).not.toContain("::after");
  expect(css).not.toContain("gradient");
  expect(document.getElementById("mu-react-font")).not.toBeNull();
  releasePreHide(document);
});
