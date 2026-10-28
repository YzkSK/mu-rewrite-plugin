import { installPreHide, preEpoch, releasePreHide } from "@/muscat/shell/pre";
import { loadShell, loadTop } from "./data";
import { blockNativeScripts } from "@/ui/block";
import { mountPortal, mountPortalError, unmountPortal } from "./host";
import { addBackButton } from "@/ui/backButton";
import { closeOriginal, isAppPath, isSkippedPath, isTargetPath, isTopPath, slugOf } from "./route";

const FAIL_SAFE_MS = 20_000;
const TRIED = "mu-portal-login-tried";

/** 未ログインで、60 秒以内に入り直しを試していなければ true(試した印を付ける)。SSO から戻っても未ログインなら繰り返さない */
async function needsLogin(): Promise<boolean> {
  try {
    const r = await fetch("/api/auth/check-logged-in", { credentials: "include" });
    if (!r.ok) return false; // 障害・制限のときは入り直さない
    const j = await r.json();
    // 未ログインは HTTP 200 で user: null(実機で確認)。それ以外の形は入り直さない
    if (j?.user !== null || j?.result?.login) return false;
    const at = Number(sessionStorage.getItem(TRIED));
    if (at && Date.now() - at < 60_000) return false;
    sessionStorage.setItem(TRIED, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

// 開発用: localStorage["mu-dev"]="1" のブラウザだけ、ページの postMessage("mu-dev-reload") で拡張を読み込み直す
try {
  if (localStorage.getItem("mu-dev") === "1")
    window.addEventListener("message", (e) => { if (e.source === window && e.data === "mu-dev-reload") (globalThis as { chrome?: { runtime?: { sendMessage(m: unknown): void } } }).chrome?.runtime?.sendMessage({ type: "mu-dev-reload" }); });
} catch { /* 読めなければ何もしない */ }

// document_start で動く。/dashboard 以下の全ページを描く。元のアプリの script は止める(描けないページは「元の画面で開く」で外れ、止めない)
if (window === window.top && isTargetPath(location.pathname)) {
  type State = "off" | "loading" | "on" | "failed";
  let state: State = "off";
  let token = 0; // 古い非同期処理を無効化する

  // 読めなかったとき。元のアプリは止めてあるので、渡さずに失敗の画面を出す。
  // ただしポータルにログインしていない(ブラウザを開き直した直後など)なら、"/" へ移って SSO で入り直す(元のポータルと同じ。"/" は描かない)
  const fail = () => {
    void needsLogin().then((login) => {
      if (login) location.replace("/");
      else showFailed();
    });
  };
  const showFailed = () => {
    unmountPortal();
    mountPortalError();
    state = "failed";
    release();
  };

  const cover = () => {
    installPreHide(document);
    const at = preEpoch();
    setTimeout(() => {
      if (preEpoch() !== at) return;
      if (state === "loading") { token++; fail(); } else releasePreHide(document); // 待ちきれなければ失敗の画面
    }, FAIL_SAFE_MS);
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
      const [shell, top] = await Promise.all([loadShell(), isTopPath(location.pathname) ? loadTop() : null]);
      if (my !== token) return;
      mountPortal({ shell, top });
      state = "on";
      release();
    } catch (e) {
      if (my !== token) return;
      console.error("[mu-portal]", e);
      fail();
    }
  };

  // 元のアプリは止めてある。元の画面で開くと決めたページへ移るときは、読み込み直して元のアプリを動かす
  let back: HTMLElement | undefined; // 「拡張の画面に戻る」。元のアプリの中で移るたびに、そのページに印があるかで出し入れする
  const check = () => {
    const skip = isSkippedPath(location.pathname);
    if (skip && !back) back = addBackButton(document, () => closeOriginal(slugOf(location.pathname)));
    if (back) back.style.display = skip ? "" : "none";
    const app = isAppPath(location);
    if (app && state === "off") void show();
    else if (!app && state !== "off") location.reload();
  };

  if (isAppPath(location)) {
    blockNativeScripts(document);
    cover();
  }
  const run = () => {
    check();
    window.addEventListener("popstate", check);
    setInterval(check, 500);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}
