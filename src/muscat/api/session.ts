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
};

export function createSession(doc: Document, ids: MenuIds): Session {
  const s: Session = {
    doc,
    ids,
    adopt(next) {
      s.doc = next;
    },
    menuRequest(label) {
      const id = s.ids[label];
      if (!id) throw new Error(`メニュー ID がありません: ${label}`);
      const form = s.doc.getElementById("menuForm") as HTMLFormElement | null;
      if (!form) throw new Error("menuForm がありません");
      // 送り先は直前の応答の menuForm の action
      const url = new URL(form.getAttribute("action") ?? "", location.href).href;
      const body = new URLSearchParams();
      for (const [k, v] of new FormData(form)) if (typeof v === "string") body.set(k, v);
      body.set("rx.sync.source", "menuForm:mainMenu");
      body.set("menuForm:mainMenu", "menuForm:mainMenu");
      body.set("menuForm:mainMenu_menuid", id);
      return { url, body };
    },
  };
  return s;
}
