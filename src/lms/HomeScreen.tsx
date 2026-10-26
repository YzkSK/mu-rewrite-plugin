import { useCallback, useEffect, useState } from "react";
import { PERIODS } from "@/muscat/screens/home/dayRows";
import { fmtDue } from "@/portal/lib/lib";
import { courseName } from "@/portal/lib/lms";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { groupDue, loadHome, remain, type Due, type HomeData, type News, type Recent } from "./home";
import { loadCourses, termOfMonth, todayClasses, type MyCourse } from "./courses";
import { useSlots, type SlotMap } from "./muscatSlots";
import { Box, Note, Row } from "./parts";

const LINK = "text-[12.5px] text-primary hover:underline";
const KIND: Record<string, string> = { assign: "課題", quiz: "小テスト", forum: "フォーラム" };


function DueRow({ e, now }: { e: Due; now: number }) {
  const state = e.overdue ? (e.canSubmit ? "まだ出せる" : "締切") : remain(e.due, now);
  return (
    <Row>
      <span className={`w-24 flex-none text-[12.5px] ${e.overdue ? "text-error" : "text-muted-foreground"}`}>{fmtDue(e.due)}</span>
      <span className="min-w-0 flex-1">
        <a className="block text-[13.5px] font-semibold text-foreground hover:underline [overflow-wrap:anywhere]" href={e.url}>{e.name}</a>
        <span className="block text-[12px] text-muted-foreground">{[KIND[e.kind] ?? e.kind, e.course].filter(Boolean).join("、")}</span>
      </span>
      <span className={`h-fit flex-none whitespace-nowrap rounded-[3px] border px-1.5 text-[11px] leading-[18px] ${e.overdue ? "border-error text-error" : "border-border text-muted-foreground"}`}>{state}</span>
    </Row>
  );
}

function DueBox({ due, now }: { due: Due[] | null; now: number }) {
  const g = due ? groupDue(due, now) : null;
  const groups = g ? ([["期限切れ・未提出", g.overdue], ["今週", g.week], ["それより先", g.later]] as const).filter(([, l]) => l.length) : [];
  return (
    <Box title="提出期限" actions={g?.overdue.length ? <span className="rounded-[3px] bg-error px-1.5 text-[11px] font-semibold leading-[17px] text-error-foreground">{`期限切れ ${g.overdue.length}`}</span> : null}>
      {!due ? <Note>読み込めませんでした</Note>
        : !groups.length ? <Note>提出期限のある課題はありません</Note>
        : (
          <>
            {groups.map(([label, list]) => (
              <div key={label}>
                <h3 className="m-0 border-b border-border bg-muted px-4 py-1 text-[12px] font-semibold text-muted-foreground">{label}</h3>
                <ul className="m-0 list-none p-0">{list.map((e, i) => <DueRow key={i} e={e} now={now} />)}</ul>
              </div>
            ))}
            <p className="m-0 border-t border-border px-4 py-2 text-[11.5px] text-muted-foreground">提出済みの課題は出ません</p>
          </>
        )}
    </Box>
  );
}

function NewsBox({ news }: { news: News[] | null }) {
  return (
    <Box title="新着のアナウンス">
      {!news ? <Note>読み込めませんでした</Note>
        : !news.length ? <Note>新しいアナウンスはありません</Note>
        : (
          <ul className="m-0 list-none p-0">
            {news.map((n, i) => {
              const d = n.at === null ? null : new Date(n.at);
              return (
                <Row key={i}>
                  <span className="min-w-0 flex-1">
                    <a className="block text-[13.5px] font-semibold text-foreground hover:underline [overflow-wrap:anywhere]" href={n.url}>{n.subject}</a>
                    <span className="block text-[12px] text-muted-foreground">{[n.author, d && `${d.getMonth() + 1}/${d.getDate()}`].filter(Boolean).join("、")}</span>
                  </span>
                </Row>
              );
            })}
          </ul>
        )}
    </Box>
  );
}

function RecentBox({ recent }: { recent: Recent[] | null }) {
  return (
    <Box title="最近開いたコース" actions={<a className={LINK} href="/my/courses.php">マイコース</a>}>
      {!recent ? <Note>読み込めませんでした</Note>
        : !recent.length ? <Note>最近開いたコースはありません</Note>
        : (
          <ul className="m-0 list-none p-0">
            {recent.map((c) => (
              <Row key={c.id}><a className="min-w-0 flex-1 text-[13.5px] text-foreground hover:underline [overflow-wrap:anywhere]" href={c.url}>{c.name}</a></Row>
            ))}
          </ul>
        )}
    </Box>
  );
}

function TodayBox({ list }: { list: ReturnType<typeof todayClasses> }) {
  return (
    <Box title="今日の授業">
      {!list.length ? <Note>今日は授業がありません</Note> : (
        <ul className="m-0 list-none p-0">
          {list.map(({ course: c, periods }, i) => (
            <Row key={i}>
              <span className="w-28 flex-none text-[12.5px] text-muted-foreground">{`${periods.join("・")}限 ${PERIODS[periods[0]! - 1]?.start}-${PERIODS[periods[periods.length - 1]! - 1]?.end}`}</span>
              <a className="min-w-0 flex-1 text-[13.5px] text-foreground hover:underline [overflow-wrap:anywhere]" href={c.url}>{courseName(c.name)}</a>
            </Row>
          ))}
        </ul>
      )}
    </Box>
  );
}

type Props = { userId: number | null; initial?: HomeData; now?: Date; initialSlots?: SlotMap | null; initialCourses?: MyCourse[] };

/** MU-LMS のホーム。左に提出期限、右に今日の授業・アナウンス・最近のコース(狭い幅では縦に積む)。今日の授業は MUSCAT の対応表が届いたら出す */
export function HomeScreen({ userId, initial, now = new Date(), initialSlots, initialCourses }: Props) {
  const slots = useSlots(initialSlots);
  const [courses, setCourses] = useState<MyCourse[] | null>(initialCourses ?? null);
  useEffect(() => {
    if (slots && !initialCourses) loadCourses().then(setCourses, () => {});
  }, [slots, initialCourses]);
  const [data, setData] = useState<HomeData | null>(initial ?? null);
  const load = useCallback(() => {
    setData(null);
    void loadHome(userId ?? 0, Math.floor(Date.now() / 1000)).then(setData);
  }, [userId]);
  useEffect(() => { if (!initial) load(); }, [initial, load]);

  if (!data) return <PageLoading title="ホーム" />;
  if (!data.due && !data.news && !data.recent) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="MU-LMS の情報を取得できませんでした。" onRetry={load} /></div>;
  return (
    <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-4 p-4">
      <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-4">
        <DueBox due={data.due} now={Math.floor(now.getTime() / 1000)} />
      </div>
      <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
        {slots && courses ? <TodayBox list={todayClasses(courses, slots, termOfMonth(now.getMonth() + 1), now.getDay())} /> : null}
        <NewsBox news={data.news} />
        <RecentBox recent={data.recent} />
      </div>
    </div>
  );
}
