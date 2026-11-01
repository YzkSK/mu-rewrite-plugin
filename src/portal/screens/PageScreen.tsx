import { useEffect, useState } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { loadPage, type PageData } from "../data";
import { isSupported } from "../lib/blocks";
import { openOriginal } from "../route";
import { PageView } from "./PageView";

export type PageState = { loading: true } | { error: true; retry: () => void } | { page: PageData };

/** slug のページを取る(null なら何もしない)。別の slug の結果は読み込み中として扱う */
export function usePage(slug: string | null): PageState {
  const [st, setSt] = useState<{ slug: string; page?: PageData } | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (slug === null) return;
    let live = true;
    loadPage(slug)
      .then((page) => live && setSt({ slug, page }))
      .catch((e) => { console.error("[mu-portal]", e); if (live) setSt({ slug }); });
    return () => { live = false; };
  }, [slug, tries]);
  if (!st || st.slug !== slug) return { loading: true };
  return st.page ? { page: st.page } : { error: true, retry: () => { setSt(null); setTries(tries + 1); } };
}

export function PageScreen({ slug, state }: { slug: string; state: PageState }) {
  if ("loading" in state) return <PageLoading title={slug} />;
  if ("error" in state) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="" onRetry={state.retry} /></div>;
  if (!isSupported(state.page.blocks)) {
    return (
      <div className="px-7 pt-5 pb-10 text-[13.5px] max-[767px]:px-4">
        <h1 className="m-0 mb-3 text-[22px] font-bold">{state.page.title}</h1>
        <p className="m-0 mb-2">このページはまだ対応していません</p>
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-primary underline" onClick={() => openOriginal(slug)}>元の画面で開く</button>
      </div>
    );
  }
  return <PageView title={state.page.title} blocks={state.page.blocks} />;
}
