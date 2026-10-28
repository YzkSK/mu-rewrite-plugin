import { afterEach, expect, test } from "bun:test";
import { buildSubmission, fetchStatus, htmlToText, readAssignPage, readSubmitForm, submit, textToHtml, type SubmitForm } from "./assign";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("textToHtml: 空行で段落、改行は <br>、文字はエスケープ", () => {
  expect(textToHtml("a\nb\n\nc")).toBe("<p>a<br>b</p><p>c</p>");
  expect(textToHtml("<script>alert(1)</script> & \"x\"")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>");
  expect(textToHtml("  \r\n ")).toBe("");
});

test("htmlToText: <p>/<br> は改行、ほかのタグは外す", () => {
  expect(htmlToText("<p>a<br>b</p><p>c &amp; <b>d</b></p>")).toBe("a\nb\n\nc & d");
  expect(htmlToText("")).toBe("");
});

const form: SubmitForm = {
  action: "/mod/assign/view.php",
  fields: [["lastmodified", "1"], ["id", "55"], ["userid", "9"], ["action", "savesubmission"], ["sesskey", "k"], ["_qf__mod_assign_submission_form", "1"], ["onlinetext_editor[format]", "1"], ["onlinetext_editor[itemid]", "77"]],
  markdown: false,
  text: "<p>old</p>",
  files: null,
  submitName: "submitbutton",
  submitValue: "変更を保存する",
};

test("buildSubmission: hidden 全部・本文・submitbutton", () => {
  const p = buildSubmission(form, "x\n\ny<");
  for (const [k, v] of form.fields) expect(p.get(k)).toBe(v);
  expect(p.get("onlinetext_editor[text]")).toBe("<p>x</p><p>y&lt;</p>");
  expect(p.get("submitbutton")).toBe("変更を保存する");
});

test("buildSubmission: 書き換えていなければ元の HTML のまま送る", () => {
  const rich = { ...form, text: '<p>a <a href="https://x">link</a></p><p>b</p>' };
  expect(buildSubmission(rich, htmlToText(rich.text)).get("onlinetext_editor[text]")).toBe(rich.text);
});

test("buildSubmission: markdown なら本文はそのまま・format は 4", () => {
  const p = buildSubmission(form, "# t\n\n- a<");
  expect(buildSubmission(form, "    code\n\n- a< ", true).get("onlinetext_editor[text]")).toBe("    code\n\n- a< ");
  expect(buildSubmission(form, "x", true).get("onlinetext_editor[format]")).toBe("4");
  expect(p.get("onlinetext_editor[text]")).toBe("<p># t</p><p>- a&lt;</p>");
  // 元が Markdown でもチェックを外せば HTML で送る
  const md = { ...form, markdown: true, fields: [...form.fields.filter(([k]) => k !== "onlinetext_editor[format]"), ["onlinetext_editor[format]", "4"]] as [string, string][], text: "# t" };
  expect(buildSubmission(md, "# t").get("onlinetext_editor[format]")).toBe("1");
  expect(buildSubmission(md, "# t").get("onlinetext_editor[text]")).toBe("<p># t</p>");
});

test("submit: ログイン画面に転送されたら失敗(書きかけを消さない)", async () => {
  reply("https://lms/login/index.php", "<form id='login'></form>");
  await expect(submit(form, "a", false, () => {})).rejects.toThrow("ログインが切れていた");
});

const reply = (url: string, html: string, status = 200, redirected = true) => {
  globalThis.fetch = (async () => ({ ok: status < 400, url, redirected, text: async () => html })) as unknown as typeof fetch;
};

test("submit: 成功は課題ページへ", async () => {
  reply("https://lms/mod/assign/view.php?id=55&action=view", "<div id='region-main'>ok</div>");
  let to = "";
  await submit(form, "a", false, (u) => { to = u; });
  expect(to).toBe("/mod/assign/view.php?id=55");
  reply("https://lms/mod/assign/view.php?id=55&action=grading", "ok");
  await submit(form, "a", false, () => {});
  reply("https://lms/mod/assign/view.php?id=55", "ok");
  await submit(form, "a", false, () => {});
});

test("submit: 課題の画面へ転送されなければ、エラーが無くても失敗", async () => {
  reply("https://lms/mod/assign/view.php", "<div id='region-main'>ok</div>", 200, false);
  await expect(submit(form, "a", false, () => {})).rejects.toThrow("提出できませんでした");
  reply("https://lms/my/", "ok");
  await expect(submit(form, "a", false, () => {})).rejects.toThrow("提出できませんでした");
});

test("submit: 送った中身は POST の urlencoded", async () => {
  let init: RequestInit | undefined;
  globalThis.fetch = (async (_u: unknown, i: RequestInit) => { init = i; return { ok: true, url: "https://lms/mod/assign/view.php?id=55&action=view", redirected: true, text: async () => "" }; }) as unknown as typeof fetch;
  await submit(form, "a", false, () => {});
  expect(init?.method).toBe("POST");
  expect(init?.credentials).toBe("include");
  expect((init?.body as URLSearchParams).get("action")).toBe("savesubmission");
});

test("submit: URL が editsubmission のまま・フォームが残る・HTTP エラーは失敗(理由つき)", async () => {
  reply("https://lms/mod/assign/view.php?id=55&action=editsubmission", "<div class='alert-danger'> 保存できません </div>");
  await expect(submit(form, "a", false, () => {})).rejects.toThrow("保存できません");
  reply("https://lms/mod/assign/view.php", '<form class="mform"><input name="_qf__mod_assign_submission_form" value="1"></form><span class="error">必須です</span>');
  await expect(submit(form, "a", false, () => {})).rejects.toThrow("必須です");
  reply("https://lms/mod/assign/view.php?id=55", "x", 500);
  await expect(submit(form, "a", false, () => {})).rejects.toThrow("提出できませんでした");
});

const PAGE = `<title>2026_5300100047: 中間課題 | MU-LMS</title>
<script>var c={"courseId":42}</script>
<nav class="breadcrumb"><a href="/course/view.php?id=42"> 専門 </a></nav>
<div id="region-main">
  <div data-region="activity-dates"><div>開始: 2026年 09月 24日(木曜日) 17:20</div><div>期限: 2026年 09月 24日(木曜日) 18:30</div></div>
  <div class="activity-description"><p>説明</p><script>x</script></div>
  <table class="submissionstatustable"><tbody>
    <tr><th>提出ステータス</th><td class="submissionstatussubmitted">提出済み</td></tr>
    <tr><th>残り時間</th><td class="earlysubmission">1日</td></tr>
    <tr><th>オンラインテキスト</th><td><div class="no-overflow"><p>本文</p></div></td></tr>
  </tbody></table>
  <form action="/mod/assign/view.php"><input type="hidden" name="id" value="55"><input type="hidden" name="action" value="editsubmission"><button>提出を直す</button></form>
</div>`;

test("readAssignPage: 実機の形", () => {
  document.documentElement.innerHTML = `<head>${PAGE.split("<script>")[0]}</head><body>${PAGE.slice(PAGE.indexOf("<script>"))}</body>`;
  const p = readAssignPage(document, "?id=55");
  expect(p).toMatchObject({ id: 55, courseId: 42, courseName: "専門", title: "中間課題", canSubmit: true });
  expect(p.dates).toEqual([{ label: "開始", value: "2026年 09月 24日(木曜日) 17:20" }, { label: "期限", value: "2026年 09月 24日(木曜日) 18:30" }]);
  expect(p.description).toBe("<p>説明</p>");
  expect(p.rows.map((r) => [r.label, r.cls])).toEqual([["提出ステータス", "submissionstatussubmitted"], ["残り時間", "earlysubmission"], ["オンラインテキスト", ""]]);
  expect(p.rows[2]!.html).toContain("本文");
  expect(readAssignPage(document, "?id=55&action=editsubmission").title).toBe("中間課題");
});

test("readAssignPage: 提出画面の題名は ' - ' 以降を外す・コース名が無ければ null", () => {
  document.documentElement.innerHTML = "<head><title>s: 中間課題 - 提出を編集する | MU-LMS</title></head><body></body>";
  const p = readAssignPage(document, "?id=55&action=editsubmission");
  expect(p).toMatchObject({ title: "中間課題", courseName: null, courseId: null, canSubmit: false, description: null });
});

test("fetchStatus: 提出ステータスと最終更新日時の行だけ返す", async () => {
  reply("https://lms/mod/assign/view.php?id=55", `<table class="submissionstatustable"><tbody>
    <tr><th>提出ステータス</th><td>提出済み</td></tr><tr><th>残り時間</th><td>1日</td></tr><tr><th>最終更新日時</th><td>2026年 09月 24日</td></tr>
  </tbody></table>`, 200, false);
  expect((await fetchStatus(55))!.map((r) => [r.label, r.text])).toEqual([["提出ステータス", "提出済み"], ["最終更新日時", "2026年 09月 24日"]]);
});

test("fetchStatus: ログイン画面・404・通信失敗は null", async () => {
  reply("https://lms/login/index.php", "<form id='login'></form>");
  expect(await fetchStatus(55)).toBeNull();
  reply("https://lms/mod/assign/view.php?id=55", "x", 404);
  expect(await fetchStatus(55)).toBeNull();
  globalThis.fetch = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
  expect(await fetchStatus(55)).toBeNull();
});

test("readSubmitForm: hidden・本文・ファイル欄・ボタン", () => {
  document.documentElement.innerHTML = `<body><form class="mform" action="/mod/assign/view.php" method="post">
    <input type="hidden" name="id" value="55"><input type="hidden" name="sesskey" value="k">
    <input type="hidden" name="onlinetext_editor[itemid]" value="77">
    <textarea name="onlinetext_editor[text]">&lt;p&gt;old&lt;/p&gt;</textarea>
    <input name="files_filemanager" type="hidden" value="88">
    <input type="submit" name="submitbutton" value="変更を保存する"><input type="submit" name="cancel" value="キャンセル"></form>
    <script>M.form_filemanager.init(Y, {"itemid":88,"client_id":"c1","maxbytes":"100","maxfiles":"2","context":{"id":5},"author":"A"});"sesskey":"k"</script></body>`;
  const f = readSubmitForm(document)!;
  expect(f.fields).toEqual([["id", "55"], ["sesskey", "k"], ["onlinetext_editor[itemid]", "77"], ["files_filemanager", "88"]]);
  expect(f).toMatchObject({ action: "/mod/assign/view.php", text: "<p>old</p>", markdown: false, files: { itemid: 88, clientId: "c1" }, submitValue: "変更を保存する" });
  document.body.innerHTML = `<form class="mform"><textarea name="onlinetext_editor[text]"># t</textarea><select name="onlinetext_editor[format]"><option value="1">HTML</option><option value="4" selected>Markdown</option></select></form>`;
  expect(readSubmitForm(document)).toMatchObject({ text: "# t", markdown: true });
  document.body.innerHTML = "";
  expect(readSubmitForm(document)).toBeNull();
});
