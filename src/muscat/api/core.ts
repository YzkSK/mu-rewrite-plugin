import { track } from "./busy";
import type { WaitResult } from "./driver/busy";
import type { DriveStep } from "./driver/drive";
import { MuscatDownError, SupersededError } from "./errors";
import { isStateLost, type ResponseKind } from "./expired";
import { HOME_LABEL, LOGOUT_URL, SETTING_LABEL } from "./labels";
import { applyPartialResponse, buildPartialRequest } from "./partial";
import { createQueue } from "./queue";
import { fetchHome, recover, type Fetch } from "./recover";
import { createSession, type MenuIds, type MenuLabel } from "./session";
import { buildAbRequest, parseAb } from "./virtual/ab";
import { pageRequest, setBase, type Req } from "./virtual/req";
import { copyStateFields } from "./virtual/sync";
import { vdrive } from "./virtual/vdrive";
import { behaviorOf, scanWidgets } from "./virtual/widgets";


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

/** 今の画面(session の Document。生きたページではない)を読み、操作する。操作は元の部品と同じ通信を自分で送る */
export type LiveCtx = { doc: Document; drive(steps: DriveStep[]): Promise<WaitResult> };

/** いま見せている画面。移動のたびに seq が増え、別のオブジェクトになる */
export type Shown = { doc: Document; seq: number };

export type Core = {
  run<T>(op: (ctx: Ctx) => Promise<T | null>): Promise<T>;
  /**
   * run と同じだが、読むためだけに別の画面を開く操作用。終わったら session の Document を元に戻し、見せている画面の Document は変えない
   * (JSF は複数のビューを持つので、見せている画面の ViewState は有効なまま)。ただし見せている画面がホームで、操作がホームを取り直したときは、
   * 見せているホームは作り直さず、取り直したホームの隠し項目(rx-* と ViewState)を写す(別の画面を POST したあと、ホームの元のボタンは
   * 取り直した値でないと効かない。実機で確認)
   */
  aside<T>(op: (ctx: Ctx) => Promise<T | null>): Promise<T>;
  /** 直列キューに積むだけ。復帰もやり直しもしない(op のエラーはそのまま投げる) */
  runLive<T>(op: (live: LiveCtx) => Promise<T>): Promise<T>;
  /**
   * 画面を移る(メニューの項目名・ホーム・個人設定)。直列キューに積み、応答を新しい画面にする。
   * 待つ間にもっと新しい移動が来たら、古い移動の結果と、移動より前に積まれて動き出していない操作は捨てる
   */
  navigate(label: string): Promise<void>;
  /** ログアウトして、移る先の URL を返す(移るのは呼んだ側) */
  logout(): Promise<string>;
  shown(): Shown;
  subscribe(listener: () => void): () => void;
};

const toDoc = (text: string) => new DOMParser().parseFromString(text, "text/html");

/** 開発用: localStorage["mu-dev"]="1" のときだけ、送る POST の本文をコンソールに出す(元のページの通信と見比べる)。状態の札は伏せる */
function devLog(req: { url: string; body: URLSearchParams; headers?: Record<string, string> }): void {
  try {
    if (localStorage.getItem("mu-dev") !== "1") return;
    const mask = (k: string, v: string) => (/ViewState|token|rx-/i.test(k) ? "<" + (k.split(/[:.]/).pop() ?? k) + ">" : v);
    console.debug("[mu-post]", JSON.stringify({ u: new URL(req.url, location.href).pathname, h: req.headers ?? {}, b: [...req.body].map(([k, v]) => `${k}=${mask(k, v)}`) }));
  } catch { /* 出せなくても送る */ }
}

export function createCore(deps: { fetch: Fetch; doc: Document; ids: MenuIds; now?: () => number }): Core {
  const session = createSession(deps.doc, deps.ids);
  const queue = createQueue();
  // 画面の移動を頼む・画面が替わるたびに epoch を増やす。操作は積んだときの epoch を持ち、動き出すときに違っていたら捨てる。
  // 移動の完了待ちの間(moving > 0)に積まれた操作は、移る前の画面のものなので、いつも捨てる(stamp が -1)
  let epoch = 0;
  let moving = 0;
  let newest = 0; // 最後に頼んだ画面の移動の番号
  let shown: Shown = { doc: session.doc, seq: 0 };
  const listeners = new Set<() => void>();

  const stamp = () => (moving > 0 ? -1 : epoch);
  const publish = (doc: Document) => {
    epoch++;
    shown = { doc, seq: shown.seq + 1 };
    listeners.forEach((l) => l());
  };
  const live = (e: number) => {
    if (e !== epoch) throw new SupersededError("別の画面へ移りました");
  };

  /** POST して本文と最後の応答の URL を返す。状態喪失なら text は null。 */
  async function postRaw(kind: ResponseKind, req: Req): Promise<{ text: string | null; url: string }> {
    devLog(req);
    const res = await deps.fetch(req.url, {
      method: "POST",
      headers: req.headers ?? { "Content-Type": "application/x-www-form-urlencoded" },
      body: req.body,
      credentials: "include",
    });
    const text = await res.text();
    return { text: isStateLost(kind, res.status, text) ? null : text, url: res.url || req.url };
  }
  const post = async (kind: ResponseKind, req: Req): Promise<string | null> => (await postRaw(kind, req)).text;

  /** 画面ごと替わる POST。応答を session に取り込み、その Document を返す(相対の action は応答の URL が基準)。状態喪失なら null */
  async function loadPage(req: Req): Promise<Document | null> {
    const { text, url } = await postRaw("page", req);
    if (text === null) return null;
    const doc = toDoc(text);
    setBase(doc, url);
    session.adopt(doc);
    return doc;
  }

  /** 状態喪失(null)なら一度だけ復帰してやり直す */
  async function recovering<T>(op: () => Promise<T | null>): Promise<T> {
    const first = await op();
    if (first !== null) return first;
    session.adopt(await recover(deps.fetch, deps.now));
    const second = await op();
    if (second === null) throw new MuscatDownError("MUSCAT が応答しません");
    return second;
  }

  const ctx: Ctx = {
    doc: () => session.doc,
    async open(label, isReady) {
      if (isReady(session.doc)) return true;
      return (await loadPage(session.menuRequest(label))) !== null;
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
    runLive: (op) => {
      const e = stamp();
      return track(() =>
        queue(() => {
          live(e);
          const doc = session.doc;
          return op({
            doc,
            drive: (steps) =>
              vdrive(doc, steps, {
                post,
                // 応答が画面ごとの置き換え(ViewRoot)なら、新しい画面として取り込んで見せる
                replace: (next) => {
                  session.adopt(next);
                  publish(next);
                },
                page: async (req) => {
                  const next = await loadPage(req);
                  if (!next) throw new MuscatDownError("MUSCAT が応答しません");
                  publish(next);
                },
              }),
          });
        }),
      );
    },
    run: (op) => {
      const e = stamp();
      return track(() =>
        queue(async () => {
          live(e);
          return recovering(() => op(ctx));
        }),
      );
    },
    aside: (op) => {
      const e = stamp();
      return track(() =>
        queue(async () => {
          live(e);
          const keep = session.doc;
          const isHome = (d: Document) => !!d.getElementById("portalCont");
          try {
            return await recovering(() => op(ctx));
          } finally {
            const fresh = session.doc;
            if (fresh !== keep) {
              // 見せているホームは作り直さず(授業ドロワーが閉じる)、取り直したホームの隠し項目だけ写す
              if (isHome(shown.doc) && isHome(fresh)) copyStateFields(shown.doc, fresh);
              session.adopt(isHome(shown.doc) && isHome(fresh) ? shown.doc : keep);
            }
          }
        }),
      );
    },
    navigate: (label) => {
      const n = ++newest;
      epoch++; // これより前に積まれた操作は、動き出していなければ捨てる
      moving++;
      let settled = false;
      const settle = () => {
        if (!settled) moving--;
        settled = true;
      };
      return track(() =>
        queue(async () => {
          try {
            if (n !== newest) return; // もっと新しい移動が積まれた
            const request = () =>
              label === HOME_LABEL ? session.headerRequest("headerForm:logo") : label === SETTING_LABEL ? session.headerRequest("headerForm:setting") : session.menuRequest(label as MenuLabel);
            const doc = await recovering(() => loadPage(request()));
            if (n !== newest) return; // 待つ間に新しい移動が来たら、この結果は見せない(session には取り込み済み)
            settle(); // 新しい画面が最初に積む操作は捨てない
            publish(doc);
          } finally {
            settle();
          }
        }),
      );
    },
    logout: () =>
      track(() =>
        queue(async () => {
          // 確認付きのボタンなので、本物の通信は data-pfconfirmcommand(無ければ onclick・部品の click)にある。ab でなければ画面ごとの POST
          const doc = session.doc;
          const btn = doc.getElementById("headerForm:logoutButton");
          const ab = btn && (parseAb(btn.getAttribute("data-pfconfirmcommand") ?? "") ?? parseAb(btn.getAttribute("onclick") ?? "") ?? behaviorOf(scanWidgets(doc), btn.id, "click"));
          if (btn && ab) {
            const text = await post("partial", buildAbRequest(doc, ab, btn));
            return /<redirect\s+url="([^"]*)"/.exec(text ?? "")?.[1] || LOGOUT_URL;
          }
          const form = doc.getElementById("headerForm") as HTMLFormElement | null;
          if (!form) throw new Error("headerForm がありません");
          await post("page", pageRequest(form, "headerForm:logoutButton"));
          return LOGOUT_URL;
        }),
      ),
    shown: () => shown,
    subscribe: (l) => (listeners.add(l), () => void listeners.delete(l)),
  };
}
