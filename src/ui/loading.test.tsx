import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Sidebar, SidebarProvider } from "@/components/starwind/sidebar";
import { drawerItems } from "@/muscat/shell/drawerItems";
import { AppSidebar } from "./AppSidebar";
import { BusyOverlay } from "./BusyOverlay";
import { Button } from "./Button";
import { PageLoading, PageTitleContext } from "./PageLoading";

test("BusyOverlay: busy で薄い灰色を重ねて真ん中にアイコン、そうでなければ素通し", () => {
  const on = renderToString(<BusyOverlay busy>本文</BusyOverlay>);
  expect(on).toContain('aria-busy="true"');
  expect(on).toMatch(/absolute inset-0 grid place-items-center[^"]*opacity-100/);
  expect(on).toContain("本文");
  const off = renderToString(<BusyOverlay busy={false}>本文</BusyOverlay>);
  expect(off).toContain('aria-busy="false"');
  expect(off).toMatch(/place-items-center[^"]*opacity-0/);
});

test("PageLoading: 題名ありは「○○を読み込んでいます」、題名なしは「を」から", () => {
  expect(renderToString(<PageLoading title="成績照会" />)).toContain("成績照会を読み込んでいます");
  expect(renderToString(<PageTitleContext value="出席確認"><PageLoading /></PageTitleContext>)).toContain("出席確認を読み込んでいます");
  expect(renderToString(<PageLoading />)).toContain(">を読み込んでいます");
});

test("Button loading: 押せなくなりスピナーが出る(文字は残して幅を保つ)", () => {
  const h = renderToString(<Button loading>表示</Button>);
  expect(h).toMatch(/ disabled[ =>]/);
  expect(h).toContain('mu-spin');
  expect(h).toContain("表示");
  expect(renderToString(<Button>表示</Button>)).not.toContain('mu-spin');
});

const side = () =>
  renderToString(
    <SidebarProvider>
      <Sidebar collapsible="none">
        <AppSidebar model={drawerItems({ go() {}, logout() {}, openNative() {} }, [{ title: "授業", labels: ["出席確認", "成績照会"] }], "出席確認")} />
      </Sidebar>
    </SidebarProvider>,
  );

test("AppSidebar: 項目の横にスピナーは出さない(移動中は上の帯で示す)", () => {
  expect(side()).not.toContain("mu-spin");
});

// 実機で「画面を移るたびにサイドバーのグループが開く動きをする」: 最初は動かさない印を付ける
test("AppSidebar: 最初の描画では折りたたみを動かさない(mu-still)", () => {
  expect(side()).toContain("mu-still");
});
