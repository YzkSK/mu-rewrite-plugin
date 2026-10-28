import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { EmptyState } from "./EmptyState";
import { ErrorNotice } from "./ErrorNotice";
import { Panel } from "./Panel";
import { ErrorToast, errorToast, useToast } from "./Toast";

test("Button renders a button and reflects disabled", () => {
  const html = renderToString(<Button onClick={() => {}}>OK</Button>);
  expect(html).toContain("<button");
  expect(html).not.toMatch(/ disabled[ =>]/);
  expect(renderToString(<Button disabled>OK</Button>)).toMatch(/ disabled[ =>]/);
});

test("Chip alert tone has mu-chip--alert", () => {
  expect(renderToString(<Chip tone="alert">x</Chip>)).toContain("mu-chip--alert");
  expect(renderToString(<Chip>x</Chip>)).not.toContain("mu-chip--alert");
});

test("Panel は題名の帯と actions と中身を出す", () => {
  const html = renderToString(<Panel title="成績" actions={<button>更新</button>}>中身</Panel>);
  for (const s of ["成績", "更新", "中身", "bg-muted"]) expect(html).toContain(s);
});

test("EmptyState は hint と action が無ければ出さない", () => {
  const full = renderToString(<EmptyState title="空です" hint="後で" action={<button>追加</button>} />);
  for (const s of ["空です", "後で", "追加"]) expect(full).toContain(s);
  expect(renderToString(<EmptyState title="空です" />)).not.toContain("<button");
});

test("ErrorNotice は role=alert、onRetry があるときだけ再読み込みのボタン", () => {
  const html = renderToString(<ErrorNotice title="失敗" message="通信できません" onRetry={() => {}} />);
  expect(html).toContain('role="alert"');
  for (const s of ["失敗", "通信できません", "もう一度読み込む"]) expect(html).toContain(s);
  expect(renderToString(<ErrorNotice title="失敗" message="x" />)).not.toContain("もう一度読み込む");
});

test("useToast は toast() で role=status を出し、3 秒で消える", async () => {
  let fire = (_: string) => {};
  function Host() {
    const { toast, node } = useToast();
    fire = toast;
    return <>{node}</>;
  }
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => root.render(<Host />));
  expect(el.querySelector('[role="status"]')).toBeNull();
  await act(async () => fire("保存しました"));
  expect(el.querySelector('[role="status"]')?.textContent).toBe("保存しました");
  await act(async () => void (await new Promise((r) => setTimeout(r, 3100))));
  expect(el.querySelector('[role="status"]')).toBeNull();
  await act(async () => root.unmount());
}, 15_000); // 本物の時計で 3 秒待つので、全部を並べて流して重いときに既定の 5 秒を超えることがあった


test("errorToast に action を渡すと、新しいタブで開くリンクが出て、押すと閉じる", async () => {
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => root.render(<ErrorToast />));
  await act(async () => errorToast("ログインしてください", "切れています", { label: "ログイン", href: "https://example.com/login" }));
  const a = el.querySelector("a");
  expect(a?.getAttribute("href")).toBe("https://example.com/login");
  expect(a?.getAttribute("target")).toBe("_blank");
  expect(a?.textContent).toBe("ログイン");
  el.addEventListener("click", (e) => e.preventDefault()); // テストで本当に移動しない
  await act(async () => void a?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(el.querySelector('[role="alert"]')).toBeNull();
  await act(async () => root.unmount());
});
