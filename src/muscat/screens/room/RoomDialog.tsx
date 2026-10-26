import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { RoomBar, RoomInfo, RoomRow } from "@/muscat/api/types";
import { Spin } from "@/ui/Spin";
import { errorMessage } from "../errorMessage";
import { hhmm } from "./roomKinds";

// ⓘ は教室ごとに決まっているので、取った分は画面を開いている間おぼえておく
const cache = new Map<string, RoomInfo>();
type Field = { label: string; value: string };
const details = new Map<string, Field[]>(); // 予約の詳細(帯の説明文ごと)

/**
 * 帯の説明文を分ける。予約は「00:00～24:00 予約番号：7727 TOEIC試験 堀 美紀」、授業は「13:10～14:50 月3 0010040201 英語基礎C [Ma-1] 榊原　かをり」の形(実機で確認)。
 * 形が違えば時刻以外をそのまま「内容」にする
 */
export function splitBarTitle(title: string): { time: string; fields: { label: string; value: string }[] } {
  const t = /^(\d{1,2}:\d{2})\s*[～~〜-]\s*(\d{1,2}:\d{2})\s*/.exec(title);
  const rest = t ? title.slice(t[0].length) : title;
  const time = t ? `${t[1]}〜${t[2]}` : "";
  // 最後の半角空白の後ろが人の名前(名前の中の区切りは全角空白「堀　美紀」)
  const who = (s: string) => /^(.*) ([^ ]+)$/.exec(s) ?? [s, s, ""];
  const booking = /^予約番号[：:]\s*(\S+)\s*(.*)$/.exec(rest);
  if (booking) {
    const [, what, by] = who(booking[2]!);
    return { time, fields: [{ label: "予約番号", value: booking[1]! }, { label: "予約者", value: by! }, { label: "利用目的", value: what! }] };
  }
  const lesson = /^(\S*\d)\s+(\d{6,})\s+(.*)$/.exec(rest);
  if (lesson) {
    const [, course, teacher] = who(lesson[3]!);
    return { time, fields: [{ label: "時限", value: lesson[1]! }, { label: "授業コード", value: lesson[2]! }, { label: "授業", value: course! }, { label: "教員", value: teacher! }] };
  }
  return { time, fields: [{ label: "内容", value: rest }] };
}

const Fields = ({ fields }: { fields: { label: string; value: string }[] }) => (
  <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5">
    {fields.map((f) => (
      <div key={f.label} className="contents">
        <dt className="whitespace-nowrap text-xs font-bold text-muted-foreground">{f.label}</dt>
        <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{f.value || "—"}</dd>
      </div>
    ))}
  </dl>
);

// track: 元の画面に送る通信を渡す。閉じた後も続くので、終わるまで検索を押させない(重なると新しい検索の結果が壊れる)
type Props = { client: MuscatClient; room: RoomRow; bar?: RoomBar; onClose: () => void; track: <T>(p: Promise<T>) => Promise<T> };

/** 予約の帯か ⓘ を押したときの小窓。帯ならその予約、ⓘ なら教室の情報(押したときに取る)を画面の真ん中に出す */
export function RoomDialog({ client, room, bar, onClose, track }: Props) {
  const [info, setInfo] = useState<RoomInfo | null>(() => (bar ? null : (cache.get(room.name) ?? null)));
  const [error, setError] = useState("");
  const booking = bar ? splitBarTitle(bar.title || bar.text) : null;
  // 予約は元の画面の「教室予約登録」、授業は小窓の中身を取る。届くまでは説明文から分けた分を出す
  const wantsDetail = !!bar && !!bar.title;
  const [detail, setDetail] = useState<Field[] | null>(() => (bar ? (details.get(bar.title) ?? null) : null));
  const [detailError, setDetailError] = useState("");
  useEffect(() => {
    if (!wantsDetail || !bar || details.has(bar.title)) return;
    let live = true;
    track(client.roomBooking(bar.title, bar.kind === "jugyo")).then(
      (d) => {
        details.set(bar.title, d);
        if (live) setDetail(d);
      },
      (e: unknown) => live && setDetailError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [client, bar, wantsDetail]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  useEffect(() => {
    if (bar || cache.has(room.name)) return;
    let live = true;
    track(client.roomInfo(room.name)).then(
      (i) => {
        cache.set(room.name, i);
        if (live) setInfo(i);
      },
      (e: unknown) => live && setError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [client, room.name, bar]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(31_26_36/.32)] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={room.name} className="flex max-h-[70vh] w-full max-w-md flex-col rounded-[4px] border border-border bg-card shadow-md">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <b className="block truncate text-sm">{room.name}</b>
            <span className="text-xs text-muted-foreground">{/* 時刻は説明文から(帯の位置からだと表の範囲 8:00〜で切れて食い違った。実機で確認) */}
            {booking ? `${room.date} ${booking.time || `${hhmm(bar!.start)}〜${hhmm(bar!.end)}`}` : (info?.place ?? "")}</span>
          </div>
          <button type="button" aria-label="閉じる" onClick={onClose} className="size-8 shrink-0 cursor-pointer rounded-[4px] border-0 bg-transparent hover:bg-muted">✕</button>
        </div>
        <div className="overflow-y-auto px-4 py-3 text-[13px]">
          {booking ? (
            <>
              {/* 教室名と日時は見出しに出ている */}
              <Fields fields={detail ? detail.filter((f) => f.label !== "教室名" && f.label !== "教室予約日時") : booking.fields} />
              {wantsDetail && !detail && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {detailError ? `詳細を取れませんでした: ${detailError}` : <><Spin className="size-3.5" />詳細を読み込み中</>}
                </div>
              )}
            </>
          ) : error ? (
            <p className="m-0 text-error">{error}</p>
          ) : !info ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Spin className="size-4" />教室の情報を読み込み中</div>
          ) : (
            <Fields fields={info.fields} />
          )}
        </div>
      </div>
    </div>
  );
}
