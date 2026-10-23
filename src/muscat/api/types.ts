export type Day = "月" | "火" | "水" | "木" | "金" | "土";

export type TimetableEntry = {
  day: Day;
  period: number;
  subject: string;
  teacher: string;
  room: string;
  campus: string;
  code: string;
  credits: number;
};

export type TimetableTerm = { term: 1 | 2 | 3 | 4; entries: TimetableEntry[] };

export type Timetable = { year: number; terms: TimetableTerm[] };

export type AttendanceKind = "present" | "absent" | "late" | "other" | "none";
/** none は label "" 。date は "10/06" など(無ければ "") */
export type AttendanceMark = { kind: AttendanceKind; label: string; date: string };
export type AttendanceCourse = {
  when: string;
  code: string;
  subject: string;
  teacher: string;
  rate: number | null;
  sessions: AttendanceMark[];
};
export type TermOption = { key: string; label: string };
export type Attendance = { termKey: string; baseDate: string; terms: TermOption[]; courses: AttendanceCourse[] };
