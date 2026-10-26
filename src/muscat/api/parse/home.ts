import { assignRef } from "../driver/locator";
import { ParseError } from "../errors";
import type { HomePage } from "../types";
import { parseNewsDetail } from "./newsDetail";
import { parseHomeDay } from "./homeDay";
import { parseHomeNotices } from "./homeNotices";

const linkRef = (root: Document, icon: string) => {
  const a = root.querySelector(`#portalCont .infoIcon.${icon}`)?.closest("a");
  return a ? assignRef(a) : "";
};

/**
 * ホーム(#portalCont)を読む。
 * 副作用: 操作する要素(お知らせのタブ・件名、インフォメーションのリンク、詳細のボタン)に data-mu-ref を付ける
 */
export function parseHome(root: Document): HomePage {
  if (!root.getElementById("portalCont")) throw new ParseError("portalCont がありません");
  const num = /\d+/.exec(root.querySelector("#portalCont p.newNumber")?.textContent ?? "")?.[0];
  return {
    unreadKeiji: num === undefined ? null : Number(num),
    keijiRef: linkRef(root, "infoKeiji"),
    timetableChangeRef: linkRef(root, "infoTimetable"),
    notices: parseHomeNotices(root),
    day: parseHomeDay(root),
    detail: parseNewsDetail(root),
  };
}
