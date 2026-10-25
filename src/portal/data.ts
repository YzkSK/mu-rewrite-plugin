import { fetchCalendar, fetchInfo, fetchPageView, fetchTree, readUserName, type InfoList, type PageNode } from "./api";
import { findBlocks, infoQuery, linkLabel, pickBlocks, type Block, type CalEvent } from "./lib/lib";
import { fetchLmsDue, type LmsResult } from "./lib/lms";
import { isHttp } from "./lib/sanitize";

import { TOP } from "./route";

export { TOP };
export const isPersonal = (h: unknown): boolean => h === "個人呼出" || h === "個人通知"; // 同じ個人向けカードの別名

export type CalendarData = { header: string; sources: string[]; addOutLook: boolean; first: CalEvent[] | null };
export type TopData = {
  muscatUrl: string | null;
  lmsUrl: string | null;
  links: { href: string; text: string }[];
  callout: string | null;
  personal: InfoList | null; // null は読み込み失敗
  news: InfoList | null;
  calendar: CalendarData | null; // null はブロックなし。first が null なら失敗
  lms: LmsResult;
};
export type PortalData = { tree: PageNode[]; userName: string; top: TopData };

type LinkRow = { href: string; text: string };

/** linkBox の items から http(s) のリンクだけ取る。形が違うブロックは捨てる */
export function linkRows(data: Record<string, any>): LinkRow[] {
  if (!Array.isArray(data.items)) return [];
  const rows = data.items.map((i: any) => {
    const href = [i?.link, i?.url, i?.href].find((v) => typeof v === "string");
    const text = [i?.title, i?.name, i?.text].find((v) => typeof v === "string");
    return href && text && isHttp(href) ? { href, text } : null;
  });
  return rows.every(Boolean) ? (rows as LinkRow[]) : [];
}

const safe = <T,>(p: Promise<T>): Promise<T | null> => p.catch((e) => { console.error("[mu-portal]", e); return null; });

/** LMS は遅いことがあるので 5 秒で見切る */
const lmsCapped = (): Promise<LmsResult> =>
  Promise.race([fetchLmsDue(), new Promise<LmsResult>((r) => setTimeout(() => r({ error: "timeout" }), 5000))]);

/** トップページに要るデータを全部いっぺんに取る。ページ本体が取れなければ throw(元のUIに戻す) */
export async function loadTop(): Promise<PortalData> {
  const lms = lmsCapped();
  const [page, tree, userName] = await Promise.all([fetchPageView(TOP), safe(fetchTree()), readUserName()]);
  const blocks = pickBlocks(page, "ja");
  if (!blocks) throw new Error("page has no blocks");
  const notes = findBlocks(blocks, "notification");
  const personalBlocks = notes.filter((b) => isPersonal(b.data?.header));
  const newsBlock = notes.find((b) => !isPersonal(b.data?.header));
  const cal = findBlocks(blocks, "calendar")[0]?.data;
  const now = new Date();
  const [personalLists, news, first] = await Promise.all([
    safe(Promise.all(personalBlocks.map((b) => fetchInfo(infoQuery(b.data ?? {}))))),
    newsBlock ? safe(fetchInfo(infoQuery(newsBlock.data ?? {}))) : Promise.resolve(null),
    cal ? safe(fetchCalendar(cal.sources ?? [], !!cal.addOutLook, now.getFullYear(), now.getMonth() + 1)) : Promise.resolve(null),
  ]);
  return { tree: tree ?? [], userName, top: {
    ...fromBlocks(blocks),
    personal: personalLists && { items: personalLists.flatMap((l) => l.items), count: null },
    news,
    calendar: cal ? { header: cal.header || "学年暦", sources: cal.sources ?? [], addOutLook: !!cal.addOutLook, first } : null,
    lms: await lms,
  } };
}

/** ブロックだけから決まる部分(通信なし) */
export function fromBlocks(blocks: Block[]): Pick<TopData, "muscatUrl" | "lmsUrl" | "links" | "callout"> {
  const urls = findBlocks(blocks, "image").map((b) => b.data?.link).filter((l): l is string => typeof l === "string" && isHttp(l));
  const by = (label: string) => urls.find((u) => linkLabel(u) === label) ?? null;
  return {
    muscatUrl: by("MUSCAT"),
    lmsUrl: by("MU LMS"),
    links: findBlocks(blocks, "linkBox").flatMap((b) => linkRows(b.data ?? {})),
    callout: findBlocks(blocks, "callout")[0]?.data?.text ?? null,
  };
}
