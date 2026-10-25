import { expect, test } from "bun:test";
import { MuscatDownError, ParseError } from "./errors";
import { fetchHomeEvents, fetchTeacherEvents } from "./teacherEvents";

const ID = "funcForm:j_id_3x";
const html = `<form id="funcForm" action="/t" method="post"><input name="jakarta.faces.ViewState" value="vs1"><input name="rx-token" value="t"><div id="${ID}" class="kyoinSchedule">元</div></form>`;
const makeDoc = () => new DOMParser().parseFromString(html, "text/html");
const events = `{"events":[{"allDay":false,"overlap":false,"start":"2026-11-02T18:40:00+09:00","end":"2026-11-02T23:59:59+09:00","classNames":"eventJugyo eventDuring","id":"a","title":"バーチャルリアリティ特論 "},{"allDay":true,"start":"2026-11-03T00:00:00+09:00","end":"2026-11-04T00:00:00+09:00","classNames":"eventOther","id":"b","title":"会議"}]}`;
const xml = `<?xml version="1.0"?><partial-response><changes><update id="${ID}"><![CDATA[${events}]]></update><update id="j_id1:jakarta.faces.ViewState:0"><![CDATA[vs2]]></update></changes></partial-response>`;
const reply = (text: string, status = 200) => {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body as URLSearchParams });
    return new Response(text, { status });
  }) as unknown as typeof window.fetch;
  return { f, calls };
};
const range: [Date, Date] = [new Date("2026-09-26T15:00:00.000Z"), new Date("2026-11-07T15:00:00.000Z")];

test("予定を読み、ViewState は適用し、予定の update は適用しない", async () => {
  const doc = makeDoc();
  const { f, calls } = reply(xml);
  const r = await fetchTeacherEvents(doc, f, ...range);
  expect(r).toEqual([
    { start: "2026-11-02T18:40:00+09:00", end: "2026-11-02T23:59:59+09:00", allDay: false, title: "バーチャルリアリティ特論", kind: "class" },
    { start: "2026-11-03T00:00:00+09:00", end: "2026-11-04T00:00:00+09:00", allDay: true, title: "会議", kind: "other" },
  ]);
  expect(doc.querySelector<HTMLInputElement>('input[name="jakarta.faces.ViewState"]')!.value).toBe("vs2");
  expect(doc.getElementById(ID)!.textContent).toBe("元");
  const b = calls[0]!.body;
  expect(calls[0]!.url).toEndWith("/t");
  expect(b.get("jakarta.faces.partial.execute")).toBe(ID);
  expect(b.get("jakarta.faces.partial.render")).toBe(ID);
  expect(b.get(ID)).toBe(ID);
  expect(b.get(`${ID}_event`)).toBe("true");
  expect(b.get(`${ID}_start`)).toBe("2026-09-26T15:00:00.000Z");
  expect(b.get(`${ID}_end`)).toBe("2026-11-07T15:00:00.000Z");
  expect(b.get(`${ID}_view`)).toBe("dayGridMonth");
});

test("入れ物が無い・予定の update が無い・JSON が壊れている・HTTP エラー", async () => {
  await expect(fetchTeacherEvents(new DOMParser().parseFromString("<p>x</p>", "text/html"), reply(xml).f, ...range)).rejects.toThrow(ParseError);
  await expect(fetchTeacherEvents(makeDoc(), reply("<partial-response></partial-response>").f, ...range)).rejects.toThrow(ParseError);
  await expect(fetchTeacherEvents(makeDoc(), reply(xml.replace(events, "{oops")).f, ...range)).rejects.toThrow(ParseError);
  await expect(fetchTeacherEvents(makeDoc(), reply("x", 500).f, ...range)).rejects.toThrow(MuscatDownError);
});

test("ホームの予定: 入れ物は .portalSchedule、種類を classNames で分け、掲示は始まりの日だけ", async () => {
  const H = "funcForm:j_id_8h:content";
  const doc = new DOMParser().parseFromString(`<form id="funcForm" action="/t" method="post"><input name="jakarta.faces.ViewState" value="vs1"><div id="${H}" class="portalSchedule"></div></form>`, "text/html");
  const ev = (classNames: string, title: string, start: string, end: string) => ({ allDay: true, start, end, classNames, title });
  const json = JSON.stringify({
    events: [
      ev("eventEventAd skjKbn skjKbn1", "スポーツの日", "2026-10-12T00:00:00+09:00", "2026-10-12T23:59:59+09:00"),
      ev("eventEventAd skjKbn skjKbn3", "摩耶祭", "2026-10-10T00:00:00+09:00", "2026-10-12T23:59:59+09:00"),
      ev("eventKeijiAd", "韓国語研修", "2026-10-16T16:09:00+09:00", "2026-10-28T23:59:59+09:00"),
      { ...ev("eventJugyo eventDuring", "卒業論文創成課題 ", "2026-10-02T13:10:00+09:00", "2026-10-02T23:59:59+09:00"), allDay: false },
    ],
  });
  const { f, calls } = reply(`<partial-response><changes><update id="${H}"><![CDATA[${json}]]></update></changes></partial-response>`);
  const r = await fetchHomeEvents(doc, f, ...range);
  expect(r.map((e) => [e.kind, e.title])).toEqual([["holiday", "スポーツの日"], ["event", "摩耶祭"], ["notice", "韓国語研修"], ["class", "卒業論文創成課題"]]);
  expect(r[2]!.end).toBe(r[2]!.start); // 掲示は始まりの日だけ
  expect(calls[0]!.body.get("jakarta.faces.source")).toBe(H);
});
