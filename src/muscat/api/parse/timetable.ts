import { ParseError } from "../errors";
import type { Day, Timetable, TimetableEntry, TimetableTerm } from "../types";

const DAYS = ["月", "火", "水", "木", "金", "土"];

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
    room: spans[0]?.textContent?.trim() ?? "",
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

export function parseTimetable(root: ParentNode): Timetable {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const tables = [...form.querySelectorAll('table[class*="classTable"]')];
  if (tables.length === 0) throw new ParseError("時間割の表がありません");
  const year = Number(
    form.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value,
  );
  if (!Number.isFinite(year)) throw new ParseError("年度を読み取れません");
  const terms: TimetableTerm[] = tables.slice(0, 4).map((t, i) => ({
    term: (i + 1) as TimetableTerm["term"],
    entries: parseTable(t),
  }));
  return { year, terms };
}
