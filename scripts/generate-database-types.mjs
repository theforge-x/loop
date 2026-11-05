import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
// Write only after successful generation, preserving existing types on failure.
const types = execFileSync("npx", ["--no-install", "supabase", "gen", "types", "typescript", "--local"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
writeFileSync("src/lib/supabase/database.types.ts", types.replace(/[ \t]+$/gm, ""));
