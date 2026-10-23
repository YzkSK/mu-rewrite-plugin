import { screenCodeOf } from "@/muscat/shell/screenCode";
import type { Core } from "./core";
import { parseInfoSections } from "./parse/infoSections";
import type { MenuLabel } from "./session";
import type { InfoPage } from "./types";

/** 開くだけで全部入っている情報画面(部分更新なし) */
export function getInfoPage(core: Core, label: MenuLabel, code: string): Promise<InfoPage> {
  const isReady = (d: Document) => screenCodeOf(d) === code && !!d.querySelector("#funcForm .ui-accordion-header");
  return core.run(async (ctx) => {
    if (!(await ctx.open(label, isReady))) return null;
    return parseInfoSections(ctx.doc());
  });
}
