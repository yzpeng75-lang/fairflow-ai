import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "src/auto-monitor.ts",
      name: "FairFlowAutoMonitor",
      formats: ["iife"],
      fileName: () => "auto-monitor.js",
    },
  },
});
