import type { Core } from "./core";
import { ParseError } from "./errors";
import { parseHome } from "./parse/home";
import type { DriveStep } from "./driver/drive";
import type { HomePage } from "./types";

/** 生きたページのホームを読む。操作は press で、読んだ結果の ref を使う */
export const readHome = (core: Core): Promise<HomePage> => core.runLive(async (live) => parseHome(live.doc));

const DATE = /(\d{4})\/(\d{1,2})\/(\d{1,2})(\(.\))?/;

/** 画面の日付が now から何日先か(前なら負)。読めなければ 0 */
export const daysFrom = (date: string, now: Date) => {
  const m = DATE.exec(date);
  if (!m) return 0;
  const day = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((day - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
};

/**
 * 日表示を date の日に揃える。引き出しが裏でホームを取り直すと、サーバー側の日表示は「今日」に戻る(画面は見ていた日のまま)。
 * 「今日」を押してから、見ていた日まで送り直して揃える(実機で確認)
 */
export const showDayHome = (core: Core, date: string, now: Date = new Date()): Promise<void> =>
  core.runLive(async (live) => {
    const nav = parseHome(live.doc).day?.nav;
    if (!nav?.today) throw new ParseError("ホームの「今日」ボタンがありません");
    const diff = daysFrom(date, now);
    const step = diff > 0 ? nav.nextDay : nav.prevDay;
    const click = (ref: string): DriveStep => ({ kind: "click", ref });
    await live.drive([click(nav.today), ...Array.from({ length: Math.abs(diff) }, () => click(step))]);
  });
