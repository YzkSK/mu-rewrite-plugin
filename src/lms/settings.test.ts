import { afterEach, expect, test } from "bun:test";
import { enabledValue, readEditForm, readForumForm, readNotify, saveForm, splitNotify, tabOf, textToDescription } from "./settings";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

const EDIT = parse(`<html><body><form class="mform" action="https://x/user/edit.php" method="post">
<input type="hidden" name="sesskey" value="sk"><input type="hidden" name="_qf__user_edit_form" value="1">
<input name="lastname" value="佐藤"><input name="firstname" value="康樹"><input name="email" value="a@x.jp">
<select name="maildisplay"><option value="0">隠す</option><option value="1" selected>全員に表示</option></select>
<select name="country"><option value="">選択</option><option value="JP" selected>日本</option></select>
<select name="timezone"><option value="99">サーバのタイムゾーン</option><option value="Asia/Tokyo" selected>Asia/Tokyo</option></select>
<textarea name="description_editor[text]">&lt;p&gt;こんにちは&lt;br&gt;&lt;b&gt;よろしく&lt;/b&gt;&lt;/p&gt;</textarea>
<input type="hidden" name="description_editor[format]" value="1"><input type="hidden" name="imagefile" value="298">
<input name="firstnamephonetic" value="コウキ"><input name="lastnamephonetic" value="サトウ">
<input name="city" value="東京"><input name="phone1" value="">
<input type="submit" name="submitbutton" value="変更を保存"><input type="submit" name="cancel" value="キャンセル">
</form>
<script>M.form_filemanager.init(Y, {"itemid":111,"client_id":"c","maxbytes":"52428800","maxfiles":1,"target":"id_description_editor","context":{"id":1}});
M.form_filemanager.init(Y, {"path":[],"itemid":298,"list":[],"maxbytes":"52428800","maxfiles":1,"client_id":"c2","target":"id_imagefile","context":{"id":5,"x":1},"author":"A"});
var s={"sesskey":"sk"};</script></body></html>`);

test("readEditForm: 読むだけの欄・選択肢・自己紹介のテキスト化・任意欄・画像の欄", () => {
  const e = readEditForm(EDIT)!;
  expect(e.info).toEqual([
    { label: "名前", value: "佐藤 康樹" }, { label: "ヨミガナ", value: "サトウ コウキ" },
    { label: "メールアドレス", value: "a@x.jp" }, { label: "国", value: "日本" },
  ]);
  expect(e.maildisplay).toEqual({ name: "maildisplay", value: "1", options: [{ value: "0", label: "隠す" }, { value: "1", label: "全員に表示" }] });
  expect(e.timezone?.value).toBe("Asia/Tokyo");
  expect(e.about).toBe("こんにちは\n よろしく".replace("\n ", "\n"));
  expect(e.others).toEqual([{ name: "city", label: "都道府県", value: "東京" }, { name: "phone1", label: "電話", value: "" }]);
  expect(e.image.area?.itemid).toBe(298);
  expect(e.image.area?.clientId).toBe("c2");
  expect(readEditForm(parse("<form class='mform'></form>"))).toBeNull();
});

test("textToDescription: エスケープして改行は <br>", () => {
  expect(textToDescription("a<b>\r\n\nc")).toBe("a&lt;b&gt;<br><br>c");
});

test("readForumForm: maildigest と autosubscribe", () => {
  const f = readForumForm(parse(`<form class="mform"><select name="maildigest"><option value="0" selected>なし</option><option value="1">完全</option></select>
  <select name="autosubscribe"><option value="1" selected>はい</option><option value="0">いいえ</option></select><select name="trackforums"><option value="0">x</option></select></form>`))!;
  expect(f.maildigest?.value).toBe("0");
  expect(f.autosubscribe?.options.map((o) => o.label)).toEqual(["はい", "いいえ"]);
});

const NOTIFY = parse(`<table class="table preference-table"><thead><tr><th scope="col"><span>プレファレンス</span></th><th data-processor-name="stream">アクティビティストリーム</th><th data-processor-name="email">メール</th></tr></thead><tbody>
<tr><th colspan="3">課題</th></tr>
<tr data-preference-key="message_provider_mod_assign_assign_notification"><th class="preference-name">課題通知</th>
<td data-processor-name="stream"><form><input type="checkbox" name="a_stream"></form></td><td data-processor-name="email"><form><input type="checkbox" name="a_email" checked></form></td></tr>
<tr><th colspan="3">フォーラム</th></tr>
<tr data-preference-key="message_provider_mod_forum_posts"><th class="preference-name">購読済みフォーラム投稿</th>
<td data-processor-name="stream"><form><input type="checkbox" checked></form></td><td data-processor-name="email"><div class="dimmed_text">ロック</div></td></tr>
<tr><th colspan="3">システム</th></tr>
<tr data-preference-key="message_provider_moodle_instantmessage"><th class="preference-name">ユーザ間のパーソナルメッセージ</th><td data-processor-name="stream"><input type="checkbox"></td><td data-processor-name="email"><input type="checkbox"></td></tr>
<tr data-preference-key="message_provider_moodle_errors"><th class="preference-name">サイトエラー</th><td data-processor-name="stream"><input type="checkbox"></td><td data-processor-name="email"><input type="checkbox"></td></tr>
<tr><th colspan="3">ワークショップ</th></tr>
<tr data-preference-key="message_provider_mod_workshop_x"><th class="preference-name">ワークショップ通知</th><td data-processor-name="stream"><input type="checkbox"></td><td data-processor-name="email"><input type="checkbox"></td></tr>
</tbody></table><input id="disable-notifications" type="checkbox" checked>`);

test("readNotify: 見出し・行・オン/ロック・すべて止める", () => {
  const n = readNotify(NOTIFY);
  expect(n.processors).toEqual(["stream", "email"]);
  expect(n.stopAll).toBe(true);
  expect(n.groups.map((g) => [g.name, g.rows.length])).toEqual([["課題", 1], ["フォーラム", 1], ["システム", 2], ["ワークショップ", 1]]);
  expect(n.groups[0]!.rows[0]).toEqual({
    key: "message_provider_mod_assign_assign_notification", name: "課題通知",
    cells: [{ name: "stream", on: false, locked: false }, { name: "email", on: true, locked: false }],
  });
  expect(n.groups[1]!.rows[0]!.cells[1]).toEqual({ name: "email", on: false, locked: true });
});

test("splitNotify: 学生に関係するものだけ上、システムは行名で選ぶ", () => {
  const { shown, hidden } = splitNotify(readNotify(NOTIFY).groups);
  expect(shown.map((g) => [g.name, g.rows.map((r) => r.name)])).toEqual([["課題", ["課題通知"]], ["フォーラム", ["購読済みフォーラム投稿"]], ["システム", ["ユーザ間のパーソナルメッセージ"]]]);
  expect(hidden.map((g) => [g.name, g.rows.map((r) => r.name)])).toEqual([["システム", ["サイトエラー"]], ["ワークショップ", ["ワークショップ通知"]]]);
});

test("enabledValue: ロックと無効は含めない・全部オフは none", () => {
  const row = readNotify(NOTIFY).groups[0]!.rows[0]!;
  expect(enabledValue(row.cells)).toBe("email");
  expect(enabledValue(row.cells.map((c) => ({ ...c, on: false })))).toBe("none");
  expect(enabledValue([{ name: "stream", on: true, locked: false }, { name: "email", on: true, locked: false }])).toBe("stream,email");
});

test("tabOf", () => {
  expect(["/user/edit.php", "/user/preferences.php", "/user/forum.php", "/message/edit.php", "/message/notificationpreferences.php", "/user/files.php"].map(tabOf))
    .toEqual(["profile", "profile", "prefs", "prefs", "notify", "files"]);
});

test("saveForm: FormData に上書きと submitbutton を足して POST。エラー文は例外", async () => {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (u: URL, init: RequestInit) => {
    calls.push({ url: String(u), body: String(init.body) });
    const r = Response.json({});
    Object.defineProperty(r, "redirected", { value: true });
    Object.defineProperty(r, "url", { value: "https://x/user/preferences.php" });
    return r;
  }) as unknown as typeof fetch;
  await saveForm(EDIT.querySelector("form")!, { maildisplay: "0" });
  expect(calls[0]!.url).toBe("https://x/user/edit.php");
  const p = new URLSearchParams(calls[0]!.body);
  expect([p.get("maildisplay"), p.get("submitbutton"), p.get("sesskey"), p.get("cancel")]).toEqual(["0", "変更を保存", "sk", null]);
  globalThis.fetch = (async () => {
    const r = new Response(`<div class="invalid-feedback">メールアドレスが不正です</div><div class="invalid-feedback"></div>`);
    Object.defineProperty(r, "url", { value: "https://x/user/edit.php" });
    return r;
  }) as unknown as typeof fetch;
  await expect(saveForm(EDIT.querySelector("form")!)).rejects.toThrow("メールアドレスが不正です");
});
