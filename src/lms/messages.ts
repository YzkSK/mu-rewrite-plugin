import { ajax, AjaxError, fetchUserName, shortName } from "./api";

export type Notice = { id: number; subject: string; text: string; at: number; read: boolean; url: string };
export type Conversation = { id: number; /** 相手が 1 人のときだけ */ otherId: number | null; name: string; last: string; at: number; unread: number };
export type Msg = { id: number; text: string; at: number; mine: boolean };
export type Thread = { name: string; messages: Msg[] };

/** HTML や改行まじりの文字 → 文字だけ(DOMParser で読む。innerHTML には入れない) */
const plain = (s: string | null | undefined): string => (new DOMParser().parseFromString(s ?? "", "text/html").body.textContent ?? "").replace(/[ \t]+\n/g, "\n").trim();

type RawNotice = { id: number; subject: string; smallmessage?: string; timecreated: number; read: boolean; contexturl?: string | null };
export const toNotice = (n: RawNotice): Notice => ({ id: n.id, subject: plain(n.subject), text: plain(n.smallmessage), at: n.timecreated * 1000, read: !!n.read, url: n.contexturl ?? "" });

export const loadNotices = async (userId: number): Promise<Notice[]> =>
  (await ajax<{ notifications: RawNotice[] }>("message_popup_get_popup_notifications", { useridto: userId, newestfirst: true, limit: 20, offset: 0 })).notifications.map(toNotice);

type RawConv = { id: number; members: { id: number; fullname: string }[]; messages: { text: string; timecreated: number; useridfrom: number }[]; unreadcount?: number | null };
export function toConversation(c: RawConv, userId: number): Conversation {
  const others = c.members.filter((m) => m.id !== userId);
  const last = c.messages[c.messages.length - 1];
  return {
    id: c.id,
    otherId: others.length === 1 ? others[0]!.id : null,
    name: (others.length ? others : c.members).map((m) => shortName(m.fullname)).join("、"),
    last: plain(last?.text),
    at: (last?.timecreated ?? 0) * 1000,
    unread: c.unreadcount ?? 0,
  };
}

export const loadConversations = async (userId: number): Promise<Conversation[]> =>
  (await ajax<{ conversations: RawConv[] }>("core_message_get_conversations", { userid: userId, type: null, limitnum: 20, limitfrom: 0, favourites: null, mergeself: false }))
    .conversations.map((c) => toConversation(c, userId));

/** 相手との会話(古い順)。まだ会話が無ければ空 */
export async function loadThread(userId: number, otherId: number): Promise<Thread> {
  const [name, conv] = await Promise.all([
    fetchUserName(otherId, userId).catch(() => ""), // 名前が取れなくても会話は出す
    ajax<{ messages: { id: number; text: string; timecreated: number; useridfrom: number }[] }>("core_message_get_conversation_between_users", {
      userid: userId, otheruserid: otherId, includecontactrequests: false, includeprivacyinfo: false, memberlimit: 0, memberoffset: 0, messagelimit: 50, messageoffset: 0, newestmessagesfirst: false,
    // まだ会話が無いときは errorconversationdoesnotexist(実機で確認)。それだけ空と見なす
    }).catch((e) => { if (e instanceof AjaxError && e.code === "errorconversationdoesnotexist") return { messages: [] }; throw e; }),
  ]);
  return { name, messages: conv.messages.map((m) => ({ id: m.id, text: plain(m.text), at: m.timecreated * 1000, mine: m.useridfrom === userId })) };
}

/** 送る(プレーンの文字)。失敗は理由つきの Error */
export async function sendMessage(toUserId: number, text: string): Promise<void> {
  const d = await ajax<{ msgid?: number; errormessage?: string }[]>("core_message_send_instant_messages", { messages: [{ touserid: toUserId, text, textformat: 2 }] });
  const r = d[0];
  if (!r || r.errormessage) throw new Error(r?.errormessage || "送れませんでした");
}

/** 5/12 09:05 */
export function fmtTime(ms: number): string {
  const t = new Date(ms);
  return `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
