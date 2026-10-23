import type { AttendanceMark } from "@/muscat/api/types";

/** 欠席だけ警告色。出・遅・その他は落ち着いた色、未実施は目立たない点 */
function tone(kind: AttendanceMark["kind"]): string {
  if (kind === "absent") return "font-bold text-error";
  if (kind === "none") return "text-muted-foreground opacity-40";
  return "text-muted-foreground";
}

export function SessionMarks({ sessions }: { sessions: AttendanceMark[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {sessions.map((m, i) => (
        <li key={i} className={`flex w-10 flex-col items-center text-sm ${tone(m.kind)}`}>
          <span>{m.kind === "none" ? "・" : m.label}</span>
          <span className="text-xs">{m.date}</span>
        </li>
      ))}
    </ul>
  );
}
