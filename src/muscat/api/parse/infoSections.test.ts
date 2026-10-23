import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import { parseInfoSections } from "./infoSections";

const doc = (inner: string) => new DOMParser().parseFromString(`<form id="funcForm">${inner}</form>`, "text/html");
const cell = (s: string) => `<td class="ui-panelgrid-cell">${s}</td>`;
const row = (k: string, v: string) => `<tr>${cell(`<label class="ui-outputlabel">${k}</label>`)}${cell(v)}</tr>`;
const grid = (...rows: string[]) => `<table class="ui-panelgrid"><tbody>${rows.join("")}</tbody></table>`;
const section = (title: string, body: string) =>
  `<h3 class="ui-accordion-header">${title}</h3><div class="ui-accordion-content"><table class="dataStyle"><tr><td>${body}</td></tr></table></div>`;

test("節の題名と順序、panelgrid の行(空白は詰める)", () => {
  const html = section("学生基本情報", grid(row("氏名", "  テスト\n  太郎 "), row("区分", ""))) + section("学籍情報", grid(row("学部", "テスト学部")));
  const p = parseInfoSections(doc(html));
  expect(p.sections.map((s) => s.title)).toEqual(["学生基本情報", "学籍情報"]);
  expect(p.sections[0]!.grids[0]!.rows).toEqual([["氏名", "テスト 太郎"], ["区分", ""]]);
  expect(p.sections[1]!.tables).toEqual([]);
});

test("複数の panelgrid は順に", () => {
  const p = parseInfoSections(doc(section("緊急連絡先情報", grid(row("氏名", "A")) + grid(row("氏名", "B")))));
  expect(p.sections[0]!.grids.map((g) => g.rows[0]![1])).toEqual(["A", "B"]);
});

test("葉の表(th/td)だけ拾い、外枠の dataStyle 表は拾わない", () => {
  const leaf = `<table><thead><tr><th>異動開始日</th><th>留学先</th></tr></thead><tbody><tr><td>2024/04/01</td><td>テスト大学</td></tr></tbody></table>`;
  const p = parseInfoSections(doc(section("異動情報", leaf)));
  expect(p.sections[0]!.tables).toEqual([{ headers: ["異動開始日", "留学先"], rows: [["2024/04/01", "テスト大学"]] }]);
  expect(p.sections[0]!.grids).toEqual([]);
});

test("中身が空の節", () => {
  const html = `<h3 class="ui-accordion-header">特待生</h3><div class="ui-accordion-content"><table class="dataStyle"><tr><td></td></tr></table></div>`;
  const s = parseInfoSections(doc(html)).sections[0]!;
  expect(s).toEqual({ title: "特待生", grids: [], tables: [] });
});

test("アコーディオンも funcForm も無ければ ParseError", () => {
  expect(() => parseInfoSections(doc("<p>x</p>"))).toThrow(ParseError);
  expect(() => parseInfoSections(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});
