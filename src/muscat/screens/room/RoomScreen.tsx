import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { RoomBar, RoomPage, RoomResult } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { Select } from "@/ui/Select";
import { useLiveScreen, type LiveState } from "../useLiveScreen";
import { RoomForm } from "./RoomForm";
import { RoomTimeline } from "./RoomTimeline";
import { kindColor } from "./roomKinds";

const read = (c: MuscatClient) => c.readRoom();

type Nav = { act: string | null; busy: boolean; go: (key: string, steps: DriveStep[]) => void };

/** 凡例と、表示日の移動 */
function Legend({ result, act, busy, go }: { result: RoomResult } & Nav) {
  const [date, setDate] = useState(result.dates.value);
  const click = (key: string, ref: string) => go(key, [{ kind: "click", ref, ajax: true }]);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {result.legend.map((l) => (
        <span key={l.kind} className="inline-flex items-center gap-1.5 text-[13px]">
          <i className="inline-block size-3 rounded-sm" style={{ background: kindColor(l.kind).bg, outline: `1px solid ${kindColor(l.kind).fg}` }} />
          {l.label}
        </span>
      ))}
      <span className="flex-1" />
      <Select label="表示日" value={date} options={result.dates.options} disabled={busy} onChange={setDate} />
      <Button variant="secondary" disabled={busy || !result.moveRef} loading={act === "move"} onClick={() => go("move", [{ kind: "set", ref: result.dates.ref, value: date }, { kind: "click", ref: result.moveRef, ajax: true }])}>この日へ移動</Button>
      <Button variant="ghost" disabled={busy || !result.prevRef} loading={act === "prev"} onClick={() => click("prev", result.prevRef)}>‹ 前へ</Button>
      <Button variant="ghost" disabled={busy || !result.nextRef} loading={act === "next"} onClick={() => click("next", result.nextRef)}>次へ ›</Button>
    </div>
  );
}

/** 教室予約(参照のみ)。条件は画面で持ち、「検索」で元の画面に入れて押す。結果は教室 × 時間のタイムライン */
export function RoomScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState<RoomPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, doc, read, initial);
  const [act, setAct] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const go = async (key: string, steps: DriveStep[]) => {
    setAct(key);
    await run(steps);
    setAct(null);
  };
  // 元の画面の「クリア」を押し、読み直した値でフォームを作り直す(本当の初期値は元の画面だけが知っている)
  const [gen, setGen] = useState(0);
  const r = page?.result;
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          <RoomForm key={gen} page={page} busy={busy} act={act} onSearch={(steps) => void go("search", steps)} onClear={() => void go("clear", [{ kind: "click", ref: page.clearRef }]).then(() => setGen((g) => g + 1))} />
          {r && (
            <BusyOverlay busy={busy}>
              <div className="flex flex-col gap-3">
                <Legend key={r.date} result={r} act={act} busy={busy} go={(k, s) => void go(k, s)} />
                {detail && <Card className="p-3 text-[13px]">{detail}</Card>}
                {r.rooms.length === 0 ? (
                  <Card className="grid gap-1 px-2 py-7 text-center text-muted-foreground">
                    <b className="text-[15px] text-foreground">該当する教室はありません</b>
                  </Card>
                ) : (
                  <RoomTimeline
                    key={`${r.date}:${r.rooms.length}`}
                    result={r}
                    onOpen={(b: RoomBar) => { setDetail(b.title || b.text); void go(b.openRef, [{ kind: "click", ref: b.openRef, ajax: true }]); }}
                    onInfo={(ref) => void go(ref, [{ kind: "click", ref, ajax: true }])}
                  />
                )}
              </div>
            </BusyOverlay>
          )}
        </>
      )}
    </div>
  );
}
