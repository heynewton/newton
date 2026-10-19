import { defineConfig } from "vitest/config";

// Every number Newton reports comes from this package (principle 2), so its tests are held to a
// coverage bar: CI fails when a change drops below it.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      reporter: ["text", "json-summary", "json"],
      reportOnFailure: true,
      thresholds: { lines: 95, branches: 95 },
    },
  },
});
