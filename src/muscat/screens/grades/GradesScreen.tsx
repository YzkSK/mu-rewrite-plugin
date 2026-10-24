import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { CreditTable } from "./CreditTable";
import { GpaSummary } from "./GpaSummary";
import { GradeFilterBar } from "./GradeFilterBar";
import { GradeList, type GradeView } from "./GradeList";
import { useGrades, type GradesState } from "./useGrades";

export function GradesScreen({ client, initial }: { client: MuscatClient; initial?: GradesState }) {
  const { status, grades, error, setFilter } = useGrades(client, initial);
  const [view, setView] = useState<GradeView>("category");
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !grades && <PageLoading />}
      {grades && (
        <BusyOverlay busy={status === "loading"}>
          <div className="flex flex-col gap-3">
            <GpaSummary gpa={grades.gpa} totals={grades.totals} />
            <GradeFilterBar key={JSON.stringify(grades.filter)} value={grades.filter} busy={status === "loading"} onApply={setFilter} />
            <div className="flex gap-2">
              <Button variant={view === "category" ? "primary" : "ghost"} onClick={() => setView("category")}>分類ごと</Button>
              <Button variant={view === "term" ? "primary" : "ghost"} onClick={() => setView("term")}>年度学期ごと</Button>
            </div>
            <GradeList entries={grades.entries} view={view} />
            <CreditTable credits={grades.credits} />
          </div>
        </BusyOverlay>
      )}
    </div>
  );
}
