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
  const d = page(" [Kmh999]\n  シラバス   検索 ");
  expect(resolveScreen("Kmh999", d)?.title).toBe("シラバス 検索");
  expect(screenTitleOf(page(""))).toBe("MUSCAT");
  // 実機の確認: 見出しの中の <script>(PrimeFaces の部品の初期化)の文字が、題名に混ざっていた
  const withScript = new DOMParser().parseFromString(`<div id="mainWrapTop">シラバス検索<script>$(function(){PrimeFaces.cw("BreadCrumb",{})});</script><style>.x{}</style> [Kmh006]</div>`, "text/html");
  expect(screenTitleOf(withScript)).toBe("シラバス検索");
});

test("ホーム(Pky001 / コード無しの #portalCont)は、登録されたホーム画面", () => {
  expect(resolveScreen("Pky001", page("[Pky001] ポータル"))).toBe(SCREENS.Pky001!);
  expect(resolveScreen("", page("", '<div id="portalCont"></div>'))).toBe(SCREENS.Pky001!);
  expect(resolveScreen("", page(""))?.title).toBe("MUSCAT");
});

test("メニューの無いページ(ログイン画面・中継ページ)は null", () => {
  expect(resolveScreen("", page("", "", false))).toBeNull();
  expect(resolveScreen("Zzz999", new DOMParser().parseFromString("<body></body>", "text/html"))).toBeNull();
});
