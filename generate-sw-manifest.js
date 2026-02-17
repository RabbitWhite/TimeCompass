/**
 * Post-build script: injects a precache manifest into sw.js
 *
 * Scans dist/ for all built assets and replaces the PRECACHE_MANIFEST
 * placeholder in sw.js with the actual file list, so the service worker
 * can precache everything at install time.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const DIST = 'dist';
const BASE = '/Lifetracker/';

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const files = walkDir(DIST)
  .map((f) => BASE + relative(DIST, f))
  .filter((f) => !f.endsWith('.map')); // skip sourcemaps

const swPath = join(DIST, 'sw.js');
let sw = readFileSync(swPath, 'utf-8');
sw = sw.replace(
  "'__PRECACHE_MANIFEST__'",
  JSON.stringify(files, null, 2)
);
writeFileSync(swPath, sw);

console.log(`sw.js: injected ${files.length} files into precache manifest`);
