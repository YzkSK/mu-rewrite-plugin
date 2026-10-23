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
/** 情報画面(学籍・健康診断・個人設定)の共通形。セルは trim して連続空白を 1 つに */
export type InfoGrid = { rows: string[][] };
export type InfoTable = { headers: string[]; rows: string[][] };
export type InfoSection = { title: string; grids: InfoGrid[]; tables: InfoTable[] };
export type InfoPage = { sections: InfoSection[] };
/** 汎用画面: 生きたページの DOM から読んだ、構造に依らない最低限の表現。ref は driver の data-mu-ref */
export type GControl =
  | { kind: "text"; ref: string; label: string; value: string; disabled: boolean }
  | { kind: "textarea"; ref: string; label: string; value: string; disabled: boolean }
  | { kind: "select"; ref: string; label: string; value: string; options: { value: string; label: string }[]; disabled: boolean }
  | { kind: "checkbox"; ref: string; label: string; checked: boolean; disabled: boolean }
  | { kind: "radio"; ref: string; name: string; label: string; value: string; checked: boolean; disabled: boolean }
  | { kind: "button"; ref: string; label: string; disabled: boolean };
export type GCell = { text: string; controls: GControl[] };
export type GBlock =
  | { kind: "heading"; text: string }
  | { kind: "message"; text: string }
  | { kind: "fields"; rows: { label: string; text: string; controls: GControl[] }[] }
  | { kind: "table"; headers: string[]; rows: GCell[][] }
  | { kind: "controls"; controls: GControl[] };
export type GenericPage = { blocks: GBlock[] };
/** 掲示板。ref は driver の data-mu-ref(取れなければ "") */
export type NewsItem = {
  title: string;
  category: string;
  source: string;
  /** "2026/10/12" か "" */
  date: string;
  important: boolean;
  isNew: boolean;
  unread: boolean;
  flagged: boolean;
  openRef: string;
  flagRef: string;
  readRef: string;
};
export type NewsGroup = { title: string; items: NewsItem[] };
export type NewsTab = { name: string; ref: string; selected: boolean };
export type NewsDetail = {
  title: string;
  fields: { label: string; text: string; html: string }[];
  flagged: boolean;
  flagRef: string;
  prevRef: string;
  nextRef: string;
  closeRef: string;
};
/** groups はグループのタブのときだけ(そのとき items は全部をつないだもの)。empty は「データが存在しません」で行が 0 */
export type NewsPage = {
  tabs: NewsTab[];
  keyword: string;
  course: string;
  keywordRef: string;
  courseRef: string;
  searchRef: string;
  groups: NewsGroup[] | null;
  items: NewsItem[];
  empty: boolean;
  detail: NewsDetail | null;
};
/** ホーム。date は "2026/10/19" か ""。ref は driver の data-mu-ref(取れなければ "") */
export type HomeNotice = { date: string; title: string; source: string; openRef: string };
export type HomeNoticeTab = { name: string; ref: string; selected: boolean; items: HomeNotice[]; empty: boolean };
export type HomeLesson = { slots: { weekday: string; period: number }[]; title: string; teachers: string[]; room: string; keijiCount: number };
export type HomePage = {
  unreadKeiji: number | null;
  keijiRef: string;
  timetableChangeRef: string;
  notices: HomeNoticeTab[];
  lessons: HomeLesson[];
  detail: NewsDetail | null;
};
export type GradeFilter = { fail: boolean; inProgress: boolean; noCredit: boolean; transfer: boolean };
export type Grades = {
  entries: GradeEntry[];
  gpa: { byTerm: GpaRow[]; byYear: GpaRow[]; cumulative: GpaRow[] };
  credits: CreditRow[];
  totals: { inProgress: number | null; online: number | null };
  filter: GradeFilter;
};
