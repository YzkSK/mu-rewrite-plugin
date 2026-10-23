import type { GradeCourse } from "@/muscat/api/types";
import { Chip } from "@/ui/Chip";

/** S/A は強調、D/X は警告色。それ以外は普通 */
function gradeTone(grade: string): string {
  if (grade === "S" || grade === "A") return "font-bold text-primary";
  if (grade === "D" || grade === "X") return "font-bold text-error";
  return "";
}

export function GradeRow({ course, showTerm }: { course: GradeCourse; showTerm?: boolean }) {
  const meta = [
    showTerm && course.year !== null ? `${course.year}年度 ${course.term}` : "",
    course.credits === null ? "" : `${course.credits}単位`,
    course.teacher,
  ].filter(Boolean);
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1">
          <span>{course.name}</span>
          {course.online && <Chip>オンライン</Chip>}
        </p>
        <p className="text-xs text-muted-foreground">{meta.join(" / ")}</p>
      </div>
      {course.grade ? (
        <span className={`text-2xl ${gradeTone(course.grade)}`}>{course.grade}</span>
      ) : (
        <span className="whitespace-nowrap text-sm text-muted-foreground">履修中</span>
      )}
    </li>
  );
}
