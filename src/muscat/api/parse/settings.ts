import { ParseError } from "../errors";
import type { CheckOption, SettingsPage, SettingsRow, SettingsSection, SettingsTable } from "../types";
import { squash } from "./genericControls";
import { buttonByText, checkOptions, refOf, selectField, textField } from "./liveFields";
import { radios } from "./room";

/** 画面に出さないタブ(テーマ設定は拡張の配色と食い違うので出さない) */
// お気に入りは拡張のメニューに出さないので、その設定のタブも出さない
const HIDDEN_TABS = ["テーマ設定", "お気に入り機能設定"];

/** 枠(.ui-chkbox-box)を CheckOption にする。操作は枠を click する */
const boxOption = (label: string, scope: Element | null): CheckOption => {
  const box = scope?.querySelector(".ui-chkbox-box");
  const input = scope?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  return { label, ref: refOf(box), checked: !!input?.checked || !!box?.classList.contains("ui-state-active") };
};

/** データテーブル。見出しは選択の列を除く。空のときの「対象データがありません。」の行は行に数えない */
function parseTable(table: Element | null | undefined): SettingsTable {
  if (!table) return { headers: [], rows: [] };
  const headers = [...table.querySelectorAll("thead th")].filter((th) => !th.classList.contains("ui-selection-column")).map((th) => squash(th.textContent));
  const rows = [...table.querySelectorAll("tbody tr")]
    .filter((tr) => !tr.classList.contains("ui-datatable-empty-message"))
    .map((tr): SettingsRow => {
      const tds = [...tr.querySelectorAll("td")];
      const sel = tds.find((td) => td.classList.contains("ui-selection-column")) ?? null;
      return {
        select: boxOption("", sel),
        cells: tds.filter((td) => td !== sel).map((td) => boxOption(squash(td.textContent), td)),
      };
    });
  return { headers, rows };
}

/** 子要素が改行だけの要素の文字(注釈の「※…」を拾う) */
const leafTexts = (root: Element) =>
  [...new Set([...root.querySelectorAll("*")].filter((e) => [...e.children].every((c) => c.tagName === "BR")).map((e) => squash(e.textContent)).filter(Boolean))];

/** 見出し(.ui-panel-titlebar)に text を含む小パネル */
const panelByTitle = (root: Element, text: string) =>
  [...root.querySelectorAll(".ui-panel")].find((p) => squash([...p.children].find((c) => c.classList.contains("ui-panel-titlebar"))?.textContent).includes(text)) ?? null;

// 選ばれているタブの印(汎用画面の genericTabs と同じ)
const SELECTED = ".ui-tabs-selected, .ui-state-active, .ui-tabs-active";

/**
 * 個人設定(#funcForm の TabView)。開いているタブの中身だけ読む(ほかのタブは押すと ajax で読み込まれる)。
 * 副作用: 操作する要素に data-mu-ref を付ける
 */
export function parseSettings(root: Document): SettingsPage {
  const form = root.getElementById("funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  // タブの中身は、見出しのリンク先(href="#funcForm:tabArea:j_id_29")と同じ id の要素。一度読んだタブの中身は残る(元の画面は隠す印を付けず、
  // 全タブの中身を読んで一緒に出していた。実機で確認)。中身が空のタブは押すと ajax で読み込む
  const panelOf = (a: Element | null) => (a ? root.getElementById(decodeURIComponent((a.getAttribute("href") ?? "").replace(/^#/, ""))) : null);
  const items = [...form.querySelectorAll(".ui-tabs-nav li")].map((li) => ({ li, a: li.querySelector("a") }));
  const tabs = items
    .map(({ li, a }) => ({ label: squash(li.textContent), ref: refOf(a), active: li.matches(SELECTED), loaded: (panelOf(a)?.childElementCount ?? 0) > 0 }))
    .filter((t) => !HIDDEN_TABS.includes(t.label));
  const body = panelOf(items.find(({ li }) => li.matches(SELECTED))?.a ?? null) ?? form;
  const section = (el: Element, title: string): SettingsSection => ({
    title,
    notes: leafTexts(el).filter((t) => t.startsWith("※")),
    saveRef: refOf(buttonByText(el, "保存")),
  });
  const dialog = [...root.querySelectorAll(".ui-confirm-dialog")].find((d) => !d.closest("#headerForm"));
  const input = body.querySelector('[id$="inputMailAddr"]');
  const menu = body.querySelector('[id$="menu_input"]');
  const portal = radios(body);
  let mail: SettingsPage["mail"] = null;
  let favorite: SettingsPage["favorite"] = null;
  let portalPage: SettingsPage["portal"] = null;
  if (input) {
    // 小パネルが見つからなければ全体を探す(見出しの作りが違っても、押せるものは出す)
    const part = (title: string) => panelByTitle(body, title) ?? body;
    const addr = part("メールアドレス設定");
    const times = part("配信時刻設定");
    const stop = part("配信停止設定");
    const timesName = times.querySelector<HTMLInputElement>('.ui-selectmanycheckbox input[type="checkbox"]')?.name;
    mail = {
      address: {
        ...section(addr, "メールアドレス設定"),
        input: textField(input),
        kinds: radios(addr),
        addRef: refOf(buttonByText(addr, "追加")),
        deleteRef: refOf(buttonByText(addr, "選択した行を削除")),
        table: parseTable(addr.querySelector('[id$=":mailAddrList"]')),
      },
      times: { ...section(times, "配信時刻設定"), options: timesName ? checkOptions(times, timesName) : [] },
      stop: { ...section(stop, "配信停止設定"), table: parseTable(stop.querySelector(".ui-datatable")) },
    };
  } else if (menu) {
    favorite = {
      ...section(body, "お気に入り機能設定"),
      menu: selectField(menu),
      addRef: refOf(buttonByText(body, "追加")),
      resetRef: refOf(buttonByText(body, "元に戻す")),
      table: parseTable(body.querySelector('[id$="favoriteMenuList"]')),
    };
  } else if (portal.length) {
    portalPage = { ...section(body, "ポータル表示設定"), description: leafTexts(body).find((t) => t.includes("開始曜日")) ?? "", options: portal };
  }
  return { tabs, confirmRef: refOf(dialog?.querySelector(".ui-confirmdialog-yes")), mail, favorite, portal: portalPage };
}
