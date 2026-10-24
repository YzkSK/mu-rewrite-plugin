import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { GenericScreen } from "../generic/GenericScreen";
import { useLiveScreen, type LiveState } from "../useLiveScreen";
import type { SyllabusPage } from "@/muscat/api/types";
import { SyllabusForm } from "./SyllabusForm";
import { SyllabusResult } from "./SyllabusResult";

const read = (c: MuscatClient) => c.readSyllabus();

/** シラバス検索。条件は画面で持ち、「検索」で元の画面に入れて押す。通信中は押したボタンが回り、結果は薄くなる */
export function SyllabusScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState<SyllabusPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, doc, read, initial);
  const [act, setAct] = useState<string | null>(null);
  const go = async (key: string, steps: DriveStep[]) => {
    setAct(key);
    await run(steps);
    setAct(null);
  };
  const click = (ref: string) => void go(ref, [{ kind: "click", ref }]);
  // 元の画面の「クリア」を押し、読み直した値でフォームを作り直す(本当の初期値は元の画面だけが知っている)
  const [gen, setGen] = useState(0);
  const clear = (ref: string) => void go("clear", [{ kind: "click", ref }]).then(() => setGen((g) => g + 1));
  // 授業を開くと同じ Kmh006 のまま詳細に変わる。検索欄が無ければ汎用画面で見せる
  if (page && !page.searchRef) return <GenericScreen client={client} doc={doc} />;
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          <SyllabusForm key={gen} onClear={() => clear(page.clearRef)} page={page} busy={busy} act={act} onSearch={(steps) => void go("search", steps)} onNote={() => void go("note", [{ kind: "click", ref: page.noteRef }])} />
          <BusyOverlay busy={busy}>
            <SyllabusResult
              page={page}
              busy={busy}
              act={act}
              onClick={click}
              onSize={(ref, value) => void go("size", [{ kind: "set", ref, value, ajax: true }])}
            />
          </BusyOverlay>
        </>
      )}
    </div>
  );
}
