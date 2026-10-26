import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { GenericScreen } from "../generic/GenericScreen";
import { useBackClose } from "../useBackClose";
import { useLiveScreen, type LiveState } from "../useLiveScreen";
import type { SyllabusPage } from "@/muscat/api/types";
import { SyllabusDetailView } from "./SyllabusDetailView";
import { SyllabusForm } from "./SyllabusForm";
import { SyllabusNotesBar } from "./SyllabusNotesBar";
import { SyllabusResult } from "./SyllabusResult";

const read = (c: MuscatClient) => c.syllabus.read();
type Op = (c: MuscatClient) => Promise<unknown>;

/** シラバス検索。条件は画面で持ち、「検索」で元の画面に入れて押す。通信中は押したボタンが回り、結果は薄くなる。科目を開くと右から詳細が出る */
export function SyllabusScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState<SyllabusPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, read, initial);
  const [act, setAct] = useState<string | null>(null);
  // 最初の検索は、通信が終わってから元のページを読み直して表が出るまで間がある(実機で約 0.85 秒)。表が出るまで読み込み中を出す
  const [searched, setSearched] = useState(false);
  // 元の✕は、拡張が元のダイアログを隠しているため効かないことがある。閉じた科目はこちらで出さない(掲示板と同じ)
  const [dismissed, setDismissed] = useState("");
  // key は押したボタンの印、fail は失敗トーストの題
  const FAIL: Record<string, string> = { search: "検索できませんでした", clear: "条件をクリアできませんでした", size: "表示件数を変えられませんでした", note: "ふせんを開けませんでした", back: "検索に戻れませんでした" };
  const go = async (key: string, op: Op, fail = FAIL[key]) => {
    setAct(key);
    await run(op, undefined, fail);
    setAct(null);
  };
  // 引き出しの「シラバスを開く」から来たときは、最初に 1 回だけ授業の詳細まで開く
  useEffect(() => {
    const p = client.syllabus.takePending();
    if (p) void go("open", (c) => c.syllabus.findAndOpen(p), "シラバスを開けませんでした");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const click = (ref: string) => {
    setDismissed("");
    const open = page?.result?.rows.some((r) => r.openRef === ref);
    void go(ref, (c) => c.press(ref), open ? "シラバスを開けませんでした" : "ページを移れませんでした");
  };
  // 元の画面の「クリア」を押し、読み直した値でフォームを作り直す(本当の初期値は元の画面だけが知っている)
  const [gen, setGen] = useState(0);
  const clear = (ref: string) => void go("clear", (c) => c.press(ref)).then(() => setGen((g) => g + 1));
  const detail = page?.detail && page.detail.title !== dismissed ? page.detail : null;
  const note = () => page && void go("note", (c) => c.press(page.noteRef));
  const closeDetail = () => {
    if (!detail) return;
    setDismissed(detail.title);
    void run((c) => c.press(detail.closeRef), undefined, "詳細を閉じられませんでした");
  };
  useBackClose(!!detail, closeDetail); // ブラウザの戻るでも詳細を閉じる(フックなので、下の早期 return より前)
  // 検索欄も詳細も無い(想定外の画面)ときは汎用画面で見せる
  if (page && !page.searchRef && !page.detail) return <GenericScreen client={client} doc={doc} />;
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorNotice title="シラバスを読み込めませんでした" message={error ?? ""} />}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          {page.mode === "notes" ? (
            <SyllabusNotesBar key={gen} page={page} busy={busy} act={act} onBack={() => void go("back", (c) => c.press(page.backRef))} onSearch={(q) => void go("search", (c) => c.syllabus.search(q))} />
          ) : (
          <SyllabusForm key={gen} onClear={() => clear(page.clearRef)} page={page} busy={busy} act={act} showNote={!page.result} onSearch={(q) => {
            setSearched(true);
            // 通信が終わっても表が 3 秒出なければ(失敗・結果なし)読み込み中は消す
            void go("search", (c) => c.syllabus.search(q)).then(() => setTimeout(() => setSearched(false), 3000));
          }} onNote={note} />
          )}
          {/* 最初の検索では重ねる結果が無いので、結果の出る場所に読み込み中を出す */}
          {!page.result && searched && status !== "error" && (
            <div className="rounded-[4px] border border-border bg-card">
              <PageLoading title="検索結果" />
            </div>
          )}
          {/* 結果がまだ無いときは上の「検索結果を読み込んでいます」だけにする(空の欄に重ねると輪が 2 つ出た) */}
          <BusyOverlay busy={busy && !!page.result}>
            <SyllabusResult
              page={page}
              busy={busy}
              act={act}
              onClick={click}
              onNote={note}
              onSize={(ref, value) => void go("size", (c) => c.fill(ref, value))}
            />
          </BusyOverlay>
          {detail && (
            <SyllabusDetailView
              detail={detail}
              busy={busy}
              onNote={() => void run((c) => c.press(detail.noteRef), undefined, "ふせんを操作できませんでした")}
              onPrint={() => void run((c) => c.press(detail.printRef), undefined, "印刷できませんでした")}
              onClose={closeDetail}
            />
          )}
        </>
      )}
    </div>
  );
}
