import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";
import type { DayEvent } from "./monthGrid";

type Props<K extends string> = {
  date: string;
  events: DayEvent<K>[];
  /** 行の色・地 */
  rowClass: (e: DayEvent<K>) => string;
  /** 行に出す文字 */
  rowText: (e: DayEvent<K>) => string;
  onClose: () => void;
};

/** その日の予定の一覧。マスの中に出すと後ろのマスが上に重なって読めず、✕も押せなかった(実機で確認)ので、画面の真ん中に出す */
export function DayEventsDialog<K extends string>({ date, events, rowClass, rowText, onClose }: Props<K>) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(31_26_36/.32)] p-4 max-[767px]:place-items-end max-[767px]:p-0" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* 狭い画面は画面下からのシート(左右いっぱい) */}
      <div role="dialog" aria-label={`${date} の予定`} className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-[4px] border border-border bg-card shadow-md max-[767px]:max-w-none max-[767px]:rounded-b-none max-[767px]:border-x-0 max-[767px]:border-b-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <b className="text-sm">{`${date.replaceAll("-", "/")} の予定 ${events.length} 件`}</b>
          <button type="button" aria-label="閉じる" onClick={onClose} className="grid size-8 cursor-pointer place-items-center rounded-[4px] border-0 bg-transparent hover:bg-muted max-[767px]:size-9"><IconX size={20} /></button>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 overflow-y-auto p-3">
          {events.map((e, j) => (
            <li key={j} className={`rounded-[2px] px-2 py-1 text-[13px] ${rowClass(e)}`}>{rowText(e)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
