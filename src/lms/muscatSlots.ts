import { useEffect, useState } from "react";
import { parseTimetable } from "@/muscat/api/parse/timetable";
import { errorToast } from "@/ui/Toast";
import type { Timetable } from "@/muscat/api/types";

export type Placement = { term: number; day: string; periods: number[] };
/** terms は開講する学期(不定期だけの授業は slots が空) */
export type CourseSlots = { terms: number[]; slots: Placement[] };
export type SlotMap = Map<string, CourseSlots>;

const KEY = "mu-lms-slots-v2"; // v2: 年度つきのキー(前の形の保存は読まない)
const TTL = 24 * 3600 * 1000;

/** 照合のキーは「年度_授業コード」= LMS の shortname "2026_5300100047" そのもの(授業コードは年度をまたいで使い回されうる) */
export const codeOf = (shortname: string | undefined): string | null => (/^\d{4}_\d{10}$/.test(shortname ?? "") ? shortname! : null);

/** 年度_授業コードごとに、学期・曜日ごとの時限をまとめる */
export function buildSlots(tt: Timetable): SlotMap {
  const m: SlotMap = new Map();
  const of = (c: string, term: number) => {
    const code = `${tt.year}_${c}`;
    const v = m.get(code) ?? { terms: [], slots: [] };
    m.set(code, v);
    if (!v.terms.includes(term)) v.terms.push(term);
    return v;
  };
  for (const t of tt.terms) {
    for (const e of t.entries) {
      if (!e.code) continue;
      const v = of(e.code, t.term);
      let s = v.slots.find((x) => x.term === t.term && x.day === e.day);
      if (!s) v.slots.push((s = { term: t.term, day: e.day, periods: [] }));
      if (!s.periods.includes(e.period)) s.periods.push(e.period);
    }
    for (const i of t.irregular) of(i.code, t.term);
  }
  for (const v of m.values()) for (const s of v.slots) s.periods.sort((a, b) => a - b);
  return m;
}

/** 昇順の時限を、続いているまとまりに分ける([3,4,6] → [[3,4],[6]]) */
export function runs(periods: number[]): number[][] {
  const out: number[][] = [];
  for (const p of periods) {
    const last = out[out.length - 1];
    if (last && last[last.length - 1] === p - 1) last.push(p);
    else out.push([p]);
  }
  return out;
}

/** "3学期・4学期 木曜 5限"、"3学期 水曜 3・4限"。時限が無ければ学期だけ */
export function slotLabel(cs: CourseSlots): string {
  const when = [...new Set(cs.slots.map((s) => `${s.day}曜 ${s.periods.join("・")}限`))].join("、");
  return [cs.terms.map((t) => `${t}学期`).join("・"), when].filter(Boolean).join(" ");
}

type Reply = { html?: string; busy?: boolean; login?: boolean; error?: string };
type Chrome = {
  storage?: { local: { get(k: string): Promise<Record<string, unknown>>; set(o: object): Promise<void> } };
  runtime?: { sendMessage(msg: object, cb: (r?: Reply) => void): void; lastError?: { message?: string } };
};
const api = () => (globalThis as { chrome?: Chrome }).chrome;

function ask(): Promise<Reply | null> {
  return new Promise((resolve) => {
    try {
      const rt = api()?.runtime;
      if (!rt?.sendMessage) return resolve(null);
      rt.sendMessage({ type: "mu-muscat-timetable" }, (r) => resolve(rt.lastError || !r ? null : r));
    } catch {
      resolve(null);
    }
  });
}

async function load(): Promise<SlotMap | null> {
  try {
    const got = (await api()?.storage?.local.get(KEY))?.[KEY] as { at: number; map: [string, CourseSlots][] } | undefined;
    if (got && Date.now() - got.at < TTL) return new Map(got.map);
  } catch { /* 保存が読めなければ取り直す */ }
  const r = await ask();
  if (!r?.html) { // busy・未ログイン・失敗は保存しない(3 桁の読みのまま)。なぜ使えなかったかだけ残す
    miss = r?.busy ? "MUSCAT のタブを表示しているため読み込んでいません。別のタブに切り替えてから開き直すと読み込みます。"
      : r?.login === false ? "MUSCAT にログインしていないため読み込めませんでした。"
      : "読み込みに失敗しました" + (r?.error ? `(${r.error})` : "") + "。";
    missLogin = r?.login === false;
    if (!api()?.runtime?.sendMessage) miss = null; // 拡張の外(開発・テスト)では出さない
    console.info("[mu-lms] MUSCAT の時間割を使わない:", miss);
    return null;
  }
  miss = null;
  missLogin = false;
  try {
    const map = buildSlots(parseTimetable(new DOMParser().parseFromString(r.html, "text/html")));
    await api()?.storage?.local.set({ [KEY]: { at: Date.now(), map: [...map] } }).catch(() => {});
    return map;
  } catch (e) {
    console.error("[mu-lms]", e);
    miss = "時間割の画面を読み取れませんでした。";
    return null;
  }
}

let inflight: Promise<SlotMap | null> | null = null;
let miss: string | null = null;
let missLogin = false; // miss の理由が MUSCAT 未ログインのとき

/** 対応表を取れなかった理由(取れた・保存を使った・まだ取っていないときは null)と、未ログインが理由か */
export function useSlotsMiss(): { miss: string | null; login: boolean } {
  const [m, setM] = useState<{ miss: string | null; login: boolean }>({ miss: null, login: false });
  useEffect(() => { void getSlots().then(() => setM({ miss, login: missLogin })); }, []);
  return m;
}

/** 対応表を取れなかったら理由をトーストで出す(未ログインならログインへのリンク付き)。理由と未ログインかを返す。画面に ErrorToast を置くこと */
export function useSlotsMissToast(): { miss: string | null; login: boolean } {
  const m = useSlotsMiss();
  useEffect(() => {
    if (!m.miss) return;
    const msg = `${m.miss}曜日・時限はコース名から推測しています(2 コマ続きの授業などはずれることがあります)。`;
    if (m.login) errorToast("MUSCAT にログインしてください", msg, { label: "MUSCAT にログイン", href: "https://unipa.m-muscat.musashino-u.ac.jp/uprx/ShibbolethAuthServlet" });
    else errorToast("MUSCAT の時間割を使えませんでした", msg);
  }, [m]);
  return m;
}

/** MUSCAT の時間割から作った対応表。取れなければ null(呼び出し側は 3 桁の読みにフォールバック)。同時の呼び出しは 1 回にまとめる */
export function getSlots(): Promise<SlotMap | null> {
  return (inflight ??= load().finally(() => { inflight = null; }));
}

/** 対応表の取得を待たずに先に描き、取れたら描き直すためのフック。initial があれば取らない(テスト用) */
export function useSlots(initial?: SlotMap | null): SlotMap | null {
  const [slots, setSlots] = useState<SlotMap | null>(initial ?? null);
  useEffect(() => {
    if (initial === undefined) void getSlots().then(setSlots);
  }, [initial]);
  return slots;
}
