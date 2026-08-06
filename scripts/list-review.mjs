/**
 * Prints every leg whose cities were inferred rather than read from the source,
 * with the note explaining what was assumed.
 *
 * Run with:  npm run review
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, '..', 'src', 'data', 'legs.ts'), 'utf8');

const blockRe = /\{\s*id: "(ep-\d+)",([\s\S]*?)\n  \},/g;
const flagged = [];
let total = 0;
let m;

while ((m = blockRe.exec(src))) {
  const [, id, body] = m;
  total++;
  if (!/needsReview: true/.test(body)) continue;
  const get = (key) => body.match(new RegExp(`${key}: "((?:[^"\\\\]|\\\\.)*)"`))?.[1] ?? '';
  flagged.push({
    id,
    order: Number(body.match(/order: (\d+)/)?.[1]),
    from: get('fromCity'),
    to: get('toCity'),
    title: get('shortTitle'),
    note: get('reviewNote').replace(/\\"/g, '"'),
  });
}

if (!flagged.length) {
  console.log(`All ${total} legs are confirmed — nothing to review.`);
  process.exit(0);
}

console.log(`${flagged.length} of ${total} legs need review:\n`);
for (const leg of flagged) {
  const route = leg.from === leg.to ? leg.from : `${leg.from} -> ${leg.to}`;
  console.log(`Ep.${String(leg.order).padStart(2, '0')}  ${route}`);
  console.log(`        ${leg.title}`);
  console.log(`        ${leg.note}\n`);
}
console.log('Fix in src/data/legs.ts, drop needsReview + reviewNote, then: npm run build:routes');
