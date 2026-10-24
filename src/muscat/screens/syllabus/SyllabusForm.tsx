import { useState, type ReactNode } from "react";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { CheckOption, SelectField, SyllabusPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Checkbox } from "@/ui/Checkbox";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";
import { Field } from "../Field";

type Group = "days" | "grades" | "kinds" | "periods";
const GROUPS: Group[] = ["days", "grades", "kinds", "periods"];
type Values = { year: string; term: string; subject: string; teacher: string; keyword: string; dept: string; category: string; campus: string; picked: Record<Group, string[]> };

const initial = (p: SyllabusPage): Values => ({
  year: p.year.value, term: p.term.value, subject: p.subject.value, teacher: p.teacher.value, keyword: p.keyword.value,
  dept: p.dept.value, category: p.category.value, campus: p.campus.value,
  picked: Object.fromEntries(GROUPS.map((g) => [g, p[g].filter((c) => c.checked).map((c) => c.label)])) as Values["picked"],
});

/** 画面の値を元の画面の部品に入れる手順(見つからない部品は飛ばす)。チェックは違うものだけ押す */
function searchSteps(p: SyllabusPage, v: Values): DriveStep[] {
  const set = (f: { ref: string }, value: string): DriveStep[] => (f.ref ? [{ kind: "set", ref: f.ref, value }] : []);
  return [
    ...set(p.year, v.year), ...set(p.term, v.term), ...set(p.subject, v.subject), ...set(p.teacher, v.teacher), ...set(p.keyword, v.keyword),
    ...set(p.dept, v.dept), ...set(p.category, v.category), ...set(p.campus, v.campus),
    ...GROUPS.flatMap((g) => p[g].filter((o) => o.ref && v.picked[g].includes(o.label) !== o.checked).map((o): DriveStep => ({ kind: "click", ref: o.ref, ajax: false }))),
    { kind: "click", ref: p.searchRef, ajax: true },
  ];
}

const TWO = "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2";

/** 小さな見出しの文字(12px の薄い色) */
const Label = ({ children }: { children: ReactNode }) => <span className="text-xs text-muted-foreground">{children}</span>;

/** 条件の欄。値はここで持ち、「検索」を押したときに初めて元の画面へ入れて検索する。showNote は結果の帯が無いときだけ、ふせん一覧をここに置く */
export function SyllabusForm({ page, busy, act, showNote, onSearch, onNote, onClear }: { page: SyllabusPage; busy: boolean; act: string | null; showNote: boolean; onSearch: (steps: DriveStep[]) => void; onNote: () => void; onClear: () => void }) {
  const [v, setV] = useState(() => initial(page));
  const [more, setMore] = useState(false);
  const up = <K extends keyof Values>(k: K, value: Values[K]) => setV((x) => ({ ...x, [k]: value }));
  const toggle = (g: Group, label: string) => up("picked", { ...v.picked, [g]: v.picked[g].includes(label) ? v.picked[g].filter((l) => l !== label) : [...v.picked[g], label] });
  const search = () => onSearch(searchSteps(page, v));
  const sel = (label: string, f: SelectField, k: "dept" | "category" | "campus") =>
    f.options.length > 0 && <Field label={label}><Select label={label} value={v[k]} options={f.options} disabled={busy} onChange={(x) => up(k, x)} /></Field>;
  const boxes = (label: string, g: "grades" | "kinds") => {
    const opts: CheckOption[] = page[g];
    return opts.length > 0 && (
      <Field label={label}>
        <div className="flex flex-wrap gap-1.5">
          {opts.map((o) => <Checkbox key={o.ref} label={o.label} checked={v.picked[g].includes(o.label)} disabled={busy} onChange={() => toggle(g, o.label)} />)}
        </div>
      </Field>
    );
  };
  // つながったボタン(選択中は primary)
  const joined = (label: string, g: "days" | "periods") =>
    page[g].length > 0 && (
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <div className="inline-flex overflow-hidden rounded-[4px] border border-input">
          {page[g].map((o, i) => {
            const on = v.picked[g].includes(o.label);
            return (
              <button
                key={o.ref}
                type="button"
                aria-pressed={on}
                disabled={busy}
                onClick={() => toggle(g, o.label)}
                className={`h-8 min-w-9 cursor-pointer px-2.5 text-[13px] disabled:cursor-default ${i > 0 ? "border-l border-input" : ""} ${on ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  return (
    <Card className="gap-3 px-4 py-3.5">
      <div className="grid grid-cols-1 items-end gap-3 min-[900px]:grid-cols-[auto_1fr_1fr_1fr]" onKeyDown={(e) => e.key === "Enter" && e.target instanceof HTMLInputElement && !e.nativeEvent.isComposing && !busy && search()}>
        <div className="grid gap-1">
          <Label>開講年度学期</Label>
          <div className="flex items-center gap-2">
            <div className="w-16"><TextInput label="開講年度" value={v.year} disabled={busy} onChange={(x) => up("year", x)} /></div>
            {page.term.options.length > 0 && <Select label="学期" value={v.term} options={page.term.options} disabled={busy} onChange={(x) => up("term", x)} />}
          </div>
        </div>
        <div className="grid gap-1"><Label>授業科目</Label><TextInput label="授業科目(コード・名称)" placeholder="名称かコード" value={v.subject} disabled={busy} onChange={(x) => up("subject", x)} /></div>
        <div className="grid gap-1"><Label>担当教員</Label><TextInput label="担当教員" placeholder="氏名の一部" value={v.teacher} disabled={busy} onChange={(x) => up("teacher", x)} /></div>
        <div className="grid gap-1"><Label>キーワード</Label><TextInput label="キーワード" placeholder="シラバスの本文から" value={v.keyword} disabled={busy} onChange={(x) => up("keyword", x)} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {joined("曜日", "days")}
        {joined("時限", "periods")}
      </div>
      {more && (
        <div className={`${TWO} border-t border-border pt-3`}>
          {sel("学科組織", page.dept, "dept")}
          {sel("成績用科目分類", page.category, "category")}
          {sel("開講キャンパス", page.campus, "campus")}
          {boxes("学年", "grades")}
          {boxes("開講区分", "kinds")}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-bold text-primary">
          {`詳細条件(学科・科目分類・学年・キャンパス・開講区分 など)${more ? "▴" : "▾"}`}
        </button>
        {showNote && <Button variant="secondary" disabled={busy} loading={act === "note"} onClick={onNote}>ふせんを貼った授業一覧</Button>}
        <span className="flex-1" />
        <Button variant="secondary" disabled={busy} loading={act === "clear"} onClick={onClear}>条件をクリア</Button>
        <Button disabled={busy} loading={act === "search"} onClick={search}>検索</Button>
      </div>
    </Card>
  );
}
