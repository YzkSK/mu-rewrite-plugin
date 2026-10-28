import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { AssignPage, SubmitForm } from "./assign";
import { AssignScreen } from "./AssignScreen";
import { SubmitScreen } from "./SubmitScreen";

const page: AssignPage = {
  id: 55, courseId: 42, courseName: "専門", title: "中間課題",
  dates: [{ label: "開始", value: "9月24日" }, { label: "期限", value: "9月24日 18:30" }],
  description: "<p>説明文</p>",
  rows: [
    { label: "提出ステータス", html: "提出済み", text: "提出済み", cls: "submissionstatussubmitted" },
    { label: "評定ステータス", html: "評定なし", text: "評定なし", cls: "" },
    { label: "残り時間", html: "1日", text: "1日", cls: "earlysubmission" },
    { label: "最終更新日時", html: "今日", text: "今日", cls: "" },
    { label: "オンラインテキスト", html: "<p>私の本文</p>", text: "私の本文", cls: "" },
  ],
  canSubmit: true,
  needsFinal: false,
};

test("下書きのままなら「提出を確定する」と注意", () => {
  const h = renderToString(<AssignScreen page={{ ...page, needsFinal: true }} />);
  expect(h).toContain("まだ下書きです");
  expect(h).toContain('href="/mod/assign/view.php?id=55&amp;action=submit"');
});

test("課題ページ: コースへのリンク・3 区画・提出を直す・提出したもの・詳しい状態", () => {
  const h = renderToString(<AssignScreen page={page} />);
  for (const t of ["‹ 専門", 'href="/course/view.php?id=42"', "中間課題", "9月24日 18:30", "1日", "提出済み", "評定なし", "提出を直す", 'href="/mod/assign/view.php?id=55&amp;action=editsubmission"', "説明文", "私の本文", "詳しい状態", "最終更新日時"]) expect(h).toContain(t);
  expect(h).not.toContain("まだ提出されていません");
});

test("課題ページ: 未提出なら「提出する」と「まだ提出されていません」", () => {
  const h = renderToString(<AssignScreen page={{ ...page, rows: [{ label: "提出ステータス", html: "未提出", text: "未提出", cls: "submissionstatusnew" }] }} />);
  expect(h).toContain("提出する");
  expect(h).toContain("まだ提出されていません");
});

const form: SubmitForm = { action: "/mod/assign/view.php", fields: [], markdown: false, text: "<p>a</p><p>b</p>", files: { itemid: 88, clientId: "c1", ctxId: 5, author: "A", maxbytes: 52428800, maxfiles: 20, license: "allrightsreserved", repoId: 3, sesskey: "k" }, submitName: "submitbutton", submitValue: "x" };

test("提出画面: 題名・字数・ファイル欄・上限・選ぶボタン・やめる", () => {
  const h = renderToString(<SubmitScreen page={page} form={form} />);
  for (const t of ["中間課題を提出", "2 字", "ファイル", "ファイルを選ぶ", "1 つ 50 MB まで・20 個まで", "押すまで先生には見えません","提出する", "やめる", 'href="/mod/assign/view.php?id=55"', "提出を確定する"]) expect(h).toContain(t);
  expect(h).not.toContain("元の画面");
  expect(renderToString(<SubmitScreen page={page} form={{ ...form, files: null }} />)).not.toContain("ファイルを選ぶ");
});
