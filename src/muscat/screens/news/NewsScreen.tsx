import type { MuscatClient } from "@/muscat/api/client";
import { Card } from "@/ui/Card";
import { NewsDetailView } from "./NewsDetailView";
import { NewsList } from "./NewsList";
import { NewsToolbar } from "./NewsToolbar";
import { useNews, type NewsState } from "./useNews";

/** 掲示板。操作は元の画面の部品を click / set する(通信を起こすものは ajax: true) */
export function NewsScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: NewsState }) {
  const { status, page, error, busy = false, run } = useNews(client, doc, initial);
  const click = (ref: string, ajax = true) => void run([{ kind: "click", ref, ajax }]);
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !page && <Card className="p-4">読み込み中…</Card>}
      {page && (
        <>
          <NewsToolbar
            page={page}
            busy={busy}
            onTab={(name) => {
              const tab = page.tabs.find((t) => t.name === name);
              if (tab) click(tab.ref, false);
            }}
            onSearch={({ keyword, course, tab }) => {
              void (async () => {
                await run([
                  { kind: "set", ref: page.keywordRef, value: keyword },
                  { kind: "set", ref: page.courseRef, value: course },
                  { kind: "click", ref: page.searchRef, ajax: true },
                ]);
                if (!tab) return;
                // 検索で画面が差し替わると ref が変わるので、読み直した最新のタブを使う
                const t = (await client.readNews()).tabs.find((x) => x.name === tab);
                if (t) await run([{ kind: "click", ref: t.ref, ajax: false }]);
              })();
            }}
          />
          {page.detail && <NewsDetailView detail={page.detail} busy={busy} onClick={click} />}
          <NewsList page={page} busy={busy} onClick={click} />
        </>
      )}
    </div>
  );
}
