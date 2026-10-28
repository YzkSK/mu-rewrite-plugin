import { useEffect, useRef, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { NewsGroup, NewsItem } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { useToast } from "@/ui/Toast";
import { NewsDetailView } from "./NewsDetailView";
import { NewsList } from "./NewsList";
import { canMarkAllRead } from "./newsSteps";
import { NewsToolbar } from "./NewsToolbar";
import { addUnread } from "./unreadCount";
import { useNews, type NewsState } from "./useNews";
import { useBackClose } from "../useBackClose";

const MORE = "__more__";

/** 掲示板。操作は元の画面の部品を click / set する(通信を起こすものは ajax: true) */
export function NewsScreen({ client, initial, initialOpened = "", initialReading = false }: { client: MuscatClient; doc?: Document; initial?: NewsState; initialOpened?: string; initialReading?: boolean }) {
  const { status, page, error, busy = false, run, retry } = useNews(client, initial);
  const { toast, node } = useToast();
  const click = (ref: string, fail = "掲示を開けませんでした") => void run((c) => c.press(ref), undefined, fail);
  // 元のページに未読の総数は無いので、覚えた数を操作に合わせて減らす。開いても一覧はすぐ既読にならないので、同じ掲示は 1 回だけ数える
  // 数えた掲示は、元の一覧が書き換わる前でも一覧では既読として見せる
  const counted = useRef(new Set<string>());
  const [, redraw] = useState(0);
  const keyOf = (i: NewsItem) => `${i.title}|${i.source}|${i.date}`; // ref は行が描き直されると替わるので使わない(実機で確認)。shortcut: 件名・差出人・日付が全部同じ掲示は見分けられない。起きたら行の並びも鍵に足す
  const readOnce = (items: NewsItem[]) => {
    const fresh = items.filter((i) => !counted.current.has(keyOf(i)));
    for (const i of fresh) counted.current.add(keyOf(i));
    if (fresh.length) addUnread(-fresh.length);
    redraw((n) => n + 1);
  };
  const asSeen = (i: NewsItem): NewsItem => (i.unread && counted.current.has(keyOf(i)) ? { ...i, unread: false } : i);
  // タブの切り替えは通信せず、読み込んだ時の一覧を出すだけなので(実機で確認)、「未読」タブでは読んだ掲示を外す
  const onUnreadTab = page?.tabs.find((t) => t.selected)?.name === "未読";
  const seenItems = (items: NewsItem[]) => (onUnreadTab ? items.filter((i) => asSeen(i) === i) : items.map(asSeen));
  const listItems = page ? seenItems(page.items) : [];
  const listPage = page && { ...page, items: listItems, empty: page.empty || (onUnreadTab && !listItems.length), groups: page.groups?.map((g) => ({ ...g, items: seenItems(g.items) })) ?? null };
  // 詳細に出たら既読になる(一覧から開いても、前へ・次へで移っても)。件名が一致する未読が 1 件だけのときに数える
  const shown = page?.detail?.title;
  useEffect(() => {
    const hit = page?.items.filter((i) => i.title === shown) ?? [];
    if (shown && hit.length === 1 && hit[0]!.unread) readOnce(hit);
  }, [shown]); // 詳細が替わった時だけ数える
  const markAllRead = (g: NewsGroup) => {
    if (!page || !g.items.some((i) => i.unread) || !canMarkAllRead(page, g)) return;
    void run((c) => c.news.markAllRead(g.title), undefined, "すべて既読にできませんでした").then((ok) => {
      if (!ok) return;
      readOnce(g.items.filter((i) => i.unread));
      toast(`${g.title}をすべて既読にしました`);
    });
  };
  const flag = (it: NewsItem) => void run((c) => c.press(it.flagRef), undefined, "フラグを変えられませんでした");
  const [opened, setOpened] = useState(initialOpened); // initialOpened はテスト用
  // 元の✕は、拡張が元のダイアログを隠しているため効かないことがある(行から開き直した後など。実機で確認)。閉じた掲示はこちらで出さない
  const [dismissed, setDismissed] = useState("");
  const closeDetail = () => {
    if (!page?.detail) return;
    setDismissed(page.detail.title);
    click(page.detail.closeRef, "掲示を閉じられませんでした");
  };
  const open = (ref: string) => {
    setDismissed("");
    setOpened(ref);
    click(ref);
  };
  // 行の既読・未読の切り替え(元のサイトと同じく一覧の行で。詳細の中には無い)
  // it は一覧に見せている行。読んで既読に見せている行は、元の行がまだ未読なので、元のボタンを 2 回押して未読に戻す
  // (1 回目で行が描き直されて ref が替わるので、読み直して 2 回目を押す)
  const toggleRead = async (it: NewsItem) => {
    const key = keyOf(it);
    const nativeUnread = page?.items.find((i) => keyOf(i) === key)?.unread ?? it.unread;
    const fail = "既読・未読を変えられませんでした";
    let ok = await run((c) => c.press(it.readRef), undefined, fail);
    if (ok && !it.unread && nativeUnread) {
      const again = (await client.news.read().catch(() => null))?.items.find((i) => keyOf(i) === key);
      ok = !!again?.readRef && (await run((c) => c.press(again.readRef), undefined, fail));
    }
    if (!ok) return;
    if (it.unread) counted.current.add(key);
    else counted.current.delete(key);
    addUnread(it.unread ? -1 : 1);
    redraw((n) => n + 1);
  };
  // 開いても一覧はすぐ既読にならないので(実機で確認)、開いている掲示より後の最初の未読へ進む
  // 今の位置は詳細に出ている件名から(前へ・次へで移っても追える)。決められなければ一覧から開いた行
  const shownAt = page?.detail ? page.items.findIndex((i) => i.title === page.detail!.title) : -1;
  const uniqueShown = shownAt >= 0 && page!.items.filter((i) => i.title === page!.detail!.title).length === 1;
  const at = uniqueShown ? shownAt : opened && page ? page.items.findIndex((i) => i.openRef === opened) : -1;
  const firstUnread = page?.items.find((i, n) => n > at && asSeen(i).unread && i.openRef);
  const prevUnread = page?.items.slice(0, Math.max(at, 0)).findLast((i) => asSeen(i).unread && i.openRef);
  // 「未読を新しい順に読む」から読んでいる間は、詳細の前へ・次へも未読だけを渡る(行を自分で開いたら一覧の並びに戻る)
  const [reading, setReading] = useState(initialReading);
  // 分類(または一覧)の端で前へ・次へを押すと、元のサイトがシステムエラーになる(ボタンは押せるまま。実機で確認)。端では出さない
  // 同じ件名が複数あるとどの行か決められないので、そのときは変えない
  const lists = page?.groups?.map((g) => g.items) ?? (page ? [page.items] : []);
  const same = lists.flat().filter((i) => i.title === page?.detail?.title).length;
  const li = page?.detail && same === 1 ? lists.findIndex((l) => l.some((i) => i.title === page.detail!.title)) : -1;
  const list = lists[li];
  const pos = list?.findIndex((i) => i.title === page?.detail?.title) ?? -1;
  // 端では元のボタンの代わりに、隣の分類の端の行を開く(行を開く操作ならエラーにならない)
  const before = lists.slice(0, li).reverse().find((l) => l.length)?.at(-1)?.openRef ?? "";
  const after = lists.slice(li + 1).find((l) => l.length)?.[0]?.openRef ?? "";
  const [expanded, setExpanded] = useState("");
  const [pendingNext, setPendingNext] = useState("");
  // 分類に「すべて表示する」があれば、最後の次は隠れた掲示。先に広げてから次を開く(下の useEffect)
  const more = page?.groups?.[li]?.moreRef && expanded !== page.groups[li]!.title ? page.groups[li]!.moreRef : "";
  const lastNext = more ? MORE : after;
  const detail = page?.detail && reading ? { ...page.detail, prevRef: prevUnread?.openRef ?? "", nextRef: firstUnread?.openRef ?? "" } : page?.detail && list ? { ...page.detail, prevRef: pos === 0 ? before : page.detail.prevRef, nextRef: pos === list.length - 1 ? lastNext : page.detail.nextRef } : page?.detail;
  const showDetail = !!page?.detail && page.detail.title !== dismissed;
  useBackClose(showDetail, closeDetail); // ブラウザの戻るでも詳細を閉じる
  const detailClick = (ref: string) => {
    if (ref === page?.detail?.closeRef) return closeDetail();
    setDismissed("");
    if (ref !== MORE) return click(ref);
    const title = page!.detail!.title;
    const group = page!.groups![li]!.title;
    // 広げるのに失敗したら、古い一覧で次を探さない
    void run((c) => c.press(more), undefined, "続きを表示できませんでした").then((ok) => {
      if (!ok) return;
      setExpanded(group);
      setPendingNext(title);
    });
  };
  useEffect(() => {
    if (!pendingNext || busy || !page) return;
    setPendingNext("");
    const flat = (page.groups?.map((g) => g.items) ?? [page.items]).flat();
    const n = flat.findIndex((i) => i.title === pendingNext);
    const next = n >= 0 ? flat.slice(n + 1).find((i) => i.openRef) : undefined;
    if (next) open(next.openRef);
  }, [pendingNext, busy, page]); // 広げ終えて読み直した後に 1 回だけ
  const search = (q: { keyword: string; course: string }) => {
    if (!page) return;
    void run((c) => c.news.search(q), undefined, "検索できませんでした");
  };
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorNotice title="掲示板を読み込めませんでした" message={error ?? ""} onRetry={() => void retry()} />}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          <NewsToolbar
            page={listPage!}
            busy={busy}
            onTab={(name) => {
              const tab = page.tabs.find((t) => t.name === name);
              if (tab) click(tab.ref, "タブを切り替えられませんでした");
            }}
            onSearch={search}
            canReadUnread={!!firstUnread}
            onReadUnread={() => {
              if (!firstUnread) return;
              setReading(true);
              open(firstUnread.openRef);
            }}
          />
          <BusyOverlay busy={busy}>
            <div className={showDetail ? "grid grid-cols-1 items-start gap-3 min-[768px]:grid-cols-2" : ""}>
              <div className="flex min-w-0 flex-col gap-3">
                <NewsList page={listPage!} busy={busy} onOpen={(ref) => {
                  setReading(false);
                  open(ref);
                }} onFlag={flag} onRead={(it) => void toggleRead(it)} onMarkAllRead={markAllRead} onMore={(ref) => click(ref, "続きを表示できませんでした")} />
              </div>
              {showDetail && (
                // 767px 以下は詳細を全画面に重ねる
                <div className="min-w-0 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:z-40 max-[767px]:overflow-y-auto max-[767px]:bg-background max-[767px]:p-4">
                  <button
                    type="button"
                    disabled={!page.detail?.closeRef}
                    className="mb-3 cursor-pointer border-0 bg-transparent px-0 py-1 text-sm text-primary min-[768px]:hidden"
                    onClick={closeDetail}
                  >
                    ‹ 掲示板
                  </button>
                  <NewsDetailView detail={detail!} busy={busy} onClick={detailClick} />
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
