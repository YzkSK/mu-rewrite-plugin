import { expect, test } from "bun:test";
import type { MuscatClient } from "@/muscat/api/client";
import { AttendanceScreen } from "@/muscat/screens/attendance/AttendanceScreen";
import { GradesScreen } from "@/muscat/screens/grades/GradesScreen";
import { StudentInfoScreen } from "@/muscat/screens/student/StudentInfoScreen";
import { TimetableScreen } from "@/muscat/screens/timetable/TimetableScreen";
import { SCREENS } from "./screens";

const client = {} as MuscatClient;

test("登録されているのは Kmd008 と Atb005 と Kmg006 と Bsb004 だけ", () => {
  expect(Object.keys(SCREENS).sort()).toEqual(["Atb005", "Bsb004", "Kmd008", "Kmg006"]);
});

test("title はメニューの表示テキストと同じ", () => {
  expect(SCREENS.Kmd008!.title).toBe("学生時間割表");
  expect(SCREENS.Atb005!.title).toBe("出席確認");
  expect(SCREENS.Kmg006!.title).toBe("成績照会");
  expect(SCREENS.Bsb004!.title).toBe("学籍情報照会");
  expect((SCREENS.Bsb004!.render(client, new DOMParser().parseFromString("", "text/html")) as { type: unknown }).type).toBe(StudentInfoScreen);
});

test("render は画面の要素を返す", () => {
  const doc = new DOMParser().parseFromString(`<input name="funcForm:nendo_input" value="2024">`, "text/html");
  const tt = SCREENS.Kmd008!.render(client, doc) as { type: unknown; props: { year: number } };
  expect(tt.type).toBe(TimetableScreen);
  expect(tt.props.year).toBe(2024);
  expect((SCREENS.Atb005!.render(client, doc) as { type: unknown }).type).toBe(AttendanceScreen);
  expect((SCREENS.Kmg006!.render(client, doc) as { type: unknown }).type).toBe(GradesScreen);
});
