import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { NewsGroup, NewsItem } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { useToast } from "@/ui/Toast";
import { NewsDetailView } from "./NewsDetailView";
import { NewsList } from "./NewsList";
import { markAllReadSteps, toggleSteps } from "./newsSteps";
import { NewsToolbar } from "./NewsToolbar";
import { useNews, type NewsState } from "./useNews";

/** 掲示板。操作は元の画面の部品を click / set する(通信を起こすものは ajax: true) */
export function NewsScreen({ client, doc, initial, initialOpened = "" }: { client: MuscatClient; doc: Document; initial?: NewsState; initialOpened?: string }) {
  const { status, page, error, busy = false, run } = useNews(client, doc, initial);
  const { toast, node } = useToast();
  const click = (ref: string, ajax = true) => void run([{ kind: "click", ref, ajax }]);
  const markAllRead = (g: NewsGroup) => {
    const steps = page && markAllReadSteps(page, g);
    if (!steps) return;
    void run(steps).then((ok) => ok && toast(`${g.title}をすべて既読にしました`));
  };
  const flag = (it: NewsItem) => void run(toggleSteps(it.flagRef));
  // 詳細の「未読に戻す」: 一覧から開いた行そのものの既読ボタンで切り替えて保存する。
  // 件名だけで探すと、同じ件名の別の掲示を変えてしまう。前へ・次へで移った詳細は、どの行か分からないので出さない
  const [opened, setOpened] = useState(initialOpened); // initialOpened はテスト用
  const open = (ref: string) => {
    setOpened(ref);
    click(ref);
  };
  const target = page?.items.find((i) => i.openRef === opened && i.title === page.detail?.title && !i.unread && i.readRef);
  const unread = () => target && void run(toggleSteps(target.readRef));
  const firstUnread = page?.items.find((i) => i.unread && i.openRef);
  const search = (q: { keyword: string; course: string }) => {
    if (!page) return;
    const steps: DriveStep[] = [
      { kind: "set", ref: page.keywordRef, value: q.keyword },
      { kind: "set", ref: page.courseRef, value: q.course },
      { kind: "click", ref: page.searchRef, ajax: true },
    ];
    void run(steps);
  };
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorNotice title="掲示板を読み込めませんでした" message={error ?? ""} />}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          <NewsToolbar
            page={page}
            busy={busy}
            onTab={(name) => {
              const tab = page.tabs.find((t) => t.name === name);
              if (tab) click(tab.ref, false);
            }}
            onSearch={search}
          />
          <BusyOverlay busy={busy}>
            <div className={page.detail ? "grid grid-cols-1 items-start gap-3 min-[768px]:grid-cols-2" : ""}>
              <div className="flex min-w-0 flex-col gap-3">
                <div>
                  <Button variant="secondary" disabled={busy || !firstUnread} onClick={() => firstUnread && open(firstUnread.openRef)}>未読を新しい順に読む</Button>
                </div>
                <NewsList page={page} busy={busy} onOpen={open} onFlag={flag} onMarkAllRead={markAllRead} onMore={click} />
              </div>
              {page.detail && (
                // 767px 以下は詳細を全画面に重ねる
                <div className="min-w-0 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:z-40 max-[767px]:overflow-y-auto max-[767px]:bg-background max-[767px]:p-4">
                  <button
                    type="button"
                    disabled={!page.detail.closeRef}
                    className="mb-3 cursor-pointer border-0 bg-transparent px-0 py-1 text-sm text-primary min-[768px]:hidden"
                    onClick={() => click(page.detail!.closeRef, false)}
                  >
                    ‹ 掲示板
                  </button>
                  <NewsDetailView detail={page.detail} busy={busy} onClick={click} onUnread={target ? unread : undefined} />
                </div>
              )}
            </div>
          </BusyOverlay>
        </>
      )}
      {node}
    </div>
  );
}
