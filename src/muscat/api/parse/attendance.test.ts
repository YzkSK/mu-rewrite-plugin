import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import { parseAttendance } from "./attendance";

const cell = (cls: string, mark: string, date: string) =>
  `<td class="colSizeFixed"><span class="${cls} jugyoList"><span class="syuketsuKbnMark">${mark}</span></span><p class="jugyoDate">${date}</p></td>`;
const head = `<tr><th>曜日時限</th><th>授業科目</th><th>出席率</th><th>1回</th><th>2回</th></tr>`;
const row = (subject: string, rate: string, sessions: string) =>
  `<tr><td><span title="火2 火3">火2 火3</span></td><td>${subject}</td><td>${rate}</td>${sessions}</tr>`;

const page = (rows: string, key = "2026|03") =>
  `<form id="funcForm"><select name="funcForm:kaikoNendoGakki_input">
    <option value="2026|02">2026年度 2学期</option><option value="${key}" selected>2026年度 3学期</option></select>
    <input name="funcForm:baseDate1:baseDate1_input" value="2026/10/24">
    <table id="funcForm:jugyoKaisuTbl">${head}${rows}</table></form>`;
const parse = (html: string) => parseAttendance(new DOMParser().parseFromString(html, "text/html"));

// 実機の確認: まだ実施されていない回は、記号が空の span.jugyoList(クラスは jugyoList だけ)を持ち、日付は入っている
test("記号が空の回は、span があっても「未実施」", () => {
  const empty = `<td class="colSizeFixed"><span class="jugyoList"><span class="syuketsuKbnMark"></span></span><p class="jugyoDate">11/10</p></td>`;
  const a = parse(page(row(`5300100033<span class="ml-2">合成演習</span>（教員A）`, "", empty + `<td class="colSizeFixed"><span class="jugyoList"></span></td>`)));
  expect(a.courses[0]!.sessions).toEqual([
    { kind: "none", label: "", date: "11/10" },
    { kind: "none", label: "", date: "" },
  ]);
});

test("出席・欠席・遅刻・その他・未実施と出席率", () => {
  const a = parse(
    page(
      row(
        `5300100033<span class="ml-2">合成演習</span>（教員A）`,
        "50.0％",
        cell("attendance", "出", "10/06") + cell("absence", "欠", "10/13") + cell("earlyLate", "遅", "10/20") + cell("official", "公", "10/27") + `<td class="colSizeFixed"><p class="jugyoDate">11/03</p></td><td class="colSizeFixed"></td>`,
      ),
    ),
  );
  expect(a.termKey).toBe("2026|03");
  expect(a.baseDate).toBe("2026/10/24");
  expect(a.terms).toEqual([
    { key: "2026|02", label: "2026年度 2学期" },
    { key: "2026|03", label: "2026年度 3学期" },
  ]);
  const c = a.courses[0]!;
  expect(c).toMatchObject({ when: "火2 火3", code: "5300100033", subject: "合成演習", teacher: "教員A", rate: 50 });
  expect(c.sessions).toEqual([
    { kind: "present", label: "出", date: "10/06" },
    { kind: "absent", label: "欠", date: "10/13" },
    { kind: "late", label: "遅", date: "10/20" },
    { kind: "other", label: "公", date: "10/27" },
    { kind: "none", label: "", date: "11/03" },
    { kind: "none", label: "", date: "" },
  ]);
});

test("出席率 0.0％ は 0、空は null、教員が無い科目は teacher が空", () => {
  const a = parse(
    page(
      row(`5300100001<span class="ml-2">科目X</span>`, "0.0％", "") + row(`5300100002<span class="ml-2">科目Y</span>（教員B）`, "", ""),
    ),
  );
  expect(a.courses[0]).toMatchObject({ rate: 0, teacher: "" });
  expect(a.courses[1]!.rate).toBeNull();
});

test("授業 0 件", () => {
  expect(parse(page("")).courses).toEqual([]);
});

test("funcForm / select / 表が無ければ ParseError", () => {
  expect(() => parse("<p>x</p>")).toThrow(ParseError);
  expect(() => parse(`<form id="funcForm"><table>${head}</table></form>`)).toThrow(ParseError);
  expect(() => parse(`<form id="funcForm"><select name="funcForm:kaikoNendoGakki_input"></select></form>`)).toThrow(ParseError);
});
