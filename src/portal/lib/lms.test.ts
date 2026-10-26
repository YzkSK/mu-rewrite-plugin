import { expect, test } from "bun:test";
import { courseName, dueName } from "./lms";

test("提出期限の名前から「…」の提出期限 を外す", () => {
  expect(dueName("「03_【課題提出先】」の提出期限")).toBe("03_【課題提出先】");
  expect(dueName("小テスト 締切")).toBe("小テスト 締切");
});

test("コース名の先頭の番号を外す", () => {
  expect(courseName("399 英語基礎C [Re_a]")).toBe("英語基礎C [Re_a]");
  expect(courseName("英語基礎C")).toBe("英語基礎C");
});
