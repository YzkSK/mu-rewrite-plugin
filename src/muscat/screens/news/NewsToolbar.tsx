import { useState } from "react";
import type { NewsPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Panel } from "@/ui/Panel";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";

type Props = {
  page: NewsPage;
  busy: boolean;
  onSearch: (q: { keyword: string; course: string }) => void;
  onTab: (name: string) => void;
};

const SEGMENTS: [label: string, tab: string][] = [["未読", "未読"], ["重要", "重要"], ["フラグ", "フラグつき"]];
const KINDS = ["授業", "時間割変更", "申込", "新着", "既読"];
const KIND_OPTIONS = [{ value: "", label: "すべての種類" }, ...KINDS.map((k) => ({ value: k, label: k }))];

/** 検索(件名・差出人・本文と授業科目)と絞り込み。タブの切り替えは通信なし */
export function NewsToolbar({ page, busy, onSearch, onTab }: Props) {
  const [keyword, setKeyword] = useState(page.keyword);
  const [course, setCourse] = useState(page.course);
  const [grouped, setGrouped] = useState(true);
  const selected = page.tabs.find((t) => t.selected)?.name ?? "";
  // 絞り込みのタブ(未読・授業など)にいる間は、まとめるかどうかを覚えている値で決める
  const view = selected === "グループ" ? true : selected === "全表示" ? false : grouped;
  const viewTab = view ? "グループ" : "全表示";
  const unread = ["グループ", "全表示", "未読"].includes(selected) ? page.items.filter((i) => i.unread).length : 0;
  const segment = (label: string, tab: string) => (
    <Button key={label} variant={selected === tab ? "primary" : "secondary"} disabled={busy} onClick={() => onTab(tab)}>{label}</Button>
  );
  return (
    <Panel title="掲示板">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && onSearch({ keyword, course })}>
          <div className="min-w-[200px] flex-[2]"><TextInput label="件名・差出人・本文で探す" placeholder="件名・差出人・本文で探す" value={keyword} onChange={setKeyword} disabled={busy} /></div>
          <div className="min-w-[140px] flex-1"><TextInput label="授業科目(コード・名称)" placeholder="授業科目(コード・名称)" value={course} onChange={setCourse} disabled={busy} /></div>
          <Button disabled={busy} onClick={() => onSearch({ keyword, course })}>検索</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {segment("すべて", viewTab)}
            {SEGMENTS.map(([label, tab]) => segment(tab === "未読" && unread > 0 ? `未読 ${unread}` : label, tab))}
          </div>
          <Select
            label="種類"
            value={KINDS.includes(selected) ? selected : ""}
            options={KIND_OPTIONS}
            disabled={busy}
            onChange={(v) => onTab(v || viewTab)}
          />
          <Checkbox
            label="分類ごとにまとめる"
            checked={view}
            disabled={busy}
            onChange={(on) => {
              setGrouped(on);
              onTab(on ? "グループ" : "全表示");
            }}
          />
        </div>
      </div>
    </Panel>
  );
}
