import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { TeacherSchedulePage, TeacherSearch } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ErrorCard } from "@/ui/ErrorCard";
import { PageLoading } from "@/ui/PageLoading";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";
import { Field } from "../Field";
import { useLiveScreen, type LiveState } from "../useLiveScreen";
import { TeacherCalendarView } from "./TeacherCalendarView";
import { TeacherList } from "./TeacherList";

const read = (c: MuscatClient) => c.readTeacherSchedule();

function SearchForm({ search, busy, act, onSearch, onToggle, onClear }: { search: TeacherSearch; busy: boolean; act: string | null; onSearch: (steps: DriveStep[]) => void; onToggle: () => void; onClear: () => void }) {
  const [name, setName] = useState(search.name.value);
  const [sort, setSort] = useState(search.sort.value);
  const submit = () =>
    onSearch([
      ...(search.name.ref ? [{ kind: "set", ref: search.name.ref, value: name } as const] : []),
      ...(search.sort.ref ? [{ kind: "set", ref: search.sort.ref, value: sort } as const] : []),
      { kind: "click", ref: search.searchRef, ajax: true },
    ]);
  return (
    <Card className="gap-3 p-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2" onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && !busy && submit()}>
        <Field label="氏名(姓か名の一部、カナでも)"><TextInput label="氏名(姓か名の一部、カナでも)" value={name} disabled={busy} onChange={setName} /></Field>
        <Field label="並び順">
          <div className="flex flex-wrap items-center gap-2">
            <Select label="並び順" value={sort} options={search.sort.options} disabled={busy} onChange={setSort} />
            {search.toggleRef && <Button variant="secondary" label={search.ascending ? "昇順(押すと降順)" : "降順(押すと昇順)"} disabled={busy} loading={act === "toggle"} onClick={onToggle}>{search.ascending ? "昇順 ↑" : "降順 ↓"}</Button>}
          </div>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1" />
        <Button variant="secondary" disabled={busy} loading={act === "clear"} onClick={onClear}>クリア</Button>
        <Button disabled={busy} loading={act === "search"} onClick={submit}>検索</Button>
      </div>
    </Card>
  );
}

/** 教員スケジュール。検索 → 教員の一覧 → 月カレンダー(予定は通信で直接取る)。検索と一覧の操作は元の画面の部品を押し、通信中は結果を薄くして丸いアイコンを重ねる */
export function TeacherScheduleScreen({ client, initial }: { client: MuscatClient; doc?: Document; initial?: LiveState<TeacherSchedulePage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, read, initial);
  const [act, setAct] = useState<string | null>(null);
  // key は押したボタンの印、fail は失敗トーストの題
  const FAIL: Record<string, string> = { search: "検索できませんでした", clear: "条件をクリアできませんでした", toggle: "並び順を変えられませんでした", size: "表示件数を変えられませんでした" };
  const go = async (key: string, steps: DriveStep[], fail = FAIL[key]) => {
    setAct(key);
    await run(steps, undefined, fail);
    setAct(null);
  };
  const click = (ref: string) => {
    const open = page?.list?.rows.some((r) => r.openRef === ref);
    void go(ref, [{ kind: "click", ref }], open ? "予定を開けませんでした" : ref === page?.backRef ? "一覧に戻れませんでした" : "ページを移れませんでした");
  };
  // 元の画面の「クリア」を押し、読み直した値でフォームを作り直す(本当の初期値は元の画面だけが知っている)
  const [gen, setGen] = useState(0);
  const clear = (ref: string) => void go("clear", [{ kind: "click", ref }]).then(() => setGen((g) => g + 1));
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorCard>{error}</ErrorCard>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          {page.search && (
            <SearchForm key={gen} onClear={() => clear(page.search!.clearRef)} search={page.search} busy={busy} act={act} onSearch={(steps) => void go("search", steps)} onToggle={() => void go("toggle", [{ kind: "click", ref: page.search!.toggleRef }])} />
          )}
          <BusyOverlay busy={busy}>
            <div className="flex flex-col gap-3">
              {page.list && <TeacherList list={page.list} note={page.search?.name.value ? `氏名「${page.search.name.value}」` : ""} busy={busy} act={act} onClick={click} onSize={(ref, value) => void go("size", [{ kind: "set", ref, value, ajax: true }])} />}
              <TeacherCalendarView key={page.teacher} page={page} client={client} busy={busy} onBack={click} />
            </div>
          </BusyOverlay>
        </>
      )}
    </div>
  );
}
