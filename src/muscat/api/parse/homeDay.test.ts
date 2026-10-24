import { expect, test } from "bun:test";
import { resolveRef } from "../driver/locator";
import { parseHomeDay } from "./homeDay";

const nav = `<p><span class="dateDisp">2026/10/27(火)</span></p><p class="dateBtnArea">
  <button>前週</button><button style="display:none"></button><button>前日</button><button style="display:none"></button>
  <button>今日</button><button style="display:none"></button><button>翌日</button><button style="display:none"></button>
  <button>翌週</button><button style="display:none"></button><button></button></p>`;
const allDay = `<h3><span class="portalTitle">終日</span></h3><div class="ui-panel"><button>マイスケジュール追加</button></div>
  <div class="ourscheduleArea"><p><span class="keijiTitle">掲示</span><a class="ui-commandlink" href="#">全体連絡</a></p>
  <p><span class="keijiTitle">掲示</span><a class="ui-commandlink" href="#">休講情報</a></p></div>`;
const links = `<div class="ui-dataview"><div class="ui-dataview-content"><ul><li class="ui-dataview-row"><a class="ui-commandlink" href="#">MU-LMS</a></li></ul></div></div>`;
const lesson = `<li class="ui-dataview-row"><div class="ui-panel"><div class="ui-panel-content">
  <div class="lessonHead"><p><span class="period">10:40</span><span class="period">-</span><span class="period">12:20</span></p></div>
  <div class="lessonMain"><p class="lessonTitle"> 画像・音声認識システム </p>
   <div class="lessonDetail"><p><a class="ui-commandlink" href="#">教員A</a><span>／</span><a class="ui-commandlink" href="#">教員B</a></p><div> 未使用（オンライン） </div></div>
   <div class="lessonBtnArea"><button>シラバス照会</button></div>
   <div class="ui-panel"><div class="ui-panel-content"><p>掲示1</p><p>掲示2</p></div></div>
   <input class="ui-inputtext" value="持ち物"><div class="ui-message"></div><button>登録</button></div></div></div></li>`;
const plain = `<li class="ui-dataview-row"><div class="ui-panel"><div class="ui-panel-content">
  <div class="lessonHead"><p><span class="period">17:00</span><span class="period">-</span><span class="period">18:00</span></p></div>
  <div class="lessonMain"> 面談  です </div></div></div></li>`;
const timed = (body: string) => `<h3><span class="portalTitle">時間別</span></h3><div class="ui-dataview"><div class="ui-dataview-content">${body}</div></div>`;
const doc = (day: string) =>
  new DOMParser().parseFromString(`<div id="portalCont"><div class="ui-tabs-panel">${links}</div><div class="ui-tabs-panel">${nav}${allDay}${day}${links}</div></div>`, "text/html");

test("日表示のパネルが無ければ null", () => {
  expect(parseHomeDay(new DOMParser().parseFromString(`<div id="portalCont"><div class="ui-tabs-panel">${links}</div></div>`, "text/html"))).toBeNull();
});

test("日表示のパネルはあるが「時間別」が読めなければ null(授業なしと取り違えない)", () => {
  expect(parseHomeDay(doc("<p>構造が変わった</p>"))).toBeNull();
});

test("予定なし: 日付・ナビ・終日。リンクの dataview を取り違えない", () => {
  const d = doc(timed("予定はありません。"));
  const day = parseHomeDay(d)!;
  expect(day.date).toBe("2026/10/27(火)");
  expect(day.items).toEqual([]);
  expect(day.allDay.map((a) => a.title)).toEqual(["全体連絡", "休講情報"]);
  expect(resolveRef(d, day.nav.prevDay)?.textContent).toBe("前日");
  expect(resolveRef(d, day.nav.nextWeek)?.textContent).toBe("翌週");
  expect(resolveRef(d, day.allDay[1]!.ref)?.textContent).toBe("休講情報");
});

test("授業 2 件と、lessonTitle が無い予定", () => {
  const d = doc(timed(`<ul class="ui-dataview-list-container">${lesson}${lesson.replace("10:40", "13:10").replace("12:20", "14:50")}${plain}</ul>`));
  const items = parseHomeDay(d)!.items;
  expect(items.map((i) => [i.start, i.end, i.title, i.plain])).toEqual([
    ["10:40", "12:20", "画像・音声認識システム", false],
    ["13:10", "14:50", "画像・音声認識システム", false],
    ["17:00", "18:00", "面談 です", true],
  ]);
  expect(items[0]).toMatchObject({ teachers: ["教員A", "教員B"], room: "未使用（オンライン）", keijiCount: 2 });
  expect(resolveRef(d, items[0]!.syllabusRef)?.textContent).toBe("シラバス照会");
  expect(items[0]!.memo!.value).toBe("持ち物");
  expect(resolveRef(d, items[0]!.memo!.inputRef)?.tagName).toBe("INPUT");
  expect(resolveRef(d, items[0]!.memo!.saveRef)?.textContent).toBe("登録");
});
