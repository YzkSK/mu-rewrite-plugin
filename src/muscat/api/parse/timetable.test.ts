import { describe, expect, test } from "bun:test";
import { ParseError } from "../errors";
import { parseTimetable } from "./timetable";

const DAYS = ["月", "火", "水", "木", "金", "土"];

function cell(subject?: string) {
  if (!subject) return `<td><div class="jugyo-info"><div class="fontB"></div></div></td>`;
  return `<td><div class="jugyo-info"><div class="fontB">${subject}</div><div>教員A</div><div><span>101教室</span><span>本館</span></div><div>0000000001</div><div class="taniSu">2.0単位</div></div></td>`;
}

function row(period: number, cells: string[]) {
  return `<tr><td>${period}</td>${cells.join("")}</tr>`;
}

function table(filled: Record<string, string>) {
  const head = `<tr><th></th>${DAYS.map((d) => `<th>${d}曜日</th>`).join("")}</tr>`;
  const rows: string[] = [];
  for (let p = 1; p <= 7; p++) {
    rows.push(row(p, DAYS.map((d) => cell(filled[`${d}${p}`]))));
    if (p === 2) rows.push(`<tr><td></td><td colspan=6>昼休み</td></tr>`);
  }
  return `<table class="table table-bordered classTable">${head}${rows.join("")}</table>`;
}

function html(tables: string[], year = "2026") {
  return `<form id="funcForm"><input name="funcForm:nendo_input" value="${year}">${tables.join("")}</form>`;
}

const parse = (s: string) => parseTimetable(new DOMParser().parseFromString(s, "text/html"));

describe("parseTimetable", () => {
  test("年度と学期数", () => {
    const t = parse(html([table({}), table({}), table({}), table({})]));
    expect(t.year).toBe(2026);
    expect(t.terms.length).toBe(4);
    expect(t.terms.map((x) => x.term)).toEqual([1, 2, 3, 4]);
  });

  test("連続する 2 コマは 2 件、項目が入る", () => {
    const t = parse(html([table({ 月3: "合成科目", 月4: "合成科目" })]));
    const e = t.terms[0]!.entries;
    expect(e.length).toBe(2);
    expect(e[0]).toEqual({
      day: "月", period: 3, subject: "合成科目", teacher: "教員A",
      room: "101教室", campus: "本館", code: "0000000001", credits: 2,
    });
    expect(e[1]!.period).toBe(4);
  });

  test("空セルは除外し、授業なしの学期は空配列", () => {
    const t = parse(html([table({}), table({ 土6: "合成科目" })]));
    expect(t.terms[0]!.entries).toEqual([]);
    expect(t.terms[1]!.entries.length).toBe(1);
  });

  test("昼休みを飛ばして 3 限が period 3", () => {
    const t = parse(html([table({ 火2: "前", 火3: "後" })]));
    expect(t.terms[0]!.entries.map((x) => x.period)).toEqual([2, 3]);
  });

  test("funcForm なし・表なしは ParseError", () => {
    expect(() => parse("<p>x</p>")).toThrow(ParseError);
    expect(() => parse(html([]))).toThrow(ParseError);
  });
});
