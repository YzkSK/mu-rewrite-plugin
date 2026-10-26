import { expect, test } from "bun:test";
import { resolveRef } from "../driver/locator";
import { ParseError } from "../errors";
import { parseHome } from "./home";

const noticeRow = (title: string, date = "2026/10/19", src = "テスト部署") =>
  `<li class="ui-dataview-row"><div class="ui-dataview-content"><span>掲示</span> <span>${date}</span> <a class="ui-commandlink" href="#">${title}</a> [<span>${src}</span>]</div></li>`;

const html = `<div id="portalSupport"><div class="ui-tabs"><ul class="ui-tabs-nav">
  <li class="ui-tabs-selected"><a href="#a">重要</a></li><li><a href="#b">期限あり</a></li></ul>
  <div class="ui-tabs-panels"><div class="ui-tabs-panel"><div class="ui-dataview-list"><ul>${noticeRow("件名A")}${noticeRow("件名B", "2026/10/18", "別部署")}</ul></div>
  <div class="ui-outputpanel"><a class="ui-commandlink" href="#">もっと見る</a></div></div>
  <div class="ui-tabs-panel"><div class="ui-dataview-list">情報はありません。</div></div></div></div></div>
  <div id="portalCont"><p class="newNumber">
   18
  </p><a href="#k"><span class="infoIcon infoKeiji"></span></a><a href="#t"><span class="infoIcon infoTimetable"></span></a></div>`;
const doc = (h = html) => new DOMParser().parseFromString(h, "text/html");

test("#portalCont が無ければ ParseError", () => {
  expect(() => parseHome(doc("<p>x</p>"))).toThrow(ParseError);
});

test("お知らせ: 全タブを読む(行あり / 情報はありません)。もっと見るは行にしない", () => {
  const p = parseHome(doc());
  expect(p.notices.map((t) => [t.name, t.selected, t.empty, t.items.length])).toEqual([["重要", true, false, 2], ["期限あり", false, true, 0]]);
  expect(p.notices[0]!.items[0]).toMatchObject({ date: "2026/10/19", title: "件名A", source: "テスト部署" });
  expect(p.notices[0]!.items[1]).toMatchObject({ date: "2026/10/18", title: "件名B", source: "別部署" });
});

test("ref: 件名・タブ・インフォメーションが元の要素を引ける", () => {
  const d = doc();
  const p = parseHome(d);
  expect(resolveRef(d, p.notices[0]!.items[0]!.openRef)?.textContent).toBe("件名A");
  expect(resolveRef(d, p.notices[1]!.ref)?.textContent).toBe("期限あり");
  expect(resolveRef(d, p.keijiRef)?.getAttribute("href")).toBe("#k");
  expect(resolveRef(d, p.timetableChangeRef)?.getAttribute("href")).toBe("#t");
  expect(parseHome(d).notices[0]!.items[0]!.openRef).toBe(p.notices[0]!.items[0]!.openRef);
});

test("未読数(前後の空白を除く)。取れなければ null", () => {
  expect(parseHome(doc()).unreadKeiji).toBe(18);
  const p = parseHome(doc(`<div id="portalCont"></div>`));
  expect(p).toMatchObject({ unreadKeiji: null, keijiRef: "", timetableChangeRef: "", notices: [], day: null, detail: null });
});

