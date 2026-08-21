import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/.next/**", "**/dist/**", "**/node_modules/**"],
  },
});
