import { afterEach, expect, test } from "bun:test";
import { createRoot, type Root } from "react-dom/client";
import { AccountDialog } from "./AccountDialog";

const flush = () => new Promise((r) => setTimeout(r, 50));
const ok = (result: unknown) => new Response(JSON.stringify({ is_successful: true, result }));
const at = Math.floor(new Date(2026, 9, 26, 2, 19).getTime() / 1000);
let root: Root;
let host: HTMLElement;
let closed = 0;

const mount = async () => {
  globalThis.fetch = (async (u: string) => {
    if (u === "/api/auth/check-logged-in") {
      return new Response(JSON.stringify({ is_successful: true, result: {}, user: {
        user_id: "u01", personal_id: "p01", name: "山田 太郎", name_kana: "ヤマダ タロウ", name_alphabet: null, email: "a@b.c",
        option_1: "x", option_2: null, option_3: "y", auth_profiles: { name: "テナントA" }, display_group_names: ["A学部", "B学科"], password_hash: "SECRET-PW",
      } }));
    }
    if (u.startsWith("/api/device/")) return ok({ page_total: 1, items: [{ id: 1, device_type: "ios", created_at: at, push_token: "SECRET-TOKEN", token: "SECRET2" }] });
    const p = Number(u.split("/").pop());
    return ok({ page_total: 2, items: [{ uuid: "u" + p, action: p === 1 ? "login" : "logout", type: "app", platform: "android", description: "d" + p, remote_address: "1.2.3." + p, created_at: at, token: "SECRET3" }] });
  }) as unknown as typeof fetch;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<AccountDialog userName="山田 太郎" onClose={() => closed++} />);
  await flush();
};
const tab = (label: string) => [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => b.textContent === label)!;
afterEach(() => { root.unmount(); host.remove(); closed = 0; });

test("情報: check-logged-in から行を作る", async () => {
  await mount();
  const t = host.textContent!;
  for (const s of ["u01", "p01", "山田 太郎", "ヤマダ タロウ", "a@b.c", "x、y", "A学部", "B学科"]) expect(t).toContain(s);
  expect(t).toContain("登録されていません"); // 氏名(英)
  expect(t).not.toContain("SECRET");
});

test("登録デバイス: 種類と登録日、トークンは出さない", async () => {
  await mount();
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  tab("山田 太郎 さんの情報"); // 名前入りの見出し
  tab("登録デバイス").click();
  await flush();
  expect(host.textContent).toContain("iOS");
  expect(host.textContent).toContain("2026.10.26(月) 02:19");
  expect(host.textContent).not.toContain("SECRET");
});

test("アクティビティログ: ラベル変換と さらに表示", async () => {
  await mount();
  tab("アクティビティログ").click();
  await flush();
  expect(host.textContent).toContain("サインイン");
  expect(host.textContent).toContain("アプリ / Android");
  expect(host.textContent).toContain("1.2.3.1");
  expect(host.textContent).not.toContain("SECRET");
  const more = () => [...host.querySelectorAll("button")].find((b) => b.textContent === "さらに表示");
  more()!.click();
  await flush();
  expect(host.textContent).toContain("サインアウト");
  expect(more()).toBeUndefined();
});

test("閉じる: ボタンと Esc", async () => {
  await mount();
  host.querySelector<HTMLElement>('[aria-label="閉じる"]')!.click();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(closed).toBe(2);
});
