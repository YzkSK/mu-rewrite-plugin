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

test("覆いは真ん中の回るアイコン。掛けるたびに回数が進む", () => {
  const before = preEpoch();
  installPreHide(document);
  expect(preEpoch()).toBe(before + 1);
  const css = document.getElementById("mu-react-pre")!.textContent!;
  expect(css).toContain("left: 50%");
  expect(css).toContain("mu-pre-spin");
  releasePreHide(document);
});

test("枠(上の段の線)を描き、サイドバーを閉じていれば地を描かない", () => {
  localStorage.setItem("mu-m-drawer", "closed");
  installPreHide(document);
  expect(document.getElementById("mu-react-pre")!.textContent!).toContain("0 0/100% 56px");
  expect(root.classList.contains("mu-pre-side")).toBe(false);
  releasePreHide(document);
  localStorage.removeItem("mu-m-drawer");
  installPreHide(document);
  expect(root.classList.contains("mu-pre-side")).toBe(!matchMedia("(max-width: 767.98px)").matches);
  releasePreHide(document);
  expect(root.classList.contains("mu-pre-side")).toBe(false);
});
