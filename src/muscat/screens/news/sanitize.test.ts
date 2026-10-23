import { expect, test } from "bun:test";
import { sanitizeNewsHtml } from "./sanitize";

test("script / style / iframe / form 系は中身ごと除く", () => {
  const out = sanitizeNewsHtml(`<p>a</p><script>alert(1)</script><style>p{}</style><iframe>f</iframe><form><input value="v"><button>b</button></form><object>o</object><img src="x">`);
  expect(out).toBe("<p>a</p>");
});

test("on* や style, class の属性は外し、許可タグは保つ", () => {
  const out = sanitizeNewsHtml(`<div class="c" style="color:red" onclick="x()"><p onmouseover="y()">t<strong>s</strong><br></p><ul><li>l</li></ul><table><tbody><tr><td>c</td></tr></tbody></table></div>`);
  expect(out).toBe("<div><p>t<strong>s</strong><br></p><ul><li>l</li></ul><table><tbody><tr><td>c</td></tr></tbody></table></div>");
});

test("許可しないタグは中身だけ残す", () => {
  expect(sanitizeNewsHtml(`<font color="red">赤<marquee>動</marquee></font>`)).toBe("赤動");
});

test("リンク: http(s) / mailto だけ残し、target と rel を付ける。javascript: は href ごと外す", () => {
  expect(sanitizeNewsHtml(`<a href="https://example.com/p" onclick="x()">L</a>`)).toBe('<a href="https://example.com/p" target="_blank" rel="noopener noreferrer">L</a>');
  expect(sanitizeNewsHtml(`<a href="mailto:a@example.com">M</a>`)).toContain('href="mailto:a@example.com"');
  expect(sanitizeNewsHtml(`<a href="javascript:alert(1)">J</a>`)).toBe("<a>J</a>");
  expect(sanitizeNewsHtml(`<a href=" JaVaScript:alert(1)">J</a>`)).toBe("<a>J</a>");
});
