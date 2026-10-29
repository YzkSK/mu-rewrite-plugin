import { formOf, menuIdOf, samlFormOf } from "./muscatTimetable.js";
import { isNewer } from "./version.js";

// ストアから入れると manifest に update_url が付く。channel.txt はリリースの GitHub 用 zip にだけ入る
const channel = "update_url" in chrome.runtime.getManifest() ? Promise.resolve("store") : fetch("channel.txt").then((r) => (r.ok ? "github" : "dev"), () => "dev");

// 新版の通知(GitHub 版だけ。ストア版はストアが更新する)。最新リリースが今の版より新しければ、バッジとポップアップで知らせる
async function checkUpdate() {
  try {
    if ((await channel) !== "github") return;
    const res = await fetch("https://api.github.com/repos/YzkSK/mu-rewrite-plugin/releases/latest");
    if (!res.ok) return; // リリース無し(404)・レート制限などは何もしない
    const { tag_name, html_url, assets } = await res.json();
    const version = String(tag_name).replace(/^v/, "");
    if (isNewer(version, chrome.runtime.getManifest().version)) {
      // 添付の zip があればその直リンク(開くとダウンロードされる)。無ければ Releases のページ
      const zip = (assets || []).find((a) => a.name.endsWith(".zip"));
      await chrome.storage.local.set({ "mu-update": { version, url: zip ? zip.browser_download_url : html_url } });
      await chrome.action.setBadgeText({ text: "NEW" });
      await chrome.action.setBadgeBackgroundColor({ color: "#541b86" });
    } else {
      await chrome.storage.local.remove("mu-update");
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch {}
}
chrome.runtime.onStartup.addListener(checkUpdate);
chrome.runtime.onInstalled.addListener(checkUpdate);
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "mu-check-update") return;
  checkUpdate().then(() => sendResponse({}));
  return true;
});

// MU LMS の提出期限。content script からは別オリジンなので SW が Cookie 付きで取る
const LMS = "https://musashino-u.myopenlms.net";
const METHOD = "core_calendar_get_action_events_by_timesort";

async function lmsDue() {
  try {
    const sesskeyOf = (html) => (/"sesskey":"([^"]+)"/.exec(html) || [])[1];
    let res = await fetch(LMS + "/my/", { credentials: "include" });
    let html = await res.text();
    // LMS のログインが切れていると /my/ は大学の SSO へ転送され、「自動で送るフォーム」が返る。ブラウザの代わりに送って入り直す
    // (SSO にもログインしていなければ ID・パスワードの画面になり、送れない)
    for (let hop = 0; hop < 3 && !sesskeyOf(html); hop++) {
      const saml = samlFormOf(html);
      if (!saml) break;
      res = await fetch(new URL(saml.action, res.url).href, { method: "POST", credentials: "include", body: new URLSearchParams(saml.fields) });
      html = await res.text();
    }
    if (!sesskeyOf(html) && res.url.startsWith(LMS)) html = await (await fetch(LMS + "/my/", { credentials: "include" })).text(); // 戻り先がゲスト用トップのとき
    const sesskey = sesskeyOf(html);
    if (!sesskey) return { login: false };
    // 60 日前から取る(2 週間前からだと古い期限切れが抜けた)。過去と未来は分ける(古い期限切れで上限を使い切らないため)
    const now = Math.floor(Date.now() / 1000);
    const body = [
      { index: 0, methodname: METHOD, args: { limitnum: 20, timesortfrom: now - 60 * 86400, timesortto: now - 1, limittononsuspendedevents: true } },
      { index: 1, methodname: METHOD, args: { limitnum: 20, timesortfrom: now, limittononsuspendedevents: true } },
    ];
    const api = await fetch(`${LMS}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=${METHOD}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const rs = await api.json();
    const r = Array.isArray(rs) ? rs.find((x) => x.error) ?? rs[0] : rs; // 呼び出し全体の失敗は配列でなく 1 つの例外で返る
    if (r.error || !Array.isArray(rs)) return (r.exception?.errorcode ?? r.errorcode) === "servicerequireslogin" ? { login: false } : { error: String(r.exception?.message || r.message || r.error) };
    return {
      login: true,
      events: rs.flatMap((x) => x.data.events || []).map((e) => ({ name: e.name, course: e.course?.fullname ?? "", due: e.timesort, overdue: !!e.overdue, closed: !!e.overdue && !e.action?.actionable, url: e.url })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// MUSCAT は画面の URL を直接 GET すると空の 500 を返し、再読み込みが Chrome のエラー画面になる。
// 入口(SSO)から入り直させ、戻った先のホームで元の画面を開き直す(content script 側)。
const MUSCAT = "https://unipa.m-muscat.musashino-u.ac.jp/uprx/";
const key = (tabId) => "mu-m-" + tabId;

async function bounce(tabId) {
  const k = key(tabId);
  const v = (await chrome.storage.session.get(k))[k] || { leaf: "" };
  // 入り直しの途中(IdP のログインに時間がかかる間)と、サーバーが落ちているときに繰り返さない。
  // 画面が戻ると content script が mu-restore/mu-screen で印を消すので、長めに保つ
  if (v.bounce && Date.now() - v.bounce < 5 * 60 * 1000) return;
  await chrome.storage.session.set({ [k]: { ...v, bounce: Date.now() } });
  chrome.tabs.update(tabId, { url: MUSCAT + "ShibbolethAuthServlet" });
}

// 画面の遷移は POST。GET で /up/ を直接取りに行くのは再読み込みなどで、空の応答になる。
// エラー画面が一瞬映らないよう、リクエストを出した時点で入り直す(ゲスト閲覧とスマホ版は除く)
chrome.webRequest.onBeforeRequest.addListener((d) => {
  if (d.method !== "GET" || d.frameId !== 0 || d.tabId < 0) return;
  if (d.url.includes("guestlogin") || d.url.includes("/pky501/")) return;
  bounce(d.tabId);
}, { urls: [MUSCAT + "up/*"], types: ["main_frame"] });

// 取りこぼし用: 500 以上が返ったときも入り直す
chrome.webRequest.onCompleted.addListener((d) => {
  if (d.statusCode >= 500) bounce(d.tabId);
}, { urls: [MUSCAT + "up/*"], types: ["main_frame"] });

// 開発用: ポータルのページから拡張を読み込み直す(localStorage["mu-dev"]="1" のときだけ content script が送る)。
// localStorage はページからも書けるので、開発版(ストアの update_url もリリース zip の channel.txt もない)だけで受ける
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "mu-dev-reload") channel.then((c) => c === "dev" && chrome.runtime.reload());
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !sender.tab || !["mu-screen", "mu-restore", "mu-bounce", "mu-bouncing"].includes(msg.type)) return;
  const k = key(sender.tab.id);
  if (msg.type === "mu-bouncing") { // 入り直しの途中か(中継ページで覆いを外さないため)
    chrome.storage.session.get(k).then((r) => sendResponse({ on: !!(r[k] && r[k].bounce && Date.now() - r[k].bounce < 5 * 60 * 1000) }));
    return true;
  }
  if (msg.type === "mu-bounce") { // ログイン画面(200)が返ってきたとき。500 のときと同じ入り直しの印を付ける
    chrome.storage.session.get(k).then(async (r) => {
      await chrome.storage.session.set({ [k]: { leaf: "", ...r[k], bounce: Date.now() } });
      sendResponse({});
    });
    return true;
  }
  if (msg.type === "mu-screen") {
    chrome.storage.session.set({ [k]: { leaf: String(msg.leaf || "") } });
    return;
  }
  // 入り直してきた直後(30秒以内)だけ、直前の画面を返す。使ったら消す
  chrome.storage.session.get(k).then(async (r) => {
    const v = r[k];
    await chrome.storage.session.remove(k);
    // 入り直しの許容時間(bounce のガードと同じ 5 分)の間は、ログインに時間がかかっても戻り先を返す
    sendResponse(v && v.bounce && Date.now() - v.bounce < 5 * 60 * 1000 ? { leaf: v.leaf } : {});
  });
  return true;
});

// MUSCAT の時間割の HTML を fetch だけで取る(中継ページ → autoLogin → メニューの「学生時間割表」)。
// サーバー側の「今の画面」が変わるが、裏の MUSCAT のタブはずれた応答を見て入り直すので取る。
// 前面のタブは入力の途中かもしれない(入り直すと入力が消える)ので、そのときだけ取らない
async function muscatTimetable() {
  try {
    if ((await chrome.tabs.query({ url: MUSCAT + "*", active: true })).length) return { busy: true };
    const post = (url, fields, extra) => {
      const body = new URLSearchParams(fields);
      for (const [k, v] of extra) body.set(k, v);
      return fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    };
    let relay = await fetch(MUSCAT + "ShibbolethAuthServlet", { credentials: "include" });
    let html = relay.ok ? await relay.text() : "";
    // MUSCAT のログインがまだ無いとき(ブラウザを開き直した直後など)は、大学の SSO が「自動で送るフォーム」を返す。
    // ブラウザなら JS で送られるので、ここで代わりに送る(SSO にもログインしていなければ ID・パスワードの画面になり、送れない)
    for (let hop = 0; hop < 3 && !formOf(html, "loginForm"); hop++) {
      const saml = samlFormOf(html);
      if (!saml) break;
      relay = await post(new URL(saml.action, relay.url).href, saml.fields, []);
      html = relay.ok ? await relay.text() : "";
    }
    const login = formOf(html, "loginForm");
    if (!login) return { login: false };
    const home = await post(new URL(login.action, relay.url).href, login.fields, [["loginForm:autoLogin", "loginForm:autoLogin"]]);
    if (!home.ok) return { error: "home " + home.status };
    const homeHtml = await home.text();
    const menu = formOf(homeHtml, "menuForm");
    const id = menuIdOf(homeHtml, "学生時間割表");
    if (!menu || !id) return { error: "メニューが読めません" };
    const res = await post(new URL(menu.action, home.url).href, menu.fields, [
      ["rx.sync.source", "menuForm:mainMenu"], ["menuForm:mainMenu", "menuForm:mainMenu"], ["menuForm:mainMenu_menuid", id],
    ]);
    if (!res.ok) return { error: "timetable " + res.status };
    return { html: await res.text() };
  } catch (e) {
    return { error: e.message };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "mu-muscat-timetable") return;
  muscatTimetable().then(sendResponse);
  return true;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "mu-lms-due") return;
  lmsDue().then(sendResponse);
  return true;
});
