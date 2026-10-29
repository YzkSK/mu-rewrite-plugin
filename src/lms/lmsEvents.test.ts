import { expect, test } from "bun:test";
import { answered, isClosed, pruneEvents } from "../../extension/lmsEvents.js";

const q = (o = {}) => ({ modulename: "questionnaire", eventtype: "close", url: "https://x/q", ...o });

test("answered: 自分の回答へのリンクがあれば回答済み", () => {
  expect(answered('<a href="https://x/mod/questionnaire/myreport.php?instance=1">')).toBe(true);
  expect(answered("<p>回答する</p>")).toBe(false);
});

test("isClosed: 課題は actionable、アンケートは overdue だけで決める", () => {
  expect(isClosed({ modulename: "assign", overdue: true, action: { actionable: false } })).toBe(true);
  expect(isClosed({ modulename: "assign", overdue: true, action: { actionable: true } })).toBe(false);
  expect(isClosed({ modulename: "assign", overdue: false, action: { actionable: false } })).toBe(false);
  expect(isClosed(q({ overdue: true, action: { actionable: true } }))).toBe(true);
  expect(isClosed(q({ overdue: false, action: { actionable: true } }))).toBe(false);
});

test("pruneEvents: 開始と回答済みを除き、未回答・取得失敗は残す。課題は fetch しない", async () => {
  const fetched: string[] = [];
  const events = [
    q({ eventtype: "open", url: "open" }),
    q({ url: "done" }),
    q({ url: "todo" }),
    q({ url: "boom" }),
    { modulename: "assign", url: "assign" },
  ];
  const out = await pruneEvents(events, async (url) => {
    fetched.push(url);
    if (url === "boom") throw new Error("x");
    return url === "done" ? "/mod/questionnaire/myreport.php" : "";
  });
  expect(out.map((e) => e.url)).toEqual(["todo", "boom", "assign"]);
  expect(fetched.sort()).toEqual(["boom", "done", "todo"]);
});
