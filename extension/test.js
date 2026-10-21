const assert = require("assert");
const MU = require("./lib.js");

const tree = [
  { type: "title", data: {} },
  { type: "column", data: { cols: [
    { blocks: [{ type: "image", data: { n: 1 } }] },
    { blocks: [{ type: "column", data: { cols: [{ blocks: [{ type: "image", data: { n: 2 } }] }] } }] },
  ] } },
  { type: "image", data: { n: 3 } },
];
assert.deepStrictEqual(MU.findBlocks(tree, "image").map((b) => b.data.n), [1, 2, 3]);
assert.strictEqual(MU.findBlocks(tree, "none").length, 0);

assert.strictEqual(MU.infoQuery({ itemNumber: 5, categories: [], unreadOnly: false, isPinned: false }), "page_size=5");
assert.strictEqual(MU.infoQuery({ itemNumber: 5, categories: ["a", "b"], unreadOnly: false, isPinned: false }), "page_size=5&category_uuid=a,b");
assert.strictEqual(MU.infoQuery({ itemNumber: 3, categories: [], unreadOnly: true, isPinned: false }), "page_size=3&status=unread");
assert.strictEqual(MU.infoQuery({ itemNumber: 3, categories: ["a"], unreadOnly: true, isPinned: true }), "page_size=3&category_uuid=a&status=unread&is_pinned=1");

assert.strictEqual(MU.linkLabel("https://unipa.m-muscat.musashino-u.ac.jp/uprx/Mobile/x"), "MUSCAT(スマートフォン)");
assert.strictEqual(MU.linkLabel("https://unipa.m-muscat.musashino-u.ac.jp/uprx/"), "MUSCAT");
assert.strictEqual(MU.linkLabel("https://musashino-u.myopenlms.net/"), "MU LMS");
assert.strictEqual(MU.linkLabel("https://example.com/a"), "example.com");

const cat = (s) => MU.catOf(s);
assert.strictEqual(cat("3学期－④"), "class");
assert.strictEqual(cat("訂正登録(3学期）"), "reg");
assert.strictEqual(cat("試験・補講(3学期）"), "exam");
assert.strictEqual(cat("文化の日"), "off");
assert.strictEqual(cat("摩耶祭"), "event");
assert.strictEqual(cat("大学入学共通テスト"), "event");
assert.strictEqual(cat("海の日（授業実施日）"), "class");
assert.strictEqual(cat("昭和の日（4/29）の振替休講日"), "off");

assert.strictEqual(MU.shortLabel("3学期－④"), "3学期④");
assert.strictEqual(MU.shortLabel("試験・補講(3学期）"), "試験・補講");
assert.strictEqual(MU.shortLabel("昭和の日（4/29）の振替休講日"), "振替休講日");
assert.strictEqual(MU.shortLabel("海の日（授業実施日）"), "授業実施日");
assert.strictEqual(MU.shortLabel("摩耶祭"), "摩耶祭");

// end_at は終了日の翌日0時(排他的)。2026年10月: 10/1 は木曜
const sec = (y, m, d) => Math.floor(new Date(y, m - 1, d).getTime() / 1000);
const ev = (summary, a, b) => ({ summary, start_at: sec(2026, 10, a), end_at: sec(2026, 10, b + 1) });
const weeks = MU.buildMonthGrid([
  ev("3学期－④", 20, 24), ev("授業回調整", 20, 20), ev("3学期－④", 26, 26),
], 2026, 10, 20261021);
const bars = weeks.flatMap((w, i) => w.bars.map((b) => ({ ...b, week: i })));
const long = bars.find((b) => b.summary === "3学期－④" && b.c2 - b.c1 === 4);
assert.deepStrictEqual([long.c1, long.c2, long.left, long.right, long.cat], [3, 7, true, true, "class"]); // 火〜土
assert.strictEqual(bars.filter((b) => b.summary === "3学期－④").length, 2); // 10/25(日)には伸びず10/26は別バー
const mon = bars.find((b) => b.week !== long.week && b.summary === "3学期－④");
assert.deepStrictEqual([mon.c1, mon.c2], [2, 2]);
assert.strictEqual(weeks[mon.week].bars.filter((b) => b.c1 === 1).length, 0); // 日曜(10/25)に予定なし
assert.strictEqual(bars.find((b) => b.summary === "授業回調整").lane, 1); // 重なりは別レーン
assert.strictEqual(long.lane, 0);
assert.strictEqual(weeks.flatMap((w) => w.cells).filter((c) => c.today).length, 1);
assert.strictEqual(weeks.flatMap((w) => w.cells).length, 31);
assert.strictEqual(weeks[0].cells[0].day, 1);
assert.strictEqual(weeks[0].cells[0].col, 5);
// 月をまたぐ予定: 10/30〜11/2 は10月側で右端が丸くならない
const cross = MU.buildMonthGrid([{ summary: "x", start_at: sec(2026, 10, 30), end_at: sec(2026, 11, 3) }], 2026, 10, 0)
  .flatMap((w) => w.bars);
assert.deepStrictEqual([cross[0].left, cross[0].right], [true, false]);

const T = (type, data) => ({ type, data: data || {} });
const all = ["column", "title", "paragraph", "list", "file", "image", "divider", "toc", "notification", "linkBox", "callout", "calendar", "fileShare"].map((t) => T(t));
assert.strictEqual(MU.isSupported(all), true);
assert.strictEqual(MU.isSupported([...all, T("mystery")]), false);
assert.strictEqual(MU.isSupported([T("column", { cols: [{ blocks: [T("title"), T("mystery")] }] })]), false);

const pg = [
  T("title", { text: "H1", level: 1 }),
  T("column", { cols: [{ blocks: [T("title", { text: "A", level: 2 })] }, { blocks: [T("title", { text: "B", level: 3 })] }] }),
  T("title", { text: "C", level: 2 }),
];
assert.deepStrictEqual(MU.tocEntries(pg, 2, 2), [{ id: "mu-h-1", text: "A", level: 2 }, { id: "mu-h-3", text: "C", level: 2 }]);
assert.deepStrictEqual(MU.tocEntries(pg, 2, 3).map((e) => e.id), ["mu-h-1", "mu-h-2", "mu-h-3"]);
assert.strictEqual(MU.tocEntries(pg, 4, 6).length, 0);

const tt = (text, level) => T("title", { text, level });
const heads = (r) => r.sections.map((s) => s.head && s.head.data.text);
// 奨学金型: H1 が3回 → 1 で区切る。H2 は小見出し。column 内の title は数えない
const s1 = MU.sectionize([
  T("paragraph"), tt("A", 1), T("paragraph"), tt("sub", 2), T("list"),
  tt("B", 1), T("column", { cols: [{ blocks: [tt("in", 1), tt("in", 1)] }] }), tt("C", 1), T("file"), T("calendar"),
]);
assert.deepStrictEqual(heads(s1), [null, "A", "B", "C"]); // 先頭は導入節
assert.deepStrictEqual(s1.sections.map((s) => s.wide), [false, false, true, true]); // 導入 / 通常 / column / calendar
assert.deepStrictEqual(s1.sections[1].blocks.map((b) => b.type), ["paragraph", "title", "list"]);
assert.strictEqual(s1.sections[2].blocks.length, 1);
// title は配列でも渡せる(英訳したページ名 + 日本語のままの本文見出し)
assert.strictEqual(MU.sectionize([tt("お知らせ", 1), T("paragraph")], ["Announcement", "お知らせ"]).lead.length, 1);
// ボランティア型: H3×1, H4×7 → 4 で区切り、最初の H3(浅い)も区切り
const s3 = MU.sectionize([tt("intro", 3), T("paragraph"), ...[1, 2, 3, 4, 5, 6, 7].flatMap((i) => [tt("s" + i, 4), T("paragraph")])]);
assert.strictEqual(s3.sections.length, 8);
assert.deepStrictEqual(heads(s3).slice(0, 2), ["intro", "s1"]);
// アンケート型: H3×1, H5×2 → 5 で区切り、H3 も区切り。どの level も1回だけなら最小
assert.deepStrictEqual(heads(MU.sectionize([tt("a", 3), T("paragraph"), tt("b", 5), tt("c", 5), T("paragraph")])), ["a", "c"]); // b は中身なしで捨てる
assert.deepStrictEqual(heads(MU.sectionize([tt("x", 3), T("paragraph"), tt("y", 2), T("paragraph")])), [null, "y"]); // 1回ずつなら最小の 2。浅くない x は導入節の小見出し
assert.deepStrictEqual(MU.sectionize([T("paragraph")]).sections.map((s) => s.head), [null]); // title なし
assert.deepStrictEqual(MU.sectionize([tt("H", 1)]), { lead: [], sections: [] }); // 空節は捨てる

// ページ名と同じ見出し(または見出し無し)で段落だけの先頭節は、節カードにせず lead にする
const Pg = T("paragraph", { text: "p" });
const lead1 = MU.sectionize([tt("お知らせ", 1), Pg, nc0(), tt("x", 1), Pg], "お知らせ");
function nc0() { return T("column", { cols: [{ blocks: [T("notification", { header: "a" })] }, { blocks: [T("notification", { header: "b" })] }] }); }
assert.strictEqual(lead1.lead.length, 1);
assert.deepStrictEqual(lead1.sections.map((s) => s.head && s.head.data.text), [null, null, "x"]); // 通知2枚は見出し無しの節
assert.strictEqual(MU.sectionize([tt("お知らせ", 1), Pg], "別の名前").lead.length, 0); // ページ名と違えば節のまま
assert.strictEqual(MU.sectionize([Pg, tt("a", 1), Pg, tt("b", 1), Pg], "x").lead.length, 1); // 見出し無しの導入
assert.strictEqual(MU.sectionize([tt("お知らせ", 1), Pg, T("file")], "お知らせ").lead.length, 0); // 段落以外があれば節のまま
assert.strictEqual(MU.sectionize([tt("お知らせ", 1), Pg]).lead.length, 0); // title を渡さなければ取り出さない
assert.strictEqual(MU.sectionize([tt("A", 2), T("paragraph")]).sections.length, 1); // 導入なし

// 通知だけの column は解体して独立した節にする
const N = (h) => T("notification", { header: h });
const nc = T("column", { cols: [{ blocks: [N("個人通知")] }, { blocks: [N("大学")] }] });
assert.strictEqual(MU.isNotificationOnly(nc), true);

// 全部の列が title で始まる column は、列ごとに別の節(見出しは各列の先頭の title)にする
const tcol = T("column", { cols: [{ blocks: [tt("A", 3), T("paragraph", { text: "pa" })] }, { blocks: [tt("B", 3), T("paragraph", { text: "pb" })] }] });
assert.strictEqual(MU.isTitledColumns(tcol), true);
assert.strictEqual(MU.isTitledColumns(T("column", { cols: [{ blocks: [tt("A", 3), T("paragraph")] }, { blocks: [T("paragraph"), T("paragraph")] }] })), false); // 見出しで始まらない列がある
assert.strictEqual(MU.isTitledColumns(T("column", { cols: [{ blocks: [tt("A", 3)] }, { blocks: [tt("B", 3)] }] })), false); // 見出しだけで中身がない
const sc = MU.sectionize([T("paragraph", { text: "p" }), tcol, T("paragraph", { text: "q" })]).sections;
assert.deepStrictEqual(sc.map((s) => s.head && s.head.data.text), [null, "A", "B", null]);
assert.deepStrictEqual(sc.slice(1, 3).map((s) => s.wide), [false, false]); // 2枚は左右に並ぶ
assert.strictEqual(MU.isNotificationOnly(T("column", { cols: [{ blocks: [N("a"), T("paragraph")] }] })), false);
assert.strictEqual(MU.isNotificationOnly(T("column", { cols: [] })), false);
const s4 = MU.sectionize([T("paragraph"), nc, T("paragraph")]);
assert.deepStrictEqual(s4.sections.map((s) => [s.head, s.blocks.map((b) => b.type), s.wide]),
  [[null, ["paragraph"], false], [null, ["notification"], false], [null, ["notification"], false], [null, ["paragraph"], false]]);
const mixed = T("column", { cols: [{ blocks: [N("a")] }, { blocks: [T("paragraph")] }] });
assert.deepStrictEqual(MU.sectionize([mixed]).sections.map((s) => s.wide), [true]); // 他の column は中身ごと wide

// wide の各条件
// 半幅が1枚だけ残ると全幅に昇格するので、後ろに半幅をもう1枚足して偶数にしてから先頭を見る
const wideOf = (...bs) => MU.sectionize([tt("h", 1), ...bs, tt("h", 1), T("paragraph")]).sections[0].wide;
const many = (t, n) => Array.from({ length: n }, () => T(t));
const items = (n) => ({ items: Array.from({ length: n }, () => ({ content: "x" })) });
assert.deepStrictEqual([wideOf(T("toc")), wideOf(T("calendar")), wideOf(T("column")), wideOf(T("fileShare"))], [true, true, true, true]);
assert.deepStrictEqual([wideOf(...many("file", 3)), wideOf(...many("file", 4))], [false, true]);
assert.deepStrictEqual([wideOf(T("image")), wideOf(...many("image", 2))], [false, true]);
assert.deepStrictEqual([wideOf(T("list", items(3))), wideOf(T("list", items(4)))], [false, true]);
assert.deepStrictEqual([wideOf(N("a")), wideOf(N("a"), T("paragraph"))], [false, true]);

// 文章が長い節(61文字以上)は全幅。タグは数えない
const txt = (n) => T("paragraph", { text: "<b>" + "あ".repeat(n) + "</b>" });
assert.deepStrictEqual([wideOf(txt(60)), wideOf(txt(61))], [false, true]);
assert.deepStrictEqual([wideOf(txt(30), txt(30)), wideOf(txt(30), txt(31))], [false, true]); // 段落は合計で数える
assert.strictEqual(wideOf(T("list", { items: [{ content: "あ".repeat(61) }] })), true);

// 半幅が連続して奇数個なら、最後の1枚を全幅にする(クラブ活動ページの 04 / 06 のような孤立を防ぐ)
const secWides = (...bs) => MU.sectionize(bs.flatMap((b, i) => [tt("s" + i, 1), tt("t" + i, 1), ...[].concat(b)])).sections.map((s) => s.wide);
const P1 = T("paragraph"), W = T("toc");
assert.deepStrictEqual(secWides([P1], [P1]), [false, false]);
assert.deepStrictEqual(secWides([P1], [P1], [P1]), [false, false, true]);
assert.deepStrictEqual(secWides([P1], [W], [P1]), [true, true, true]);
assert.deepStrictEqual(secWides([P1], [P1], [W], [P1]), [false, false, true, true]);

// タイルと同じファイルへのリンクだけの段落は二重なので捨てる
const U = "70c7d200-bd42-11f1-a95b-06acdb829a47";
const link = (u, t) => '<a href="https://portal.musashino-u.ac.jp/api/file/view/' + u + '">' + t + "</a>";
assert.strictEqual(MU.isDupFileLink(link(U, "x.pdf|PDFファイル"), new Set([U])), true);
assert.strictEqual(MU.isDupFileLink(link(U, "x.pdf"), new Set(["別のuuid"])), false); // タイルが無いファイルは残す
assert.strictEqual(MU.isDupFileLink("説明 " + link(U, "x.pdf"), new Set([U])), false); // 他の文があれば残す
assert.strictEqual(MU.isDupFileLink("", new Set([U])), false);

assert.strictEqual(MU.fileKind("application/pdf"), "PDF");
assert.strictEqual(MU.fileKind("image/png"), "画像");
assert.strictEqual(MU.fileKind("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), "Excel");
assert.strictEqual(MU.fileKind("application/msword"), "Word");
assert.strictEqual(MU.fileKind("application/vnd.openxmlformats-officedocument.presentationml.presentation"), "PowerPoint");
assert.strictEqual(MU.fileKind(""), "ファイル");

assert.deepStrictEqual([undefined, "5", 0, -1, NaN].map(MU.fmtSize), ["", "", "", "", ""]);
assert.deepStrictEqual([1, 1023, 1024, 1536, 10240, 1048576, 1572864, 1073741824].map(MU.fmtSize),
  ["1 B", "1023 B", "1.0 KB", "1.5 KB", "10 KB", "1.0 MB", "1.5 MB", "1.0 GB"]);

const flat = MU.flattenCategories([
  { uuid: "a", name: "A", unread_count: 3, children: [{ uuid: "a1", name: "A1", unread_count: 1, children: [{ uuid: "a11", name: "A11" }] }] },
  { uuid: "b", name: "B", unread_count: "x" },
]);
assert.deepStrictEqual(flat.map((c) => [c.uuid, c.depth]), [["a", 0], ["a1", 1], ["a11", 2], ["b", 0]]);
assert.deepStrictEqual(MU.flattenCategories(undefined), []);
assert.strictEqual(MU.unreadTotal(flat), 3); // 子は足さない、数値でないものは0

assert.strictEqual(MU.notifyQuery({}), "/api/information/1?page_size=20&recursive=true");
assert.strictEqual(MU.notifyQuery({ page: 2, category: "a b", unread: true, pinned: true, query: " 履修 登録 " }),
  "/api/information/2?page_size=20&recursive=true&category_uuid=a%20b&status=unread&is_pinned=1&fulltext=" + encodeURIComponent("履修 登録"));
assert.ok(!MU.notifyQuery({ query: "   " }).includes("fulltext"));
assert.ok(!MU.notifyQuery({ query: " a " }).includes("fulltext")); // 2文字未満
assert.ok(MU.notifyQuery({ query: "a&b" }).endsWith("fulltext=a%26b"));

assert.strictEqual(MU.readAllPath({}), "/api/information/set-read-all/");
assert.strictEqual(MU.readAllPath({ pinned: true }), "/api/information/set-read-all/?is_pinned=1");
assert.strictEqual(MU.readAllPath({ category: "c1" }), "/api/information/set-read-all/c1");
assert.strictEqual(MU.readAllPath({ category: "c1", pinned: true }), "/api/information/set-read-all/c1"); // category 優先

const D = { "未読": "Unread", "空": "" };
assert.strictEqual(MU.tr(D, "en", "未読"), "Unread");
assert.strictEqual(MU.tr(D, "en", "既読"), "既読"); // 辞書に無ければ日本語
assert.strictEqual(MU.tr(D, "ja", "未読"), "未読");
assert.strictEqual(MU.tr(D, "en", "空"), "空"); // 値が空なら日本語
assert.strictEqual(MU.tr(D, "en", "toString"), "toString"); // 継承プロパティは拾わない

const jaB = [{ type: "paragraph" }], enB = [{ type: "title" }];
const res = { content: { blocks: jaB }, content_en: { blocks: enB } };
assert.strictEqual(MU.pickBlocks(res, "en"), enB);
assert.strictEqual(MU.pickBlocks(res, "ja"), jaB);
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB }, content_en: { blocks: [] } }, "en"), jaB);
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB } }, "en"), jaB);
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB }, content_en: "x" }, "en"), jaB);
// 未翻訳のページ: content_en は空の段落1つだけ → 日本語の content にする
const emptyEn = [{ type: "paragraph", data: { text: "" } }];
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB }, content_en: { blocks: emptyEn } }, "en"), jaB);
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB }, content_en: { blocks: [{ type: "paragraph", data: { text: "<br> " } }] } }, "en"), jaB); // タグと空白だけも空
const enP = [{ type: "paragraph", data: { text: "Hello" } }];
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB }, content_en: { blocks: enP } }, "en"), enP);
const enF = [{ type: "paragraph", data: { text: "" } }, { type: "file", data: {} }];
assert.strictEqual(MU.pickBlocks({ content: { blocks: jaB }, content_en: { blocks: enF } }, "en"), enF); // 段落以外があれば英語版
assert.strictEqual(MU.pickBlocks(null, "en"), null);
assert.strictEqual(MU.pickBlocks(undefined, "ja"), null);
assert.strictEqual(MU.pickBlocks({}, "en"), null);

console.log("ok");
