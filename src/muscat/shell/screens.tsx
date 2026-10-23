import type { ReactNode } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { AttendanceScreen } from "@/muscat/screens/attendance/AttendanceScreen";
import { GradesScreen } from "@/muscat/screens/grades/GradesScreen";
import { HealthInfoScreen } from "@/muscat/screens/health/HealthInfoScreen";
import { StudentInfoScreen } from "@/muscat/screens/student/StudentInfoScreen";
import { TimetableScreen } from "@/muscat/screens/timetable/TimetableScreen";

export type ScreenDef = { title: string; render(client: MuscatClient, doc: Document): ReactNode };

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
};
