import type { ReactNode } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { AttendanceScreen } from "@/muscat/screens/attendance/AttendanceScreen";
import { GenericScreen } from "@/muscat/screens/generic/GenericScreen";
import { GradesScreen } from "@/muscat/screens/grades/GradesScreen";
import { HealthInfoScreen } from "@/muscat/screens/health/HealthInfoScreen";
import { HomeScreen } from "@/muscat/screens/home/HomeScreen";
import { NewsScreen } from "@/muscat/screens/news/NewsScreen";
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
      return <TimetableScreen client={client} year={year} />;
    },
  },
  Atb005: { title: "出席確認", render: (client) => <AttendanceScreen client={client} /> },
  Kmg006: { title: "成績照会", render: (client) => <GradesScreen client={client} /> },
  Bsb004: { title: "学籍情報照会", render: (client) => <StudentInfoScreen client={client} /> },
  Bsb007: { title: "健康診断情報照会", render: (client) => <HealthInfoScreen client={client} /> },
  Bsa004: genericScreen("個人設定"),
  Bsd007: { title: "掲示板", render: (client, doc) => <NewsScreen client={client} doc={doc} /> },
  Pky001: { title: "ホーム", render: (client, doc) => <HomeScreen client={client} doc={doc} /> },
};
