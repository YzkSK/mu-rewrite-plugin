import { getAttendance } from "./attendance";
import { createCore, type Shown } from "./core";
import { getCourse, saveMemo } from "./course";
import { getExportRequest, type ExportKind, type ExportRequest } from "./exportForm";
import type { Fetch } from "./recover";
import type { MenuIds, MenuLabel } from "./session";
import { getGrades } from "./grades";
import { getInfoPage } from "./info";
import { getTimetable } from "./timetable";
import { markAllReadNews, readNews, searchNews } from "./news";
import type { DriveStep } from "./driver/drive";
import { parseGenericPage } from "./parse/generic";
import { parseHome } from "./parse/home";
import { parseSettings } from "./parse/settings";
import { fillRoom, readRoom, type RoomValues } from "./room";
import { readSyllabus, searchSyllabus, type SyllabusQuery } from "./syllabus";
import { readTeacherSchedule, searchTeacher } from "./teacherSchedule";
import type { Attendance, CourseDetail, GenericPage, GradeFilter, Grades, HomeEvent, HomePage, InfoPage, NewsPage, RoomInfo, RoomPage, RoomRow, SettingsPage, SyllabusPage, TeacherEvent, TeacherSchedulePage, Timetable } from "./types";
import { fetchHomeEvents, fetchTeacherEvents } from "./teacherEvents";
import { ParseError } from "./errors";
import { roomBooking, roomInfo, roomMore, roomNext, roomSubmit } from "./roomFetch";

export type MuscatClient = {
  getTimetable(year?: number): Promise<Timetable>;
  getAttendance(termKey?: string, baseDate?: string): Promise<Attendance>;
  getGrades(filter?: GradeFilter): Promise<Grades>;
  getStudentInfo(): Promise<InfoPage>;
  getHealthInfo(): Promise<InfoPage>;
  /** 今の画面(複製の document)の #funcForm を、構造に依らない形で読む */
  readLivePage(): Promise<GenericPage>;
  /** 複製の入力欄・ボタンを操作し、元の部品と同じ通信を送る。何か送れば "done" */
  driveLive(steps: DriveStep[]): Promise<"done" | "none" | "timeout">;
  /** 複製の document を直列キューの中で読む(ref を付ける手順の組み立てなど) */
  readLive<T>(fn: (doc: Document) => T): Promise<T>;
  /** 読んだ結果の札(ref)の部品を 1 回押す */
  press(ref: string): Promise<void>;
  /** 読んだ結果の札(ref)の入力欄・選択欄に値を入れる(元の部品の change の通信もそのまま) */
  fill(ref: string, value: string): Promise<void>;
  news: {
    /** 生きたページの掲示板を読む(選択中のタブのパネル + 開いている詳細) */
    read(): Promise<NewsPage>;
    search(q: { keyword: string; course: string }): Promise<void>;
    /** 分類の「更新」→ 確認の OK。グループが無い・未読が無い・押せないときは ParseError */
    markAllRead(groupTitle: string): Promise<void>;
  };
  /** 生きたページのホーム(お知らせの全タブ・未読数・履修授業・開いている詳細)を読む */
  readHome(): Promise<HomePage>;
  syllabus: {
    /** 生きたページのシラバス検索(条件の欄と、検索後の一覧)を読む */
    read(): Promise<SyllabusPage>;
    /** 条件を入れて検索を押す。省略した欄・グループは触らない */
    search(q: SyllabusQuery): Promise<void>;
  };
  teacherSchedule: {
    /** 生きたページの教員スケジュール(検索欄・一覧・カレンダーのうち出ているもの)を読む */
    read(): Promise<TeacherSchedulePage>;
    search(q: { name: string; sort: string }): Promise<void>;
  };
  /** 教員スケジュールの予定を、元のページの部品と同じ通信で直接取る(start 以上 end 未満) */
  teacherEvents(start: Date, end: Date): Promise<TeacherEvent[]>;
  /** ホームの月表示の予定(祝日・大学の行事・掲示・授業)を、元のページの部品と同じ通信で直接取る(start 以上 end 未満) */
  homeEvents(start: Date, end: Date): Promise<HomeEvent[]>;
  room: {
    /** 生きたページの教室予約(参照のみ)(条件の欄と、検索後のタイムライン)を読む */
    read(): Promise<RoomPage>;
    /** 値を元の画面の部品に入れる(検索の通信は含まない。roomSubmit で送る) */
    fill(v: RoomValues): Promise<void>;
  };
  /** 生きたページの個人設定(いま開いているタブの中身)を読む */
  readSettings(): Promise<SettingsPage>;
  /** 教室予約の検索を、元のボタンを押さず同じ通信で直接送る */
  roomSubmit(): Promise<void>;
  /** 検索のあとの続きの教室(1 回 40 行)を直接取る。[] で終わり */
  roomMore(): Promise<RoomRow[]>;  /** 次のページ(約 340 件ずつ)へ進み、その最初の教室を読む。最後のページなら null */
  roomNext(): Promise<RoomRow[] | null>;
  /** 教室の ⓘ(建物・収容人数など)を取る。元の画面の表は検索し直すことがある */
  roomInfo(name: string): Promise<RoomInfo>;
  /** 帯の詳細を取る。予約は承認状況・予約者・利用目的など、授業(lesson)は時限・授業・教員。title は帯の説明文 */
  roomBooking(title: string, lesson?: boolean): Promise<{ label: string; value: string }[]>;  /** 授業の引き出しの中身(出席・ホームの履修授業)。最後にホームへ戻す */
  getCourse(key: { title: string; code?: string }): Promise<CourseDetail>;
  /** ホームの履修授業のメモを保存する */
  saveMemo(title: string, text: string): Promise<void>;
  /** 画面を移る(メニューの項目名・「ホーム」・「個人設定」)。もっと新しい移動が来たら捨てられる */
  navigate(label: string): Promise<void>;
  /** ログアウトして、移る先の URL を返す */
  logout(): Promise<string>;
  /** いま見せている画面の Document と移動の通し番号(移動のたびに別のオブジェクト) */
  shown(): Shown;
  subscribe(listener: () => void): () => void;
  /** 出席・成績の PDF / Excel の出力。元のボタンが送る POST を組み立てる(送るのは画面側のフォーム) */
  exportRequest(label: MenuLabel, text: ExportKind): Promise<ExportRequest>;
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
    press: (ref) =>
      core.runLive(async (live) => {
        await live.drive([{ kind: "click", ref }]);
      }),
    fill: (ref, value) =>
      core.runLive(async (live) => {
        await live.drive([{ kind: "set", ref, value }]);
      }),
    news: { read: () => readNews(core), search: (q) => searchNews(core, q), markAllRead: (t) => markAllReadNews(core, t) },
    readHome: () => core.runLive(async (live) => parseHome(live.doc)),
    syllabus: { read: () => readSyllabus(core), search: (q) => searchSyllabus(core, q) },
    teacherSchedule: { read: () => readTeacherSchedule(core), search: (q) => searchTeacher(core, q) },
    teacherEvents: (start, end) => core.runLive((live) => fetchTeacherEvents(live.doc, deps.fetch, start, end)),
    homeEvents: (start, end) => core.runLive((live) => fetchHomeEvents(live.doc, deps.fetch, start, end)),
    room: { read: () => readRoom(core), fill: (v) => fillRoom(core, v) },
    readSettings: () => core.runLive(async (live) => parseSettings(live.doc)),
    roomSubmit: () =>
      core.runLive(async (live) => {
        if (!live.doc.getElementById("funcForm:search")) throw new ParseError("教室予約の検索ボタンがありません");
        await roomSubmit(live.doc, deps.fetch, "funcForm:search", "funcForm:search funcForm:conditionArea");
      }),
    roomMore: () => core.runLive((live) => roomMore(live.doc, deps.fetch)),    roomNext: () => core.runLive((live) => roomNext(live.doc, deps.fetch)),
    roomInfo: (name) => core.runLive((live) => roomInfo(live.doc, deps.fetch, name)),
    roomBooking: (title, lesson) => core.runLive((live) => roomBooking(live.doc, deps.fetch, title, lesson)),
    readLive: (fn) => core.runLive(async (live) => fn(live.doc)),
    getCourse: (key) => getCourse(core, key),
    saveMemo: (title, text) => saveMemo(core, title, text),
    navigate: core.navigate,
    logout: core.logout,
    shown: core.shown,
    subscribe: core.subscribe,
    exportRequest: (label, text) => getExportRequest(core, label, text),
  };
}
