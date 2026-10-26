import { sanitize } from "@/portal/lib/sanitize";

export type DateRow = { label: string; value: string };
/** 状態の表の 1 行。html は td の中身(sanitize 済み)、text は文字だけ、cls は td の class */
export type StatusRow = { label: string; html: string; text: string; cls: string };
/** entry が今のページから読んだ課題の情報 */
export type AssignPage = {
  id: number | null;
  courseId: number | null;
  courseName: string | null;
  title: string;
  dates: DateRow[];
  /** sanitize 済み。無ければ null */
  description: string | null;
  rows: StatusRow[];
  /** 「提出する」(editsubmission)のボタンが元の画面にあるか */
  canSubmit: boolean;
  /** 「提出ボタンを押させる」設定で、保存した下書きを確定するボタン(action=submit)があるか */
  needsFinal: boolean;
};
export type SubmitForm = {
  action: string;
  /** 本文・ボタン以外の hidden を全部(順番どおり) */
  fields: [string, string][];
  /** 本文の既存の HTML。入力欄が無い課題は null */
  text: string | null;
  hasFiles: boolean;
  submitName: string;
  submitValue: string;
};

const TEXT_NAME = "onlinetext_editor[text]";
const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

/** 今開いているページから課題の情報を読む(読めない所は空・null) */
export function readAssignPage(doc: Document, search: string): AssignPage {
  const q = new URLSearchParams(search);
  const id = Number(q.get("id")) || null;
  let title = doc.title.replace(/\s*\|\s*MU-LMS\s*$/, "").replace(/^[^\s:]+:\s*/, "").trim();
  // shortcut: 課題名に " - " を含む提出画面は途中で切れる。名前が壊れる例が出たら <h1> から読む
  if (q.get("action") === "editsubmission" && title.includes(" - ")) title = title.slice(0, title.lastIndexOf(" - ")).trim();

  let courseId: number | null = null;
  for (const s of doc.scripts) {
    const m = /"courseId":(\d+)/.exec(s.textContent ?? "");
    if (m) { courseId = Number(m[1]); break; }
  }
  const courseName = squash(doc.querySelector('.breadcrumb a[href*="/course/view.php"]')?.textContent) || null;

  const dates = [...doc.querySelectorAll('[data-region="activity-dates"] div')].flatMap((d): DateRow[] => {
    const m = /^([^:：]+)[:：]\s*(.*)$/s.exec(squash(d.textContent));
    return m ? [{ label: m[1]!.trim(), value: m[2]!.trim() }] : [];
  });

  const desc = doc.querySelector("#region-main .activity-description") ?? doc.querySelector("#intro");
  const description = desc?.innerHTML.trim() ? sanitize(desc.innerHTML) : null;

  const trs = doc.querySelectorAll(".submissionstatustable tr");
  const rows = [...(trs.length ? trs : doc.querySelectorAll("table.generaltable tr"))].flatMap((tr): StatusRow[] => {
    const th = tr.querySelector("th");
    const td = tr.querySelector("td");
    // オンラインテキストは「(N 語)」と抜粋と全文が並ぶので、全文の箱だけ使う
    const full = td?.querySelector('[class*="full_assignsubmission_"] .no-overflow');
    return th && td ? [{ label: squash(th.textContent), html: sanitize((full ?? td).innerHTML), text: squash(td.textContent), cls: td.className }] : [];
  });

  const actions = [...doc.querySelectorAll("#region-main form")].map((f) => f.querySelector('input[name="action"]')?.getAttribute("value"));
  return { id, courseId, courseName, title, dates, description, rows, canSubmit: actions.includes("editsubmission"), needsFinal: actions.includes("submit") };
}

/** 提出画面の form.mform を読む。無ければ null */
export function readSubmitForm(doc: Document): SubmitForm | null {
  const form = doc.querySelector("form.mform");
  if (!form) return null;
  const fields = [...form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].filter((i) => i.name && i.name !== TEXT_NAME).map((i): [string, string] => [i.name, i.value]);
  const btn = form.querySelector<HTMLInputElement>('input[type="submit"][name="submitbutton"], button[name="submitbutton"]');
  return {
    action: form.getAttribute("action") || "/mod/assign/view.php",
    fields,
    text: form.querySelector<HTMLTextAreaElement>(`textarea[name="${TEXT_NAME}"]`)?.value ?? null,
    hasFiles: !!form.querySelector('[name="files_filemanager"]'),
    submitName: "submitbutton",
    submitValue: btn?.value ?? "",
  };
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);

/** 利用者の書いたテキスト → HTML。空行で段落(<p>)、段落の中の改行は <br>。文字は全部エスケープ */
export function textToHtml(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim().split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** 既存の本文 HTML → 入力欄の文字。<p>/<br> は改行、ほかのタグは外す */
export function htmlToText(html: string): string {
  const s = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p\s*>/gi, "\n\n").replace(/<p(\s[^>]*)?>/gi, "");
  return (new DOMParser().parseFromString(s, "text/html").body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

/** 提出の POST の中身 */
export function buildSubmission(form: SubmitForm, text: string): URLSearchParams {
  const p = new URLSearchParams(form.fields);
  // 書き換えていなければ元の HTML のまま送る(平文に直すと書式・リンク・画像が消える)
  if (form.text !== null) p.set(TEXT_NAME, text === htmlToText(form.text) ? form.text : textToHtml(text));
  p.set(form.submitName, form.submitValue);
  return p;
}

/** 応答が提出フォームのままか(= 保存されず同じ画面に戻された) */
const stillForm = (html: string): boolean => !!new DOMParser().parseFromString(html, "text/html").querySelector('form.mform input[name="_qf__mod_assign_submission_form"]');

/** 送る。成功したら課題ページへ移る。失敗は理由つきの Error */
export async function submit(form: SubmitForm, text: string, go: (url: string) => void = (u) => location.assign(u)): Promise<void> {
  const r = await fetch(new URL(form.action, location.href), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildSubmission(form, text),
  });
  const html = await r.text();
  // ログインが切れていると、ログイン画面への転送を追って 200 が返る。成功と見なすと書きかけを消してしまう
  if (new URL(r.url || location.href).pathname.startsWith("/login/")) throw new Error("ログインが切れていたため提出できませんでした。書いた本文は残っています");
  if (!r.ok || r.url.includes("action=editsubmission") || stillForm(html)) {
    const why = [...new DOMParser().parseFromString(html, "text/html").querySelectorAll(".error, .alert-danger")].map((e) => squash(e.textContent)).filter(Boolean).join(" ");
    throw new Error(why || "提出できませんでした");
  }
  go(`/mod/assign/view.php?id=${form.fields.find(([k]) => k === "id")?.[1] ?? ""}`);
}
