import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { InfoPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { HealthInfoScreen } from "./HealthInfoScreen";

// 実機の形: 1 つ目の節は「実施年度 | 2026 | 2025 | 2024 | (空)」で始まる行 × 複数列の行列、ほかは 項目名 | 値 の 2 列
const page: InfoPage = {
  sections: [
    { title: "健康診断情報", grids: [{ rows: [["実施年度", "2026", "2025", "2024", ""], ["身長", "", "170.0", "169.5", ""]] }], tables: [] },
    { title: "血圧検査年月日", grids: [{ rows: [["検査日", ""]] }], tables: [] },
    { title: "抗体価検査", grids: [{ rows: [["麻疹判定", ""], ["風疹判定", "陽性"], ["水痘判定", ""]] }], tables: [] },
  ],
};
const render = (initial?: Parameters<typeof HealthInfoScreen>[0]["initial"]) =>
  renderToString(<HealthInfoScreen client={fakeClient()} initial={initial} />);

test("年度の表は一番新しい年度を強調し、空の列は出さない。抗体価は 2 組ずつ、小さな節はたたむ", () => {
  const html = render({ status: "ready", page });
  for (const s of ["健康診断情報", ">実施年度</th>", "170.0", "抗体価検査", "風疹判定", "陽性", "血圧検査年月日"]) expect(html).toContain(s);
  expect(html).toMatch(/bg-primary[^"]*text-primary-foreground[^>]*>2026<\/th>/);
  expect(html.match(/<th[ >]/g)).toHaveLength(4); // 実施年度 + 3 年度(空の列は出さない)
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain(">検査日<"); // たたんだ節の中身はまだ出さない
});

test("読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
});
