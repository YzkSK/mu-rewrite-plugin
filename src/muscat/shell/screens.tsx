import type { ReactNode } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { AttendanceScreen } from "@/muscat/screens/attendance/AttendanceScreen";
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
};
