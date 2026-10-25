import { getAttendance } from "./attendance";
import { createCore } from "./core";
import { getCourse, saveMemo } from "./course";
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
import { parseSettings } from "./parse/settings";
import { parseSyllabus } from "./parse/syllabus";
import { parseTeacherSchedule } from "./parse/teacherSchedule";
import type { Attendance, CourseDetail, GenericPage, GradeFilter, Grades, HomePage, InfoPage, NewsPage, RoomInfo, RoomPage, RoomRow, SettingsPage, SyllabusPage, TeacherEvent, TeacherSchedulePage, Timetable } from "./types";
import { fetchTeacherEvents } from "./teacherEvents";
import { ParseError } from "./errors";
import { roomBooking, roomInfo, roomMore, roomNext, roomSubmit } from "./roomFetch";

export type MuscatClient = {
  getTimetable(year?: number): Promise<Timetable>;
  getAttendance(termKey?: string, baseDate?: string): Promise<Attendance>;
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
  /** 教員スケジュールの予定を、元のページの部品と同じ通信で直接取る(start 以上 end 未満) */
  teacherEvents(start: Date, end: Date): Promise<TeacherEvent[]>;
  /** 生きたページの教室予約(参照のみ)(条件の欄と、検索後のタイムライン)を読む */
  readRoom(): Promise<RoomPage>;
  /** 生きたページの個人設定(いま開いているタブの中身)を読む */
  readSettings(): Promise<SettingsPage>;
  /** 教室予約の検索を、元のボタンを押さず同じ通信で直接送る */
  roomSubmit(): Promise<void>;
  /** 検索のあとの続きの教室(1 回 40 行)を直接取る。[] で終わり */
  roomMore(): Promise<RoomRow[]>;
  /** 次のページ(約 340 件ずつ)へ進み、その最初の教室を読む。最後のページなら null */
  roomNext(): Promise<RoomRow[] | null>;
  /** 教室の ⓘ(建物・収容人数など)を取る。元の画面の表は検索し直すことがある */
  roomInfo(name: string): Promise<RoomInfo>;
  /** 帯の詳細を取る。予約は承認状況・予約者・利用目的など、授業(lesson)は時限・授業・教員。title は帯の説明文 */
  roomBooking(title: string, lesson?: boolean): Promise<{ label: string; value: string }[]>;  /** 授業の引き出しの中身(出席・ホームの履修授業)。別の Document で読み、ホームを開いているなら生きたページの hidden を直す */
  getCourse(key: { title: string; code?: string }): Promise<CourseDetail>;
  /** ホームの履修授業のメモを保存する */
  saveMemo(title: string, text: string): Promise<void>;
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
    getAttendance: (termKey, baseDate) => getAttendance(core, termKey, baseDate),
    getGrades: (filter) => getGrades(core, filter),
    getStudentInfo: () => getInfoPage(core, "学籍情報照会", "Bsb004"),
    getHealthInfo: () => getInfoPage(core, "健康診断情報照会", "Bsb007"),
    readLivePage: () => core.runLive(async (live) => parseGenericPage(live.doc)),
    driveLive: (steps) => core.runLive((live) => live.drive(steps)),
    readNews: () => readNews(core),
    readHome: () => core.runLive(async (live) => parseHome(live.doc)),
    readSyllabus: () => core.runLive(async (live) => parseSyllabus(live.doc)),
    readTeacherSchedule: () => core.runLive(async (live) => parseTeacherSchedule(live.doc)),
    teacherEvents: (start, end) => core.runLive((live) => fetchTeacherEvents(live.doc, deps.fetch, start, end)),
    readRoom: () => core.runLive(async (live) => parseRoom(live.doc)),
    readSettings: () => core.runLive(async (live) => parseSettings(live.doc)),
    roomSubmit: () =>
      core.runLive(async (live) => {
        if (!live.doc.getElementById("funcForm:search")) throw new ParseError("教室予約の検索ボタンがありません");
        await roomSubmit(live.doc, deps.fetch, "funcForm:search", "funcForm:search funcForm:conditionArea");
      }),
    roomMore: () => core.runLive((live) => roomMore(live.doc, deps.fetch)),
    roomNext: () => core.runLive((live) => roomNext(live.doc, deps.fetch)),
    roomInfo: (name) => core.runLive((live) => roomInfo(live.doc, deps.fetch, name)),
    roomBooking: (title, lesson) => core.runLive((live) => roomBooking(live.doc, deps.fetch, title, lesson)),
    getCourse: (key) => getCourse(core, deps.doc, key),
    saveMemo: (title, text) => saveMemo(core, deps.doc, title, text),
  };
}
