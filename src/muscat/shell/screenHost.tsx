import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { NativeContext } from "@/ui/NativeLink";
import { ErrorToast, errorToast } from "@/ui/Toast";
import type { MuscatClient } from "../api/client";
import { HOME_LABEL } from "../api/labels";
import { readMenuGroups } from "../api/menuGroups";
import { readMenuIds } from "../api/menuIds";
import { errorMessage } from "../screens/errorMessage";
import { subs } from "../screens/useBackClose";
import { SupersededError } from "../api/errors";
import { popAction, popDirection, pushEntry, replaceEntry, screenHistoryOp } from "./history";
import { App } from "./App";
import { drawerItems, lastLoginOf, loginUserOf } from "./drawerItems";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import { isHomeScreen, resolveScreen } from "./resolveScreen";
import { screenCodeOf } from "./screenCode";
import type { ScreenDef } from "./screens";

/** シェルが外へ頼む操作(ページの移動・元の画面へ出る) */
export type ShellActions = { assign(url: string): void; openNative(): void };
/** 画面が替わるたびに呼ぶ(描画の直後)。screen は null なら表示できない画面 */
export type OnScreen = (screen: ScreenDef | null, home: boolean) => void;

let current: { root: Root } | null = null;

/**
 * サイドバー + 今の画面。今の画面は client が持つ(移動のたびに別の Document になる)ので、ここでは見張らず、その画面コードから選ぶ。
 * 移動のたびに App ごと作り直す(画面の中の状態を持ち越さない。元の画面を移っていたころと同じ)
 */
function Shell({ client, actions, onScreen }: { client: MuscatClient; actions: ShellActions; onScreen: OnScreen }) {
  const { doc, seq } = useSyncExternalStore(client.subscribe, client.shown);
  const code = screenCodeOf(doc);
  const screen = resolveScreen(code, doc);
  const home = isHomeScreen(code, doc);
  const fail = (e: unknown) => errorToast("画面を開けませんでした", errorMessage(e));
  // 履歴に残した今の画面の名前(client.navigate に渡せる名前。復元の reportScreen と同じ)。戻る・進むで移る先も先に入れ、移った結果で積み直さない
  const label = useRef<string | null>(null);
  useLayoutEffect(() => {
    onScreen(screen, home);
    const name = home ? HOME_LABEL : screen?.title;
    const op = screenHistoryOp(label.current, name);
    if (!op) return;
    label.current = name!;
    // 元の MUSCAT はどの画面も同じ URL への POST なので、戻るボタンのために履歴を自分で積む
    if (op === "replace") replaceEntry({ mu: "screen", label: name });
    else pushEntry({ mu: "screen", label: name });
  }, [seq]); // 画面が替わったときだけ
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const act = popAction(e.state, label.current, subs.open, popDirection(e.state));
      if (act === "back") return void history.back();
      if (act === "forward") return void history.forward();
      if (!act) return;
      const prev = label.current;
      label.current = act.go;
      void client.navigate(act.go).catch((err) => {
        // 続けて戻る・進むを押すと前の移動は打ち切られる(SupersededError)。そのときは後の移動に任せる
        if (err instanceof SupersededError) return;
        if (label.current === act.go) label.current = prev;
        fail(err);
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [client]);

  const ids = readMenuIds(doc);
  const found = readMenuGroups(doc);
  // グループが読めなくても項目は出す
  const groups = found.length ? found : Object.keys(ids).length ? [{ title: "メニュー", labels: Object.keys(ids) }] : [];
  const title = screen?.title ?? "MUSCAT";
  const model = drawerItems(
    {
      go: (label) => void client.navigate(label).catch(fail),
      logout: () => void client.logout().then((url) => actions.assign(url), fail),
      openNative: actions.openNative,
    },
    groups,
    title,
  );
  return (
    <NativeContext value={actions.openNative}>
      <App key={seq} title={title} model={model} user={loginUserOf(doc)} lastLogin={lastLoginOf(doc)}>
        {screen ? (
          screen.render(client, doc)
        ) : (
          <div className="p-4">
            <ErrorNotice title="この画面を表示できませんでした" message="MUSCAT の応答を読み取れませんでした" />
          </div>
        )}
      </App>
      <ErrorToast />
    </NativeContext>
  );
}

/** シェルを Shadow DOM に描く。描き終えてから返る(覆いを外すのはその後。render は後で描くので、すぐ外すと 1 コマだけ元の白い地が見える。実機で確認) */
export function mountShell(client: MuscatClient, actions: ShellActions, onScreen: OnScreen): void {
  unmountShell();
  const mountPoint = document.createElement("div");
  mountShadowRoot(document, css).appendChild(mountPoint);
  const root = createRoot(mountPoint);
  current = { root };
  flushSync(() => root.render(<Shell client={client} actions={actions} onScreen={onScreen} />));
}

/** 描画を止めて元の本文を戻す。描画中でなければ何もしない */
export function unmountShell(): void {
  if (!current) return;
  current.root.unmount();
  current = null;
  unmountShadowRoot(document);
}
