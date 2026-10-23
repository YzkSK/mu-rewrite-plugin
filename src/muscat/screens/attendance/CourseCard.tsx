import type { AttendanceCourse } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { SessionMarks } from "./SessionMarks";

export function CourseCard({ course }: { course: AttendanceCourse }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">{course.subject}</h2>
        <span className="whitespace-nowrap text-sm">出席率 {course.rate === null ? "-" : `${course.rate}%`}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {course.when}
        {course.teacher && ` / ${course.teacher}`}
      </p>
      <SessionMarks sessions={course.sessions} />
    </Card>
  );
}
