import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/starwind/sidebar";
import { AppSidebar } from "@/ui/AppSidebar";
import { Header } from "@/ui/Header";
import { PageTitleContext } from "@/ui/PageLoading";
import { TopProgress } from "@/ui/TopProgress";
import { useSidebarState } from "@/ui/useSidebarState";
import type { NavModel } from "./drawerItems";
import { useBusy } from "./useBusy";
import { getZoom, onZoomChange } from "./zoom";

// sidebar を渡すと AppSidebar の代わりに描く(ポータル用)。brand / headerRight は Header へそのまま渡す
type Props = { title: string; model?: NavModel; user?: string; lastLogin?: string; brand?: string; headerRight?: ReactNode; sidebar?: ReactNode; children: ReactNode };

const PENDING_MS = 8000;

const FRAME_STYLE = { "--sidebar-width": "15rem", "--bar-h": "56px" } as CSSProperties;

/** 上の段 + サイドバー + 本文。広い画面は押し出し、狭い画面は本文に重ねて幕を出す(Sheet は body に出てしまうので使わない)。 */
export function App({ title, model, user, lastLogin, brand, headerRight, sidebar, children }: Props) {
  const { narrow, open, change } = useSidebarState();
  const busy = useBusy();
  // 移動が終わると新しい画面として作り直されるので、ここで戻すのは移動が起きなかったときの保険
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), PENDING_MS);
    return () => clearTimeout(t);
  }, [pending]);
  // 画面を移るたびに作り直されるので、最初の描画ではサイドバーの押し出しの動きを出さない
  const [mounting, setMounting] = useState(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounting(false));
    return () => cancelAnimationFrame(id);
  }, []);
  const body = sidebar ?? (model ? <AppSidebar model={model} onPending={setPending} onPick={narrow ? () => change(false) : undefined} /> : null);
  // 個人設定の「表示の大きさ」。zoom で全体を変え、高さは拡大したぶん割って画面に収める
  const zoom = useSyncExternalStore(onZoomChange, getZoom, () => 100) / 100;
  return (
    <PageTitleContext value={title}>
    <SidebarProvider
      open={open}
      onOpenChange={change}
      mobileQuery="(max-width: 0px)"
      keyboardShortcut=""
      data-narrow={narrow}
      style={{ ...FRAME_STYLE, zoom, height: `calc(100vh / ${zoom})` }}
      className={`${mounting ? "mu-noanim " : ""}group/frame relative min-h-0 flex-col overflow-hidden bg-background text-foreground`}
    >
      <Header title={title} user={user} lastLogin={lastLogin} brand={brand} right={headerRight} />
      <TopProgress busy={busy || pending !== null} />
      <div className="relative flex min-h-0 flex-1">
        {narrow ? (
          <>
            <div
              inert={!open}
              className={`absolute inset-y-0 left-0 z-20 w-(--sidebar-width) transition-transform duration-200 ${open ? "translate-x-0 shadow-[8px_0_24px_rgb(34_27_43/.18)]" : "-translate-x-full"}`}
            >
              <Sidebar collapsible="none" className="w-full border-r border-sidebar-border">
                {body}
              </Sidebar>
            </div>
            <div
              aria-hidden="true"
              className={`absolute inset-0 z-10 bg-[rgb(34_27_43/.35)] transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
              onClick={() => change(false)}
            />
          </>
        ) : (
          <Sidebar collapsible="offcanvas" className="block" style={{ position: "absolute", top: 0, bottom: 0, height: "auto", display: "flex" }}>
            {body}
          </Sidebar>
        )}
        <SidebarInset className="min-w-0 overflow-auto">{children}</SidebarInset>
      </div>
    </SidebarProvider>
    </PageTitleContext>
  );
}
