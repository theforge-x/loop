import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
 resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
 test: { environment: "jsdom", include: ["tests/components/**/*.test.tsx"], setupFiles: ["tests/components/setup.ts"], maxWorkers: 1 },
});
