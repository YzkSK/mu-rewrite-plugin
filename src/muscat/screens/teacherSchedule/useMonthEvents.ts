import { useEffect, useRef, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { errorToast } from "@/ui/Toast";
import { gridRange } from "./monthGrid";

/**
 * 月表示の予定を、表の範囲(gridRange)で読む。月の移動・戻る判定もここにある。
 * read は呼び出し側のモジュール直下の定数にする(effect の依存になる)。enabled が false の間は読まない。
 * 失敗は、一度でも読めていれば月を移った失敗なのでトースト、まだ何も読めていなければ error に入れる。
 */
export function useMonthEvents<E>(client: MuscatClient, read: (c: MuscatClient, from: Date, to: Date) => Promise<E[]>, today: Date, enabled = true) {
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<E[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);
  const [tries, setTries] = useState(0); // 再読み込みのたびに増やして effect をやり直す
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    setError(null);
    const [from, to] = gridRange(month);
    read(client, from, to)
      .then((e) => live && (setEvents(e), (loadedOnce.current = true)))
      .catch((e: unknown) => {
        if (!live) return;
        setEvents([]); // 前の月の予定を残さない
        const message = e instanceof Error ? e.message : String(e);
        if (loadedOnce.current) errorToast("予定を読み込めませんでした", message);
        else setError(message);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [client, read, enabled, month, tries]);
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return {
    month,
    events,
    loading,
    error,
    retry: () => setTries((n) => n + 1),
    move,
    goThisMonth: () => setMonth(new Date(today.getFullYear(), today.getMonth(), 1)),
    isThisMonth: month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth(),
  };
}
