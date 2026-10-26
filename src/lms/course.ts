import { isHttp, sanitize } from "@/portal/lib/sanitize";
import { ajax, LoginRequiredError, shortName } from "./api";

export type Teacher = { id: number; name: string };
/** entry が今のページから読んだもの。name は先頭の 3 桁つき */
export type CoursePage = { id: number | null; name: string; shortname: string; teachers: Teacher[] };
export type Item = {
  id: string; name: string; url: string; mod: string;
  /** ファイルの種類(PDF など)。無ければ null */
  type: string | null;
  /** Snap の完了状況の文字(空白は詰める) */
  status: string;
  /** ラベルの本文(sanitize 済み)。ラベル以外は null */
  html: string | null;
  /** ラベルの中の動画(同じオリジンの http(s) だけ) */
  videos: string[];
};
export type Section = { id: number; title: string; summary: string | null; items: Item[] };

const DAYS: Record<string, string> = { 1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土" };

export type Slot = { term: number; day: number | null; period: number | null };

/** "333 専門…" → { term: 3, day: 3(水), period: 3 }。day・period は 9(なし)なら null。読めなければ null */
// shortcut: 開始の時限だけ。2 コマ続き・2 学期にまたがる授業は MUSCAT 連携の PR で照合に替える
export function readSlot(name: string): Slot | null {
  const m = /^([1-4])([1-69])([1-79])(?!\d)/.exec(name.trim());
  if (!m) return null;
  return { term: Number(m[1]), day: m[2] === "9" ? null : Number(m[2]), period: m[3] === "9" ? null : Number(m[3]) };
}

/** "333 専門…" → "3学期 水曜 3限"、"399 …" → "3学期"。読めなければ null */
export function termLabel(name: string): string | null {
  const s = readSlot(name);
  return s && [`${s.term}学期`, s.day ? `${DAYS[s.day]}曜` : "", s.period ? `${s.period}限` : ""].filter(Boolean).join(" ");
}

/** <title> "コース: 333 専門…(…) | MU-LMS" → "333 専門…(…)" */
export const nameFromTitle = (t: string): string => t.replace(/^コース:\s*/, "").replace(/\s*\|\s*MU-LMS\s*$/, "").trim();

/** 今開いているページから、コース名・shortname・先生を読む(読めなければ空) */
export function readCoursePage(doc: Document, search: string): CoursePage {
  const id = Number(new URLSearchParams(search).get("id"));
  let shortname = "";
  for (const s of doc.scripts) {
    const m = /"shortname":"([^"]+)"/.exec(s.textContent ?? "");
    if (m) { shortname = m[1]!; break; }
  }
  const teachers: Teacher[] = [];
  const head = [...doc.querySelectorAll("h4")].find((h) => h.textContent?.trim() === "コース管理者");
  for (const a of head?.parentElement?.querySelectorAll('a[href*="/user/profile.php?id="]') ?? []) {
    const uid = Number(/[?&]id=(\d+)/.exec(a.getAttribute("href") ?? "")?.[1]);
    if (uid && !teachers.some((t) => t.id === uid)) teachers.push({ id: uid, name: shortName(a.textContent ?? "") });
  }
  return { id: Number.isInteger(id) && id > 0 ? id : null, name: nameFromTitle(doc.title), shortname, teachers };
}

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

/** 状態の文字にある日付のうち一番遅いもの(ms)。時刻が無ければその日の終わり。無ければ null */
function lastDate(s: string): number | null {
  let t: number | null = null;
  for (const m of s.matchAll(/(\d{4})[年/-]\s*(\d{1,2})[月/-]\s*(\d{1,2})日?(?:[^\d]{0,12}?(\d{1,2}):(\d{2}))?/g)) {
    const at = new Date(+m[1]!, +m[2]! - 1, +m[3]!, m[4] ? +m[4] : 23, m[5] ? +m[5] : 59).getTime();
    if (t === null || at > t) t = at;
  }
  return t;
}

/** 「未提出」を含み、期日が過去なら true(期日が読めなければ false)。now は ms */
export function isLate(status: string, now: number): boolean {
  if (!status.includes("未提出")) return false;
  const d = lastDate(status);
  return d !== null && d < now;
}

/** Snap の状態の文字(「未提出2026年 10月 7日 に開始済み期日 2026年 10月 29日」)を「未提出・10/29 まで」に縮める */
export function shortStatus(status: string): string {
  const word = /^(未提出|提出済み|未受験|受験済み|完了|未完了)/.exec(status)?.[1];
  const d = lastDate(status);
  if (!word) return status;
  if (d === null) return word;
  const t = new Date(d);
  return `${word}・${t.getMonth() + 1}/${t.getDate()}${word === "提出済み" ? "" : " まで"}`;
}

type Act = { status: string; type: string | null; html: string | null };
type Page = { summary: string | null; acts: Map<string, Act> };

/** 同じオリジンの http(s) だけ通す */
function sameOrigin(u: string): string | null {
  try {
    const a = new URL(u, location.href);
    return isHttp(a.href) && a.origin === location.origin ? a.href : null;
  } catch { return null; }
}

function videosOf(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = new Set<string>();
  for (const e of doc.querySelectorAll('video source[src], video[src], a[href$=".mp4"]')) {
    const u = sameOrigin(e.getAttribute("src") ?? e.getAttribute("href") ?? "");
    if (u) out.add(u);
  }
  return [...out];
}

/** /course/section.php の HTML から、節の説明と教材ごとの情報を読む */
export function parseSectionHtml(html: string): Page {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const sum = doc.querySelector("li.section .summary");
  const summary = sum && (sum.textContent?.trim() || sum.querySelector("img")) ? sum.innerHTML : null;
  const acts = new Map<string, Act>();
  for (const li of doc.querySelectorAll("li.activity[data-id]")) {
    const icon = li.querySelector("img.activityicon")?.getAttribute("src") ?? "";
    const body = li.querySelector(".contentwithoutlink") ?? li.querySelector(".no-overflow");
    acts.set(li.getAttribute("data-id")!, {
      status: squash(li.querySelector(".snap-completion-meta")?.textContent),
      type: /\/f\/([a-z0-9]+)/i.exec(icon)?.[1]?.toUpperCase() ?? null,
      html: body ? body.innerHTML : null,
    });
  }
  return { summary, acts };
}

type RawState = {
  section: { id: number; number: number; title: string; cmlist: string[]; hassummary: boolean; visible?: boolean }[];
  cm: { id: number | string; name: string; module: string; url?: string; visible?: boolean; uservisible?: boolean }[];
};

const needsPage = (s: RawState["section"][number]): boolean => s.visible !== false && (s.cmlist.length > 0 || s.hassummary);

/** state と節ごとの HTML(読めなければ null)から画面の形にする。並び・名前・URL・種類は state が正。中身の無い節も返す */
export function composeCourse(state: RawState, pages: Record<number, string | null>): Section[] {
  const cms = new Map(state.cm.map((c) => [String(c.id), c]));
  return state.section.filter((s) => s.visible !== false).map((s) => {
    const page = pages[s.id] ? parseSectionHtml(pages[s.id]!) : null;
    const items: Item[] = [];
    for (const id of s.cmlist.map(String)) {
      const cm = cms.get(id);
      if (!cm || cm.uservisible === false || (cm.visible === false && cm.uservisible !== true)) continue;
      const act = page?.acts.get(id);
      if (cm.module === "label") {
        const videos = act?.html ? videosOf(act.html) : [];
        const html = sanitize(act?.html);
        if (!squash(html.replace(/<[^>]*>/g, "")) && !/<img/i.test(html) && !videos.length) continue;
        items.push({ id, name: cm.name, url: "", mod: "label", type: null, status: "", html, videos });
      } else {
        items.push({ id, name: cm.name, url: cm.url ?? "", mod: cm.module, type: act?.type ?? null, status: act?.status ?? "", html: null, videos: [] });
      }
    }
    return { id: s.id, title: s.title || (s.number === 0 ? "最初のページ" : `第 ${s.number} 節`), summary: page?.summary ? sanitize(page.summary) : null, items };
  });
}

/** 節と教材を取る(節の中身は並列)。セッション切れなら読み直す */
export async function loadCourse(courseId: number): Promise<Section[]> {
  const raw = await ajax<string | RawState>("core_courseformat_get_state", { courseid: courseId });
  const state: RawState = typeof raw === "string" ? JSON.parse(raw) : raw;
  const targets = state.section.filter(needsPage);
  const got = await Promise.allSettled(targets.map(async (s) => {
    const r = await fetch(`/course/section.php?id=${s.id}`, { credentials: "include" });
    if (r.url.includes("/login/")) throw new LoginRequiredError();
    if (!r.ok) throw new Error(`section ${s.id} ${r.status}`);
    return r.text();
  }));
  if (got.some((g) => g.status === "rejected" && g.reason instanceof LoginRequiredError)) location.reload();
  const pages: Record<number, string | null> = {};
  targets.forEach((s, i) => { const g = got[i]!; pages[s.id] = g.status === "fulfilled" ? g.value : null; });
  return composeCourse(state, pages);
}
