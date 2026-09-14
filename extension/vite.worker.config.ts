import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "src/service-worker.ts",
      name: "FairFlowServiceWorker",
      formats: ["iife"],
      fileName: () => "service-worker.js",
    },
  },
});
