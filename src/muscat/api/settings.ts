import type { Core } from "./core";
import type { DriveStep } from "./driver/drive";
import { ParseError } from "./errors";
import { parseSettings } from "./parse/settings";
import type { CheckOption, SettingsPage } from "./types";

/** 保存する節と、画面で持っている値。checks は ref → 入れた状態、pick は選んだラジオの ref */
export type SettingsSave =
  | { section: "address" }
  | { section: "favorite" }
  | { section: "times"; checks: Record<string, boolean> }
  | { section: "stop"; checks: Record<string, boolean> }
  | { section: "portal"; pick: string };

/** 生きたページの個人設定を読む。操作は press や下の操作名で、読んだ結果の ref を使う */
export const readSettings = (core: Core): Promise<SettingsPage> => core.runLive(async (live) => parseSettings(live.doc));

const click = (ref: string): DriveStep => ({ kind: "click", ref });
/** 画面の値と違うチェックだけ、元の画面の枠を押す */
const flips = (items: CheckOption[], on: Record<string, boolean>): DriveStep[] => items.filter((c) => c.ref && (on[c.ref] ?? c.checked) !== c.checked).map((c) => click(c.ref));
/** ラジオは選んだものが今の選択と違うときだけ押す */
const pick = (items: CheckOption[], ref: string): DriveStep[] => items.filter((c) => c.ref === ref && !c.checked).map((c) => click(c.ref));

/** 同じ複製を読み直して手順を作り、1 回で drive する(読んだ時から描き直されていても ref が外れない) */
const drive = (core: Core, build: (p: SettingsPage) => DriveStep[]): Promise<void> =>
  core.runLive(async (live) => {
    await live.drive(build(parseSettings(live.doc)));
  });

const need = <T>(v: T | null | undefined | "", what: string): T => {
  if (!v) throw new ParseError(`個人設定の${what}がありません`);
  return v;
};

/** 保存は、節の「保存」→ 確認の OK(確認の小窓は画面が先に出す) */
export const saveSettings = (core: Core, s: SettingsSave): Promise<void> =>
  drive(core, (p) => {
    const confirmRef = need(p.confirmRef, "確認の OK");
    let pre: DriveStep[] = [];
    let saveRef = "";
    if (s.section === "favorite") saveRef = need(p.favorite, "お気に入り機能の節").saveRef;
    else if (s.section === "portal") {
      const portal = need(p.portal, "ポータル表示の節");
      saveRef = portal.saveRef;
      pre = pick(portal.options, s.pick);
    } else if (s.section === "address") saveRef = need(p.mail, "メール設定の節").address.saveRef;
    else {
      const mail = need(p.mail, "メール設定の節");
      const t = s.section === "times" ? mail.times : mail.stop;
      saveRef = t.saveRef;
      pre = flips("options" in t ? t.options : t.table.rows.flatMap((r) => r.cells), s.checks);
    }
    return [...pre, click(need(saveRef, "保存ボタン")), click(confirmRef)];
  });

/** 選んだ行(selected: select の ref → 入れた状態)を削除 */
export const deleteAddresses = (core: Core, selected: Record<string, boolean>): Promise<void> =>
  drive(core, (p) => {
    const a = need(p.mail, "メール設定の節").address;
    return [...flips(a.table.rows.map((r) => r.select), selected), click(need(a.deleteRef, "削除ボタン"))];
  });

export const addAddress = (core: Core, value: string, kindRef: string): Promise<void> =>
  drive(core, (p) => {
    const a = need(p.mail, "メール設定の節").address;
    return [{ kind: "set", ref: a.input.ref, value }, ...pick(a.kinds, kindRef), click(need(a.addRef, "追加ボタン"))];
  });

export const addFavorite = (core: Core, menuValue: string): Promise<void> =>
  drive(core, (p) => {
    const f = need(p.favorite, "お気に入り機能の節");
    return [{ kind: "set", ref: f.menu.ref, value: menuValue }, click(need(f.addRef, "追加ボタン"))];
  });

export const resetFavorite = (core: Core): Promise<void> =>
  drive(core, (p) => [click(need(need(p.favorite, "お気に入り機能の節").resetRef, "元に戻すボタン"))]);
