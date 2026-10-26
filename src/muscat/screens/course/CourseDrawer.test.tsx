import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { CourseDetail } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { CourseDrawer, SyllabusPane } from "./CourseDrawer";
import type { CourseState } from "./useCourse";

const detail: CourseDetail = {
  title: "合成演習",
  code: "5300100033",
  slots: [{ weekday: "月", period: 3 }, { weekday: "月", period: 4 }],
  teachers: ["教員A", "教員B"],
  room: "テスト棟101",
  attendance: {
    when: "月3 月4",
    code: "5300100033",
    subject: "合成演習",
    teacher: "教員A",
    rate: 66.7,
    sessions: [
      { kind: "present", label: "出", date: "10/06" },
      { kind: "absent", label: "欠", date: "10/13" },
      { kind: "late", label: "遅", date: "10/20" },
      { kind: "none", label: "", date: "10/27" },
    ],
  },
  notices: [{ date: "2026/10/20", title: "休講のお知らせ" }],
  memo: "持ち物",
};
const render = (initial: CourseState, key = { title: "合成演習" }) =>
  renderToString(<CourseDrawer client={fakeClient()} course={key} onClose={() => {}} onNav={() => {}} initial={initial} />);
const ready = (over: Partial<CourseDetail> = {}): CourseState => ({ status: "ready", course: { ...detail, ...over } });

test("dialog、授業名、コード、時限・教室・教員", () => {
  const html = render(ready());
  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain('aria-label="合成演習"');
  for (const s of ["5300100033", "月 3・4限", "テスト棟101", "教員A、教員B"]) expect(html).toContain(s);
});

test("出席: 率・回数・印と日付。欠席だけ赤地", () => {
  const html = render(ready());
  for (const s of ["66.7%", "3 回中 欠席 1", "10/06", "10/13", "10/27", "border-[#ECE9EF]"]) expect(html).toContain(s);
  expect(html).not.toContain("−");
  expect(html.match(/bg-error/g)).toHaveLength(1);
});

test("出席が見つからない", () => {
  expect(render(ready({ attendance: null }))).toContain("出席の記録はありません");
});

test("掲示とメモと下のボタン。掲示が無ければ節ごと出さず、メモが無ければメモの節も出さない", () => {
  const html = render(ready());
  for (const s of ["この授業の掲示", "休講のお知らせ", "2026/10/20", "持ち物", "メモを保存", "シラバスを開く", "成績を見る", "‹ 戻る"]) expect(html).toContain(s);
  const none = render(ready({ notices: [], memo: null }));
  expect(none).not.toContain("この授業の掲示");
  expect(none).not.toContain("メモを保存");
});

test("シラバス表示: 戻るボタンと詳細。ふせん・印刷・✕ は出さない", () => {
  const d = { title: "合成演習", code: "5300100033", rows: [{ kind: "field" as const, label: "担当教員", values: ["教員A"] }], noteOn: false, noteRef: "", printRef: "", closeRef: "" };
  const html = renderToString(<SyllabusPane state={{ status: "ready", detail: d }} onBack={() => {}} onRetry={() => {}} />);
  for (const s of ["‹ 授業に戻る", "担当教員", "教員A"]) expect(html).toContain(s);
  for (const s of ["ふせん", "印刷", "閉じる"]) expect(html).not.toContain(s);
});

test("読み込み中・エラー(もう一度読み込む)", () => {
  expect(render({ status: "loading" })).toContain("読み込んでいます");
  const html = render({ status: "error", error: "MUSCAT が応答しません" });
  expect(html).toContain("応答しません");
  expect(html).toContain("もう一度読み込む");
});
