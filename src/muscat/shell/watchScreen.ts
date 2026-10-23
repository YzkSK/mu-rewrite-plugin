import { screenCodeOf } from "./screenCode";

const QUIET_MS = 120;

/** 画面コードの変化を見張る。空(差し替えの途中)は無視し、前回と違う非空のコードだけ通知する。戻り値は停止関数 */
export function watchScreen(doc: Document, onChange: (code: string) => void): () => void {
  let last = "";
  const check = () => {
    const code = screenCodeOf(doc);
    if (code && code !== last) {
      last = code;
      onChange(code);
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
    observer.disconnect();
  };
}
