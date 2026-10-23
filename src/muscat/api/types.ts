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

/** mark は印のセルの生の文字。online は `*`、inProgress は `※` を含むとき */
export type GradeCourse = {
  mark: string;
  online: boolean;
  inProgress: boolean;
  name: string;
  credits: number | null;
  grade: string;
  gpaTarget: boolean;
  gpaTargetYear: boolean;
  year: number | null;
  term: string;
  teacher: string;
};
/** course が null なら科目分類の見出し。depth は 0 始まり */
export type GradeEntry = { depth: number; name: string; course: GradeCourse | null };
export type GpaRow = { label: string; value: number | null };
export type CreditRow = {
  depth: number;
  name: string;
  required: number | null;
  earned: number | null;
  inProgress: number | null;
  total: number | null;
};
export type GradeFilter = { fail: boolean; inProgress: boolean; noCredit: boolean; transfer: boolean };
export type Grades = {
  entries: GradeEntry[];
  gpa: { byTerm: GpaRow[]; byYear: GpaRow[]; cumulative: GpaRow[] };
  credits: CreditRow[];
  totals: { inProgress: number | null; online: number | null };
  filter: GradeFilter;
};
