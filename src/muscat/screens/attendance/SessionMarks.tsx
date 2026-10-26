import type { AttendanceKind, AttendanceMark } from "@/muscat/api/types";

const TONE: Record<AttendanceKind, string> = {
  present: "text-primary font-bold",
  absent: "bg-error text-error-foreground font-bold",
  late: "font-bold ring-1 ring-inset ring-muted-foreground",
  early: "font-bold ring-1 ring-inset ring-muted-foreground",
  official: "text-muted-foreground",
  cancelled: "text-muted-foreground opacity-60",
  excluded: "text-muted-foreground opacity-40",
  other: "",
  none: "text-muted-foreground opacity-40",
};

/** 印 1 つ。表は 22px、カードは 20px */
/** date を渡すと、日付を出さない所(狭い画面のカード)でも、読み上げと長押しで日付が分かる */
export function Mark({ kind, label, size = 22, date }: { kind: AttendanceKind; label: string; size?: 20 | 22; date?: string }) {
  const box = size === 20 ? "size-5" : "size-[22px]";
  return (
    <span title={date || undefined} aria-label={date ? `${date} ${label || "未実施"}` : undefined} className={`inline-flex ${box} items-center justify-center rounded-[2px] text-[13px] ${TONE[kind]}`}>{kind === "none" ? "" : label}</span>
  );
}

export const LEGEND: { kind: AttendanceKind; label: string; name: string }[] = [
  { kind: "present", label: "出", name: "出席" },
  { kind: "early", label: "早", name: "早退" },
  { kind: "late", label: "遅", name: "遅刻" },
  { kind: "absent", label: "欠", name: "欠席" },
  { kind: "official", label: "特", name: "公欠" },
  { kind: "cancelled", label: "休", name: "休講" },
  { kind: "excluded", label: "－", name: "授業対象外" },
];

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-muted px-4 py-2 text-xs">
      {LEGEND.map((l) => (
        <span key={l.kind} className="inline-flex items-center gap-1.5">
          <Mark kind={l.kind} label={l.label} />
          {l.name}
        </span>
      ))}
    </div>
  );
}
