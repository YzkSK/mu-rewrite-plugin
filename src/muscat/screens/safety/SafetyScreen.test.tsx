import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { GenericPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { nothingToAnswer, SafetyScreen } from "./SafetyScreen";

const doc = (form: string) => new DOMParser().parseFromString(`<form id="funcForm">${form}</form>`, "text/html");
const page: GenericPage = { blocks: [{ kind: "line", items: [{ kind: "text", text: "地震の安否確認" }] }] };
const render = (d: Document) => renderToString(<SafetyScreen client={fakeClient()} doc={d} initial={{ status: "ready", page }} />);

test("nothingToAnswer: 「対象のデータが存在しません」だけのときだけ真", () => {
  expect(nothingToAnswer(doc("<span>対象のデータが存在しません。</span>"))).toBe(true);
  expect(nothingToAnswer(doc("<span>対象のデータが存在しません。</span><button>回答</button>"))).toBe(false);
  expect(nothingToAnswer(doc("<table><tr><td>地震</td></tr></table>"))).toBe(false);
});

test("回答が無ければ案内、あれば汎用の表示をカードの中に出す", () => {
  const empty = render(doc("<span>対象のデータが存在しません。</span>"));
  expect(empty).toContain("安否確認回答一覧");
  expect(empty).toContain("回答が必要な安否確認はありません");
  const some = render(doc("<table><tr><td>地震</td></tr></table>"));
  expect(some).toContain("地震の安否確認");
  expect(some).not.toContain("回答が必要な安否確認はありません");
});
