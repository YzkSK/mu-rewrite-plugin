import { expect, test } from "bun:test";
import type { RoomRow } from "@/muscat/api/types";
import { drainAllPages, drainRooms } from "./drainRooms";

const row = (name: string): RoomRow => ({ date: "", name, capacity: "", infoRef: "", bars: [] });

test("[] が返るまで繰り返し、届いた順に足す", async () => {
  const batches = [[row("a"), row("b")], [row("c")], []];
  let calls = 0;
  const got: string[] = [];
  const done = await drainRooms(async () => batches[calls++]!, (r) => got.push(...r.map((x) => x.name)), () => true);
  expect(done).toBe(true);
  expect(calls).toBe(3);
  expect(got).toEqual(["a", "b", "c"]);
});

test("途中で新しい検索になったら、古い結果は捨てて止まる", async () => {
  let gen = 1;
  let calls = 0;
  const got: string[] = [];
  const done = await drainRooms(
    async () => {
      calls++;
      if (calls === 2) gen = 2; // 2 回目の応答を待つあいだに新しい検索
      return [row(`r${calls}`)];
    },
    (r) => got.push(...r.map((x) => x.name)),
    () => gen === 1,
  );
  expect(done).toBe(false);
  expect(got).toEqual(["r1"]);
  expect(calls).toBe(2);
});

test("drainAllPages: ページの続きを取り切るたびに次のページへ進み、最後(null)まで続ける。日付は引き継ぎ、ページの境目の重なりは捨てる", async () => {
  const d = (date: string, name: string) => ({ ...row(name), date });
  const more = [[row("b")], [], [row("y")], []];
  const next = [[d("10/25", "b"), d("10/26", "x")], null]; // 次のページは前のページの終わりと重なることがある
  const got: string[] = [];
  const done = await drainAllPages(async () => more.shift()!, async () => next.shift()!, (r) => got.push(...r.map((x) => `${x.date}|${x.name}`)), () => true, [d("10/25", "a")]);
  expect(done).toBe(true);
  expect(got).toEqual(["10/25|b", "10/26|x", "10/26|y"]);
});

test("drainAllPages: 次のページに新しい教室が無ければ止まる", async () => {
  let nexts = 0;
  const done = await drainAllPages(async () => [], async () => (nexts++, [row("a")]), () => {}, () => true, [row("a")]);
  expect(done).toBe(true);
  expect(nexts).toBe(1);
});
