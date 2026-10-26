import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// 既定は MUSCAT、--mode portal で MU ポータル、--mode lms で MU-LMS(出力先は同じ extension/dist)
const TARGETS: Record<string, { entry: string; name: string; file: string }> = {
  portal: { entry: "src/portal/entry.tsx", name: "MuPortal", file: "portal-react.js" },
  lms: { entry: "src/lms/entry.tsx", name: "MuLms", file: "lms-react.js" },
};
export default defineConfig(({ mode }) => {
  const t = TARGETS[mode] ?? { entry: "src/muscat/entry.tsx", name: "MuMuscat", file: "muscat-react.js" };
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      outDir: "extension/dist",
      emptyOutDir: false,
      lib: {
        entry: t.entry,
        formats: ["iife"],
        name: t.name,
        fileName: () => t.file,
      },
    },
  };
});
