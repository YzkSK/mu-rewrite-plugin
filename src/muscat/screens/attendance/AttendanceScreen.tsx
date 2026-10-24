import type { MuscatClient } from "@/muscat/api/client";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { Select } from "@/ui/Select";
import { CourseCard } from "./CourseCard";
import { useAttendance, type AttendanceState } from "./useAttendance";

type Props = { client: MuscatClient; initial?: AttendanceState };

const yearOf = (key: string) => Number(key.split("|")[0]);

export function AttendanceScreen({ client, initial }: Props) {
  const { status, attendance, error, setTermKey } = useAttendance(client, initial);
  const year = attendance ? yearOf(attendance.termKey) : 0;
  // 252 個は多すぎるので、選択中の年度の 5 年前〜1 年後だけ出す
  const options = (attendance?.terms ?? [])
    .filter((t) => yearOf(t.key) >= year - 5 && yearOf(t.key) <= year + 1)
    .map((t) => ({ value: t.key, label: t.label }));

  return (
    <div className="flex flex-col gap-3 p-4">
      {attendance && (
        <div className="flex flex-wrap items-center gap-2">
          <Select label="学期" value={attendance.termKey} options={options} disabled={status === "loading"} onChange={setTermKey} />
          <span className="text-sm text-muted-foreground">基準日 {attendance.baseDate}</span>
        </div>
      )}
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !attendance && <PageLoading />}
      {status !== "error" && attendance && (
        <BusyOverlay busy={status === "loading"}>
          <div className="flex flex-col gap-3">
            {attendance.courses.length === 0 && <Card className="p-4">この学期の授業はありません</Card>}
            {attendance.courses.map((c) => <CourseCard key={c.code + c.when} course={c} />)}
          </div>
        </BusyOverlay>
      )}
    </div>
  );
}
