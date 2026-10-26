import { expect, test } from "bun:test";
import { nothingToAnswer } from "./safety";

const doc = (form: string) => new DOMParser().parseFromString(`<form id="funcForm">${form}</form>`, "text/html");

test("nothingToAnswer: 「対象のデータが存在しません」だけのときだけ真", () => {
  expect(nothingToAnswer(doc("<span>対象のデータが存在しません。</span>"))).toBe(true);
  expect(nothingToAnswer(doc("<span>対象のデータが存在しません。</span><button>回答</button>"))).toBe(false);
  expect(nothingToAnswer(doc("<table><tr><td>地震</td></tr></table>"))).toBe(false);
});
