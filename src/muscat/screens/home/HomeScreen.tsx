import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { nativeNav } from "@/muscat/shell/nativeNav";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { CourseDrawer } from "../course/CourseDrawer";
import { NewsDetailView } from "../news/NewsDetailView";
import { NoticePanel } from "./NoticePanel";
import { daysFrom } from "./dayRows";
import { TodayPanel } from "./TodayPanel";
import { useHome, type HomeState } from "./useHome";

/** ホーム。操作は元の画面の部品を click する(通信を起こすものは ajax: true)。now・initial はテスト用 */
export function HomeScreen({ client, doc, initial, now }: { client: MuscatClient; doc: Document; initial?: HomeState; now?: Date }) {
  const { status, page, error, busy = false, run, read } = useHome(client, doc, initial);
  const [course, setCourse] = useState<string | null>(null);
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
              <TodayPanel day={page.day} timetableRef={page.timetableChangeRef} busy={busy} now={now ?? new Date()} onClick={click} onOpenCourse={setCourse} />
              <div className="flex flex-col gap-3">
                <NoticePanel title="重要なお知らせ" items={items("重要")} busy={busy} onOpen={click} badge={page.unreadKeiji} badgeDisabled={!page.keijiRef} onBadge={() => click(page.keijiRef)} />
                <NoticePanel title="期限あり" items={items("期限あり")} busy={busy} onOpen={click} />
              </div>
            </div>
          </div>
        </BusyOverlay>
      )}
      {course !== null && (
        <CourseDrawer
          key={course}
          client={client}
          course={{ title: course }}
          onClose={() => {
            setCourse(null);
            // 引き出しが裏でホームを取り直すと、サーバー側の日表示は「今日」に戻る(画面は見ていた日のまま)。
            // 「今日」を押してから、見ていた日まで送り直して揃える(実機で確認)
            const day = page?.day;
            if (!day?.nav.today) return void read();
            const diff = daysFrom(day.date, now ?? new Date());
            const step = diff > 0 ? day.nav.nextDay : day.nav.prevDay;
            void run([{ kind: "click", ref: day.nav.today, ajax: true }, ...Array.from({ length: Math.abs(diff) }, () => ({ kind: "click" as const, ref: step, ajax: true }))]);
          }}
          onNav={(label) => {
            setCourse(null);
            nativeNav(doc, label);
          }}
        />
      )}
    </div>
  );
}
