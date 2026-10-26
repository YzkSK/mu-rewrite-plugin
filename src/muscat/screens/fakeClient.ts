import type { MuscatClient } from "@/muscat/api/client";

const never = () => new Promise<never>(() => {});

/** 画面のテスト用。どのメソッドも解決しない(effect が動かない描画では呼ばれない)。必要なものだけ上書きする */
export const fakeClient = (over: Partial<MuscatClient> = {}): MuscatClient => ({
  getTimetable: never,
  getAttendance: never,
  getGrades: never,
  getStudentInfo: never,
  getHealthInfo: never,
  readLivePage: never,
  driveLive: never,
  readLive: never,
  press: never,
  news: { read: never, search: never, markAllRead: never },
  readHome: never,
  readSyllabus: never,
  readTeacherSchedule: never,
  teacherEvents: never,
  homeEvents: never,
  readRoom: never,
  readSettings: never,
  roomSubmit: never,
  roomNext: never,
  roomInfo: never,
  roomBooking: never,
  roomMore: never,  getCourse: never,
  saveMemo: never,
  navigate: never,
  logout: never,
  shown: () => ({ doc: document, seq: 0 }),
  subscribe: () => () => {},
  exportRequest: never,
  ...over,
});
