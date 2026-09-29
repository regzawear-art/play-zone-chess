// Copies the Stockfish WASM binary from the `stockfish` npm package into
// public/stockfish/stockfish.wasm (next to the existing stockfish.js).
//
// The .wasm is git-ignored (it is ~108 MB, over GitHub's 100 MB limit), so it must be
// (re)created on every fresh clone / deploy. This runs automatically via `postinstall`,
// or manually with:  npm run setup:stockfish
//
// The correct file is identified by exact byte size: public/stockfish/stockfish.js
// embeds the size of the wasm it was built for, so we only accept a binary that matches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsFile = path.join(root, 'public/stockfish/stockfish.js');
const dest = path.join(root, 'public/stockfish/stockfish.wasm');
const pkgDir = path.join(root, 'node_modules/stockfish');
const soft = process.argv.includes('--soft'); // don't fail `npm install` on problems

function bail(msg) {
  console.error('[stockfish-wasm] ' + msg);
  process.exit(soft ? 0 : 1);
}c

if (!fs.existsSync(jsFile)) bail('missing ' + path.relative(root, jsFile));
if (!fs.existsSync(pkgDir)) bail('node_modules/stockfish not found - run `npm install` first');

// Expected wasm size, embedded in the loader as `l=<bytes>`.
const m = fs.readFileSync(jsFile, 'utf8').match(/\bl=(\d{6,})\b/);
const expected = m ? Number(m[1]) : null;

if (fs.existsSync(dest) && (!expected || fs.statSync(dest).size === expected)) {
  console.log('[stockfish-wasm] already in place (' + fs.statSync(dest).size + ' bytes)');
  process.exit(0);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.wasm')) out.push(p);
  }
  return out;
}

const candidates = walk(pkgDir).map((p) => ({ p, size: fs.statSync(p).size }));
if (!candidates.length) bail('no .wasm files found inside node_modules/stockfish');

const match = expected ? candidates.find((c) => c.size === expected) : null;
if (!match) {
  bail(
    `no wasm with the expected size (${expected}) found. Candidates:\n` +
      candidates.map((c) => `  ${path.relative(root, c.p)}  ${c.size} bytes`).join('\n') +
      '\nstockfish.js and the wasm must come from the same build.',
  );
}

fs.copyFileSync(match.p, dest);
console.log(`[stockfish-wasm] copied ${path.relative(root, match.p)} -> ${path.relative(root, dest)} (${match.size} bytes)`);
