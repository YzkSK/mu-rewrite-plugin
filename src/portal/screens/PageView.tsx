import { IconFileText } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import { Spin } from "@/ui/Spin";
import { fetchCalendar, fetchInfo, type InfoList } from "../api";
import { isPersonal, linkRows } from "../data";
import { isDupFileLink, isSoleCabinet, reword, sectionize, type Section } from "../lib/blocks";
import { fileKind, findBlocks, fmtWhen, infoQuery, type Block, type CalEvent } from "../lib/lib";
import { isHttp, sanitize } from "../lib/sanitize";
import { navigate, NOTICES_URL } from "../route";
import { AcademicCalendar } from "./AcademicCalendar";
import { Cabinet } from "./Cabinet";
import { InfoRow } from "./InfoRow";

type Ctx = { titles: Block[]; fileUuids: Set<string> };

const RICH = "[overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_p]:my-1";
const SUB = "m-0 text-[13.5px] font-bold text-primary-dark";
const html = (h: string) => ({ __html: sanitize(h) });
const text = (h: string) => new DOMParser().parseFromString(h, "text/html").body.textContent?.trim() ?? "";
const px = (v: unknown) => (typeof v === "string" && /^\d+(\.\d+)?px$/.test(v) ? v : "");

function Note({ children }: { children: ReactNode }) {
  return <p className="m-0 px-4 py-3 text-[13px] text-muted-foreground">{children}</p>;
}

function ListBlock({ items, ordered }: { items: any[]; ordered: boolean }) {
  const flat = items.every((it) => it && !(it.items && it.items.length));
  const short = (n: number) => items.every((it) => text(it?.content ?? "").length <= n);
  if (flat && ordered && short(40)) {
    return (
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2 p-0">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 rounded-[4px] border border-border px-3 py-2 text-[13px]">
            <span className="flex-none font-bold text-primary">{i + 1}</span>
            <span className={RICH} dangerouslySetInnerHTML={html(it?.content ?? "")} />
          </li>
        ))}
      </ol>
    );
  }
  const Tag = ordered ? "ol" : "ul";
  const cls = `m-0 pl-5 text-[13px] leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`;
  if (flat && !ordered && short(60)) {
    return (
      <ul className={`${cls} grid grid-cols-1 gap-x-6 min-[640px]:grid-cols-2`}>
        {items.map((it, i) => <li key={i} className={RICH} dangerouslySetInnerHTML={html(it?.content ?? "")} />)}
      </ul>
    );
  }
  return (
    <Tag className={cls}>
      {items.map((it, i) => (
        <li key={i}>
          <span className={RICH} dangerouslySetInnerHTML={html(it?.content ?? "")} />
          {it?.items?.length ? <ListBlock items={it.items} ordered={ordered} /> : null}
        </li>
      ))}
    </Tag>
  );
}

function Files({ run }: { run: Record<string, any>[] }) {
  const rows = run.flatMap((d) => {
    const f = d.file ?? {};
    const uuid = f.uuid || d.media_uuid;
    return uuid ? [{ uuid: String(uuid), name: String(f.name || f.file_name || ""), mime: f.mime_type as string | undefined }] : [];
  });
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-[4px] border border-border">
      {rows.map((r, i) => (
        <a key={i} className="flex items-center gap-3 border-t border-border px-3 py-2 text-[13px] text-foreground no-underline first:border-t-0 hover:bg-muted" href={"/api/file/view/" + encodeURIComponent(r.uuid)} target="_blank" rel="noopener noreferrer">
          <IconFileText className="size-4.5 flex-none text-muted-foreground" />
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{r.name}</span>
          <span className="flex-none text-[12px] text-muted-foreground">{fileKind(r.mime)}</span>
        </a>
      ))}
    </div>
  );
}

const sameOrigin = (s: unknown): s is string => {
  try { return typeof s === "string" && new URL(s, location.href).origin === location.origin; } catch { return false; }
};

function Images({ run }: { run: Record<string, any>[] }) {
  const ok = run.filter((d) => sameOrigin(d.source));
  if (!ok.length) return null;
  const one = ok.length === 1;
  return (
    <div className="flex flex-wrap items-start gap-3">
      {ok.map((d, i) => {
        const img = (
          <img
            src={d.source}
            alt=""
            className={one ? "h-auto max-w-full" : "max-h-[220px] w-auto max-w-full"}
            style={one && px(d.width) ? { maxWidth: `min(100%, ${d.width})` } : undefined}
          />
        );
        return typeof d.link === "string" && d.link && isHttp(d.link)
          ? <a key={i} href={d.link} target="_blank" rel="noopener noreferrer">{img}</a>
          : <span key={i}>{img}</span>;
      })}
    </div>
  );
}

function NotificationBox({ data }: { data: Record<string, any> }) {
  const [list, setList] = useState<InfoList | null | undefined>(undefined); // undefined は読み込み中、null は失敗
  const personal = isPersonal(data.header);
  const cat = Array.isArray(data.categories) ? data.categories[0] : undefined;
  useEffect(() => {
    let live = true;
    fetchInfo(infoQuery({ ...data, itemNumber: data.itemNumber ?? 5 }))
      .then((l) => live && setList(l))
      .catch((e) => { console.error("[mu-portal]", e); if (live) setList(null); });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const now = new Date();
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2">
        <h3 className="m-0 text-[13.5px] font-semibold">{data.header || "お知らせ"}</h3>
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline" onClick={() => navigate(NOTICES_URL + (cat ? "&category=" + encodeURIComponent(cat) : ""))}>すべて見る</button>
      </div>
      {list === undefined ? <div className="grid place-items-center py-4"><Spin /></div>
        : list === null ? <Note>読み込めませんでした</Note>
        : !list.items.length ? <Note>配信されているお知らせはありません</Note>
        : (
          <ul className="m-0 list-none p-0">
            {list.items.map((it) => (
              <InfoRow key={it.uuid} it={it} now={now} unreadDot={!personal}
                sub={personal ? [it.publish_from, fmtWhen(it.publish_start_at, now)].filter(Boolean).join("、") : [it.category?.name, it.publish_from].filter(Boolean).join("、")} />
            ))}
          </ul>
        )}
    </section>
  );
}

/** 学年暦。今月分を取ってから出す(AcademicCalendar は初回データ前提) */
function CalendarBlock({ data }: { data: Record<string, any> }) {
  const sources: string[] = data.sources ?? [];
  const addOutLook = !!data.addOutLook;
  const [first, setFirst] = useState<CalEvent[] | null | undefined>(undefined);
  useEffect(() => {
    const n = new Date();
    fetchCalendar(sources, addOutLook, n.getFullYear(), n.getMonth() + 1).then(setFirst).catch((e) => { console.error("[mu-portal]", e); setFirst(null); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (first === undefined) return <div className="grid place-items-center py-6"><Spin className="size-6" /></div>;
  return <AcademicCalendar data={{ header: data.header || "学年暦", sources, addOutLook, first }} load={(y, m) => fetchCalendar(sources, addOutLook, y, m)} />;
}

function LinkBox({ data }: { data: Record<string, any> }) {
  const rows = linkRows(data);
  if (!rows.length) return null;
  return (
    <div>
      {data.header ? <div className="mb-1 text-[12px] text-muted-foreground">{data.header}</div> : null}
      <div className="flex flex-wrap gap-2">
        {rows.map((r, i) => (
          <a key={i} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-border bg-card px-3 text-[13px] text-foreground no-underline hover:bg-muted" href={r.href} target="_blank" rel="noopener noreferrer">
            {r.text}
            <span className="text-[11px] text-muted-foreground">外部</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** ブロック列を描く。連続する file / image は 1 つの箱にまとめる */
function Blocks({ list, ctx }: { list: Block[]; ctx: Ctx }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i]!;
    const d = b.data ?? {};
    if (b.type === "file" || b.type === "image") {
      const run = [d];
      while (list[i + 1]?.type === b.type) run.push(list[++i]!.data ?? {});
      out.push(b.type === "file" ? <Files key={i} run={run} /> : <Images key={i} run={run} />);
      continue;
    }
    switch (b.type) {
      case "title":
        out.push(<h3 key={i} id={"mu-h-" + ctx.titles.indexOf(b)} className={SUB} dangerouslySetInnerHTML={html(reword(d.text))} />);
        break;
      case "paragraph": {
        if (isDupFileLink(d.text, ctx.fileUuids)) break;
        const h = reword(d.text);
        const t = text(h);
        if (t.startsWith("・") && t.length <= 40) out.push(<h3 key={i} className={SUB}>{t.slice(1).trim()}</h3>);
        else if (t || /<img/i.test(h)) out.push(<div key={i} className={`text-[13.5px] leading-relaxed ${RICH}`} dangerouslySetInnerHTML={html(h)} />);
        break;
      }
      case "list": out.push(<ListBlock key={i} items={d.items ?? []} ordered={d.style === "ordered"} />); break;
      case "column":
        out.push(
          <div key={i} className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {(d.cols ?? []).map((c: { blocks?: Block[] }, j: number) => (
              <div key={j} className="flex min-w-0 flex-col gap-2"><Blocks list={c.blocks ?? []} ctx={ctx} /></div>
            ))}
          </div>,
        );
        break;
      case "divider": out.push(<hr key={i} className="m-0 border-0 border-t border-border" />); break;
      case "notification": out.push(<NotificationBox key={i} data={d} />); break;
      case "linkBox": out.push(<LinkBox key={i} data={d} />); break;
      case "callout": out.push(<div key={i} role="note" className={`rounded-[4px] border border-border bg-muted p-3 text-[13px] ${RICH}`} dangerouslySetInnerHTML={html(reword(d.text))} />); break;
      case "calendar": out.push(<CalendarBlock key={i} data={d} />); break;
      case "fileShare": if (typeof d.folderUuid === "string") out.push(<Cabinet key={i} data={d} />); break;
      // toc は左の見出しが目次の代わり。未知のブロックは PageScreen が先に弾く
    }
  }
  return <>{out}</>;
}

function SectionRow({ s, ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="grid grid-cols-1 gap-x-7 gap-y-2 border-t border-border px-6 py-[18px] first:border-t-0 min-[640px]:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      {s.head
        ? <h2 id={"mu-h-" + ctx.titles.indexOf(s.head)} className="m-0 text-[15px] font-bold text-primary-dark [overflow-wrap:anywhere]" dangerouslySetInnerHTML={html(reword(s.head.data?.text))} />
        : null}
      {/* 見出しの無い節(お知らせの欄など)は左の列も使う */}
      <div className={`flex min-w-0 flex-col gap-2 ${s.head ? "" : "col-span-full"}`}><Blocks list={s.blocks} ctx={ctx} /></div>
    </section>
  );
}

/** 通常のページ。見出しと本文を 1 枚の白いシートに「節ごとの行」で並べる */
export function PageView({ title, blocks }: { title: string; blocks: Block[] }) {
  const ctx: Ctx = {
    titles: findBlocks(blocks, "title"),
    fileUuids: new Set(findBlocks(blocks, "file").map((b) => b.data?.file?.uuid).filter((u): u is string => typeof u === "string")),
  };
  const { lead, sections } = sectionize(blocks, title);
  return (
    <div className="px-7 pt-5 pb-10">
      <h1 className="m-0 mb-3 text-[22px] font-bold">{title}</h1>
      {isSoleCabinet(blocks) ? <Blocks list={blocks.filter((b) => b.type === "fileShare")} ctx={ctx} /> : (
        <>
          {lead.filter((p) => text(reword(p.data?.text))).map((p, i) => <div key={i} className={`mb-3 max-w-[76ch] text-[13.5px] leading-relaxed text-muted-foreground ${RICH}`} dangerouslySetInnerHTML={html(reword(p.data?.text))} />)}
          {sections.length ? (
            <div className="max-w-[1100px] overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
              {sections.map((s, i) => <SectionRow key={i} s={s} ctx={ctx} />)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
