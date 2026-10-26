import { useEffect, useRef, useState } from "react";
import type { InfoPage } from "@/muscat/api/types";
import { InfoGrid } from "./InfoGrid";
import { InfoTableView } from "./InfoTableView";

type Props = {
  page: InfoPage;
  /** 左に節の目次を出す(押すとその節へ動く)。link は目次の下に置く別画面への移動 */
  toc?: boolean;
  link?: { label: string; onSelect: () => void };
};

/** 節ごとのカード(見出しの帯 + 項目の表)。節が多い画面は目次付き */
export function InfoSections({ page, toc = false, link }: Props) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  // スクロールに合わせて、画面の上のほうに見えている節を目次で示す
  useEffect(() => {
    if (!toc) return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target, e.isIntersecting);
        const first = refs.current.findIndex((el) => el && seen.get(el));
        if (first >= 0) setActive(first);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    for (const el of refs.current) if (el) io.observe(el);
    // 最後の節は短く、一番下まで動かしても上のほうに来ないので、末尾が見えたら最後の節にする
    const end = new IntersectionObserver(([e]) => e?.isIntersecting && setActive(page.sections.length - 1));
    if (endRef.current) end.observe(endRef.current);
    return () => {
      io.disconnect();
      end.disconnect();
    };
  }, [toc, page]);
  const jump = (i: number) => {
    setActive(i);
    refs.current[i]?.scrollIntoView({ block: "start" });
  };
  return (
    // 折り返さず本文を縮める(折り返すと中くらいの幅で目次だけが上の段に残った)
    <div className="flex items-start gap-4">
      {toc && (
        <nav aria-label="節" className="sticky top-4 flex flex-[0_0_190px] flex-col overflow-hidden rounded-[4px] border border-border bg-card text-[13px] max-sm:hidden">
          {page.sections.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-current={active === i ? "true" : undefined}
              onClick={() => jump(i)}
              className={`cursor-pointer border-0 border-b border-[#F0EEF2] px-3 py-2 text-left ${active === i ? "bg-accent font-semibold text-primary shadow-[inset_3px_0_0_var(--primary)]" : "bg-transparent hover:bg-muted"}`}
            >
              {s.title}
            </button>
          ))}
          {link && (
            <button type="button" onClick={link.onSelect} className="cursor-pointer border-0 bg-transparent px-3 py-2 text-left font-semibold text-primary hover:bg-muted">
              {link.label}
            </button>
          )}
        </nav>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        {page.sections.map((s, i) => (
          <section key={i} ref={(el) => void (refs.current[i] = el)} className="scroll-mt-4 rounded-[4px] border border-border bg-card">
            <h2 className="m-0 border-b border-border bg-muted px-3.5 py-2 text-sm font-semibold">{s.title}</h2>
            <div className="flex gap-4 p-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {s.grids.length === 0 && s.tables.length === 0 ? (
                  <p className="m-0 text-[13px] text-muted-foreground">情報はありません</p>
                ) : (
                  <>
                    {s.grids.map((g, j) => <InfoGrid key={`g${j}`} grid={g} />)}
                    {s.tables.map((t, j) => <InfoTableView key={`t${j}`} table={t} />)}
                  </>
                )}
              </div>
              {/* 顔写真は最初の節(学生基本情報)の右 */}
              {i === 0 && page.photo && <img src={page.photo} alt="顔写真" className="h-[140px] w-28 flex-none border border-border object-cover max-sm:hidden" />}
            </div>
          </section>
        ))}
        {/* 狭い画面は目次を隠すので、別画面への移動は本文の下に出す */}
        {link && (
          <button type="button" onClick={link.onSelect} className="h-11 cursor-pointer rounded-[4px] border border-border bg-card px-3.5 text-left text-[13.5px] font-semibold text-primary hover:bg-muted sm:hidden">
            {link.label}
          </button>
        )}
        <div ref={endRef} aria-hidden="true" className="h-px" />
      </div>
    </div>
  );
}
