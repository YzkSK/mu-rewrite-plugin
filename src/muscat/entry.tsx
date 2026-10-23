import { createRoot } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "./api/client";
import { readMenuIds } from "./api/menuIds";
import { App } from "./shell/App";
import { mountShadowRoot } from "./shell/mount";
import { nativeNav } from "./shell/nativeNav";

// 時間割の画面でだけ起動する。ほかの画面は muscat.js が担当する
if (location.pathname.includes("/kmd008/")) {
  const ids = readMenuIds(document);
  const client = createMuscatClient({ fetch: window.fetch.bind(window), doc: document, ids });
  const year = Number(document.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value) || new Date().getFullYear();
  const menuLabels = Object.keys(ids).filter((l) => l !== "学生時間割表");
  const shadow = mountShadowRoot(document, css);
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  createRoot(mountPoint).render(
    <App client={client} year={year} menuLabels={menuLabels} onNavigate={(l) => nativeNav(document, l)} />,
  );
}
