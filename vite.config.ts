import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: { outDir: "dist", sourcemap: false },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts"],
  },
} as any);
