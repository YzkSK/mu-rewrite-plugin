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
  ],
};
const render = (initial?: Parameters<typeof HealthInfoScreen>[0]["initial"]) =>
  renderToString(<HealthInfoScreen client={fakeClient()} initial={initial} />);

test("行列の節は表(1 行目が見出し)、2 列の節は項目名と値、空の値は —", () => {
  const html = render({ status: "ready", page });
  for (const s of ["健康診断情報", ">実施年度</th>", ">2026</th>", "170.0", "血圧検査年月日", "検査日", "—"]) expect(html).toContain(s);
  expect(html).toContain("<dl");
});

test("読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
});
