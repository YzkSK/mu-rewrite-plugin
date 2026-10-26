import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SyllabusDetail, SyllabusDetailRow } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { SECTIONS, shapeSyllabus, type Book, type Shaped } from "./shapeSyllabus";

const dim = (s: string) => (!s || /^[－ー-]+$/.test(s) ? " text-muted-foreground/50" : "");

/** 決まりに当てはまらない行の汎用表示(空でない文字を捨てないため) */
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

const Rest = ({ rows }: { rows: SyllabusDetailRow[] }) =>
  rows.length > 0 ? <div className="mt-3 flex flex-col gap-px">{rows.map((r, j) => <Row key={j} row={r} />)}</div> : null;

const H3 = ({ children, small }: { children: ReactNode; small?: string }) => (
  <h3 className="m-0 mb-2.5 flex items-baseline gap-2 text-[14.5px] font-bold">
    {children}
    {small && <small className="text-xs font-normal text-muted-foreground">{small}</small>}
  </h3>
);
const H4 = ({ children }: { children: ReactNode }) => <h4 className="m-0 mb-1.5 mt-3.5 text-[12.5px] font-semibold tracking-[.02em] text-muted-foreground">{children}</h4>;
const Omit = ({ children }: { children: ReactNode }) => <div className="mt-1.5 text-xs text-[#a39cab]">{children}</div>;
const Picked = ({ items }: { items: { label: string; note?: string }[] }) => (
  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
    {items.map((p, i) => (
      <li key={i} className="flex items-baseline gap-2">
        <span aria-hidden className="flex-none font-bold text-primary">○</span>
        <span className="min-w-0 break-words">
          {p.label}
          {p.note && <span className="ml-1.5 text-[12.5px] text-muted-foreground">{p.note}</span>}
        </span>
      </li>
    ))}
  </ul>
);

function BookList({ books }: { books: Book[] }) {
  return (
    <ul className="m-0 list-none border-t border-[#ece9ef] p-0">
      {books.map((b, i) => (
        <li key={i} className="min-w-0 border-b border-[#ece9ef] py-2">
          {b.title && <div className="break-words text-[13.5px] font-semibold">{b.title}</div>}
          {b.by.length > 0 && <div className="break-words text-[12.5px] text-muted-foreground">{b.by.join(" ・ ")}</div>}
          {b.remark && <div className="mt-0.5 whitespace-pre-line break-words text-[12.5px]">{b.remark}</div>}
        </li>
      ))}
    </ul>
  );
}

const BAR = ["bg-primary", "bg-[#8a5cb3]", "bg-[#c9b5dc]"];
const bar = (i: number) => BAR[Math.min(i, BAR.length - 1)]!;

type Ctx = { s: Shaped; drawer: boolean };

function BasicBody({ s, drawer }: Ctx) {
  const { items, omitted } = s.basic;
  return (
    <>
      <dl className={`m-0 grid border-t border-[#ece9ef] ${drawer ? "grid-cols-1" : "grid-cols-2 gap-x-6 max-[820px]:grid-cols-1"}`}>
        {items.map((it) => (
          <div key={it.label} className={`grid grid-cols-[112px_minmax(0,1fr)] gap-2.5 border-b border-[#ece9ef] py-[7px]${it.value.length > 24 ? " col-span-full" : ""}`}>
            <dt className="text-[12.5px] text-muted-foreground">{it.label}</dt>
            <dd className="m-0 min-w-0 whitespace-pre-line break-words text-[13px]">{it.value}</dd>
          </div>
        ))}
      </dl>
      {omitted.length > 0 && <Omit>記載のない項目 {omitted.length} 件（{omitted.join("・")}）は省略</Omit>}
    </>
  );
}

function GoalBody({ s, drawer }: Ctx) {
  const { summary, goals, omitted } = s.goal;
  return (
    <>
      {summary && <p className="m-0 max-w-[68ch] whitespace-pre-line text-[13.5px]">{summary}</p>}
      {goals.length > 0 && (
        <dl className={`m-0 mt-2.5 grid text-[13px] ${drawer ? "grid-cols-1" : "grid-cols-[9.5em_minmax(0,1fr)] gap-x-3 gap-y-1"}`}>
          {goals.map((g) => (
            <div key={g.label} className="contents">
              <dt className="text-[12.5px] text-muted-foreground">{g.label}</dt>
              <dd className={`m-0 whitespace-pre-line${drawer ? " mb-2" : ""}`}>{g.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {omitted > 0 && <Omit>記載のない到達目標 {omitted} 件は省略</Omit>}
    </>
  );
}

function WayBody({ s }: Ctx) {
  const { checks, study } = s.way;
  return (
    <>
      {checks.map((c, i) => (
        <div key={i}>
          <H4>{c.title}</H4>
          {c.picked.length > 0 && <Picked items={c.picked} />}
          {c.notPicked.length > 0 && <div className="mt-1 text-xs text-[#a39cab]">該当なし: {c.notPicked.join("／")}</div>}
        </div>
      ))}
      {study.length > 0 && (
        <div className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-1.5">
          {study.map((t, i) => (
            <div key={i} className="contents">
              <div className="col-span-full mt-1.5 text-xs text-muted-foreground">{t.label}</div>
              {t.minutes !== null && (
                <div className="whitespace-nowrap text-lg font-bold tabular-nums">
                  {t.lead && <small className="mr-1 text-xs font-normal text-muted-foreground">{t.lead}</small>}
                  {t.minutes}
                  <small className="ml-0.5 text-xs font-normal text-muted-foreground">分</small>
                </div>
              )}
              {t.text && <p className={`m-0 whitespace-pre-line text-[13px]${t.minutes === null ? " col-span-full" : ""}`}>{t.text}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GradeBody({ s }: Ctx) {
  const { items, zero, note } = s.grade;
  const cell = "border-b border-[#ece9ef] py-[7px] align-baseline";
  return (
    <>
      {items.length > 0 && (
        <div role="img" aria-label={items.map((e) => `${e.name} ${e.percent}%`).join("、")} className="mb-2.5 mt-0.5 flex h-2.5 overflow-hidden rounded-[2px] bg-muted">
          {items.map((e, i) => <span key={i} className={`block h-full ${bar(i)}${i > 0 ? " border-l-2 border-card" : ""}`} style={{ width: `${e.percent}%` }} />)}
        </div>
      )}
      {(items.length > 0 || zero.length > 0) && (
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {items.map((e, i) => (
              <tr key={i}>
                <td className={`${cell} w-[9.5em] pr-2.5`}>
                  <i className={`mr-1.5 inline-block size-[9px] rounded-[2px] ${bar(i)}`} />
                  {e.name}
                </td>
                <td className={`${cell} w-[3.6em] pr-3.5 text-right font-bold tabular-nums`}>{e.percent}%</td>
                <td className={`${cell} whitespace-pre-line text-[12.5px] text-muted-foreground`}>{e.detail}</td>
              </tr>
            ))}
            {/* 0% の項目は薄くして 1 行にまとめる */}
            {zero.length > 0 && (
              <tr className="text-[#a39cab]">
                <td className={`${cell} w-[9.5em] whitespace-normal break-words pr-2.5`}>{zero.map((e) => e.name).join("・")}</td>
                <td className={`${cell} w-[3.6em] pr-3.5 text-right tabular-nums`}>0%</td>
                <td className={`${cell} whitespace-pre-line text-[12.5px]`}>{zero.map((e) => e.detail).filter(Boolean).join("\n")}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {note && (
        <p className="m-0 mt-2 whitespace-pre-line text-[13px]">
          <span className="mr-2 text-xs text-muted-foreground">備考</span>
          {note}
        </p>
      )}
    </>
  );
}

function PlanBody({ s }: Ctx) {
  const { lessons, caution } = s.plan;
  return (
    <>
      {lessons.length > 0 && (
        <ol className="m-0 list-none border-t border-[#ece9ef] p-0">
          {lessons.map((l, i) => (
            <li key={i} className="grid grid-cols-[4.2em_minmax(0,1fr)] gap-2.5 border-b border-[#ece9ef] py-[7px] text-[13px]">
              <span className="text-[12.5px] tabular-nums text-muted-foreground">{`第${l.n}回`}</span>
              <span className="min-w-0 break-words">
                {l.heading && <b className="font-semibold">{l.heading}</b>}
                <span className={`block whitespace-pre-line${l.heading ? " text-[12.5px] text-muted-foreground" : ""}`}>{l.body}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {caution && (
        <p className="m-0 mt-2 whitespace-pre-line text-[13px]">
          <span className="mr-2 text-xs text-muted-foreground">留意事項</span>
          {caution}
        </p>
      )}
    </>
  );
}

function BooksBody({ s }: Ctx) {
  const { hasTextbookHead, textbooks, refs, notes, urls } = s.books;
  return (
    <>
      {(hasTextbookHead || notes.length > 0) && (
        <div className="flex items-baseline gap-2.5 rounded-[4px] bg-muted px-2.5 py-2 text-[13px]">
          <span className="flex-none rounded-[3px] border border-[#c9b5dc] bg-card px-1.5 text-[11.5px] font-semibold text-primary">教科書</span>
          <span className="min-w-0 whitespace-pre-line break-words">
            {hasTextbookHead && <b className="font-semibold">{textbooks.length ? "購入が必要" : "購入不要"}</b>}
            {notes.map((n, i) => <span key={i} className="block">{n}</span>)}
          </span>
        </div>
      )}
      {textbooks.length > 0 && (
        <>
          <H4>教科書 {textbooks.length}冊</H4>
          <BookList books={textbooks} />
        </>
      )}
      {refs.length > 0 && (
        <>
          <H4>参考図書 {refs.length}冊</H4>
          <BookList books={refs} />
        </>
      )}
      {urls.length > 0 && (
        <>
          <H4>参考URL</H4>
          <ul className="m-0 list-none border-t border-[#ece9ef] p-0">
            {urls.map((u, i) => (
              <li key={i} className="min-w-0 border-b border-[#ece9ef] py-2 text-[13px]">
                {u.name && <div className="break-words font-semibold">{u.name}</div>}
                {u.url && <div className="break-all text-[12.5px] text-primary">{u.url}</div>}
                {u.note && <div className="whitespace-pre-line text-[12.5px] text-muted-foreground">{u.note}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function WorkBody({ s }: Ctx) {
  const { kinds, texts } = s.work;
  const on = kinds.filter((k) => k.on);
  return (
    <div className="flex flex-col gap-2.5 text-[13px]">
      {texts.map((t, i) => (
        <div key={i}>
          <div className="text-xs text-muted-foreground">{t.label}</div>
          <p className="m-0 mt-0.5 whitespace-pre-line">{t.text}</p>
        </div>
      ))}
      {on.length > 0 && <Picked items={on} />}
      {kinds.length > 0 && on.length === 0 && <div className="text-xs text-[#a39cab]">実務経験のある教員による授業（a〜c）は、いずれも対象外</div>}
    </div>
  );
}

const BODIES = [BasicBody, GoalBody, WayBody, GradeBody, PlanBody, BooksBody, WorkBody];
const ORDER = { site: [0, 1, 2, 3, 4, 5, 6], drawer: [0, 3, 5, 4, 2, 1, 6] };

/** 見出しの下の meta(授業コード・開講期・曜日時限・単位・キャンパス) */
/** code=false は、授業コードを上の行に出している引き出し用(2 回出さない) */
export function SyllabusMeta({ detail, code = true }: { detail: SyllabusDetail; code?: boolean }) {
  const { meta } = useMemo(() => shapeSyllabus(detail.rows), [detail.rows]);
  const rest = [meta.slots, meta.credit, meta.campus].filter(Boolean);
  return (
    <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] tabular-nums text-muted-foreground">
      {code && detail.code && <span>{detail.code}</span>}
      {meta.term && <b className="font-medium text-foreground">{meta.term}</b>}
      {rest.map((m) => <span key={m}>{m}</span>)}
    </div>
  );
}

type BodyProps = { detail: SyllabusDetail; toc?: boolean; order?: "site" | "drawer" };

/** 目次と節の本文。授業の引き出しの中でも使う */
export function SyllabusDetailBody({ detail, toc = true, order = "site" }: BodyProps) {
  const body = useRef<HTMLDivElement>(null);
  const s = useMemo(() => shapeSyllabus(detail.rows), [detail.rows]);
  const drawer = order === "drawer";
  const shown = ORDER[order].filter((i) => s.has[i]);
  // 目次の印は、出している最初の節から(基本情報が無い授業で、出していない節に印を付けない)
  const [picked, setCur] = useState<number | null>(null);
  const cur = picked !== null && shown.includes(picked) ? picked : (shown[0] ?? 0);
  // 目次を押して動かしている間は、スクロールで印を書き換えない(末尾の短い節を押すと、最後の節に印が移ってしまう)
  const jumping = useRef(0);
  const go = (i: number) => {
    setCur(i);
    jumping.current = Date.now() + 800;
    body.current?.querySelector(`[data-sec="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  /** 本文のスクロールに目次の印を合わせる: 上端を越えた最後の節。いちばん下まで来たら最後の節 */
  const follow = () => {
    const el = body.current;
    if (!el || Date.now() < jumping.current) return;
    const secs = [...el.querySelectorAll<HTMLElement>("[data-sec]")];
    const top = el.getBoundingClientRect().top + 24;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    const hit = atEnd ? secs.at(-1) : secs.filter((s) => s.getBoundingClientRect().top <= top).at(-1) ?? secs[0];
    if (hit) setCur(Number(hit.dataset.sec));
  };
  return (
    <div className="flex min-h-0 flex-1">
      {toc && <nav aria-label="目次" className="w-[150px] flex-none overflow-y-auto border-r border-[#ece9ef] py-2.5 text-[13px] max-[767px]:hidden">
        {SECTIONS.map((t, i) => (
          <button
            key={t}
            type="button"
            disabled={!s.has[i]}
            aria-current={cur === i || undefined}
            onClick={() => go(i)}
            className={`block w-full cursor-pointer border-0 px-4 py-[5px] text-left disabled:cursor-default ${cur === i ? "bg-accent font-semibold text-primary shadow-[inset_2px_0_0_#541b86]" : "bg-transparent"} ${s.has[i] ? "" : "text-[#a39cab]"}`}
          >
            {t}
          </button>
        ))}
      </nav>}
      <div
        ref={body}
        onScroll={toc ? follow : undefined}
        // 利用者が自分で動かし始めたら、目次を押した直後でも追従に戻す
        onWheel={() => void (jumping.current = 0)}
        onTouchStart={() => void (jumping.current = 0)}
        onKeyDown={() => void (jumping.current = 0)}
        className={`min-w-0 flex-1 overflow-y-auto pb-7 pt-1 ${drawer ? "px-4" : "px-[22px]"}`}>
        {shown.map((i, k) => {
          const Content = BODIES[i]!;
          return (
            <section key={i} data-sec={i} className={`pt-[18px] ${k > 0 ? "mt-[18px] border-t border-[#ece9ef]" : ""}`}>
              <H3 small={i === 4 && s.plan.lessons.length ? `全${s.plan.lessons.length}回` : undefined}>{SECTIONS[i]}</H3>
              <Content s={s} drawer={drawer} />
              <Rest rows={s.rest[i]!} />
            </section>
          );
        })}
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
  return (
    <div className="fixed inset-x-0 bottom-0 top-(--bar-h) z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={detail.title} className="absolute inset-y-0 right-0 flex w-[760px] max-w-full flex-col border-l border-border bg-background">
        <div className="flex items-start gap-3 border-b border-border bg-card px-5 pb-3.5 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-[19px] font-bold leading-snug">{detail.title}</h2>
            <SyllabusMeta detail={detail} />
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
