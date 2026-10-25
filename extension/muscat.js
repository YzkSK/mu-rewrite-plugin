(function () {
  'use strict';
  const root = document.documentElement;
  if (window !== window.top) return; // iframe 内は元の見た目のまま
  // 遅さの切り分け用。localStorage["mu-m-debug"]="1" のときだけ、ページ読み込み開始からの経過 ms をコンソールに出す
  const T = (m) => { try { if (localStorage.getItem("mu-m-debug") === "1") console.info("[mu-m] " + m + " " + Math.round(performance.now()) + "ms"); } catch (e) { /* 出せなくても動く */ } };
  T("script start");
  root.classList.add("mu-m"); // 描画前に枠のCSSを効かせてちらつきを防ぐ
  // 書き換えが終わるまで元の画面が見えないよう、ローディングで覆う(失敗しても 5 秒で外す)
  root.classList.add("mu-m-pre");
  const done = () => {
    if (!root.classList.contains("mu-m-pre") || root.classList.contains("mu-m-out")) return;
    T("cover off");
    root.classList.add("mu-m-out"); // フェードアウトしてから外す(0.3秒)
    setTimeout(() => root.classList.remove("mu-m-pre", "mu-m-out"), 320);
  };
  // 実測で、掲示板の読み込み(サーバーの応答)に 6 秒以上かかる場合があった。5 秒だと整形前の元の画面が見えるので、長めにする
  let failTimer = setTimeout(done, 20000);
  const hold = (ms) => { clearTimeout(failTimer); failTimer = setTimeout(done, ms); }; // 入り直しの途中は覆いを長く保つ

  const KEY = "mu-m-drawer";
  const NS = "http://www.w3.org/2000/svg";
  const PORTAL = "https://portal.musashino-u.ac.jp/";
  const LMS = "https://musashino-u.myopenlms.net/";
  const ICONS = {
    home: "M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z",
    menu: "M4 6h16M4 12h16M4 18h16",
    x: "M6 6l12 12M18 6L6 18",
    user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
    chev: "M6 9l6 6 6-6",
    "お知らせ": "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4",
    "授業": "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13",
    "シラバス": "M11 17a6 6 0 100-12 6 6 0 000 12zM16 16l4 4",
    "学生支援": "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
    "設備状況照会": "M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3",
  };
  // 画面コード→ドロワーの葉(ホームと個人設定は別扱い)
  const CODES = {
    Bsd007: "掲示板", Kmd008: "学生時間割表", Atb005: "出席確認", Kmg006: "成績照会",
    Kmh006: "シラバス", Bsa011: "教員スケジュール", Bsb004: "学籍情報照会",
    Bsb007: "健康診断情報照会", Bse003: "安否確認回答", Ksa008: "教室予約(参照のみ)",
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function icon(name, cls) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    if (cls) s.setAttribute("class", cls);
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", ICONS[name] || ICONS["授業"]);
    s.appendChild(p);
    return s;
  }
  function button(cls, label, text) {
    const b = el("button", cls, text);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  }

  // 元DOMの探索(参照が切れたときの探し直しにも使う)
  const findHome = () => document.querySelector("#headerForm header a.ui-link");
  const findSetting = () => [...document.querySelectorAll("#headerForm nav a.ui-link.headerBtn")].find((a) => !/commandlink/.test(a.id));
  const findLogout = () => document.getElementById("headerForm:logoutButton");
  const findSitemap = () => document.querySelector(".footerArea p.sitemap a");
  function groups() {
    const tops = [...document.querySelectorAll("#menuForm\\:mainMenu li.ui-menuitem.ui-menu-parent")].filter((li) => !li.parentElement.closest("li.ui-menuitem"));
    return tops.map((li) => {
      const head = li.querySelector(":scope > a");
      const leaves = [...li.querySelectorAll("li.ui-menuitem:not(.ui-widget-header) a")].filter((a) => a.closest("li") !== li);
      return { title: head ? head.textContent.trim() : "", leaves: leaves.map((a) => ({ label: a.textContent.trim(), a })) };
    }).filter((g) => g.title);
  }
  const findLeaf = (label) => { for (const g of groups()) for (const l of g.leaves) if (l.label === label) return l.a; return null; };

  // 保持した a が DOM から外れていたら探し直して click する
  function press(a, find) {
    const t = a && a.isConnected ? a : find();
    if (t) t.click();
  }

  function userName() {
    const p = document.querySelector("p.loginInfo");
    const m = p && p.textContent.match(/^\s*(.+?)\s*さん/);
    return m ? m[1].trim() : "ユーザー";
  }

  function currentScreen() {
    const RE = /\[([A-Z][a-z]{2}\d{3})\]/;
    const area = document.getElementById("mainWrapTop") || document.getElementById("funcHeader");
    let m = area && area.textContent.match(RE);
    // 別の画面(ホームのタイルなど)から飛んだときは、画面コードがタイトル周辺に無いことがあるので、本文側も探す
    if (!m) { const w = document.getElementById("mainWrapBottom") || document.getElementById("wrap"); m = w && w.textContent.match(RE); }
    const code = m ? m[1] : "";
    // URL は画面遷移のあとも直前の画面のままなので、ホームの判定には使えない(ドロワーの「ホーム」の後でホーム扱いにならなかった)。
    // ホームは画面コードが出ないので、ホームにだけある部品(履修授業などの枠)で判定する
    if (code === "Pky001" || (!code && document.getElementById("portalCont"))) return { home: true };
    if (code === "Bsa004") return { setting: true };
    return { leaf: CODES[code] || "" };
  }

  function saved() {
    try { return localStorage.getItem(KEY) !== "closed"; } catch (e) { return true; }
  }
  function setOpen(open) {
    root.classList.toggle("mu-m-open", open);
    try { localStorage.setItem(KEY, open ? "open" : "closed"); } catch (e) { /* 保存できなくても動く */ }
  }

  function ni(text, ic) {
    const b = button("ni", null);
    if (ic) b.appendChild(icon(ic, "ic"));
    b.appendChild(document.createTextNode(text));
    return b;
  }
  function ext(text, href) {
    const a = el("a", "ni", text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  function buildDrawer() {
    const cur = currentScreen();
    const d = el("aside");
    d.id = "mu-m-drawer";
    d.setAttribute("aria-label", "メニュー");
    const dh = el("div", "dh");
    dh.appendChild(el("span", "brand", "MUSCAT"));
    const close = button("ibtn", "メニューを閉じる");
    close.appendChild(icon("x"));
    close.addEventListener("click", () => setOpen(false));
    dh.appendChild(close);
    d.appendChild(dh);

    const home = ni("ホーム", "home");
    if (cur.home) home.classList.add("on");
    home.addEventListener("click", () => press(home._a, findHome));
    home._a = findHome();
    d.appendChild(home);

    for (const g of groups()) {
      const grp = el("div", "grp closed");
      const head = ni(g.title, g.title);
      head.appendChild(icon("chev", "ch"));
      head.addEventListener("click", () => grp.classList.toggle("closed"));
      const sub = el("div", "sub");
      const inner = el("div");
      for (const l of g.leaves) {
        const b = ni(l.label);
        if (l.label === cur.leaf) { b.classList.add("on"); grp.classList.remove("closed"); }
        b.addEventListener("click", () => press(l.a, () => findLeaf(l.label)));
        inner.appendChild(b);
      }
      sub.appendChild(inner);
      grp.append(head, sub);
      d.appendChild(grp);
    }

    const foot = el("div", "dfoot");
    const set = ni("個人設定");
    if (cur.setting) set.classList.add("on");
    const setA = findSetting();
    set.addEventListener("click", () => press(setA, findSetting));
    const out = ni("ログアウト");
    const outA = findLogout();
    out.addEventListener("click", () => press(outA, findLogout));
    foot.append(set, ext("MU ポータルへ", PORTAL), ext("MU-LMS へ", LMS), out);
    d.appendChild(foot);
    return d;
  }

  function buildTop() {
    const top = el("header");
    top.id = "mu-m-top";
    const hl = el("div", "hl");
    const open = button("ibtn", "メニューを開く");
    open.appendChild(icon("menu"));
    open.addEventListener("click", () => setOpen(true));
    hl.append(open, el("span", "brand", "MUSCAT"));
    const me = button("me", "個人設定を開く");
    const i = el("i");
    i.appendChild(icon("user"));
    me.append(i, document.createTextNode(userName() + " さん"));
    const setA = findSetting();
    me.addEventListener("click", () => press(setA, findSetting));
    top.append(hl, me);
    return top;
  }

  function buildFoot() {
    const f = el("footer");
    f.id = "mu-m-foot";
    const map = button("sm", null, "サイトマップ");
    const a = findSitemap();
    map.addEventListener("click", () => press(a, findSitemap));
    f.append(el("span", null, "武蔵野大学 MUSCAT"), map);
    return f;
  }

  // ホーム: 元DOMは触らず、上段と「今日の授業」だけ毎回作り直す
  const WEEK = "日月火水木金土";
  const START = ["", "9:00", "10:45", "13:00", "14:45", "16:30", "18:15", "20:20"];
  const END = ["", "10:30", "12:15", "14:30", "16:15", "18:00", "19:45", "22:00"]; // 7限だけ 100 分(20:20–22:00)

  function homeTile(num, label, find) {
    const b = button("tile", null);
    b.append(el("b", null, num), el("span", null, label));
    b.addEventListener("click", () => { const a = find(); if (a) a.click(); }); // 押した時点で探す(ajax で差し替わるため)
    return b;
  }
  const infoLink = (cls) => () => {
    const i = document.querySelector("#portalCont .infoIcon." + cls);
    return i && i.closest("a");
  };

  function buildHomeHead() {
    const n = document.querySelector("#portalCont p.newNumber");
    const m = n && n.textContent.match(/\d+/);
    const hd = el("div");
    hd.id = "mu-m-homehd";
    const l = el("div");
    l.append(el("h1", null, "ホーム"), el("p", "lead", "今日の授業と、未読のお知らせをひと目で。"));
    const stat = el("div", "stat");
    stat.append(homeTile(m ? m[0] : "–", "未読の掲示", infoLink("infoKeiji")), homeTile("→", "時間割変更", infoLink("infoTimetable")));
    const info = el("div", "info");
    info.appendChild(stat);
    hd.append(l, info);
    return hd;
  }

  // 今日の曜日のコマを授業ごとに集め、連続する時限(昼休みをまたがない)を1行にまとめる
  function todayRows(lis, wd) {
    const rows = [];
    for (const li of lis) {
      const ps = [...new Set([...li.querySelectorAll(".lessonHead span.period")]
        .map((s) => s.textContent.normalize("NFKC").match(/^\s*(\S)\s*(\d+)/))
        .filter((m) => m && m[1] === wd).map((m) => +m[2]))].sort((a, b) => a - b);
      if (!ps.length) continue;
      const t = li.querySelector("p.lessonTitle");
      const teachers = [...li.querySelectorAll(".lessonDetail a.ui-commandlink")].map((a) => a.textContent.trim()).filter(Boolean);
      const room = li.querySelector(".lessonDetail > div");
      const k = li.querySelector(".lessonKeijiArea");
      const keiji = k ? (k.querySelectorAll("li").length || k.querySelectorAll("a").length || (k.textContent.trim() ? 1 : 0)) : 0;
      const sub = [teachers.join("、"), room ? room.textContent.trim() : ""].filter(Boolean).join(" ・ ");
      let run = [];
      const flush = () => { if (run.length) rows.push({ run, title: t ? t.textContent.trim() : "", sub, keiji }); run = []; };
      for (const p of ps) {
        if (run.length && (p !== run[run.length - 1] + 1 || p === 3)) flush();
        run.push(p);
      }
      flush();
    }
    return rows.sort((a, b) => a.run[0] - b.run[0]);
  }

  function buildToday(lis, now) {
    const card = el("div", "card today");
    card.id = "mu-m-today";
    const h = el("h2", null, "今日の授業 ");
    h.appendChild(el("span", "tag", (now.getMonth() + 1) + "/" + now.getDate() + " " + WEEK[now.getDay()]));
    card.appendChild(h);
    const rows = todayRows(lis, WEEK[now.getDay()]);
    if (!rows.length) card.appendChild(el("div", "free", "今日は授業がありません"));
    for (const r of rows) {
      const s = r.run[0], e = r.run[r.run.length - 1];
      const slot = el("div", "slot");
      const p = el("div", "p", s === e ? s + "限" : s + (e - s === 1 ? "・" : "〜") + e + "限");
      if (START[s]) p.appendChild(el("small", null, START[s]));
      const c = el("div", "c");
      const sub = el("span", null, r.sub);
      if (r.keiji) sub.append(r.sub ? " " : "", el("span", "tag", "掲示 " + r.keiji));
      c.append(el("b", null, r.title), sub);
      slot.append(p, c);
      card.appendChild(slot);
    }
    return card;
  }

  // 履修授業カード(案B): 教員は先頭 2 名 + 「ほか N名」に畳み、メモは「メモ」ボタンで入力欄を開閉する
  function tidyLessons(lis) {
    for (const li of lis) {
      const p = li.querySelector(".lessonDetail > p");
      if (p && !p.dataset.mu) {
        p.dataset.mu = "1";
        const links = [...p.querySelectorAll("a.ui-commandlink")];
        if (links.length > 2) {
          let after = false;
          for (const c of p.children) { if (c === links[1]) { after = true; continue; } if (after) c.classList.add("mu-hide-x"); }
          links[1].after(el("span", "mu-more", " ほか " + (links.length - 2) + "名"));
        }
      }
      const room = li.querySelector(".lessonDetail > div");
      if (room) room.title = room.textContent.trim(); // 1 行に収めるので、全文は押さずに見られるように
      // 授業の掲示は最大 2 件(1 件 1 行)まで見せ、残りは「他 N件」(カードの大きさを固定するため)
      const kj = li.querySelector(".lessonKeijiArea");
      const n = kj ? kj.querySelectorAll(".ui-panel-content > p").length : 0;
      if (kj) { if (n > 2) kj.dataset.more = "他 " + (n - 2) + "件"; else delete kj.dataset.more; }
      const main = li.querySelector(".lessonMain");
      const input = main && main.querySelector(":scope > input");
      if (main && input && !main.querySelector(":scope > .mu-memo-btn")) {
        const b = button("mu-memo-btn", null, "メモ");
        b.addEventListener("click", () => { li.classList.toggle("mu-memo-open"); if (li.classList.contains("mu-memo-open")) input.focus(); });
        main.appendChild(b);
        if (input.value.trim()) li.classList.add("mu-memo-open"); // 書いてあるメモは、最初から見える
      }
    }
  }

  function buildHome() {
    const portal = document.getElementById("mainWrapBottomPortal");
    const cont = document.getElementById("portalCont");
    if (!portal || !cont) return false; // 想定外の DOM は元の見た目のまま
    for (const id of ["mu-m-homehd", "mu-m-today"]) { const o = document.getElementById(id); if (o) o.remove(); }
    portal.prepend(buildHomeHead());
    const lis = document.querySelectorAll("#portalLessonList li.ui-dataview-row");
    tidyLessons(lis);
    if (!lis.length) return false; // 読み込み前は枠だけの空カードを出さない(授業が届いたら作る。履修ゼロなら 5 秒の保険で覆いを外す)
    const sup = document.getElementById("portalSupport");
    const card = buildToday(lis, new Date());
    if (sup) sup.after(card); else cont.before(card);
    return true;
  }

  let homeMo = null;
  let boundFc = null; // ホーム/掲示一覧の監視をかけた #funcContent(#wrap ごと差し替わると別の要素になる)
  function startHome() {
    const fc = document.getElementById("funcContent");
    if (!fc || !document.getElementById("mainWrapBottomPortal")) return;
    root.classList.add("mu-m-home");
    boundFc = fc;
    let timer = 0;
    if (homeMo) homeMo.disconnect();
    const mo = homeMo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 150); });
    // 自分の変更で再発火しないよう、作り直す間だけ observer を切る
    function run() {
      mo.disconnect();
      let ok = false;
      try { ok = buildHome(); } catch (e) { /* 失敗しても元の見た目に戻るだけ */ }
      T("buildHome " + (ok ? "ok" : "待ち"));
      if (ok) done(); // 授業まで整形できてから覆いを外す
      mo.observe(fc, { childList: true, subtree: true });
    }
    run();
    setTimeout(done, 1500); // 履修授業が1件も無い人は buildHome が false のままなので、届くのが速いホームは 1.5 秒で覆いを外す
  }

  // 掲示一覧: 元DOMは触らず、操作は元のタブ・入力欄・ボタンを裏から click して行う
  const NEWS_CHIPS = ["授業", "時間割変更", "申込", "既読"];
  const NEWS_TABS = [["すべて", null], ["未読", "未読"], ["重要", "重要"], ["新着", "新着"], ["フラグ", "フラグつき"]];
  let newsView = "グループ"; // 「未読」などを選んでいる間も、元の並べ方に戻せるよう覚えておく
  let newsPop = false;

  const newsTabs = () => [...document.querySelectorAll('div.ui-tabs[id$="tabArea"] > ul.ui-tabs-nav li a')];
  const newsTab = (name) => newsTabs().find((a) => a.textContent.trim() === name);
  function newsSel() {
    const li = document.querySelector('div.ui-tabs[id$="tabArea"] > ul.ui-tabs-nav li.ui-tabs-selected');
    return li ? li.textContent.trim() : "";
  }
  function newsField(label) {
    const dt = [...document.querySelectorAll(".searchArea dt")].find((d) => d.textContent.trim() === label);
    let dd = dt && dt.nextElementSibling;
    while (dd && dd.tagName !== "DD") dd = dd.nextElementSibling;
    return dd ? dd.querySelector("input") : null;
  }
  function newsSearch(vals) {
    for (const k in vals) {
      const i = newsField(k);
      if (!i) continue;
      i.value = vals[k];
      i.dispatchEvent(new Event("input", { bubbles: true }));
      i.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const b = document.querySelector(".searchArea button.btnSearch");
    if (b) b.click();
  }
  const clickTab = (name) => { const a = newsTab(name); if (a) a.click(); };

  function newsPill(text, on, fn) {
    const b = button("mu-pill" + (on ? " on" : ""), null, text);
    b.addEventListener("click", fn);
    return b;
  }

  function buildNewsHead(old) {
    const sel = newsSel();
    if (sel === "グループ" || sel === "全表示") newsView = sel;
    const kw = newsField("キーワード"), cls = newsField("授業科目");
    const hd = el("div");
    hd.id = "mu-m-newshd";
    hd.appendChild(el("h1", null, "掲示一覧"));

    const q = document.createElement("input");
    q.placeholder = "キーワードで検索";
    q.dataset.k = "q";
    q.value = old ? old.querySelector('[data-k="q"]').value : (kw ? kw.value : "");
    q.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) newsSearch({ "キーワード": q.value }); });
    const ns = el("div", "nsrch");
    ns.append(icon("シラバス"), q);
    hd.appendChild(ns);

    const c = document.createElement("input");
    c.placeholder = "コード・名称";
    c.dataset.k = "c";
    c.value = old ? old.querySelector('[data-k="c"]').value : (cls ? cls.value : "");
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) newsSearch({ "授業科目": c.value }); });
    const fw = el("div", "fwrap");
    const fb = button("mu-btn fbtn", null, "フィルター");
    const n = (c.value ? 1 : 0) + (NEWS_CHIPS.includes(sel) ? 1 : 0);
    if (n) fb.appendChild(el("b", "fn", String(n)));
    fb.setAttribute("aria-expanded", String(newsPop));
    const pop = el("div", "pop" + (newsPop ? " on" : ""));
    fb.addEventListener("click", () => {
      newsPop = !newsPop;
      pop.classList.toggle("on", newsPop);
      fb.setAttribute("aria-expanded", String(newsPop));
    });
    const chips = el("div", "chips");
    for (const name of NEWS_CHIPS) chips.appendChild(newsPill(name, sel === name, () => clickTab(name)));
    const clear = button("mu-btn", null, "クリア");
    clear.addEventListener("click", () => { q.value = ""; c.value = ""; newsSearch({ "キーワード": "", "授業科目": "" }); });
    const apply = button("mu-btn pri", null, "適用");
    apply.addEventListener("click", () => newsSearch({ "授業科目": c.value }));
    const act = el("div", "pact");
    act.append(clear, apply);
    pop.append(el("div", "sec3", "授業科目"), c, el("div", "sec3", "種別"), chips, act);
    fw.append(fb, pop);
    hd.appendChild(fw);

    const seg = el("div", "seg");
    for (const [label, tab] of [["グループ", "グループ"], ["時系列", "全表示"]]) {
      const b = button("segb" + (newsView === tab ? " on" : ""), null, label);
      b.addEventListener("click", () => clickTab(tab));
      seg.appendChild(b);
    }
    hd.appendChild(seg);
    return hd;
  }

  function buildNewsTabs() {
    const sel = newsSel();
    const row = el("div");
    row.id = "mu-m-newstabs";
    for (const [label, tab] of NEWS_TABS) {
      const target = tab || newsView;
      const on = tab ? sel === tab : sel === "グループ" || sel === "全表示";
      row.appendChild(newsPill(label, on, () => clickTab(target)));
    }
    return row;
  }

  function formatNewsRows() {
    // 読み取り(getComputedStyle)を先にまとめ、書き込みはその後にする。交互だと行ごとにスタイルを再計算して固まる
    const shown = (i) => { if (!i) return false; const s = getComputedStyle(i); return s.display !== "none" && s.visibility !== "hidden"; };
    const rows = [...document.querySelectorAll("#funcContent div.alignRight")].map((row) => {
      const dl = row.querySelector(":scope > dl.textOf");
      return dl && { row, dl, imp: shown(dl.querySelector("i.fa-exclamation-circle")), nw: shown(dl.querySelector("i.fa-lightbulb-o")) };
    }).filter(Boolean);
    for (const p of document.querySelectorAll("#funcContent .ui-tabs-panels > .ui-tabs-panel")) {
      p.classList.toggle("mu-flat", !p.querySelector(".ui-accordion")); // :has() は再計算が重いので JS で印を付ける
    }
    for (const { row, dl, imp, nw } of rows) {
      row.classList.add("mu-row");
      const btns = row.querySelectorAll(":scope > span.inlineBlock > div.ui-selectbooleanbutton");
      const txt = (b) => (b ? b.textContent.trim() : "");
      row.classList.toggle("mu-unread", txt(btns[1]) === "既読にする"); // ajax で文言が変わるので毎回付け直す
      if (btns[0]) btns[0].classList.toggle("mu-flag", txt(btns[0]) !== "フラグをつける");
      row.classList.toggle("mu-important", imp);
      row.classList.toggle("mu-new", nw);
      if (row.dataset.mu) continue;
      let node = null;
      for (let i = dl.childNodes.length - 1; i >= 0; i--) {
        const c = dl.childNodes[i];
        if (c.nodeType === 3 && c.textContent.trim()) { node = c; break; }
      }
      const m = node && node.textContent.match(/^\s*\[(.*?)\]\s*(\d{4}\/\d{2}\/\d{2})/);
      if (!m) continue; // 解析できない行は元の見た目のまま
      const from = el("span", "mu-from", m[1]);
      const date = el("span", "mu-date", m[2].slice(5)); // YYYY/MM/DD -> MM/DD
      node.replaceWith(from, date);
      row.dataset.mu = "1";
    }
  }

  // グループ名のボタン列(下のカードの見出しと重複するので隠す)。見出しと同じ文言のボタンだけを対象にする
  function hideGroupJump() {
    const titles = new Set([...document.querySelectorAll("#funcContent td.tabTitle")].map((t) => t.textContent.trim()));
    if (!titles.size) return;
    for (const b of document.querySelectorAll("#funcContent .ui-tabs-panels button, #funcContent .ui-tabs-panels .ui-button")) {
      if (b.closest(".ui-accordion") || !titles.has(b.textContent.trim())) continue;
      const p = b.parentElement;
      const all = p && p.id !== "funcContent" && [...p.children].every((c) => titles.has(c.textContent.trim()));
      (all ? p : b).classList.add("mu-hide");
    }
  }

  // 並び順の行の整理: 「⊕」(基準の追加)は隠し、「更新」は「すべて既読にする」と同じ操作なので 1 つにする
  // (元の「更新」ボタンを押す形のまま、元の文字「すべて既読にする」を隠し、ボタンの文言を CSS で差し替える)
  function tidySort() {
    for (const sa of document.querySelectorAll("#funcContent .squeezeArea")) {
      const icons = [...sa.querySelectorAll("button.ui-button-icon-only")];
      const plus = icons.find((b) => /plus/i.test(b.innerHTML));
      if (plus) plus.classList.add("mu-hide");
      const upd = [...sa.querySelectorAll("button")].find((b) => b.textContent.trim() === "更新");
      if (upd) upd.classList.add("mu-readall");
      const show = [...sa.querySelectorAll("button")].find((b) => b.textContent.trim() === "表示");
      if (show) show.classList.add("mu-hide"); // 選んだらすぐ反映するので、「表示」は押さなくてよい(裏から押すので消さずに隠す)
      const w = document.createTreeWalker(sa, NodeFilter.SHOW_TEXT);
      const texts = [];
      for (let n = w.nextNode(); n; n = w.nextNode()) texts.push(n); // 走査しながら DOM を変えないよう、先に集める
      for (const n of texts) {
        const p = n.parentElement;
        if (n.textContent.trim() !== "すべて既読にする" || !p || p.closest("button, .mu-hide")) continue;
        // 入れ物に「更新」ボタンも入っていることがあるので、入れ物ごと隠さず、文字だけを包んで隠す
        if (p.children.length) n.replaceWith(el("span", "mu-hide", n.textContent)); else p.classList.add("mu-hide");
      }
    }
  }

  function buildNews() {
    const sa = document.querySelector("#funcContent .searchArea");
    const panel = sa && sa.parentElement;
    if (!panel) return false; // 想定外の DOM は元の見た目のまま(中身が遅れて届く場合は、observer が次の更新で作る)
    const old = document.getElementById("mu-m-newshd");
    const act = old && old.contains(document.activeElement) ? document.activeElement : null;
    const key = act && act.dataset.k, s = act && act.selectionStart, e = act && act.selectionEnd;
    const hd = buildNewsHead(old);
    for (const id of ["mu-m-newshd", "mu-m-newstabs"]) { const o = document.getElementById(id); if (o) o.remove(); }
    panel.prepend(buildNewsTabs());
    panel.prepend(hd);
    if (key) {
      const i = hd.querySelector('[data-k="' + key + '"]');
      if (i) { i.focus(); try { i.setSelectionRange(s, e); } catch (x) { /* 位置を戻せなくても動く */ } }
    }
    formatNewsRows();
    hideGroupJump();
    tidySort();
    return true;
  }

  let newsMo = null;
  function stopNews() {
    if (newsMo) { newsMo.disconnect(); newsMo = null; }
  }
  function startNews() {
    const fc = document.getElementById("funcContent");
    if (!fc) return;
    stopNews();
    boundFc = fc;
    // デバウンスしない: MutationObserver は描画の前に呼ばれるので、中身が差し替わった同じフレームで整形すれば、整形前の姿が見えない
    const mo = newsMo = new MutationObserver(() => run());
    // 自分の変更で再発火しないよう、整形する間だけ observer を切る
    function run() {
      mo.disconnect();
      if (sortWait) { sortWait = false; manualBusy(false); } // 並べ替えの結果で一覧が差し替わった
      let ok = false;
      try { ok = buildNews(); } catch (e) { /* 失敗しても元の見た目に戻るだけ */ }
      T("buildNews " + (ok ? "ok" : "待ち(中身がまだ無い)") + " rows=" + document.querySelectorAll("#funcContent div.mu-row").length);
      if (ok) done(); // 整形が済んでから覆いを外す(中身が遅れて届く間、元の画面を見せない)
      if (newsMo === mo) mo.observe(fc, { childList: true, subtree: true });
    }
    run();
  }
  // フィルターのポップオーバーは外を押したら閉じる
  document.addEventListener("click", (e) => {
    if (!newsPop || e.target.closest(".fwrap")) return;
    newsPop = false;
    for (const p of document.querySelectorAll("#mu-m-newshd .pop.on")) p.classList.remove("on");
    for (const b of document.querySelectorAll("#mu-m-newshd .fbtn")) b.setAttribute("aria-expanded", "false");
  });

  // グループの開閉は自前で行う(muscat.css の「開閉は拡張が自前で」参照)。標準の開閉は ajax で中身が差し替わり、
  // 応答が閉じるスライドの途中で届くと打ち切られて、残りが 1 フレームで消えてカクつく。標準のクリック処理には渡さない
  function toggleGroup(h, c) {
    const from = c.getBoundingClientRect().height;
    if (c._mu) { c._mu.cancel(); c._mu = null; } // 連打: いまの高さから切り替える
    // 開いているかは表示の状態で決める(最初から閉じているグループは、標準のウィジェットが非表示にしている)
    const closing = !(c.classList.contains("mu-gone") || getComputedStyle(c).display === "none") && !h.classList.contains("mu-closing");
    h.classList.toggle("mu-closing", closing);
    if (!closing) h.classList.add("mu-open"); // 最初から閉じていた見出しにも、開いた形の見た目を付ける(閉じるときは終わってから外す)
    h.classList.remove("mu-collapsed");
    c.classList.remove("mu-gone", "ui-helper-hidden");
    if (!closing) c.style.display = "block"; // 標準が付けた display:none を、開くときだけ外す
    const to = closing ? 0 : c.getBoundingClientRect().height; // 開くときは、高さを固定していない自然な高さ
    c.style.overflow = "hidden";
    const a = c._mu = c.animate([{ height: (closing ? from : 0) + "px" }, { height: to + "px" }], { duration: 320, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    a.onfinish = () => {
      if (c._mu !== a) return;
      c._mu = null;
      if (closing) { c.classList.add("mu-gone"); h.classList.add("mu-collapsed"); h.classList.remove("mu-open"); }
      a.cancel(); // 印を付けたあとに外す(外した瞬間に元の高さが 1 フレーム見えないように)
      c.style.overflow = "";
    };
  }
  document.addEventListener("click", (e) => {
    if (!root.classList.contains("mu-m-news")) return;
    const h = e.target.closest && e.target.closest("#funcContent .ui-accordion-header");
    const c = h && h.nextElementSibling;
    if (!c || !c.classList.contains("ui-accordion-content")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    toggleGroup(h, c);
  }, true);

  // 並び順を選んだ/向きを変えたら、元の「表示」ボタンを裏で押して、すぐ反映する
  let sortArea = -1; // 最後に触った並び順の行(候補の一覧が行の外に出る場合の手掛かり)
  const areaOf = (t) => {
    const all = [...document.querySelectorAll("#funcContent .squeezeArea")];
    const sa = t.closest(".squeezeArea");
    return sa ? all.indexOf(sa) : sortArea;
  };
  // 拡張のローディング(#mu-m-busy)。並べ替えのように、始まりが分かる操作は、直接 on/off する(6 秒で必ず消す)
  let busyEl = null, busyManual = false, busyCap = 0, sortWait = false;
  function manualBusy(on) {
    busyManual = on;
    clearTimeout(busyCap);
    if (busyEl) busyEl.classList.toggle("on", on);
    if (on) busyCap = setTimeout(() => manualBusy(false), 6000);
  }
  function applySort(i) {
    const sa = document.querySelectorAll("#funcContent .squeezeArea")[i]; // ajax で行が差し替わるので、押す直前に探し直す
    const show = sa && [...sa.querySelectorAll("button")].find((b) => b.textContent.trim() === "表示");
    if (!show) { manualBusy(false); return; }
    sortWait = true; // これ以降の、一覧の差し替えで、ローディングを消す
    show.click();
  }

  // 標準の通信中の表示(blockui)は CSS で隠している。表示状態になったことを監視して、代わりに拡張のローディングを出す。
  // 速い通信ではちらつくので、0.15 秒以上かかったときだけ出す
  function watchBusy() {
    if (document.getElementById("mu-m-busy")) return;
    const busy = busyEl = el("div");
    busy.id = "mu-m-busy";
    document.body.appendChild(busy);
    let timer = 0;
    const sel = ".ui-blockui, .ui-blockui-content";
    const check = () => {
      if (busyManual) return; // 並べ替え中は、そちらが on/off を決める
      const on = [...document.querySelectorAll(sel)].some((e) => e.style.display && e.style.display !== "none" && !e.classList.contains("ui-helper-hidden"));
      clearTimeout(timer);
      if (on) timer = setTimeout(() => busy.classList.add("on"), 150); else busy.classList.remove("on");
    };
    const mo = new MutationObserver(check);
    const attach = () => document.querySelectorAll(sel).forEach((e) => mo.observe(e, { attributes: true, attributeFilter: ["style", "class"] }));
    attach();
    new MutationObserver(attach).observe(document.body, { childList: true }); // あとから作られる部品も監視する
  }
  document.addEventListener("mousedown", (e) => {
    if (!root.classList.contains("mu-m-news") || !e.target.closest) return;
    const sa = e.target.closest("#funcContent .squeezeArea");
    if (sa) sortArea = [...document.querySelectorAll("#funcContent .squeezeArea")].indexOf(sa);
  }, true);
  document.addEventListener("click", (e) => {
    if (!root.classList.contains("mu-m-news") || !e.target.closest) return;
    const item = e.target.closest("li.ui-selectonemenu-item");
    const dir = e.target.closest("#funcContent .squeezeArea button.ui-button-icon-only:not(.mu-hide)");
    if (!item && !dir) return;
    const i = areaOf(e.target);
    if (i < 0) return;
    sortWait = false;
    manualBusy(true);
    // 選んだ値が元のウィジェットに反映されてから(向きは ajax の応答のあとに)押す
    setTimeout(() => applySort(i), item ? 120 : 600);
  });

  // 学生時間割表: 元DOMは触らず、学期ごとの元の表(table.classTable)を読んで別の要素に描き直す。押されたら元のボタンを click する
  const TT_KEY = "mu-m-tt-term";
  const ttRow = (p) => (p < 3 ? p + 1 : p + 2); // grid の行: 見出し=1、1限=2、2限=3、昼休み=4、3限=5…
  const txt = (e) => (e ? e.textContent.trim() : "");

  // 1 つの時間割表から授業を読み、連続する時限の同じ授業を 1 枚にまとめる(昼休みをまたぐものは分ける)
  function readTimetable(table) {
    const cells = [];
    [...table.rows].forEach((tr, ri) => {
      const p = ri >= 1 && ri <= 2 ? ri : ri >= 4 ? ri - 1 : 0; // 行3 は昼休み、行0 は見出し
      if (!p) return;
      [...tr.querySelectorAll("td.colYobi")].forEach((td, i) => {
        const info = td.querySelector("div.jugyo-info");
        const name = txt(info && info.querySelector(".fontB"));
        if (!info || !name) return;
        // 教員・教室・科目コードは位置で並ぶ。名前・単位・印・ボタンの行を除いた残りを順に使う
        const rest = [...info.children].filter((d) => !d.matches(".fontB, .taniSu, .sign") && !d.querySelector("button"));
        const kind = [...info.classList].find((c) => /^jugyo-/.test(c) && c !== "jugyo-info");
        cells.push({
          c: i + 1, p, name, teacher: txt(rest[0]),
          room: rest[1] ? [...rest[1].querySelectorAll("span")].map(txt).filter(Boolean).join(" ") : "",
          signs: [...info.querySelectorAll(".sign")].map(txt).filter(Boolean),
          ng: !!kind && kind !== "jugyo-normal", btn: info.querySelector("button"),
        });
      });
    });
    cells.sort((a, b) => a.c - b.c || a.p - b.p);
    const cards = [];
    for (const k of cells) {
      const last = cards[cards.length - 1];
      if (last && last.c === k.c && last.q + 1 === k.p && last.name === k.name && last.teacher === k.teacher && k.p !== 3) last.q = k.p;
      else cards.push({ ...k, q: k.p });
    }
    return cards;
  }

  function ttCell(g, cls, c, r1, r2) {
    const d = el("div", cls);
    d.style.gridColumn = c;
    d.style.gridRow = r1 + (r2 > r1 ? " / " + (r2 + 1) : "");
    g.appendChild(d);
    return d;
  }

  function ttGrid(cards) {
    const maxP = cards.some((k) => k.q >= 7) ? 7 : 6; // 7限は授業がある学期だけ
    const g = el("div", "ttg");
    g.style.gridTemplateRows = "auto repeat(2,minmax(0,1fr)) auto repeat(" + (maxP - 2) + ",minmax(0,1fr))";
    ["", "月", "火", "水", "木", "金", "土"].forEach((t, i) => { ttCell(g, "dh", i + 1, 1, 1).textContent = t; });
    for (let p = 1; p <= maxP; p++) {
      const ph = ttCell(g, "ph", 1, ttRow(p), ttRow(p));
      ph.append(String(p));
      if (START[p]) ph.appendChild(el("small", null, START[p] + "–" + END[p]));
    }
    ttCell(g, "lu", "2 / -1", 4, 4).textContent = "昼休み";
    const used = new Set();
    for (const k of cards) {
      for (let p = k.p; p <= k.q; p++) used.add(k.c + "-" + p);
      const d = ttCell(g, "cl" + (k.ng ? " ng" : ""), k.c + 1, ttRow(k.p), ttRow(k.q));
      d.append(el("b", null, k.name), el("span", null, k.teacher), el("span", null, k.room));
      if (k.signs.length) d.appendChild(el("i", "sg", k.signs.join(" ")));
      if (k.btn) {
        d.title = "シラバスを開く";
        d.tabIndex = 0;
        d.setAttribute("role", "button");
        const open = () => { if (k.btn.isConnected) k.btn.click(); };
        d.addEventListener("click", open);
        d.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
      }
    }
    for (let c = 1; c <= 6; c++) for (let p = 1; p <= maxP; p++) if (!used.has(c + "-" + p)) ttCell(g, "e", c + 1, ttRow(p), ttRow(p));
    return g;
  }

  let ttRebuild = null;
  let ttPop = false, ttWait = false, ttTimer = 0; // 条件の小窓が開いているか / 反映待ち / 反映の遅延タイマー
  // 条件(年度・キャンパス)を変えたら、元の入力欄に値を入れ、少し待って(続けて押せるように)元の「表示」を裏で押す
  function ttApply(set) {
    set();
    manualBusy(true);
    clearTimeout(ttTimer);
    ttTimer = setTimeout(() => {
      const sa = document.querySelector("#funcContent .searchArea");
      const show = sa && [...sa.querySelectorAll("button")].find((b) => txt(b) === "表示");
      if (show) { ttWait = true; show.click(); } else manualBusy(false);
    }, 350);
  }
  // 時間割のカード: 中身が収まらないとき(行が増えて 1 コマが低いとき)は、文字と余白を同じ割合で縮める(最小 55%)
  function fitCards(root0) {
    for (const c of root0.querySelectorAll(".cl")) {
      let s = 1;
      for (let i = 0; i < 4; i++) {
        c.style.setProperty("--s", String(s));
        if (c.scrollHeight <= c.clientHeight + 1) break;
        s = Math.max(0.55, s * (c.clientHeight / c.scrollHeight) * 0.96);
      }
    }
  }
  // 画面の大きさが変わると行の高さも変わるので、時間割を作り直す
  let ttResizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(ttResizeTimer);
    ttResizeTimer = setTimeout(() => { if (ttRebuild && root.classList.contains("mu-m-tt")) ttRebuild(); }, 150);
  });
  // 条件の小窓は、外を押したら閉じる
  document.addEventListener("click", (e) => {
    if (!ttPop || !e.target.closest || e.target.closest("#mu-m-tt .fwrap")) return;
    ttPop = false;
    for (const p of document.querySelectorAll("#mu-m-tt .pop.on")) p.classList.remove("on");
    for (const b of document.querySelectorAll("#mu-m-tt .fwrap > button")) b.setAttribute("aria-expanded", "false");
  });
  function buildTimetable() {
    const fc = document.getElementById("funcContent");
    const sets = (fc ? [...fc.querySelectorAll("fieldset.colGakki")] : []).map((fs) => {
      const lg = txt(fs.querySelector("legend.ui-fieldset-legend"));
      return { fs, table: fs.querySelector("table.classTable"), lg, term: (lg.match(/\d+学期/) || [lg])[0] };
    }).filter((s) => s.table);
    const panel = sets.length && sets[0].fs.parentElement;
    if (!panel) return false; // 想定外の DOM は何も作らず元の見た目のまま
    let want = "";
    try { want = sessionStorage.getItem(TT_KEY) || ""; } catch (e) { /* 読めなくても動く */ }
    const m = new Date().getMonth() + 1;
    const byMonth = (m >= 4 && m <= 5 ? 1 : m >= 6 && m <= 8 ? 2 : m >= 9 && m <= 11 ? 3 : 4) + "学期";
    const cur = sets.find((s) => s.term === want) || sets.find((s) => s.term === byMonth) || sets[0];

    const old = document.getElementById("mu-m-tt");
    if (old) old.remove();
    const wrap = el("div");
    wrap.id = "mu-m-tt";
    const hd = el("div", "tthd");
    hd.appendChild(el("h1", null, "学生時間割表"));
    const year = (sets[0].lg.match(/\d{4}年度/) || [""])[0];
    if (year) hd.appendChild(el("span", "ttyear", year));
    for (const s of sets) {
      const b = button("mu-pill" + (s === cur ? " on" : ""), null, s.term);
      b.addEventListener("click", () => {
        try { sessionStorage.setItem(TT_KEY, s.term); } catch (e) { /* 保存できなくても動く */ }
        if (ttRebuild) ttRebuild();
      });
      hd.appendChild(b);
    }
    const sum = txt(cur.fs.querySelector("div.alignRight")).match(/(\d+(?:\.\d+)?)\s*$/);
    if (sum) hd.appendChild(el("span", "sum", "合計 " + sum[1] + " 単位"));
    // 実機の文言は「進級見込判定」(「遅延」ではない)。文言の一部「見込判定」で引き当てる
    const judge = () => [...fc.querySelectorAll("button")].find((b) => txt(b).includes("見込判定"));
    const delay = judge();
    if (delay) {
      const b = button("mu-pill small", null, txt(delay));
      b.addEventListener("click", () => { const o = judge(); if (o) o.click(); });
      hd.appendChild(b);
    }
    // 条件(年度・キャンパス)は、元の検索欄を使わず自前の小窓で選ぶ。選んだら元の入力欄に値を入れ、「表示」を裏で押す(自動で反映)
    const sa = fc.querySelector(".searchArea");
    const spin = sa && sa.querySelector("span.ui-spinner input.ui-spinner-input");
    const campus = sa && sa.querySelector('[id$="campusNo"] select');
    const fw = el("div", "fwrap");
    const cond = button("mu-pill ghost small", null, "条件");
    cond.setAttribute("aria-expanded", String(ttPop));
    const pop = el("div", "pop" + (ttPop ? " on" : ""));
    cond.addEventListener("click", () => { ttPop = !ttPop; pop.classList.toggle("on", ttPop); cond.setAttribute("aria-expanded", String(ttPop)); });
    if (spin) {
      const lbl = el("b", null, (spin.value || year) + "年度");
      const step = (n) => ttApply(() => { const v = (+spin.value || new Date().getFullYear()) + n; spin.value = String(v); spin.dispatchEvent(new Event("change", { bubbles: true })); lbl.textContent = v + "年度"; });
      const prev = button("stepbtn", "前の年度", "‹"), next = button("stepbtn", "次の年度", "›");
      prev.addEventListener("click", () => step(-1));
      next.addEventListener("click", () => step(1));
      const st = el("div", "stepper");
      st.append(prev, lbl, next);
      pop.append(el("div", "sec3", "年度"), st);
    }
    if (campus) {
      const chips = el("div", "chips");
      const pills = [...campus.options].map((o, i) => {
        const c = button("mu-pill" + (campus.selectedIndex === i ? " on" : ""), null, i === 0 ? "すべて" : txt(o));
        c.addEventListener("click", () => ttApply(() => {
          campus.selectedIndex = i;
          campus.dispatchEvent(new Event("change", { bubbles: true }));
          pills.forEach((p, j) => p.classList.toggle("on", j === i));
        }));
        chips.appendChild(c);
        return c;
      });
      pop.append(el("div", "sec3", "キャンパス"), chips);
    }
    fw.append(cond, pop);
    hd.appendChild(fw);

    const card = el("div", "ttcard");
    card.appendChild(ttGrid(readTimetable(cur.table)));
    wrap.append(hd, card);
    panel.classList.add("mu-tt-panel");
    panel.prepend(wrap);
    fitCards(card); // 配置が済んでから(高さが決まってから)、収まらないカードを縮める
    root.classList.add("mu-tt-ok");
    return true;
  }

  let ttMo = null;
  function stopTimetable() {
    if (ttMo) { ttMo.disconnect(); ttMo = null; }
    ttRebuild = null;
    root.classList.remove("mu-tt-ok", "mu-tt-search");
  }
  function startTimetable() {
    const fc = document.getElementById("funcContent");
    if (!fc) return;
    if (ttMo) ttMo.disconnect(); // 条件の表示状態(mu-tt-search)は引き継ぐので、stopTimetable は呼ばない
    boundFc = fc;
    // デバウンスしない: MutationObserver は描画の前に呼ばれるので、差し替わった同じフレームで整形すれば、整形前の姿が見えない
    const mo = ttMo = new MutationObserver(() => run());
    // 自分の変更で再発火しないよう、整形する間だけ observer を切る
    function run() {
      mo.disconnect();
      if (ttWait) { ttWait = false; manualBusy(false); } // 条件を変えた結果で、表が差し替わった
      let ok = false;
      try { ok = buildTimetable(); } catch (e) { /* 失敗しても元の見た目に戻るだけ */ }
      T("buildTimetable " + (ok ? "ok" : "待ち"));
      if (ok) done();
      if (ttMo === mo) mo.observe(fc, { childList: true, subtree: true });
    }
    ttRebuild = run;
    run();
    setTimeout(done, 4000); // 想定外の DOM で作れないときも、覆いは外して元の画面を見せる
  }

  // 冪等: 欠けている部品だけ作る
  function build() {
    if (!document.getElementById("mu-m-top")) document.body.prepend(buildTop());
    if (!document.getElementById("mu-m-drawer")) document.body.prepend(buildDrawer());
    if (!document.getElementById("mu-m-foot")) document.body.appendChild(buildFoot());
  }

  // 画面を直接取りに行くと MUSCAT 自身のログイン画面(200)が返ることがある。入口から入り直す(30秒に1回まで)
  function reenter() {
    try {
      if (Date.now() - (+sessionStorage.getItem("mu-m-sso") || 0) < 30000) return false;
      sessionStorage.setItem("mu-m-sso", String(Date.now()));
      chrome.runtime.sendMessage({ type: "mu-bounce" }, () => {
        void chrome.runtime.lastError;
        location.replace("/uprx/ShibbolethAuthServlet");
      });
      return true; // 入り直す間はローディングのまま(ログイン画面を見せない)
    } catch (e) { return false; /* 何もしない=ログイン画面のまま */ }
  }

  function start() {
    if (!document.getElementById("wrap") || !document.getElementById("menuForm:mainMenu")) {
      root.classList.remove("mu-m"); // ログイン前などメニューの無いページは元のまま
      if (/\/Bsa00101\.xhtml$/.test(location.pathname) && reenter()) return;
      // 入り直しの途中の中継ページは、元の画面の残骸になるので見せない(覆いを保つ)
      try {
        chrome.runtime.sendMessage({ type: "mu-bouncing" }, (r) => {
          if (chrome.runtime.lastError || !(r && r.on)) done(); else hold(20000);
        });
      } catch (e) { done(); }
      return;
    }
    T("start (DOMContentLoaded 後)");
    root.classList.toggle("mu-m-open", saved());
    // ホームと掲示一覧は、整形が終わった時点で各 run() が覆いを外す(ここで外すと、遅れて届く中身が整う前に見えてしまう)
    const go = () => { sync(); watchBusy(); if (!root.classList.contains("mu-m-home") && !root.classList.contains("mu-m-news") && !root.classList.contains("mu-m-tt")) done(); };
    if (currentScreen().home) restore((went) => { if (!went) go(); }); else go();
    // 画面の切り替えの監視。ホームのタイルなどは、ページを読み込み直さず #wrap ごと通信で差し替えるので、
    // 古い #wrap に付けた監視は外れる。body の直下の変化で #wrap の差し替えを見つけ、新しい #wrap に付け直す
    let watchedWrap = null, syncTimer = 0;
    const later = () => { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 120); }; // 差し替えの途中で判定しないよう、変更が止まってから
    const watchWrap = (now) => {
      const w = document.getElementById("wrap");
      if (!w || w === watchedWrap) return;
      watchedWrap = w;
      new MutationObserver(later).observe(w, { childList: true, subtree: true });
      // #wrap の差し替えは 1 回の操作で一気に行われ、途中の状態は無い。待つと元のページが一瞬写るので、描画の前にすぐ整形する
      if (now) sync(); else later();
    };
    watchWrap();
    // 部分更新で body の直下が差し替わっても枠を戻す
    new MutationObserver(() => {
      if (!document.getElementById("mu-m-top") || !document.getElementById("mu-m-drawer") || !document.getElementById("mu-m-foot")) build();
      watchWrap(true);
    }).observe(document.body, { childList: true });
  }

  // 開いている画面を background に伝える(再読み込みで 500 になったとき、入り直した先で元の画面に戻すため)
  function report(leaf) {
    try { chrome.runtime.sendMessage({ type: "mu-screen", leaf }); } catch (e) { /* 拡張の再読み込み直後は送れない */ }
  }
  // 入り直した直後なら、ホームを描かずに直前の画面へ進む。cb(true) = 進んだ(このページは作らない)
  function restore(cb) {
    try {
      chrome.runtime.sendMessage({ type: "mu-restore" }, (r) => {
        if (chrome.runtime.lastError) return cb(false);
        const a = r && r.leaf ? findLeaf(r.leaf) : null;
        if (a) { hold(20000); a.click(); cb(true); } else { report(""); cb(false); }
      });
    } catch (e) { cb(false); /* 同上 */ }
  }

  // 出席確認: 学期や基準日を変えたら、元の「表示」を自動で押す(ボタンは CSS で隠す)。通信中の表示は watchBusy が出す
  // PrimeFaces は jQuery の trigger で change を出すので、addEventListener では拾えない。値を一定間隔で見比べる
  let attLast = "", attKick = "";
  setInterval(() => {
    if (!root.classList.contains("mu-m-att")) { attLast = ""; attKick = ""; return; } // 成績照会はチェックが複数あるので、自動では押さず「表示」ボタンを残す(画面を離れたら、押した値の記録も消す。残すと、戻ってから同じ値へ変えても押されない)
    const sa = document.querySelector("#funcContent .searchArea");
    const v = sa ? [...sa.querySelectorAll("select, input")].map((i) => i.value + (i.checked ? "+" : "")).join("|") : "";
    if (!v) return;
    if (attLast && v !== attLast && v !== attKick) { attKick = v; sa.querySelector(".btnSearchLocation button")?.click(); }
    attLast = v;
  }, 400);

  // シラバス検索: 条件が 17 項目あるので、普段使わないものは「詳細条件」にたたむ(項目名で判定。行の並びは利用者ごとに違う)
  const SYL_RARE = ["入学年度学期", "学科組織", "成績用科目分類", "授業管理部署", "科目授業種別", "開講期間区分", "科目ナンバリング", "対象授業"];
  setInterval(() => {
    if (!root.classList.contains("mu-m-syl")) { root.classList.remove("mu-m-syl-ready"); return; }
    const sa = document.querySelector("#funcContent .searchArea");
    const dl = sa && sa.querySelector("dl.searchItem");
    if (!dl) return;
    for (const r of sa.querySelectorAll(".searchItemRow, .searchItemRowBottom")) { // 対象授業の行だけ、クラス名が違う
      const dt = r.querySelector("dt");
      r.classList.toggle("mu-rare", !!dt && SYL_RARE.some((k) => txt(dt).startsWith(k)));
      r.classList.toggle("mu-wide", !!dt && txt(dt).startsWith("学科組織")); // 選択肢の名前が長いので 2 列分使う
    }
    root.classList.add("mu-m-syl-ready"); // 行の印を付け終えたら、条件のカードを見せる(付ける前は CSS で隠す)
    const has = !!sa.querySelector(".mu-rare"); // ふせん一覧のように、畳む項目が無い画面では「詳細条件」を出さない
    const old = document.getElementById("mu-syl-more");
    if (!has) { if (old) old.remove(); return; }
    if (old) return;
    const b = el("button", "mu-syl-more");
    b.id = "mu-syl-more";
    b.type = "button";
    const set = () => { b.textContent = root.classList.contains("mu-m-syl-more") ? "詳細条件を閉じる" : "詳細条件を開く"; };
    b.addEventListener("click", (e) => { e.preventDefault(); root.classList.toggle("mu-m-syl-more"); set(); });
    set();
    const bar = sa.querySelector(".btnAreaBottom"); // クリア・検索と同じ行の左端に置く(縦を使わない)
    if (bar) bar.prepend(b); else dl.after(b);
  }, 60);

  // 個人設定の「テーマ設定」タブは、この拡張の見た目(ライト固定)と関係しないので隠す(ajax で作り直されても隠し直す)
  setInterval(() => {
    if (!root.classList.contains("mu-m-stu")) return;
    for (const li of document.querySelectorAll("#funcContent .ui-tabs-nav li")) if (txt(li).includes("テーマ設定")) li.classList.add("mu-hide");
  }, 300);

  // 教室予約の「絞り込み」: 標準の開閉(jQuery のスライド)はカクつくので、開閉の状態と動きは自前で持つ。
  // 中身は消さず CSS で隠すだけなので、入力値はそのまま送られる(標準の legend は使わない)
  let roomOpen = false;
  function toggleRoom() {
    const c = document.querySelector("#funcContent .searchArea fieldset .ui-fieldset-content"), fs = c && c.closest("fieldset");
    if (!c) return;
    if (c._mu) { c._mu.cancel(); c._mu = null; } // 連打: いまの高さから切り替える
    roomOpen = !roomOpen;
    fs.classList.add("mu-room-open"); // 表示させてから、開くときの自然な高さを測る
    // height は余白と枠線を含まないので、余白・枠線も一緒に 0 から動かす(含めないと、終わりに 34px 戻る「ずれ」が出る)
    const cs = getComputedStyle(c), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom), bt = parseFloat(cs.borderTopWidth);
    const h = c.getBoundingClientRect().height - pt - pb - bt;
    const full = { height: h + "px", paddingTop: pt + "px", paddingBottom: pb + "px", borderTopWidth: bt + "px", opacity: 1 };
    const none = { height: "0px", paddingTop: "0px", paddingBottom: "0px", borderTopWidth: "0px", opacity: 0 };
    c.style.overflow = "hidden";
    const a = c._mu = c.animate(roomOpen ? [none, full] : [full, none], { duration: 320, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    a.onfinish = () => {
      if (c._mu !== a) return;
      c._mu = null;
      if (!roomOpen) fs.classList.remove("mu-room-open");
      a.cancel(); // 印を外したあとに取り消す(取り消した瞬間に、元の高さが 1 フレーム見えないように)
      c.style.overflow = "";
    };
  }
  // 教室予約: 検索・日付の切り替えは、最初の行が届くまで 2〜3 秒かかり、その間は元の画面が薄くなるだけ。拡張のローディングを出す
  // (そのあと、残りの行が 80 行ずつ 10 秒以上かけて届き、そのたびに画面が固まって崩れる。全部届くまで、操作できないローディングで覆う)
  let roomLoad = null;
  const roomRows = () => document.querySelectorAll("#funcContent .reserveRoom tbody tr").length;
  document.addEventListener("click", (e) => {
    if (!root.classList.contains("mu-m-room")) return;
    const b = e.target.closest && e.target.closest("#funcContent button");
    if (!b || b.disabled || b.classList.contains("ui-state-disabled")) return;
    const t = txt(b);
    if (!["検索", "前へ", "次へ", "指定日へ移動"].some((k) => t.includes(k))) return;
    roomLoad = { t: Date.now(), last: roomRows(), at: 0, moved: false };
    manualBusy(true);
  }, true);
  // 教室予約: 「絞り込み」ボタンを作り、詳細項目を開閉する(ajax で消えても作り直す)
  setInterval(() => {
    if (roomLoad) { // 行が増え続けているあいだは出し続け、3.5 秒増えなくなったら外す。1 行も届かなくても、12 秒で外す
      const now = Date.now(), n = roomRows();
      if (n !== roomLoad.last) { roomLoad.last = n; roomLoad.at = now; roomLoad.moved = true; }
      const idle = now - (roomLoad.at || roomLoad.t);
      if ((roomLoad.moved && idle > 3500) || (!roomLoad.moved && now - roomLoad.t > 12000) || now - roomLoad.t > 60000) { manualBusy(false); roomLoad = null; } else manualBusy(true);
    }
    const old = document.getElementById("mu-room-fbtn");
    if (!root.classList.contains("mu-m-room")) { if (old) old.remove(); return; }
    const sa = document.querySelector("#funcContent .searchArea"), bar = document.querySelector("#funcContent .btnAreaBottom");
    if (!sa) return;
    for (const b of document.querySelectorAll("#funcContent button")) { // 並びと見た目の印(クラス名では区別できない)
      const t = txt(b), inBar = !!bar && bar.contains(b);
      b.classList.toggle("mu-room-usage", t.includes("教室利用状況表"));
      b.classList.toggle("mu-room-clear", inBar && t === "クリア");
      b.classList.toggle("mu-room-dl", inBar && t === "ダウンロード");
      b.classList.toggle("mu-room-search", inBar && t === "検索");
      b.classList.toggle("mu-room-hide", t === "非表示");
    }
    const ws = [...document.querySelectorAll("#funcContent .reserveRoom.wrapper")]; // 4 枚重なるうち、スクロールする本体だけが外枠になる
    const mainW = ws.find((x) => /auto|scroll/.test(getComputedStyle(x).overflow));
    for (const w of ws) { // 本体 / 左の固定列 / 固定の見出し 2 枚を、行数で見分ける(スクロールで標準の JS が inline の高さを書き換えるので、style では見分けない)
      const heads = w.querySelectorAll("tr").length <= 2;
      w.classList.toggle("mu-room-main", w === mainW);
      w.classList.toggle("mu-room-head", heads);
      w.classList.toggle("mu-room-left", w !== mainW && !heads);
    }
    for (const tr of document.querySelectorAll("#funcContent .reserveRoom tbody tr:not([data-mu])")) { // 日付の帯の行に印(最初の 1 回だけ全行を見る)
      tr.dataset.mu = "1";
      if (/^\d{4}\/\d{2}\/\d{2}\(/.test(txt(tr.cells[0]))) tr.classList.add("mu-room-band");
    }
    // 空き教室の「時間帯」と「空き時間」を 2 行に分ける改行(文字ノードの前には CSS で改行を入れられない)
    const vac = sa.querySelector("fieldset .ui-fieldset-content > :first-child .ui-outputpanel");
    if (vac && !vac.querySelector(".mu-br")) {
      const tn = [...vac.childNodes].find((x) => x.nodeType === 3 && x.textContent.includes("空き時間"));
      if (tn) vac.insertBefore(el("span", "mu-br"), tn);
    }
    if (!bar) return;
    let fb = old;
    if (!fb) {
      fb = el("button", "");
      fb.id = "mu-room-fbtn";
      fb.type = "button";
      fb.append("絞り込み ", el("span", "n off", "0"), el("i", "chev"));
      fb.addEventListener("click", (e) => { e.preventDefault(); toggleRoom(); });
      bar.prepend(fb);
    }
    const c = sa.querySelector("fieldset .ui-fieldset-content");
    if (c && !c._mu) c.closest("fieldset").classList.toggle("mu-room-open", roomOpen); // ajax で作り直されても、開閉の状態を戻す
    fb.setAttribute("aria-expanded", roomOpen);
    let n = 0; // 曜日(チェックが複数の行)に選択あり 1 + 空き教室(チェック 1 つの行) 1 + 「一覧に列を表示する」(2 つ目のラジオ) 1
    for (const r of sa.querySelectorAll("fieldset .searchItemRow")) {
      const bx = r.querySelectorAll(".ui-chkbox-box");
      if (bx.length > 1) n += r.querySelector(".ui-chkbox-box.ui-state-active") ? 1 : 0;
      else if (bx.length === 1 && bx[0].classList.contains("ui-state-active")) n++;
    }
    const rd = sa.querySelectorAll("fieldset .ui-radiobutton-box");
    if (rd[1] && rd[1].classList.contains("ui-state-active")) n++;
    const nb = fb.querySelector(".n");
    nb.textContent = n;
    nb.classList.toggle("off", n === 0);
  }, 200);

  let lastKey = "";
  function sync() {
    const cur = currentScreen(), key = JSON.stringify(cur);
    T("sync " + key + (key === lastKey ? "(変化なし)" : ""));
    if (key === lastKey) {
      // 同じ画面のまま #wrap ごと差し替わったときは、新しい #funcContent に整形の監視をかけ直す
      const fc = document.getElementById("funcContent");
      if (fc && fc !== boundFc) { if (cur.home) startHome(); } // 掲示板は React 版が描くので、旧版の整形は付けない
      return;
    }
    lastKey = key;
    const old = document.getElementById("mu-m-drawer");
    if (old) old.remove();
    root.classList.toggle("mu-m-home", !!cur.home);
    build();
    const news = cur.leaf === "掲示板";
    // React 版(dist/muscat-react.js)が描く画面では、旧版の整形(時間割・出席確認・掲示)を止める
    const REACT_LEAVES = ["学生時間割表", "出席確認", "成績照会", "学籍情報照会", "健康診断情報照会", "掲示板"];
    root.classList.toggle("mu-m-news", news && !REACT_LEAVES.includes(cur.leaf));
    const legacy = !REACT_LEAVES.includes(cur.leaf) && !cur.setting; // 個人設定(Bsa004)も React 版が描く
    const tt = legacy && cur.leaf === "学生時間割表";
    root.classList.toggle("mu-m-tt", tt);
    root.classList.toggle("mu-m-att", legacy && cur.leaf === "出席確認");
    root.classList.toggle("mu-m-gra", legacy && cur.leaf === "成績照会");
    root.classList.toggle("mu-m-room", cur.leaf === "教室予約(参照のみ)"); // 条件のカードと時間軸の表は、syl とは別の作りなので専用の整形を使う
    root.classList.toggle("mu-m-saf",cur.leaf === "安否確認回答"); // 回答の依頼があるときの作りは未確認(今は「データなし」の表示だけ整える)
    root.classList.toggle("mu-m-stu",(legacy && (cur.leaf === "学籍情報照会" || cur.leaf === "健康診断情報照会"))); // 見出しごとに開閉する情報画面
    root.classList.toggle("mu-m-syl",cur.leaf === "シラバス" || cur.leaf === "教員スケジュール"); // 教職員検索も、同じ検索フォームの作りなので、同じ整形を使う
    stopNews(); // 掲示板は React 版が描くので、旧版の掲示整形(startNews)は走らせない
    if (!tt) stopTimetable();
    if (cur.home) { startHome(); report(""); } // ホームに戻ったら直前の画面の記録を消す(再読み込みで前の画面に戻らないように)
    else {
      if (homeMo) { homeMo.disconnect(); homeMo = null; }
      if (tt) startTimetable();
      report(cur.leaf || "");
    }
  }

  // サーバーが遅いと、ページの解析が終わる(DOMContentLoaded)まで数秒かかる。ヘッダーとメニューは本文より先に届くので、
  // 本文の枠(#mainWrapBottom)が始まった時点でドロワーとヘッダーだけ先に出し、覆いは本文の部分だけにする。
  // ホームは速く、再読み込み後の復元判定もあるので、通常の流れに任せる。整形は DOMContentLoaded 後の start() が行う
  function startEarly() {
    const mo = new MutationObserver(() => {
      if (!document.getElementById("mainWrapBottom") || !document.getElementById("menuForm:mainMenu")) return;
      mo.disconnect();
      if (!document.getElementById("wrap") || currentScreen().home) return;
      try {
        // フッターは作らない(解析中に body の末尾へ足すと、あとから届く本文がフッターの後ろに入ってしまう)
        if (!document.getElementById("mu-m-top")) document.body.prepend(buildTop());
        if (!document.getElementById("mu-m-drawer")) document.body.prepend(buildDrawer());
        root.classList.add("mu-m-frame");
        T("early frame");
      } catch (e) { /* 失敗しても、DOMContentLoaded 後の通常の流れで作る */ }
    });
    mo.observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", () => mo.disconnect());
  }

  root.classList.toggle("mu-m-open", saved()); // 本文のずれ(ちらつき)を DOM 構築前に決めておく
  if (document.readyState === "loading") { startEarly(); document.addEventListener("DOMContentLoaded", start); }
  else start();
})();
