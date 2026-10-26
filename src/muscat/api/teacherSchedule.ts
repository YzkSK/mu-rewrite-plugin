import type { Core } from "./core";
import type { DriveStep } from "./driver/drive";
import { ParseError } from "./errors";
import { parseTeacherSchedule } from "./parse/teacherSchedule";
import type { TeacherSchedulePage } from "./types";

/** 生きたページの教員スケジュール(検索欄・一覧・カレンダーのうち出ているもの)を読む */
export const readTeacherSchedule = (core: Core): Promise<TeacherSchedulePage> => core.runLive(async (live) => parseTeacherSchedule(live.doc));

/** 氏名と並び順を入れて検索を押す。ref は同じ複製を読み直して取る */
export const searchTeacher = (core: Core, q: { name: string; sort: string }): Promise<void> =>
  core.runLive(async (live) => {
    const s = parseTeacherSchedule(live.doc).search;
    if (!s?.searchRef) throw new ParseError("教員スケジュールの検索ボタンがありません");
    const steps: DriveStep[] = [
      ...(s.name.ref ? [{ kind: "set", ref: s.name.ref, value: q.name } as const] : []),
      ...(s.sort.ref ? [{ kind: "set", ref: s.sort.ref, value: q.sort } as const] : []),
      { kind: "click", ref: s.searchRef },
    ];
    await live.drive(steps);
  });
