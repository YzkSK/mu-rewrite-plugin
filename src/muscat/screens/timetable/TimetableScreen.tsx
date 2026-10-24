import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { Button } from "@/ui/Button";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { nativeNav } from "@/muscat/shell/nativeNav";
import { CourseDrawer } from "../course/CourseDrawer";
import type { CourseKey } from "../course/useCourse";
import { TimetableGrid } from "./TimetableGrid";
import { useTimetable, type TimetableState } from "./useTimetable";

type Props = { client: MuscatClient; doc: Document; year: number; term?: number; initial?: TimetableState };

export function TimetableScreen({ client, doc, year, term: term0 = 1, initial }: Props) {
  const [term, setTerm] = useState(term0);
  const [course, setCourse] = useState<CourseKey | null>(null);
  const { status, timetable, error, blocked = [], setYear } = useTimetable(client, year, initial);
  const moving = status === "loading";
  const [dir, setDir] = useState<-1 | 1 | 0>(0); // どちらのボタンを押したか(スピナーを出す側)。初回読み込みはどちらでもない
  const go = (d: -1 | 1) => {
    setDir(d);
    setYear(shownYear + d);
  };
  const shownYear = timetable?.year ?? year;
  const noPrev = blocked.includes(shownYear - 1);
  const noNext = blocked.includes(shownYear + 1);
  const entries = timetable?.terms.find((t) => t.term === term)?.entries ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" loading={moving && dir === -1} disabled={moving || noPrev} onClick={() => go(-1)}>前の年度</Button>
        <span className="font-bold">{shownYear}年度</span>
        <Button variant="ghost" loading={moving && dir === 1} disabled={moving || noNext} onClick={() => go(1)}>次の年度</Button>
        {(noPrev || noNext) && <span className="text-sm opacity-60">{noPrev ? "これより前の年度はありません" : "これより後の年度はありません"}</span>}
        <span className="ml-auto flex gap-1">
          {[1, 2, 3, 4].map((t) => (
            <Button key={t} variant={t === term ? "primary" : "ghost"} onClick={() => setTerm(t)}>{t}学期</Button>
          ))}
        </span>
      </div>
      {status === "error" ? (
        <Card className="p-4 text-error">{error}</Card>
      ) : (
        <BusyOverlay busy={moving && !!timetable}>
          <Card className="overflow-x-auto p-2">
            {status === "loading" && !timetable ? <PageLoading /> : <TimetableGrid entries={entries} onOpen={(e) => setCourse({ title: e.subject, code: e.code })} />}
          </Card>
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
            nativeNav(doc, label);
          }}
        />
      )}
    </div>
  );
}
