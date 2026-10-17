// Loads KEY=value lines from .env.local (git-ignored) into process.env, so the Jev key can live in a
// local file instead of the shell. Values already set in the environment win.
import { existsSync, readFileSync } from "node:fs";

const file = new URL("../../.env.local", import.meta.url);
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}
