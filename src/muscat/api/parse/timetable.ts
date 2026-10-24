import { ParseError } from "../errors";
import type { Day, Timetable, TimetableEntry, TimetableIrregular, TimetableTerm } from "../types";

const DAYS = ["月", "火", "水", "木", "金", "土"];

// 教室は全角で来る(「有明５－４０１」)ので半角にそろえ、教室が無い「未使用」はキャンパス(オンラインなど)で代える(実機で確認)
const roomOf = (room: string, campus: string) => {
  const r = room.normalize("NFKC").trim();
  return r === "未使用" ? campus : r;
};

function parseCell(el: Element, day: Day, period: number): TimetableEntry | null {
  const info = el.querySelector(".jugyo-info");
  const subject = info?.querySelector(".fontB")?.textContent?.trim() ?? "";
  if (!info || !subject) return null;
  const spans = info.querySelectorAll("span");
  const credits = info.querySelector(".taniSu")?.textContent?.match(/[\d.]+/)?.[0];
  return {
    day,
    period,
    subject,
    teacher: info.querySelectorAll(":scope > div")[1]?.textContent?.trim() ?? "",
    room: roomOf(spans[0]?.textContent ?? "", spans[1]?.textContent?.trim() ?? ""),
    campus: spans[1]?.textContent?.trim() ?? "",
    code:
      [...info.querySelectorAll("div")]
        .map((d) => d.textContent?.trim() ?? "")
        .find((t) => /^\d{10}$/.test(t)) ?? "",
    credits: credits ? Number(credits) : 0,
  };
}

function parseTable(table: Element): TimetableEntry[] {
  const rows = [...table.querySelectorAll("tr")];
  const days = [...(rows[0]?.querySelectorAll("th") ?? [])]
    .slice(1)
    .map((th) => (th.textContent ?? "").trim().charAt(0));
  const entries: TimetableEntry[] = [];
  for (const tr of rows.slice(1)) {
    const cells = [...tr.querySelectorAll(":scope > td")];
    if (cells.length < 3) continue; // 昼休みの行
    const period = parseInt(cells[0]?.textContent ?? "", 10);
    if (!Number.isFinite(period)) continue;
    cells.slice(1).forEach((td, i) => {
      const day = days[i];
      if (!day || !DAYS.includes(day)) return;
      const e = parseCell(td, day as Day, period);
      if (e) entries.push(e);
    });
  }
  return entries;
}

function parseIrregular(tr: Element): TimetableIrregular | null {
  const tds = [...tr.querySelectorAll(":scope > td")];
  const first = tds[0]?.cloneNode(true) as Element | undefined;
  if (!first || tds.length < 5) return null;
  first.querySelectorAll(".sign, .colInnerIcon").forEach((n) => n.remove()); // バッジとシラバスのボタンは科目名ではない
  const m = (first.textContent ?? "").trim().match(/^(\d{10})\s*([\s\S]*)$/);
  if (!m) return null;
  const text = (i: number) => tds[i]?.textContent?.trim() ?? "";
  return {
    code: m[1]!,
    subject: m[2]!.replace(/\s+/g, " ").trim(),
    teacher: text(1),
    room: roomOf(text(2), text(3)),
    campus: text(3),
    credits: Number(text(4).match(/[\d.]+/)?.[0] ?? 0),
  };
}

export function parseTimetable(root: ParentNode): Timetable {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const tables = [...form.querySelectorAll('table[class*="classTable"]')];
  if (tables.length === 0) throw new ParseError("時間割の表がありません");
  const year = Number(
    form.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value,
  );
  if (!Number.isFinite(year)) throw new ParseError("年度を読み取れません");
  // 学期ごとの fieldset の中だけを見る(GPA 推移表などの .ui-datatable を拾わないため)
  const sets = [...form.querySelectorAll("div.ui-fieldset-content")].filter((f) => f.querySelector('table[class*="classTable"]'));
  const terms: TimetableTerm[] = (sets.length ? sets : tables).slice(0, 4).map((s, i) => {
    const term = (i + 1) as TimetableTerm["term"];
    if (s.matches("table")) return { term, entries: parseTable(s), credits: null, irregular: [] }; // fieldset が無い古い形
    const table = s.querySelector('table[class*="classTable"]')!;
    const credits = s.querySelector(".alignRight")?.textContent?.match(/合計単位\s*([\d.]+)/)?.[1];
    return {
      term,
      entries: parseTable(table),
      credits: credits ? Number(credits) : null,
      irregular: [...s.querySelectorAll(".ui-datatable tbody tr:not(.ui-datatable-empty-message)")]
        .map(parseIrregular)
        .filter((r): r is TimetableIrregular => !!r),
    };
  });
  return { year, terms };
}
