import { installPreHide, preEpoch, releasePreHide } from "@/muscat/shell/pre";
import { blockNativeScripts } from "@/ui/block";
import { fetchUserName, setSesskey } from "./api";
import { mountLms, mountLmsError, mountLmsGate, unmountLms } from "./host";
import { clearLoggedOut, clearTried, decide, isLoggedIn, LOGIN_URL, markTried, peekLoggedOut, peekTried, readSesskey, readUserId, watchLogout } from "./login";
import { courseName } from "@/portal/lib/lms";
import { readCoursePage } from "./course";
import { isAppPath, routeOf } from "./route";

const FAIL_SAFE_MS = 20_000;

// 開発用: localStorage["mu-dev"]="1" のブラウザだけ、ページの postMessage("mu-dev-reload") で拡張を読み込み直す
try {
  if (localStorage.getItem("mu-dev") === "1")
    window.addEventListener("message", (e) => { if (e.source === window && e.data === "mu-dev-reload") (globalThis as { chrome?: { runtime?: { sendMessage(m: unknown): void } } }).chrome?.runtime?.sendMessage({ type: "mu-dev-reload" }); });
} catch { /* 読めなければ何もしない */ }

if (window === window.top) {
  // 対象外のページでも、元の画面のユーザーメニューからのログアウトを拾う
  watchLogout(document);

  // document_start で動く。ホームだけ描く。元のアプリの script は止める(「元の LMS で開く」で外れ、止めない)
  if (isAppPath(location)) {
    type State = "loading" | "on" | "failed";
    let state: State = "loading";

    // 読めなかったとき。元のアプリは止めてあるので、渡さずに失敗の画面を出す
    const fail = () => {
      unmountLms();
      mountLmsError();
      state = "failed";
      release();
    };

    // 書体は届くまで文字を描かない設定なので、定義(link の CSS)が届く前だけ待つ(最大 300ms)
    const release = () => {
      const at = preEpoch();
      const link = document.getElementById("mu-react-font") as HTMLLinkElement | null;
      const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => { link.addEventListener("load", r, { once: true }); link.addEventListener("error", r, { once: true }); });
      void Promise.race([sheet, new Promise((r) => setTimeout(r, 300))]).then(() => { if (preEpoch() === at) releasePreHide(document); });
    };

    // Moodle の script は古い同期の形だが、実行前に止まる(実機で確認: 12 個とも止まり、最初のインラインが作る M も未定義)
    blockNativeScripts(document);
    installPreHide(document);
    const at = preEpoch();
    setTimeout(() => {
      if (preEpoch() !== at) return;
      if (state === "loading") fail(); else releasePreHide(document); // 待ちきれなければ失敗の画面
    }, FAIL_SAFE_MS);

    const show = async () => {
      const d = decide({ loggedIn: isLoggedIn(document), loggedOutAt: peekLoggedOut(), triedAt: peekTried(), now: Date.now() });
      if (d === "login") {
        markTried(); // SSO から戻っても未ログインなら、繰り返さず失敗の画面にする。覆いは外さない
        location.replace(LOGIN_URL);
        return;
      }
      if (d !== "app") {
        mountLmsGate(d);
        state = "failed";
        release();
        return;
      }
      clearLoggedOut();
      clearTried();
      try {
        setSesskey(readSesskey(document) ?? "");
        const id = readUserId(document);
        const name = id === null ? null : await fetchUserName(id).catch((e) => { console.error("[mu-lms]", e); return null; });
        if (state !== "loading") return;
        // ページを読むのはここだけ(画面には渡す)。mount より前に読む
        const course = routeOf(location.pathname) === "course" ? readCoursePage(document, location.search) : null;
        mountLms(name || null, id, course);
        document.title = course ? `${courseName(course.name) || "コース"} | MU-LMS` : "ホーム | MU-LMS";
        state = "on";
        release();
      } catch (e) {
        console.error("[mu-lms]", e);
        if (state === "loading") fail();
      }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void show(), { once: true });
    else void show();
  }
}
