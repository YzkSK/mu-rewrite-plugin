import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { fakeClient } from "../fakeClient";
import { HomeCalendar } from "./HomeCalendar";

test("見出し・月の移動・凡例・曜日、今日の印", () => {
  const client = fakeClient({ homeEvents: () => new Promise(() => {}) });
  const html = renderToString(<HomeCalendar client={client} onBack={() => {}} today={new Date(2026, 9, 25)} />);
  for (const s of ["ホームに戻る", "カレンダー", "2026年10月", "今月", "大学の行事", "掲示", "授業・予定", ">日<", ">土<"]) expect(html).toContain(s);
  expect(html).toMatch(/bg-primary[^"]*text-primary-foreground[^>]*>25</); // 今日
});
