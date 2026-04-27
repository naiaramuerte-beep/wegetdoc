/**
 * One-shot: replace hardcoded €19,99 in i18n.ts with the {price} placeholder
 * so the actual price can be set at runtime from the admin panel.
 *
 * Patterns covered (in order — longer first to avoid partial match):
 *   "€19.99"  "€19,99"  "19,99 €"  "19.99 €"  "19,99€"  "19.99€"
 */
import fs from "node:fs";

const FILE = "client/src/lib/i18n.ts";
const text = fs.readFileSync(FILE, "utf8");

const patterns = [
  // Symbol-prefix variants (en/pt/it/nl/ru/zh)
  /€19\.99/g,
  /€19,99/g,
  // Symbol-suffix with space (es/fr/de/pl/uk/ro)
  /19,99 €/g,
  /19\.99 €/g,
  // Symbol-suffix no-space (paywall strings, urgency strings)
  /19,99€/g,
  /19\.99€/g,
];

let out = text;
let total = 0;
for (const re of patterns) {
  const before = out;
  out = out.replace(re, "{price}");
  const matched = (before.match(re) ?? []).length;
  total += matched;
  console.log(`  ${re.source}  →  ${matched} replacements`);
}

if (out === text) {
  console.log("\nNo changes — already refactored.");
  process.exit(0);
}

fs.writeFileSync(FILE, out);
console.log(`\n✅ Done — ${total} substitutions written to ${FILE}`);
