import type { WaitResult } from "../driver/busy";
import type { DriveStep } from "../driver/drive";
import { resolveRef } from "../driver/locator";
import { MuscatDownError, NoticeError } from "../errors";
import type { ResponseKind } from "../expired";
import { buildAbRequest, parseAb, type AbConfig, type AbExt } from "./ab";
import { Reader } from "./js";
import { applyDialogCalls, applyResponse, setOpen } from "./apply";
import { pageRequest, setBase, submitRequest, type Req } from "./req";
import { behaviorOf, scanWidgets, type Widget } from "./widgets";

export type { Req };
/** 本文を返す。状態喪失なら null(core の直列 post) */
export type Post = (kind: ResponseKind, req: Req) => Promise<string | null>;
/** 画面ごと替わる POST を送り、新しい画面として取り込む(core) */
export type Page = (req: Req) => Promise<void>;

const MAX_HOP = 3;
const CHANGE = ["change", "dateSelect", "valueChange"];
const NEXT = /\$\(this\)\.next\(\)\.click\(\)|confirmIfModified\(\s*\$\(this\)\.next\(\)\s*\)/;
const BY_ID = /confirmIfModified\(\s*(['"])([^'"]+)\1\s*\)/;

/**
 * jQuery の $(this).next()。元の画面では部品の設定の <script id="…_s"> は実行後に消えるので、隣は次の部品になる。
 * 止めたまま持つ HTML では script が残っているので飛ばす(ホームの「翌日」の隣が script だった。実機で確認)
 */
function nextElement(el: Element): Element | null {
  let n = el.nextElementSibling;
  while (n && n.tagName === "SCRIPT") n = n.nextElementSibling;
  return n;
}

const setAttr = (el: Element, name: string, on: boolean) => (on ? el.setAttribute(name, "") : el.removeAttribute(name));

function setField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  el.value = value;
  if (el instanceof HTMLSelectElement) {
    for (const o of el.options) {
      o.selected = o.value === value;
      setAttr(o, "selected", o.selected);
    }
  } else if (el instanceof HTMLTextAreaElement) el.textContent = value;
  else el.setAttribute("value", value);
}

/** 見た目の枠(読み取りは input.checked || 枠の ui-state-active を見る)を input に合わせる */
function paint(input: HTMLInputElement) {
  const box = input.closest(".ui-chkbox, .ui-radiobutton")?.querySelector(".ui-chkbox-box, .ui-radiobutton-box") ?? input.closest(".ui-selectbooleanbutton");
  box?.classList.toggle("ui-state-active", input.checked);
}

function setCheck(input: HTMLInputElement, checked: boolean) {
  const group = input.type === "radio" && checked ? [...(input.form ?? input.ownerDocument).querySelectorAll<HTMLInputElement>(`input[type="radio"]`)].filter((r) => r.name === input.name) : [input];
  for (const r of group) {
    r.checked = r === input ? checked : false;
    setAttr(r, "checked", r.checked);
    paint(r);
  }
}

/** 見えている枠・ボタンの下にある本物の input */
function inputOf(el: HTMLElement): HTMLInputElement | null {
  if (el instanceof HTMLInputElement) return el;
  const one = el.closest(".ui-selectonebutton");
  const btn = el.closest(".ui-button");
  if (one && btn) {
    const i = [...one.querySelectorAll(".ui-button")].indexOf(btn);
    return one.querySelectorAll<HTMLInputElement>("input")[i] ?? null;
  }
  const wrap = el.closest(".ui-selectbooleanbutton, .ui-chkbox, .ui-radiobutton");
  return wrap?.querySelector("input") ?? null;
}

/** 隠し項目(id と name が同じ)。値を属性にも入れる(文書の複製・outerHTML でも残るように) */
function setHidden(doc: Document, name: string, value: string): void {
  const el = doc.getElementById(name) ?? [...doc.querySelectorAll("input")].find((i) => i.name === name);
  if (el instanceof HTMLInputElement) {
    el.value = value;
    el.setAttribute("value", value);
  }
}
const hiddenValue = (doc: Document, name: string): string => {
  const el = doc.getElementById(name) ?? [...doc.querySelectorAll("input")].find((i) => i.name === name);
  return el instanceof HTMLInputElement ? el.value : "";
};

/** タブを切り替えた見た目にする(タブの li とパネル、activeIndex の hidden) */
function activate(doc: Document, tabId: string, index: number) {
  const box = doc.getElementById(tabId);
  const nav = box && [...box.querySelectorAll(".ui-tabs-nav")].find((n) => n.closest(".ui-tabs") === box);
  nav?.querySelectorAll("li").forEach((li, i) => {
    for (const c of ["ui-tabs-selected", "ui-state-active", "ui-tabs-active"]) li.classList.toggle(c, i === index);
  });
  box?.querySelectorAll(".ui-tabs-panel").forEach((p, i) => {
    if (p.closest(".ui-tabs") !== box) return;
    for (const c of ["ui-helper-hidden", "ui-tabs-hidden"]) p.classList.toggle(c, i !== index);
    p.setAttribute("aria-hidden", String(i !== index));
  });
  setHidden(doc, `${tabId}_activeIndex`, String(index));
}

/** アコーディオンの見出しと中身を開閉の見た目にする */
function expand(header: Element, open: boolean) {
  header.classList.toggle("ui-state-active", open);
  header.setAttribute("aria-expanded", String(open));
  const body = header.nextElementSibling;
  body?.classList.toggle("ui-helper-hidden", !open);
  body?.setAttribute("aria-hidden", String(!open));
}

type Action = { ab: AbConfig; src: Element } | { next: Element | null } | { nav: Element } | { submit: { form: HTMLFormElement; params: Record<string, string>; sync?: string } };

const SUBMIT = /PrimeFaces\.addSubmitParam\(\s*(['"])([^'"]+)\1\s*,\s*(?=\{)/;

/** PrimeFaces.addSubmitParam('form',{名前:値}).submit('form')(ajax ではないリンク)。フォームと足す項目 */
function submitOf(doc: Document, js: string, self: Element): { form: HTMLFormElement; params: Record<string, string>; sync?: string } | null {
  const m = SUBMIT.exec(js);
  const form = m && doc.getElementById(m[2]!);
  if (!m || form?.tagName !== "FORM") return null;
  // サイトの syncTransition('id') / syncTransition(this) は、送る前に rx.sync.source=id の隠し項目を足す
  const s = /syncTransition\(\s*(?:(['"])([^'"]+)\1|this)\s*\)/.exec(js);
  const sync = s ? (s[2] ?? self.id) : undefined;
  try {
    const o = new Reader(js, m.index + m[0].length).object();
    return { form: form as HTMLFormElement, sync, params: Object.fromEntries(Object.entries(o).filter((e): e is [string, string] => typeof e[1] === "string")) };
  } catch {
    return null;
  }
}

/** 開発用: localStorage["mu-dev"]="1" のときだけ、押した要素と何を送ると決めたかをコンソールに出す(押しても何も起きないときの原因を見る) */
function devClick(el: Element, what: string): void {
  try {
    if (localStorage.getItem("mu-dev") !== "1") return;
    console.debug("[mu-click]", JSON.stringify({ ref: el.getAttribute("data-mu-ref"), tag: el.tagName, id: el.id, href: el.getAttribute("href"), onclick: (el.getAttribute("onclick") ?? "").slice(0, 200), pfconfirm: (el.getAttribute("data-pfconfirmcommand") ?? "").slice(0, 200), what }));
  } catch { /* 出せなくても動く */ }
}

/**
 * 拡張機能が持つ Document(元の画面の script は動かない)の上で、値を入れ、元の PrimeFaces が送る通信を自分で送る。
 * 送ったら "done"、何も送らなければ "none"。ref が無ければ何もせずに Error
 */
export async function vdrive(doc: Document, steps: DriveStep[], io: { post: Post; page: Page; replace?: (next: Document) => void }): Promise<WaitResult> {
  const first = steps.map((s) => {
    const el = resolveRef(doc, s.ref);
    if (!el) throw new Error(`要素が見つかりません: ${s.ref}`);
    return el;
  });
  let sent = false;
  let replaced = false;

  async function sendAb(cfg: AbConfig, src: Element, ext?: AbExt) {
    const req = buildAbRequest(doc, cfg, src, ext);
    const text = await io.post("partial", req);
    if (text === null) throw new MuscatDownError("MUSCAT が応答しません");
    sent = true;
    applyResponse(doc, text, cfg.onco, ext?.table, (next) => {
      setBase(next, req.url); // 元のブラウザもこの URL で新しい画面になる。相対の action はここが基準
      replaced = true; // 画面ごと替わった(ViewRoot)。これまでの Document への続きの手順はやめる
      io.replace?.(next);
    });
  }

  /** 要素と 3 つ上までの祖先で、最初に見つかった「押したときの通信」 */
  function findAction(el: HTMLElement, widgets: Map<string, Widget>): Action | null {
    for (let e: HTMLElement | null = el, n = 0; e && n < 4; e = e.parentElement, n++) {
      const oc = e.getAttribute("onclick") ?? "";
      // 確認付きのボタン: 本物の通信は data-pfconfirmcommand にある(確認は拡張側の画面で済んでいる)。サイトの JS だけのものは画面ごとの移動
      const pc = e.getAttribute("data-pfconfirmcommand") ?? "";
      const ab = (pc && parseAb(pc)) || parseAb(oc) || behaviorOf(widgets, e.id, "click");
      if (ab) return { ab, src: e };
      if (/\$\(this\)\.click\(\)/.test(pc)) return { nav: e };
      const submit = submitOf(doc, pc, e) ?? submitOf(doc, oc, e);
      if (submit) return { submit };
      if (NEXT.test(oc)) return { next: nextElement(e) };
      const id = BY_ID.exec(oc)?.[2];
      if (id) return { next: doc.getElementById(id) };
    }
    return null;
  }

  /** 変更したときの通信: 要素の onchange、無ければ部品(要素と祖先)の change / dateSelect の behavior */
  function changeAb(el: Element): { cfg: AbConfig; src: Element } | null {
    const own = parseAb(el.getAttribute("onchange") ?? "");
    if (own) return { cfg: own, src: el };
    const widgets = scanWidgets(doc);
    for (let e: Element | null = el, n = 0; e && n < 4; e = e.parentElement, n++) {
      const cfg = behaviorOf(widgets, e.id.replace(/_input$/, ""), ...CHANGE);
      if (cfg) return { cfg, src: el };
    }
    return null;
  }

  async function fireChange(el: Element) {
    const ab = changeAb(el);
    if (ab) await sendAb(ab.cfg, ab.src);
  }

  async function closeDialog(dlg: Element | null) {
    if (!dlg) return;
    setOpen(dlg, false);
    const cfg = behaviorOf(scanWidgets(doc), dlg.id, "close");
    if (cfg) await sendAb(cfg, dlg);
  }

  async function tabClick(a: Element, nav: Element, box: Element) {
    const lis = [...nav.querySelectorAll("li")].filter((li) => li.querySelector("a"));
    const li = lis.find((l) => l.contains(a));
    const index = li ? lis.indexOf(li) : -1;
    if (index < 0 || li?.classList.contains("ui-state-active")) return;
    const panelId = (a.getAttribute("href") ?? "").replace(/^#/, "");
    const widgets = scanWidgets(doc);
    const w = widgets.get(box.id);
    const empty = !doc.getElementById(panelId)?.children.length;
    activate(doc, box.id, index); // 本文を組み立てる前に activeIndex を新しいタブにする
    const params: [string, string][] = [[`${box.id}_newTab`, panelId], [`${box.id}_tabindex`, String(index)]];
    const change = behaviorOf(widgets, box.id, "tabChange");
    if (change) return sendAb(change, box, { params });
    // 動的なタブの中身はまだ無いので取る。中身があれば見た目の切り替えだけ(通信なし)
    if (empty && (w ? w.cfg.dynamic === true : true)) {
      const form = box.closest("form");
      if (!form) throw new Error("フォームが見つかりません");
      await sendAb({ s: box.id, f: form.id, p: box.id, u: box.id }, box, { ignoreAutoUpdate: true, sourceFirst: true, params: [[`${box.id}_contentLoad`, "true"], ...params] });
    }
  }

  async function accordionClick(header: Element, box: Element) {
    const heads = [...box.querySelectorAll(".ui-accordion-header")].filter((h) => h.closest(".ui-accordion") === box);
    const index = heads.indexOf(header);
    if (index < 0) return;
    const widgets = scanWidgets(doc);
    const w = widgets.get(box.id);
    const tabId = header.id.replace(/_header$/, "");
    const key = `${box.id}_active`;
    const list = hiddenValue(doc, key).split(",").filter((x) => x !== "");
    const open = list.includes(String(index));
    const next = open ? list.filter((x) => x !== String(index)) : w?.cfg.multiple === false ? [String(index)] : [...list, String(index)];
    setHidden(doc, key, next.join(",")); // 送る前に開いている番号を直す
    expand(header, !open);
    const cfg = behaviorOf(widgets, box.id, open ? "tabClose" : "tabChange");
    const params: [string, string][] = [[open ? `${box.id}_tabId` : `${box.id}_newTab`, tabId], [`${box.id}_tabindex`, String(index)]];
    if (cfg) await sendAb(cfg, box, { params });
  }

  /** DataTable のページ送り(ページの番号・1 ページの件数を変える)。PrimeFaces の paginate と同じ params(実機での記録は無い) */
  async function paginate(bar: Element, to: { page: "first" | "prev" | "next" | "last" | number } | { rows: number }) {
    const table = bar.closest(".ui-datatable");
    const form = table?.closest("form");
    if (!table || !form) throw new Error("表が見つかりません");
    const widgets = scanWidgets(doc);
    const w = widgets.get(table.id);
    const pg = (w?.cfg.paginator ?? {}) as { rows?: number; rowCount?: number };
    const select = bar.querySelector<HTMLSelectElement>(".ui-paginator-rpp-options");
    const rows = "rows" in to ? to.rows : Number(select?.value) || Number(pg.rows) || 10;
    const cur = Number(/\d+/.exec(bar.querySelector(".ui-paginator-page.ui-state-active")?.textContent ?? "")?.[0] ?? 1) - 1;
    const pages = [...bar.querySelectorAll(".ui-paginator-page")].map((a) => Number(a.textContent) || 0);
    const count = pg.rowCount ? Math.ceil(pg.rowCount / rows) : Math.max(0, ...pages);
    const page = "rows" in to ? 0 : to.page === "first" ? 0 : to.page === "prev" ? cur - 1 : to.page === "next" ? cur + 1 : to.page === "last" ? count - 1 : to.page;
    if (page < 0 || (count && page >= count)) return;
    const id = table.id;
    const params: [string, string][] = [
      [`${id}_pagination`, "true"], [`${id}_first`, String(page * rows)], [`${id}_rows`, String(rows)],
      [`${id}_skipChildren`, "true"], [`${id}_encodeFeature`, "true"],
    ];
    // 実機で記録した要求: behavior page の ab に、source / process / update を表の id にし、resetvalues を付ける
    const base = behaviorOf(widgets, id, "page") ?? { s: id, f: form.id, e: "page" };
    await sendAb({ ...base, s: id, p: id, u: id, rv: true }, table, { params, table: { id, first: page * rows, rows } });
  }

  async function click(el: HTMLElement, hop = 0): Promise<void> {
    // a) 小窓の ✕。b) 確認の小窓の中は拡張側で確認済みなので何もしない(守られたボタンの通信は、そのボタンを押したときに送る)
    const x = el.closest(".ui-dialog-titlebar-close");
    if (x) return closeDialog(x.closest(".ui-dialog"));
    if (el.closest(".ui-confirm-dialog, .ui-confirmdialog-yes, .ui-confirmdialog-no")) return;
    // c) 押したときの通信(onclick の ab / 確認付きのボタンの data-pfconfirmcommand / 部品の click の behavior / サイトの JS の「次の要素を押す」)
    const act = findAction(el, scanWidgets(doc));
    devClick(el, act ? Object.keys(act)[0]! : "(通信なし)");
    if (act) {
      if ("ab" in act) return sendAb(act.ab, act.src);
      if ("submit" in act) return io.page(submitRequest(act.submit.form, act.submit.params, act.submit.sync));
      if ("nav" in act) {
        const form = act.nav.closest("form");
        if (!form) throw new Error("フォームが見つかりません");
        return io.page(pageRequest(form, act.nav.id));
      }
      return act.next && hop < MAX_HOP ? click(act.next as HTMLElement, hop + 1) : undefined;
    }
    const oc = el.getAttribute("onclick") ?? "";
    if (oc.includes("PF(")) return applyDialogCalls(doc, oc);
    // d) タブ / アコーディオン / ページャー
    const a = el.closest("a");
    const nav = a && el.closest(".ui-tabs-nav");
    const tabs = nav?.closest(".ui-tabs");
    if (a && nav && tabs) return tabClick(a, nav, tabs);
    const head = el.closest(".ui-accordion-header");
    const acc = head?.closest(".ui-accordion");
    if (head && acc) return accordionClick(head, acc);
    const pager = el.closest(".ui-paginator");
    if (pager && a && !a.classList.contains("ui-state-disabled")) {
      const kind = (["first", "prev", "next", "last"] as const).find((k) => a.classList.contains(`ui-paginator-${k}`));
      if (kind) return paginate(pager, { page: kind });
      if (a.classList.contains("ui-paginator-page")) return paginate(pager, { page: (Number(a.textContent) || 1) - 1 });
    }
    // e) 枠・ボタンの下の input を切り替える
    const input = inputOf(el);
    if (input && (input.type === "checkbox" || input.type === "radio")) {
      if (input.type === "radio" && input.checked) return;
      setCheck(input, input.type === "radio" ? true : !input.checked);
      return fireChange(input);
    }
    // f) 画面の移動
    const href = a?.getAttribute("href") ?? "";
    if (href && !href.startsWith("#") && !href.startsWith("javascript:")) throw new NoticeError("このリンクはまだ開けません");
    // g) それ以外は何も起きない
  }

  for (const [i, s] of steps.entries()) {
    if (replaced) break;
    // 前の通信で差し替わっていれば、ref か id で探し直す
    const el = resolveRef(doc, s.ref) ?? (first[i]!.id ? doc.getElementById(first[i]!.id) : null) ?? first[i]!;
    if (s.kind === "set") {
      const changed = (el as HTMLInputElement).value !== s.value; // 値が同じなら、ブラウザと同じく change は起きない
      setField(el as HTMLInputElement, s.value);
      const bar = el.closest(".ui-paginator");
      if (bar && el.matches(".ui-paginator-rpp-options")) await paginate(bar, { rows: Number(s.value) || 10 });
      else if (changed) await fireChange(el);
    } else if (s.kind === "check") {
      const input = inputOf(el);
      if (!input || input.checked === s.checked) continue;
      setCheck(input, s.checked);
      await fireChange(input);
    } else await click(el);
  }
  return sent ? "done" : "none";
}
