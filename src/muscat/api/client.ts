import { getAttendance } from "./attendance";
import { createCore } from "./core";
import type { Fetch } from "./recover";
import type { MenuIds } from "./session";
import { getGrades } from "./grades";
import { getInfoPage } from "./info";
import { getTimetable } from "./timetable";
import type { Attendance, GradeFilter, Grades, InfoPage, Timetable } from "./types";

export type MuscatClient = {
  getTimetable(year?: number): Promise<Timetable>;
  getAttendance(termKey?: string): Promise<Attendance>;
  getGrades(filter?: GradeFilter): Promise<Grades>;
  getStudentInfo(): Promise<InfoPage>;
  getHealthInfo(): Promise<InfoPage>;
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
  };
}
