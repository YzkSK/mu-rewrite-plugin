import { expect, test } from "bun:test";
import { popAction, screenHistoryOp } from "./history";

test("最初の画面は書き換え、あとは積む。同じ画面・名前なしは何もしない", () => {
  expect(screenHistoryOp(null, "ホーム")).toBe("replace");
  expect(screenHistoryOp("ホーム", "掲示板")).toBe("push");
  expect(screenHistoryOp("掲示板", "掲示板")).toBeNull();
  expect(screenHistoryOp("掲示板", undefined)).toBeNull();
});

test("戻る・進むで着いたエントリへの対応", () => {
  expect(popAction({ mu: "screen", label: "掲示板" }, "ホーム", 0)).toEqual({ go: "掲示板" });
  expect(popAction({ mu: "screen", label: "ホーム" }, "ホーム", 0)).toBeNull(); // sub から戻っただけ
  expect(popAction({ mu: "sub" }, "ホーム", 1)).toBeNull();
  expect(popAction({ mu: "sub" }, "ホーム", 0)).toBe("back"); // 持ち主のいない sub は飛ばす
  expect(popAction({ mu: "sub" }, "ホーム", 0, "forward")).toBe("forward"); // 進むときは進む向きに飛ばす
  expect(popAction(null, "ホーム", 0)).toBeNull();
});
