import { expect, test } from "bun:test";
import { readQuestionnairePage } from "./questionnaire";

const HEAD = `<head><title>専門: 第2回 復習プレゼンの評価 | MU-LMS</title><script>M.cfg={"courseId":42}</script></head>`;

test("readQuestionnairePage: 未回答", () => {
  document.documentElement.innerHTML = `${HEAD}<body>
<nav class="breadcrumb"><a href="/course/view.php?id=42">専門</a></nav>
<div class="activity-header"><div class="activity-description" id="intro"><div class="no-overflow"><p>説明です</p></div></div></div>
<div role="main"><div class="mod_questionnaire_viewpage"><h2></h2>
<div class="mod_questionnaire_flex-container"><div class="complete"><a href="/mod/questionnaire/complete.php?id=7" class="btn btn-primary">アンケートに回答する ...</a></div></div>
<div class="info"><p>許可された試行回数: 1</p></div></div></div></body>`;
  expect(readQuestionnairePage(document, "?id=7")).toMatchObject({
    id: 7, courseId: 42, courseName: "専門", title: "第2回 復習プレゼンの評価", intro: "<p>説明です</p>",
    dates: [], messages: [], answered: false, closed: false, attempts: 1,
    actions: [{ label: "アンケートに回答する ...", url: "/mod/questionnaire/complete.php?id=7" }],
  });
});

test("readQuestionnairePage: 回答済み", () => {
  document.documentElement.innerHTML = `${HEAD}<body>
<div class="activity-header"><div data-region="activity-dates"><div><strong>開始済み:</strong> 2026年 09月 22日(火曜日) 13:38</div><div><strong>終了済み:</strong> 2026年 09月 22日(火曜日) 14:38</div></div></div>
<div role="main"><div class="mod_questionnaire_viewpage">
<div class="info"><p>アンケートは 2026年 09月 22日 に終了しました。ありがとうございます。</p></div>
<div><a href="/mod/questionnaire/myreport.php?id=7" class="btn btn-secondary">あなたの回答を表示する</a><a href="/mod/questionnaire/view.php?id=7#" class="btn btn-secondary">すべてリセット</a></div></div></div></body>`;
  const p = readQuestionnairePage(document, "?id=7");
  expect(p.intro).toBeNull();
  expect(p.dates).toEqual([{ label: "開始済み", value: "2026年 09月 22日(火曜日) 13:38" }, { label: "終了済み", value: "2026年 09月 22日(火曜日) 14:38" }]);
  expect(p.messages).toEqual(["アンケートは 2026年 09月 22日 に終了しました。ありがとうございます。"]);
  expect([p.answered, p.closed, p.attempts]).toEqual([true, true, null]);
  expect(p.actions).toEqual([{ label: "あなたの回答を表示する", url: "/mod/questionnaire/myreport.php?id=7" }]);
});
