import { defineConfig } from "vitest/config";
import path from "path";

/** .mts so the config is loaded as ESM: on Node 20.18 the CJS loader cannot
 *  require Vitest's ESM-only dependencies. */
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
});
