import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useState } from "react";
import type { NewsPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Panel } from "@/ui/Panel";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";
import { rememberedUnread, rememberUnread } from "./unreadCount";

type Props = {
  page: NewsPage;
  busy: boolean;
  onSearch: (q: { keyword: string; course: string }) => void;
  onTab: (name: string) => void;
  canReadUnread: boolean;
  onReadUnread: () => void;
};

const SEGMENTS: [label: string, tab: string][] = [["未読", "未読"], ["重要", "重要"], ["フラグ", "フラグつき"]];
const KINDS = ["授業", "時間割変更", "申込", "新着", "既読"];
const KIND_OPTIONS = [{ value: "", label: "すべての種類" }, ...KINDS.map((k) => ({ value: k, label: k }))];

/** 検索(件名・差出人・本文と授業科目)と絞り込み。タブの切り替えは通信なし */
export function NewsToolbar({ page, busy, onSearch, onTab, canReadUnread, onReadUnread }: Props) {
  const [keyword, setKeyword] = useState(page.keyword);
  const [course, setCourse] = useState(page.course);
  const [grouped, setGrouped] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const selected = page.tabs.find((t) => t.selected)?.name ?? "";
  // 絞り込みのタブ(未読・授業など)にいる間は、まとめるかどうかを覚えている値で決める
  const view = selected === "グループ" ? true : selected === "全表示" ? false : grouped;
  const viewTab = view ? "グループ" : "全表示";
  // 「すべて」は分類ごとに数件しか出さないので、数えるのは検索なしの「未読」タブだけ(実機で確認)
  const full = selected === "未読" && !page.keyword && !page.course;
  const unread = full ? page.items.filter((i) => i.unread).length : rememberedUnread();
  if (full) rememberUnread(unread);
  const segment = (label: string, tab: string) => (
    <Button key={label} variant={selected === tab ? "primary" : "secondary"} disabled={busy} onClick={() => onTab(tab)}>{label}</Button>
  );
  // 狭い画面は授業科目・種類・まとめるを「絞り込み」の中に畳む(広い画面は常に出す)
  const fold = filterOpen ? "" : "max-[767px]:hidden";
  return (
    <Panel title="掲示板">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && onSearch({ keyword, course })}>
          <div className="min-w-[200px] flex-[2] max-[767px]:min-w-0 max-[767px]:flex-1"><TextInput label="件名・差出人・本文で探す" placeholder="件名・差出人・本文で探す" value={keyword} onChange={setKeyword} disabled={busy} /></div>
          <div className="min-[768px]:hidden [&>button]:h-10">
            <Button variant="secondary" disabled={busy} onClick={() => setFilterOpen(!filterOpen)}>
              <IconAdjustmentsHorizontal size={16} />
              絞り込み
            </Button>
          </div>
          <div className={`min-w-[140px] flex-1 max-[767px]:order-last max-[767px]:w-full max-[767px]:basis-full ${fold}`}><TextInput label="授業科目(コード・名称)" placeholder="授業科目(コード・名称)" value={course} onChange={setCourse} disabled={busy} /></div>
          <div className="max-[767px]:[&>button]:h-10">
            <Button disabled={busy} onClick={() => onSearch({ keyword, course })}>検索</Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 max-[767px]:grid max-[767px]:w-full max-[767px]:grid-cols-4 max-[767px]:[&>button]:h-10 max-[767px]:[&>button]:w-full">
            {segment("すべて", viewTab)}
            {SEGMENTS.map(([label, tab]) => segment(tab === "未読" && unread > 0 ? `未読 ${unread}` : label, tab))}
          </div>
          <div className={fold}>
            <Select
              label="種類"
              value={KINDS.includes(selected) ? selected : ""}
              options={KIND_OPTIONS}
              disabled={busy}
              onChange={(v) => onTab(v || viewTab)}
            />
          </div>
          <div className={fold}>
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
          <div className="ml-auto max-[767px]:ml-0 max-[767px]:w-full max-[767px]:[&>button]:h-11 max-[767px]:[&>button]:w-full">
            <Button variant="secondary" disabled={busy || !canReadUnread} onClick={onReadUnread}>未読を新しい順に読む</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
