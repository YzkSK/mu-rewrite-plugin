// アンケート(mod_questionnaire)は提出できるかを返さず、完了条件が無いと回答しても予定が消えない
const isQ = (e) => e.modulename === "questionnaire";

/** アンケートのページに「自分の回答」へのリンクがあれば回答済み(ソース由来の推測。実機未確認) */
export const answered = (html) => /\/mod\/questionnaire\/myreport\.php/.test(html);

/** 締め切られた(もう出せない)。アンケートは actionable が常に true なので期限だけで決める */
export const isClosed = (e) => !!e.overdue && (isQ(e) || !e.action?.actionable);

/** アンケートの開始の予定と、回答済みのアンケートを除く。fetchText は失敗時 "" を返すこと */
export async function pruneEvents(events, fetchText) {
  const rest = events.filter((e) => !(isQ(e) && e.eventtype === "open"));
  const skip = await Promise.all(
    rest.map(async (e) => {
      if (!isQ(e)) return false;
      try {
        return answered(await fetchText(e.url));
      } catch {
        return false; // 取れないときは未回答のまま残す
      }
    }),
  );
  return rest.filter((_, i) => !skip[i]);
}
