(function () {
  // type を省略すると全ブロックを出現順に返す
  function findBlocks(blocks, type) {
    const out = [];
    for (const b of blocks || []) {
      if (!type || b.type === type) out.push(b);
      for (const col of (b.data && b.data.cols) || []) out.push(...findBlocks(col.blocks, type));
    }
    return out;
  }

  function infoQuery(data) {
    const p = ["page_size=" + data.itemNumber];
    const cats = data.categories || [];
    if (cats.length) p.push("category_uuid=" + cats.join(","));
    if (data.unreadOnly) p.push("status=unread");
    if (data.isPinned) p.push("is_pinned=1");
    return p.join("&");
  }

  function linkLabel(url) {
    if (url.includes("unipa.m-muscat") && url.includes("Mobile")) return "MUSCAT(スマートフォン)";
    if (url.includes("unipa.m-muscat")) return "MUSCAT";
    if (url.includes("myopenlms.net")) return "MU LMS";
    try { return new URL(url).hostname; } catch (e) { return url; }
  }

  // 分類の順序が意味を持つ(登録→試験→授業→休み→その他)
  function catOf(s) {
    return /登録|人数制限/.test(s) ? "reg"
      : /試験|^テスト/.test(s) ? "exam"
      : /学期|授業/.test(s) ? "class"
      : /休講日|休業|休日|昭和の日|海の日|山の日|敬老の日|秋分の日|スポーツの日|文化の日|勤労感謝の日|成人の日|建国記念の日|天皇誕生日|春分の日/.test(s) ? "off"
      : "event";
  }

  // 1マス幅のバーは折り返さず1行に収めるため名前を短くする
  function shortLabel(s) {
    return s
      .replace(/^(\d)学期－(.+)$/, "$1学期$2")
      .replace(/^試験・補講.*/, "試験・補講")
      .replace(/^訂正登録.*/, "訂正登録")
      .replace(/^履修登録予備日.*/, "履修予備日")
      .replace(/^予備登録.*/, "予備登録")
      .replace(/^前期卒業・修了式.*/, "卒業・入学式")
      .replace(/^大学入学共通テスト準備$/, "共通テスト準備")
      .replace(/^大学入学共通テスト$/, "共通テスト")
      .replace(/^卒業式・修了式$/, "卒業式")
      .replace(/^同慶節.*/, "創立記念日")
      .replace(/^摩耶祭片付け日$/, "摩耶祭片付け")
      .replace(/^摩耶祭準備日$/, "摩耶祭準備")
      .replace(/^.*の振替休講日$/, "振替休講日")
      .replace(/^.*（授業実施日）$/, "授業実施日");
  }

  const dayKey = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

  // month は1〜12、todayKey は yyyymmdd の数値。events の end_at は終了日の翌日0時(排他的)
  function buildMonthGrid(events, year, month, todayKey) {
    const first = new Date(year, month - 1, 1).getDay();
    const days = new Date(year, month, 0).getDate();
    const evs = events.map((e) => {
      const a = dayKey(new Date(e.start_at * 1000));
      const b = e.end_at > e.start_at ? Math.max(a, dayKey(new Date((e.end_at - 1) * 1000))) : a;
      return { summary: e.summary, a, b, cat: catOf(e.summary) };
    });
    const weeks = [];
    for (let w = 0; w < Math.ceil((first + days) / 7); w++) {
      const cells = [];
      for (let col = 1; col <= 7; col++) {
        const d = w * 7 - first + col;
        if (d < 1 || d > days) continue;
        const key = year * 10000 + month * 100 + d;
        cells.push({ col, day: d, key, today: key === todayKey, weekend: col === 1 ? "sun" : col === 7 ? "sat" : "" });
      }
      const bars = [];
      for (const e of evs) {
        let c1 = 0, c2 = 0, k1 = 0, k2 = 0;
        for (const c of cells) {
          if (c.key < e.a || c.key > e.b) continue;
          if (!c1) { c1 = c.col; k1 = c.key; }
          c2 = c.col; k2 = c.key;
        }
        if (c1) bars.push({ c1, c2, lane: 0, summary: e.summary, cat: e.cat, left: k1 === e.a, right: k2 === e.b });
      }
      bars.sort((x, y) => x.c1 - y.c1 || (y.c2 - y.c1) - (x.c2 - x.c1));
      const lanes = [];
      for (const g of bars) {
        let lane = lanes.findIndex((end) => end < g.c1);
        if (lane < 0) { lane = lanes.length; lanes.push(0); }
        lanes[lane] = g.c2;
        g.lane = lane;
      }
      weeks.push({ cells, bars, lanes: lanes.length });
    }
    return weeks;
  }

  const SUPPORTED = new Set("column title paragraph list file image divider toc notification linkBox callout calendar fileShare".split(" "));
  // 描画できないブロックが1つでもあれば元のUIに任せる
  const isSupported = (blocks) => findBlocks(blocks).every((b) => SUPPORTED.has(b.type));

  // 連番は level で除外したものも数える(content.js の見出し id と同じ規則)
  function tocEntries(blocks, start, end) {
    return findBlocks(blocks, "title").flatMap((b, i) => {
      const d = b.data || {};
      const level = Number(d.level);
      return level >= start && level <= end ? [{ id: "mu-h-" + i, text: d.text, level }] : [];
    });
  }

  const levelOf = (b) => (b.type === "title" ? Number((b.data || {}).level) : 0);

  // 子が notification だけの column(お知らせページの左右2枚)
  function isNotificationOnly(b) {
    const kids = b.type === "column" ? ((b.data && b.data.cols) || []).flatMap((c) => c.blocks || []) : [];
    return kids.length > 0 && kids.every((k) => k.type === "notification");
  }

  // 全部の列が title で始まる column(就職・キャリア支援の「求人検索NAVI」「MUC」の2列など)。列ごとに別の節にする
  function isTitledColumns(b) {
    const cols = b.type === "column" ? ((b.data && b.data.cols) || []) : [];
    return cols.length >= 2 && cols.every((c) => c.blocks && c.blocks.length > 1 && c.blocks[0].type === "title");
  }

  // column の中は数えない(トップレベルの blocks だけ見る)
  function isWide(blocks) {
    const n = (t) => blocks.filter((b) => b.type === t).length;
    // 文章が長い節は半幅の段にすると細くて読みにくく、隣とも高さが合わないので全幅にする
    const plainLen = (h) => String(h || "").replace(/<[^>]*>/g, "").trim().length;
    const textLen = blocks.reduce((sum, b) => sum + (b.type === "paragraph" ? plainLen((b.data || {}).text)
      : b.type === "list" ? ((b.data || {}).items || []).reduce((m, it) => m + plainLen(it && it.content), 0) : 0), 0);
    if (textLen > 60) return true;
    return blocks.some((b) => b.type === "column" || b.type === "toc" || b.type === "calendar" || b.type === "fileShare"
      || (b.type === "list" && ((b.data || {}).items || []).length >= 4))
      || n("file") >= 4 || n("image") >= 2
      || (n("notification") > 0 && blocks.some((b) => b.type !== "notification"));
  }

  // ページごとに見出しレベルの使い方が違うので、区切りレベルは出現回数から決める
  // title(ページ名)を渡すと、先頭の「ページ名と同じ見出し」または見出し無しで、段落だけの節を
  // 節カードにせず lead(ページ名の下の導入文)として取り出す
  function sectionize(blocks, title) {
    const list = blocks || [];
    const count = {};
    for (const b of list) if (levelOf(b)) count[levelOf(b)] = (count[levelOf(b)] || 0) + 1;
    const levels = Object.keys(count).map(Number);
    const twice = levels.filter((l) => count[l] >= 2);
    const S = Math.min(...(twice.length ? twice : levels)); // title が無ければ Infinity で何も区切らない

    const sections = [];
    let head = null, cur = [];
    const flush = () => {
      if (cur.length) sections.push({ head, blocks: cur, wide: isWide(cur) });
      head = null;
      cur = [];
    };
    for (const b of list) {
      const lv = levelOf(b);
      if (lv && lv <= S) { flush(); head = b; }
      else if (isTitledColumns(b)) {
        flush();
        for (const col of b.data.cols) sections.push({ head: col.blocks[0], blocks: col.blocks.slice(1), wide: isWide(col.blocks.slice(1)) });
      } else if (isNotificationOnly(b)) {
        flush();
        for (const col of b.data.cols) for (const n of col.blocks || []) sections.push({ head: null, blocks: [n], wide: false });
      } else cur.push(b);
    }
    flush();
    const plain = (h) => String(h || "").replace(/<[^>]*>/g, "").replace(/\s+/g, "");
    const first = sections[0];
    let lead = [];
    if (title != null && first && first.blocks.every((b) => b.type === "paragraph")
      && (!first.head || [].concat(title).some((x) => plain((first.head.data || {}).text) === plain(x)))) lead = sections.shift().blocks;
    // 半幅が連続して奇数個だと最後が1枚だけ半分になるので、その1枚を全幅にする
    for (let i = 0, run = 0; i <= sections.length; i++) {
      if (i < sections.length && !sections[i].wide) { run++; continue; }
      if (run % 2) sections[i - 1].wide = true;
      run = 0;
    }
    return { lead, sections };
  }

  // 段落がファイルタイルと同じファイルへのリンク1つだけなら、タイルと二重になるので捨てる
  function isDupFileLink(html, uuids) {
    const m = /^\s*<a\b[^>]*href="[^"]*\/api\/file\/view\/([0-9a-f-]{36})[^"]*"[^>]*>[^<]*<\/a>\s*$/i.exec(html || "");
    return !!m && uuids.has(m[1]);
  }

  function fileKind(mime) {
    const m = (mime || "").toLowerCase();
    return m === "application/pdf" ? "PDF"
      : m.startsWith("image/") ? "画像"
      : /excel|spreadsheetml/.test(m) ? "Excel"
      : /powerpoint|presentationml/.test(m) ? "PowerPoint"
      : /word|wordprocessingml/.test(m) ? "Word"
      : "ファイル";
  }

  function fmtSize(n) {
    if (typeof n !== "number" || !(n > 0)) return "";
    if (n < 1024) return Math.round(n) + " B";
    let v = n, i = 0;
    while (v >= 1024 && i < 3) { v /= 1024; i++; }
    return (v >= 10 ? Math.round(v) : v.toFixed(1)) + " " + ["B", "KB", "MB", "GB"][i];
  }

  function flattenCategories(items, depth = 0) {
    return (items || []).flatMap((c) => [
      { uuid: c.uuid, name: c.name, name_en: c.name_en, unread_count: c.unread_count, depth },
      ...flattenCategories(c.children, depth + 1),
    ]);
  }

  function notifyQuery({ page, query, unread, pinned, category } = {}) {
    const p = ["page_size=20", "recursive=true"];
    if (category) p.push("category_uuid=" + encodeURIComponent(category));
    if (unread) p.push("status=unread");
    if (pinned) p.push("is_pinned=1");
    const q = String(query || "").trim();
    if (q.length >= 2) p.push("fulltext=" + encodeURIComponent(q));
    return "/api/information/" + (page || 1) + "?" + p.join("&");
  }

  function readAllPath({ pinned, category } = {}) {
    const base = "/api/information/set-read-all/";
    if (category) return base + encodeURIComponent(category);
    return pinned ? base + "?is_pinned=1" : base;
  }

  // 親の unread_count は子を含むと仮定(実機未確認)
  function unreadTotal(flat) {
    return flat.filter((c) => c.depth === 0).reduce((s, c) => s + (typeof c.unread_count === "number" ? c.unread_count : 0), 0);
  }

  // 辞書に無い文言は日本語のまま出す(英語の訳漏れで空欄にしない)
  const tr = (dict, lang, ja) => (lang === "en" && dict && typeof dict[ja] === "string" && dict[ja] ? dict[ja] : ja);

  // 英語版が未翻訳のページは、content_en が「空の段落1つ」だけ(奨学金・お知らせ・電子キャビネットなど)。
  // 中身のあるブロックが1つでもあるときだけ英語版を使い、そうでなければ日本語の content にする
  const hasContent = (bs) => bs.some((b) => b && (b.type !== "paragraph" || String((b.data || {}).text || "").replace(/<[^>]*>/g, "").trim() !== ""));
  function pickBlocks(result, lang) {
    const blocks = (c) => (c && Array.isArray(c.blocks) ? c.blocks : null);
    const en = lang === "en" ? blocks(result && result.content_en) : null;
    return en && hasContent(en) ? en : blocks(result && result.content);
  }

  globalThis.MU = { tr, pickBlocks, isTitledColumns, flattenCategories, notifyQuery, readAllPath, unreadTotal, isDupFileLink, fmtSize, isSupported, tocEntries, fileKind, sectionize, isNotificationOnly, findBlocks, infoQuery, linkLabel, catOf, shortLabel, buildMonthGrid };
  if (typeof module !== "undefined") module.exports = globalThis.MU;
})();
