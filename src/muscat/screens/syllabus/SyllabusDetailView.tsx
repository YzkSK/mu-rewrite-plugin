import { useEffect, useRef, useState } from "react";
import type { SyllabusDetail, SyllabusDetailRow } from "@/muscat/api/types";
import { Button } from "@/ui/Button";

export const SECTIONS = ["基本情報", "授業概要と到達目標", "授業の進め方", "成績評価", "授業計画", "教科書・参考", "実務経験"] as const;

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
export function groupRows(rows: SyllabusDetailRow[]): SyllabusDetailRow[][] {
  const out: SyllabusDetailRow[][] = SECTIONS.map(() => []);
  let at = 0;
  for (const r of rows) {
    const key = r.kind === "field" ? r.label : r.kind === "section" ? r.title : "";
    at = STARTS.find(([hit]) => key && hit(key))?.[1] ?? at;
    out[at]!.push(r);
  }
  return out;
}

const dim = (s: string) => (!s || /^[－-]+$/.test(s) ? " text-muted-foreground/50" : "");
const find = (rows: SyllabusDetailRow[], label: string) => {
  const r = rows.find((x) => x.kind === "field" && x.label.startsWith(label));
  return r?.kind === "field" ? (r.values[0] ?? "") : "";
};

function Row({ row }: { row: SyllabusDetailRow }) {
  if (row.kind === "section") return <h4 className="m-0 mt-3 text-[13px] font-semibold">{row.title}</h4>;
  if (row.kind === "head") {
    return (
      <div className="grid gap-px bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground" style={{ gridTemplateColumns: `repeat(${row.cells.length}, minmax(0, 1fr))` }}>
        {row.cells.map((c, i) => <span key={i}>{c}</span>)}
      </div>
    );
  }
  if (row.kind === "cells") {
    return (
      <div className="grid gap-x-2 border-b border-border/60 px-3 py-1.5 text-[12.5px]" style={{ gridTemplateColumns: `repeat(${row.cells.length}, minmax(0, 1fr))` }}>
        {row.cells.map((c, i) => <span key={i} className={`min-w-0 whitespace-pre-line break-words${dim(c)}`}>{c || "－"}</span>)}
      </div>
    );
  }
  return (
    <dl className="m-0 grid grid-cols-[150px_minmax(0,1fr)] max-[767px]:grid-cols-1">
      <dt className="bg-muted/50 px-3 py-1.5 text-[12.5px] text-muted-foreground">{row.label}</dt>
      <dd className="m-0 flex min-w-0 flex-wrap gap-x-6 px-3 py-1.5 text-[12.5px]">
        {row.values.length === 0 && <span className="text-muted-foreground/50">－</span>}
        {/* 長い英語の氏名などが枠からはみ出さないよう折り返す */}
        {row.values.map((v, i) => <span key={i} className={`min-w-0 whitespace-pre-line break-words${dim(v)}`}>{v || "－"}</span>)}
      </dd>
    </dl>
  );
}

/** 目次と節の本文。授業の引き出しの中でも使う */
export function SyllabusDetailBody({ detail, toc = true }: { detail: SyllabusDetail; toc?: boolean }) {
  const [cur, setCur] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const groups = groupRows(detail.rows);
  const go = (i: number) => {
    setCur(i);
    body.current?.querySelector(`[data-sec="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="flex min-h-0 flex-1">
      {toc && <nav aria-label="目次" className="w-[170px] flex-none overflow-y-auto border-r border-border py-2 text-[13px] max-[767px]:hidden">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-current={cur === i || undefined}
            onClick={() => go(i)}
            className={`block w-full cursor-pointer border-0 px-4 py-1.5 text-left ${cur === i ? "bg-accent font-semibold text-primary" : "bg-transparent"}`}
          >
            {s}
          </button>
        ))}
      </nav>}
      <div ref={body} className="min-w-0 flex-1 overflow-y-auto px-5 py-4">
        {groups.map((rows, i) =>
          rows.length === 0 ? null : (
            <section key={i} data-sec={i} className="mb-6">
              <h3 className="m-0 mb-2 text-sm font-semibold">{SECTIONS[i]}</h3>
              <div className="flex flex-col gap-px">
                {rows.map((r, j) => <Row key={j} row={r} />)}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}

type Props = { detail: SyllabusDetail; busy: boolean; onNote: () => void; onPrint: () => void; onClose: () => void };

/** 科目の詳細。右から出る引き出し(上の帯の下から)。幕・Esc・✕で閉じる */
export function SyllabusDetailView({ detail, busy, onNote, onPrint, onClose }: Props) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const period = find(detail.rows, "開講期");
  const credit = find(detail.rows, "単位数");
  const meta = [detail.code, period, credit].filter(Boolean).join("　");
  return (
    <div className="fixed inset-x-0 bottom-0 top-(--bar-h) z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={detail.title} className="absolute inset-y-0 right-0 flex w-[760px] max-w-full flex-col border-l border-border bg-background">
        <div className="flex items-start gap-3 border-b border-border bg-card px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-[19px] font-bold">{detail.title}</h2>
            {meta && <p className="m-0 mt-0.5 text-[12.5px] text-muted-foreground">{meta}</p>}
          </div>
          <button
            type="button"
            disabled={busy || !detail.noteRef}
            onClick={onNote}
            className={`h-8 cursor-pointer rounded-[4px] border border-input px-3 text-[13px] disabled:cursor-default ${detail.noteOn ? "bg-accent" : "bg-card"}`}
          >
            {detail.noteOn ? "ふせんを外す" : "ふせんを貼る"}
          </button>
          <Button variant="secondary" disabled={busy || !detail.printRef} onClick={onPrint}>印刷</Button>
          <button type="button" aria-label="閉じる" onClick={onClose} className="h-8 w-8 cursor-pointer rounded-[4px] border-0 bg-transparent text-base text-muted-foreground hover:bg-muted">✕</button>
        </div>
        <SyllabusDetailBody detail={detail} />
      </aside>
    </div>
  );
}
