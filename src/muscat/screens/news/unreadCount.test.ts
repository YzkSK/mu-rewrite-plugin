import { expect, test } from "bun:test";
import { addUnread, onUnreadChange, rememberedUnread, rememberUnread } from "./unreadCount";

test("数を覚え直すと知らせ、外したら知らせない(0 未満にはしない)", () => {
  let calls = 0;
  const off = onUnreadChange(() => calls++);
  rememberUnread(3);
  addUnread(-5);
  expect([rememberedUnread(), calls]).toEqual([0, 2]);
  off();
  rememberUnread(1);
  expect(calls).toBe(2);
});
