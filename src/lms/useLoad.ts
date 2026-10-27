import { useCallback, useEffect, useRef, useState } from "react";
import { LoginRequiredError } from "./api";

/** 読み込みの定型。deps が変わるたびに取り直す(initial があれば最初の 1 回は取らない)。セッション切れは読み直す。古い応答は捨てる */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], initial?: T) {
  const seq = useRef(0);
  const skip = useRef(initial !== undefined);
  const [data, setData] = useState<T | null>(initial ?? null);
  const [failed, setFailed] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback((quiet: boolean) => {
    const n = ++seq.current;
    if (!quiet) setData(null);
    setFailed(false);
    fn().then((v) => { if (n === seq.current) setData(v); }, (e) => {
      if (n !== seq.current) return;
      if (e instanceof LoginRequiredError) location.reload(); else { console.error("[mu-lms]", e); setFailed(true); }
    });
  }, deps);
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    load(false);
  }, [load]);
  return { data, failed, reload: () => load(false), refresh: () => load(true) };
}
