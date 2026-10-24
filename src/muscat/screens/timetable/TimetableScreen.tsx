import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { Button } from "@/ui/Button";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { TimetableGrid } from "./TimetableGrid";
import { useTimetable, type TimetableState } from "./useTimetable";

type Props = { client: MuscatClient; year: number; term?: number; initial?: TimetableState };

export function TimetableScreen({ client, year, term: term0 = 1, initial }: Props) {
  const [term, setTerm] = useState(term0);
  const { status, timetable, error, blocked = [], setYear } = useTimetable(client, year, initial);
  const moving = status === "loading";
  const [dir, setDir] = useState<-1 | 1>(1); // どちらのボタンを押したか(スピナーを出す側)
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
            {status === "loading" && !timetable ? <PageLoading /> : <TimetableGrid entries={entries} />}
          </Card>
        </BusyOverlay>
      )}
    </div>
  );
}
