import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/starwind/collapsible";
import { checksOf, fieldsOf, type RoomValues } from "@/muscat/api/room";
import type { CheckOption, RoomPage, RoomRange, SelectField } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Checkbox } from "@/ui/Checkbox";
import { DatePicker } from "@/ui/DatePicker";
import { RadioGroup } from "@/ui/RadioGroup";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";
import { Field } from "../Field";

type Values = RoomValues;
const initial = (p: RoomPage): Values => ({
  text: Object.fromEntries(fieldsOf(p).map((f) => [f.ref, f.value])),
  on: Object.fromEntries(checksOf(p).map((c) => [c.ref, c.checked])),
});

/** 選んである絞り込み条件の数(バッジ) */
function filterCount(p: RoomPage, v: Values): number {
  const t = (f: { ref: string; value: string }) => !!(v.text[f.ref] ?? f.value);
  const any = (...fs: { ref: string; value: string }[]) => fs.some(t);
  const { regular, exam, entrance } = p.capacity;
  return [
    !!p.free && !!v.on[p.free.boxRef],
    p.days.some((d) => v.on[d.ref]),
    t(p.campus), t(p.building), t(p.floor),
    any(regular.from, regular.to), any(exam.from, exam.to), any(entrance.from, entrance.to),
    p.showCapacity.length > 1 && !!v.on[p.showCapacity[1]!.ref],
  ].filter(Boolean).length;
}

const SEP = "text-[13px] text-muted-foreground";
/** 絞り込みの 1 行(左に項目名、右に中身)。grid の 2 列に並べる */
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <span className="self-start pt-1.5 text-xs font-bold text-muted-foreground max-[767px]:mt-2 max-[767px]:pt-0 max-[767px]:first:mt-0">{label}</span>
    <div className="min-w-0">{children}</div>
  </>
);

export function RoomForm({ page, busy, act, onSearch, onClear }: { page: RoomPage; busy: boolean; act: string | null; onSearch: (v: RoomValues) => void; onClear: () => void }) {
  const [v, setV] = useState(() => initial(page));
  const [more, setMore] = useState(false);
  const text = (f: { ref: string; value: string }) => v.text[f.ref] ?? f.value;
  const setText = (ref: string, value: string) => setV((x) => ({ ...x, text: { ...x.text, [ref]: value } }));
  const setOn = (ref: string, on: boolean, group?: CheckOption[]) =>
    setV((x) => ({ ...x, on: { ...x.on, ...Object.fromEntries((group ?? []).map((g) => [g.ref, false])), [ref]: on } }));
  // 終了日が開始日より前だと、元の画面は何も出さず理由も言わない(実機で確認)ので、送る前に止める
  const [from, to] = [text(page.period.from), text(page.period.to)];
  const backwards = !!from && !!to && from > to; // どちらも「2026/10/25」の形なので文字の大小で比べられる
  const search = () => !backwards && onSearch(v);
  const n = filterCount(page, v);
  const free = page.free;
  const sel = (label: string, f: SelectField) => <Select label={label} value={text(f)} options={f.options} disabled={busy} onChange={(x) => setText(f.ref, x)} />;
  const input = (label: string, f: { ref: string; value: string }, w = "w-24") => (
    <div className={w}><TextInput label={label} value={text(f)} disabled={busy} onChange={(x) => setText(f.ref, x)} /></div>
  );
  const date = (label: string, f: { ref: string; value: string }) => <DatePicker label={label} value={text(f)} disabled={busy} clearable onChange={(x) => setText(f.ref, x)} />;
  const range = (label: string, r: RoomRange, unit?: string) => (
    <div className="flex items-center gap-2 max-[767px]:flex-wrap">
      <span className="w-14 text-[13px]">{label}</span>
      {input(`${label}の下限`, r.from, "w-20")}<span className={SEP}>〜</span>{input(`${label}の上限`, r.to, "w-20")}
      {unit && <span className={SEP}>{unit}</span>}
    </div>
  );
  const cap = page.capacity;
  const showOn = page.showCapacity.length > 1 && !!v.on[page.showCapacity[1]!.ref];
  return (
    <Card className="gap-3.5 p-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 max-[767px]:grid" onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && !busy && search()}>
        <Field label="期間">
          {/* 狭い画面は 2 等分(〜 は置かない) */}
          <div className="flex flex-wrap items-center gap-2 max-[767px]:grid max-[767px]:grid-cols-2 [&>div]:max-[767px]:min-w-0">{date("開始日", page.period.from)}<span className={`${SEP} max-[767px]:hidden`}>〜</span>{date("終了日", page.period.to)}</div>
          {backwards && <p role="alert" className="m-0 mt-1 text-xs text-error">終了日を開始日より後にしてください</p>}
        </Field>
        {page.targets.length > 0 && (
          <Field label="表示する予約">
            <div className="flex h-8 flex-wrap items-center gap-3">
              {page.targets.map((o) => <Checkbox key={o.ref} label={o.label.replace("の予約", "")} checked={!!v.on[o.ref]} disabled={busy} onChange={(c) => setOn(o.ref, c)} />)}
            </div>
          </Field>
        )}
      </div>
      <Collapsible open={more} onOpenChange={setMore} className="border-t border-border pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* 文字だけだと押せるとわかりにくいので枠を付ける。数は 0 のとき出さない(場所だけ取って矢印が離れて見えた) */}
          <CollapsibleTrigger className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[4px] border border-border bg-card px-2.5 text-[13px] font-bold text-primary hover:bg-muted">
            絞り込み
            {n > 0 && <span className="inline-grid min-w-5 place-content-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n}</span>}
            <IconChevronDown className={`size-4 transition-transform duration-200 ${more ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <span className="flex-1" />
          <Button variant="secondary" disabled={busy} loading={act === "clear"} onClick={onClear}>クリア</Button>
          <Button disabled={busy || backwards} loading={act === "search"} onClick={search}>検索</Button>
        </div>
        <CollapsibleContent>
          {/* 項目名は左、中身は右の行を縦に並べる(2 列だと高さがずれて、場所の見出しの下が空いた) */}
          <div className="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-5 gap-y-3 max-[767px]:grid-cols-1 max-[767px]:gap-y-1">
            {free && (
              <Row label="空き教室">
                <div className="flex flex-wrap items-center gap-2">
                  <Checkbox label="空き教室を検索する" checked={!!v.on[free.boxRef]} disabled={busy} onChange={(c) => setOn(free.boxRef, c)} />
                  {v.on[free.boxRef] && (
                    <>
                      {input("開始時刻", free.time.from, "w-20")}<span className={SEP}>〜</span>{input("終了時刻", free.time.to, "w-20")}
                      {input("空き時間(時間)", free.hour, "w-14")}<span className={SEP}>時間</span>{input("空き時間(分)", free.minute, "w-14")}<span className={SEP}>分以上空いている</span>
                    </>
                  )}
                </div>
              </Row>
            )}
            {page.days.length > 0 && (
              <Row label="曜日">
                <span className="inline-flex w-fit overflow-hidden rounded-[4px] border border-input max-[767px]:flex max-[767px]:w-full">
                  {page.days.map((o, i) => (
                    <button
                      key={o.ref}
                      type="button"
                      aria-pressed={!!v.on[o.ref]}
                      disabled={busy}
                      onClick={() => setOn(o.ref, !v.on[o.ref])}
                      className={`h-8 min-w-9 cursor-pointer border-0 px-2.5 text-[13px] max-[767px]:h-10 max-[767px]:min-w-0 max-[767px]:flex-1 max-[767px]:px-0 disabled:cursor-default ${i ? "border-l border-input" : ""} ${v.on[o.ref] ? "bg-primary font-semibold text-primary-foreground" : "bg-card"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </span>
              </Row>
            )}
            <Row label="場所">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {page.campus.options.length > 0 && <label className="flex items-center gap-2 text-[13px]">キャンパス{sel("キャンパス", page.campus)}</label>}
                {page.building.options.length > 0 && <label className="flex items-center gap-2 text-[13px]">建物{sel("建物", page.building)}</label>}
                {page.floor.options.length > 0 && <label className="flex items-center gap-2 text-[13px]">階{sel("階", page.floor)}</label>}
              </div>
            </Row>
            <Row label="収容人数">
              <div className="grid gap-1.5">{range("平常時", cap.regular, "人")}{range("試験時", cap.exam, "人")}{range("入試時", cap.entrance, "人")}</div>
            </Row>
            {page.showCapacity.length > 0 && (
              <Row label="一覧の収容人数">
                <div className="flex flex-wrap items-center gap-3">
                  <RadioGroup
                    label="一覧の収容人数"
                    options={page.showCapacity.map((o) => ({ value: o.ref, label: o.label.replace("一覧に列を", "") }))}
                    value={page.showCapacity.find((o) => v.on[o.ref])?.ref ?? ""}
                    disabled={busy}
                    onChange={(ref) => setOn(ref, true, page.showCapacity)}
                  />
                  {showOn && page.capacityKind.options.length > 0 && sel("収容人数の種類", page.capacityKind)}
                </div>
              </Row>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
