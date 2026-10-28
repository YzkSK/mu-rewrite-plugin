import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { unblockNativeScripts } from "@/ui/block";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "./api/client";
import { readMenuIds } from "./api/menuIds";
import * as bg from "./shell/bg";
import { boot } from "./shell/boot";
import { LoggedOut } from "./shell/LoggedOut";
import { LOGGED_OUT_KEY } from "./shell/loginPage";
import { mountApp } from "./shell/mountApp";
import { mountShadowRoot } from "./shell/mount";
import { showBackButton } from "@/ui/backButton";
import { closeNative, openNative } from "./shell/native";
import { installPreHide, preEpoch, releasePreHide } from "./shell/pre";
import { mountShell, unmountShell } from "./shell/screenHost";

const FAIL_SAFE_MS = 20_000;

// iframe と /uprx/ 以外は何もしない(旧版と同じ)
// document_start で動く。「元の画面で開く」の印があれば何もせず、なければ元の script を止めて自分で描く(描けないページは run の中で元に戻す)
const mode = window === window.top ? boot({ doc: document, pathname: location.pathname, storage: safeStorage(), now: Date.now() }).mode : "skip";
if (mode === "native") showBackButton(document, () => closeNative(sessionStorage, (url) => location.assign(url)));
if (mode === "app") {
  installPreHide(document);
  setTimeout(() => releasePreHide(document), FAIL_SAFE_MS); // 失敗しても元の画面を見せる
  // 描画までの各段階の時刻(ページ側から performance.getEntriesByType("mark") で読める。遅さの切り分け用)
  const mark = (name: string) => void performance.mark(`mu:${name}`);
  const referrerPath = () => {
    try {
      const u = new URL(document.referrer);
      return u.origin === location.origin ? u.pathname : "";
    } catch {
      return "";
    }
  };
  const unblock = () => void unblockNativeScripts(document);
  const release = () => {
    mark("release");
    const at = preEpoch(); // 待つ間に次の画面へ移って覆いが掛け直されたら、それは外さない
    // 書体は font-display: block(届くまで文字を描かない)なので、書体そのものは待たずに外す(待つと読み込み中の枠が約 0.1 秒見え、
    // ちらついて見えた。実機で測定)。書体の定義(link の CSS)が届く前だと別の書体で描いてから替わるので、それだけ待つ(最大 300ms)
    const link = document.getElementById("mu-react-font") as HTMLLinkElement | null;
    const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => { link.addEventListener("load", r, { once: true }); link.addEventListener("error", r, { once: true }); });
    void Promise.race([sheet, new Promise((r) => setTimeout(r, 300))]).then(() => {
      mark("font");
      if (preEpoch() === at) releasePreHide(document);
    });
  };
  const run = () => {
    mark("run");
    void mountApp(document, {
      bg: {
        ...bg,
        // サイト内の画面から来たなら入り直しの戻りではない(戻りは SSO を経由する)。待つと枠だけの時間が 200ms ほど延びる(実機で測定)
        askRestore: () =>
          (/^\/uprx\/up\//.test(referrerPath()) ? Promise.resolve("") : bg.askRestore()).finally(() => mark("restore")),
      },
      storage: sessionStorage,
      pathname: location.pathname,
      replace: (url) => location.replace(url),
      createClient: (doc) => createMuscatClient({ fetch: window.fetch.bind(window), doc, ids: readMenuIds(doc) }),
      mount: (client, onScreen) => {
        mark("mount");
        mountShell(
          client,
          { assign: (url) => location.assign(url), openNative: () => openNative(sessionStorage, Date.now(), (url) => location.assign(url)) },
          onScreen,
        );
        requestAnimationFrame(() => mark("paint"));
      },
      showLoggedOut: (props) => {
        const enter = () => {
          try {
            sessionStorage.removeItem(LOGGED_OUT_KEY);
            sessionStorage.setItem("mu-m-sso", String(Date.now())); // 失敗して戻ったら、また飛ばさずに案内を出す
          } catch {}
          location.assign("/uprx/ShibbolethAuthServlet");
        };
        const mountPoint = document.createElement("div");
        mountShadowRoot(document, css).appendChild(mountPoint);
        flushSync(() => createRoot(mountPoint).render(<LoggedOut {...props} onEnter={enter} />));
      },
      unblock,
      release,
      now: Date.now,
    }).catch(() => {
      // 描けなかったら、止めていた元の画面をそのまま動かす
      unmountShell();
      unblock();
      releasePreHide(document);
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}

/** sessionStorage が使えない(例外)ときは、印の無いものとして扱う */
function safeStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  try {
    return sessionStorage;
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
}
