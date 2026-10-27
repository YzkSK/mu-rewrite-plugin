import { useCallback, useEffect, useState } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { LoginRequiredError } from "./api";
import { hasGrade, loadGradeDetail, loadGradeList, userUrl, type GradeCourse, type GradeDetail } from "./grades";
import { Box, Note } from "./parts";

const TH = "border-b border-border bg-muted px-3 py-1.5 text-left text-[12px] font-semibold text-muted-foreground";
const TD = "border-b border-border px-3 py-2 align-top text-[13px] [overflow-wrap:anywhere]";

function Detail({ d }: { d: GradeDetail }) {
  const t = d.total;
  return (
    <>
      {t ? (
        <p className="m-0 flex flex-wrap items-baseline gap-x-3 border-b border-border px-4 py-3 text-[13px]">
          <span className="font-semibold">コース合計</span>
          <span className="text-[18px] font-semibold">{t.grade || "-"}</span>
          {d.showPercent && t.percent ? <span className="text-muted-foreground">{t.percent}</span> : null}
        </p>
      ) : null}
      {!d.items.length ? <Note>評定の項目がありません</Note> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>項目</th><th className={TH}>種類</th><th className={TH}>評点</th>
                {d.showPercent ? <th className={TH}>パーセンテージ</th> : null}
                <th className={TH}>フィードバック</th>
                {d.showContrib ? <th className={TH}>コース合計への寄与</th> : null}
              </tr>
            </thead>
            <tbody>
              {d.items.map((i, k) => (
                <tr key={k}>
                  <td className={TD}>{i.name}</td><td className={`${TD} whitespace-nowrap text-muted-foreground`}>{i.kind}</td><td className={`${TD} whitespace-nowrap`}>{i.grade || "-"}</td>
                  {d.showPercent ? <td className={`${TD} whitespace-nowrap`}>{i.percent}</td> : null}
                  <td className={TD}>{i.feedback}</td>
                  {d.showContrib ? <td className={`${TD} whitespace-nowrap`}>{i.contrib}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

type Props = { list: GradeCourse[] | null; id: number | null; detail?: GradeDetail };

const onError = (set: (b: boolean) => void) => (e: unknown) => {
  if (e instanceof LoginRequiredError) location.reload(); else { console.error("[mu-lms]", e); set(true); }
};

/** 成績。左にコース、右に選んだコースの評定。list が null なら一覧を取りに行く(コースの評定のページで開いたとき) */
export function GradesScreen({ list: first, id: firstId, detail: firstDetail }: Props) {
  const [list, setList] = useState<GradeCourse[] | null>(first);
  const [listFailed, setListFailed] = useState(false);
  const [only, setOnly] = useState(true);
  const [id, setId] = useState<number | null>(firstId);
  const [detail, setDetail] = useState<GradeDetail | null>(firstDetail ?? null);
  const [detailFailed, setDetailFailed] = useState(false);

  const loadList = useCallback(() => {
    setList(null);
    setListFailed(false);
    loadGradeList().then(setList, onError(setListFailed));
  }, []);
  useEffect(() => { if (!first) loadList(); }, [first, loadList]);

  // 選ばれていなければ、見えている一覧の先頭
  const withGrade = list?.filter(hasGrade) ?? [];
  const shown = list && only && withGrade.length ? withGrade : list ?? [];
  const current = id ?? shown[0]?.id ?? null;

  const loadDetail = useCallback((c: number) => {
    setDetail(null);
    setDetailFailed(false);
    loadGradeDetail(c).then(setDetail, onError(setDetailFailed));
  }, []);
  useEffect(() => {
    if (current === null || (firstDetail && current === firstId)) return;
    let stop = false;
    setDetail(null);
    setDetailFailed(false);
    loadGradeDetail(current).then((d) => { if (!stop) setDetail(d); }, (e) => { if (!stop) onError(setDetailFailed)(e); });
    return () => { stop = true; };
  }, [current, firstDetail, firstId]);

  const pick = (c: number) => {
    setId(c);
    try { history.replaceState(null, "", userUrl(c)); } catch { /* 書き換えられなくても画面は動く */ }
  };

  if (listFailed) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="成績の一覧を取得できませんでした。" onRetry={loadList} /></div>;
  if (!list) return <PageLoading title="成績" />;
  if (!list.length) return <div className="p-4"><Box title="成績"><Note>成績のあるコースはありません</Note></Box></div>;

  return (
    // 右の中身の幅で折り返さないよう、広い画面は 2 列のグリッドに固定する
    <div className="mx-auto grid w-full max-w-[1200px] items-start gap-4 p-4 min-[800px]:grid-cols-[300px_minmax(0,1fr)]">
      <div className="min-w-0">
        <Box title="コース">
          <label className="flex items-center gap-2 border-b border-border px-4 py-2 text-[12.5px] text-muted-foreground">
            <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />
            評定のあるコースだけ
          </label>
          <ul className="m-0 list-none p-0">
            {shown.map((c) => (
              <li key={c.id} className="border-b border-border last:border-b-0">
                <button type="button" aria-current={c.id === current ? "true" : undefined} onClick={() => pick(c.id)} className={`flex w-full cursor-pointer items-baseline justify-between gap-3 px-4 py-2 text-left text-[13px] hover:bg-muted ${c.id === current ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : ""}`}>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{c.name}</span>
                  <span className="flex-none text-muted-foreground">{c.grade || "-"}</span>
                </button>
              </li>
            ))}
          </ul>
        </Box>
      </div>
      <div className="min-w-0">
        <Box title={list.find((c) => c.id === current)?.name ?? "評定"}>
          {detailFailed ? <div className="p-4"><ErrorNotice title="読み込めませんでした" message="評定を取得できませんでした。" onRetry={current === null ? undefined : () => loadDetail(current)} /></div>
            : !detail ? <PageLoading title="評定" />
            : <Detail d={detail} />}
        </Box>
      </div>
    </div>
  );
}
