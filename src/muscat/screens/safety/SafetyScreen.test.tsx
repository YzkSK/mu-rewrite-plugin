import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { GenericPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { SafetyScreen } from "./SafetyScreen";

const page: GenericPage = { blocks: [{ kind: "line", items: [{ kind: "text", text: "地震の安否確認" }] }] };
const render = (nothingToAnswer: boolean) => renderToString(<SafetyScreen client={fakeClient()} initial={{ status: "ready", page, nothingToAnswer }} />);

test("回答が無ければ案内、あれば汎用の表示をカードの中に出す", () => {
  const empty = render(true);
  expect(empty).toContain("安否確認回答一覧");
  expect(empty).toContain("回答が必要な安否確認はありません");
  const some = render(false);
  expect(some).toContain("地震の安否確認");
  expect(some).not.toContain("回答が必要な安否確認はありません");
});
