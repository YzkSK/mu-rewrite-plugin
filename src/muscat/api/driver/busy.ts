export type XhrEntry = { startTime: number };
/** XHR / fetch の完了を受け取る。戻り値は停止関数 */
export type ObserveXhr = (onEntry: (e: XhrEntry) => void) => () => void;
export type WaitOpts = {
  /** この間に XHR が来なければ "none"。既定は expectAjax なら 5000、でなければ 250 */
  startMs?: number;
  timeoutMs?: number;
  /** 最後の XHR / DOM の変化からこれだけ静かなら "done" */
  quietMs?: number;
  /** ajax を起こすと分かっている操作。XHR は完了時にしか分からないので、長く待つ */
  expectAjax?: boolean;
  /** 差し替え用(PerformanceObserver が無い環境のテスト) */
  observeXhr?: ObserveXhr;
};
export type WaitResult = "done" | "none" | "timeout";

/** 本番の観測: ページの XHR / fetch の完了(resource timing)。BlockUI は実機では通信中の印にならない */
export const observeResources: ObserveXhr = (onEntry) => {
  if (typeof PerformanceObserver === "undefined") return () => {};
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const t = (e as PerformanceResourceTiming).initiatorType;
      if (t === "xmlhttprequest" || t === "fetch") onEntry(e);
    }
  });
  po.observe({ type: "resource", buffered: false });
  return () => po.disconnect();
};

/**
 * 通信の終わりを待つ。click / set の前に呼ぶ(呼んだ時点から監視を始める)。
 * "done": XHR を受け取り、最後の XHR と最後の DOM 変化のどちらからも quietMs たった。
 * "none": XHR が来ないまま startMs が過ぎた。"timeout": timeoutMs。属性の変化は見ない。
 */
export function waitForAjax(doc: Document, opts: WaitOpts = {}): Promise<WaitResult> {
  const { expectAjax = false, timeoutMs = 15000, quietMs = 150, observeXhr = observeResources } = opts;
  const startMs = opts.startMs ?? (expectAjax ? 5000 : 250);
  return new Promise((resolve) => {
    const t0 = performance.now();
    let xhrs = 0;
    let lastXhr = 0;
    let lastDom = 0;
    const stopXhr = observeXhr((e) => {
      if (e.startTime < t0 - 5) return;
      xhrs++;
      lastXhr = performance.now();
    });
    const mo = new MutationObserver(() => (lastDom = performance.now()));
    mo.observe(doc.body, { subtree: true, childList: true, characterData: true });
    const timer = setInterval(() => {
      const now = performance.now();
      if (xhrs > 0 && now - lastXhr >= quietMs && now - lastDom >= quietMs) finish("done");
      else if (xhrs === 0 && now - t0 >= startMs) finish("none");
      else if (now - t0 >= timeoutMs) finish("timeout");
    }, 10);
    function finish(r: WaitResult) {
      clearInterval(timer);
      stopXhr();
      mo.disconnect();
      resolve(r);
    }
  });
}
