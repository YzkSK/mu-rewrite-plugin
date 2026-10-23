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
  const run = () =>
    void mountApp(document, {
      bg,
      storage: sessionStorage,
      pathname: location.pathname,
      replace: (url) => location.replace(url),
      mount: mountScreen,
      unmount: unmountScreen,
      nav: nativeNav,
      // URL は画面遷移後も変わらず、#wrap ごと差し替わるので、見出しの画面コードを見張って出し入れする
      watch: (doc, onChange) => watchScreen(doc, onChange),
      release: () => releasePreHide(document),
      now: Date.now,
    }).catch(() => releasePreHide(document));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}
