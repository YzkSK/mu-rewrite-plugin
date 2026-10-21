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
