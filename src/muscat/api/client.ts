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
    if (!hasTimetable(session.doc)) {
      const text = await post("page", session.menuRequest("学生時間割表"));
      if (text === null) return false;
      session.adopt(toDoc(text));
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
