import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// 既定は MUSCAT、--mode portal で MU ポータル(出力先は同じ extension/dist)
export default defineConfig(({ mode }) => {
  const portal = mode === "portal";
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      outDir: "extension/dist",
      emptyOutDir: false,
      lib: {
        entry: portal ? "src/portal/entry.tsx" : "src/muscat/entry.tsx",
        formats: ["iife"],
        name: portal ? "MuPortal" : "MuMuscat",
        fileName: () => (portal ? "portal-react.js" : "muscat-react.js"),
      },
    },
  };
});
