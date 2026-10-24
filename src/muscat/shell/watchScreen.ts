import { screenCodeOf } from "./screenCode";

const QUIET_MS = 120;

/**
 * 画面コードの変化を見張る。空(差し替えの途中)は無視し、前回と違う非空のコードだけ通知する。
 * ただしメニューがあるのにコードが opts.unknownAfterMs(既定 1500)空のままなら、ホームなどコードの無い画面として onChange("") を 1 回呼ぶ。
 * 戻り値は停止関数
 */
export function watchScreen(doc: Document, onChange: (code: string) => void, opts: { unknownAfterMs?: number } = {}): () => void {
  const unknownMs = opts.unknownAfterMs ?? 1500;
  let last: string | null = null;
  let unknownTimer: ReturnType<typeof setTimeout> | undefined;
  const hasMenu = () => !!doc.getElementById("menuForm:mainMenu");
  const notify = (code: string) => {
    last = code;
    onChange(code);
  };
  const check = () => {
    const code = screenCodeOf(doc);
    if (code) {
      clearTimeout(unknownTimer);
      unknownTimer = undefined;
      if (code !== last) notify(code);
    } else if (last !== "" && hasMenu() && doc.getElementById("portalCont")) {
      // ホームはコードを持たない。#portalCont で分かるので待たない(待つと移るたびに 1.5 秒白い)
      clearTimeout(unknownTimer);
      unknownTimer = undefined;
      notify("");
    } else if (last !== "" && unknownTimer === undefined && hasMenu()) {
      unknownTimer = setTimeout(() => {
        unknownTimer = undefined;
        if (!screenCodeOf(doc) && hasMenu()) notify("");
      }, unknownMs);
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(check, QUIET_MS);
  });
  observer.observe(doc.body, { subtree: true, childList: true });
  check();
  return () => {
    clearTimeout(timer);
    clearTimeout(unknownTimer);
    observer.disconnect();
  };
}
