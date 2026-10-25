import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { RoomBar, RoomPage, RoomResult, RoomRow } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { Select } from "@/ui/Select";
import { errorMessage } from "../errorMessage";
import { useLiveScreen, type LiveState } from "../useLiveScreen";
import { drainAllPages } from "./drainRooms";
import { RoomDialog } from "./RoomDialog";
import { RoomForm } from "./RoomForm";
import { RoomTimeline } from "./RoomTimeline";
import { kindColor } from "./roomKinds";

const read = (c: MuscatClient) => c.readRoom();

/** 凡例と、その日の位置へ飛ぶ選択(期間の全日が表に入っているので通信はしない) */
function Legend({ result, dates, onJump }: { result: RoomResult; dates: string[]; onJump: (date: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {result.legend.map((l) => (
        <span key={l.kind} className="inline-flex items-center gap-1.5 text-[13px]">
          <i className="inline-block h-2.5 w-3.5 rounded-[2px]" style={{ background: kindColor(l.kind).bg, border: kindColor(l.kind).dashed ? `1px dashed ${kindColor(l.kind).fg}` : "0" }} />
          {l.label}
        </span>
      ))}
      <span className="flex-1" />
      {dates.length > 1 && <Select label="日付へ移動" value="" options={[{ value: "", label: "日付へ移動" }, ...dates.map((d) => ({ value: d, label: d }))]} onChange={(d) => d && onJump(d)} />}
    </div>
  );
}

/** 教室予約(参照のみ)。条件は画面で持ち、「検索」で元の画面に値を入れて通信を直接送る。結果は教室 × 時間のタイムライン */
export function RoomScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState<RoomPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, doc, read, initial);
  const [act, setAct] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ room: RoomRow; bar?: RoomBar } | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const [side, setSide] = useState(0); // 小窓が元の画面に送っている通信の数
  const track = useCallback(<T,>(p: Promise<T>) => {
    setSide((n) => n + 1);
    return p.finally(() => setSide((n) => n - 1));
  }, []);
  // 検索のたびに世代を進め、古い続き取りの結果を捨てる(最初の 40 教室は生きたページから読み、残りは extra に足す)
  const generation = useRef(0);
  const [extra, setExtra] = useState<RoomRow[]>([]);
  const [base, setBase] = useState<RoomResult | null>(null);
  const [fetching, setFetching] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [cleared, setCleared] = useState(false);
  const [ticket, setTicket] = useState(0);
  const started = useRef(false);
  const pageRef = useRef(page);
  pageRef.current = page;
  const go = async (key: string, steps: DriveStep[], submit = false) => {
    const restart = submit || key === "clear";
    if (restart) {
      generation.current++;
      setExtra([]);
      setBase(null);
      // クリアしても元のページの表は残る(最後のページの先頭 40 教室)ので、次に検索するまで結果を出さない
      setCleared(key === "clear");
      // 検索を押したときから取り切るまで読み込み中にする(前の結果や最初の 40 教室だけの表を出さない)
      setFetching(submit);
      setMoreError("");
    }
    setAct(key);
    setSubmitError("");
    // 失敗の表示は画面で持つ(useLiveScreen のエラーは、元のページの読み直しで消える)
    const ok = await run(steps, submit ? () => client.roomSubmit().catch((e: unknown) => { setSubmitError(errorMessage(e)); throw e; }) : undefined);
    setAct(null);
    if (!submit || !ok) return setFetching(false); // 送るのに失敗したら続きは取らない
    started.current = true; // 開いた時の続き取りと二重にしない
    setTicket((t) => t + 1);
  };
  useEffect(() => {
    if (!ticket) return;
    const g = generation.current;
    const first = pageRef.current?.result;
    if (!first?.rooms.length) return setFetching(false); // 教室が無ければ続きは無い
    const current = () => generation.current === g;
    setFetching(true);
    setBase(first); // 次のページへ進むと元のページの表は替わるので、最初のページはここで持っておく
    drainAllPages(() => client.roomMore(), () => client.roomNext(), (rows) => setExtra((x) => [...x, ...rows]), current, first.rooms).then(
      () => current() && setFetching(false),
      (e) => {
        if (!current()) return;
        setMoreError(errorMessage(e));
        setFetching(false);
      },
    );
  }, [ticket, client]);
  // 開いたときに元のページに結果がすでにあれば(前の検索のまま戻ってきたなど)、その続きも取る
  useEffect(() => {
    if (started.current || !page?.result?.rooms.length) return;
    started.current = true;
    setTicket((t) => t + 1);
  }, [page]);
  useEffect(() => () => void generation.current++, []); // 画面を離れたら続き取りを止める
  // 元の画面を押し、読み直した値でフォームを作り直す(本当の初期値は元の画面だけが知っている)
  const [gen, setGen] = useState(0);
  const r = base ?? page?.result;
  // 続きの先頭には日付の行が無いので、前の教室の日付を引き継ぐ
  const shown = useMemo(() => {
    if (!r) return r;
    let date = r.date;
    return { ...r, rooms: [...r.rooms, ...extra].map((x) => ({ ...x, date: (date = x.date || date) })) };
  }, [r, extra]);
  const dates = useMemo(() => [...new Set(shown?.rooms.map((x) => x.date))], [shown]);
  const [jump, setJump] = useState({ date: "", n: 0 });
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && !submitError && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          {/* 続きを取っている間は押させない(古い続きの応答が ViewState を上書きして、新しい検索が壊れる) */}
          <RoomForm key={gen} page={page} busy={busy || fetching || side > 0} act={act} onSearch={(steps) => void go("search", steps, true)} onClear={() => void go("clear", [{ kind: "click", ref: page.clearRef }]).then(() => setGen((g) => g + 1))} />
          {submitError && <Card className="p-4 text-[13px] text-error">{submitError}</Card>}
          {/* 検索に失敗したら、元のページに残った前の結果は出さない(新しい条件の結果に見える) */}
          {!submitError && fetching ? (
            // 検索の送信中は前の結果が残っているので数は出さない
            <div className="rounded-[4px] border border-border bg-card">
              <PageLoading title={act === "search" || !shown ? "教室の予約" : `教室の予約(${shown.rooms.length} 教室)`} />
            </div>
          ) : r && shown && !submitError && !cleared && (
            <BusyOverlay busy={busy}>
              <div className="flex flex-col gap-3">
                <Legend result={r} dates={dates} onJump={(date) => setJump((j) => ({ date, n: j.n + 1 }))} />
                {moreError && <Card className="p-3 text-[13px] text-error">{moreError}</Card>}
                {shown.rooms.length === 0 ? (
                  <Card className="grid gap-1 px-2 py-7 text-center text-muted-foreground">
                    <b className="text-[15px] text-foreground">該当する教室はありません</b>
                  </Card>
                ) : (
                  <RoomTimeline
                    result={shown}
                    jump={jump}
                    // 予約の中身は帯の title にそろっているので、元の画面は押さずに小窓で出す
                    onOpen={(b, room) => setDialog({ room, bar: b })}
                    onInfo={(room) => setDialog({ room })}
                  />
                )}
              </div>
            </BusyOverlay>
          )}
          {dialog && <RoomDialog client={client} room={dialog.room} bar={dialog.bar} onClose={closeDialog} track={track} />}
        </>
      )}
    </div>
  );
}
