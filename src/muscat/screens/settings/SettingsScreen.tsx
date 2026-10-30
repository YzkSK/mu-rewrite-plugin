import { useEffect, useState, type ReactNode } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { SettingsSave } from "@/muscat/api/settings";
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

const read = (c: MuscatClient) => c.settings.read();

/** API の操作名を呼ぶ関数 */
type Op = (c: MuscatClient) => Promise<unknown>;

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
      {/* 狭い画面は保存を全幅(2 つあれば半々)・高さ 44px */}
      {footer && <div className="flex justify-end gap-2 border-t border-[#ECE9EF] px-3.5 py-2.5 max-[767px]:*:h-11 max-[767px]:*:flex-1">{footer}</div>}
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

type Run = (op: Op, confirm?: boolean, fail?: string) => void;

/** 開いているタブの中身。値は画面で持ち、押したときに元の画面へ入れる。page が変わっても編集中の値は残る(操作のあとは作り直す) */
function Body({ page, run }: { page: SettingsPage; run: Run }) {
  const [txt, setTxt] = useState<Record<string, string>>({});
  const [on, setOnMap] = useState<Record<string, boolean>>({});
  const isOn = (c: CheckOption) => on[c.ref] ?? c.checked;
  const setOn = (ref: string, v: boolean) => setOnMap((x) => ({ ...x, [ref]: v }));
  const set = (k: string, v: string) => setTxt((x) => ({ ...x, [k]: v }));
  // 保存は「確認 → 元の保存ボタン → 元の確認の OK」。確認は呼び出し側(画面)が先に出す
  const canSave = (ref: string) => !!ref && !!page.confirmRef;
  const saveButton = (ref: string, s: SettingsSave) => <Button disabled={!canSave(ref)} onClick={() => run((c) => c.settings.save(s), true)}>保存</Button>;

  const { mail, favorite, portal } = page;
  if (mail) {
    const { address: a, times, stop } = mail;
    const kind = txt.kind ?? a.kinds.find((k) => k.checked)?.ref ?? "";
    const input = txt[a.input.ref] ?? a.input.value;
    const selected = a.table.rows.filter((r) => r.select.ref && isOn(r.select));
    return (
      <>
        <Section title={a.title} notes={a.notes} footer={saveButton(a.saveRef, { section: "address" })}>
          <Table t={a.table} selectable isOn={isOn} setOn={setOn} />
          <div>
            <Button variant="secondary" disabled={!selected.length || !a.deleteRef} onClick={() => run((c) => c.settings.deleteAddresses(on), false, "削除できませんでした")}>選択した行を削除</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-72 max-w-full"><TextInput label="追加するメールアドレス" placeholder="追加するメールアドレス" value={input} onChange={(v) => set(a.input.ref, v)} /></div>
            {a.kinds.length > 0 && (
              <RadioGroup label="種類" options={a.kinds.map((k) => ({ value: k.ref, label: k.label.replace(/メールアドレス$/, "") }))} value={kind} onChange={(v) => set("kind", v)} />
            )}
            <Button variant="secondary" disabled={!input.trim() || !a.addRef} onClick={() => run((c) => c.settings.addAddress(input, kind), false, "追加できませんでした")}>追加</Button>
          </div>
        </Section>
        <Section title={times.title} notes={times.notes} footer={saveButton(times.saveRef, { section: "times", checks: on })}>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {times.options.map((o) => <Checkbox key={o.ref} label={o.label} checked={isOn(o)} onChange={(c) => setOn(o.ref, c)} />)}
          </div>
        </Section>
        <Section title={stop.title} notes={stop.notes} footer={saveButton(stop.saveRef, { section: "stop", checks: on })}>
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
            <Button variant="secondary" disabled={!favorite.resetRef} onClick={() => run((c) => c.settings.resetFavorite(), false, "元に戻せませんでした")}>元に戻す</Button>
            {saveButton(favorite.saveRef, { section: "favorite" })}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select label="追加する機能" value={menu} options={favorite.menu.options} onChange={(v) => set(favorite.menu.ref, v)} />
          <Button variant="secondary" disabled={!menu || !favorite.addRef} onClick={() => run((c) => c.settings.addFavorite(menu), false, "追加できませんでした")}>追加</Button>
        </div>
        {/* 行の外し方(選択 + 削除)は実機にデータがなく未確認なので、一覧は読むだけ */}
        <Table t={favorite.table} isOn={isOn} setOn={setOn} />
      </Section>
    );
  }
  if (portal) {
    const sel = txt.portal ?? portal.options.find((o) => o.checked)?.ref ?? "";
    return (
      <Section title={portal.title} notes={portal.notes} footer={saveButton(portal.saveRef, { section: "portal", pick: sel })}>
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

/** 個人設定。タブは元の画面の TabView を押して切り替え、値は画面で持って、保存などで元の画面に入れて押す */
export function SettingsScreen({ client, initial }: { client: MuscatClient; doc?: Document; initial?: LiveState<SettingsPage> }) {
  const { status, page, error, busy = false, run } = useLiveScreen(client, read, initial);
  const [ask, setAsk] = useState<Op | null>(null);
  const [gen, setGen] = useState(0);
  // 操作のあとは元の画面の値で作り直す(追加した欄が空に戻るなど)
  // 失敗したときは作り直さない(入力途中の値が消える)
  const go = (op: Op, fail?: string) => void run(op, undefined, fail).then((ok) => ok && setGen((g) => g + 1));
  const active = page?.tabs.find((t) => t.active);
  // 出さないタブ(テーマ設定)が開いた状態で来たら、先頭のタブへ移る
  const first = page?.tabs[0];
  const stray = !!page && !active && !!first;
  useEffect(() => {
    if (stray && first) go((c) => c.press(first.ref), "タブを切り替えられませんでした");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stray]);
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3.5 p-4">
      {status === "error" && <ErrorCard>{error}</ErrorCard>}
      {status === "loading" && !page && <PageLoading />}
      {page && (
        <>
          <div role="tablist" className="flex flex-wrap border-b border-border max-[767px]:flex-nowrap max-[767px]:overflow-x-auto">
            {page.tabs.map((t) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={t.active}
                disabled={busy}
                // 読み込み済みのタブは通信しないので、待つと待ち時間切れまで止まった(実機で確認)
                onClick={() => !t.active && go((c) => c.press(t.ref), "タブを切り替えられませんでした")}
                className={`cursor-pointer border-0 bg-transparent px-4 py-2.5 text-sm max-[767px]:h-10 max-[767px]:shrink-0 max-[767px]:whitespace-nowrap max-[767px]:py-0 ${t.active ? "font-semibold text-primary shadow-[inset_0_-2px_0_var(--primary)]" : "text-muted-foreground hover:bg-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <BusyOverlay busy={busy}>
            <div key={`${active?.label}-${gen}`} className="flex flex-col gap-3.5">
              <Body page={page} run={(op, confirm, fail) => (confirm ? setAsk(() => op) : go(op, fail))} />
            </div>
          </BusyOverlay>
          {ask && <Confirm onCancel={() => setAsk(null)} onOk={() => { setAsk(null); go(ask, "保存できませんでした"); }} />}
        </>
      )}
    </div>
  );
}
