import { useState } from "react";
import type { NewsPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { TextInput } from "@/ui/TextInput";

type Props = {
  page: NewsPage;
  busy: boolean;
  /** 検索。tab があれば、検索のあとにそのタブへ切り替える */
  onSearch: (q: { keyword: string; course: string; tab?: string }) => void;
  onTab: (name: string) => void;
};

const TYPES = ["授業", "時間割変更", "申込", "既読"];
const PILLS: [label: string, tab: string][] = [["未読", "未読"], ["重要", "重要"], ["新着", "新着"], ["フラグ", "フラグつき"]];

/** キーワード検索、グループ/時系列、ピル、フィルター(授業科目・種別)。タブの切り替えは通信なし */
export function NewsToolbar({ page, busy, onSearch, onTab }: Props) {
  const [keyword, setKeyword] = useState(page.keyword);
  const [course, setCourse] = useState(page.course);
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("グループ");
  const selected = page.tabs.find((t) => t.selected)?.name ?? "";
  const viewTab = selected === "グループ" || selected === "全表示" ? selected : mode;
  const pick = (name: string) => {
    if (name === "グループ" || name === "全表示") setMode(name);
    onTab(name);
  };
  const pill = (label: string, tab: string) => (
    <Button key={label} variant={selected === tab ? "primary" : "ghost"} disabled={busy} onClick={() => pick(tab)}>{label}</Button>
  );
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex gap-2" onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && onSearch({ keyword, course })}>
        <div className="flex-1"><TextInput label="キーワード" value={keyword} onChange={setKeyword} disabled={busy} /></div>
        <Button disabled={busy} onClick={() => onSearch({ keyword, course })}>検索</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={viewTab === "グループ" ? "primary" : "ghost"} disabled={busy} onClick={() => pick("グループ")}>グループ</Button>
        <Button variant={viewTab === "全表示" ? "primary" : "ghost"} disabled={busy} onClick={() => pick("全表示")}>時系列</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {pill("すべて", viewTab)}
        {PILLS.map(([label, tab]) => pill(label, tab))}
        <Button variant="ghost" onClick={() => setOpen(!open)}>フィルター</Button>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <TextInput label="授業科目(コード・名称)" value={course} onChange={setCourse} disabled={busy} />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button key={t} variant={type === t ? "primary" : "ghost"} onClick={() => setType(type === t ? "" : t)}>{t}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setCourse(""); setType(""); }}>クリア</Button>
            <Button disabled={busy} onClick={() => onSearch({ keyword, course, tab: type || undefined })}>適用</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
