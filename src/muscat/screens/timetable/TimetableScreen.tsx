import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { TimetableGrid } from "./TimetableGrid";
import { useTimetable, type TimetableState } from "./useTimetable";

type Props = { client: MuscatClient; year: number; term?: number; initial?: TimetableState };

export function TimetableScreen({ client, year, term: term0 = 1, initial }: Props) {
  const [term, setTerm] = useState(term0);
  const { status, timetable, error, blocked = [], setYear } = useTimetable(client, year, initial);
  const shownYear = timetable?.year ?? year;
  const noPrev = blocked.includes(shownYear - 1);
  const noNext = blocked.includes(shownYear + 1);
  const entries = timetable?.terms.find((t) => t.term === term)?.entries ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" disabled={status === "loading" || noPrev} onClick={() => setYear(shownYear - 1)}>前の年度</Button>
        <span className="font-bold">{shownYear}年度</span>
        <Button variant="ghost" disabled={status === "loading" || noNext} onClick={() => setYear(shownYear + 1)}>次の年度</Button>
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
        <Card className="overflow-x-auto p-2">
          {status === "loading" && !timetable ? <p className="p-4">読み込み中…</p> : <TimetableGrid entries={entries} />}
        </Card>
      )}
    </div>
  );
}
