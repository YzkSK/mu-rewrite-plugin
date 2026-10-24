import { isReady as attendanceReady } from "./attendance";
import type { Core } from "./core";
import { ParseError } from "./errors";
import { parseAttendance } from "./parse/attendance";
import { parseCourseList } from "./parse/courseList";
import { syncHidden } from "./syncHidden";
import type { CourseDetail } from "./types";

const squeeze = (s: string) => s.replace(/\s+/g, "");

/**
 * 別の Document でホームを動かしたあと、生きたページの元の部品がまた効くよう hidden を写す。
 * ホーム以外の画面では、画面の移動に使う上の段とメニューのフォームだけ(本文のフォームは別の画面のもの)
 */
const syncIfHome = (live: Document, fresh: Document) => {
  syncHidden(live, fresh, live.getElementById("portalCont") ? undefined : ["headerForm", "menuForm"]);
};

export function getCourse(core: Core, live: Document, key: { title: string; code?: string }): Promise<CourseDetail> {
  return core.run(async (ctx) => {
    // 出席を先、ホームを後に読む(サーバーの「今の画面」を最後にホームへ戻す)
    if (!(await ctx.open("出席確認", attendanceReady))) return null;
    const courses = parseAttendance(ctx.doc()).courses;
    const attendance =
      (key.code ? courses.find((c) => c.code === key.code) : undefined) ?? courses.find((c) => squeeze(c.subject) === squeeze(key.title)) ?? null;
    if (!(await ctx.openHome())) return null;
    const item = parseCourseList(ctx.doc()).find((c) => c.title === key.title);
    syncIfHome(live, ctx.doc());
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

export function saveMemo(core: Core, live: Document, title: string, text: string): Promise<void> {
  return core.run(async (ctx) => {
    if (!(await ctx.openHome())) return null;
    const memo = parseCourseList(ctx.doc()).find((c) => c.title === title)?.memo;
    if (!memo?.saveId) throw new ParseError("メモ欄がありません");
    if (!(await ctx.partial("funcForm", memo.saveId, { extra: { [memo.inputName]: text } }))) return null;
    syncIfHome(live, ctx.doc());
    const input = [...live.querySelectorAll<HTMLInputElement>("input.ui-inputtext")].find((i) => i.name === memo.inputName);
    if (input) input.value = text;
    return true;
  }).then(() => undefined);
}
