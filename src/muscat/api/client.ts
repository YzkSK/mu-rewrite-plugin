import { getAttendance } from "./attendance";
import { createCore } from "./core";
import type { Fetch } from "./recover";
import type { MenuIds } from "./session";
import { getGrades } from "./grades";
import { getInfoPage } from "./info";
import { getTimetable } from "./timetable";
import { readNews } from "./news";
import type { DriveStep } from "./driver/drive";
import { parseGenericPage } from "./parse/generic";
import { parseHome } from "./parse/home";
import { parseRoom } from "./parse/room";
import { parseSyllabus } from "./parse/syllabus";
import { parseTeacherSchedule } from "./parse/teacherSchedule";
import type { Attendance, GenericPage, GradeFilter, Grades, HomePage, InfoPage, NewsPage, RoomPage, SyllabusPage, TeacherSchedulePage, Timetable } from "./types";

export type MuscatClient = {
  getTimetable(year?: number): Promise<Timetable>;
  getAttendance(termKey?: string): Promise<Attendance>;
  getGrades(filter?: GradeFilter): Promise<Grades>;
  getStudentInfo(): Promise<InfoPage>;
  getHealthInfo(): Promise<InfoPage>;
  /** 生きたページ(document)の #funcForm を、構造に依らない形で読む */
  readLivePage(): Promise<GenericPage>;
  /** 生きたページの元の入力欄・ボタンを操作して、通信の終わりを待つ */
  driveLive(steps: DriveStep[]): Promise<"done" | "none" | "timeout">;
  /** 生きたページの掲示板を読む(選択中のタブのパネル + 開いている詳細) */
  readNews(): Promise<NewsPage>;
  /** 生きたページのホーム(お知らせの全タブ・未読数・履修授業・開いている詳細)を読む */
  readHome(): Promise<HomePage>;
  /** 生きたページのシラバス検索(条件の欄と、検索後の一覧)を読む */
  readSyllabus(): Promise<SyllabusPage>;
  /** 生きたページの教員スケジュール(検索欄・一覧・カレンダーのうち出ているもの)を読む */
  readTeacherSchedule(): Promise<TeacherSchedulePage>;
  /** 生きたページの教室予約(参照のみ)(条件の欄と、検索後のタイムライン)を読む */
  readRoom(): Promise<RoomPage>;
};

export function createMuscatClient(deps: {
  fetch: Fetch;
  doc: Document;
  ids: MenuIds;
  now?: () => number;
}): MuscatClient {
  const core = createCore(deps);
  return {
    getTimetable: (year) => getTimetable(core, year),
    getAttendance: (termKey) => getAttendance(core, termKey),
    getGrades: (filter) => getGrades(core, filter),
    getStudentInfo: () => getInfoPage(core, "学籍情報照会", "Bsb004"),
    getHealthInfo: () => getInfoPage(core, "健康診断情報照会", "Bsb007"),
    readLivePage: () => core.runLive(async (live) => parseGenericPage(live.doc)),
    driveLive: (steps) => core.runLive((live) => live.drive(steps)),
    readNews: () => readNews(core),
    readHome: () => core.runLive(async (live) => parseHome(live.doc)),
    readSyllabus: () => core.runLive(async (live) => parseSyllabus(live.doc)),
    readTeacherSchedule: () => core.runLive(async (live) => parseTeacherSchedule(live.doc)),
    readRoom: () => core.runLive(async (live) => parseRoom(live.doc)),
  };
}
