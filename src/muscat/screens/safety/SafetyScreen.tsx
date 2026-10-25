import type { MuscatClient } from "@/muscat/api/client";
import { ErrorCard } from "@/ui/ErrorCard";
import { PageLoading } from "@/ui/PageLoading";
import { GenericSections } from "../generic/GenericSections";
import { useLivePage, type LiveState } from "../generic/useLivePage";

/** 元のページに「対象のデータが存在しません。」しか無いか(回答が必要な安否確認が無いとき。実機で確認) */
export function nothingToAnswer(doc: Document): boolean {
  const form = doc.getElementById("funcForm");
  return !!form && /対象のデータが存在しません/.test(form.textContent ?? "") && !form.querySelector('input:not([type="hidden"]), select, textarea, button, table');
}

/**
 * 安否確認回答。回答が必要なものが無いときは、その旨をカードに出す。
 * あるときの元の画面はまだ見られていないので、カードの中に汎用の画面で出す
 */
export function SafetyScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState }) {
  const { status, page, error, run } = useLivePage(client, initial);
  return (
    <div className="flex w-full max-w-[980px] flex-col gap-3.5 p-4">
      {status === "error" && <ErrorCard>{error}</ErrorCard>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <section className="rounded-[4px] border border-border bg-card">
          <h2 className="m-0 border-b border-border bg-muted px-3.5 py-2 text-sm font-semibold">安否確認回答一覧</h2>
          {nothingToAnswer(doc) ? (
            <div className="flex flex-col items-center gap-1.5 px-5 py-10 text-center">
              <b className="text-[15px]">回答が必要な安否確認はありません</b>
              <span className="text-[13px] text-muted-foreground">災害などで大学から確認が届くと、ここに一覧が出ます。</span>
            </div>
          ) : (
            <div className="p-3.5">
              <GenericSections blocks={page.blocks} run={(steps) => void run(steps)} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
