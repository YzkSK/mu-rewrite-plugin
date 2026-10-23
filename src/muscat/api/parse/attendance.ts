import { ParseError } from "../errors";
import type { Attendance, AttendanceCourse, AttendanceKind, AttendanceMark } from "../types";

const KINDS: Record<string, AttendanceKind> = { attendance: "present", absence: "absent", earlyLate: "late" };

function parseMark(td: Element): AttendanceMark {
  const date = td.querySelector(".jugyoDate")?.textContent?.trim() ?? "";
  const span = td.querySelector(".jugyoList");
  const label = span ? ((span.querySelector(".syuketsuKbnMark") ?? span).textContent?.trim() ?? "") : "";
  // 実施前の回は span.jugyoList が空で入っている(実機で確認)。記号が無ければ未実施
  if (!span || !label) return { kind: "none", label: "", date };
  const cls = [...span.classList].find((c) => c in KINDS);
  return { kind: cls ? KINDS[cls]! : "other", label, date };
}

function parseCourse(tr: Element): AttendanceCourse | null {
  const cells = [...tr.querySelectorAll(":scope > td")];
  if (cells.length < 3 || cells[0]!.textContent?.trim() === "曜日時限") return null; // 見出し行は除く
  const subjectCell = cells[1]!;
  const subject = subjectCell.querySelector("span")?.textContent?.trim() ?? "";
  const rest = (subjectCell.textContent ?? "").replace(subject, "");
  const rate = parseFloat((cells[2]!.textContent ?? "").replace(/[％%]/g, ""));
  return {
    when: cells[0]!.textContent?.trim() ?? "",
    code: (subjectCell.textContent ?? "").trim().match(/^\d{10}/)?.[0] ?? "",
    subject,
    teacher: [...rest.matchAll(/（([^）]*)）/g)].map((m) => m[1]!.trim()).join("、"),
    rate: Number.isFinite(rate) ? rate : null,
    sessions: cells.slice(3).filter((c) => c.classList.contains("colSizeFixed")).map(parseMark),
  };
}

export function parseAttendance(root: ParentNode): Attendance {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const select = form.querySelector<HTMLSelectElement>('select[name="funcForm:kaikoNendoGakki_input"]');
  if (!select) throw new ParseError("学期の選択がありません");
  const table = [...form.querySelectorAll("table")].find(
    (t) => t.querySelector("tr > th, tr > td")?.textContent?.trim() === "曜日時限",
  );
  // 授業が 0 件の学期では結果の表が丸ごと無くなる(実機で確認)。学期の選択があれば、この画面なので 0 件として扱う
  const terms = [...select.options].map((o) => ({ key: o.value, label: (o.textContent ?? "").trim() }));
  return {
    termKey: select.value,
    baseDate: form.querySelector<HTMLInputElement>('[name="funcForm:baseDate1:baseDate1_input"]')?.value ?? "",
    terms,
    courses: table ? [...table.querySelectorAll("tr")].flatMap((tr) => parseCourse(tr) ?? []) : [],
  };
}
