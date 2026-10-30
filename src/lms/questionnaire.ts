import { sanitize } from "@/portal/lib/sanitize";
import { readLtiPage, type LtiPage } from "./lti";

export type QuestionnairePage = LtiPage & {
  /** sanitize 済み。無ければ null */
  intro: string | null;
  dates: { label: string; value: string }[];
  messages: string[];
  actions: { label: string; url: string }[];
  answered: boolean;
  /** 「終了しました」の文がある(締切済み) */
  closed: boolean;
  /** 「許可された試行回数: N」の N。無ければ null */
  attempts: number | null;
};

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

/** アンケートの表示ページ(view.php)を読む。回答フォーム(complete.php)は読まない */
export function readQuestionnairePage(doc: Document, search: string): QuestionnairePage {
  const base = readLtiPage(doc, search);
  const dates = [...doc.querySelectorAll('[data-region="activity-dates"] div')].flatMap((d) => {
    const m = /^([^:：]+)[:：]\s*(.*)$/s.exec(squash(d.textContent));
    return m ? [{ label: m[1]!.trim(), value: m[2]!.trim() }] : [];
  });
  const intro = doc.querySelector("#intro .no-overflow") ?? doc.querySelector("#intro");
  const main = doc.querySelector('[role="main"]');
  const actions = [...(main?.querySelectorAll("a.btn") ?? [])].map((a) => ({ label: squash(a.textContent), url: (a as HTMLAnchorElement).getAttribute("href") ?? "" })).filter((a) => a.label && a.url);
  // ボタンと空の見出しを除いた文章を、いちばん内側の p/div ごとに集める
  const body = (main?.querySelector(".mod_questionnaire_viewpage") ?? main)?.cloneNode(true) as Element | undefined;
  body?.querySelectorAll("a.btn, h2").forEach((e) => e.remove());
  const all = [...(body?.querySelectorAll("p, div") ?? [])].filter((e) => !e.querySelector("p, div")).map((e) => squash(e.textContent)).filter(Boolean);
  // 試行回数の文は数字にして、messages からは除く
  const attemptsRe = /許可された試行回数[:：]\s*(\d+)/;
  const attempts = all.map((m) => attemptsRe.exec(m)).find(Boolean)?.[1];
  const messages = all.filter((m) => !attemptsRe.test(m));
  return {
    ...base,
    intro: intro?.innerHTML.trim() ? sanitize(intro.innerHTML) : null,
    dates,
    messages,
    actions,
    answered: actions.some((a) => a.url.includes("myreport.php")) || all.some((m) => m.includes("ありがとうございます")),
    closed: all.some((m) => m.includes("終了しました")),
    attempts: attempts === undefined ? null : Number(attempts),
  };
}
