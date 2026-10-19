import { defineConfig } from "vitest/config";

// `npm run eval:manual-qa`: the live eval, with Claude and (if a key is set) Voyage. Kept out of
// `npm test`, which runs offline in CI.
export default defineConfig({
  test: {
    include: ["evals/**/*.eval.ts"],
    testTimeout: 10 * 60_000,
  },
});
