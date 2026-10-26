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

  describe("学期の fieldset の形", () => {
    const jugyo = `<div class="jugyo-info"><div class="fontB">データサイエンス特論</div><div>岩田 洋夫</div><div><span>有明５－４０１</span>／<span>有明キャンパス</span></div><div>5300100019</div><div class="taniSu">2.0単位</div><div class="sign signClass">複数回</div><div><button>シラバス</button></div></div>`;
    const irregularRow = `<tr role="row"><td role="gridcell" class="adjustNeighborBtn">0010010203 仏教(自己を見つめる) [1/2] <div class="sign signClass">複数学期</div> <div class="sign signClass">オンライン</div> <span class="colInnerIcon"><button>シラバス照会画面を表示します。</button></span></td><td>佐竹 真城</td><td>未使用</td><td>オンライン</td><td>2.0</td></tr>`;
    const emptyRow = `<tr class="ui-datatable-empty-message"><td colspan="5">対象データがありません。</td></tr>`;
    const set = (n: number, rows: string, total = "10.0") => {
      const head = `<tr><th></th>${DAYS.map((d) => `<th>${d}曜日</th>`).join("")}</tr>`;
      const body = `<tr><td>7</td>${DAYS.map((d) => `<td class="colYobi">${d === "月" ? jugyo : ""}</td>`).join("")}</tr>`;
      return `<div class="ui-fieldset-content"><table class="classTable">${head}${body}</table><div class="alignRight">${n}学期合計単位 ${total}</div><div class="ui-datatable"><table><tbody>${rows}</tbody></table></div></div>`;
    };
    const gpa = `<div class="ui-datatable"><table><tbody><tr><td>0010010999 GPA の行</td><td>a</td><td>b</td><td>c</td><td>3.0</td></tr></tbody></table></div>`;
    const t = parse(html([set(1, emptyRow, "9.0"), set(2, irregularRow), gpa]));

    test("7 限の授業が読める", () => {
      expect(t.terms[1]!.entries[0]).toMatchObject({ day: "月", period: 7, subject: "データサイエンス特論", code: "5300100019", credits: 2 });
    });

    test("学期ごとの合計単位", () => {
      expect(t.terms.map((x) => x.credits)).toEqual([9, 10]);
    });

    test("不定期開講の行が読める", () => {
      expect(t.terms[1]!.irregular).toEqual([
        { code: "0010010203", subject: "仏教(自己を見つめる) [1/2]", teacher: "佐竹 真城", room: "オンライン", campus: "オンライン", credits: 2 },
      ]);
    });

    test("空行は無視し、fieldset の外の .ui-datatable は拾わない", () => {
      expect(t.terms.length).toBe(2);
      expect(t.terms[0]!.irregular).toEqual([]);
      expect(t.terms[1]!.irregular.length).toBe(1);
    });

    test("fieldset が無い古い形は credits が null・irregular が空", () => {
      const old = parse(html([table({})]));
      expect(old.terms[0]).toMatchObject({ credits: null, irregular: [] });
    });
  });

  test("funcForm なし・表なしは ParseError", () => {
    expect(() => parse("<p>x</p>")).toThrow(ParseError);
    expect(() => parse(html([]))).toThrow(ParseError);
  });
});

test("教室は半角にそろえ、「未使用」はキャンパスで代える", () => {
  const td = (room: string, campus: string) =>
    `<td><div class="jugyo-info"><div class="fontB">科目</div><div>教員</div><div><span>${room}</span>／<span>${campus}</span></div><div>0000000001</div></div></td>`;
  const tbl = (c: string) =>
    `<table class="table table-bordered classTable"><tr><th></th><th>月曜日</th><th>火曜日</th></tr><tr><td>1</td>${c}<td></td></tr></table>`;
  const t = parseTimetable(new DOMParser().parseFromString(`<form id="funcForm"><input name="funcForm:nendo_input" value="2026">${tbl(td("有明５－４０１", "有明キャンパス"))}${tbl(td("未使用", "オンライン"))}</form>`, "text/html"));
  expect(t.terms[0]!.entries[0]!.room).toBe("有明5-401");
  expect(t.terms[1]!.entries[0]!.room).toBe("オンライン");
});
