import { getAttendance } from "./attendance";
import { createCore } from "./core";
import type { Fetch } from "./recover";
import type { MenuIds } from "./session";
import { getTimetable } from "./timetable";
import type { Attendance, Timetable } from "./types";

export type MuscatClient = {
  getTimetable(year?: number): Promise<Timetable>;
  getAttendance(termKey?: string): Promise<Attendance>;
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
  };
}
