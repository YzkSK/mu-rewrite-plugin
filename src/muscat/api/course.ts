import { isReady as attendanceReady } from "./attendance";
import type { Core } from "./core";
import { ParseError } from "./errors";
import { parseAttendance } from "./parse/attendance";
import { parseCourseList } from "./parse/courseList";
import { parseSyllabusDetail } from "./parse/syllabusDetail";
import type { CourseDetail, SyllabusDetail } from "./types";
import { scanWidgets } from "./virtual/widgets";

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

/** ホームの履修授業のシラバス照会ボタンを押して、開いた小窓を読む。ref は aside の文書の札なので画面では使わない */
export function getCourseSyllabus(core: Core, key: { title: string; code?: string }): Promise<SyllabusDetail> {
  return core.aside(async (ctx) => {
    if (!(await ctx.openHome())) return null;
    const ids = parseCourseList(ctx.doc()).filter((c) => c.title === key.title && c.syllabusId).map((c) => c.syllabusId);
    if (!ids.length) throw new ParseError("履修授業にありません");
    // 同じ授業名のクラスが複数あれば、開いた詳細の授業コードで見分ける
    for (const id of ids) {
      if (!(await ctx.click(id))) return null;
      const detail = parseSyllabusDetail(ctx.doc());
      if (!detail) throw new ParseError("シラバスを読めませんでした");
      // 元の ✕ と同じ閉じる通信。失敗しても読んだ詳細は返す
      const doc = ctx.doc();
      const close = [...scanWidgets(doc).values()].find((w) => w.widgetVar === "pkx02301-closeBtn" && doc.getElementById(w.id));
      if (close) await ctx.click(close.id).catch(() => false);
      // 授業コードが読めない詳細は、同じ名前のクラスが 1 つだけのときに限って受け入れる
      if (!key.code || detail.code === key.code || (!detail.code && ids.length === 1)) return detail;
    }
    throw new ParseError("履修授業にありません"); // 授業コードが合うクラスが無い(検索で開く予備に回す)
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
