import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Sidebar, SidebarProvider } from "@/components/starwind/sidebar";
import { drawerItems } from "@/muscat/shell/drawerItems";
import { AppSidebar } from "./AppSidebar";
import { BusyOverlay } from "./BusyOverlay";
import { Button } from "./Button";
import { PageLoading, PageTitleContext } from "./PageLoading";

test("BusyOverlay: busy で薄くなり aria-busy、そうでなければ素通し", () => {
  const on = renderToString(<BusyOverlay busy>本文</BusyOverlay>);
  expect(on).toContain('aria-busy="true"');
  expect(on).toContain("opacity-45");
  expect(on).toContain("本文");
  const off = renderToString(<BusyOverlay busy={false}>本文</BusyOverlay>);
  expect(off).toContain('aria-busy="false"');
  expect(off).not.toContain("opacity-45");
});

test("PageLoading: 題名ありは「○○を読み込んでいます」、題名なしは「を」から", () => {
  expect(renderToString(<PageLoading title="成績照会" />)).toContain("成績照会を読み込んでいます");
  expect(renderToString(<PageTitleContext value="出席確認"><PageLoading /></PageTitleContext>)).toContain("出席確認を読み込んでいます");
  expect(renderToString(<PageLoading />)).toContain(">を読み込んでいます");
});

test("Button loading: 押せなくなりスピナーが出る(文字は残して幅を保つ)", () => {
  const h = renderToString(<Button loading>表示</Button>);
  expect(h).toMatch(/ disabled[ =>]/);
  expect(h).toContain('data-slot="spinner"');
  expect(h).toContain("表示");
  expect(renderToString(<Button>表示</Button>)).not.toContain('data-slot="spinner"');
});

const side = (pendingLabel?: string) =>
  renderToString(
    <SidebarProvider>
      <Sidebar collapsible="none">
        <AppSidebar model={drawerItems(document, [{ title: "授業", labels: ["出席確認", "成績照会"] }], "出席確認")} pendingLabel={pendingLabel} />
      </Sidebar>
    </SidebarProvider>,
  );

test("AppSidebar: 移動中の項目の横だけにスピナー", () => {
  expect(side()).not.toContain('data-slot="spinner"');
  const h = side("成績照会");
  expect(h.match(/data-slot="spinner"/g)?.length).toBe(1);
  expect(h).toMatch(/成績照会<\/span><svg[^>]*data-slot="spinner"/);
});

// 実機で「画面を移るたびにサイドバーのグループが開く動きをする」: 最初は動かさない印を付ける
test("AppSidebar: 最初の描画では折りたたみを動かさない(mu-still)", () => {
  expect(side()).toContain("mu-still");
});
