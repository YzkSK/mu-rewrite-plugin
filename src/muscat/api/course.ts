import { isReady as attendanceReady } from "./attendance";
import type { Core } from "./core";
import { ParseError } from "./errors";
import { parseAttendance } from "./parse/attendance";
import { parseCourseList } from "./parse/courseList";
import type { CourseDetail } from "./types";

const squeeze = (s: string) => s.replace(/\s+/g, "");

export function getCourse(core: Core, key: { title: string; code?: string }): Promise<CourseDetail> {
  return core.aside(async (ctx) => {
    // 出席を先、ホームを後に読む(サーバーの「今の画面」を最後にホームへ戻す)
    if (!(await ctx.open("出席確認", attendanceReady))) return null;
    const courses = parseAttendance(ctx.doc()).courses;
    const attendance =
      (key.code ? courses.find((c) => c.code === key.code) : undefined) ?? courses.find((c) => squeeze(c.subject) === squeeze(key.title)) ?? null;
    if (!(await ctx.openHome())) return null;
    const item = parseCourseList(ctx.doc()).find((c) => c.title === key.title);
    return {
      title: key.title,
      code: attendance?.code ?? key.code ?? "",
      slots: item?.slots ?? [],
      teachers: item?.teachers ?? [],
      room: item?.room ?? "",
      attendance,
      notices: item?.notices ?? [],
      memo: item?.memo?.value ?? null,
    };
  });
}

export function saveMemo(core: Core, title: string, text: string): Promise<void> {
  return core.aside(async (ctx) => {
    if (!(await ctx.openHome())) return null;
    const memo = parseCourseList(ctx.doc()).find((c) => c.title === title)?.memo;
    if (!memo?.saveId) throw new ParseError("メモ欄がありません");
    // 先にメモ欄の値を入れ(送る本文はフォームの項目から作る)、登録ボタンを押したときと同じ ab を送る。
    // 応答はメモ欄を描き直さないので、入れた値がそのまま次に読むときの値になる
    const input = [...ctx.doc().querySelectorAll<HTMLInputElement>("input.ui-inputtext")].find((i) => i.name === memo.inputName);
    const before = input?.value ?? "";
    const put = (v: string) => { if (input) { input.value = v; input.setAttribute("value", v); } };
    put(text);
    // 保存できなかったら元の値に戻す(保存していないメモを次に読むときに保存済みとして出さない)
    let ok = false;
    try { ok = await ctx.click(memo.saveId); } finally { if (!ok) put(before); }
    return ok ? true : null;
  }).then(() => undefined);
}
