import type { SyllabusDetailRow } from "@/muscat/api/types";

type Row = SyllabusDetailRow;
type Field = Extract<Row, { kind: "field" }>;

export const SECTIONS = ["基本情報", "概要と到達目標", "授業の進め方", "成績評価", "授業計画", "教科書・参考", "実務経験"] as const;

/** この項目から節が替わる(当てはまらない行は直前の節に入れる) */
const STARTS: [(key: string) => boolean, number][] = [
  [(k) => k.startsWith("授業概要"), 1],
  [(k) => k.includes("アクティブな知"), 2],
  [(k) => k.startsWith("成績評価"), 3],
  [(k) => k === "授業計画", 4],
  [(k) => k.startsWith("教科書"), 5],
  [(k) => k.startsWith("実務経験"), 6],
];

/** 行を節ごとに分ける。head は項目名を持たないので、直前の節に入る */
export function groupRows(rows: Row[]): Row[][] {
  const out: Row[][] = SECTIONS.map(() => []);
  let at = 0;
  for (const r of rows) {
    const key = r.kind === "field" ? r.label : r.kind === "section" ? r.title : "";
    at = STARTS.find(([hit]) => key && hit(key))?.[1] ?? at;
    out[at]!.push(r);
  }
  return out;
}

export type Kv = { label: string; value: string };
export type Check = { title: string; picked: { label: string; note: string }[]; notPicked: string[] };
export type Study = { label: "予習" | "復習"; minutes: number | null; lead: string; text: string };
export type Evaluation = { name: string; percent: number; detail: string };
export type Lesson = { n: number; heading: string; body: string };
export type Book = { title: string; by: string[]; remark: string };
export type RefUrl = { name: string; url: string; note: string };

export type Shaped = {
  meta: { term: string; slots: string; credit: string; campus: string };
  basic: { items: Kv[]; omitted: string[] };
  goal: { summary: string; goals: { label: string; text: string }[]; omitted: number };
  way: { checks: Check[]; study: Study[] };
  grade: { items: Evaluation[]; zero: Evaluation[]; note: string };
  plan: { lessons: Lesson[]; caution: string };
  books: { hasTextbookHead: boolean; textbooks: Book[]; refs: Book[]; notes: string[]; urls: RefUrl[] };
  work: { kinds: { label: string; on: boolean }[]; texts: { label: string; text: string }[] };
  /** 各節で当てはまらなかった行 */
  rest: Row[][];
  /** 各節に出す中身があるか(SECTIONS と同じ並び) */
  has: boolean[];
};

const DASH = /^[－ー-]+$/;
/** 空、または「－」「ー」「-」だけ */
export const blank = (s: string | undefined) => {
  const t = (s ?? "").trim();
  return !t || DASH.test(t);
};
const vals = (r: Field) => r.values.filter((v) => !blank(v));
const text = (r: Field) => vals(r).join("\n");
const num = (s: string) => s.normalize("NFKC");

/** 「火曜2限、火曜3限」→「火2・火3」。縮められなければそのまま */
function shortSlots(s: string): string {
  const ms = s.split(/[、,，]/).map((p) => /^\s*([月火水木金土日])曜?(\d+)限\s*$/.exec(num(p)));
  return ms.length > 0 && ms.every(Boolean) ? ms.map((m) => m![1]! + m![2]!).join("・") : s;
}

const RENAME: [string, string][] = [["授業の実施形態", "実施形態"], ["開講キャンパス", "キャンパス"], ["科目番号", "科目番号"]];

function basic(rows: Row[], rest: Row[]) {
  const items: Kv[] = [];
  const omitted: string[] = [];
  const add = (label: string, value: string) => (value ? items.push({ label, value }) : omitted.push(label));
  for (const r of rows) {
    if (r.kind !== "field") rest.push(r);
    else if (r.label.startsWith("授業コード")) continue;
    else if (r.label.startsWith("開講期")) {
      const [term = "", slots = "", ...room] = r.values.map((v) => (blank(v) ? "" : v));
      add("開講期・時限", [term, slots].filter(Boolean).join("\n"));
      add("教室", room.filter(Boolean).join("\n"));
    } else add(RENAME.find(([from]) => r.label.startsWith(from))?.[1] ?? r.label, text(r));
  }
  return { items, omitted };
}

function goal(rows: Row[], rest: Row[]) {
  let summary = "";
  const goals: Shaped["goal"]["goals"] = [];
  let omitted = 0;
  for (const r of rows) {
    if (r.kind !== "field") rest.push(r);
    else if (r.label.startsWith("授業概要")) summary = [summary, text(r)].filter(Boolean).join("\n");
    else {
      const m = /^(.+)の到達目標$/.exec(r.label);
      if (!m) rest.push(r);
      else if (blank(text(r))) omitted++;
      else goals.push({ label: m[1]!, text: text(r) });
    }
  }
  return { summary, goals, omitted };
}

/** 「授業における「アクティブな知」の要素」→「「アクティブな知」の要素」、「…「ICTの活用」について」→「ICTの活用」 */
const shortTitle = (t: string) => t.replace(/^授業における/, "").replace(/について$/, "").replace(/^「([^」]*)」$/, "$1");

function way(rows: Row[], rest: Row[]) {
  const checks: Check[] = [];
  const study: Study[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const next = rows[i + 1];
    if (r.kind === "section" && /^[予復]習/.test(r.title)) {
      const label = r.title.startsWith("予") ? "予習" : "復習";
      while (rows[i + 1]?.kind === "field") {
        const f = rows[++i] as Field;
        const [first = "", ...others] = f.values;
        const m = /\d+(?:\.\d+)?/.exec(num(first));
        const t = (m ? others : f.values).filter((v) => !blank(v) && v.trim() !== "分").join("\n");
        if (m || t) study.push({ label, minutes: m ? Number(m[0]) : null, lead: m ? num(first).replace(m[0], "").trim() : "", text: t });
      }
    } else if (r.kind === "section" && next?.kind === "head" && next.cells[next.cells.length - 1] === "対象") {
      const c: Check = { title: shortTitle(r.title), picked: [], notPicked: [] };
      i++;
      while (rows[i + 1]?.kind === "field") {
        const f = rows[++i] as Field;
        const last = (f.values[f.values.length - 1] ?? "").trim();
        const notes = f.values.slice(0, -1).filter((v) => !blank(v) && v.trim() !== "○");
        if (last === "○") c.picked.push({ label: f.label, note: notes.join("　") });
        else if (blank(last) && notes.length === 0) c.notPicked.push(f.label);
        else rest.push(f); // 末尾が ○ でも ー でもない項目は、汎用の表示で残す
      }
      checks.push(c);
    } else rest.push(r);
  }
  return { checks, study };
}

function grade(rows: Row[], rest: Row[]) {
  const all: Evaluation[] = [];
  let note = "";
  for (const r of rows) {
    if (r.kind === "section" && r.title.startsWith("成績評価")) continue;
    if (r.kind === "head" && r.cells.some((c) => c.includes("割合"))) continue;
    if (r.kind === "cells" && r.cells.length >= 2 && !Number.isNaN(parseFloat(num(r.cells[1]!)))) {
      all.push({ name: r.cells[0]!, percent: parseFloat(num(r.cells[1]!)), detail: r.cells.slice(2).filter((c) => !blank(c)).join("\n") });
    } else if (r.kind === "field" && r.label.startsWith("成績評価")) note = text(r);
    else rest.push(r);
  }
  const items = all.filter((e) => e.percent > 0).sort((a, b) => b.percent - a.percent);
  return { items, zero: all.filter((e) => e.percent <= 0), note };
}

function plan(rows: Row[], rest: Row[]) {
  const lessons: Lesson[] = [];
  let caution = "";
  for (const r of rows) {
    if (r.kind === "section" && r.title === "授業計画") continue;
    if (r.kind === "head" && r.cells[0]?.includes("授業回")) continue;
    const m = r.kind === "field" ? /^第\s*([0-9０-９]+)\s*回/.exec(r.label) : null;
    if (r.kind === "field" && m) {
      const lines = text(r).split("\n").map((l) => l.trim()).filter(Boolean);
      // 1 行だけでも「第１章：見出し 本文」の形なら、最初の空白までを章の見出しにする(実機の授業計画で確認)
      const chapter = lines.length === 1 ? /^(第[0-9０-９]+章[：:][^\s　]+)[\s　]+(.+)$/.exec(lines[0]!) : null;
      if (chapter) lessons.push({ n: Number(num(m[1]!)), heading: chapter[1]!, body: chapter[2]! });
      else if (lines.length) lessons.push({ n: Number(num(m[1]!)), heading: lines.length > 1 ? lines[0]! : "", body: lines.length > 1 ? lines.slice(1).join("\n") : lines[0]! });
    } else if (r.kind === "field" && r.label.startsWith("留意事項")) caution = text(r);
    else rest.push(r);
  }
  return { lessons, caution };
}

function books(rows: Row[], rest: Row[]) {
  const out: Shaped["books"] = { hasTextbookHead: false, textbooks: [], refs: [], notes: [], urls: [] };
  let mode: "" | "text" | "ref" | "url" = "";
  let cols: string[] = [];
  const cur: { url: RefUrl | null } = { url: null };
  const flush = () => {
    const u = cur.url;
    if (u && (u.name || u.url || u.note)) out.urls.push(u);
    cur.url = null;
  };
  for (const r of rows) {
    if (r.kind === "section") {
      flush();
      if (/^\d+[.．]?$/.test(num(r.title).trim())) {
        mode = "url";
        cur.url = { name: "", url: "", note: "" };
      } else if (r.title.startsWith("教科書")) {
        mode = "text";
        cols = [];
        out.hasTextbookHead = true;
      } else if (r.title.startsWith("参考図書")) {
        mode = "ref";
        cols = [];
      } else if (r.title.startsWith("参考URL")) mode = "url";
      else {
        mode = "";
        rest.push(r);
      }
    } else if (r.kind === "head" && (mode === "text" || mode === "ref")) cols = r.cells;
    else if (r.kind === "cells" && (mode === "text" || mode === "ref") && cols.length) {
      const b: Book = { title: "", by: [], remark: "" };
      r.cells.forEach((c, j) => {
        const n = cols[j] ?? "";
        if (blank(c)) return;
        if (n.includes("書名")) b.title = c;
        else if (n.includes("備考")) b.remark = c;
        else b.by.push(n.includes("ISBN") ? `ISBN ${c}` : c);
      });
      if (b.title || b.by.length || b.remark) (mode === "text" ? out.textbooks : out.refs).push(b);
    } else if (r.kind === "field" && r.label.startsWith("その他")) {
      if (text(r)) out.notes.push(text(r));
    } else if (r.kind === "field" && mode === "url" && cur.url && /連絡|サイト名|^URL$/i.test(r.label)) {
      const key = r.label.includes("連絡") ? "note" : r.label.includes("サイト名") ? "name" : "url";
      cur.url[key] = text(r);
    } else rest.push(r);
  }
  flush();
  return out;
}

function work(rows: Row[], rest: Row[]) {
  const kinds: { label: string; on: boolean }[] = [];
  const texts: { label: string; text: string }[] = [];
  // 見出し(section)とその下の本文(cells)。本文が無かった見出しは rest に回す
  const st: { pending: Extract<Row, { kind: "section" }> | null; used: boolean } = { pending: null, used: false };
  const flush = () => {
    if (st.pending && !st.used) rest.push(st.pending);
    st.pending = null;
  };
  rows.forEach((r, i) => {
    const next = rows[i + 1];
    if (r.kind === "section") {
      flush();
      // 種別の表の見出し(… | 対象)は項目名だけなので出さない
      if (next?.kind === "head" && next.cells[next.cells.length - 1] === "対象") return;
      st.pending = r;
      st.used = false;
    } else if (r.kind === "head") {
      if (rows[i - 1]?.kind === "section" && r.cells[r.cells.length - 1] === "対象") return;
      flush();
      rest.push(r);
    } else if (r.kind === "cells") {
      const t = r.cells.filter((c) => !blank(c)).join("\n");
      st.used = true;
      if (!st.pending && t) rest.push(r);
      else if (st.pending && t) texts.push({ label: st.pending.title, text: t });
    } else {
      flush();
      if (/^[a-zａ-ｚ][．.]/i.test(r.label)) {
        kinds.push({ label: r.label, on: r.values.some((v) => v.trim() === "○") });
        const others = r.values.filter((v) => !blank(v) && v.trim() !== "○");
        if (others.length) rest.push({ kind: "field", label: r.label, values: others });
      } else rest.push(r);
    }
  });
  flush();
  return { kinds, texts };
}

const keep = (r: Row) => (r.kind === "field" ? r.values.some((v) => !blank(v)) : r.kind === "cells" ? r.cells.some((c) => !blank(c)) : true);

export function shapeSyllabus(rows: Row[]): Shaped {
  const g = groupRows(rows);
  const rest: Row[][] = SECTIONS.map(() => []);
  const period = rows.find((r): r is Field => r.kind === "field" && r.label.startsWith("開講期"));
  const one = (label: string) => {
    const f = rows.find((r): r is Field => r.kind === "field" && r.label.startsWith(label));
    return f ? text(f).split("\n")[0] ?? "" : "";
  };
  const s: Omit<Shaped, "rest" | "has"> = {
    meta: {
      term: blank(period?.values[0]) ? "" : period!.values[0]!.trim(),
      slots: blank(period?.values[1]) ? "" : shortSlots(period!.values[1]!.trim()),
      credit: one("単位数"),
      campus: one("開講キャンパス"),
    },
    basic: basic(g[0]!, rest[0]!),
    goal: goal(g[1]!, rest[1]!),
    way: way(g[2]!, rest[2]!),
    grade: grade(g[3]!, rest[3]!),
    plan: plan(g[4]!, rest[4]!),
    books: books(g[5]!, rest[5]!),
    work: work(g[6]!, rest[6]!),
  };
  const kept = rest.map((rs) => rs.filter(keep));
  const has = [
    s.basic.items.length > 0,
    !!s.goal.summary || s.goal.goals.length > 0,
    s.way.checks.some((c) => c.picked.length + c.notPicked.length > 0) || s.way.study.length > 0,
    s.grade.items.length + s.grade.zero.length > 0 || !!s.grade.note,
    s.plan.lessons.length > 0 || !!s.plan.caution,
    s.books.hasTextbookHead || s.books.refs.length > 0 || s.books.notes.length > 0 || s.books.urls.length > 0,
    s.work.kinds.length > 0 || s.work.texts.length > 0,
  ].map((b, i) => b || kept[i]!.length > 0);
  return { ...s, rest: kept, has };
}
