import { defineConfig } from "vitest/config";

/**
 * The worker's own tests. They never touch the network, Mongo or WhatsApp:
 * everything they cover is either pure or given a stub, so `npm test` is safe
 * to run anywhere and costs no Serper credits.
 *
 * The placeholder environment is needed because importing `config` *is* the
 * environment check — that is what makes a missing variable fail at startup
 * rather than at 7am, and `serper.ts` imports it for the fetch half. These
 * values are never used: no test makes a request. They are deliberately
 * obvious nonsense so that a test which somehow did reach the network would
 * fail loudly rather than spend a credit.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: {
      MONGODB_URI: "mongodb://not-used-by-any-test",
      MONGODB_DB: "not-used",
      DIGEST_URL: "http://digest.invalid/api/digest",
      CRON_SECRET: "not-a-real-secret",
      WHATSAPP_GROUP_JID: "0@g.us",
      SERPER_API_KEY: "not-a-real-key",
    },
  },
});
