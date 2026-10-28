import { useCallback, useEffect, useRef, useState } from "react";
import { courseName } from "@/portal/lib/lms";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { LoginRequiredError } from "./api";
import { isLate, loadCourse, shortStatus, termLabel, type CoursePage, type Item, type Section } from "./course";
import { codeOf, slotLabel, useSlots, type SlotMap } from "./muscatSlots";
import { Box, Note, Row } from "./parts";
import { PdfViewer } from "./PdfViewer";

const TAG: Record<string, string> = { assign: "課題", quiz: "小テスト", resource: "ファイル", lti: "動画", url: "リンク", forum: "フォーラム", page: "ページ", folder: "フォルダ" };
const PURPLE = new Set(["assign", "quiz"]);
// ラベルの本文は外部由来の HTML(sanitize 済み)。見た目だけ最低限そろえる
const PROSE = "px-4 py-3 text-[13.5px] [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_p]:my-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_:is(h1,h2,h3,h4,h5,h6)]:my-2 [&_:is(h1,h2,h3,h4,h5,h6)]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_pre]:overflow-x-auto [&_code]:font-mono";


function ItemRow({ it, now }: { it: Item; now: number }) {
  const late = isLate(it.status, now);
  const [preview, setPreview] = useState(false);
  const closePreview = useCallback(() => setPreview(false), []);
  const isPdf = it.mod === "resource" && it.type === "PDF" && !!it.url;
  return (
    <Row>
      <span className={`h-fit w-[4.5rem] flex-none rounded-[3px] px-1 text-center text-[11px] leading-[18px] ${PURPLE.has(it.mod) ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{TAG[it.mod] ?? it.mod}</span>
      <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">
        {it.url
          // PDF は押したらプレビュー(修飾キー付きは元どおりブラウザに任せる)
          ? <a className="text-foreground hover:underline" href={it.url} onClick={isPdf ? (e) => { if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); setPreview(true); } : undefined}>{it.name}</a>
          : it.name}
        {preview ? <PdfViewer name={it.name} url={it.url} onClose={closePreview} /> : null}
        {it.type ? <small className="ml-1.5 text-[11px] text-muted-foreground">{it.type}</small> : null}
      </span>
      {it.status ? <span className={`h-fit max-w-[45%] flex-none text-right text-[12px] ${late ? "font-bold text-error" : "text-muted-foreground"}`}>{shortStatus(it.status)}</span> : null}
    </Row>
  );
}

/** 動画ファイルの名前(URL の最後の部分) */
const fileName = (url: string): string => { try { return decodeURIComponent(new URL(url, location.href).pathname.split("/").pop() ?? url); } catch { return url; } };

/** ラベルに貼られた mp4。ほかの教材と同じ 1 行にして、押したときだけその場で再生の枠を開く */
function VideoRow({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-border last:border-b-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-muted">
        <span className="h-fit w-[4.5rem] flex-none rounded-[3px] border border-border px-1 text-center text-[11px] leading-[18px] text-muted-foreground">動画</span>
        <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">{fileName(src)}</span>
        <span className="flex-none text-[12px] text-primary">{open ? "閉じる" : "再生"}</span>
      </button>
      {open ? <video controls autoPlay preload="metadata" src={src} className="mx-4 mb-3 max-w-[calc(100%-2rem)]" /> : null}
    </li>
  );
}

/** ラベルの本文に、動画のリンクのほかに文があるか(動画だけのラベルは本文を出さない) */
const hasText = (html: string, videos: string[]): boolean => {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  // 動画へのリンク・動画の要素そのものを除いてから、残りに文か画像があるかを見る(リンクの文字は「動画はこちら」などのこともある)
  body.querySelectorAll("a[href], video, source").forEach((e) => {
    const u = e.getAttribute("href") ?? e.getAttribute("src");
    if (e.tagName !== "A" || (u && videos.some((v) => v.endsWith(u) || u.endsWith(fileName(v))))) e.remove();
  });
  return (body.textContent ?? "").trim().length > 0 || !!body.querySelector("img");
};

function SectionCard({ s, now, open, onToggle, refFn }: { s: Section; now: number; open: boolean; onToggle: () => void; refFn: (el: HTMLElement | null) => void }) {
  return (
    <div ref={refFn} className="scroll-mt-4">
      <Box
        title={s.title}
        actions={
          <button type="button" aria-expanded={open} onClick={onToggle} className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground">
            {`${s.items.length} 件`}
            <span className="text-primary">{open ? "閉じる" : "開く"}</span>
          </button>
        }
      >
        {open ? <>
        {s.summary ? <div className={`${PROSE} border-b border-border`} dangerouslySetInnerHTML={{ __html: s.summary }} /> : null}
        <ul className="m-0 list-none p-0">
          {s.items.flatMap((it) => it.html !== null
            ? [
              ...(it.videos.length && !hasText(it.html, it.videos) ? [] : [<li key={it.id} className={`${PROSE} border-b border-border last:border-b-0`} dangerouslySetInnerHTML={{ __html: it.html }} />]),
              ...it.videos.map((v) => <VideoRow key={`${it.id}-${v}`} src={v} />),
            ]
            : [<ItemRow key={it.id} it={it} now={now} />])}
        </ul>
        </> : null}
      </Box>
    </div>
  );
}

/** 閉じた節(コースごとにブラウザに覚える) */
function useClosed(courseId: number | null) {
  const key = `mu-lms-closed:${courseId}`;
  const [closed, setClosed] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as number[]); } catch { return new Set(); }
  });
  const set = (next: Set<number>) => {
    setClosed(next);
    try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* 覚えられなくても開閉はできる */ }
  };
  return {
    closed,
    toggle: (id: number) => { const n = new Set(closed); if (!n.delete(id)) n.add(id); set(n); },
    open: (id: number) => { if (closed.has(id)) { const n = new Set(closed); n.delete(id); set(n); } },
  };
}

type Props = { page: CoursePage; initial?: Section[]; now?: Date; initialSlots?: SlotMap | null };

/** コースの画面。左に目次、中央に全部の節、右に先生(狭い幅では目次を出さず、中央→先生の順に縦積み)。見出しの学期・曜日・時限は MUSCAT の対応表が届いたら描き直す */
export function CourseScreen({ page, initial, now = new Date(), initialSlots }: Props) {
  const slots = useSlots(initialSlots);
  const [sections, setSections] = useState<Section[] | null>(initial ?? null);
  const [failed, setFailed] = useState(page.id === null);
  const load = useCallback(() => {
    if (page.id === null) return;
    setSections(null);
    setFailed(false);
    loadCourse(page.id).then(setSections, (e) => { if (e instanceof LoginRequiredError) location.reload(); else { console.error("[mu-lms]", e); setFailed(true); } });
  }, [page.id]);
  useEffect(() => { if (!initial) load(); }, [initial, load]);
  const refs = useRef<Record<number, HTMLElement | null>>({});
  const fold = useClosed(page.id);

  const code = codeOf(page.shortname);
  const found = code ? slots?.get(code) : undefined;
  const term = found ? slotLabel(found) : termLabel(page.name);
  const sub = [term, page.shortname].filter(Boolean).join("、");
  const ms = now.getTime();

  const head = (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="min-w-0">
        {sub ? <p className="m-0 text-[12px] text-muted-foreground">{sub}</p> : null}
        <h1 className="m-0 text-lg font-semibold [overflow-wrap:anywhere]">{courseName(page.name)}</h1>
      </div>    </div>
  );

  if (failed) return <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4">{head}<ErrorNotice title="読み込めませんでした" message="コースの内容を取得できませんでした。" onRetry={page.id === null ? undefined : load} /></div>;
  if (!sections) return <PageLoading title={courseName(page.name) || "コース"} />;

  const filled = sections.filter((s) => s.items.length || s.summary);
  const empty = sections.filter((s) => !(s.items.length || s.summary));
  // 目次から飛んだ節は開く
  const go = (id: number) => { fold.open(id); refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-start gap-4 p-4">
      {head}
      <nav aria-label="目次" className="sticky top-4 hidden w-[180px] flex-none min-[1000px]:block">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {filled.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => go(s.id)} className="flex w-full items-baseline justify-between gap-2 rounded-[3px] px-2 py-1 text-left text-[12.5px] hover:bg-muted">
                <span className="min-w-0 [overflow-wrap:anywhere]">{s.title}</span>
                <span className="flex-none text-muted-foreground">{s.items.length}</span>
              </button>
            </li>
          ))}
        </ul>
        {empty.length ? <p className="m-0 px-2 pt-2 text-[12px] text-muted-foreground">{`空: ${empty.map((s) => s.title).join("・")}`}</p> : null}
      </nav>
      <div className="flex w-full min-w-0 flex-col gap-4 min-[1000px]:w-auto min-[1000px]:flex-1">
        {filled.length ? filled.map((s) => <SectionCard key={s.id} s={s} now={ms} open={!fold.closed.has(s.id)} onToggle={() => fold.toggle(s.id)} refFn={(el) => { refs.current[s.id] = el; }} />) : <Box title="内容"><Note>このコースにはまだ内容がありません</Note></Box>}
      </div>
      <div className="w-full flex-none min-[1000px]:w-[240px]">
        <Box title="先生">
          {page.teachers.length
            ? (
              <ul className="m-0 list-none p-0">
                {page.teachers.map((t) => (
                  <Row key={t.id}>
                    <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">{t.name}</span>
                    <a className="flex-none text-[12.5px] text-primary hover:underline" href={`/message/index.php?id=${t.id}`}>メッセージ</a>
                  </Row>
                ))}
              </ul>
            )
            : <Note>先生の情報がありません</Note>}
        </Box>
      </div>
    </div>
  );
}
