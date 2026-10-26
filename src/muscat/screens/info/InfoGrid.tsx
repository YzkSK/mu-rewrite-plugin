import type { InfoGrid as Grid } from "@/muscat/api/types";
import { InfoTableView } from "./InfoTableView";

type Period = { name: string; from: string; to: string };

/**
 * 「アドバイザー：佐々木 史織(2024/04/01～2024/07/31)アドバイザー：…」のように、期間付きの名前が 1 つの欄につながって来る値を分ける(実機で確認)。
 * その形でなければ null
 */
export function splitPeriods(v: string): Period[] | null {
  const re = /[^：:()（）]+[：:]\s*([^()（）]+?)\s*[(（](\d{4}\/\d{1,2}\/\d{1,2})\s*[～~〜-]\s*(\d{4}\/\d{1,2}\/\d{1,2})?\s*[)）]/g;
  const list = [...v.matchAll(re)];
  if (list.length === 0 || list.map((m) => m[0]).join("").replace(/\s/g, "") !== v.replace(/\s/g, "")) return null;
  // 同じ人が続けて担当した期間は 1 つにまとめる(年度の途中で区切られて 2 行になっていた)
  return list.reduce<Period[]>((acc, m) => {
    const last = acc.at(-1);
    const p = { name: m[1]!, from: m[2]!, to: m[3] ?? "" };
    if (last && last.name.replace(/\s/g, "") === p.name.replace(/\s/g, "") && nextDay(last.to) === pad(p.from)) last.to = p.to;
    else acc.push(p);
    return acc;
  }, []);
}

/** 「2024/07/31」の翌日を同じ形で。読めなければ "" */
function nextDay(s: string): string {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  return m ? ymd(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1)) : "";
}

const ymd = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
const pad = (s: string) => s.replace(/\/(\d)(?=\/|$)/g, "/0$1");

/** 期間と名前の小さな表。今日が入っている期間を強調する */
function Periods({ list, today }: { list: Period[]; today: string }) {
  return (
    // 中身の幅に詰める(横いっぱいだと名前と期間が端と端に離れた)
    <table className="border-collapse text-[13px] tabular-nums">
      <tbody>
        {list.map((p, i) => {
          const now = pad(p.from) <= today && (!p.to || today <= pad(p.to));
          return (
            <tr key={i}>
              <td className={`whitespace-nowrap py-0.5 pr-4 ${now ? "font-semibold" : ""}`}>{p.name}</td>
              <td className="whitespace-nowrap py-0.5 text-[12.5px] text-muted-foreground">
                {`${p.from}〜${p.to}`}
                {now && <span className="ml-2 rounded-[2px] bg-accent px-1.5 text-[11px] font-semibold text-primary">現在</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 項目名と値の 2 列の表。見出しの列は薄い地、空の値は薄い — */
export function InfoGrid({ grid, today = new Date() }: { grid: Grid; today?: Date }) {
  if (grid.rows.some((r) => r.length !== 2)) {
    // 3 セル以上の行がある: 1 行目を見出しにした表
    const [headers = [], ...rows] = grid.rows;
    return <InfoTableView table={{ headers, rows }} />;
  }
  return (
    <dl className="m-0 grid grid-cols-[130px_minmax(0,1fr)] border border-b-0 border-[#ECE9EF] text-[13.5px] max-sm:grid-cols-[100px_minmax(0,1fr)]">
      {grid.rows.map(([k, v = ""], i) => {
        const periods = splitPeriods(v);
        return (
          <div key={i} className="contents">
            <dt className="border-b border-[#ECE9EF] bg-[#FAF9FB] px-2.5 py-1.5 text-[12.5px] text-muted-foreground">{k}</dt>
            <dd className={`m-0 min-w-0 border-b border-[#ECE9EF] px-2.5 py-1.5 [overflow-wrap:anywhere] ${v ? "" : "text-[#B8B2BF]"}`}>
              {periods ? <Periods list={periods} today={ymd(today)} /> : v || "—"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
