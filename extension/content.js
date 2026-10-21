(function () {
  const TOP = "トップページ";
  const CLS = "mu-rewrite";
  const isPersonal = (h) => h === "個人呼出" || h === "個人通知"; // 同じ個人向けカードの別名
  const NS = "http://www.w3.org/2000/svg";
  let cur = null; // 描画中のpathname(非対象ならnull)
  let failed = false;
  let loading = false;
  let token = 0; // 古い非同期処理を無効化する
  let closeAll = null; // 描画中のドロワー/ユーザーメニューを閉じる
  let offScroll = null; // 目次の現在位置のスクロール監視を外す

  const FOLDER = "M3 6h6l2 2h10v12H3z";
  const MENU_ICONS = {
    "お知らせ": "M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4",
    "キャンパスライフ": "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6",
    "奨学金": "M2 9l10-5 10 5-10 5-10-5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
    "証明書": "M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h8",
    "クラブ活動": "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
    "ボランティア活動": "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
    "就職・キャリア支援": "M3 8h18v12H3zM9 8V5h6v3M3 13h18",
    "アンケート・調査": "M9 4h6v3H9zM7 5H5v16h14V5h-2M9 14l2 2 4-4",
    "電子キャビネット": FOLDER,
    "検定試験（学内受付）": "M6 3h9l5 5v13H6zM14 3v6h6M9 14l2 2 4-4",
  };
  const HOME = "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6";
  const USER_ITEMS = [
    ["表示言語", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9"],
    ["アカウントとセキュリティ", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4"],
    ["サインアウト", "M9 21H5V3h4M16 17l5-5-5-5M21 12H9"],
  ];
  const LEGEND = [["class", "授業"], ["off", "祝日・休み"], ["event", "イベント"], ["reg", "履修登録"], ["exam", "試験・補講"]];

  // 本文HTMLは外部由来。許可リスト方式で、未知のタグは中身だけ残し、属性は表のものだけ通す
  const ALLOW_TAGS = new Set("A B I U S EM STRONG SMALL SUB SUP MARK DEL INS BR HR P DIV SPAN UL OL LI DL DT DD BLOCKQUOTE PRE CODE H1 H2 H3 H4 H5 H6 TABLE THEAD TBODY TFOOT TR TD TH CAPTION IMG FONT".split(" "));
  const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "SVG", "MATH", "TEMPLATE", "NOSCRIPT"]);
  const ALLOW_ATTRS = { A: ["href", "title"], IMG: ["src", "alt", "title", "width", "height"], TD: ["colspan", "rowspan"], TH: ["colspan", "rowspan"] };

  // new URL で解釈するので、タブや改行を混ぜた "java\tscript:" も scheme として判定される
  function isSafeUrl(u) {
    try { return /^(https?|mailto):$/.test(new URL(u, location.href).protocol); } catch (e) { return false; }
  }

  // 本文の style は文字の装飾だけ通す(position/z-index などで画面を覆えないようにする)
  const STYLE_OK = new Set(["color", "background-color", "font-weight", "font-style", "text-decoration", "text-align"]);
  function safeStyle(s) {
    return s.split(";").map((d) => { const i = d.indexOf(":"); return i < 0 ? [d, null] : [d.slice(0, i), d.slice(i + 1)]; })
      .filter(([p, v]) => v != null && STYLE_OK.has(p.trim().toLowerCase()) && /^[#a-z0-9(),.%\s-]+$/i.test(v.trim()))
      .map(([p, v]) => p.trim().toLowerCase() + ":" + v.trim()).join(";");
  }

  function cleanNode(node) {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) continue;
      if (ch.nodeType !== 1 || DROP_TAGS.has(ch.tagName)) { ch.remove(); continue; }
      cleanNode(ch);
      if (!ALLOW_TAGS.has(ch.tagName)) { ch.replaceWith(...ch.childNodes); continue; }
      const tc = ch.tagName === "SPAN" && ch.getAttribute("data-text-color");
      const ok = ALLOW_ATTRS[ch.tagName] || [];
      for (const a of [...ch.attributes]) {
        const n = a.name.toLowerCase();
        const keep = ok.includes(n) || n === "style";
        if (!keep || ((n === "href" || n === "src") && !isSafeUrl(a.value))) ch.removeAttribute(a.name);
      }
      const st = ch.getAttribute("style");
      if (st != null) {
        const safe = safeStyle(st);
        if (safe) ch.setAttribute("style", safe); else ch.removeAttribute("style");
      }
      // 見出しの文字色は data-text-color で来る。形式を検証した値だけ style に変換する
      if (tc && /^#[0-9a-fA-F]{3,8}$/.test(tc)) ch.setAttribute("style", "color:" + tc);
      if (ch.tagName === "A") {
        ch.setAttribute("target", "_blank");
        ch.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    cleanNode(doc.body);
    return doc.body.innerHTML;
  }

  // API由来のURLは http(s) だけを通す(javascript: 等の実行を防ぐ)
  function isHttp(u) {
    try { return /^https?:$/.test(new URL(u, location.href).protocol); } catch (e) { return false; }
  }

  const PAGE = "/dashboard/page/";
  function decoded(p) {
    try { return decodeURIComponent(p); } catch (e) { return null; }
  }
  function isTarget(p) {
    const d = decoded(p);
    return d === "/dashboard" || (d != null && d.startsWith(PAGE));
  }
  // URL 末尾の slug。/dashboard はトップページ
  function slugOf(p) {
    const d = decoded(p) || "";
    return d.startsWith(PAGE) ? d.slice(PAGE.length).split("/")[0] : TOP;
  }

  function el(tag, cls, text, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  // shapes: path の d 文字列、または [タグ名, 属性] の配列
  function icon(size, shapes, sw) {
    const s = document.createElementNS(NS, "svg");
    const attrs = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": sw || 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" };
    for (const k in attrs) s.setAttribute(k, attrs[k]);
    for (const sh of [].concat(shapes)) {
      const [tag, a] = typeof sh === "string" ? ["path", { d: sh }] : sh;
      const n = document.createElementNS(NS, tag);
      for (const k in a) n.setAttribute(k, a[k]);
      s.appendChild(n);
    }
    return s;
  }

  function button(cls, label, parent) {
    const b = el("button", cls, null, parent);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  }

  async function fetchJson(url) {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error(url + " " + r.status);
    const j = await r.json();
    // このAPIはエラーでも HTTP 200 で is_successful:false を返す
    if (j && j.is_successful === false) throw new Error(url + " " + ((j.result && j.result.message) || "failed"));
    return j;
  }

  // 書き込み用。読み込み待ち(pending)の対象ではないので getJson には載せない
  async function sendJson(method, url, body) {
    const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(url + " " + r.status);
    const j = await r.json();
    if (j && j.is_successful === false) throw new Error(url + " " + ((j.result && j.result.message) || "failed"));
    return j;
  }

  // 描画中(pending が配列のあいだ)の取得を控えておき、全部終わるまで画面を出さない
  let pending = null;
  function getJson(url) {
    const p = fetchJson(url);
    if (pending) pending.push(p);
    return p;
  }

  function fmtWhen(sec) {
    const d = new Date(sec * 1000);
    const n = new Date();
    if (d.toDateString() === n.toDateString()) return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if (en()) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return (d.getMonth() + 1) + "/" + d.getDate();
  }

  // 元のユーザードロップダウンを操作して項目を実行する。操作中だけ元の表示を透明にする
  // 表示言語はポータルの i18next と同じ localStorage("i18nextLng": ja / en)に保存される。
  // 元の子メニューは合成クリックで開かないので、同じ値を直接書いて再読み込みする
  const lang = () => {
    try { return /^en/.test(localStorage.getItem("i18nextLng") || "") ? "en" : "ja"; } catch (e) { return "ja"; }
  };
  // 拡張自身の固定文言の英訳。キーは日本語の文言(辞書に無ければ日本語のまま出る)
  const EN = {
    "トップページ": "Top page",
    "キーワード検索": "Search keywords",
    "メニューを開く": "Open menu",
    "メニューを閉じる": "Close menu",
    "ユーザーメニュー": "User menu",
    "ユーザーメニューを閉じる": "Close user menu",
    "メニュー": "Menu",
    "閉じる": "Close",
    "アカウントとセキュリティ": "Account & security",
    "サインアウト": "Sign out",
    "表示言語": "Language",
    "サービス": "Services",
    "授業・シラバス・掲示": "Classes, syllabus, notices",
    "課題・教材": "Assignments & materials",
    "学生のみ": "Students only",
    "MUSCAT スマホ版": "MUSCAT mobile",
    "MUSCAT(スマートフォン)": "MUSCAT (smartphone)",
    "その他リンク": "Other links",
    "個人向けのお知らせ": "Personal notices",
    "大学からのお知らせ": "University notices",
    "お知らせ": "Notices",
    "学年暦": "Academic calendar",
    "すべて見る": "View all",
    "電子キャビネット": "Digital Cabinet", // API に英語名が無い
    "未読": "Unread",
    "配信されているお知らせはありません": "No notices",
    "読み込めませんでした": "Could not load",
    "読み込み中": "Loading",
    "読み込み中…": "Loading…",
    "画像": "Image",
    "ファイル": "File",
    "前の月": "Previous month",
    "次の月": "Next month",
    "授業": "Classes",
    "祝日・休み": "Holidays & breaks",
    "イベント": "Events",
    "履修登録": "Registration",
    "試験・補講": "Exams & makeups",
    "上のフォルダへ": "Up one folder",
    "フォルダの中にファイルはありません": "This folder is empty",
    "一覧": "List",
    "詳細": "Details",
    "タイトル・本文で検索": "Search title or body",
    "カテゴリ": "Category",
    "すべてのカテゴリ": "All categories",
    "すべて": "All",
    "未読のみ": "Unread only",
    "ピン留め": "Pinned",
    "すべて既読にする": "Mark all as read",
    "このカテゴリのお知らせを全部既読にします(もう一度押すと実行)": "Mark all notices in this category as read (click again to confirm)",
    "ピン留めのお知らせを全部既読にします(もう一度押すと実行)": "Mark all pinned notices as read (click again to confirm)",
    "全カテゴリのお知らせを全部既読にします(もう一度押すと実行)": "Mark all notices in all categories as read (click again to confirm)",
    "既読にする": "Mark as read",
    "未読に戻す": "Mark as unread",
    "失敗しました": "Failed",
    "← 一覧へ": "← Back to list",
    "さらに表示": "Show more",
    "該当するお知らせはありません": "No matching notices",
    "公開期間": "Published",
    "【イベント】": "[Event] ",
    "目次": "Contents",
    "※全てのお知らせを確認したい場合やカテゴリ毎に検索をしたい場合は、「すべて見る」ボタンを押してください。": "To see all notices or search by category, press the “View all” button.",
    "このページの内容": "On this page",
  };
  const t = (ja) => MU.tr(EN, lang(), ja);
  const en = () => lang() === "en";

  function setLang(code) {
    try { localStorage.setItem("i18nextLng", code); } catch (e) { console.warn("[mu-rewrite] language not saved", e); return; }
    location.reload();
  }
  // 元のページ文面の「MOREボタン」は、この画面では「すべて見る」ボタンにあたる
  // 本文が日本語にフォールバックしたとき、辞書にある定型の文は英訳する(タグ除去後に全文一致)
  const reword = (h) => {
    const s = String(h || "").replace(/MOREボタン/g, "「すべて見る」ボタン");
    const k = s.replace(/<[^>]*>/g, "").trim();
    return en() && EN[k] ? EN[k] : s;
  };

  // 英語表示のときは API の *_en を優先する(無ければ日本語)
  const L = (o, k) => (lang() === "en" && o[k + "_en"]) || o[k];

  // kind は "account" | "signout"。項目名は言語で変わるので、危険色のクラスと言語メニューの除外で選ぶ
  function proxyUserMenu(kind) {
    const html = document.documentElement;
    html.classList.add("mu-proxy-click");
    const t = document.querySelector("#menu .ant-dropdown-trigger");
    if (t) for (const ev of ["mouseover", "mouseenter", "click"]) t.dispatchEvent(new MouseEvent(ev, { bubbles: true }));
    setTimeout(() => {
      const items = [...document.querySelectorAll('.ant-dropdown [role="menuitem"]')];
      const danger = (n) => n.classList.contains("ant-dropdown-menu-item-danger");
      const it = items.find((n) => kind === "signout" ? danger(n) : !danger(n) && !/language/i.test(n.className));
      if (it) it.click(); else console.warn("[mu-rewrite] user menu item not found", kind);
    }, 300);
    setTimeout(() => html.classList.remove("mu-proxy-click"), 500);
  }

  function addNavNodes(nodes, depth, parent, slug) {
    for (const n of nodes || []) {
      // トップページ自体は先頭に自前で足し、その子は最上位として並べる
      if (depth === 0 && n.title === TOP) { addNavNodes(n.children, 0, parent, slug); continue; }
      const ext = n.external_link;
      if (ext && !isHttp(ext)) continue;
      const cur = !ext && n.slug === slug;
      const kids = n.children && n.children.length ? n.children : null;
      const holder = kids ? el("div", "mu-navitem", null, parent) : parent; // 開閉ボタンを重ねるための枠
      const a = el("a", "mu-nav" + (depth ? " mu-navsub" : "") + (cur ? " mu-cur" : ""), null, holder);
      if (cur) a.setAttribute("aria-current", "page");
      // ページのURLは title ではなく slug(例: title「就職・キャリア支援」の slug は「就職・キャリア」)
      a.href = ext || "/dashboard/page/" + encodeURIComponent(n.slug || n.title);
      if (ext) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      a.appendChild(icon(depth ? 18 : 20, MENU_ICONS[n.title] || FOLDER));
      el("span", null, t(L(n, "title")), a); // 英語名が無いページ(電子キャビネット)は辞書で補う
      if (kids) {
        // 子は縦線つきの字下げのグループにまとめ、矢印のボタンで開閉できるようにする。
        // 項目名のリンクとは別のボタンにして、押してもページ遷移しない。いまのページを含む枠は開いておく
        const group = el("div", "mu-navgroup", null, parent); // 高さのアニメーション用の枠(grid の行を 1fr ↔ 0fr)
        const inner = el("div", "mu-navin", null, group);
        const hasCur = (ns) => ns.some((c) => c.slug === slug || hasCur(c.children || []));
        const tog = button("mu-navtog", en() ? "Toggle " + L(n, "title") : L(n, "title") + "の中身を開閉", holder);
        tog.appendChild(icon(14, "M6 9l6 6 6-6", 2.5));
        // 閉じている間は inert にして、見えない項目にキーボードが入らないようにする
        const set = (open) => { group.classList.toggle("mu-closed", !open); group.inert = !open; tog.setAttribute("aria-expanded", String(open)); };
        set(hasCur(kids));
        tog.addEventListener("click", () => set(group.classList.contains("mu-closed")));
        addNavNodes(kids, depth + 1, inner, slug);
      }
    }
  }

  function buildHeader(root, userName, tree, slug) {
    const header = el("header", "mu-header", null, root);
    // ハンバーガーはヘッダーの一部(本画面と一緒に動く)。開いている間は隠し、メニュー側の×が閉じる役をする
    const burger = button("mu-burger", t("メニューを開く"), header);
    burger.setAttribute("aria-expanded", "false");
    for (let i = 0; i < 3; i++) el("span", null, null, burger);
    el("div", "mu-logo", "MU Portal", header);

    const search = button("mu-search", null, header);
    search.append(icon(18, ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M21 21l-4.3-4.3"]));
    el("span", null, t("キーワード検索"), search);
    search.addEventListener("click", () => {
      const b = document.querySelector('#menu [class*="button-search-page"]');
      if (b) b.click();
    });

    const user = el("div", "mu-user", null, header);
    const pill = button("mu-pill", t("ユーザーメニュー"), user);
    pill.setAttribute("aria-haspopup", "menu");
    pill.setAttribute("aria-expanded", "false");
    const av = el("span", "mu-avatar", null, pill);
    av.appendChild(icon(20, [["circle", { cx: 12, cy: 8, r: 4 }], "M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"]));
    el("span", null, userName, pill);
    pill.appendChild(icon(12, "M6 9l6 6 6-6", 3));
    const menu = el("div", "mu-menu", null, user);
    menu.setAttribute("role", "menu");
    USER_ITEMS.forEach(([name, d], i) => {
      if (i === 2) el("div", "mu-sep", null, menu);
      const it = button("mu-mi" + (i === 2 ? " mu-danger" : ""), null, menu);
      it.setAttribute("role", "menuitem");
      const l = el("span", "mu-mi-l", null, it);
      l.appendChild(icon(20, d));
      l.appendChild(document.createTextNode(t(name)));
      if (i === 0) {
        el("span", "mu-mi-r", null, it).appendChild(icon(12, "M6 9l6 6 6-6", 3));
        it.setAttribute("aria-expanded", "false");
        const langs = el("div", "mu-langs", null, menu);
        it.addEventListener("click", () => it.setAttribute("aria-expanded", String(langs.classList.toggle("mu-open"))));
        [["ja", "日本語"], ["en", "English"]].forEach(([code, label]) => {
          const b = button("mu-mi mu-lang", null, langs);
          b.setAttribute("role", "menuitemradio");
          b.setAttribute("aria-checked", String(lang() === code));
          el("span", null, label, b);
          if (lang() === code) el("span", "mu-mi-r", "✓", b);
          b.addEventListener("click", () => setLang(code));
        });
        return;
      }
      it.addEventListener("click", () => { setUser(false); proxyUserMenu(i === 2 ? "signout" : "account"); });
    });

    el("button", "mu-ubackdrop", null, root).setAttribute("aria-label", t("ユーザーメニューを閉じる"));
    const bd = el("button", "mu-backdrop", null, root);
    bd.setAttribute("aria-label", t("メニューを閉じる"));
    const nav = el("nav", "mu-drawer", null, root);
    nav.setAttribute("aria-label", t("メニュー"));
    const head = el("div", "mu-drawer-head", null, nav);
    el("span", "mu-logo", "MU Portal", head);
    const x = button("mu-x", t("メニューを閉じる"), head); // 右端
    x.appendChild(icon(18, "M6 6l12 12M18 6L6 18", 2));
    const home = el("a", "mu-nav" + (slug === TOP ? " mu-cur" : ""), null, nav);
    home.href = "/dashboard/page/" + encodeURIComponent(TOP);
    if (slug === TOP) home.setAttribute("aria-current", "page");
    home.appendChild(icon(20, HOME));
    el("span", null, t(TOP), home);
    addNavNodes(tree && tree.result && tree.result.children, 0, nav, slug);

    // silent: 初期表示の設定(フォーカスも保存もしない)
    function setDrawer(open, silent) {
      root.classList.toggle("mu-drawer-open", open);
      document.documentElement.classList.toggle("mu-drawer-on", open); // #mu-root の外のフッターも動かすため
      burger.setAttribute("aria-expanded", String(open));
      if (silent) return;
      (open ? x : burger).focus();
      try { localStorage.setItem("mu-drawer", open ? "1" : "0"); } catch (e) { /* 保存できなくても動く */ }
    }
    function setUser(open) {
      root.classList.toggle("mu-user-open", open);
      pill.setAttribute("aria-expanded", String(open));
    }
    burger.addEventListener("click", () => setDrawer(!root.classList.contains("mu-drawer-open")));
    pill.addEventListener("click", () => setUser(!root.classList.contains("mu-user-open")));
    x.addEventListener("click", () => setDrawer(false));
    bd.addEventListener("click", () => setDrawer(false));
    root.querySelector(".mu-ubackdrop").addEventListener("click", () => setUser(false));
    closeAll = () => {
      if (root.classList.contains("mu-drawer-open")) setDrawer(false);
      if (root.classList.contains("mu-user-open")) setUser(false);
    };
    // 広い画面では、前回閉じていない限り、メニューを開いた状態で始める(狭い画面は暗幕で重なるので閉じたまま)。
    // 読み込み中は非表示なので、最初の表示ではスライドのアニメーションは出ない
    let saved = null;
    try { saved = localStorage.getItem("mu-drawer"); } catch (e) { /* 読めなければ既定(開く) */ }
    if (innerWidth > 760 && saved !== "0") setDrawer(true, true);
  }

  function card(parent, title, linkText, href) {
    const sec = el("section", "mu-card", null, parent);
    const head = el("div", "mu-card-head", null, sec);
    el("h2", null, title, head);
    if (href) el("a", null, linkText, head).href = href;
    return sec;
  }

  function renderItem(it, parent, personal) {
    const d = el("details", "mu-row", null, parent);
    const s = el("summary", null, null, d);
    if (personal) {
      el("span", "mu-ttl", L(it, "title"), s);
      el("span", "mu-sub", [L(it, "publish_from"), fmtWhen(it.publish_start_at)].filter(Boolean).join(" · "), s);
    } else {
      const top = el("span", "mu-top", null, s);
      if (it.category && it.category.name) el("span", "mu-chip", L(it.category, "name"), top);
      if (it.is_read === false) el("span", "mu-chip mu-unread", t("未読"), top);
      el("span", "mu-when", fmtWhen(it.publish_start_at), top);
      el("span", "mu-ttl", L(it, "title"), s);
      if (it.publish_from) el("span", "mu-sub", L(it, "publish_from"), s);
    }
    const body = el("div", "mu-body", null, d);
    body.innerHTML = sanitize(L(it, "content"));
    // 添付は元のポータルと同じ /api/file/view/<uuid> で開く
    const files = [].concat(it.files || [], it.personal_files || []).filter((f) => f && (f.uuid || f.file_name));
    if (files.length) {
      const ul = el("ul", "mu-files", null, body);
      files.forEach((f) => {
        const li = el("li", null, null, ul);
        if (f.uuid) externalLink("", li, "/api/file/view/" + encodeURIComponent(f.uuid)).textContent = f.file_name || f.name || "";
        else li.textContent = f.file_name;
      });
    }
  }

  const infoUrl = (data) => "/api/information/1?" + MU.infoQuery(data);

  function personalCard(blocks, parent) {
    const sec = card(parent, t("個人向けのお知らせ"));
    const list = el("div", "mu-list", null, sec);
    Promise.all(blocks.map((b) => getJson(infoUrl(b.data || {})))).then((rs) => {
      const items = rs.flatMap((r) => (r.result && r.result.items) || []);
      if (!items.length) el("div", "mu-row mu-empty", t("配信されているお知らせはありません"), list);
      items.forEach((it) => renderItem(it, list, true));
    }).catch((e) => {
      console.error("[mu-rewrite]", e);
      el("div", "mu-row mu-empty", t("読み込めませんでした"), list);
    });
  }

  const WEEKDAYS = "日月火水木金土";
  function fmtFull(sec) {
    const d = new Date(sec * 1000);
    if (en()) return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate() + "(" + WEEKDAYS[d.getDay()] + ") " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  // お知らせ一覧ウィンドウ。利用者の操作でだけ開く
  function openNotices() {
    const root = document.getElementById("mu-root");
    if (!root || root.querySelector(".mu-nw")) return;
    const html = document.documentElement;
    const prev = document.activeElement;
    let query = "", unreadOnly = false, pinned = false, category = "", page = 1, pageTotal = 1, items = [], sel = null;
    let counts = { total: null, unread: null }, seq = 0, state = "ok", armed = false, armTimer = 0, searchTimer = 0, detailFail = false;
    const rows = new Map();

    const ov = el("div", "mu-nw", null, root);
    const dlg = el("div", "mu-nw-dlg", null, ov);
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.setAttribute("aria-label", t("お知らせ"));
    html.classList.add("mu-nw-lock");

    const hd = el("header", "mu-nw-head", null, dlg);
    el("h2", null, t("お知らせ"), hd);
    const countEl = el("span", "mu-nw-count", null, hd);
    const closeBtn = button("mu-nw-close", t("閉じる"), hd);
    closeBtn.textContent = "×";

    const body = el("div", "mu-nw-cols", null, dlg);
    const listPane = el("section", "mu-nw-list", null, body);
    listPane.setAttribute("aria-label", t("一覧"));
    const tools = el("div", "mu-nw-tools", null, listPane);
    const r1 = el("div", "mu-nw-r1", null, tools);
    const input = el("input", "mu-nw-q", null, r1);
    input.type = "search";
    input.placeholder = t("タイトル・本文で検索");
    input.setAttribute("aria-label", t("キーワード検索"));
    const catSel = el("select", "mu-nw-cat", null, r1);
    catSel.setAttribute("aria-label", t("カテゴリ"));
    el("option", null, t("すべてのカテゴリ"), catSel).value = "";
    const r2 = el("div", "mu-nw-r2", null, tools);
    const chipBox = el("div", "mu-nw-chips", null, r2);
    const chips = [["すべて", ""], ["未読のみ", "unread"], ["ピン留め", "pinned"]].map(([label, mode]) => {
      const c = button("mu-nw-chip", null, chipBox);
      c.textContent = t(label);
      c.addEventListener("click", () => {
        unreadOnly = mode === "unread"; pinned = mode === "pinned";
        paintChips();
        fetchPage(1);
      });
      return [c, mode];
    });
    const paintChips = () => chips.forEach(([c, mode]) => c.classList.toggle("mu-on", mode === (unreadOnly ? "unread" : pinned ? "pinned" : "")));
    paintChips();
    const allWrap = el("span", "mu-nw-allwrap", null, r2);
    const allMsg = el("span", "mu-nw-fail", null, allWrap);
    const allBtn = button("mu-nw-all", null, allWrap);
    allBtn.textContent = t("すべて既読にする");
    const listBox = el("div", "mu-nw-rows", null, listPane);

    const detail = el("article", "mu-nw-detail", null, body);
    detail.setAttribute("aria-label", t("詳細"));

    const itemOf = () => items.find((i) => i.uuid === sel);
    const paintRows = () => rows.forEach((b, uuid) => {
      const it = items.find((i) => i.uuid === uuid);
      b.classList.toggle("mu-sel", uuid === sel);
      b.classList.toggle("mu-unr", !!it && it.is_read === false);
    });
    function paintCount() {
      countEl.textContent = en()
        ? (counts.total != null ? counts.total + (counts.total === 1 ? " notice" : " notices") : "") + (counts.unread != null ? " · " + counts.unread + " unread" : "")
        : (counts.total != null ? counts.total + "件" : "") + (counts.unread != null ? " · 未読 " + counts.unread : "");
    }

    function renderList() {
      listBox.replaceChildren();
      rows.clear();
      for (const it of items) {
        const b = button("mu-nw-row", null, listBox);
        el("span", "mu-nw-dot", null, b);
        const mid = el("span", "mu-nw-mid", null, b);
        el("span", "mu-nw-ttl", L(it, "title"), mid);
        el("span", "mu-nw-meta", [L(it, "publish_from"), it.category && L(it.category, "name")].filter(Boolean).join(" · "), mid);
        el("span", "mu-nw-when", it.publish_start_at ? fmtWhen(it.publish_start_at) : "", b);
        b.addEventListener("click", () => {
          sel = it.uuid; detailFail = false;
          paintRows(); renderDetail();
          dlg.classList.add("mu-show-detail");
          if (backBtn()) backBtn().focus();
        });
        rows.set(it.uuid, b);
      }
      paintRows();
      if (state === "loading") el("p", "mu-nw-note", t("読み込み中…"), listBox);
      else if (state === "error") el("p", "mu-nw-note", t("読み込めませんでした"), listBox);
      else if (!items.length) el("p", "mu-nw-note", t("該当するお知らせはありません"), listBox);
      else if (page < pageTotal) {
        const more = button("mu-nw-more", null, listBox);
        more.textContent = t("さらに表示");
        more.addEventListener("click", () => fetchPage(page + 1));
      }
    }

    let back = null;
    const backBtn = () => (back && back.offsetParent ? back : null);

    function renderDetail() {
      detail.replaceChildren();
      const it = itemOf();
      if (!it) return;
      const bar = el("div", "mu-nw-bar", null, detail);
      back = button("mu-nw-chip mu-nw-back", null, bar);
      back.textContent = t("← 一覧へ");
      back.addEventListener("click", () => {
        dlg.classList.remove("mu-show-detail");
        const r = rows.get(sel);
        if (r) r.focus();
      });
      const rd = button("mu-nw-chip", null, bar);
      rd.textContent = t(it.is_read === false ? "既読にする" : "未読に戻す");
      rd.addEventListener("click", () => toggleRead(it));
      if (detailFail) el("span", "mu-nw-fail", t("失敗しました"), bar);
      el("h3", null, L(it, "title"), detail);
      const tags = el("div", "mu-nw-tags", null, detail);
      if (it.category && it.category.name) el("span", "mu-nw-cat1", L(it.category, "name"), tags);
      if (it.publish_from) el("span", "mu-nw-dept", L(it, "publish_from"), tags);
      const from = it.publish_start_at ? fmtFull(it.publish_start_at) : "";
      const dash = en() ? "–" : "〜";
      const period = from ? from + " " + dash + (it.publish_end_at ? " " + fmtFull(it.publish_end_at) : "") : "";
      if (period) el("div", "mu-nw-period", t("公開期間") + " " + period, detail);
      if (it.event_title) {
        const when = it.event_start_at ? "  " + fmtFull(it.event_start_at) + dash + (it.event_end_at ? fmtFull(it.event_end_at) : "") : "";
        el("div", "mu-nw-event", t("【イベント】") + it.event_title + when, detail);
      }
      el("div", "mu-nw-body", null, detail).innerHTML = sanitize(L(it, "content"));
      const files = [].concat(it.files || [], it.personal_files || []).filter((f) => f && f.uuid);
      if (files.length) {
        const box = el("div", "mu-nw-files", null, detail);
        files.forEach((f) => {
          const a = externalLink("mu-file", box, "/api/file/view/" + encodeURIComponent(f.uuid));
          a.appendChild(icon(20, MENU_ICONS["証明書"]));
          el("span", "mu-fname", f.file_name || "", a);
          el("span", "mu-fkind", t(MU.fileKind(f.mime_type)), a);
        });
      }
    }

    async function toggleRead(it) {
      const to = it.is_read === false;
      try {
        await sendJson("PUT", "/api/information/set-" + (to ? "read" : "unread") + "-selected/", [it.uuid]);
        it.is_read = to;
        if (counts.unread != null) counts.unread = Math.max(0, counts.unread + (to ? -1 : 1));
        detailFail = false;
      } catch (e) {
        console.error("[mu-rewrite]", e);
        detailFail = true;
      }
      paintRows(); paintCount();
      if (sel === it.uuid) renderDetail();
    }

    async function fetchPage(n) {
      const my = ++seq;
      disarm();
      if (n === 1) { items = []; page = 1; pageTotal = 1; sel = null; detailFail = false; }
      state = "loading";
      renderList(); renderDetail();
      try {
        const r = (await fetchJson(MU.notifyQuery({ page: n, query, unread: unreadOnly, pinned, category }))).result || {};
        if (my !== seq) return;
        items = items.concat(r.items || []);
        page = n;
        pageTotal = r.page_total || 1;
        counts.total = r.item_count != null ? r.item_count : items.length;
        state = "ok";
        if (!sel && items.length) sel = items[0].uuid; // 詳細を空にしない
      } catch (e) {
        if (my !== seq) return;
        console.error("[mu-rewrite]", e);
        state = "error";
      }
      renderList(); renderDetail(); paintCount();
    }

    function loadTree() {
      fetchJson("/api/information-category/tree").then((res) => {
        const flat = MU.flattenCategories((res.result && res.result.items) || []);
        counts.unread = MU.unreadTotal(flat);
        catSel.replaceChildren();
        el("option", null, t("すべてのカテゴリ"), catSel).value = "";
        flat.forEach((c) => el("option", null, "　".repeat(c.depth) + L(c, "name") + (c.unread_count > 0 ? "(" + c.unread_count + ")" : ""), catSel).value = c.uuid);
        catSel.value = category;
        paintCount();
      }).catch((e) => console.warn("[mu-rewrite] category tree", e));
    }

    function disarm() {
      clearTimeout(armTimer);
      armed = false;
      allBtn.textContent = t("すべて既読にする");
    }
    allBtn.addEventListener("click", async () => {
      allMsg.textContent = "";
      if (!armed) {
        armed = true;
        // 検索や未読のみの絞り込みは対象にならない(元のポータルと同じ)。実際に既読になる範囲を文言で示す
        allBtn.textContent = t((category ? "このカテゴリ" : pinned ? "ピン留め" : "全カテゴリ") + "のお知らせを全部既読にします(もう一度押すと実行)");
        armTimer = setTimeout(disarm, 3000);
        return;
      }
      disarm();
      try {
        await fetchJson(MU.readAllPath({ pinned, category }));
        fetchPage(1);
        loadTree();
      } catch (e) {
        console.error("[mu-rewrite]", e);
        allMsg.textContent = t("失敗しました");
      }
    });
    // 確認待ちの間に別の操作をしたら元に戻す
    dlg.addEventListener("click", (e) => { if (e.target !== allBtn) disarm(); }, true);

    function search() {
      const q = input.value.trim();
      const eff = q.length >= 2 ? q : ""; // 2文字未満は検索しない
      if (eff === query) return;
      query = eff;
      fetchPage(1);
    }
    input.addEventListener("input", () => { disarm(); clearTimeout(searchTimer); searchTimer = setTimeout(search, 400); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(searchTimer); search(); } });
    catSel.addEventListener("change", () => { category = catSel.value; fetchPage(1); });

    function close() {
      seq++;
      clearTimeout(armTimer); clearTimeout(searchTimer);
      ov.remove();
      html.classList.remove("mu-nw-lock");
      if (prev && prev.isConnected) prev.focus();
    }
    closeBtn.addEventListener("click", close);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); return; }
      if (e.key !== "Tab") return;
      const f = [...dlg.querySelectorAll("button, input, select, a[href]")].filter((n) => n.offsetParent);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      // 再描画でフォーカスを失った場合も、端で循環する場合も、ダイアログ内に戻す
      if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === f.length - 1)) {
        e.preventDefault();
        f[i < 0 || !e.shiftKey ? 0 : f.length - 1].focus();
      }
    });

    closeBtn.focus();
    fetchPage(1);
    loadTree();
  }

  // idx: トップ以外のページでの notification ブロックの出現順(トップは省略)
  function newsCard(data, parent, idx) {
    const inDoc = idx != null;
    const sec = card(parent, inDoc ? t(data.header || "お知らせ") : t("大学からのお知らせ"));
    const head = sec.firstChild;
    const list = el("div", "mu-list", null, sec);
    getJson(infoUrl(data)).then((res) => {
      const r = res.result || {};
      const label = t("すべて見る") + (r.item_count != null ? (en() ? " (" + r.item_count + ")" : "(" + r.item_count + "件)") : "");
      const b = button("mu-more", null, head);
      b.textContent = label;
      b.addEventListener("click", () => openNotices());
      const items = r.items || [];
      if (!items.length) el("div", "mu-row mu-empty", t("配信されているお知らせはありません"), list);
      items.forEach((it) => renderItem(it, list, false));
    }).catch((e) => {
      console.error("[mu-rewrite]", e);
      el("div", "mu-row mu-empty", t("読み込めませんでした"), list);
    });
  }

  function calendarCard(data, parent) {
    const sec = card(parent, data.header || t("学年暦"));
    const nav = el("div", "mu-calnav", null, sec);
    const label = el("span", "mu-calmonth", null, nav);
    const btns = el("span", "mu-calbtns", null, nav);
    const prev = button("mu-calbtn", t("前の月"), btns); prev.textContent = "‹";
    const next = button("mu-calbtn", t("次の月"), btns); next.textContent = "›";
    const wk = el("div", "mu-wk", null, sec);
    (en() ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["日", "月", "火", "水", "木", "金", "土"]).forEach((w, i) => el("span", i === 0 ? "mu-sun" : i === 6 ? "mu-sat" : "", w, wk));
    const grid = el("div", "mu-calgrid", null, sec);
    sec.classList.add("mu-calcard");
    el("div", "mu-spinner mu-cal-spin", null, sec).setAttribute("aria-hidden", "true");
    const legend = el("div", "mu-legend", null, sec);
    LEGEND.forEach(([c, name]) => {
      const s = el("span", null, null, legend);
      el("i", "mu-c-" + c, null, s);
      s.appendChild(document.createTextNode(t(name)));
    });

    const cache = new Map(); // 同じ月は再取得しない
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 1, seq = 0;

    async function load() {
      const key = y + "-" + m;
      if (cache.has(key)) return cache.get(key);
      const s = Math.floor(new Date(y, m - 1, 1 - 7).getTime() / 1000);
      const e = Math.floor(new Date(y, m, 1 + 7).getTime() / 1000);
      // 取得は全部いっぺんに始める(読み込み待ちの対象に、最初から全部入るようにするため)
      const rs = await Promise.all((data.sources || []).map((u) => getJson("/api/calendar/?page_size=500&start_at=" + s + "&end_at=" + e +
        "&calendar_source_uuid=" + encodeURIComponent(u) + "&add_outlook_calendar=" + (data.addOutLook ? 1 : 0)))); // "false" だと "No token." が返る
      const evs = rs.flatMap((r) => (r.result && r.result.items) || []);
      cache.set(key, evs);
      return evs;
    }

    function draw(evs) {
      const todayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      const weeks = MU.buildMonthGrid(evs, y, m, todayKey);
      grid.replaceChildren();
      let row = 1;
      weeks.forEach((w, i) => {
        for (const c of w.cells) {
          const d = el("div", "mu-day" + (c.weekend ? " mu-" + c.weekend : ""), null, grid);
          d.style.gridColumn = c.col;
          d.style.gridRow = row;
          if (i) d.style.marginTop = "10px";
          el("span", c.today ? "mu-today" : "", c.day, d);
        }
        for (const b of w.bars) {
          const x = el("div", "mu-bar mu-c-" + b.cat + (b.left ? " mu-bl" : "") + (b.right ? " mu-br" : ""),
            b.c1 === b.c2 ? MU.shortLabel(b.summary) : b.summary, grid);
          x.title = b.summary;
          x.style.gridColumn = b.c1 + " / span " + (b.c2 - b.c1 + 1);
          x.style.gridRow = row + 1 + b.lane;
        }
        row += 1 + w.lanes;
      });
    }

    async function show() {
      const my = ++seq;
      label.textContent = en() ? new Date(y, m - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : y + "年" + m + "月";
      sec.classList.add("mu-cal-busy"); // 前の月の表示を薄くして、上に回る輪を出す(レイアウトが跳ねない)
      try {
        const evs = await load();
        if (my === seq) draw(evs);
      } catch (e) {
        if (my !== seq) return;
        console.error("[mu-rewrite]", e);
        grid.replaceChildren(el("p", "mu-empty", t("読み込めませんでした")));
      } finally {
        if (my === seq) sec.classList.remove("mu-cal-busy");
      }
    }

    const move = (n) => { m += n; if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; } show(); };
    prev.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    show();
  }

  function fileShareCard(data, parent) {
    if (typeof data.folderUuid !== "string") return;
    const box = el("div", "mu-fs", null, parent);
    const nav = el("div", "mu-fs-nav", null, box);
    const body = el("div", "mu-list", null, box);
    let stack = [{ uuid: data.folderUuid, name: t(data.header || "") }];
    let items = [], status = "loading", seq = 0;

    function render() {
      nav.replaceChildren();
      const crumbs = el("span", null, null, nav);
      stack.forEach((f, i) => {
        if (i) crumbs.append(" / ");
        if (i === stack.length - 1) { el("b", null, f.name, crumbs); return; }
        const c = button("mu-fs-crumb", null, crumbs);
        c.textContent = f.name;
        c.addEventListener("click", () => enter(stack.slice(0, i + 1)));
      });
      if (stack.length > 1) {
        const up = button("mu-fs-up", null, nav);
        up.textContent = t("上のフォルダへ");
        up.addEventListener("click", () => enter(stack.slice(0, -1)));
      }

      body.replaceChildren();
      if (status === "error") { el("p", "mu-empty", t("読み込めませんでした"), body); return; }
      // 元の順序を保ったままフォルダを先に並べる
      const shown = items.filter((it) => it && it.has_read_permission !== false);
      const sorted = [...shown.filter((it) => !it.is_file), ...shown.filter((it) => it.is_file)];
      if (sorted.length) {
        const grid = el("div", "mu-fs-grid", null, body);
        for (const it of sorted) {
          const name = String(it.name || "");
          if (!it.is_file) {
            const b = button("mu-fs-item mu-fs-dir", null, grid);
            b.appendChild(icon(20, FOLDER));
            el("span", "mu-fname", name, b);
            b.addEventListener("click", () => enter(stack.concat({ uuid: String(it.uuid), name })));
            continue;
          }
          const a = externalLink("mu-fs-item mu-fs-file", grid, "/api/shared-file/view/" + encodeURIComponent(it.uuid));
          a.appendChild(icon(20, MENU_ICONS["証明書"]));
          el("span", "mu-fname", name, a);
          const d = typeof it.updated_at === "number" ? new Date(it.updated_at * 1000) : null;
          const meta = [MU.fmtSize(it.size), d ? (en() ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate()) : ""].filter(Boolean).join(" · ");
          if (meta) el("span", "mu-fs-meta", meta, a);
        }
      }
      if (status === "loading") {
        const sp = el("div", "mu-spinner mu-fs-spin", null, body);
        sp.setAttribute("role", "status");
        sp.setAttribute("aria-label", t("読み込み中"));
      }
      else if (!sorted.length) el("p", "mu-empty", t("フォルダの中にファイルはありません"), body);
    }

    // フォルダの中身は全件取る(1ページ20件ずつなので、残りのページを全部いっぺんに取る)。
    // 取得に時間がかかるので、ページ全体の読み込み待ち(getJson)には入れず、ページを先に見せてからここだけ回す
    async function fetchAll() {
      const my = ++seq;
      status = "loading";
      items = [];
      render();
      try {
        const url = (n) => "/api/shared-item/" + n + "/" + encodeURIComponent(stack[stack.length - 1].uuid);
        const first = (await fetchJson(url(1))).result || {};
        const total = Math.max(1, Number(first.page_total) || 1);
        const rest = await Promise.all(Array.from({ length: total - 1 }, (_, i) => fetchJson(url(i + 2))));
        if (my !== seq) return;
        items = [first, ...rest.map((r) => r.result || {})].flatMap((r) => r.items || []);
        status = "ok";
      } catch (e) {
        if (my !== seq) return;
        console.error("[mu-rewrite]", e);
        status = "error";
      }
      render();
    }

    // フォルダの移動を、ブラウザの履歴にも積む(戻るボタン・マウスの戻るボタン・ジェスチャーで1つ上に戻れる)。
    // ポータルのルーターが持つ history.state は壊さず、muFs だけ足す。再読み込みしても同じフォルダに戻れる
    const root0 = { uuid: data.folderUuid, name: t(data.header || "") };
    const snap = (s) => s.map((f) => ({ uuid: f.uuid, name: f.name }));
    const fromState = (st) => {
      const m = st && st.muFs;
      const ok = m && m.root === data.folderUuid && Array.isArray(m.stack) && m.stack.length
        && m.stack.every((f) => f && typeof f.uuid === "string" && typeof f.name === "string");
      return ok ? snap(m.stack) : [root0];
    };
    const withState = () => Object.assign({}, history.state, { muFs: { root: data.folderUuid, stack: snap(stack) } });
    function enter(next) {
      stack = next;
      try { history.pushState(withState(), ""); } catch (e) { console.warn("[mu-rewrite] history", e); }
      fetchAll();
    }
    function onPop(e) {
      if (!box.isConnected) { window.removeEventListener("popstate", onPop); return; }
      stack = fromState(e.state);
      fetchAll();
    }
    window.addEventListener("popstate", onPop);
    stack = fromState(history.state);
    try { history.replaceState(withState(), ""); } catch (e) { /* 履歴を触れなくても動く */ }
    fetchAll();
  }

  function linkBoxRows(data) {
    const rows = Array.isArray(data.items) ? data.items.map((i) => {
      const href = [i && i.link, i && i.url, i && i.href].find((v) => typeof v === "string");
      const text = [i && i.title, i && i.name, i && i.text].find((v) => typeof v === "string");
      return href && text && isHttp(href) ? { href, text } : null;
    }) : [];
    if (!rows.length || rows.some((r) => !r)) {
      console.warn("[mu-rewrite] unknown linkBox", data);
      return null;
    }
    return rows;
  }

  function externalLink(cls, parent, href) {
    const a = el("a", cls, null, parent);
    a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
    return a;
  }

  function linkBox(b, parent) {
    const rows = linkBoxRows(b.data || {});
    if (!rows) return;
    const box = el("div", "mu-tile mu-linkbox", null, parent);
    el("b", null, (b.data && b.data.header) || t("その他リンク"), box);
    rows.forEach((r) => { externalLink("", box, r.href).textContent = r.text; });
  }

  // トップ以外のページ用: ピル形のリンクを折り返して並べる
  function linkPills(b, parent) {
    const rows = linkBoxRows(b.data || {});
    if (!rows) return;
    const box = el("div", "mu-links", null, parent);
    if (b.data && b.data.header) el("div", "mu-lbl", b.data.header, box);
    const wrap = el("div", "mu-pills", null, box);
    rows.forEach((r) => {
      const a = externalLink("mu-lk", wrap, r.href);
      a.append(r.text + " ");
      el("span", null, "↗", a);
    });
  }

  function callout(b, parent) {
    const c = el("div", "mu-callout", null, parent);
    c.setAttribute("role", "note");
    c.innerHTML = sanitize((b.data || {}).text);
  }

  const plainLen = (html) => new DOMParser().parseFromString(html || "", "text/html").body.textContent.trim().length;

  function renderList(items, ordered, parent) {
    items = items || [];
    // 短くて入れ子の無い項目は、手順カード / 箇条書きグリッドで見せる
    const flat = items.every((it) => it && !(it.items && it.items.length));
    const kind = flat && ordered && items.every((it) => plainLen(it.content) <= 40) ? "mu-steps"
      : flat && !ordered && items.every((it) => plainLen(it.content) <= 60) ? "mu-bul" : "";
    const list = el(ordered ? "ol" : "ul", kind, null, parent);
    items.forEach((it, i) => {
      const li = el("li", null, null, list);
      if (kind === "mu-steps") el("span", "mu-n", i + 1, li);
      const body = kind ? el("span", null, null, li) : li;
      body.innerHTML = sanitize(it && it.content);
      if (it && it.items && it.items.length) renderList(it.items, ordered, li);
    });
  }

  function renderToc(entries, parent) {
    if (!entries.length) return;
    const box = el("nav", "mu-toc", null, parent);
    box.setAttribute("aria-label", t("目次"));
    const stack = [{ lv: entries[0].level, ul: el("ul", null, null, box) }];
    for (const e of entries) {
      while (stack.length > 1 && e.level < stack[stack.length - 1].lv) stack.pop();
      let top = stack[stack.length - 1];
      if (e.level > top.lv) {
        top = { lv: e.level, ul: el("ul", null, null, top.ul.lastElementChild || top.ul) };
        stack.push(top);
      }
      const a = el("a", null, e.text, el("li", null, null, top.ul));
      a.href = "#" + e.id;
      // ハッシュ遷移だとポータルのルーターが反応しうるので、自前でスクロールする
      a.addEventListener("click", (ev) => { ev.preventDefault(); const t = document.getElementById(e.id); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
    }
  }

  function renderFile(d, parent) {
    const f = d.file || {};
    const uuid = f.uuid || d.media_uuid;
    if (!uuid) return;
    const a = externalLink("mu-file", parent, "/api/file/view/" + encodeURIComponent(uuid));
    a.appendChild(icon(20, MENU_ICONS["証明書"]));
    el("span", "mu-fname", f.name || f.file_name || "", a);
    el("span", "mu-fkind", t(MU.fileKind(f.mime_type)), a);
  }

  const px = (v) => (/^\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : 0);
  const isBanner = (d) => px(d.width) > 0 && px(d.height) > 0 && px(d.width) / px(d.height) > 3.5;

  // single: 1枚だけの画像は元の幅を上限にする(複数のときは高さ揃えが優先)
  function renderImage(d, parent, single) {
    // 画像は同一オリジンのものだけ通す
    let ok = false;
    try { ok = typeof d.source === "string" && new URL(d.source, location.href).origin === location.origin; } catch (e) { /* ok=false */ }
    if (!ok) return;
    const img = el("img", "mu-img");
    img.src = d.source;
    img.alt = "";
    // 生の px を max-width に入れると CSS の 100% を上書きして枠からはみ出すので min() で挟む
    if (single && px(d.width)) img.style.maxWidth = "min(100%, " + d.width + ")";
    if (typeof d.link === "string" && d.link && isHttp(d.link)) externalLink("", parent, d.link).appendChild(img);
    else parent.appendChild(img);
  }

  // 連続する image をまとめて描く。1枚だけなら縦横比でバナー扱いを決める
  function renderImages(run, parent) {
    const one = run.length === 1;
    const box = el("div", "mu-imgs" + (one ? " mu-one" + (isBanner(run[0]) ? " mu-banner" : "") : ""), null, parent);
    run.forEach((d) => renderImage(d, box, one));
    if (!box.firstChild) box.remove();
  }

  // ctx は見出し id と目次の連番をページ全体で揃えるために必要
  function renderBlocks(list, parent, ctx) {
    let files = null; // 連続する file は1つの箱にまとめる
    let run = []; // 連続する image(まとめて高さを揃える)
    const flushImgs = () => { if (run.length) renderImages(run, parent); run = []; };
    for (const b of list || []) {
      const d = b.data || {};
      if (b.type !== "image") flushImgs();
      if (b.type !== "file") files = null;
      switch (b.type) {
        case "column": {
          const cols = el("div", "mu-dcols", null, parent);
          for (const c of d.cols || []) renderBlocks(c.blocks, el("div", "mu-dcol", null, cols), ctx);
          break;
        }
        case "title": {
          // 区切りの title は renderDoc が h2 で出すので、ここは小見出し(column 内の title も h3 以下)
          const tag = "h" + Math.min(6, Math.max(3, Number(d.level) || 3));
          const h = el(tag, "mu-hd", null, parent);
          h.innerHTML = sanitize(reword(d.text));
          h.id = "mu-h-" + ctx.titles.indexOf(b);
          break;
        }
        case "paragraph": {
          if (ctx.fileUuids && MU.isDupFileLink(d.text, ctx.fileUuids)) break;
          const p = el("p");
          p.innerHTML = sanitize(reword(d.text));
          const t = p.textContent.trim();
          if (parent.classList.contains("mu-dcol") && t.startsWith("・") && t.length <= 40) {
            el("div", "mu-lbl", t.slice(1).trim(), parent);
          } else if (t || p.querySelector("img")) parent.appendChild(p);
          break;
        }
        case "list": renderList(d.items, d.style === "ordered", parent); break;
        case "file":
          if (!files) files = el("div", "mu-files-grid", null, parent);
          renderFile(d, files);
          break;
        case "image": run.push(d); break;
        case "divider": el("hr", null, null, parent); break;
        case "toc": renderToc(MU.tocEntries(ctx.all, d.start, d.end), parent); break;
        case "notification":
          if (isPersonal(d.header)) personalCard([b], parent);
          else newsCard(d, parent, ctx.notes.indexOf(b));
          break;
        case "linkBox": linkPills(b, parent); break;
        case "callout": callout(b, parent); break;
        case "calendar": calendarCard(d, parent); break;
        case "fileShare": fileShareCard(d, parent); break;
      }
    }
    flushImgs();
  }

  // bodyTitle: 本文側の先頭見出しと突き合わせるページ名(本文が日本語のままのとき、英訳した title とは一致しない)
  function renderDoc(blocks, main, title, bodyTitle) {
    const ctx = {
      all: blocks, titles: MU.findBlocks(blocks, "title"), notes: MU.findBlocks(blocks, "notification"),
      fileUuids: new Set(MU.findBlocks(blocks, "file").map((b) => ((b.data || {}).file || {}).uuid).filter(Boolean)),
    };
    const { lead, sections } = MU.sectionize(blocks, [title, bodyTitle]);
    if (title) el("h1", null, title, main);
    for (const p of lead) el("p", "mu-lead", null, main).innerHTML = sanitize(reword((p.data || {}).text));
    const page = el("div", "mu-page", null, main);
    const rail = el("nav", "mu-rail", null, page);
    rail.setAttribute("aria-label", t("このページの内容"));
    el("div", "mu-rail-h", t("このページの内容"), rail);
    const box = el("div", "mu-pgbody", null, page);
    const secs = []; // レールに載る(見出しのある)節
    const links = [];
    let pinned = null; // 目次をクリックした節。ページ末尾で頭までスクロールできなくても、押した節を現在位置にする
    sections.forEach((s, i) => {
      const sec = el("section", "mu-sec" + (s.wide ? " mu-wide" : ""), null, box);
      sec.id = "mu-s-" + i;
      if (s.head) {
        const h = el("h2", null, null, sec);
        h.innerHTML = sanitize((s.head.data || {}).text);
        h.id = "mu-h-" + ctx.titles.indexOf(s.head);
        const a = el("a", null, h.textContent, rail);
        a.href = "#" + sec.id;
        // ハッシュ遷移だとポータルのルーターが反応しうるので、自前でスクロールする
        const idx = links.length;
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          pinned = idx;
          update();
          sec.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        secs.push(sec);
        links.push(a);
      }
      renderBlocks(s.blocks, sec, ctx);
    });
    if (!box.firstChild) box.remove();
    if (links.length < 2) { rail.remove(); return; } // 1つだけの目次は意味がない
    // 画面の上から30%の線を過ぎた最後の節を現在位置にする。最下部では最後の節にする
    // (「最初に見えている節」方式だと、末尾の節が短いとき最後まで選ばれない)
    const update = () => {
      const se = document.scrollingElement || document.documentElement;
      let cur = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * 0.3) cur = i; });
      if (innerHeight + se.scrollTop >= se.scrollHeight - 4) cur = secs.length - 1;
      if (pinned != null) cur = pinned;
      links.forEach((a, j) => a.classList.toggle("mu-cur", j === cur));
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    };
    // 自分で操作してスクロールしたら、押した節の固定を外す(クリックによる自動スクロールでは外れない)
    const unpin = () => { pinned = null; };
    const keys = (e) => { if (/^(Arrow|Page|Home|End| )/.test(e.key)) pinned = null; };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true }); // どの要素のスクロールでも拾う
    document.addEventListener("wheel", unpin, { capture: true, passive: true });
    document.addEventListener("touchmove", unpin, { capture: true, passive: true });
    document.addEventListener("keydown", keys, true);
    offScroll = () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("wheel", unpin, { capture: true });
      document.removeEventListener("touchmove", unpin, { capture: true });
      document.removeEventListener("keydown", keys, true);
    };
    update();
  }

  function renderPage(blocks, main) {
    const tiles = el("section", "mu-tiles", null, main);
    tiles.setAttribute("aria-label", t("サービス"));
    const KINDS = { "MUSCAT": 0, "MU LMS": 1, "MUSCAT(スマートフォン)": 2 };
    const SPEC = [["MUSCAT", "授業・シラバス・掲示", "mu-t-main"], ["MU LMS", "課題・教材", "mu-t-dark"], ["MUSCAT スマホ版", "学生のみ", "mu-t-line"]];
    MU.findBlocks(blocks, "image").map((b) => b.data || {})
      .filter((d) => typeof d.link === "string" && isHttp(d.link))
      .map((d) => { const label = MU.linkLabel(d.link); return { d, label, k: label in KINDS ? KINDS[label] : 3 }; })
      .sort((a, b) => a.k - b.k)
      .forEach(({ d, label, k }) => {
        const [title, sub, cls] = SPEC[k] || [label, "", "mu-t-line"];
        const a = externalLink("mu-tile " + cls, tiles, d.link);
        el("span", "mu-t-title", t(title), a);
        el("span", "mu-t-sub", t(sub), a);
      });
    for (const b of MU.findBlocks(blocks, "linkBox")) linkBox(b, tiles);
    if (!tiles.firstChild) tiles.remove();

    for (const b of MU.findBlocks(blocks, "callout")) callout(b, main);

    const cols = el("div", "mu-cols", null, main);
    const left = el("div", "mu-col", null, cols);
    const right = el("div", "mu-col", null, cols);
    const notes = MU.findBlocks(blocks, "notification");
    personalCard(notes.filter((b) => isPersonal((b.data || {}).header)), left);
    for (const b of MU.findBlocks(blocks, "calendar")) calendarCard(b.data || {}, left);
    for (const b of notes) if (!isPersonal((b.data || {}).header)) newsCard(b.data || {}, right);
    if (!right.firstChild) right.remove();
  }

  function waitFor(sel, ms) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function poll() {
        const n = document.querySelector(sel);
        if (n || Date.now() - t0 > ms) resolve(n);
        else setTimeout(poll, 100);
      })();
    });
  }

  function deactivate() {
    if (offScroll) { offScroll(); offScroll = null; }
    token++;
    loading = false;
    closeAll = null;
    document.documentElement.classList.remove(CLS, "mu-nw-lock", "mu-drawer-on"); // 開いたまま #mu-root が消えても、固定や押し出しを残さない
    const r =document.getElementById("mu-root");
    if (r) r.remove();
  }

  async function activate() {
    const my = ++token;
    loading = true;
    failed = false;
    const slug = slugOf(location.pathname);
    document.documentElement.classList.add(CLS);
    const host = await waitFor("#app-contents", 10000);
    if (my !== token) return;
    if (!host) { deactivate(); dropSplash(); failed = true; return; }
    const old = document.getElementById("mu-root");
    if (old) old.remove();
    const root = el("div", "mu-busy");
    root.id = "mu-root";
    host.insertBefore(root, host.firstChild);
    // 元のスプラッシュを複製できていればそれを使い、無ければ自前の読み込み画面を出す
    let spin = null;
    if (!splash) {
      spin = el("div", "mu-loading", null, root);
      spin.setAttribute("role", "status");
      el("div", "mu-loading-logo", "MU Portal", spin);
      el("div", "mu-spinner", null, spin);
      spin.setAttribute("aria-label", t("読み込み中"));
    }
    try {
      const [page, tree, nameEl] = await Promise.all([
        getJson("/api/page/view/" + encodeURIComponent(slug)),
        getJson("/api/page").catch((e) => { console.warn("[mu-rewrite] page tree", e); return null; }),
        waitFor('#menu [class*="_name_"]', 3000),
      ]);
      if (my !== token) return;
      const blocks = MU.pickBlocks(page.result, lang());
      if (!blocks) throw new Error("page has no blocks");
      if (!MU.isSupported(blocks)) {
        // 未対応ブロックを含むページは元のUIのまま(再試行しない)
        failed = true;
        root.remove();
        dropSplash();
        document.documentElement.classList.remove(CLS);
      } else {
        pending = [];
        buildHeader(root, nameEl ? nameEl.textContent.trim() : "", tree, slug);
        const main = el("main", "mu-main", null, root);
        if (slug === TOP) renderPage(blocks, main); else renderDoc(blocks, main, t(L(page.result, "title")), page.result.title);
        // お知らせ・カレンダー・ファイル一覧の取得が全部終わるまで待つ(失敗した部品はカード内に表示される)。20秒で打ち切る
        await Promise.race([Promise.allSettled(pending), new Promise((r) => setTimeout(r, 20000))]);
        await new Promise((r) => setTimeout(r, 0)); // 取得後の描画(then)を済ませてから表示する
        pending = null;
        // 画像も読み込みを待つ(失敗しても止めない、10秒で打ち切る)。閉じた <details> の中は表示されないので待たない
        const imgs = [...root.querySelectorAll("img")].filter((i) => !i.complete && !i.closest("details:not([open])"));
        if (imgs.length) {
          const done = Promise.all(imgs.map((i) => new Promise((r) => {
            i.addEventListener("load", r, { once: true });
            i.addEventListener("error", r, { once: true });
          })));
          await Promise.race([done, new Promise((r) => setTimeout(r, 10000))]);
        }
        if (my !== token) return;
        root.classList.remove("mu-busy");
        if (spin) {
          spin.classList.add("mu-fade"); // 元のスプラッシュと同じく、薄くしてから外す
          setTimeout(() => spin.remove(), 320);
        }
        dropSplash();
        document.dispatchEvent(new Event("scroll")); // 目次の現在位置を、表示後のレイアウトで計算し直す
      }
    } catch (e) {
      pending = null;
      if (my !== token) return;
      console.error("[mu-rewrite]", e);
      failed = true;
      closeAll = null;
      root.remove(); // 元のUIに戻すだけにして、二重表示にしない(原因は console に出す)
      dropSplash();
      document.documentElement.classList.remove(CLS);
    }
    if (my === token) loading = false;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && closeAll) closeAll();
  });

  // 元の起動スプラッシュ(ロゴ+回る輪)が出たら複製して全面に被せ、自作UIの準備ができるまで残す。
  // 元のスプラッシュは React が先に消すので、複製がないと、その間に元のUIが見えてしまう。
  // 複製は元のクラス名を保つので、ロゴも輪の回転も元のCSSでそのまま描かれる
  let splash = null;
  function captureSplash() {
    if (splash || !isTarget(location.pathname)) return;
    const src = document.querySelector('[class*="_loading-wrapper_"]');
    if (!src) return;
    splash = document.createElement("div");
    splash.id = "mu-splash";
    splash.appendChild(src.cloneNode(true));
    document.documentElement.appendChild(splash);
    document.documentElement.classList.add("mu-splash-on");
    splashObserver.disconnect();
  }
  function dropSplash() {
    splashObserver.disconnect();
    if (!splash) return;
    const s = splash;
    splash = null;
    document.documentElement.classList.remove("mu-splash-on");
    s.classList.add("mu-fade");
    setTimeout(() => s.remove(), 320);
  }
  const splashObserver = new MutationObserver(captureSplash);
  splashObserver.observe(document, { childList: true, subtree: true });
  captureSplash();
  setTimeout(() => splashObserver.disconnect(), 10000); // スプラッシュが出ないページで監視し続けない

  setInterval(() => {
    const p = location.pathname;
    const key = isTarget(p) ? p : null;
    if (key !== cur) {
      deactivate();
      cur = key;
      if (key) activate(); else dropSplash(); // 対象外のページに移ったら、被せた複製を外す
    } else if (key && !failed && !loading && !document.getElementById("mu-root")) {
      activate(); // SPAの再描画で #mu-root が消えた場合
    }
  }, 500);

  // バックグラウンド方式の検証用。localStorage["mu-probe"]="1" のときだけ他サイトへ通信する
  try {
    if (localStorage.getItem("mu-probe") === "1")
      chrome.runtime.sendMessage({ type: "probe" }, (res) => console.info("[mu-rewrite] probe", JSON.stringify(res)));
  } catch (e) {
    console.info("[mu-rewrite] probe failed", e.message);
  }
})();
