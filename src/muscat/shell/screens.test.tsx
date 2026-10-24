import { expect, test } from "bun:test";
import { AttendanceScreen } from "@/muscat/screens/attendance/AttendanceScreen";
import { fakeClient } from "@/muscat/screens/fakeClient";
import { GenericScreen } from "@/muscat/screens/generic/GenericScreen";
import { GradesScreen } from "@/muscat/screens/grades/GradesScreen";
import { HealthInfoScreen } from "@/muscat/screens/health/HealthInfoScreen";
import { HomeScreen } from "@/muscat/screens/home/HomeScreen";
import { NewsScreen } from "@/muscat/screens/news/NewsScreen";
import { StudentInfoScreen } from "@/muscat/screens/student/StudentInfoScreen";
import { SyllabusScreen } from "@/muscat/screens/syllabus/SyllabusScreen";
import { TeacherScheduleScreen } from "@/muscat/screens/teacherSchedule/TeacherScheduleScreen";
import { TimetableScreen } from "@/muscat/screens/timetable/TimetableScreen";
import { SCREENS } from "./screens";

const client = fakeClient();
const doc = new DOMParser().parseFromString(`<input name="funcForm:nendo_input" value="2024">`, "text/html");

// 画面コード → [メニューの表示テキスト(= title)、描く部品]。画面を足したら、ここに 1 行足す
const EXPECTED = {
  Kmd008: ["学生時間割表", TimetableScreen],
  Atb005: ["出席確認", AttendanceScreen],
  Kmg006: ["成績照会", GradesScreen],
  Bsb004: ["学籍情報照会", StudentInfoScreen],
  Bsb007: ["健康診断情報照会", HealthInfoScreen],
  Bsa004: ["個人設定", GenericScreen],
  Bsd007: ["掲示板", NewsScreen],
  Kmh006: ["シラバス", SyllabusScreen],
  Bsa011: ["教員スケジュール", TeacherScheduleScreen],
  Pky001: ["ホーム", HomeScreen],
} as const;

test("登録されている画面が、期待の一覧と一致する", () => {
  expect(Object.keys(SCREENS).sort()).toEqual(Object.keys(EXPECTED).sort());
});

for (const [code, [title, component]] of Object.entries(EXPECTED)) {
  test(`${code}: title は ${title}、描く部品が一致する`, () => {
    expect(SCREENS[code]!.title).toBe(title);
    expect((SCREENS[code]!.render(client, doc) as { type: unknown }).type).toBe(component);
  });
}

test("時間割は、ページの年度を初期値に渡す", () => {
  const tt = SCREENS.Kmd008!.render(client, doc) as { props: { year: number } };
  expect(tt.props.year).toBe(2024);
});
