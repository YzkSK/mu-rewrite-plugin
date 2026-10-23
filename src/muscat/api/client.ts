import { MuscatDownError } from "./errors";
import { isStateLost, type ResponseKind } from "./expired";
import type { MenuIds } from "./session";
import { createSession } from "./session";
import { applyPartialResponse, buildPartialRequest } from "./partial";
import { parseTimetable } from "./parse/timetable";
import { createQueue } from "./queue";
import { recover, type Fetch } from "./recover";
import type { Timetable } from "./types";

export type MuscatClient = { getTimetable(year?: number): Promise<Timetable> };

const toDoc = (text: string) => new DOMParser().parseFromString(text, "text/html");
const hasTimetable = (d: Document) =>
  !!d.querySelector("#funcForm") && !!d.querySelector('table[class*="classTable"]');
const currentYear = (d: Document) =>
  Number(d.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value);

export function createMuscatClient(deps: {
  fetch: Fetch;
  doc: Document;
  ids: MenuIds;
  now?: () => number;
}): MuscatClient {
  const session = createSession(deps.doc, deps.ids);
  const queue = createQueue();
  let dirty = false; // 部分更新を送ったあとか(開き直すまで、年度の変更は受け付けられない)

  /** POST して本文を返す。状態喪失なら null。 */
  async function post(
    kind: ResponseKind,
    req: { url: string; body: URLSearchParams; headers?: Record<string, string> },
  ): Promise<string | null> {
    const res = await deps.fetch(req.url, {
      method: "POST",
      headers: req.headers ?? { "Content-Type": "application/x-www-form-urlencoded" },
      body: req.body,
      credentials: "include",
    });
    const text = await res.text();
    return isStateLost(kind, res.status, text) ? null : text;
  }

  /** 一連の操作。状態を失ったら false。 */
  async function attempt(year?: number): Promise<boolean> {
    const wantsChange = year !== undefined && year !== currentYear(session.doc);
    // MUSCAT は、メニューから開いた直後の最初の年度変更しか受け付けない(2 回目以降は元の年度のまま返す。実機で確認)。
    // 部分更新のあとに年度を変えるときは、先にメニューから開き直して新しい状態にする
    if (!hasTimetable(session.doc) || (dirty && wantsChange)) {
      const text = await post("page", session.menuRequest("学生時間割表"));
      if (text === null) return false;
      session.adopt(toDoc(text));
      dirty = false;
    }
    if (year !== undefined && year !== currentYear(session.doc)) {
      const form = session.doc.getElementById("funcForm") as HTMLFormElement | null;
      if (!form) return false;
      const text = await post(
        "partial",
        buildPartialRequest(form, "funcForm:search", { "funcForm:nendo_input": String(year) }),
      );
      if (text === null) return false;
      applyPartialResponse(session.doc, text);
      dirty = true;
    }
    return true;
  }

  return {
    getTimetable: (year) =>
      queue(async () => {
        if (!(await attempt(year))) {
          session.adopt(await recover(deps.fetch, deps.now)); // 一度だけやり直す
          if (!(await attempt(year))) throw new MuscatDownError("MUSCAT が応答しません");
        }
        return parseTimetable(session.doc);
      }),
  };
}
