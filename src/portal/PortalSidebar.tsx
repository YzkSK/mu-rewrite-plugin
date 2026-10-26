import { IconChevronDown } from "@tabler/icons-react";
import { useState, type MouseEvent } from "react";
import { SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/starwind/sidebar";
import { ACTIVE, MB } from "@/ui/AppSidebar";
import type { PageNode } from "./api";
import { TOP } from "./data";
import { isHttp } from "./lib/sanitize";
import { navigate, NOTICES, NOTICES_URL } from "./route";

const PAGE = "/dashboard/page/";
const isNotices = (n: PageNode) => !n.external_link && (n.slug || n.title) === NOTICES;
// お知らせは一覧(?view=all)を自前で描くので、そこへ向ける
const hrefOf = (n: PageNode) => (isNotices(n) ? NOTICES_URL : PAGE + encodeURIComponent(n.slug || n.title));
/** 自前で描くページへは普通のクリックだけ画面内で移る(修飾キー付きは新しいタブなどに任せる) */
const local = (url: string, onPick?: () => void) => (e: MouseEvent) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(url);
  onPick?.(); // 狭い画面ではサイドバーを閉じる
};
// トップページ自体は先頭に自前で足し、その子は最上位として並べる
const topLevel = (tree: PageNode[]): PageNode[] => tree.flatMap((n) => (n.title === TOP ? (n.children ?? []) : [n]));
const hasCur = (n: PageNode, slug: string): boolean => (!n.external_link && n.slug === slug) || (n.children ?? []).some((c) => hasCur(c, slug));

function Node({ node, slug, depth, onPick }: { node: PageNode; slug: string; depth: number; onPick?: () => void }) {
  const ext = node.external_link;
  const kids = (node.children ?? []).filter((c) => !c.external_link || isHttp(c.external_link));
  const cur = !ext && node.slug === slug;
  const [open, setOpen] = useState(() => hasCur(node, slug)); // いまのページを含む枠は開いておく
  if (ext && !isHttp(ext)) return null;
  const cls = `${MB} ${ACTIVE} rounded-none ${depth ? "h-8 pr-10 text-[13px]" : "h-10 pr-10 text-sm"}`;
  const pad = depth ? { paddingLeft: `${1.25 + depth * 1}rem` } : undefined; // pl-9 相当から、深さごとに 1rem
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size={depth ? "sm" : "md"}
        href={ext || hrefOf(node)}
        isActive={cur}
        aria-current={cur ? "page" : undefined}
        onClick={ext ? undefined : local(hrefOf(node), onPick)}
        {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`${cls} ${depth ? "" : "px-5"}`}
        style={pad}
      >
        <span>{node.title}</span>
        {ext ? <span className="ml-auto text-[11px] text-muted-foreground">外部</span> : null}
      </SidebarMenuButton>
      {kids.length ? (
        <>
          {/* 項目名のリンクとは別のボタン。押してもページ遷移しない */}
          <button
            type="button"
            aria-label={`${node.title}の中身を開閉`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="absolute top-0 right-2 flex size-8 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground hover:bg-muted"
            style={{ height: depth ? "2rem" : "2.5rem" }}
          >
            <IconChevronDown className={`size-4 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          </button>
          {open ? (
            <ul className="m-0 flex list-none flex-col p-0">
              {kids.map((c) => <Node key={c.slug || c.title} node={c} slug={slug} depth={depth + 1} onPick={onPick} />)}
            </ul>
          ) : null}
        </>
      ) : null}
    </SidebarMenuItem>
  );
}

const FOOT = `${MB} h-8 rounded-none px-5 text-[13px] text-muted-foreground`;

/** 左の一覧。項目は本物のリンク(全画面の遷移)。開閉・幅・押し出しは App(Sidebar)の仕事。 */
export function PortalSidebar({ tree, slug, onPick, onAccount, onSignOut }: { tree: PageNode[]; slug: string; onPick?: () => void; onAccount: () => void; onSignOut: () => void }) {
  return (
    <>
      <SidebarContent className="gap-0 p-0">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="md"
              href={PAGE + encodeURIComponent(TOP)}
              isActive={slug === TOP}
              aria-current={slug === TOP ? "page" : undefined}
              onClick={local("/dashboard", onPick)}
              className={`${MB} ${ACTIVE} h-10 rounded-none px-5 text-sm font-semibold`}
            >
              {TOP}
            </SidebarMenuButton>
          </SidebarMenuItem>
          {topLevel(tree).map((n) => <Node key={n.slug || n.title} node={n} slug={slug} depth={0} onPick={onPick} />)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-0 border-t border-sidebar-border p-0 py-1">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" href="https://unipa.m-muscat.musashino-u.ac.jp/uprx/ShibbolethAuthServlet" target="_blank" rel="noopener noreferrer" className={FOOT}>
              MUSCAT
              <span className="ml-auto text-[11px] text-muted-foreground">外部</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" href="https://musashino-u.myopenlms.net/" target="_blank" rel="noopener noreferrer" className={FOOT}>
              MU-LMS
              <span className="ml-auto text-[11px] text-muted-foreground">外部</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className={FOOT} onClick={() => { onAccount(); onPick?.(); }}>アカウントとセキュリティ</SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className={`${FOOT.replace("text-muted-foreground", "text-error hover:text-error")}`} onClick={() => { onSignOut(); onPick?.(); }}>サインアウト</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
