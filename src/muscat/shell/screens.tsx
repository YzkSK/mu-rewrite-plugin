import type { ReactNode } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { AttendanceScreen } from "@/muscat/screens/attendance/AttendanceScreen";
import { GenericScreen } from "@/muscat/screens/generic/GenericScreen";
import { GradesScreen } from "@/muscat/screens/grades/GradesScreen";
import { HealthInfoScreen } from "@/muscat/screens/health/HealthInfoScreen";
import { HomeScreen } from "@/muscat/screens/home/HomeScreen";
import { NewsScreen } from "@/muscat/screens/news/NewsScreen";
import { RoomScreen } from "@/muscat/screens/room/RoomScreen";
import { SettingsScreen } from "@/muscat/screens/settings/SettingsScreen";
import { SyllabusScreen } from "@/muscat/screens/syllabus/SyllabusScreen";
import { TeacherScheduleScreen } from "@/muscat/screens/teacherSchedule/TeacherScheduleScreen";
import { StudentInfoScreen } from "@/muscat/screens/student/StudentInfoScreen";
import { TimetableScreen } from "@/muscat/screens/timetable/TimetableScreen";

export type ScreenDef = { title: string; render(client: MuscatClient, doc: Document): ReactNode };

/** 生きたページを読んで最低限使える形で出す画面。構造がまだ分からない画面はこれで登録する */
export const genericScreen = (title: string): ScreenDef => ({ title, render: (client, doc) => <GenericScreen client={client} doc={doc} /> });

/** 画面コード → React で描く画面。title はメニューの表示テキストと同じ */
export const SCREENS: Record<string, ScreenDef> = {
  Kmd008: {
    title: "学生時間割表",
    render: (client, doc) => {
      const year = Number(doc.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value) || new Date().getFullYear();
      return <TimetableScreen client={client} doc={doc} year={year} />;
    },
  },
  Atb005: { title: "出席確認", render: (client, doc) => <AttendanceScreen client={client} doc={doc} /> },
  Kmg006: { title: "成績照会", render: (client, doc) => <GradesScreen client={client} doc={doc} /> },
  Bsb004: { title: "学籍情報照会", render: (client, doc) => <StudentInfoScreen client={client} doc={doc} /> },
  Bsb007: { title: "健康診断情報照会", render: (client) => <HealthInfoScreen client={client} /> },
  Bsa004: { title: "個人設定", render: (client, doc) => <SettingsScreen client={client} doc={doc} /> },
  Bsd007: { title: "掲示板", render: (client, doc) => <NewsScreen client={client} doc={doc} /> },
  Kmh006: { title: "シラバス", render: (client, doc) => <SyllabusScreen client={client} doc={doc} /> },
  Bsa011: { title: "教員スケジュール",render: (client, doc) => <TeacherScheduleScreen client={client} doc={doc} /> },
  // URL は bsa001 だが、見出しの画面コードは Ksa008
  Ksa008: { title: "教室予約(参照のみ)", render: (client, doc) => <RoomScreen client={client} doc={doc} /> },
  Pky001: { title: "ホーム", render: (client, doc) => <HomeScreen client={client} doc={doc} /> },
};
