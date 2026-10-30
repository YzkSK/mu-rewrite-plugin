import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconDownload, IconMinus, IconPlus, IconX } from "@tabler/icons-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PageLoading } from "@/ui/PageLoading";
import { Note } from "./parts";

type PdfJs = typeof import("./pdfjs");
let pdfjs: Promise<PdfJs> | null = null;
/** pdf.js は別のファイル(拡張の dist/lms-pdf.js)。初めて PDF を開いたときに読み込む */
const loadPdfJs = (): Promise<PdfJs> => {
  const rt = (globalThis as { chrome?: { runtime?: { getURL(p: string): string } } }).chrome?.runtime;
  // 手元のファイルへの import を残すと、1 ファイルにまとめる本体に pdf.js が入ってしまう。拡張の外では読めない
  if (!rt) return Promise.reject(new Error("拡張の外では PDF を表示できません"));
  pdfjs ??= import(/* @vite-ignore */ rt.getURL("dist/lms-pdf.js"));
  return pdfjs;
};

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** 1 ページ。見えたら(近づいたら)描く。倍率が変わったら描き直す */
function Page({ doc, n, scale, root, onSeen }: { doc: PDFDocumentProxy; n: number; scale: number; root: HTMLElement | null; onSeen: (n: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [near, setNear] = useState(n <= 2);
  useEffect(() => { void doc.getPage(n).then((p) => { const v = p.getViewport({ scale }); setSize({ w: v.width, h: v.height }); }); }, [doc, n, scale]);
  useEffect(() => {
    if (!box.current || !root) return;
    const near = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setNear(true); }, { root, rootMargin: "800px 0px" });
    const seen = new IntersectionObserver(([e]) => { if (e?.isIntersecting) onSeen(n); }, { root, threshold: 0.5 });
    near.observe(box.current);
    seen.observe(box.current);
    return () => { near.disconnect(); seen.disconnect(); };
  }, [root, n, onSeen]);
  // 同じ canvas に 2 つの描画を同時に走らせると pdf.js が失敗するので、前の描画が止まりきってから次を始める
  const last = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (!near || !canvas.current) return;
    let task: { cancel(): void } | null = null;
    let stop = false;
    const run = last.current.then(() => doc.getPage(n)).then((p) => {
      if (stop || !canvas.current) return;
      const dpr = window.devicePixelRatio || 1;
      const v = p.getViewport({ scale: scale * dpr });
      const c = canvas.current;
      c.width = Math.floor(v.width);
      c.height = Math.floor(v.height);
      const t = p.render({ canvas: c, viewport: v });
      task = t;
      return t.promise;
    }).catch((e: unknown) => {
      if ((e as { name?: string })?.name !== "RenderingCancelledException") console.error("[mu-lms]", e);
    });
    last.current = run;
    return () => { stop = true; task?.cancel(); };
  }, [doc, n, scale, near]);
  return (
    <div ref={box} data-page={n} className="mx-auto bg-white shadow-md" style={size ? { width: size.w, height: size.h } : { width: "100%", height: 400 }}>
      <canvas ref={canvas} aria-label={`${n} ページ目`} className="block h-full w-full" />
    </div>
  );
}

/**
 * PDF のプレビュー(ブラウザの PDF ビューアは使わず、pdf.js でページを描く)。元はファイルへ転送されてダウンロードが強制される
 * (forcedownload・attachment。実機で確認)ので、中身を取って描く。閉じたら取得も止める
 */
export function PdfViewer({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState<number | null>(null); // null = まだ幅に合わせていない
  const [page, setPage] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let task: ReturnType<PdfJs["getDocument"]> | null = null;
    Promise.all([fetch(url, { credentials: "include", signal: ac.signal }), loadPdfJs()])
      .then(async ([r, lib]) => {
        if (!r.ok) throw new Error(String(r.status));
        const buf = await r.arrayBuffer();
        if (ac.signal.aborted) return null;
        task = lib.getDocument({ data: new Uint8Array(buf) });
        return task.promise;
      })
      .then((d) => { if (d && !ac.signal.aborted) setDoc(d); })
      .catch((e) => { if (!ac.signal.aborted) { console.error("[mu-lms]", e); setFailed(true); } });
    return () => { ac.abort(); void task?.destroy(); }; // 閉じたら取得も描画も止める
  }, [url]);

  // 最初は 1 ページ目の幅を画面の幅に合わせる
  const fit = useCallback(() => {
    if (!doc || !scroller.current) return;
    void doc.getPage(1).then((p) => setScale(Math.min(2, (scroller.current!.clientWidth - (window.innerWidth < 768 ? 16 : 32)) / p.getViewport({ scale: 1 }).width)));
  }, [doc]);
  useEffect(() => { if (doc && scale === null) fit(); }, [doc, scale, fit]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const go = (n: number) => scroller.current?.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ block: "start" });
  const zoom = (dir: 1 | -1) => setScale((s) => {
    const cur = s ?? 1;
    return dir > 0 ? ZOOMS.find((z) => z > cur + 0.01) ?? cur : [...ZOOMS].reverse().find((z) => z < cur - 0.01) ?? cur;
  });
  const btn = "inline-flex h-8 min-w-8 max-[767px]:h-9 max-[767px]:min-w-9 cursor-pointer items-center justify-center rounded-[4px] border border-border bg-card px-2 text-[13px] text-foreground hover:bg-muted disabled:cursor-default disabled:opacity-50";
  const pages = doc?.numPages ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[rgb(34_27_43/.55)] p-4 max-[767px]:p-0" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`${name} のプレビュー`} className="mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-[4px] bg-card shadow-lg max-[767px]:rounded-none">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 max-[767px]:flex-nowrap max-[767px]:px-2">
          <h2 className="m-0 min-w-0 flex-1 text-sm font-semibold [overflow-wrap:anywhere] max-[767px]:truncate max-[767px]:px-2">{name}</h2>
          {/* 狭い画面は文字をやめてアイコンだけ */}
          <a className={btn} href={url} aria-label="ダウンロード"><span className="max-[767px]:hidden">ダウンロード</span><IconDownload size={18} className="min-[768px]:hidden" /></a>
          <button type="button" className={btn} onClick={onClose} aria-label="閉じる"><span className="max-[767px]:hidden">閉じる</span><IconX size={18} className="min-[768px]:hidden" /></button>
        </div>
        {doc ? (
          // 狭い画面はページ送りと拡大縮小を画面下の 1 段に回す
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted px-4 py-1.5 text-[13px] max-[767px]:order-last max-[767px]:justify-center max-[767px]:border-b-0 max-[767px]:border-t max-[767px]:px-2">
            <button type="button" className={btn} aria-label="前のページ" disabled={page <= 1} onClick={() => go(page - 1)}><IconChevronLeft size={18} /></button>
            <span className="min-w-16 text-center tabular-nums">{`${page} / ${pages}`}</span>
            <button type="button" className={btn} aria-label="次のページ" disabled={page >= pages} onClick={() => go(page + 1)}><IconChevronRight size={18} /></button>
            <span className="mx-2 h-5 w-px bg-border" />
            <button type="button" className={btn} aria-label="縮小" onClick={() => zoom(-1)}><IconMinus size={18} /></button>
            <span className="min-w-12 text-center tabular-nums">{`${Math.round((scale ?? 1) * 100)}%`}</span>
            <button type="button" className={btn} aria-label="拡大" onClick={() => zoom(1)}><IconPlus size={18} /></button>
            <button type="button" className={`${btn} max-[767px]:hidden`} onClick={fit}>幅に合わせる</button>
          </div>
        ) : null}
        <div ref={(el) => { scroller.current = el; setRoot(el); }} className="min-h-0 flex-1 overflow-auto bg-[#E7E4EB] p-4 max-[767px]:p-2">
          {failed ? <Note>プレビューを読み込めませんでした。「ダウンロード」から開いてください</Note>
            : !doc || scale === null ? <PageLoading title={name} />
            : (
              <div className="flex flex-col gap-4">
                {Array.from({ length: pages }, (_, i) => <Page key={i + 1} doc={doc} n={i + 1} scale={scale} root={root} onSeen={setPage} />)}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
