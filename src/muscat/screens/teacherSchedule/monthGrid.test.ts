import { expect, test } from "bun:test";
import type { TeacherEvent } from "@/muscat/api/types";
import { eventColor, eventLabel, gridRange, groupEvents, monthGrid } from "./monthGrid";

test("月の表: 6 週・日曜始まり・月の外・今日", () => {
  const g = monthGrid(new Date(2026, 9, 1), new Date(2026, 9, 24, 15));
  expect(g).toHaveLength(42);
  expect(g[0]).toMatchObject({ date: "2026-09-27", day: 27, other: true }); // 10/1 は木曜なので、前の日曜から
  expect(g[4]).toMatchObject({ date: "2026-10-01", other: false });
  expect(g.filter((d) => d.today).map((d) => d.date)).toEqual(["2026-10-24"]);
  expect(g[41]).toMatchObject({ date: "2026-11-07", other: true });
  expect(monthGrid(new Date(2026, 1, 1), new Date(2026, 9, 24))[0]!.date).toBe("2026-02-01"); // 1 日が日曜
});

test("取る範囲: 表の最初の日の 0 時から 42 日後の 0 時", () => {
  const [from, to] = gridRange(new Date(2026, 9, 1));
  expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getHours()]).toEqual([2026, 8, 27, 0]);
  expect([to.getMonth(), to.getDate()]).toEqual([10, 8]);
});

const ev = (start: string, title: string, o: Partial<TeacherEvent> = {}): TeacherEvent => ({ start, end: start, allDay: false, title, kind: "class", ...o });

test("予定: 日付ごとにまとめ、時刻順(終日は先頭で時刻なし)", () => {
  const m = groupEvents([
    ev(new Date(2026, 10, 2, 13, 5).toISOString(), "午後"),
    ev(new Date(2026, 10, 2, 8, 50).toISOString(), "朝", { kind: "other" }),
    ev(new Date(2026, 10, 2).toISOString(), "終日", { allDay: true, kind: "other" }),
    ev(new Date(2026, 10, 3, 9, 0).toISOString(), "翌日"),
    ev("壊れた", "無視"),
  ]);
  expect([...m.keys()]).toEqual(["2026-11-02", "2026-11-03"]);
  expect(m.get("2026-11-02")!.map(eventLabel)).toEqual(["終日", "08:50 朝", "13:05 午後"]);
  expect(eventColor("class")).toContain("bg-accent");
  expect(eventColor("other")).toContain("bg-muted");
});

test("何日にもまたがる予定は終わりの日まで毎日に出す(終日の end は含まない。時刻は始まりの日だけ)", () => {
  const m = groupEvents([
    { start: "2026-10-05T00:00:00", end: "2026-10-08T00:00:00", allDay: true, title: "学外出張", kind: "other" },
    { start: "2026-10-10T22:00:00", end: "2026-10-11T02:00:00", allDay: false, title: "夜の作業", kind: "other" },
  ]);
  expect(["2026-10-05", "2026-10-06", "2026-10-07"].map((k) => m.get(k)?.[0]?.title)).toEqual(["学外出張", "学外出張", "学外出張"]);
  expect(m.get("2026-10-08")).toBeUndefined();
  expect(m.get("2026-10-10")?.[0]?.time).toBe("22:00");
  expect(m.get("2026-10-11")?.[0]).toMatchObject({ time: "", title: "夜の作業" });
});
