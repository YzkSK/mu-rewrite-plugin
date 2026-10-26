import type { RoomRow } from "@/muscat/api/types";

/** 続きの教室を [] が返るまで取り、届くたびに add する。current が false になったら(新しい検索・日の移動)届いた分を捨てて止まる。最後まで取れたら true */
export async function drainRooms(more: () => Promise<RoomRow[]>, add: (rows: RoomRow[]) => void, current: () => boolean): Promise<boolean> {
  while (current()) {
    const rows = await more();
    if (!current()) return false;
    if (!rows.length) return true;
    add(rows);
  }
  return false;
}

/**
 * サーバーは約 340 件ずつのページで返す。ページの続きを取り切るたびに next(元の画面の「次へ」と同じ通信)で次のページへ進み、
 * それも取り切る。next が null(最後のページ)か、新しい教室が無ければ終わり。ページの境目で重ならないよう日付 + 名前で捨てる
 */
export async function drainAllPages(more: () => Promise<RoomRow[]>, next: () => Promise<RoomRow[] | null>, add: (rows: RoomRow[]) => void, current: () => boolean, seen: RoomRow[]): Promise<boolean> {
  const keys = new Set(seen.map((r) => `${r.date}|${r.name}`));
  let date = seen.at(-1)?.date ?? "";
  // 続きの先頭には日付の行が無いので、前の教室の日付を引き継いでから重なりを見る
  const fresh = (rows: RoomRow[]) =>
    rows.map((r) => ({ ...r, date: (date = r.date || date) })).filter((r) => !keys.has(`${r.date}|${r.name}`) && keys.add(`${r.date}|${r.name}`));
  for (let page = 0; page < 10; page++) { // 999 件の上限で 3 ページほどまで。万一回り続けないための打ち切り
    if (!(await drainRooms(more, (rows) => add(fresh(rows)), current))) return false;
    const rows = await next();
    if (!current()) return false;
    const added = rows && fresh(rows);
    if (!added?.length) return true;
    add(added);
  }
  return true;
}
