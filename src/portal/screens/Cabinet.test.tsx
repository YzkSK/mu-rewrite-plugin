import { afterEach, beforeEach, expect, test } from "bun:test";
import { createRoot, type Root } from "react-dom/client";
import { Cabinet } from "./Cabinet";

const flush = () => new Promise((r) => setTimeout(r, 30));
const ok = (result: unknown) => new Response(JSON.stringify({ is_successful: true, result }));
const at = Math.floor(new Date(2026, 0, 5).getTime() / 1000);

const tree: Record<string, any[][]> = {
  root: [[
    { uuid: "d1", name: "規程", is_file: false },
    { uuid: "f0", name: "ルート書類.pdf", is_file: true, size: 2048, updated_at: at },
    { uuid: "d2", name: "非公開", is_file: false, has_read_permission: false },
  ]],
  d1: [
    [{ uuid: "f1", name: "学則.pdf", is_file: true, size: 1536, updated_at: at }, { uuid: "d3", name: "旧版", is_file: false }],
    [{ uuid: "f2", name: "細則.pdf", is_file: true }],
  ],
  d3: [[]],
};
let calls: string[] = [];
let root: Root;
let host: HTMLElement;
const mount = (failRoot = false) => {
  globalThis.fetch = (async (u: string) => {
    calls.push(u);
    const m = /\/api\/shared-item\/(\d+)\/(.+)$/.exec(u)!;
    if (failRoot) return new Response("x", { status: 500 });
    const pages = tree[m[2]!]!;
    return ok({ items: pages[Number(m[1]) - 1] ?? [], page_total: pages.length });
  }) as unknown as typeof fetch;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<Cabinet data={{ folderUuid: "root", header: "電子キャビネット" }} />);
};
const btn = (label: string) => [...host.querySelectorAll("button")].find((b) => b.textContent === label) as HTMLElement;
beforeEach(() => { calls = []; history.replaceState(null, ""); });
afterEach(() => { root.unmount(); host.remove(); });

test("ルート: フォルダのグリッド(権限なしは除く)と件数", async () => {
  mount();
  await flush();
  const t = host.textContent ?? "";
  expect(t).toContain("電子キャビネット");
  expect(t).toContain("1 フォルダ");
  expect(t).toContain("規程");
  expect(t).not.toContain("非公開");
  expect(btn("規程")).toBeDefined();
});

test("フォルダの中: 全ページ取得・表・パンくず・上へ・履歴", async () => {
  mount();
  await flush();
  btn("規程").click();
  await flush();
  expect(calls.filter((c) => c.includes("/d1"))).toHaveLength(2); // 2 ページ
  const t = host.textContent ?? "";
  for (const s of ["名前", "大きさ", "更新日", "学則.pdf", "細則.pdf", "1.5 KB", "2026/1/5", "上のフォルダへ"]) expect(t).toContain(s);
  expect(t.indexOf("旧版")).toBeLessThan(t.indexOf("学則.pdf")); // フォルダが先
  expect(host.querySelector('a[href="/api/shared-file/view/f1"]')?.getAttribute("target")).toBe("_blank");
  expect((history.state as any).muFs.stack.map((f: any) => f.uuid)).toEqual(["root", "d1"]);
  btn("旧版").click();
  await flush();
  expect(host.textContent).toContain("フォルダの中にファイルはありません");
  btn("上のフォルダへ").click();
  await flush();
  expect(host.textContent).toContain("学則.pdf");
});

test("履歴から積み直す・失敗", async () => {
  history.replaceState({ muFs: { root: "root", stack: [{ uuid: "root", name: "電子キャビネット" }, { uuid: "d1", name: "規程" }] } }, "");
  mount();
  await flush();
  expect(host.textContent).toContain("学則.pdf");
  root.unmount();
  host.remove();
  history.replaceState(null, "");
  mount(true);
  await flush();
  expect(host.textContent).toContain("読み込めませんでした");
});
