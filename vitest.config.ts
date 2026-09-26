import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { reporter: ["text", "lcov"], include: ["src/lib/**"] },
  },
  resolve: {
    alias: { rollup: "@rollup/wasm-node", "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
