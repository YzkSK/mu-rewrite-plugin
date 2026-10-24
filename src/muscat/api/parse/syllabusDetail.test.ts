import { expect, test } from "bun:test";
import { resolveRef } from "../driver/locator";
import { parseSyllabusDetail } from "./syllabusDetail";

const head = (h: string) => `<div class="ui-widget-header">${h}</div>`;
const body = (b: string) => `<div class="ui-widget-content">${b}</div>`;
const row = (...cells: string[]) => `<div class="rowStyle rowMargin">${cells.join("")}</div>`;

const dialog = (rows: string, hidden = "false", note = "ふせんを貼る") =>
  new DOMParser().parseFromString(
    `<div id="pkx02301:dialog" aria-hidden="${hidden}"><span class="ui-dialog-title">シラバス照会</span><a class="ui-dialog-titlebar-close"></a>
    <div class="ui-selectbooleanbutton">${note}</div><button class="btnPrint">印刷</button>${rows}</div>`,
    "text/html",
  );

const rows = [
  row(head("授業コード・授業科目"), body("<div>0010010101 情報リテラシー</div>")),
  row(head("担当教員"), body("<div>石上 和敬、矢澤 美香子</div>")),
  row(head("授業計画")),
  row(head("授業回"), head("内容")),
  row(head("<label><span>第1回</span></label>"), body('<div class="rowStyle"><div class="colStyle"><div>第１回：　イントロダクション</div><div>準備するもの</div></div></div>')),
].join("");

test("開いている: 題名・コードと、節・表の見出し・項目の行", () => {
  const d = dialog(rows);
  const x = parseSyllabusDetail(d)!;
  expect([x.code, x.title]).toEqual(["0010010101", "情報リテラシー"]);
  expect(x.rows[1]).toEqual({ kind: "field", label: "担当教員", values: ["石上 和敬、矢澤 美香子"] });
  expect(x.rows[2]).toEqual({ kind: "section", title: "授業計画" });
  expect(x.rows[3]).toEqual({ kind: "head", cells: ["授業回", "内容"] });
  expect(resolveRef(d, x.printRef)?.className).toBe("btnPrint");
  expect(resolveRef(d, x.closeRef)?.className).toContain("titlebar-close");
});

test("入れ子の値は 1 行の項目になり、改行を残す", () => {
  const x = parseSyllabusDetail(dialog(rows))!;
  expect(x.rows).toHaveLength(5);
  expect(x.rows[4]).toEqual({ kind: "field", label: "第1回", values: ["第１回： イントロダクション\n準備するもの"] });
});

test("ふせん: 貼る文字なら外れている、別の文字なら貼ってある", () => {
  expect(parseSyllabusDetail(dialog(rows))!.noteOn).toBe(false);
  expect(parseSyllabusDetail(dialog(rows, "false", "ふせんを外す"))!.noteOn).toBe(true);
});

test("閉じている(aria-hidden=true)・ダイアログなし・中身が空は null", () => {
  expect(parseSyllabusDetail(dialog(rows, "true"))).toBeNull();
  expect(parseSyllabusDetail(dialog(""))).toBeNull();
  expect(parseSyllabusDetail(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toBeNull();
});

test("コードが取れなければ値をそのまま題名にする", () => {
  const x = parseSyllabusDetail(dialog(row(head("授業コード・授業科目"), body("<div>情報リテラシー</div>"))))!;
  expect([x.code, x.title]).toEqual(["", "情報リテラシー"]);
});
