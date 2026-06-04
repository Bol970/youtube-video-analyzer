import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Тот же алиас "@/...", что и в tsconfig.json.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
