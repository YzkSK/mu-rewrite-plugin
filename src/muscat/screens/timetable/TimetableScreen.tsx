import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { Button } from "@/ui/Button";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { CourseDrawer } from "../course/CourseDrawer";
import type { CourseKey } from "../course/useCourse";
import { TimetableGrid } from "./TimetableGrid";
import { currentYearTerm, periodOf, todayOf } from "./period";
import { useTimetable, type TimetableState } from "./useTimetable";

type Props = { client: MuscatClient; doc: Document; year: number; term?: number; now?: Date; initial?: TimetableState };

export function TimetableScreen({ client, doc, year, term: term0, now: now0, initial }: Props) {
  // 開いたままでも今日・今の時限が進むように、1 分ごとに時刻を取り直す
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (now0) return;
    const id = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(id);
  }, [now0]);
  const now = now0 ?? clock;
  const cur = currentYearTerm(now);
  // 自分で選ぶまでは今の学期に付いていく(開いたまま学期の境目を越えても)
  const [picked, setTerm] = useState<number | null>(term0 ?? null);
  const [course, setCourse] = useState<CourseKey | null>(null);
  const { status, timetable, error, blocked = [], setYear } = useTimetable(client, year, initial);
  const moving = status === "loading";
  const [dir, setDir] = useState<-1 | 1 | 0>(0); // どちらのボタンを押したか(スピナーを出す側)。初回読み込みはどちらでもない
  const go = (d: -1 | 1) => {
    setDir(d);
    setYear(shownYear + d);
  };
  const shownYear = timetable?.year ?? year;
  const term = picked ?? (shownYear === cur.year ? cur.term : 1);
  const noPrev = blocked.includes(shownYear - 1);
  const noNext = blocked.includes(shownYear + 1);
  const t = timetable?.terms.find((x) => x.term === term);
  const entries = t?.entries ?? [];
  const irregular = t?.irregular ?? [];
  // 合計単位が読めなかったときは、授業(コマは code で重複除去)+ 不定期の単位から数える
  const credits =
    t?.credits ?? [...new Map(entries.map((e) => [e.code, e.credits])).values(), ...irregular.map((r) => r.credits)].reduce((a, b) => a + b, 0);
  const isCurrent = shownYear === cur.year && term === cur.term;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" label="前の年度" loading={moving && dir === -1} disabled={moving || noPrev} onClick={() => go(-1)}>‹</Button>
          <span className="font-bold">{shownYear}年度</span>
          <Button variant="ghost" label="次の年度" loading={moving && dir === 1} disabled={moving || noNext} onClick={() => go(1)}>›</Button>
        </div>
        <div role="tablist" className="flex overflow-hidden rounded-[4px] border border-input">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === term}
              onClick={() => setTerm(n)}
              className={`h-[30px] cursor-pointer border-0 px-3 text-sm ${n === term ? "bg-primary text-primary-foreground" : "bg-card text-foreground"} ${n > 1 ? "border-l border-input" : ""}`}
            >
              {`${n}学期`}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">{`合計 ${credits.toFixed(1)} 単位`}</span>
        {(noPrev || noNext) && <span className="text-sm text-muted-foreground">{noPrev ? "これより前の年度はありません" : "これより後の年度はありません"}</span>}
      </div>
      {status === "error" ? (
        <ErrorNotice title="時間割を読み込めませんでした" message={error ?? ""} />
      ) : (
        <BusyOverlay busy={moving && !!timetable}>
          {status === "loading" && !timetable ? (
            <PageLoading />
          ) : (
            <TimetableGrid
              // 学期・年度を替えたら曜日のタブも選び直す
              key={`${shownYear}-${term}`}
              entries={entries}
              irregular={irregular}
              today={isCurrent ? todayOf(now) : null}
              period={isCurrent && todayOf(now) ? periodOf(now) : null}
              onOpen={setCourse}
            />
          )}
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
            void client.navigate(label).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
