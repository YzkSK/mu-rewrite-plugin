import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { CourseDrawer } from "../course/CourseDrawer";
import { NewsDetailView } from "../news/NewsDetailView";
import { rememberUnread } from "../news/unreadCount";
import { useBackClose } from "../useBackClose";
import { HomeCalendar } from "./HomeCalendar";
import { NoticePanel } from "./NoticePanel";
import { TodayPanel } from "./TodayPanel";
import { useHome, type HomeState } from "./useHome";

/** ホーム。操作は元の画面の部品を press する。now・initial はテスト用 */
export function HomeScreen({ client, doc, initial, now }: { client: MuscatClient; doc: Document; initial?: HomeState; now?: Date }) {
  const { status, page, error, busy = false, run, read, retry } = useHome(client, initial);
  const [course, setCourse] = useState<string | null>(null);
  const [month, setMonth] = useState(false); // 月のカレンダーを出しているか
  const click = (ref: string) => {
    const nav = page?.day?.nav;
    const fail = nav && Object.values(nav).includes(ref) ? "日付を移れませんでした" : ref === page?.timetableChangeRef ? "時間割を開けませんでした" : ref === page?.keijiRef ? "掲示板を開けませんでした" : "お知らせを開けませんでした";
    void run((c) => c.press(ref), undefined, fail);
  };
  if (page?.unreadKeiji != null) rememberUnread(page.unreadKeiji); // 掲示板の未読ボタンも同じ数にする
  const closeCourse = () => {
    setCourse(null);
    // 引き出しが裏でホームを取り直すと、サーバー側の日表示は「今日」に戻る(画面は見ていた日のまま)。
    // 「今日」を押してから、見ていた日まで送り直して揃える(実機で確認)
    const day = page?.day;
    if (!day?.nav.today) return void read();
    void run((c) => c.home.showDay(day.date, now), undefined, "日付を移れませんでした");
  };
  useBackClose(course !== null, closeCourse); // ブラウザの戻るでも引き出しを閉じる
  const detailClose = page?.detail?.closeRef;
  useBackClose(!!page?.detail, () => detailClose && click(detailClose)); // お知らせの詳細も同じ
  const items = (name: string) => page?.notices.find((t) => t.name === name)?.items ?? [];
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorNotice title="ホームを読み込めませんでした" message={error ?? ""} onRetry={() => void retry()} />}
      {status === "loading" && !page && <PageLoading />}
      {page && month && <HomeCalendar client={client} today={now} onBack={() => setMonth(false)} />}
      {page && !month && (
        <BusyOverlay busy={busy}>
          <div className="flex flex-col gap-3">
            {page.detail && <NewsDetailView detail={page.detail} busy={busy} onClick={click} />}
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              <TodayPanel day={page.day} timetableRef={page.timetableChangeRef} busy={busy} now={now ?? new Date()} onClick={click} onOpenCourse={setCourse} onCalendar={() => setMonth(true)} />
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
          onClose={closeCourse}
          onNav={(label) => {
            setCourse(null);
            void client.navigate(label).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
