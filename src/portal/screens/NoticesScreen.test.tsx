import { afterEach, beforeEach, expect, test } from "bun:test";
import { createRoot, type Root } from "react-dom/client";
import { NoticesScreen } from "./NoticesScreen";

const flush = () => new Promise((r) => setTimeout(r, 30));
const at = (d: Date) => Math.floor(d.getTime() / 1000);
const item = (n: number, o: Record<string, unknown> = {}) => ({
  uuid: `u${n}`, title: `件名${n}`, content: `<p>本文${n}</p><script>x</script>`, publish_from: "教務課", publish_start_at: at(new Date(2026, 9, 23, 9, 0)),
  publish_end_at: at(new Date(2026, 10, 30, 23, 59)), is_read: false, category: { name: "重要" }, ...o,
});
const cats = [{ uuid: "c1", name: "全学", unread_count: 3, children: [{ uuid: "c2", name: "教務", unread_count: 1 }] }];
const ok = (result: unknown) => new Response(JSON.stringify({ is_successful: true, result }));

let calls: string[] = [];
let root: Root;
let host: HTMLElement;
const mount = (pageTotal = 2) => {
  globalThis.fetch = (async (u: string, init?: RequestInit) => {
    calls.push((init?.method ?? "GET") + " " + u);
    if (u.includes("/api/information-category/tree")) return ok({ items: cats });
    if (u.includes("/api/information/")) {
      if (init?.method === "PUT") return ok({});
      return ok({ items: [item(1, { files: [{ uuid: "f1", file_name: "要項.pdf", mime_type: "application/pdf" }], event_title: "説明会" }), item(2, { is_read: true })], page_total: pageTotal, item_count: 42 });
    }
    throw new Error("unexpected " + u);
  }) as unknown as typeof fetch;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<NoticesScreen />);
};
beforeEach(() => { calls = []; });
afterEach(() => { root.unmount(); host.remove(); });

test("ツールバー・行・先頭の本文・さらに表示", async () => {
  mount();
  await flush();
  const t = host.textContent ?? "";
  for (const s of ["すべて", "未読 3", "ピン留め", "42 件", "すべて既読にする", "件名1", "件名2", "教務課", "重要、教務課", "さらに表示"]) expect(t).toContain(s);
  expect(host.querySelector('[aria-label="お知らせを探す"]')).not.toBeNull();
  expect([...host.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["すべてのカテゴリ", "全学(3)", "　教務(1)"]);
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(3);
  expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("すべて");
  // 先頭の本文
  const article = host.querySelector("article")!.textContent ?? "";
  for (const s of ["件名1", "公開期間 2026.10.23(金) 09:00 〜 2026.11.30(月) 23:59", "【イベント】説明会", "本文1", "要項.pdf", "PDF", "既読にする"]) expect(article).toContain(s);
  expect(article).not.toContain("x</script>");
  expect(host.querySelector("article script")).toBeNull();
  expect(host.querySelector('a[href="/api/file/view/f1"]')?.getAttribute("target")).toBe("_blank");
  expect(calls.some((c) => c.includes("/api/information/1?page_size=20&recursive=true"))).toBe(true);
});

test("最後のページなら「さらに表示」は出ない", async () => {
  mount(1);
  await flush();
  expect(host.textContent).not.toContain("さらに表示");
});

test("既読にする: PUT して未読の数が減り、ボタンが替わる。すべて既読は確認してから", async () => {
  mount();
  await flush();
  const btn = [...host.querySelectorAll("article button")].find((b) => b.textContent === "既読にする") as HTMLElement;
  btn.click();
  await flush();
  expect(calls).toContain("PUT /api/information/set-read-selected/");
  expect(host.querySelector("article")!.textContent).toContain("未読に戻す");
  expect(host.textContent).toContain("未読 2");
  const all = [...host.querySelectorAll("button")].find((b) => b.textContent === "すべて既読にする") as HTMLElement;
  all.click();
  await flush();
  const dialog = host.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("全カテゴリのお知らせを、すべて既読にしますか?");
  expect(calls.some((c) => c.includes("set-read-all"))).toBe(false);
  ([...dialog.querySelectorAll("button")].find((b) => b.textContent === "既読にする") as HTMLElement).click();
  await flush();
  expect(calls.some((c) => c.includes("set-read-all"))).toBe(true);
  expect(host.querySelector('[role="dialog"]')).toBeNull();
});
