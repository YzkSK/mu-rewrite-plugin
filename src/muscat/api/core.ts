import { track } from "./busy";
import type { WaitOpts, WaitResult } from "./driver/busy";
import { drive, type DriveStep } from "./driver/drive";
import { MuscatDownError } from "./errors";
import { isStateLost, type ResponseKind } from "./expired";
import { applyPartialResponse, buildPartialRequest } from "./partial";
import { createQueue } from "./queue";
import { fetchHome, recover, type Fetch } from "./recover";
import { createSession, type MenuIds, type MenuLabel } from "./session";

export type Ctx = {
  /** 今のセッションの Document */
  doc(): Document;
  /** isReady が満たされていれば何もしない。満たされなければメニューを POST して取り込む。状態喪失なら false */
  open(label: MenuLabel, isReady: (d: Document) => boolean): Promise<boolean>;
  /** 部分更新を送って取り込む。状態喪失なら false */
  partial(
    formId: string,
    source: string,
    opts?: { render?: string; extra?: Record<string, string | null> },
  ): Promise<boolean>;
  /** session の Document がホーム(#portalCont)ならそのまま。違えば取り直して取り込む。ホームでなければ false */
  openHome(): Promise<boolean>;
};

/** 生きたページ(拡張機能が動いている document)そのものを読み、操作する */
export type LiveCtx = { doc: Document; drive(steps: DriveStep[], opts?: WaitOpts): Promise<WaitResult> };

export type Core = {
  run<T>(op: (ctx: Ctx) => Promise<T | null>): Promise<T>;
  /** 直列キューに積むだけ。復帰もやり直しもしない(生きたページが壊れたら、エラーをそのまま投げる) */
  runLive<T>(op: (live: LiveCtx) => Promise<T>): Promise<T>;
};

const toDoc = (text: string) => new DOMParser().parseFromString(text, "text/html");

export function createCore(deps: { fetch: Fetch; doc: Document; ids: MenuIds; now?: () => number }): Core {
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

  const ctx: Ctx = {
    doc: () => session.doc,
    async open(label, isReady) {
      if (isReady(session.doc)) return true;
      const text = await post("page", session.menuRequest(label));
      if (text === null) return false;
      session.adopt(toDoc(text));
      return true;
    },
    async partial(formId, source, opts = {}) {
      const form = session.doc.getElementById(formId) as HTMLFormElement | null;
      if (!form) return false;
      const text = await post("partial", buildPartialRequest(form, source, opts.extra, opts.render));
      if (text === null) return false;
      applyPartialResponse(session.doc, text);
      return true;
    },
    async openHome() {
      if (session.doc.getElementById("portalCont")) return true;
      session.adopt(await fetchHome(deps.fetch));
      return !!session.doc.getElementById("portalCont");
    },
  };

  return {
    // 待ち行列に積んだ時点から busy にする(順番待ちも「読み込み中」に見せる)
    runLive: (op) => track(() => queue(() => op({ doc: deps.doc, drive: (steps, opts) => drive(deps.doc, steps, opts) }))),
    run: (op) =>
      track(() =>
        queue(async () => {
          const first = await op(ctx);
          if (first !== null) return first;
          session.adopt(await recover(deps.fetch, deps.now)); // 一度だけやり直す
          const second = await op(ctx);
          if (second === null) throw new MuscatDownError("MUSCAT が応答しません");
          return second;
        }),
      ),
  };
}
