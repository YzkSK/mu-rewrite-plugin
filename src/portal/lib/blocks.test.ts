import { expect, test } from "bun:test";
import { fmtSize, fmtYmd, isDupFileLink, isNotificationOnly, isSoleCabinet, isSupported, isTitledColumns, reword, sectionize } from "./blocks";
import type { Block } from "./lib";

const T = (type: string, data: Record<string, any> = {}): Block => ({ type, data });
const tt = (text: string, level: number) => T("title", { text, level });
const heads = (r: { sections: { head: Block | null }[] }) => r.sections.map((s) => s.head && s.head.data!.text);
const Pg = T("paragraph", { text: "p" });
const N = (h: string) => T("notification", { header: h });

test("isSupported: column の中も見る", () => {
  const all = ["column", "title", "paragraph", "list", "file", "image", "divider", "toc", "notification", "linkBox", "callout", "calendar", "fileShare"].map((t) => T(t));
  expect(isSupported(all)).toBe(true);
  expect(isSupported([...all, T("mystery")])).toBe(false);
  expect(isSupported([T("column", { cols: [{ blocks: [T("title"), T("mystery")] }] })])).toBe(false);
});

test("sectionize: 区切りレベルは出現回数で決める", () => {
  const s1 = sectionize([
    T("paragraph"), tt("A", 1), T("paragraph"), tt("sub", 2), T("list"),
    tt("B", 1), T("column", { cols: [{ blocks: [tt("in", 1), tt("in", 1)] }] }), tt("C", 1), T("file"), T("calendar"),
  ]);
  expect(heads(s1)).toEqual([null, "A", "B", "C"]);
  expect(s1.sections[1]!.blocks.map((b) => b.type)).toEqual(["paragraph", "title", "list"]);
  const s3 = sectionize([tt("intro", 3), T("paragraph"), ...[1, 2, 3, 4, 5, 6, 7].flatMap((i) => [tt("s" + i, 4), T("paragraph")])]);
  expect(s3.sections).toHaveLength(8);
  expect(heads(s3).slice(0, 2)).toEqual(["intro", "s1"]);
  expect(heads(sectionize([tt("a", 3), T("paragraph"), tt("b", 5), tt("c", 5), T("paragraph")]))).toEqual(["a", "c"]); // b は中身なしで捨てる
  expect(heads(sectionize([tt("x", 3), T("paragraph"), tt("y", 2), T("paragraph")]))).toEqual([null, "y"]);
  expect(sectionize([tt("H", 1)])).toEqual({ lead: [], sections: [] });
});

test("sectionize: lead の取り出し", () => {
  expect(sectionize([tt("お知らせ", 1), T("paragraph")], ["Announcement", "お知らせ"]).lead).toHaveLength(1);
  expect(sectionize([tt("お知らせ", 1), Pg], "別の名前").lead).toHaveLength(0);
  expect(sectionize([Pg, tt("a", 1), Pg, tt("b", 1), Pg], "x").lead).toHaveLength(1);
  expect(sectionize([tt("お知らせ", 1), Pg, T("file")], "お知らせ").lead).toHaveLength(0);
  expect(sectionize([tt("お知らせ", 1), Pg]).lead).toHaveLength(0);
});

test("通知だけの column / 見出しで始まる列は節に分ける", () => {
  const nc = T("column", { cols: [{ blocks: [N("個人通知")] }, { blocks: [N("大学")] }] });
  expect(isNotificationOnly(nc)).toBe(true);
  expect(isNotificationOnly(T("column", { cols: [{ blocks: [N("a"), T("paragraph")] }] }))).toBe(false);
  expect(isNotificationOnly(T("column", { cols: [] }))).toBe(false);
  expect(sectionize([Pg, nc, Pg]).sections.map((s) => [s.head, s.blocks.map((b) => b.type)]))
    .toEqual([[null, ["paragraph"]], [null, ["notification"]], [null, ["notification"]], [null, ["paragraph"]]]);
  const tcol = T("column", { cols: [{ blocks: [tt("A", 3), Pg] }, { blocks: [tt("B", 3), Pg] }] });
  expect(isTitledColumns(tcol)).toBe(true);
  expect(isTitledColumns(T("column", { cols: [{ blocks: [tt("A", 3), Pg] }, { blocks: [Pg, Pg] }] }))).toBe(false);
  expect(isTitledColumns(T("column", { cols: [{ blocks: [tt("A", 3)] }, { blocks: [tt("B", 3)] }] }))).toBe(false);
  expect(heads(sectionize([Pg, tcol, Pg]))).toEqual([null, "A", "B", null]);
});

test("isDupFileLink / fmtSize / fmtYmd / reword / isSoleCabinet", () => {
  const U = "70c7d200-bd42-11f1-a95b-06acdb829a47";
  const link = (u: string, t: string) => `<a href="https://portal.musashino-u.ac.jp/api/file/view/${u}">${t}</a>`;
  expect(isDupFileLink(link(U, "x.pdf|PDFファイル"), new Set([U]))).toBe(true);
  expect(isDupFileLink(link(U, "x.pdf"), new Set(["別のuuid"]))).toBe(false);
  expect(isDupFileLink("説明 " + link(U, "x.pdf"), new Set([U]))).toBe(false);
  expect(isDupFileLink("", new Set([U]))).toBe(false);
  expect([undefined, "5", 0, -1, NaN].map(fmtSize)).toEqual(["", "", "", "", ""]);
  expect([1, 1023, 1024, 1536, 10240, 1048576, 1572864, 1073741824].map(fmtSize))
    .toEqual(["1 B", "1023 B", "1.0 KB", "1.5 KB", "10 KB", "1.0 MB", "1.5 MB", "1.0 GB"]);
  expect(fmtYmd(new Date(2026, 0, 5).getTime() / 1000)).toBe("2026/1/5");
  expect(fmtYmd(undefined)).toBe("");
  expect(reword("<p>MOREボタン</p>")).toBe("<p>「すべて見る」ボタン</p>");
  expect(isSoleCabinet([tt("電子キャビネット", 1), T("paragraph", { text: "<br>" }), T("fileShare")])).toBe(true);
  expect(isSoleCabinet([T("fileShare"), Pg])).toBe(false);
});
