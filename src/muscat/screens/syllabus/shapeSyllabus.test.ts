import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { SyllabusDetail, SyllabusDetailRow as R } from "@/muscat/api/types";
import { SyllabusDetailBody } from "./SyllabusDetailView";
import { blank, shapeSyllabus } from "./shapeSyllabus";

const f = (label: string, ...values: string[]): R => ({ kind: "field", label, values });
const s = (title: string): R => ({ kind: "section", title });
const h = (...cells: string[]): R => ({ kind: "head", cells });
const c = (...cells: string[]): R => ({ kind: "cells", cells });
const pick = (n: string, on: boolean) => f(n, on ? "○" : "ー");

const rows: R[] = [
  f("年度", "2026"),
  f("授業コード・授業科目", "5300100033", "画像・音声認識システム"),
  f("担当教員", "教員A、教員B"),
  f("開講期・曜日時限・教室", "2026年度3学期", "火曜2限、火曜3限", "未使用"),
  f("開講キャンパス", "オンライン"),
  f("授業の実施形態", "オンライン（同時双方向型）"),
  f("集中授業", "－"),
  f("開講学科", "2024年度 合成学科 3年"),
  f("他学部・他学科履修許可科目", "－"),
  f("単位数", "2.0単位"),
  f("授業の方法", "講義"),
  f("使用言語", "日本語"),
  f("科目番号(ナンバリング)", "INFO 321"),
  f("授業概要", "ディープラーニングを学ぶ"),
  f("知識・専門性の到達目標", "基礎学力を身につける"),
  f("関心・態度・人格の到達目標", ""),
  f("思考力・判断力の到達目標", "データに基づいて判断できる"),
  f("交感力・発信力の到達目標", "文脈を読み取り発信できる"),
  f("「響学スパイラル」取り組み方法", ""),
  s("授業における「アクティブな知」の要素"),
  h("授業手法", "対象"),
  pick("A：課題解決型学習（PBL）", false),
  pick("B：反転授業", false),
  pick("Ｊ：講義のみ", true),
  f("K：その他", "サンプルコード、実行例", "○"),
  s("授業における「ICTの活用」について"),
  h("活用形態", "対象"),
  pick("A：ノートPC必携", true),
  pick("E：オンラインメディア", false),
  f("G：その他", "", "ー"),
  s("予習（事前学修）"),
  f("各授業", "平均120", "講義資料に記載されたキーワードを調べる", "分"),
  s("復習（事後学修）"),
  f("各授業", "平均90", "講義ノートを復習する", "分"),
  s("成績評価"),
  h("評価項目", "割合", "評価項目の詳細内容"),
  c("課題提出（レポート）", "60%", "クイズ、レポートなど"),
  c("小テスト", "0%", ""),
  c("試験", "0%", ""),
  c("その他", "40%", "出席状況"),
  f("成績評価備考", ""),
  s("授業計画"),
  h("授業回", "内容"),
  f("第1回", "第１章：概要\n準備過程と応用"),
  f("第2回", "単一行の内容"),
  f("留意事項", "毎回予習すること"),
  s("教科書（購入必要）"),
  s("参考図書（任意購入）"),
  h("書名", "著者", "出版社", "ISBN", "備考"),
  c("画像認識", "原田達也", "MLP", "", ""),
  c("自然言語処理ハンドブック", "著者甲", "ケンブリッジ", "", "音声認識の章"),
  c("顔認識の実践", "著者乙", "エイプレス", "", ""),
  c("デジタル画像処理", "著者丙", "CRC", "", ""),
  c("Python コンピュータビジョン", "著者丁", "オライリー", "", ""),
  f("その他（配付教材等により購入不要）1", "毎回資料を配布する"),
  f("その他（配付教材等により購入不要）2", ""),
  s("参考URL"),
  s("1."),
  f("webサイト名", ""),
  f("URL", ""),
  f("参考URLに関する履修学生への連絡事項", ""),
  s("実務経験のある教員等による授業科目(実践的教育を行う授業科目)"),
  h("実践的教育を行う授業科目の種別", "対象"),
  pick("a．実務経験を有する担当教員による実践的な授業科目", false),
  s("担当教員の実務経験(経歴・資格等)"),
  c("テキストを執筆し大学で講義を担当"),
  s("授業内容との関連性"),
  c("テキストマイニングを授業の事例に用いる"),
  pick("b．学外講師による授業科目", false),
  s("学外講師の経歴・資格等"),
  c(""),
  pick("c．連携による授業科目", false),
  s("実習先・実習の目的"),
  c(""),
  f("備考", "教科書は購入不要です"),
];

const detail = (r: R[]): SyllabusDetail => ({ title: "画像・音声認識システム", code: "5300100033", rows: r, noteOn: false, noteRef: "", printRef: "", closeRef: "" });
const shaped = shapeSyllabus(rows);

test("見出しの meta と基本情報", () => {
  expect(shaped.meta).toEqual({ term: "2026年度3学期", slots: "火2・火3", credit: "2.0単位", campus: "オンライン" });
  const labels = shaped.basic.items.map((i) => i.label);
  expect(labels).toContain("開講期・時限");
  expect(labels).toContain("教室");
  expect(labels).toContain("実施形態");
  expect(labels).toContain("科目番号");
  expect(labels).not.toContain("授業コード・授業科目");
  expect(shaped.basic.omitted).toEqual(["集中授業", "他学部・他学科履修許可科目"]);
});

test("概要と到達目標: 空の目標は省いて数える", () => {
  expect(shaped.goal.summary).toBe("ディープラーニングを学ぶ");
  expect(shaped.goal.goals.map((g) => g.label)).toEqual(["知識・専門性", "思考力・判断力", "交感力・発信力"]);
  expect(shaped.goal.omitted).toBe(1);
});

test("授業の進め方: チェックリストと予習・復習", () => {
  const [active, ict] = shaped.way.checks;
  expect(active!.title).toBe("「アクティブな知」の要素");
  expect(active!.picked).toEqual([{ label: "Ｊ：講義のみ", note: "" }, { label: "K：その他", note: "サンプルコード、実行例" }]);
  expect(active!.notPicked).toHaveLength(2);
  expect(ict!.title).toBe("ICTの活用");
  expect(ict!.notPicked).toEqual(["E：オンラインメディア", "G：その他"]);
  expect(shaped.way.study.map((t) => [t.label, t.minutes])).toEqual([["予習", 120], ["復習", 90]]);
});

test("成績評価は割合の大きい順、0% は別にまとめる", () => {
  expect(shaped.grade.items.map((e) => [e.name, e.percent])).toEqual([["課題提出（レポート）", 60], ["その他", 40]]);
  expect(shaped.grade.zero.map((e) => e.name)).toEqual(["小テスト", "試験"]);
  const html = renderToString(createElement(SyllabusDetailBody, { detail: detail(rows) }));
  expect(html).toContain("課題提出（レポート） 60%、その他 40%");
});

test("授業計画: 改行で見出しと本文に分ける", () => {
  expect(shaped.plan.lessons).toEqual([
    { n: 1, heading: "第１章：概要", body: "準備過程と応用" },
    { n: 2, heading: "", body: "単一行の内容" },
  ]);
  expect(shaped.plan.caution).toBe("毎回予習すること");
});

test("授業計画: 1 行でも「第n章：見出し 本文」なら最初の空白で分ける(実機の形)", () => {
  const plan: R[] = [
    { kind: "section", title: "授業計画" },
    { kind: "field", label: "第1回", values: ["第１章：画像処理と画像認識の概要 画像認識のために準備過程として"] },
    { kind: "field", label: "第2回", values: ["イントロダクション"] },
  ];
  expect(shapeSyllabus(plan).plan.lessons).toEqual([
    { n: 1, heading: "第１章：画像処理と画像認識の概要", body: "画像認識のために準備過程として" },
    { n: 2, heading: "", body: "イントロダクション" },
  ]);
});

test("教科書・参考: 書名の行が無ければ購入不要、参考URL が全部空なら出さない", () => {
  expect(shaped.books.hasTextbookHead).toBe(true);
  expect(shaped.books.textbooks).toEqual([]);
  expect(shaped.books.refs).toHaveLength(5);
  expect(shaped.books.refs[1]).toEqual({ title: "自然言語処理ハンドブック", by: ["著者甲", "ケンブリッジ"], remark: "音声認識の章" });
  expect(shaped.books.notes).toEqual(["毎回資料を配布する"]);
  expect(shaped.books.urls).toEqual([]);
});

test("実務経験: 文が 2 つ、種別はいずれも対象外、備考は汎用", () => {
  expect(shaped.work.texts.map((t) => t.text)).toEqual(["テキストを執筆し大学で講義を担当", "テキストマイニングを授業の事例に用いる"]);
  expect(shaped.work.kinds.every((k) => !k.on)).toBe(true);
  expect(shaped.rest[6]).toEqual([f("備考", "教科書は購入不要です")]);
  expect(renderToString(createElement(SyllabusDetailBody, { detail: detail(rows) }))).toContain("いずれも対象外");
});

test("中身の無い節は薄くする(has)", () => {
  expect(shaped.has).toEqual([true, true, true, true, true, true, true]);
  expect(shapeSyllabus([f("担当教員", "教員A")]).has).toEqual([true, false, false, false, false, false, false]);
});

/** 出力に入っているべき文字: 「－」「ー」「○」と見出しラベルを除く、空でない値・セル */
function expected(rs: R[]): string[] {
  const out: string[] = [];
  const skip = new Set(["授業コード・授業科目"]);
  for (const r of rs) {
    if (r.kind === "field" && skip.has(r.label)) continue;
    const vs = r.kind === "field" ? r.values : r.kind === "cells" ? r.cells : [];
    for (const v of vs) {
      if (blank(v) || v.trim() === "○") continue;
      // 「平均120」は「平均」と数字を別の要素に出す
      const m = /^平均(\d+)$/.exec(v);
      if (m) out.push("平均", m[1]!);
      else out.push(...v.split("\n").map((l) => l.trim()).filter(Boolean));
    }
  }
  return out;
}

const unknown: R[] = [s("見たことのない節"), f("見たことのない項目", "未知の値"), c("未知のセル甲", "未知のセル乙")];

for (const order of ["site", "drawer"] as const) {
  test(`取りこぼしが無い(${order})`, () => {
    const html = renderToString(createElement(SyllabusDetailBody, { detail: detail([...rows, ...unknown]), order, toc: order === "site" }));
    for (const t of expected([...rows, ...unknown])) expect(html).toContain(t);
  });
}

test("当てはまらない行は rest として最後に描く", () => {
  const sh = shapeSyllabus([...rows, ...unknown]);
  expect(sh.rest[6]).toContainEqual(f("見たことのない項目", "未知の値"));
  const html = renderToString(createElement(SyllabusDetailBody, { detail: detail([...rows, ...unknown]) }));
  expect(html.indexOf("未知の値")).toBeGreaterThan(html.indexOf("いずれも対象外"));
});

test("引き出しの順: 基本情報 → 成績評価 → 教科書・参考 → 授業計画 → 進め方 → 概要 → 実務経験、目次なし", () => {
  const html = renderToString(createElement(SyllabusDetailBody, { detail: detail(rows), order: "drawer", toc: false }));
  expect(html).not.toContain('aria-label="目次"');
  const at = ["基本情報", "成績評価", "教科書・参考", "授業計画", "授業の進め方", "概要と到達目標", "実務経験"].map((t) => html.indexOf(`>${t}<`));
  expect(at.every((n) => n > 0)).toBe(true);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
});
