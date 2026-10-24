import type { MuscatClient } from "@/muscat/api/client";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { NewsDetailView } from "../news/NewsDetailView";
import { NoticePanel } from "./NoticePanel";
import { TodayPanel } from "./TodayPanel";
import { useHome, type HomeState } from "./useHome";

/** ホーム。操作は元の画面の部品を click する(通信を起こすものは ajax: true)。now・initial はテスト用 */
export function HomeScreen({ client, doc, initial, now }: { client: MuscatClient; doc: Document; initial?: HomeState; now?: Date }) {
  const { status, page, error, busy = false, run } = useHome(client, doc, initial);
  const click = (ref: string, ajax = true) => void run([{ kind: "click", ref, ajax }]);
  const items = (name: string) => page?.notices.find((t) => t.name === name)?.items ?? [];
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorNotice title="ホームを読み込めませんでした" message={error ?? ""} />}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <BusyOverlay busy={busy}>
          <div className="flex flex-col gap-3">
            {page.detail && <NewsDetailView detail={page.detail} busy={busy} onClick={click} />}
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              <TodayPanel day={page.day} timetableRef={page.timetableChangeRef} busy={busy} now={now ?? new Date()} onClick={click} />
              <div className="flex flex-col gap-3">
                <NoticePanel title="重要なお知らせ" items={items("重要")} busy={busy} onOpen={click} badge={page.unreadKeiji} badgeDisabled={!page.keijiRef} onBadge={() => click(page.keijiRef)} />
                <NoticePanel title="期限あり" items={items("期限あり")} busy={busy} onOpen={click} />
              </div>
            </div>
          </div>
        </BusyOverlay>
      )}
    </div>
  );
}
