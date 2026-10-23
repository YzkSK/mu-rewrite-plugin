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
