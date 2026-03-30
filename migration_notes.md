# PWA Fixes — Migration Notes

## Fix 1: Automated Cache Busting — Dry-Run Trace

### What build-cdn.sh does (relevant lines):

```
Line 6:   GIT_SHA=$(git rev-parse --short HEAD)
          # e.g. GIT_SHA = "a3f92b1"

Lines 67–195: cat > dist/sw.js << 'SWEOF'
          # Writes dist/sw.js with the literal string:
          #   const CACHE_NAME = 'lifetracker-v11';

Line 199: sed -i "s/lifetracker-v[0-9]*/lifetracker-${GIT_SHA}/" dist/sw.js
          # Replaces 'lifetracker-v11' → 'lifetracker-a3f92b1'
```

### Trace for a single run (hypothetical SHA = a3f92b1):

1. `GIT_SHA` is set to `a3f92b1` before anything is written.
2. The heredoc writes `dist/sw.js` with `const CACHE_NAME = 'lifetracker-v11';`.
3. `sed -i` runs on the freshly-written `dist/sw.js`:
   - Pattern: `s/lifetracker-v[0-9]*/lifetracker-a3f92b1/`
   - Match: `lifetracker-v11` (matches `lifetracker-v` + one-or-more digits)
   - Result: `const CACHE_NAME = 'lifetracker-a3f92b1';`
4. `dist/sw.js` is ready for deployment with a unique cache name per commit.

### Idempotency check (running build-cdn.sh twice in a row):

- First run: writes `lifetracker-v11`, then sed → `lifetracker-a3f92b1`.
- Second run on the **same commit**: `dist/` is removed (`rm -rf dist`) then recreated.
  The heredoc writes fresh `lifetracker-v11` again, then sed rewrites it to `lifetracker-a3f92b1`.
- Result: **idempotent** — the output is identical on every run for the same commit.

### Pattern correctness:

- Regex `lifetracker-v[0-9]*` matches `lifetracker-v` followed by zero-or-more digits.
- The heredoc always contains exactly one occurrence: `const CACHE_NAME = 'lifetracker-v11';`
- No other line in the heredoc contains `lifetracker-v<digits>`, so no unintended replacements occur.
- The string `lifetracker-a3f92b1` does NOT match `lifetracker-v[0-9]*` on the next run
  because git SHAs are hex (may contain a–f), not purely numeric — but this is irrelevant
  since `rm -rf dist` and the heredoc always reset to `lifetracker-v11` before sed runs.

### Note on public/sw.js:

`public/sw.js` is a legacy template file with `lifetracker-v4`. It is **not used** by
`build-cdn.sh` — the build script generates `dist/sw.js` entirely from its own heredoc
(lines 67–195) and never reads from `public/sw.js`. The deployed service worker is always
`dist/sw.js` with the SHA-stamped cache name.
