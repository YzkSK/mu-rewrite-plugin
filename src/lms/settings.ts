import { ajax, fetchDoc, isLoginRedirect, LoginRequiredError } from "./api";
import { htmlToText } from "./assign";
import { readFileArea, type FileArea } from "./draftFiles";
import { SETTINGS } from "./route";

export type Tab = "profile" | "prefs" | "notify" | "files";
export const tabOf = (path: string): Tab => SETTINGS[path] ?? "profile";

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);
const field = (form: ParentNode, name: string): Element | null => form.querySelector(`[name="${name}"]`);
const val = (form: ParentNode, name: string): string => (field(form, name) as HTMLInputElement | null)?.value ?? "";

export type Select = { name: string; value: string; options: { value: string; label: string }[] };

function selectOf(form: ParentNode, name: string): Select | null {
  const el = field(form, name);
  if (!el || el.tagName !== "SELECT") return null;
  const options = [...el.querySelectorAll("option")].map((o) => ({ value: (o as HTMLOptionElement).value, label: squash(o.textContent) }));
  const sel = [...el.querySelectorAll("option")].find((o) => (o as HTMLOptionElement).selected) as HTMLOptionElement | undefined;
  return { name, value: sel?.value ?? options[0]?.value ?? "", options };
}

/** 本文(プレーンテキスト)→ 保存する HTML。改行は <br> */
export const textToDescription = (text: string): string => esc(text.replace(/\r\n?/g, "\n").trim()).replace(/\n/g, "<br>");

// ---- プロファイル ----

/** ヨミガナ以外の任意欄 */
export const OTHER_FIELDS: [string, string][] = [
  ["city", "都道府県"], ["institution", "所属組織"], ["department", "部署"], ["phone1", "電話"], ["phone2", "携帯"],
  ["address", "住所"], ["alternatename", "別名"], ["middlename", "ミドルネーム"],
];

export type EditForm = {
  /** 読み直すたびに変わる(画面の入力を作り直す目印) */
  id: number;
  form: HTMLFormElement;
  info: { label: string; value: string }[];
  maildisplay: Select | null;
  timezone: Select | null;
  about: string;
  others: { name: string; label: string; value: string }[];
  image: { url: string | null; deleteName: string | null; area: FileArea | null };
};

let seq = 0;

/** /user/edit.php の HTML から読む。form が無ければ null */
export function readEditForm(doc: Document): EditForm | null {
  const form = doc.querySelector<HTMLFormElement>("form.mform") ?? doc.querySelector<HTMLFormElement>("form#mform1");
  if (!form || !field(form, "_qf__user_edit_form")) return null;
  const join = (...n: string[]) => n.map((x) => val(form, x).trim()).filter(Boolean).join(" ");
  const country = [...form.querySelectorAll('[name="country"] option')].find((o) => (o as HTMLOptionElement).selected);
  const info = [
    { label: "名前", value: join("lastname", "firstname") },
    { label: "ヨミガナ", value: join("lastnamephonetic", "firstnamephonetic") },
    { label: "メールアドレス", value: val(form, "email") },
    { label: "国", value: (country as HTMLOptionElement | undefined)?.value ? squash(country!.textContent) : "" },
  ].filter((i) => i.value);
  return {
    id: ++seq,
    form,
    info,
    maildisplay: selectOf(form, "maildisplay"),
    timezone: selectOf(form, "timezone"),
    about: htmlToText(val(form, "description_editor[text]")),
    others: OTHER_FIELDS.filter(([n]) => field(form, n)).map(([name, label]) => ({ name, label, value: val(form, name) })),
    image: {
      url: form.querySelector<HTMLImageElement>("img.userpicture")?.getAttribute("src") ?? null,
      deleteName: ["deletepicture", "deleteimage"].find((n) => form.querySelector(`input[type="checkbox"][name="${n}"]`)) ?? null,
      area: readFileArea(doc, "imagefile"),
    },
  };
}

export async function loadEdit(): Promise<EditForm> {
  const e = readEditForm(await fetchDoc("/user/edit.php"));
  if (!e) throw new Error("プロファイルの入力欄が見つかりません");
  return e;
}

// ---- フォーラム・メッセージ ----

export type ForumPrefs = { form: HTMLFormElement; maildigest: Select | null; autosubscribe: Select | null };

export function readForumForm(doc: Document): ForumPrefs | null {
  const form = doc.querySelector<HTMLFormElement>("form.mform");
  if (!form) return null;
  return { form, maildigest: selectOf(form, "maildigest"), autosubscribe: selectOf(form, "autosubscribe") };
}

export async function loadForumPrefs(): Promise<ForumPrefs> {
  const f = readForumForm(await fetchDoc("/user/forum.php"));
  if (!f) throw new Error("フォーラムの設定が見つかりません");
  return f;
}

/** "1" = コンタクトのみ、"0" = コンタクトと同じコースの人も。未設定(null)は 0 */
export async function loadBlockNonContacts(): Promise<"0" | "1"> {
  const r = await ajax<{ preferences?: { value: string | number | null }[] }>("core_user_get_user_preferences", { name: "message_blocknoncontacts" });
  return Number(r.preferences?.[0]?.value ?? 0) === 1 ? "1" : "0";
}

export async function saveBlockNonContacts(value: "0" | "1"): Promise<void> {
  await ajax("core_user_update_user_preferences", { preferences: [{ type: "message_blocknoncontacts", value }] });
}

// ---- 通知 ----

export type NotifyCell = { name: string; on: boolean; locked: boolean };
export type NotifyRow = { key: string; name: string; cells: NotifyCell[] };
export type NotifyGroup = { name: string; rows: NotifyRow[] };
export type NotifyPage = { processors: string[]; groups: NotifyGroup[]; stopAll: boolean };

/** /message/notificationpreferences.php の表。見出しは 1 セルだけの行、通知は tr[data-preference-key] */
export function readNotify(doc: Document): NotifyPage {
  const groups: NotifyGroup[] = [];
  const processors: string[] = [];
  for (const tr of doc.querySelectorAll("tr")) {
    const key = tr.getAttribute("data-preference-key");
    if (key === null) {
      if (tr.children.length === 1 && squash(tr.textContent)) groups.push({ name: squash(tr.textContent), rows: [] });
      continue;
    }
    if (!groups.length) groups.push({ name: "", rows: [] });
    const cells = [...tr.querySelectorAll("td[data-processor-name]")].map((td) => {
      const input = td.querySelector<HTMLInputElement>('input[type="checkbox"]');
      return { name: td.getAttribute("data-processor-name")!, on: !!input?.checked, locked: !input };
    });
    for (const c of cells) if (!processors.includes(c.name)) processors.push(c.name);
    groups[groups.length - 1]!.rows.push({ key, name: squash(tr.querySelector(".preference-name")?.textContent ?? tr.querySelector("th")?.textContent), cells });
  }
  return { processors, groups, stopAll: !!doc.querySelector<HTMLInputElement>("#disable-notifications")?.checked };
}

export async function loadNotify(): Promise<NotifyPage> {
  return readNotify(await fetchDoc("/message/notificationpreferences.php"));
}

const STUDENT_GROUP = /課題|フォーラム|レッスン|アンケート|小テスト|クイックメール/;
const SYSTEM_GROUP = /システム/;
const SYSTEM_ROWS = /評定通知|コース完了|コースコンテンツ変更|ウェルカムメッセージ|バッジ取得者通知|コンタクトリクエスト通知|パーソナルメッセージ/;

/** 学生に届くもの(shown)と、届かないもの(hidden)に分ける。判定はグループ名と行名 */
export function splitNotify(groups: NotifyGroup[]): { shown: NotifyGroup[]; hidden: NotifyGroup[] } {
  const shown: NotifyGroup[] = [];
  const hidden: NotifyGroup[] = [];
  for (const g of groups) {
    const keep = (r: NotifyRow) => STUDENT_GROUP.test(g.name) || (SYSTEM_GROUP.test(g.name) && SYSTEM_ROWS.test(r.name));
    const a = g.rows.filter(keep);
    const b = g.rows.filter((r) => !keep(r));
    if (a.length) shown.push({ name: g.name, rows: a });
    if (b.length) hidden.push({ name: g.name, rows: b });
  }
  return { shown, hidden };
}

/** 保存する値: 有効な(ロックでない)窓口名のカンマ区切り。全部オフは "none" */
export const enabledValue = (cells: NotifyCell[]): string => cells.filter((c) => c.on && !c.locked).map((c) => c.name).join(",") || "none";

export async function saveNotify(row: NotifyRow): Promise<void> {
  await ajax("core_user_update_user_preferences", { preferences: [{ type: `${row.key}_enabled`, value: enabledValue(row.cells) }] });
}

export async function saveStopAll(stop: boolean): Promise<void> {
  await ajax("core_user_update_user_preferences", { emailstop: stop ? 1 : 0, preferences: [] });
}

// ---- form の保存(プロファイル・フォーラム・プライベートファイル) ----

/** form を FormData にして変えた欄を上書きし、submitbutton を足して action へ POST。失敗は理由つきの Error */
export async function saveForm(form: HTMLFormElement, set: Record<string, string> = {}): Promise<void> {
  const fd = new FormData(form);
  for (const [k, v] of Object.entries(set)) fd.set(k, v);
  fd.set("submitbutton", val(form, "submitbutton") || "1");
  const body = new URLSearchParams([...fd].map(([k, v]) => [k, String(v)] as [string, string]));
  const action = new URL(form.getAttribute("action") || location.href, location.href);
  const r = await fetch(action, { method: "POST", credentials: "include", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (isLoginRedirect(r)) throw new LoginRequiredError();
  const doc = new DOMParser().parseFromString(await r.text(), "text/html");
  const why = [...doc.querySelectorAll(".invalid-feedback, .alert-danger")].map((e) => squash(e.textContent)).filter(Boolean).join(" ");
  if (why) throw new Error(why);
  // Moodle は保存できたときだけ別のページへ転送する。同じ form のままなら保存されていない
  if (!r.ok || (!r.redirected && doc.querySelector(`form[action$="${action.pathname}"]`))) throw new Error("保存できませんでした");
}
