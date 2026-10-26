import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { Block } from "../lib/lib";
import { PageView } from "./PageView";

const T = (type: string, data: Record<string, any> = {}): Block => ({ type, data });
const tt = (text: string, level = 1) => T("title", { text, level });
const U = "70c7d200-bd42-11f1-a95b-06acdb829a47";
const file = (name: string, mime: string, uuid = U) => T("file", { file: { uuid, name, mime_type: mime } });
const view = (title: string, blocks: Block[]) => renderToString(<PageView title={title} blocks={blocks} />);

const blocks: Block[] = [
  tt("奨学金"),
  T("paragraph", { text: "MOREボタンから探せます" }),
  tt("申請の流れ"),
  T("list", { style: "ordered", items: [{ content: "書類を揃える" }, { content: "提出する" }] }),
  T("paragraph", { text: "・注意" }),
  T("list", { style: "unordered", items: [{ content: "締切厳守" }] }),
  tt("書類"),
  file("申請書.pdf", "application/pdf"),
  file("様式.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "u2"),
  T("paragraph", { text: `<a href="/api/file/view/${U}">申請書.pdf</a>` }),
  T("image", { source: "/api/file/view/img1", width: "300px", link: "https://example.com/" }),
  T("image", { source: "https://evil.example/x.png" }),
  tt("リンク"),
  T("linkBox", { header: "関連", items: [{ title: "日本学生支援機構", link: "https://www.jasso.go.jp/" }] }),
  T("callout", { text: "<b>注意</b>" }),
  T("divider"),
  T("toc", { start: 1, end: 2 }),
];

test("節ごとの行: 見出し・手順・小見出し・ファイル箱・リンク・callout", () => {
  const h = view("奨学金", blocks);
  expect(h.match(/<h1/g)).toHaveLength(1);
  // 先頭の「ページ名と同じ見出し + 段落だけ」の節は lead(MORE の言い換えつき)
  expect(h).toContain("「すべて見る」ボタンから探せます");
  expect(h.match(/<section/g)).toHaveLength(3); // 申請の流れ / 書類 / リンク
  for (const s of ["申請の流れ", "書類", "リンク"]) expect(h).toContain(`>${s}</h2>`);
  expect(h).toContain("書類を揃える");
  expect(h).toContain("text-primary\">1</span>"); // 手順の番号
  expect(h).toContain(">注意</h3>"); // 「・」小見出し
  expect(h).not.toContain("・注意");
  expect(h).toContain("PDF");
  expect(h).toContain("Excel");
  expect(h).toContain(`href="/api/file/view/${U}"`);
  expect(h.match(/<a [^>]*href="\/api\/file\/view\//g)).toHaveLength(2); // 同じファイルへの段落リンクは捨てる
  expect(h).toContain("日本学生支援機構");
  expect(h).toContain("外部");
  expect(h).toContain('role="note"');
  expect(h).toContain("<b>注意</b>");
  expect(h).toContain('src="/api/file/view/img1"');
  expect(h).toContain('href="https://example.com/"');
  expect(h).not.toContain("evil.example");
  expect(h).toContain("min(100%, 300px)");
});

test("電子キャビネットだけのページは枠なしで Cabinet を出す(読み込み中)", () => {
  const h = view("電子キャビネット", [tt("電子キャビネット"), T("fileShare", { folderUuid: "root" })]);
  expect(h).toContain("読み込み中");
  expect(h).not.toContain("<section");
  expect(h.match(/<h[123]/g)).toHaveLength(1);
});

test("お知らせページ: 通知 2 枚は別の節", () => {
  const nc = T("column", { cols: [{ blocks: [T("notification", { header: "個人通知", itemNumber: 3 })] }, { blocks: [T("notification", { header: "大学からのお知らせ" })] }] });
  const h = view("お知らせ", [tt("お知らせ"), T("paragraph", { text: "導入文" }), nc]);
  expect(h).toContain("導入文");
  expect(h.match(/すべて見る/g)).toHaveLength(2);
  expect(h).toContain("個人通知");
  expect(h).toContain("大学からのお知らせ");
});
