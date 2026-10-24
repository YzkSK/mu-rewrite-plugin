import type { CSSProperties, ReactNode } from "react";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/starwind/sidebar";
import { AppSidebar } from "@/ui/AppSidebar";
import { Header } from "@/ui/Header";
import { useSidebarState } from "@/ui/useSidebarState";
import type { NavModel } from "./drawerItems";

type Props = { title: string; model: NavModel; user?: string; children: ReactNode };

const FRAME_STYLE = { "--sidebar-width": "17rem", "--bar-h": "69px" } as CSSProperties;

/** 上の段 + サイドバー + 本文。広い画面は押し出し、狭い画面は本文に重ねて幕を出す(Sheet は body に出てしまうので使わない)。 */
export function App({ title, model, user, children }: Props) {
  const { narrow, open, change } = useSidebarState();
  const body = <AppSidebar model={model} onPick={narrow ? () => change(false) : undefined} />;
  return (
    <SidebarProvider
      open={open}
      onOpenChange={change}
      mobileQuery="(max-width: 0px)"
      keyboardShortcut=""
      data-narrow={narrow}
      style={FRAME_STYLE}
      className="group/frame relative h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <Header title={title} user={user} />
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
  );
}
