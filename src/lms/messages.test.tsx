import { afterEach, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { setSesskey } from "./api";
import { MessagesScreen } from "./MessagesScreen";
import { loadConversations, loadNotices, loadThread, sendMessage, toConversation, toNotice } from "./messages";

const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });

/** メソッド名ごとの応答(data か、エラー)を返す fetch。呼ばれた (メソッド名, args) は calls に残る */
function mock(h: Record<string, unknown>) {
  const calls: { m: string; args: unknown }[] = [];
  setSesskey("S");
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    const [{ methodname, args }] = JSON.parse(init.body);
    calls.push({ m: methodname, args });
    const r = h[methodname];
    return new Response(JSON.stringify([r instanceof Error ? { error: true, exception: { message: r.message, errorcode: r.name } } : { error: false, data: r }]));
  }) as unknown as typeof fetch;
  return calls;
}

test("toNotice・loadNotices: 秒→ms、未読、HTML は文字に", async () => {
  expect(toNotice({ id: 1, subject: "<b>件名</b>", smallmessage: "本文", timecreated: 10, read: false, contexturl: "https://x/a" }))
    .toEqual({ id: 1, subject: "件名", text: "本文", at: 10000, read: false, url: "https://x/a" });
  const calls = mock({ message_popup_get_popup_notifications: { notifications: [{ id: 2, subject: "s", smallmessage: "m", timecreated: 5, read: true, contexturl: null }] } });
  expect((await loadNotices(9))[0]).toMatchObject({ id: 2, read: true, url: "" });
  expect(calls[0]!.args).toEqual({ useridto: 9, newestfirst: true, limit: 20, offset: 0 });
});

test("toConversation: 相手は自分以外、最後のメッセージは文字に", () => {
  const c = toConversation({ id: 3, members: [{ id: 9, fullname: "自分 ジブン" }, { id: 7, fullname: "碧海　寿広 オオミ　トシヒロ" }], messages: [{ text: "<p>こんにちは</p>", timecreated: 100, useridfrom: 7 }], unreadcount: 2 }, 9);
  expect(c).toEqual({ id: 3, otherId: 7, name: "碧海 寿広", last: "こんにちは", at: 100000, unread: 2 });
  expect(toConversation({ id: 4, members: [{ id: 1, fullname: "a b" }, { id: 2, fullname: "c d" }, { id: 9, fullname: "e f" }], messages: [], unreadcount: null }, 9)).toMatchObject({ otherId: null, name: "a b、c d", unread: 0 });
});

test("loadConversations・loadThread: 引数と整形、会話が無ければ空", async () => {
  let calls = mock({ core_message_get_conversations: { conversations: [] } });
  expect(await loadConversations(9)).toEqual([]);
  expect(calls[0]!.args).toEqual({ userid: 9, type: null, limitnum: 20, limitfrom: 0, favourites: null, mergeself: false });

  calls = mock({
    core_message_get_member_info: [{ fullname: "碧海　寿広 オオミ" }],
    core_message_get_conversation_between_users: { messages: [{ id: 1, text: "a", timecreated: 1, useridfrom: 9 }, { id: 2, text: "b", timecreated: 2, useridfrom: 7 }] },
  });
  const t = await loadThread(9, 7);
  expect(t).toEqual({ name: "碧海 寿広", messages: [{ id: 1, text: "a", at: 1000, mine: true }, { id: 2, text: "b", at: 2000, mine: false }] });
  expect(calls.find((c) => c.m === "core_message_get_conversation_between_users")!.args).toMatchObject({ userid: 9, otheruserid: 7, messagelimit: 50, newestmessagesfirst: false });
  // 相手の名前は自分を基準に引く(相手を基準にすると権限エラー)
  expect(calls.find((c) => c.m === "core_message_get_member_info")!.args).toMatchObject({ referenceuserid: 9, userids: [7] });

  const none = Object.assign(new Error("no conversation"), { name: "errorconversationdoesnotexist" });
  mock({ core_message_get_member_info: [{ fullname: "a b" }], core_message_get_conversation_between_users: none });
  expect((await loadThread(9, 7)).messages).toEqual([]);
  // ほかのエラー(権限など)は空にせず失敗にする
  mock({ core_message_get_member_info: [{ fullname: "a b" }], core_message_get_conversation_between_users: Object.assign(new Error("denied"), { name: "nopermission" }) });
  await expect(loadThread(9, 7)).rejects.toThrow();
});

test("sendMessage: プレーンで送る・errormessage は失敗", async () => {
  const calls = mock({ core_message_send_instant_messages: [{ msgid: 5 }] });
  await sendMessage(7, "こんにちは");
  expect(calls[0]!.args).toEqual({ messages: [{ touserid: 7, text: "こんにちは", textformat: 2 }] });
  mock({ core_message_send_instant_messages: [{ msgid: -1, errormessage: "ブロックされています" }] });
  await expect(sendMessage(7, "x")).rejects.toThrow("ブロックされています");
  mock({ core_message_send_instant_messages: [] });
  await expect(sendMessage(7, "x")).rejects.toThrow();
});

test("MessagesScreen: タブ・通知 0 件・会話 0 件・送る欄", () => {
  const n = renderToString(<MessagesScreen path="/message/output/popup/notifications.php" search="" userId={9} initial={{ notices: [] }} />);
  for (const t of ["通知", "メッセージ", "通知はありません"]) expect(n).toContain(t);
  const n2 = renderToString(<MessagesScreen path="/message/output/popup/notifications.php" search="" userId={9} initial={{ notices: [{ id: 1, subject: "課題", text: "", at: 0, read: false, url: "https://x/a" }] }} />);
  expect(n2).toContain('aria-label="未読"');
  expect(n2).toContain('href="https://x/a"');
  expect(renderToString(<MessagesScreen path="/message/index.php" search="" userId={9} initial={{ conversations: [] }} />)).toContain("会話はありません。コースの「先生」の欄から送れます");
  const c = renderToString(<MessagesScreen path="/message/index.php" search="?id=7" userId={9} initial={{ thread: { name: "碧海 寿広", messages: [{ id: 1, text: "やあ", at: 0, mine: true }] } }} />);
  for (const t of ["碧海 寿広 さん", "やあ", "先生に送る", "送る"]) expect(c).toContain(t);
});
