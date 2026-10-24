import * as bg from "./shell/bg";
import { mountApp } from "./shell/mountApp";
import { nativeNav } from "./shell/nativeNav";
import { installPreHide, preEpoch, releasePreHide } from "./shell/pre";
import { mountScreen, unmountScreen } from "./shell/screenHost";
import { watchScreen } from "./shell/watchScreen";

const FAIL_SAFE_MS = 20_000;

// document_start で動く。iframe と /uprx/ 以外は何もしない(旧版と同じ)
if (window === window.top && location.pathname.startsWith("/uprx/")) {
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
        const at = preEpoch(); // 待つ間に次の画面へ移って覆いが掛け直されたら、それは外さない
        // 書体が届く前に外すと、文字が別の書体から切り替わってちらつく。待つのは最大 600ms。
        // 書体の CSS(link)がまだ届いていないと fonts.load はすぐ終わるので、先に link の読み込みを待つ
        const link = document.getElementById("mu-react-font") as HTMLLinkElement | null;
        const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => { link.addEventListener("load", r, { once: true }); link.addEventListener("error", r, { once: true }); });
        const font = sheet.then(() => document.fonts.load('400 1em "IBM Plex Sans JP"', "あ")).catch(() => undefined);
        void Promise.race([font, new Promise((r) => setTimeout(r, 600))]).then(() => {
          mark("font");
          if (preEpoch() === at) releasePreHide(document);
        });
      },
      now: Date.now,
    }).catch(() => releasePreHide(document));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}
