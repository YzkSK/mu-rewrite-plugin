import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/starwind/collapsible";
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

/** 条件の欄。値はここで持ち、「検索」を押したときに初めて元の画面へ入れて検索する */
export function SyllabusForm({ page, busy, act, onSearch, onNote, onClear }: { page: SyllabusPage; busy: boolean; act: string | null; onSearch: (steps: DriveStep[]) => void; onNote: () => void; onClear: () => void }) {
  const [v, setV] = useState(() => initial(page));
  const [more, setMore] = useState(false);
  const up = <K extends keyof Values>(k: K, value: Values[K]) => setV((x) => ({ ...x, [k]: value }));
  const toggle = (g: Group, label: string) => up("picked", { ...v.picked, [g]: v.picked[g].includes(label) ? v.picked[g].filter((l) => l !== label) : [...v.picked[g], label] });
  const search = () => onSearch(searchSteps(page, v));
  const sel = (label: string, f: SelectField, k: "term" | "dept" | "category" | "campus") =>
    f.options.length > 0 && <Field label={label}><Select label={label} value={v[k]} options={f.options} disabled={busy} onChange={(x) => up(k, x)} /></Field>;
  const checks = (label: string, g: Group, as: "button" | "box") => {
    const opts: CheckOption[] = page[g];
    return opts.length > 0 && (
      <Field label={label}>
        <div className="flex flex-wrap gap-1.5">
          {opts.map((o) => {
            const on = v.picked[g].includes(o.label);
            return as === "button"
              ? <Button key={o.ref} variant={on ? "primary" : "ghost"} disabled={busy} onClick={() => toggle(g, o.label)}>{o.label}</Button>
              : <Checkbox key={o.ref} label={o.label} checked={on} disabled={busy} onChange={() => toggle(g, o.label)} />;
          })}
        </div>
      </Field>
    );
  };
  return (
    <Card className="gap-3.5 p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-base font-extrabold">シラバス検索</h3>
        <small className="text-muted-foreground">条件を選んで「検索」を押すと、一覧が出ます</small>
      </div>
      <div className={TWO} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && !busy && search()}>
        <Field label="開講年度学期" required>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-24"><TextInput label="開講年度" value={v.year} disabled={busy} onChange={(x) => up("year", x)} /></div>
            <span className="text-[13px] text-muted-foreground">年度</span>
            {page.term.options.length > 0 && <Select label="学期" value={v.term} options={page.term.options} disabled={busy} onChange={(x) => up("term", x)} />}
          </div>
        </Field>
        <Field label="授業科目"><TextInput label="授業科目(コード・名称)" value={v.subject} disabled={busy} onChange={(x) => up("subject", x)} /></Field>
        <Field label="担当教員"><TextInput label="担当教員" value={v.teacher} disabled={busy} onChange={(x) => up("teacher", x)} /></Field>
        <Field label="キーワード"><TextInput label="キーワード" value={v.keyword} disabled={busy} onChange={(x) => up("keyword", x)} /></Field>
        {checks("曜日", "days", "button")}
      </div>
      <Collapsible open={more} onOpenChange={setMore} className="border-t border-border pt-2.5">
        <CollapsibleTrigger className="inline-flex cursor-pointer items-center gap-2 py-1 font-bold text-primary">
          詳細条件
          <IconChevronDown className={`size-4 transition-transform duration-200 ${more ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={`${TWO} mt-3`}>
            {sel("学科組織", page.dept, "dept")}
            {sel("成績用科目分類", page.category, "category")}
            {sel("開講キャンパス", page.campus, "campus")}
            {checks("学年", "grades", "box")}
            {checks("開講区分", "kinds", "box")}
            {checks("時限", "periods", "box")}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={busy} loading={act === "note"} onClick={onNote}>ふせんを貼った授業一覧</Button>
        <span className="flex-1" />
        <Button variant="ghost" disabled={busy} loading={act === "clear"} onClick={onClear}>クリア</Button>
        <Button disabled={busy} loading={act === "search"} onClick={search}>検索</Button>
      </div>
    </Card>
  );
}
