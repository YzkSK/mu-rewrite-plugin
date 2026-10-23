import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Drawer } from "./Drawer";
import { Header } from "./Header";

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

test("Drawer toggles aria-hidden and lists items", () => {
  const items = [
    { label: "出席確認", onSelect: () => {} },
    { label: "成績照会", onSelect: () => {} },
  ];
  const closed = renderToString(<Drawer open={false} items={items} onClose={() => {}} />);
  expect(closed).toContain('aria-hidden="true"');
  const open = renderToString(<Drawer open items={items} onClose={() => {}} />);
  expect(open).toContain('aria-hidden="false"');
  expect(open).toContain("出席確認");
  expect(open).toContain("成績照会");
});

test("Header has a menu button and shows title and user", () => {
  const html = renderToString(<Header title="学生時間割表" user="太郎" onMenu={() => {}} />);
  expect(html).toContain('aria-label="メニュー"');
  expect(html).toContain("学生時間割表");
  expect(html).toContain("太郎");
});
