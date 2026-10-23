import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { InfoPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { StudentInfoScreen } from "./StudentInfoScreen";

const client = fakeClient();
const page: InfoPage = {
  sections: [
    { title: "学生基本情報", grids: [{ rows: [["氏名", "テスト 太郎"], ["備考", ""]] }], tables: [] },
    { title: "緊急連絡先情報", grids: [{ rows: [["氏名", "甲"]] }, { rows: [["氏名", "乙"]] }], tables: [] },
    { title: "異動情報", grids: [], tables: [{ headers: ["異動開始日", "留学先"], rows: [["2024/04/01", "テスト大学"]] }] },
    { title: "特待生", grids: [], tables: [] },
  ],
};
const render = (initial?: Parameters<typeof StudentInfoScreen>[0]["initial"]) => renderToString(<StudentInfoScreen client={client} initial={initial} />);

test("項目名と値、空の値は —、複数 grid、表、空の節、開閉ボタン", () => {
  const html = render({ status: "ready", page });
  for (const s of ["学生基本情報", "氏名", "テスト 太郎", "—", "甲", "乙", "異動開始日", "テスト大学", "情報はありません", "すべて開く", "すべて閉じる"]) expect(html).toContain(s);
  expect(html).toContain('aria-expanded="true"');
});

test("3 セル以上の行がある grid は表", () => {
  const html = render({ status: "ready", page: { sections: [{ title: "T", grids: [{ rows: [["a", "b", "c"], ["1", "2", "3"]] }], tables: [] }] } });
  expect(html).toContain("<th>a</th>");
  expect(html).not.toContain("<dl");
});

test("エラー・読み込み中", () => {
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
  expect(render()).toContain("読み込み中");
});
