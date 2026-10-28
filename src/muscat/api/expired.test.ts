import { expect, test } from "bun:test";
import { isStateLost } from "./expired";

test("page", () => {
  expect(isStateLost("page", 200, "")).toBe(true);
  expect(isStateLost("page", 500, '<form id="menuForm">')).toBe(true);
  expect(isStateLost("page", 200, "<html>" + "x".repeat(2900) + "</html>")).toBe(true);
  expect(isStateLost("page", 200, '<form id="menuForm"></form>')).toBe(false);
});

test("partial", () => {
  expect(isStateLost("partial", 200, "<partial-response></partial-response>")).toBe(false);
  expect(isStateLost("partial", 200, "<html>Error</html>")).toBe(true);
  expect(isStateLost("partial", 500, "<partial-response>")).toBe(true);
  const viewRoot = (body: string) => `<partial-response><changes><update id="jakarta.faces.ViewRoot"><![CDATA[<html>${body}</html>]]></update></changes></partial-response>`;
  expect(isStateLost("partial", 200, viewRoot("<title>Error Page</title>別の画面で操作されたため"))).toBe(true);
  expect(isStateLost("partial", 200, viewRoot('<form id="menuForm"></form>'))).toBe(false);
  expect(isStateLost("partial", 200, viewRoot('<title>教員詳細</title><form id="funcForm"></form>'))).toBe(false);
});
