import type { MuscatClient } from "@/muscat/api/client";
import { Card } from "@/ui/Card";
import { NewsDetailView } from "../news/NewsDetailView";
import { HomeInfo } from "./HomeInfo";
import { HomeNotices } from "./HomeNotices";
import { TodayLessons } from "./TodayLessons";
import { useHome, type HomeState } from "./useHome";

/** ホーム。操作は元の画面の部品を click する(通信を起こすものは ajax: true)。now・initial はテスト用 */
export function HomeScreen({ client, doc, initial, now }: { client: MuscatClient; doc: Document; initial?: HomeState; now?: Date }) {
  const { status, page, error, busy = false, run } = useHome(client, doc, initial);
  const click = (ref: string, ajax = true) => void run([{ kind: "click", ref, ajax }]);
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ホーム</h1>
          <p className="text-sm text-muted-foreground">今日の授業と、未読のお知らせをひと目で。</p>
        </div>
        {page && <HomeInfo unread={page.unreadKeiji} disabled={busy} keijiRef={page.keijiRef} timetableRef={page.timetableChangeRef} onKeiji={() => click(page.keijiRef)} onTimetable={() => click(page.timetableChangeRef)} />}
      </div>
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !page && <Card className="p-4">読み込み中…</Card>}
      {page?.detail && <NewsDetailView detail={page.detail} busy={busy} onClick={click} />}
      {page && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <HomeNotices tabs={page.notices} busy={busy} onTab={(ref) => click(ref, false)} onOpen={click} />
          <TodayLessons lessons={page.lessons} now={now ?? new Date()} />
        </div>
      )}
    </div>
  );
}
