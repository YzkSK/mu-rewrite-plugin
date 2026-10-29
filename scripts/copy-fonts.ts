// IBM Plex Sans JP(400/500/600/700, normal)を extension/fonts に同梱する。CSS の url は CSS からの相対のまま files/ に置く
import { mkdir, rm, copyFile } from "node:fs/promises";

const SRC = "node_modules/@fontsource/ibm-plex-sans-jp";
const OUT = "extension/fonts";
await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/files`, { recursive: true });

let css = "";
for (const w of [400, 500, 600, 700]) {
  css += (await Bun.file(`${SRC}/${w}.css`).text())
    .replace(/, url\([^)]*\.woff\) format\('woff'\)/g, "") // woff2 のみ(Chrome 拡張なら足りる)
    .replace(/font-display:\s*swap/g, "font-display: block"); // 届くまで別の書体で描かない
}
await Bun.write(`${OUT}/ibm-plex-sans-jp.css`, css);
const files = new Set(css.match(/files\/[^)]*\.woff2/g));
if (!files.size || css.includes(".woff)")) throw new Error("fontsource の CSS の形が変わった");
for (const f of files) await copyFile(`${SRC}/${f}`, `${OUT}/${f}`);
