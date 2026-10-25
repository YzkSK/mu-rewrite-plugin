import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getZoom, onZoomChange, setZoom, ZOOMS } from "@/muscat/shell/zoom";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { CheckOption, SettingsPage, SettingsTable } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorCard } from "@/ui/ErrorCard";
import { Checkbox } from "@/ui/Checkbox";
import { PageLoading } from "@/ui/PageLoading";
import { RadioGroup } from "@/ui/RadioGroup";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";
import { useLiveScreen, type LiveState } from "../useLiveScreen";

const read = (c: MuscatClient) => c.readSettings();

const click = (ref: string, ajax: boolean): DriveStep => ({ kind: "click", ref, ajax });
/** 画面の値と違うチェックだけ、元の画面の枠を押す */
const flips = (items: CheckOption[], isOn: (c: CheckOption) => boolean): DriveStep[] => items.filter((c) => c.ref && isOn(c) !== c.checked).map((c) => click(c.ref, false));
/** ラジオは選んだものが今の選択と違うときだけ押す */
const pick = (items: CheckOption[], ref: string): DriveStep[] => items.filter((c) => c.ref === ref && !c.checked).map((c) => click(c.ref, false));

const CELL = "border border-[#ECE9EF] px-2.5 py-1.5";

/** 見出しの帯・本文・(あれば)右下に保存を置く節。注釈は本文の下に小さく */
function Section({ title, notes, footer, children }: { title: string; notes: string[]; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <h2 className="m-0 border-b border-border bg-muted px-3.5 py-2 text-sm font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 p-3.5">
        {children}
        {notes.map((n) => <p key={n} className="m-0 text-xs text-muted-foreground">{n}</p>)}
      </div>
      {footer && <div className="flex justify-end gap-2 border-t border-[#ECE9EF] px-3.5 py-2.5">{footer}</div>}
    </section>
  );
}

/** 元の画面の表。選択の枠・枠の入った列は画面で持つ値(isOn / setOn)で動かす */
function Table({ t, selectable = false, isOn, setOn }: { t: SettingsTable; selectable?: boolean; isOn: (c: CheckOption) => boolean; setOn: (ref: string, on: boolean) => void }) {
  const cols = t.headers.length + (selectable ? 1 : 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-[12.5px]">
            {selectable && <th className={`${CELL} w-9 bg-[#FAF9FB]`} />}
            {t.headers.map((h, i) => <th key={i} className={`${CELL} bg-[#FAF9FB] font-semibold text-muted-foreground`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.length === 0 && <tr><td colSpan={cols} className={`${CELL} text-muted-foreground`}>対象データがありません。</td></tr>}
          {t.rows.map((r, i) => (
            <tr key={i}>
              {selectable && <td className={CELL}>{r.select.ref && <Checkbox label="" checked={isOn(r.select)} onChange={(c) => setOn(r.select.ref, c)} />}</td>}
              {r.cells.map((c, j) => (
                <td key={j} className={CELL}>{c.ref ? <Checkbox label={t.headers[j] ?? ""} checked={isOn(c)} onChange={(v) => setOn(c.ref, v)} /> : c.label}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Run = (steps: DriveStep[], confirm?: boolean) => void;

/** 開いているタブの中身。値は画面で持ち、押したときに元の画面へ入れる。page が変わっても編集中の値は残る(操作のあとは作り直す) */
function Body({ page, run }: { page: SettingsPage; run: Run }) {
  const [txt, setTxt] = useState<Record<string, string>>({});
  const [on, setOnMap] = useState<Record<string, boolean>>({});
  const isOn = (c: CheckOption) => on[c.ref] ?? c.checked;
  const setOn = (ref: string, v: boolean) => setOnMap((x) => ({ ...x, [ref]: v }));
  const set = (k: string, v: string) => setTxt((x) => ({ ...x, [k]: v }));
  // 保存は「確認 → 元の保存ボタン → 元の確認の OK」。確認は呼び出し側(画面)が先に出す
  const save = (saveRef: string, pre: DriveStep[] = []) => run([...pre, click(saveRef, false), click(page.confirmRef, true)], true);
  const canSave = (ref: string) => !!ref && !!page.confirmRef;
  const saveButton = (ref: string, pre: DriveStep[] = []) => <Button disabled={!canSave(ref)} onClick={() => save(ref, pre)}>保存</Button>;

  const { mail, favorite, portal } = page;
  if (mail) {
    const { address: a, times, stop } = mail;
    const kind = txt.kind ?? a.kinds.find((k) => k.checked)?.ref ?? "";
    const input = txt[a.input.ref] ?? a.input.value;
    const selected = a.table.rows.filter((r) => r.select.ref && isOn(r.select));
    return (
      <>
        <Section title={a.title} notes={a.notes} footer={saveButton(a.saveRef)}>
          <Table t={a.table} selectable isOn={isOn} setOn={setOn} />
          <div>
            <Button variant="secondary" disabled={!selected.length || !a.deleteRef} onClick={() => run([...flips(a.table.rows.map((r) => r.select), isOn), click(a.deleteRef, true)])}>選択した行を削除</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-72 max-w-full"><TextInput label="追加するメールアドレス" placeholder="追加するメールアドレス" value={input} onChange={(v) => set(a.input.ref, v)} /></div>
            {a.kinds.length > 0 && (
              <RadioGroup label="種類" options={a.kinds.map((k) => ({ value: k.ref, label: k.label.replace(/メールアドレス$/, "") }))} value={kind} onChange={(v) => set("kind", v)} />
            )}
            <Button variant="secondary" disabled={!input.trim() || !a.addRef} onClick={() => run([{ kind: "set", ref: a.input.ref, value: input }, ...pick(a.kinds, kind), click(a.addRef, true)])}>追加</Button>
          </div>
        </Section>
        <Section title={times.title} notes={times.notes} footer={saveButton(times.saveRef, flips(times.options, isOn))}>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {times.options.map((o) => <Checkbox key={o.ref} label={o.label} checked={isOn(o)} onChange={(c) => setOn(o.ref, c)} />)}
          </div>
        </Section>
        <Section title={stop.title} notes={stop.notes} footer={saveButton(stop.saveRef, flips(stop.table.rows.flatMap((r) => r.cells), isOn))}>
          <Table t={stop.table} isOn={isOn} setOn={setOn} />
        </Section>
      </>
    );
  }
  if (favorite) {
    const menu = txt[favorite.menu.ref] ?? favorite.menu.value;
    return (
      <Section
        title={favorite.title}
        notes={favorite.notes}
        footer={
          <>
            <Button variant="secondary" disabled={!favorite.resetRef} onClick={() => run([click(favorite.resetRef, true)])}>元に戻す</Button>
            {saveButton(favorite.saveRef)}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select label="追加する機能" value={menu} options={favorite.menu.options} onChange={(v) => set(favorite.menu.ref, v)} />
          <Button variant="secondary" disabled={!menu || !favorite.addRef} onClick={() => run([{ kind: "set", ref: favorite.menu.ref, value: menu }, click(favorite.addRef, true)])}>追加</Button>
        </div>
        {/* 行の外し方(選択 + 削除)は実機にデータがなく未確認なので、一覧は読むだけ */}
        <Table t={favorite.table} isOn={isOn} setOn={setOn} />
      </Section>
    );
  }
  if (portal) {
    const sel = txt.portal ?? portal.options.find((o) => o.checked)?.ref ?? "";
    return (
      <Section title={portal.title} notes={portal.notes} footer={saveButton(portal.saveRef, pick(portal.options, sel))}>
        {portal.description && <p className="m-0 text-[13px]">{portal.description}</p>}
        <RadioGroup label="カレンダーの開始曜日" options={portal.options.map((o) => ({ value: o.ref, label: o.label }))} value={sel} onChange={(v) => set("portal", v)} />
      </Section>
    );
  }
  return <PageLoading title="設定" />;
}

/** 保存の前に出す確認(元の画面の確認は、拡張のこの確認のあとで押す) */
function Confirm({ onCancel, onOk }: { onCancel: () => void; onOk: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(31_26_36/.32)] p-4" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="dialog" aria-label="保存の確認" className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-4 shadow-md">
        <p className="m-0 text-sm">保存します。よろしいですか？</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
          <Button onClick={onOk}>保存</Button>
        </div>
      </div>
    </div>
  );
}

/** この拡張だけの「表示の大きさ」。元のサイトの設定ではないので、選んだらすぐ変わり、保存も通信もない */
function ZoomCard() {
  const zoom = useSyncExternalStore(onZoomChange, getZoom, () => 100);
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <h2 className="m-0 border-b border-border bg-muted px-3.5 py-2 text-sm font-semibold">表示の大きさ</h2>
      <div className="flex flex-col gap-2.5 p-3.5">
        <span className="text-[13px] text-muted-foreground">この画面の文字や表をまとめて大きく・小さくします。このブラウザに覚えます。</span>
        <RadioGroup label="表示の大きさ" options={ZOOMS.map((z) => ({ value: String(z.value), label: z.label }))} value={String(zoom)} onChange={(v) => setZoom(Number(v))} />
      </div>
    </section>
  );
}

/** 個人設定。タブは元の画面の TabView を押して切り替え、値は画面で持って、保存などで元の画面に入れて押す */
export function SettingsScreen({ client, initial }: { client: MuscatClient; doc?: Document; initial?: LiveState<SettingsPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, read, initial);
  const [ask, setAsk] = useState<DriveStep[] | null>(null);
  const [gen, setGen] = useState(0);
  // 操作のあとは元の画面の値で作り直す(追加した欄が空に戻るなど)
  // 失敗したときは作り直さない(入力途中の値が消える)
  const go = (steps: DriveStep[]) => void run(steps).then((ok) => ok && setGen((g) => g + 1));
  const active = page?.tabs.find((t) => t.active);
  // 出さないタブ(テーマ設定)が開いた状態で来たら、先頭のタブへ移る
  const first = page?.tabs[0];
  const stray = !!page && !active && !!first;
  useEffect(() => {
    if (stray && first) go([click(first.ref, !first.loaded)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stray]);
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3.5 p-4">
      {status === "error" && <ErrorCard>{error}</ErrorCard>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          <div role="tablist" className="flex flex-wrap border-b border-border">
            {page.tabs.map((t) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={t.active}
                disabled={busy}
                // 読み込み済みのタブは通信しないので、待つと待ち時間切れまで止まった(実機で確認)
                onClick={() => !t.active && go([click(t.ref, !t.loaded)])}
                className={`cursor-pointer border-0 bg-transparent px-4 py-2.5 text-sm ${t.active ? "font-semibold text-primary shadow-[inset_0_-2px_0_var(--primary)]" : "text-muted-foreground hover:bg-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <BusyOverlay busy={busy}>
            <div key={`${active?.label}-${gen}`} className="flex flex-col gap-3.5">
              <Body page={page} run={(steps, confirm) => (confirm ? setAsk(steps) : go(steps))} />
            </div>
          </BusyOverlay>
          <ZoomCard />
          {ask && <Confirm onCancel={() => setAsk(null)} onOk={() => { setAsk(null); go(ask); }} />}
        </>
      )}
    </div>
  );
}
