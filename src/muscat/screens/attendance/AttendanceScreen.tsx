import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { Attendance, AttendanceCourse } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { DatePicker } from "@/ui/DatePicker";
import { EmptyState } from "@/ui/EmptyState";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { Select } from "@/ui/Select";
import { errorToast } from "@/ui/Toast";
import { errorMessage } from "../errorMessage";
import { CourseDrawer } from "../course/CourseDrawer";
import type { CourseKey } from "../course/useCourse";
import { exportFile } from "../exportFile";
import { useBackClose } from "../useBackClose";
import { Legend, Mark } from "./SessionMarks";
import { useAttendance, type AttendanceState } from "./useAttendance";

type Props = { client: MuscatClient; initial?: AttendanceState };

const yearOf = (key: string) => Number(key.split("|")[0]);

// 252 個は多すぎるので、選択中の年度の 5 年前〜1 年後だけ出す
export const termOptions = (a: Attendance) =>
  a.terms
    .filter((t) => yearOf(t.key) >= yearOf(a.termKey) - 5 && yearOf(t.key) <= yearOf(a.termKey) + 1)
    .map((t) => ({ value: t.key, label: t.label }));
const absences = (c: AttendanceCourse) => c.sessions.filter((m) => m.kind === "absent").length;
const rateText = (c: AttendanceCourse) => (c.rate === null ? "" : `${c.rate.toFixed(1)}%`);
const box = "rounded-[4px] border border-border bg-card px-4 py-3";

function Summary({ courses, onOpen }: { courses: AttendanceCourse[]; onOpen: (c: AttendanceCourse) => void }) {
  const absent = courses.filter((c) => absences(c) > 0).sort((a, b) => absences(b) - absences(a));
  if (absent.length === 0) return <div className={`${box} text-[13px] text-muted-foreground`}>欠席はありません</div>;
  return (
    <div className={`${box} flex flex-col gap-2`}>
      <p className="m-0 flex flex-wrap items-baseline gap-2">
        <span className="text-[15px] font-bold">
          欠席のある授業 <span className="text-error">{absent.length}</span>
        </span>
        <span className="text-[12.5px] font-light text-muted-foreground">{`全 ${courses.length} 授業のうち`}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {absent.map((c) => (
          <button
            key={c.code + c.when}
            type="button"
            onClick={() => onOpen(c)}
            className="cursor-pointer rounded-[4px] border border-border bg-transparent px-2.5 py-1.5 text-[13px]"
          >
            {c.subject} <b className="text-error">{`欠 ${absences(c)}`}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function Table({ courses, onOpen }: { courses: AttendanceCourse[]; onOpen: (c: AttendanceCourse) => void }) {
  const max = Math.max(...courses.map((c) => c.sessions.length));
  return (
    <div className="overflow-x-auto max-[767px]:hidden">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-normal text-muted-foreground">
            <th className="px-3 py-2 font-normal">曜日時限</th>
            <th className="px-3 py-2 font-normal">授業科目</th>
            <th className="px-3 py-2 text-right font-normal">出席率</th>
            {Array.from({ length: max }, (_, i) => (
              <th key={i} className="px-1 py-2 text-center font-normal">{`${i + 1}回`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.code + c.when} className="border-b border-border last:border-b-0">
              <td className="w-16 whitespace-nowrap px-3 py-2 align-top text-[12.5px] text-muted-foreground">{c.when}</td>
              <td className="px-3 py-2 align-top">
                <button type="button" onClick={() => onOpen(c)} className="cursor-pointer border-0 bg-transparent p-0 text-left font-bold hover:underline">
                  {c.subject}
                </button>
                <div className="text-[11.5px] text-muted-foreground">{`${c.code}　${c.teacher}`}</div>
              </td>
              <td className="px-3 py-2 text-right align-top font-bold tabular-nums">{rateText(c)}</td>
              {Array.from({ length: max }, (_, i) => {
                const m = c.sessions[i];
                return (
                  <td key={i} className="px-1 py-2 text-center align-top">
                    <div className="text-[10px] tabular-nums text-muted-foreground">{m?.date}</div>
                    {m && <Mark kind={m.kind} label={m.label} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cards({ courses, onOpen }: { courses: AttendanceCourse[]; onOpen: (c: AttendanceCourse) => void }) {
  return (
    <div className="flex flex-col gap-2 p-3 min-[768px]:hidden">
      {courses.map((c) => (
        <button
          key={c.code + c.when}
          type="button"
          onClick={() => onOpen(c)}
          className="flex cursor-pointer flex-col gap-1 rounded-[4px] border border-border bg-card px-3 py-2.5 text-left"
        >
          <span className="flex items-baseline justify-between gap-2">
            <b>{c.subject}</b>
            <b className={`tabular-nums ${absences(c) > 0 ? "text-error" : ""}`}>{rateText(c)}</b>
          </span>
          <span className="text-xs text-muted-foreground">{absences(c) > 0 ? `${c.when}、欠席 ${absences(c)}` : c.when}</span>
          <span className="flex flex-wrap gap-0.5">
            {c.sessions.map((m, i) => <Mark key={i} kind={m.kind} label={m.label} size={20} date={m.date} />)}
          </span>
        </button>
      ))}
    </div>
  );
}

function Content({ attendance, onOpen }: { attendance: Attendance; onOpen: (c: AttendanceCourse) => void }) {
  const { courses } = attendance;
  return (
    <div className="flex flex-col gap-3">
      <Summary courses={courses} onOpen={onOpen} />
      <section className="overflow-hidden rounded-[4px] border border-border bg-card">
        <Legend />
        {courses.length === 0 ? (
          <EmptyState title="この学期の授業はありません" />
        ) : (
          <>
            <Table courses={courses} onOpen={onOpen} />
            <Cards courses={courses} onOpen={onOpen} />
          </>
        )}
      </section>
    </div>
  );
}

export function AttendanceScreen({ client, initial }: Props) {
  const { status, attendance, error, setTermKey, setBaseDate, retry } = useAttendance(client, initial);
  const [course, setCourse] = useState<CourseKey | null>(null);
  const loading = status === "loading";
  const options = attendance ? termOptions(attendance) : [];
  const open = (c: AttendanceCourse) => setCourse({ title: c.subject, code: c.code });
  useBackClose(course !== null, () => setCourse(null)); // ブラウザの戻るでも引き出しを閉じる

  return (
    <div className="flex flex-col gap-3 p-4">
      {attendance && (
        <div className={`${box} flex flex-wrap items-end gap-4`}>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">開講年度学期</span>
            <Select label="開講年度学期" value={attendance.termKey} options={options} disabled={loading} onChange={setTermKey} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">出席率基準日</span>
            <DatePicker label="出席率基準日" value={attendance.baseDate} disabled={loading} onChange={setBaseDate} />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {(["PDF", "Excel"] as const).map((t) => (
              <Button key={t} variant="secondary" disabled={loading || !attendance.exports.includes(t)} onClick={() => void exportFile(client, "出席確認", t)}>
                {`${t} で出力`}
              </Button>
            ))}
          </div>
        </div>
      )}
      {status === "error" && <ErrorNotice title="出席を読み込めませんでした" message={error ?? ""} onRetry={retry} />}
      {loading && !attendance && <PageLoading />}
      {attendance && ( // 読み直しに失敗しても、前の表は残す
        <BusyOverlay busy={loading}>
          <Content attendance={attendance} onOpen={open} />
        </BusyOverlay>
      )}
      {course && (
        <CourseDrawer
          key={course.title + course.code}
          client={client}
          course={course}
          onClose={() => setCourse(null)}
          onNav={(label) => {
            setCourse(null);
            void client.navigate(label).catch((e) => { const m = errorMessage(e); if (m) errorToast("画面を開けませんでした", m); });
          }}
        />
      )}
    </div>
  );
}
