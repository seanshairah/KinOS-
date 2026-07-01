#!/usr/bin/env node
/**
 * Language guard — enforces the first non-negotiable:
 * the word "AI" (or any model/provider name) must never render in the UI.
 *
 * Scans user-facing source (apps/web + packages/ui) for banned terms inside
 * JSX text, string literals, and template strings. Server-only packages
 * (packages/ai, packages/engine internals) are exempt — the intelligence
 * exists, it just never speaks its own name.
 *
 * Exits non-zero with file:line references when a violation is found.
 * Wired into CI (see .github/workflows/ci.yml).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const SCAN_DIRS = ["apps/web/src", "packages/ui/src"];
const EXTENSIONS = [".ts", ".tsx", ".mdx", ".md", ".json"];

// Word-boundary patterns. "AI" is matched as a standalone word so words like
// "maintain", "email", "detail" pass.
const BANNED = [
  { re: /\bAI\b/g, label: '"AI"' },
  { re: /\bA\.I\.\b/g, label: '"A.I."' },
  { re: /artificial intelligence/gi, label: '"artificial intelligence"' },
  { re: /machine learning/gi, label: '"machine learning"' },
  { re: /\bLLM\b/g, label: '"LLM"' },
  { re: /\bGPT\b/g, label: '"GPT"' },
  { re: /\bClaude\b/g, label: '"Claude"' },
  { re: /\bAnthropic\b/g, label: '"Anthropic"' },
  { re: /\bOpenAI\b/gi, label: '"OpenAI"' },
  { re: /algorithmic prediction/gi, label: '"algorithmic prediction"' },
  { re: /\bchatbot\b/gi, label: '"chatbot"' },
  { re: /risk detected/gi, label: '"risk detected"' },
  { re: /anomaly/gi, label: '"anomaly"' },
  { re: /non-compliance/gi, label: '"non-compliance"' },
];

// Lines that are provably not user-facing copy.
const LINE_EXEMPT = /language-guard-exempt/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      yield* walk(full);
    } else if (EXTENSIONS.some((e) => full.endsWith(e))) {
      yield full;
    }
  }
}

const violations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (LINE_EXEMPT.test(line)) return;
      for (const { re, label } of BANNED) {
        re.lastIndex = 0;
        if (re.test(line)) {
          violations.push(
            `${relative(ROOT, file)}:${i + 1} contains ${label}`,
          );
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Language guard failed — product-facing code must speak KinOS language:\n");
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nUse KinOS terms instead: Daily Brief, Attention Needed, Life Signals, Patterns, Worth a check, Family Memory.",
  );
  process.exit(1);
}
console.log("Language guard passed — no model or provider names in the product surface.");
