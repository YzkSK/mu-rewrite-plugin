import { expect, test } from "bun:test";
import { parseCourseList } from "./courseList";

const lesson = (i: number, title: string, head: string, keiji: string, memo = "持ち物") => `<li class="ui-dataview-row"><div class="ui-panel"><div class="ui-panel-content">
  <div class="lessonHead">${head}</div>
  <div class="lessonMain"><p class="lessonTitle"> ${title} </p>
   <div class="lessonDetail"><p><a class="ui-commandlink" href="#">教員A</a><span>／</span><a class="ui-commandlink" href="#">教員B</a></p><div> 本館 101 </div></div>
   <div class="lessonBtnArea"><button id="s${i}">シラバス照会</button></div>
   <div class="lessonKeijiArea"><div class="ui-panel"><div class="ui-panel-content">${keiji}</div></div></div>
   <input class="ui-inputtext" name="funcForm:l:${i}:jugyoMemo" value="${memo}"><button id="funcForm:l:${i}:save">登録</button></div></div></div></li>`;
const doc = (...items: string[]) =>
  new DOMParser().parseFromString(`<div id="portalLessonList"><ul>${items.join("")}</ul></div><ul><li class="ui-dataview-row">別</li></ul>`, "text/html");

test("授業名・時限(全角数字も)・教員・教室・掲示・メモ", () => {
  const [a, b] = parseCourseList(
    doc(
      lesson(0, "画像認識", `<span>火 ２</span><span>／</span><span>火 3</span>`, `<p>2026/10/20 <a href="#">休講のお知らせ</a></p><p>2026/10/21 補講について</p>`),
      lesson(1, "演習", `<span>月 1</span>`, ""),
    ),
  );
  expect(a).toEqual({
    title: "画像認識",
    slots: [{ weekday: "火", period: 2 }, { weekday: "火", period: 3 }],
    teachers: ["教員A", "教員B"],
    room: "本館 101",
    notices: [{ date: "2026/10/20", title: "休講のお知らせ" }, { date: "2026/10/21", title: "補講について" }],
    memo: { value: "持ち物", inputName: "funcForm:l:0:jugyoMemo", saveId: "funcForm:l:0:save" },
  });
  expect(b!.notices).toEqual([]);
});

test("履修授業の一覧が無ければ空", () => {
  expect(parseCourseList(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toEqual([]);
});
