import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { CheckOption, SettingsPage, SettingsTable } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import type { LiveState } from "../useLiveScreen";
import { SettingsScreen } from "./SettingsScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState<SettingsPage>) => renderToString(<SettingsScreen client={client} doc={doc} initial={initial} />);

let n = 0;
const opt = (label: string, checked = false): CheckOption => ({ label, ref: `k${n++}`, checked });
const text = (label: string): CheckOption => ({ label, ref: "", checked: false }); // 枠の無い列
const empty: SettingsTable = { headers: ["用途", "カテゴリ", "配信停止"], rows: [] };
const mailPage = (busy = false): LiveState<SettingsPage> => ({
  status: "ready",
  busy,
  page: {
    tabs: [{ label: "メール設定", ref: "t1", active: true, loaded: true }, { label: "お気に入り機能設定", ref: "t2", active: false, loaded: false }, { label: "ポータル表示設定", ref: "t3", active: false, loaded: false }],
    confirmRef: "ok",
    portal: null,
    favorite: null,
    mail: {
      address: {
        title: "メールアドレス設定", notes: ["※追加ボタンをクリックすると追加されます。"], saveRef: "s1", input: { ref: "in", value: "" },
        kinds: [opt("連絡用メールアドレス", true), opt("任意メールアドレス")], addRef: "add", deleteRef: "del",
        table: { headers: ["メールアドレス", "種類"], rows: [{ select: opt(""), cells: [text("a@example.com"), text("連絡用")] }] },
      },
      times: { title: "配信時刻設定", notes: [], saveRef: "s2", options: ["00:00", "06:00", "08:00"].map((t) => opt(t)) },
      stop: { title: "配信停止設定", notes: [], saveRef: "s3", table: empty },
    },
  },
});

test("メール設定: タブ(テーマ設定なし)・節の見出し・アドレスの行・時刻・保存", () => {
  const html = render(mailPage());
  for (const s of ["メール設定", "お気に入り機能設定", "ポータル表示設定", "メールアドレス設定", "配信時刻設定", "配信停止設定", "a@example.com", "連絡用", "00:00", "08:00", "選択した行を削除", "追加するメールアドレス", "対象データがありません。", "※追加ボタン"]) expect(html).toContain(s);
  expect(html).not.toContain("テーマ設定");
  expect(html.match(/>保存</g)).toHaveLength(3);
  expect(html).toContain("shadow-[inset_0_-2px_0_var(--primary)]");
});

test("通信中は薄く(inert)、確認の小窓はまだ出ない", () => {
  const html = render(mailPage(true));
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain("保存します。よろしいですか？");
});

test("初回の読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "失敗しました" })).toContain("失敗しました");
});
