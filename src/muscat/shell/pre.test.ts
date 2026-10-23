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
