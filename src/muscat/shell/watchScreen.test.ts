import { expect, test } from "bun:test";
import { watchScreen } from "./watchScreen";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WAIT = 200;
const fresh = (code: string) =>
  new DOMParser().parseFromString(`<html><body><div id="mainWrapTop">${code && `[${code}]`}</div></body></html>`, "text/html");
const set = (doc: Document, code: string) => {
  doc.getElementById("mainWrapTop")!.textContent = code && `[${code}]`;
};

test("登録時に空でなければ通知される", () => {
  const got: string[] = [];
  const stop = watchScreen(fresh("Kmd008"), (c) => got.push(c));
  expect(got).toEqual(["Kmd008"]);
  stop();
});

test("同じコードのままの変化では再通知しない", async () => {
  const doc = fresh("Kmd008");
  const got: string[] = [];
  const stop = watchScreen(doc, (c) => got.push(c));
  doc.body.appendChild(doc.createElement("p"));
  await sleep(WAIT);
  expect(got).toEqual(["Kmd008"]);
  stop();
});

test("コードが変わると通知される", async () => {
  const doc = fresh("Kmd008");
  const got: string[] = [];
  const stop = watchScreen(doc, (c) => got.push(c));
  set(doc, "Pky001");
  await sleep(WAIT);
  expect(got).toEqual(["Kmd008", "Pky001"]);
  stop();
});

test("メニューがありコードが空のまま unknownAfterMs たつと、空コードを 1 回だけ通知する", async () => {
  const doc = fresh("");
  doc.body.insertAdjacentHTML("beforeend", '<ul id="menuForm:mainMenu"></ul>');
  const got: string[] = [];
  const stop = watchScreen(doc, (c) => got.push(c), { unknownAfterMs: 50 });
  expect(got).toEqual([]);
  await sleep(WAIT);
  doc.body.appendChild(doc.createElement("p"));
  await sleep(WAIT);
  expect(got).toEqual([""]);
  stop();
});

test("メニューが無ければ、空のままでも通知しない", async () => {
  const got: string[] = [];
  const stop = watchScreen(fresh(""), (c) => got.push(c), { unknownAfterMs: 50 });
  await sleep(WAIT);
  expect(got).toEqual([]);
  stop();
});

test("空に変わっても通知しない", async () => {
  const doc = fresh("Kmd008");
  const got: string[] = [];
  const stop = watchScreen(doc, (c) => got.push(c));
  set(doc, "");
  await sleep(WAIT);
  expect(got).toEqual(["Kmd008"]);
  stop();
});
