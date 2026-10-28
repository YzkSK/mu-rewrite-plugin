import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { HomeScreen, TodayMiss } from "./HomeScreen";
import type { HomeData } from "./home";

const NOW = new Date(2026, 9, 27, 12, 0);
const s = Math.floor(NOW.getTime() / 1000);
const due = (name: string, t: number, o: object = {}) => ({ name, course: "コースA", due: t, overdue: false, canSubmit: true, url: "https://x/" + name, kind: "assign", ...o });
const data: HomeData = {
  due: [
    due("過去提出可", s - 3600, { overdue: true }),
    due("過去締切", s - 7200, { overdue: true, canSubmit: false, kind: "quiz" }),
    due("明日", s + 86400 + 3600),
    due("来月", s + 20 * 86400, { kind: "other" }),
  ],
  news: [{ subject: "件名A", author: "碧海 寿広", at: new Date(2026, 8, 24).getTime(), url: "https://x/f" }],
  recent: [{ id: 1, name: "英語基礎C", url: "https://x/c" }],
};
const html = (d: HomeData) => renderToString(<HomeScreen userId={1} initial={d} now={NOW} />);

test("提出期限: 札・小見出し・状態・種類名", () => {
  const h = html(data);
  // 締め切られたものは並べず件数の行に畳む。札はまだ出せるものだけ数える
  for (const t of ["期限切れ 1", "期限切れ・まだ出せる", "締め切られた未提出 1 件", "<details", "今週", "それより先", "まだ出せる", "締切", "あと 1 日 1 時間", "課題、コースA", "小テスト、コースA", "other、コースA", "提出済みの課題は出ません"]) expect(h).toContain(t);
});

test("アナウンスと最近のコース", () => {
  const h = html(data);
  for (const t of ["件名A", "碧海 寿広、9/24", "英語基礎C", 'href="/my/courses.php"', "マイコース"]) expect(h).toContain(t);
});

test("今日の授業: MUSCAT の時間割を取れないときも欄を出す(未ログインなら入口)", () => {
  const login = renderToString(<TodayMiss login />);
  for (const t of ["今日の授業", "MUSCAT にログインすると表示されます", "ShibbolethAuthServlet", 'target="_blank"']) expect(login).toContain(t);
  const fail = renderToString(<TodayMiss login={false} />);
  expect(fail).toContain("読み込めなかったため表示できません");
  expect(fail).not.toContain("ShibbolethAuthServlet");
});

test("空・欄ごとの失敗・全部失敗", () => {
  const h = html({ due: [], news: [], recent: null });
  for (const t of ["提出期限のある課題はありません", "新しいアナウンスはありません", "読み込めませんでした"]) expect(h).toContain(t);
  expect(h).not.toContain("もう一度読み込む");
  expect(html({ due: null, news: null, recent: null })).toContain("もう一度読み込む");
});
