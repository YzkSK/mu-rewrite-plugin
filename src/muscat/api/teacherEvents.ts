import { MuscatDownError, ParseError } from "./errors";
import { applyPartialResponse, buildPartialRequest } from "./partial";
import type { Fetch } from "./recover";
import type { TeacherEvent } from "./types";

type RawEvent = { start?: string; end?: string; allDay?: boolean; title?: string; classNames?: string };

/**
 * 元のページの Schedule 部品と同じ通信で、教員の予定を直接取る(Schedule の描画は見えない入れ物だと組み立てられないため)。
 * 応答の ViewState は生きたページに反映する(しないと次の通信をサーバーが受け付けない)。予定の update は適用しない(入れ物が JSON の文字になる)
 */
export async function fetchTeacherEvents(doc: Document, fetch: Fetch, start: Date, end: Date): Promise<TeacherEvent[]> {
  const id = doc.querySelector(".kyoinSchedule")?.id;
  const form = doc.getElementById("funcForm") as HTMLFormElement | null;
  if (!id || !form) throw new ParseError("教員の予定の入れ物がありません");
  const req = buildPartialRequest(
    form,
    id,
    { [`${id}_event`]: "true", [`${id}_start`]: start.toISOString(), [`${id}_end`]: end.toISOString(), [`${id}_view`]: "dayGridMonth" },
    id,
    id,
  );
  const res = await fetch(req.url, { method: "POST", headers: req.headers, body: req.body, credentials: "include" });
  if (!res.ok) throw new MuscatDownError(`教員の予定を取れませんでした (${res.status})`);
  const xml = await res.text();
  applyPartialResponse(doc, xml, [id]); // 予定が読めなくても、ViewState は先に入れ替える(古いままだと次の通信が通らない)
  const cdata = [...xml.matchAll(/<update\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/update>/g)].find((m) => m[1] === id)?.[2];
  if (cdata === undefined) throw new ParseError("教員の予定が応答にありません");
  let raw: RawEvent[];
  try {
    raw = (JSON.parse(cdata.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")) as { events: RawEvent[] }).events;
    if (!Array.isArray(raw)) throw new Error();
  } catch {
    throw new ParseError("教員の予定を読めませんでした");
  }
  return raw.map((e) => ({
    start: e.start ?? "",
    end: e.end ?? "",
    allDay: !!e.allDay,
    title: (e.title ?? "").trim(),
    kind: /\beventJugyo\b/.test(e.classNames ?? "") ? "class" : "other",
  }));
}
