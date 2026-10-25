import { readMenuIds } from "./menuIds";
import { actionOf, pageRequest, type Req } from "./virtual/req";
import { absorbScripts } from "./virtual/widgets";

export type MenuLabel =
  | "掲示板"
  | "学生時間割表"
  | "出席確認"
  | "成績照会"
  | "シラバス"
  | "教員スケジュール"
  | "学籍情報照会"
  | "健康診断情報照会"
  | "安否確認回答"
  | "教室予約(参照のみ)";
export type MenuIds = Partial<Record<MenuLabel, string>>;

export type Session = {
  doc: Document;
  ids: MenuIds;
  adopt(doc: Document): void;
  menuRequest(label: MenuLabel): { url: string; body: URLSearchParams };
  /** ヘッダーのホーム(headerForm:logo)・個人設定(headerForm:setting)・ログアウトの、画面ごと替わる POST */
  headerRequest(source: string): Req;
};

/** 生きたページの複製(以後の読み書きは複製の上だけ。生きたページには触らない) */
const copyOf = (live: Document) => new DOMParser().parseFromString(live.documentElement.outerHTML, "text/html");

export function createSession(live: Document, ids: MenuIds): Session {
  const first = copyOf(live);
  absorbScripts(first);
  const s: Session = {
    doc: first,
    ids,
    adopt(next) {
      absorbScripts(next);
      s.doc = next;
      const found = readMenuIds(next); // ID はログインごと。新しい画面で読めたものを使う
      if (Object.keys(found).length) s.ids = found;
    },
    menuRequest(label) {
      const id = s.ids[label];
      if (!id) throw new Error(`メニュー ID がありません: ${label}`);
      const form = s.doc.getElementById("menuForm") as HTMLFormElement | null;
      if (!form) throw new Error("menuForm がありません");
      // 送り先は直前の応答の menuForm の action
      const url = actionOf(form);
      const body = new URLSearchParams();
      for (const [k, v] of new FormData(form)) if (typeof v === "string") body.set(k, v);
      body.set("rx.sync.source", "menuForm:mainMenu");
      body.set("menuForm:mainMenu", "menuForm:mainMenu");
      body.set("menuForm:mainMenu_menuid", id);
      return { url, body };
    },
    headerRequest(source) {
      const form = s.doc.getElementById("headerForm") as HTMLFormElement | null;
      if (!form) throw new Error("headerForm がありません");
      return pageRequest(form, source);
    },
  };
  return s;
}
