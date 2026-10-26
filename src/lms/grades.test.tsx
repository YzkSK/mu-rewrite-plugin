import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { GradesScreen } from "./GradesScreen";
import { readGradeDetail, readGradeList } from "./grades";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

const overview = parse(`<table id="overview-grade" class="flexible table generaltable"><thead><tr><th>コース名</th><th>評点</th></tr></thead><tbody>
<tr><td><a href="https://lms/grade/report/user/index.php?id=7">333 専門デプロイメントコースⅢ</a></td><td>85.00</td></tr>
<tr><td><a href="https://lms/course/view.php?id=8">399 英語基礎C</a></td><td class="c1">-</td></tr></tbody></table>`);

const user = parse(`<table class="user-grade"><thead><tr><th>評定項目</th><th>評点</th><th>パーセンテージ</th><th>フィードバック</th><th>コース合計への寄与</th></tr></thead><tbody>
<tr><th class="level1 column-itemname" colspan="5">333 専門デプロイメントコースⅢ</th></tr>
<tr><th class="level2 column-itemname"><span>課題</span>第1回課題</th><td>90.00 <a>操作</a> 評定分析</td><td>90.00 %</td><td>よくできました</td><td>0.00 %</td></tr>
<tr><th class="level2 column-itemname">小テスト第2回テスト</th><td>-</td><td>-</td><td></td><td>0.00 %</td></tr>
<tr><th class="level1 column-itemname">コース合計</th><td>85.00</td><td>85.00 %</td><td></td><td></td></tr></tbody></table>`);

test("成績の一覧: id は成績ページか course の href から、評点は 2 列目", () => {
  expect(readGradeList(overview)).toEqual([{ id: 7, name: "専門デプロイメントコースⅢ", grade: "85.00" }, { id: 8, name: "英語基礎C", grade: "-" }]);
});

test("コースの評定: 種類を外す・評点は空白の前・合計を別に・全部 0 の列は出さない", () => {
  const d = readGradeDetail(user);
  expect(d.items.map((i) => [i.kind, i.name, i.grade, i.percent, i.feedback])).toEqual([
    ["課題", "第1回課題", "90.00", "90.00 %", "よくできました"],
    ["小テスト", "第2回テスト", "-", "-", ""],
  ]);
  expect(d.total).toMatchObject({ grade: "85.00", percent: "85.00 %" });
  expect([d.showPercent, d.showContrib]).toEqual([true, false]);
});

test("画面: 評定のあるコースだけ最初に出し、右に表(寄与の列は無い)", () => {
  const h = renderToString(<GradesScreen list={readGradeList(overview)} id={7} detail={readGradeDetail(user)} />);
  for (const t of ["評定のあるコースだけ", "専門デプロイメントコースⅢ", "第1回課題", "よくできました", "コース合計", "フィードバック", "パーセンテージ"]) expect(h).toContain(t);
  expect(h).not.toContain("英語基礎C");
  expect(h).not.toContain("コース合計への寄与");
});

test("画面: 全部「-」なら全部出す", () => {
  const h = renderToString(<GradesScreen list={[{ id: 8, name: "英語基礎C", grade: "-" }]} id={null} detail={{ items: [], total: null, showPercent: false, showContrib: false }} />);
  expect(h).toContain("英語基礎C");
});
