// Content script 経由ではなく SW から Cookie 付きで届くかの検証用。本文は返さず boolean のみ。
async function probe(url, marker) {
  try {
    const r = await fetch(url, { credentials: "include" });
    const t = await r.text();
    const title = (t.match(/<title>([^<]*)<\/title>/i) || [])[1];
    return { status: r.status, found: t.includes(marker), url: r.url.split("?")[0], title: (title || "").trim().slice(0, 60) };
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
  if (!msg || msg.type !== "probe") return;
  Promise.all([
    probe("https://musashino-u.myopenlms.net/", '"sesskey":"'),
    probe("https://unipa.m-muscat.musashino-u.ac.jp/uprx/up/pk/pky001/Pky00102.xhtml", "ui-dataview-row"),
  ]).then(([lms, muscat]) =>
    sendResponse({
      lms: lms.error ? lms : { status: lms.status, hasSesskey: lms.found, url: lms.url, title: lms.title },
      muscat: muscat.error ? muscat : { status: muscat.status, hasRows: muscat.found, url: muscat.url, title: muscat.title },
    })
  );
  return true;
});
