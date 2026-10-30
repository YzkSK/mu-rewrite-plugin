import { installPreHide, preEpoch, releasePreHide } from "@/muscat/shell/pre";
import { blockNativeScripts } from "@/ui/block";
import { fetchUserName, setSesskey } from "./api";
import { mountLms, mountLmsError, mountLmsGate, unmountLms } from "./host";
import { clearLoggedOut, clearTried, decide, isLoggedIn, LOGIN_URL, markTried, peekLoggedOut, peekTried, readSesskey, readUserId, watchLogout } from "./login";
import { courseName } from "@/portal/lib/lms";
import { readAssignPage, readSubmitForm } from "./assign";
import { readCoursePage } from "./course";
import { OVERVIEW_URL, readGradeList } from "./grades";
import { titleOf, type View } from "./LmsApp";
import { readDiscussionPage, readForumList } from "./forum";
import { readLtiPage } from "./lti";
import { readQuestionnairePage } from "./questionnaire";
import { readProfile } from "./profile";
import { showBackButton } from "@/ui/backButton";
import { closeOriginal, isAppPath, isSkipped, openOriginal, routeOf } from "./route";

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
  if (!isAppPath(location) && isSkipped(location)) showBackButton(document, closeOriginal);

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
        // 名前は右上に出すだけなので待たずに描き、届いたら差し込む
        const name = id === null ? Promise.resolve(null) : fetchUserName(id).catch((e) => { console.error("[mu-lms]", e); return null; });
        if (state !== "loading") return;
        // ページを読むのはここだけ(画面には渡す)。mount より前に読む
        const route = routeOf(location.pathname, location.search);
        let view: View | null = null;
        let heading = "ホーム";
        if (route === "course") {
          const page = readCoursePage(document, location.search);
          view = { kind: "course", page };
          heading = courseName(page.name) || "コース";
        } else if (route === "courses") {
          view = { kind: "courses" };
          heading = "マイコース";
        } else if (route === "calendar") {
          view = { kind: "calendar", search: location.search };
          heading = "カレンダー";
        } else if (route === "grades") {
          // 一覧のページなら今のページから読む。コースの評定のページでは画面が一覧を取りに行く
          const overview = location.pathname === OVERVIEW_URL;
          const id = Number(new URLSearchParams(location.search).get("id")) || null;
          view = { kind: "grades", list: overview ? readGradeList(document) : null, id: overview ? null : id };
          heading = "成績";
        } else if (route === "assign" || route === "submit") {
          const page = readAssignPage(document, location.search);
          heading = page.title || "課題";
          if (route === "assign") view = { kind: "assign", page };
          else {
            const form = readSubmitForm(document);
            if (!form) throw new Error("提出フォームが見つかりません");
            view = { kind: "submit", page, form };
          }
        } else if (route === "forum") view = { kind: "forum", list: readForumList(document) };
        else if (route === "discussion") view = { kind: "discussion", page: readDiscussionPage(document, location.search) };
        else if (route === "messages") view = { kind: "messages", path: location.pathname, search: location.search };
        else if (route === "lti") view = { kind: "lti", page: readLtiPage(document, location.search) };
        else if (route === "questionnaire") view = { kind: "questionnaire", page: readQuestionnairePage(document, location.search) };
        else if (route === "search") view = { kind: "search", search: location.search };
        else if (route === "profile") {
          // 自分以外のプロファイルは元の画面で見る(元の script は止めてあるので、印を付けて読み直す)
          const other = new URLSearchParams(location.search).get("id");
          if (other !== null && Number(other) !== id) { openOriginal(); return; }
          view = { kind: "profile", page: readProfile(document) };
        }
        if (view && ["forum", "discussion", "messages", "lti", "questionnaire", "search", "profile"].includes(view.kind)) heading = titleOf(view);
        mountLms(name.then((n) => n || null), id, view);
        document.title = `${heading} | MU-LMS`;
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
