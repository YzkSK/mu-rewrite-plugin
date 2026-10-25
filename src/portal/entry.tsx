import { installPreHide, preEpoch, releasePreHide } from "@/muscat/shell/pre";
import { loadShell, loadTop } from "./data";
import { mountPortal, unmountPortal } from "./host";
import { isAppPath, isTargetPath, isTopPath } from "./route";

const FAIL_SAFE_MS = 20_000;

// 開発用: localStorage["mu-dev"]="1" のブラウザだけ、ページの postMessage("mu-dev-reload") で拡張を読み込み直す
try {
  if (localStorage.getItem("mu-dev") === "1")
    window.addEventListener("message", (e) => { if (e.source === window && e.data === "mu-dev-reload") (globalThis as { chrome?: { runtime?: { sendMessage(m: unknown): void } } }).chrome?.runtime?.sendMessage({ type: "mu-dev-reload" }); });
} catch { /* 読めなければ何もしない */ }

// document_start で動く。/dashboard 以下の全ページを描く(描けないページは「元の画面で開く」で外れる)
if (window === window.top && isTargetPath(location.pathname)) {
  type State = "off" | "loading" | "on" | "failed";
  let state: State = "off";
  let token = 0; // 古い非同期処理を無効化する

  const cover = () => {
    installPreHide(document);
    const at = preEpoch();
    setTimeout(() => { if (preEpoch() === at) releasePreHide(document); }, FAIL_SAFE_MS); // 失敗しても元の画面を見せる
  };

  // 書体は届くまで文字を描かない設定なので、定義(link の CSS)が届く前だけ待つ(最大 300ms)
  const release = () => {
    const at = preEpoch();
    const link = document.getElementById("mu-react-font") as HTMLLinkElement | null;
    const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => { link.addEventListener("load", r, { once: true }); link.addEventListener("error", r, { once: true }); });
    void Promise.race([sheet, new Promise((r) => setTimeout(r, 300))]).then(() => { if (preEpoch() === at) releasePreHide(document); });
  };

  const show = async () => {
    const my = ++token;
    state = "loading";
    cover();
    try {
      // 取ったものは data.ts が覚えている。一覧から始めるときはトップを待たない
      const shell = await loadShell();
      const top = isTopPath(location.pathname) ? await loadTop() : null;
      if (my !== token) return;
      mountPortal({ shell, top });
      state = "on";
      release();
    } catch (e) {
      if (my !== token) return;
      console.error("[mu-portal]", e);
      unmountPortal();
      state = "failed"; // 元のUIのまま。トップページを離れるまで再試行しない
      releasePreHide(document);
    }
  };

  const hide = () => {
    token++;
    unmountPortal();
    state = "off";
    releasePreHide(document);
  };

  // 元のポータルは SPA で、隠れたまま動き続ける。URL(パスと ?view=all)が変わったら出し入れする
  const check = () => {
    const app = isAppPath(location);
    if (app && state === "off") void show();
    else if (!app && state !== "off") hide();
  };

  if (isAppPath(location)) cover();
  const run = () => {
    check();
    window.addEventListener("popstate", check);
    setInterval(check, 500);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}
