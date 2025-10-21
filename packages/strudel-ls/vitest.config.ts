import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: [
        // Exclude entry and platform-specific glue from coverage calc for now
        "src/server.ts",
        "src/queries/**"
      ],
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
    },
  },
});