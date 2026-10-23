import type { HomeLesson } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { START, todayRows } from "./todayRows";

const WEEK = "日月火水木金土";

const periodLabel = (ps: number[]) => {
  const s = ps[0]!;
  const e = ps[ps.length - 1]!;
  return s === e ? `${s}限` : `${s}${e - s === 1 ? "・" : "〜"}${e}限`;
};

/** 今日の授業。行は 時限(開始時刻つき)・授業名・教員と教室・授業の掲示の件数 */
export function TodayLessons({ lessons, now }: { lessons: HomeLesson[]; now: Date }) {
  const rows = todayRows(lessons, WEEK[now.getDay()]!);
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        今日の授業 <Chip>{`${now.getMonth() + 1}/${now.getDate()} ${WEEK[now.getDay()]}`}</Chip>
      </h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">今日は授業がありません</p>}
      <ul>
        {rows.map((r, i) => (
          <li key={i} className="flex gap-3 border-b border-border py-2 last:border-b-0">
            <div className="flex w-14 shrink-0 flex-col text-sm font-bold">
              {periodLabel(r.periods)}
              {START[r.periods[0]!] && <small className="font-normal text-muted-foreground">{START[r.periods[0]!]}</small>}
            </div>
            <div className="flex min-w-0 flex-col text-sm">
              <b>{r.title}</b>
              <span className="text-xs text-muted-foreground">
                {[r.teachers.join("、"), r.room].filter(Boolean).join(" ・ ")}
                {r.keijiCount > 0 && <span className="ml-2 font-bold text-primary">{`掲示 ${r.keijiCount}`}</span>}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
