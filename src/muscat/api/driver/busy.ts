const SEL = ".ui-blockui, .ui-blockui-content";

export type WaitOpts = { startMs?: number; timeoutMs?: number; quietMs?: number };
export type WaitResult = "done" | "none" | "timeout";

/** PrimeFaces の通信中の表示(BlockUI)が出ているか */
export function isBusy(doc: Document): boolean {
  return [...doc.querySelectorAll<HTMLElement>(SEL)].some(
    (e) => !!e.style.display && e.style.display !== "none" && !e.classList.contains("ui-helper-hidden"),
  );
}

/**
 * 通信の終わりを待つ。呼んだ時点から監視を始めるので、click の前に呼んでおける。
 * startMs 以内に busy にならなければ "none"。busy が終わって quietMs 静かなら "done"。timeoutMs で "timeout"。
 */
export function waitForAjax(doc: Document, opts: WaitOpts = {}): Promise<WaitResult> {
  const { startMs = 600, timeoutMs = 15000, quietMs = 80 } = opts;
  return new Promise((resolve) => {
    let sawBusy = false;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => check());
    const start = setTimeout(() => !sawBusy && finish("none"), startMs);
    const limit = setTimeout(() => finish("timeout"), timeoutMs);
    function finish(r: WaitResult) {
      clearTimeout(start);
      clearTimeout(limit);
      clearTimeout(quiet);
      observer.disconnect();
      resolve(r);
    }
    function check() {
      if (isBusy(doc)) {
        sawBusy = true;
        clearTimeout(quiet);
        quiet = undefined;
      } else if (sawBusy && quiet === undefined) {
        quiet = setTimeout(() => finish("done"), quietMs);
      }
    }
    observer.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class"] });
    check();
  });
}
