import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "extension/dist",
    emptyOutDir: false,
    lib: {
      entry: "src/muscat/entry.tsx",
      formats: ["iife"],
      name: "MuMuscat",
      fileName: () => "muscat-react.js",
    },
  },
});
