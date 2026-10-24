import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Button } from "./Button";
import { Chip } from "./Chip";

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


