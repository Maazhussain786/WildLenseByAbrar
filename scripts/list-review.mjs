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
const TOURS_DIR = path.join(HERE, '..', 'src', 'data', 'tours');

const files = fs
  .readdirSync(TOURS_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .sort();

let grandTotal = 0;
let grandFlagged = 0;

for (const file of files) {
  const src = fs.readFileSync(path.join(TOURS_DIR, file), 'utf8');
  const tourTitle = src.match(/title: '([^']+)'/)?.[1] ?? file;

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

  grandTotal += total;
  grandFlagged += flagged.length;

  console.log(`\n${tourTitle}  (${file})`);
  if (!flagged.length) {
    console.log(`  All ${total} legs confirmed — nothing to review.`);
    continue;
  }
  console.log(`  ${flagged.length} of ${total} legs need review:\n`);
  for (const leg of flagged) {
    const route = leg.from === leg.to ? leg.from : `${leg.from} -> ${leg.to}`;
    console.log(`  Ep.${String(leg.order).padStart(2, '0')}  ${route}`);
    console.log(`          ${leg.title}`);
    console.log(`          ${leg.note}\n`);
  }
}

if (grandFlagged) {
  console.log(
    `\n${grandFlagged} of ${grandTotal} legs flagged across ${files.length} tour(s).\n` +
      'Fix in src/data/tours/<tour>.ts, drop needsReview + reviewNote, then: npm run build:routes'
  );
}
