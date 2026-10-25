import { expect, test } from "bun:test";
import { buildMonthGrid, catOf, fileKind, findBlocks, fmtDue, fmtFull, fmtWhen, flattenCategories, infoQuery, linkLabel, notifyQuery, pickBlocks, readAllPath, shortLabel, unreadTotal, type Block } from "./lib";

test("notifyQuery / readAllPath / fmtFull", () => {
  expect(notifyQuery()).toBe("/api/information/1?page_size=20&recursive=true");
  expect(notifyQuery({ page: 3, category: "a b", unread: true, pinned: true, query: " 履修 " }))
    .toBe("/api/information/3?page_size=20&recursive=true&category_uuid=a%20b&status=unread&is_pinned=1&fulltext=" + encodeURIComponent("履修"));
  expect(notifyQuery({ query: "あ" })).not.toContain("fulltext");
  expect(readAllPath()).toBe("/api/information/set-read-all/");
  expect(readAllPath({ pinned: true })).toBe("/api/information/set-read-all/?is_pinned=1");
  expect(readAllPath({ pinned: true, category: "c1" })).toBe("/api/information/set-read-all/c1");
  expect(fmtFull(new Date(2026, 9, 23, 9, 0).getTime() / 1000)).toBe("2026.10.23(金) 09:00");
});

test("findBlocks は column の中も出現順に辿る", () => {
  const tree: Block[] = [
    { type: "title", data: {} },
    { type: "column", data: { cols: [
      { blocks: [{ type: "image", data: { n: 1 } }] },
      { blocks: [{ type: "column", data: { cols: [{ blocks: [{ type: "image", data: { n: 2 } }] }] } }] },
    ] } },
    { type: "image", data: { n: 3 } },
  ];
  expect(findBlocks(tree, "image").map((b) => b.data!.n)).toEqual([1, 2, 3]);
  expect(findBlocks(tree, "none")).toHaveLength(0);
});

test("infoQuery", () => {
  expect(infoQuery({ itemNumber: 5, categories: [] })).toBe("page_size=5");
  expect(infoQuery({ itemNumber: 5, categories: ["a", "b"] })).toBe("page_size=5&category_uuid=a,b");
  expect(infoQuery({ itemNumber: 3, unreadOnly: true })).toBe("page_size=3&status=unread");
  expect(infoQuery({ itemNumber: 3, categories: ["a"], unreadOnly: true, isPinned: true })).toBe("page_size=3&category_uuid=a&status=unread&is_pinned=1");
});

test("linkLabel", () => {
  expect(linkLabel("https://unipa.m-muscat.musashino-u.ac.jp/uprx/Mobile/x")).toBe("MUSCAT(スマートフォン)");
  expect(linkLabel("https://unipa.m-muscat.musashino-u.ac.jp/uprx/")).toBe("MUSCAT");
  expect(linkLabel("https://musashino-u.myopenlms.net/")).toBe("MU LMS");
  expect(linkLabel("https://example.com/a")).toBe("example.com");
});

test("catOf / shortLabel", () => {
  const c = catOf;
  expect([c("3学期－④"), c("訂正登録(3学期）"), c("試験・補講(3学期）"), c("文化の日"), c("摩耶祭"), c("大学入学共通テスト"), c("海の日（授業実施日）"), c("昭和の日（4/29）の振替休講日")])
    .toEqual(["class", "reg", "exam", "off", "event", "event", "class", "off"]);
  expect(shortLabel("3学期－④")).toBe("3学期④");
  expect(shortLabel("試験・補講(3学期）")).toBe("試験・補講");
  expect(shortLabel("昭和の日（4/29）の振替休講日")).toBe("振替休講日");
  expect(shortLabel("海の日（授業実施日）")).toBe("授業実施日");
  expect(shortLabel("摩耶祭")).toBe("摩耶祭");
});

// end_at は終了日の翌日0時(排他的)。2026年10月: 10/1 は木曜
const sec = (y: number, m: number, d: number) => Math.floor(new Date(y, m - 1, d).getTime() / 1000);
const ev = (summary: string, a: number, b: number) => ({ summary, start_at: sec(2026, 10, a), end_at: sec(2026, 10, b + 1) });

test("buildMonthGrid: バーの列・レーン・今日・月またぎ", () => {
  const weeks = buildMonthGrid([ev("3学期－④", 20, 24), ev("授業回調整", 20, 20), ev("3学期－④", 26, 26)], 2026, 10, 20261021);
  const bars = weeks.flatMap((w, i) => w.bars.map((b) => ({ ...b, week: i })));
  const long = bars.find((b) => b.summary === "3学期－④" && b.c2 - b.c1 === 4)!;
  expect([long.c1, long.c2, long.left, long.right, long.cat]).toEqual([3, 7, true, true, "class"]); // 火〜土
  expect(bars.filter((b) => b.summary === "3学期－④")).toHaveLength(2);
  const mon = bars.find((b) => b.week !== long.week && b.summary === "3学期－④")!;
  expect([mon.c1, mon.c2]).toEqual([2, 2]);
  expect(bars.find((b) => b.summary === "授業回調整")!.lane).toBe(1);
  expect(long.lane).toBe(0);
  expect(weeks.flatMap((w) => w.cells).filter((c) => c.today)).toHaveLength(1);
  expect(weeks.flatMap((w) => w.cells)).toHaveLength(31);
  expect([weeks[0]!.cells[0]!.day, weeks[0]!.cells[0]!.col]).toEqual([1, 5]);
  const cross = buildMonthGrid([{ summary: "x", start_at: sec(2026, 10, 30), end_at: sec(2026, 11, 3) }], 2026, 10, 0).flatMap((w) => w.bars);
  expect([cross[0]!.left, cross[0]!.right]).toEqual([true, false]);
});

test("fmtWhen / fmtDue", () => {
  const now = new Date(2026, 9, 27, 12, 0);
  const at = (d: Date) => Math.floor(d.getTime() / 1000);
  expect(fmtWhen(at(new Date(2026, 9, 27, 9, 5)), now)).toBe("09:05");
  expect(fmtWhen(at(new Date(2026, 9, 20, 9, 5)), now)).toBe("10/20");
  expect(fmtDue(at(new Date(2026, 10, 3, 23, 59)))).toBe("11/3 23:59");
});

test("fileKind", () => {
  expect(fileKind("application/pdf")).toBe("PDF");
  expect(fileKind("image/png")).toBe("画像");
  expect(fileKind("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("Excel");
  expect(fileKind("application/msword")).toBe("Word");
  expect(fileKind("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("PowerPoint");
  expect(fileKind("")).toBe("ファイル");
});

test("flattenCategories / unreadTotal", () => {
  const flat = flattenCategories([
    { uuid: "a", name: "A", unread_count: 3, children: [{ uuid: "a1", name: "A1", unread_count: 1, children: [{ uuid: "a11", name: "A11" }] }] },
    { uuid: "b", name: "B", unread_count: "x" },
  ]);
  expect(flat.map((c) => [c.uuid, c.depth])).toEqual([["a", 0], ["a1", 1], ["a11", 2], ["b", 0]]);
  expect(flattenCategories(undefined)).toEqual([]);
  expect(unreadTotal(flat)).toBe(3); // 子は足さない、数値でないものは0
});

test("pickBlocks", () => {
  const jaB = [{ type: "paragraph" }], enB = [{ type: "title" }];
  const res = { content: { blocks: jaB }, content_en: { blocks: enB } };
  expect(pickBlocks(res, "en")).toBe(enB);
  expect(pickBlocks(res, "ja")).toBe(jaB);
  expect(pickBlocks({ content: { blocks: jaB }, content_en: { blocks: [] } }, "en")).toBe(jaB);
  expect(pickBlocks({ content: { blocks: jaB }, content_en: "x" }, "en")).toBe(jaB);
  const emptyEn = [{ type: "paragraph", data: { text: "<br> " } }];
  expect(pickBlocks({ content: { blocks: jaB }, content_en: { blocks: emptyEn } }, "en")).toBe(jaB);
  const enF = [{ type: "paragraph", data: { text: "" } }, { type: "file", data: {} }];
  expect(pickBlocks({ content: { blocks: jaB }, content_en: { blocks: enF } }, "en")).toBe(enF);
  expect(pickBlocks(null, "en")).toBeNull();
  expect(pickBlocks({}, "ja")).toBeNull();
});
