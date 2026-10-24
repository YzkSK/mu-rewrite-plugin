import * as bg from "./shell/bg";
import { mountApp } from "./shell/mountApp";
import { nativeNav } from "./shell/nativeNav";
import { installPreHide, releasePreHide } from "./shell/pre";
import { mountScreen, unmountScreen } from "./shell/screenHost";
import { watchScreen } from "./shell/watchScreen";

const FAIL_SAFE_MS = 20_000;

// document_start で動く。iframe と /uprx/ 以外は何もしない(旧版と同じ)
if (window === window.top && location.pathname.startsWith("/uprx/")) {
  installPreHide(document);
  setTimeout(() => releasePreHide(document), FAIL_SAFE_MS); // 失敗しても元の画面を見せる
  // 描画までの各段階の時刻(ページ側から performance.getEntriesByType("mark") で読める。遅さの切り分け用)
  const mark = (name: string) => void performance.mark(`mu:${name}`);
  const run = () => {
    mark("run");
    void mountApp(document, {
      bg: {
        ...bg,
        askRestore: () => bg.askRestore().finally(() => mark("restore")),
      },
      storage: sessionStorage,
      pathname: location.pathname,
      replace: (url) => location.replace(url),
      mount: (screen, key) => {
        mark("mount");
        mountScreen(screen, key);
        requestAnimationFrame(() => mark("paint"));
      },
      unmount: unmountScreen,
      nav: nativeNav,
      // URL は画面遷移後も変わらず、#wrap ごと差し替わるので、見出しの画面コードを見張って出し入れする
      watch: (doc, onChange) => watchScreen(doc, onChange),
      release: () => {
        mark("release");
        releasePreHide(document);
      },
      now: Date.now,
    }).catch(() => releasePreHide(document));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}
