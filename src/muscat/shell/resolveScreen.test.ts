import { expect, test } from "bun:test";
import { resolveScreen, screenTitleOf } from "./resolveScreen";
import { SCREENS } from "./screens";

const page = (top: string, extra = "", menu = true) =>
  new DOMParser().parseFromString(
    `<body>${menu ? '<ul id="menuForm:mainMenu"></ul>' : ""}<div id="wrap"><div id="mainWrapTop">${top}</div>${extra}</div></body>`,
    "text/html",
  );

test("登録済みのコードはその定義", () => {
  expect(resolveScreen("Atb005", page("[Atb005] 出席確認"))).toBe(SCREENS.Atb005!);
});

test("未登録のログイン済み画面は汎用画面。題名は見出しから取る", () => {
  const d = page(" [Kmh006]\n  シラバス   検索 ");
  expect(resolveScreen("Kmh006", d)?.title).toBe("シラバス 検索");
  expect(screenTitleOf(page(""))).toBe("MUSCAT");
});

test("ホーム(Pky001 / コード無しの #portalCont)は「ホーム」", () => {
  expect(resolveScreen("Pky001", page("[Pky001] ポータル"))?.title).toBe("ホーム");
  expect(resolveScreen("", page("", '<div id="portalCont"></div>'))?.title).toBe("ホーム");
  expect(resolveScreen("", page(""))?.title).toBe("MUSCAT");
});

test("メニューの無いページ(ログイン画面・中継ページ)は null", () => {
  expect(resolveScreen("", page("", "", false))).toBeNull();
  expect(resolveScreen("Zzz999", new DOMParser().parseFromString("<body></body>", "text/html"))).toBeNull();
});
