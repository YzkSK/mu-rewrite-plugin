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
  /** as: 元の要素が <a> なら "link"、<button> / input なら "button" */
  | { kind: "button"; ref: string; label: string; disabled: boolean; as: "button" | "link" };
export type GCell = { text: string; controls: GControl[] };
/** 文字(ref を持たない)か操作部品(ref を持つ)。kind "text" は両方にあるので、見分けは "ref" in x */
export type GInline = { kind: "text"; text: string } | GControl;
export type GBlock =
  | { kind: "heading"; text: string; level: 1 | 2 | 3 | 4 }
  | { kind: "line"; items: GInline[]; tone?: "notice" }
  | { kind: "tabs"; tabs: { label: string; ref: string; selected: boolean; disabled: boolean }[] }
  | { kind: "fields"; rows: { label: string; text: string; controls: GControl[] }[] }
  | { kind: "table"; headers: string[]; rows: GCell[][] };
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
/** 生きたページの入力欄。ref は driver の data-mu-ref(見つからなければ "") */
export type TextField = { ref: string; value: string };
export type SelectField = { ref: string; value: string; options: { value: string; label: string }[] };
export type CheckOption = { label: string; ref: string; checked: boolean };
export type PagerLink = { n: number; ref: string; current: boolean };
/** 一覧の件数と送り。first/prev/next/last の ref は、押せないとき "" */
export type ListPager = {
  total: number;
  page: number;
  pages: number;
  pageLinks: PagerLink[];
  firstRef: string;
  prevRef: string;
  nextRef: string;
  lastRef: string;
  size: SelectField | null;
};
export type ListResult<R> = { pager: ListPager; rows: R[]; empty: boolean };

export type SyllabusRow = { time: string; code: string; title: string; teachers: string; kind: string; terms: string[]; credit: string; openRef: string };
export type SyllabusPage = {
  year: TextField;
  term: SelectField;
  subject: TextField;
  teacher: TextField;
  keyword: TextField;
  dept: SelectField;
  category: SelectField;
  campus: SelectField;
  days: CheckOption[];
  grades: CheckOption[];
  kinds: CheckOption[];
  periods: CheckOption[];
  searchRef: string;
  clearRef: string;
  noteRef: string;
  /** 検索前は null */
  result: ListResult<SyllabusRow> | null;
};

/** kind は元の画面の種類 class(zoneJugyo → "jugyo", zoneResOther → "resOther")。start/end は 0:00 からの分、lane は重なったときの段 */
export type RoomBar = { kind: string; text: string; title: string; start: number; end: number; lane: number; openRef: string };
export type RoomRow = { name: string; capacity: string; infoRef: string; bars: RoomBar[] };
export type RoomLegend = { kind: string; label: string };
/** 検索後のタイムライン。from/to はタイムラインの時刻(分)。date は「2026/10/24(土)」 */
export type RoomResult = {
  date: string;
  dates: SelectField;
  moveRef: string;
  prevRef: string;
  nextRef: string;
  legend: RoomLegend[];
  from: number;
  to: number;
  rooms: RoomRow[];
};
export type RoomRange = { from: TextField; to: TextField };
export type RoomPage = {
  period: RoomRange;
  targets: CheckOption[];
  /** 空き教室。box は見える枠(操作先)、on は入っているか */
  free: { boxRef: string; on: boolean; time: RoomRange; hour: TextField; minute: TextField } | null;
  days: CheckOption[];
  campus: SelectField;
  building: SelectField;
  floor: SelectField;
  capacity: { regular: RoomRange; exam: RoomRange; entrance: RoomRange };
  /** 一覧に収容人数の列を(表示しない / 表示する)と、その種類(平常時 / 試験時) */
  showCapacity: CheckOption[];
  capacityKind: SelectField;
  searchRef: string;
  clearRef: string;
  /** 検索前は null */
  result: RoomResult | null;
};

export type TeacherRow = { name: string; kana: string; english: string; dept: string; openRef: string };
export type CalendarEvent = { time: string; title: string };
/** date は "2026-10-02"(読めなければ "")。other は表示中の月の外 */
export type CalendarDay = { day: number; date: string; other: boolean; today: boolean; events: CalendarEvent[] };
export type TeacherCalendar = { title: string; prevRef: string; nextRef: string; todayRef: string; days: CalendarDay[] };
export type TeacherSearch = { name: TextField; sort: SelectField; ascending: boolean; toggleRef: string; clearRef: string; searchRef: string };
/** 検索欄(search)・一覧(list)・選んだ教員の月カレンダー(calendar)のうち、いま画面にあるもの */
export type TeacherSchedulePage = {
  teacher: string;
  search: TeacherSearch | null;
  list: ListResult<TeacherRow> | null;
  calendar: TeacherCalendar | null;
  backRef: string;
};
export type GradeFilter = { fail: boolean; inProgress: boolean; noCredit: boolean; transfer: boolean };
export type Grades = {
  entries: GradeEntry[];
  gpa: { byTerm: GpaRow[]; byYear: GpaRow[]; cumulative: GpaRow[] };
  credits: CreditRow[];
  totals: { inProgress: number | null; online: number | null };
  filter: GradeFilter;
};
