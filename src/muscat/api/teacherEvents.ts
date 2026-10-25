import { MuscatDownError, ParseError } from "./errors";
import { applyPartialResponse, buildPartialRequest } from "./partial";
import type { Fetch } from "./recover";
import type { HomeEvent, TeacherEvent } from "./types";

type RawEvent = { start?: string; end?: string; allDay?: boolean; title?: string; classNames?: string };

/**
 * 元のページの Schedule 部品と同じ通信で、予定を直接取る(Schedule の描画は見えない入れ物だと組み立てられないため)。
 * marker は入れ物の印(教員の予定は .kyoinSchedule、ホームの月表示は .portalSchedule。実機で確認)。
 * 応答の ViewState は生きたページに反映する(しないと次の通信をサーバーが受け付けない)。予定の update は適用しない(入れ物が JSON の文字になる)
 */
async function fetchScheduleEvents(doc: Document, fetch: Fetch, marker: string, start: Date, end: Date): Promise<RawEvent[]> {
  const id = doc.querySelector(marker)?.id;
  const form = doc.getElementById("funcForm") as HTMLFormElement | null;
  if (!id || !form) throw new ParseError("予定の入れ物がありません");
  const req = buildPartialRequest(
    form,
    id,
    { [`${id}_event`]: "true", [`${id}_start`]: start.toISOString(), [`${id}_end`]: end.toISOString(), [`${id}_view`]: "dayGridMonth" },
    id,
    id,
  );
  const res = await fetch(req.url, { method: "POST", headers: req.headers, body: req.body, credentials: "include" });
  if (!res.ok) throw new MuscatDownError(`予定を取れませんでした (${res.status})`);
  const xml = await res.text();
  applyPartialResponse(doc, xml, [id]); // 予定が読めなくても、ViewState は先に入れ替える(古いままだと次の通信が通らない)
  const cdata = [...xml.matchAll(/<update\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/update>/g)].find((m) => m[1] === id)?.[2];
  if (cdata === undefined) throw new ParseError("予定が応答にありません");
  try {
    const raw = (JSON.parse(cdata.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")) as { events: RawEvent[] }).events;
    if (!Array.isArray(raw)) throw new Error();
    return raw;
  } catch {
    throw new ParseError("予定を読めませんでした");
  }
}

const base = (e: RawEvent) => ({ start: e.start ?? "", end: e.end ?? "", allDay: !!e.allDay, title: (e.title ?? "").trim() });

export async function fetchTeacherEvents(doc: Document, fetch: Fetch, start: Date, end: Date): Promise<TeacherEvent[]> {
  return (await fetchScheduleEvents(doc, fetch, ".kyoinSchedule", start, end)).map((e) => ({ ...base(e), kind: /\beventJugyo\b/.test(e.classNames ?? "") ? "class" : "other" }));
}

/**
 * ホームの月表示の予定。classNames で種類を分ける: eventJugyo = 授業、eventEventAd skjKbn1 = 祝日、eventEventAd = 大学の行事、eventKeijiAd = 掲示(実機で確認)。
 * 掲示は掲載期間(何日にもまたがる)で来るので、始まりの日だけに出す
 */
export async function fetchHomeEvents(doc: Document, fetch: Fetch, start: Date, end: Date): Promise<HomeEvent[]> {
  return (await fetchScheduleEvents(doc, fetch, ".portalSchedule", start, end)).map((e) => {
    const c = e.classNames ?? "";
    const kind: HomeEvent["kind"] = /\beventJugyo\b/.test(c) ? "class" : /\bskjKbn1\b/.test(c) ? "holiday" : /\beventEventAd\b/.test(c) ? "event" : /\beventKeijiAd\b/.test(c) ? "notice" : "other";
    const b = base(e);
    return { ...b, end: kind === "notice" ? b.start : b.end, kind };
  });
}
