import { expect, test } from "bun:test";
import { isHttp, sanitize } from "./sanitize";

test("script は丸ごと落とし、未知のタグは中身だけ残す", () => {
  expect(sanitize('<p>a<script>alert(1)</script><custom>b</custom></p>')).toBe("<p>ab</p>");
});

test("javascript: の href と on* 属性は外す", () => {
  const h = sanitize('<a href="javascript:alert(1)" onclick="x()">t</a><a href="java\tscript:x">u</a>');
  expect(h).not.toContain("javascript");
  expect(h).not.toContain("onclick");
  expect(h).not.toContain("href");
});

test("style は文字の装飾だけ通す", () => {
  const h = sanitize('<span style="color:#f00;position:fixed;z-index:9">x</span><span style="position:fixed">y</span>');
  expect(h).toContain('style="color:#f00"');
  expect(h).not.toContain("position");
});

test("リンクは別タブ + noopener", () => {
  const h = sanitize('<a href="https://example.com/">x</a>');
  expect(h).toContain('target="_blank"');
  expect(h).toContain('rel="noopener noreferrer"');
});

test("isHttp は http(s) だけ", () => {
  expect(isHttp("https://a.example/")).toBe(true);
  expect(isHttp("javascript:alert(1)")).toBe(false);
});
