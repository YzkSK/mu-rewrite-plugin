import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { InfoGrid, splitPeriods } from "./InfoGrid";

const advisers = "アドバイザー：佐々木　史織(2024/04/01～2024/07/31)アドバイザー：佐々木　史織(2024/08/01～2024/08/31)アドバイザー：石橋 直樹(2026/09/01～2027/03/31)";

test("splitPeriods: 期間付きの名前のつながりを分け、同じ人が続く期間はまとめる。その形でなければ null", () => {
  expect(splitPeriods(advisers)).toEqual([
    { name: "佐々木　史織", from: "2024/04/01", to: "2024/08/31" },
    { name: "石橋 直樹", from: "2026/09/01", to: "2027/03/31" },
  ]);
  expect(splitPeriods("テスト 太郎")).toBeNull();
  expect(splitPeriods("備考：あり(2024/04/01～2024/07/31) ほかの文")).toBeNull();
});

test("InfoGrid: 期間の表にして、今日が入っている期間に「現在」を付ける", () => {
  const html = renderToString(<InfoGrid grid={{ rows: [["アドバイザー情報", advisers]] }} today={new Date(2026, 9, 25)} />);
  expect(html).toContain("2024/04/01〜2024/08/31");
  expect(html).toMatch(/2026\/09\/01〜2027\/03\/31<span[^>]*>現在</);
  expect(html.match(/現在/g)).toHaveLength(1);
});
