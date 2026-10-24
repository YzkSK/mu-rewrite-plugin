import { Fragment, useEffect, useRef, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { AttendanceMark, CourseDetail } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { Panel } from "@/ui/Panel";
import { useToast } from "@/ui/Toast";
import { errorMessage } from "../errorMessage";
import { useCourse, type CourseKey, type CourseState } from "./useCourse";

type Props = {
  client: MuscatClient;
  course: CourseKey;
  onClose: () => void;
  /** メニューの表示テキストで画面を移る(「シラバス」「成績照会」) */
  onNav: (label: string) => void;
  initial?: CourseState;
};

const slotLabel = (slots: CourseDetail["slots"]) => {
  const byDay = new Map<string, number[]>();
  for (const s of slots) byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), s.period]);
  return [...byDay].map(([d, ps]) => `${d} ${ps.sort((a, b) => a - b).join("・")}限`).join("、");
};

function markTone(kind: AttendanceMark["kind"]) {
  if (kind === "absent") return "bg-error text-white font-semibold";
  if (kind === "present") return "text-primary font-semibold";
  if (kind === "late" || kind === "early") return "border border-border text-muted-foreground";
  if (kind === "other") return "";
  return "text-muted-foreground";
}

function Attendance({ course }: { course: CourseDetail }) {
  const a = course.attendance;
  if (!a) return <p className="m-0 text-sm text-muted-foreground">出席の記録はありません</p>;
  const held = a.sessions.filter((m) => !["none", "cancelled", "excluded"].includes(m.kind)).length; // 休講・授業対象外は実施した回に数えない
  const absent = a.sessions.filter((m) => m.kind === "absent").length;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex items-baseline gap-3">
        <b className="text-xl">{a.rate === null ? "-" : `${a.rate}%`}</b>
        <span className="text-sm text-muted-foreground">{`${held} 回中 欠席 ${absent}`}</span>
      </p>
      {/* 広い引き出し(480px)では 1 行に収まる幅。狭い画面では折り返す */}
      <ul className="m-0 flex list-none flex-wrap gap-[3px] p-0">
        {a.sessions.map((m, i) => (
          <li key={i} className="flex w-[26px] flex-col items-center gap-0.5">
            <span className={`inline-flex size-[22px] items-center justify-center rounded-[4px] text-xs ${m.kind === "none" ? "border border-[#ECE9EF]" : markTone(m.kind)}`}>{m.kind === "none" ? "" : m.label}</span>
            <small className="text-[10px] text-muted-foreground">{m.date}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Memo({ client, course, toast }: { client: MuscatClient; course: CourseDetail; toast: (m: string) => void }) {
  const [text, setText] = useState(course.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await client.saveMemo(course.title, text);
      toast("メモを保存しました");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <textarea
        aria-label="メモ"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-[4px] border border-input bg-card p-2 text-sm"
      />
      {error && <ErrorNotice title="メモを保存できませんでした" message={error} />}
      <div>
        <Button disabled={saving} onClick={() => void save()}>{saving ? "保存中" : "メモを保存"}</Button>
      </div>
    </div>
  );
}

function Body({ client, course, onNav, toast }: { client: MuscatClient; course: CourseDetail; onNav: Props["onNav"]; toast: (m: string) => void }) {
  const slots = slotLabel(course.slots);
  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-1">
        {[
          ["時限", slots, "text-sm"],
          ["教室", course.room, "text-[15px] font-semibold"],
          ["教員", course.teachers.join("、"), "text-sm"],
        ].map(([name, value, tone]) =>
          value ? (
            <Fragment key={name}>
              <dt className="text-xs leading-5 text-muted-foreground">{name}</dt>
              <dd className={`m-0 ${tone}`}>{value}</dd>
            </Fragment>
          ) : null,
        )}
      </dl>
      <Panel title="出席">
        <Attendance course={course} />
      </Panel>
      {course.notices.length > 0 && (
        <Panel title="この授業の掲示">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {course.notices.map((n, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-20 shrink-0 text-xs leading-5 text-muted-foreground">{n.date}</span>
                <span className="min-w-0">{n.title}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {course.memo !== null && (
        <Panel title="メモ">
          <Memo client={client} course={course} toast={toast} />
        </Panel>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onNav("シラバス")}>シラバスを開く</Button>
        <Button variant="secondary" onClick={() => onNav("成績照会")}>成績を見る</Button>
      </div>
    </div>
  );
}

/** 授業の引き出し。広い画面は右に 480px、767px 以下は全画面。幕・Esc・閉じるで閉じる */
export function CourseDrawer({ client, course: key, onClose, onNav, initial }: Props) {
  const { status, course, error, reload } = useCourse(client, key, initial);
  const { toast, node } = useToast();
  const panel = useRef<HTMLElement>(null);
  // 親は onClose を毎回作り直すので、最新を ref で持つ(付け外しとフォーカスのやり直しを避ける)
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const ghost = "cursor-pointer border-0 bg-transparent px-2 py-1 text-sm text-primary";
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={key.title}
        className="absolute inset-y-0 right-0 flex w-[480px] max-w-full flex-col border-l border-border bg-background outline-none max-[767px]:w-full max-[767px]:border-l-0"
      >
        <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
          <button type="button" className={`${ghost} min-[768px]:hidden`} onClick={onClose}>‹ 戻る</button>
          <button type="button" aria-label="閉じる" className={`${ghost} ml-auto max-[767px]:hidden`} onClick={onClose}>✕</button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-[19px] font-bold">{key.title}</h2>
            {(course?.code ?? key.code) && <span className="text-xs text-muted-foreground">{course?.code ?? key.code}</span>}
          </div>
          {status === "loading" && <PageLoading title="授業" />}
          {status === "error" && <ErrorNotice title="授業を読み込めませんでした" message={error ?? ""} onRetry={reload} />}
          {status === "ready" && course && <Body client={client} course={course} onNav={onNav} toast={toast} />}
        </div>
        {node}
      </aside>
    </div>
  );
}
