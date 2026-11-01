import { expect, test } from "bun:test";
import { crumbs, fileCount, fileKind, parentOf, usedBytes } from "./privateFiles";

test("fileKind: 拡張子から", () => {
  expect([fileKind("a.PDF"), fileKind("b.docx"), fileKind("c.jpg"), fileKind("d.xyz"), fileKind("noext"), fileKind("x", true)])
    .toEqual(["PDF", "Word", "画像", "XYZ", "ファイル", "フォルダ"]);
});

test("parentOf / crumbs", () => {
  expect([parentOf("/a/b/"), parentOf("/a/"), parentOf("/")]).toEqual(["/a/", "/", "/"]);
  expect(crumbs("/a/b/")).toEqual([{ name: "a", path: "/a/" }, { name: "b", path: "/a/b/" }]);
  expect(crumbs("/")).toEqual([]);
});

test("usedBytes: フォルダをまたいでファイルだけ足す", () => {
  expect(usedBytes({ "/": [{ filename: "a", size: 5 }, { filename: "d", size: null, folder: true }], "/d/": [{ filename: "b", size: 7 }] })).toBe(12);
});

test("fileCount: フォルダをまたいでファイルだけ数える", () => {
  expect(fileCount({ "/": [{ filename: "a", size: 5 }, { filename: "d", size: null, folder: true }], "/d/": [{ filename: "b", size: 7 }] })).toBe(2);
});
