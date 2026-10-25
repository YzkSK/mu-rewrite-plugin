// MU LMS の提出期限。content script からは別オリジンなので SW が Cookie 付きで取る
const LMS = "https://musashino-u.myopenlms.net";
const METHOD = "core_calendar_get_action_events_by_timesort";

async function lmsDue() {
  try {
    const html = await (await fetch(LMS + "/my/", { credentials: "include" })).text();
    const sesskey = (/"sesskey":"([^"]+)"/.exec(html) || [])[1];
    if (!sesskey) return { login: false };
    const body = [{ index: 0, methodname: METHOD, args: { limitnum: 20, timesortfrom: Math.floor(Date.now() / 1000) - 14 * 86400, limittononsuspendedevents: true } }];
    const res = await fetch(`${LMS}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=${METHOD}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const r = (await res.json())[0];
    if (r.error) return r.exception?.errorcode === "servicerequireslogin" ? { login: false } : { error: String(r.exception?.message || r.error) };
    return {
      login: true,
      events: (r.data.events || []).map((e) => ({ name: e.name, course: e.course?.fullname ?? "", due: e.timesort, overdue: !!e.overdue, url: e.url })),
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "mu-lms-due") return;
  lmsDue().then(sendResponse);
  return true;
});
