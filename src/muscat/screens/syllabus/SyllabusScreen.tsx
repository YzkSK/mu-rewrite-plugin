import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { GenericScreen } from "../generic/GenericScreen";
import { useLiveScreen, type LiveState } from "../useLiveScreen";
import type { SyllabusPage } from "@/muscat/api/types";
import { SyllabusDetailView } from "./SyllabusDetailView";
import { SyllabusForm } from "./SyllabusForm";
import { SyllabusNotesBar } from "./SyllabusNotesBar";
import { SyllabusResult } from "./SyllabusResult";

const read = (c: MuscatClient) => c.readSyllabus();

/** シラバス検索。条件は画面で持ち、「検索」で元の画面に入れて押す。通信中は押したボタンが回り、結果は薄くなる。科目を開くと右から詳細が出る */
export function SyllabusScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState<SyllabusPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, read, initial);
  const [act, setAct] = useState<string | null>(null);
  // 最初の検索は、通信が終わってから元のページを読み直して表が出るまで間がある(実機で約 0.85 秒)。表が出るまで読み込み中を出す
  const [searched, setSearched] = useState(false);
  // 元の✕は、拡張が元のダイアログを隠しているため効かないことがある。閉じた科目はこちらで出さない(掲示板と同じ)
  const [dismissed, setDismissed] = useState("");
  const go = async (key: string, steps: DriveStep[]) => {
    setAct(key);
    await run(steps);
    setAct(null);
  };
  const click = (ref: string) => {
    setDismissed("");
    void go(ref, [{ kind: "click", ref }]);
  };
  // 元の画面の「クリア」を押し、読み直した値でフォームを作り直す(本当の初期値は元の画面だけが知っている)
  const [gen, setGen] = useState(0);
  const clear = (ref: string) => void go("clear", [{ kind: "click", ref }]).then(() => setGen((g) => g + 1));
  // 検索欄も詳細も無い(想定外の画面)ときは汎用画面で見せる
  if (page && !page.searchRef && !page.detail) return <GenericScreen client={client} doc={doc} />;
  const detail = page?.detail && page.detail.title !== dismissed ? page.detail : null;
  const note = () => page && void go("note", [{ kind: "click", ref: page.noteRef }]);
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorNotice title="シラバスを読み込めませんでした" message={error ?? ""} />}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          {page.mode === "notes" ? (
            <SyllabusNotesBar key={gen} page={page} busy={busy} act={act} onBack={() => void go("back", [{ kind: "click", ref: page.backRef }])} onSearch={(steps) => void go("search", steps)} />
          ) : (
          <SyllabusForm key={gen} onClear={() => clear(page.clearRef)} page={page} busy={busy} act={act} showNote={!page.result} onSearch={(steps) => {
            setSearched(true);
            // 通信が終わっても表が 3 秒出なければ(失敗・結果なし)読み込み中は消す
            void go("search", steps).then(() => setTimeout(() => setSearched(false), 3000));
          }} onNote={note} />
          )}
          {/* 最初の検索では重ねる結果が無いので、結果の出る場所に読み込み中を出す */}
          {!page.result && searched && status !== "error" && (
            <div className="rounded-[4px] border border-border bg-card">
              <PageLoading title="検索結果" />
            </div>
          )}
          <BusyOverlay busy={busy}>
            <SyllabusResult
              page={page}
              busy={busy}
              act={act}
              onClick={click}
              onNote={note}
              onSize={(ref, value) => void go("size", [{ kind: "set", ref, value, ajax: true }])}
            />
          </BusyOverlay>
          {detail && (
            <SyllabusDetailView
              detail={detail}
              busy={busy}
              onNote={() => void run([{ kind: "click", ref: detail.noteRef, ajax: true }])}
              onPrint={() => void run([{ kind: "click", ref: detail.printRef, ajax: false }])}
              onClose={() => {
                setDismissed(detail.title);
                void run([{ kind: "click", ref: detail.closeRef, ajax: false }]);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
