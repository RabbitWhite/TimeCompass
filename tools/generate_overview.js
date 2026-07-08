#!/usr/bin/env node
// Generates docs/PROJECT_OVERVIEW.md from repo source files.
// Run from repo root: node tools/generate_overview.js
// Plain Node.js — no npm dependencies.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Configuration ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'PROJECT_OVERVIEW.md');

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'design_docs', '.git']);
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

// Sentinels
const STATUS_BEGIN = '<!-- STATUS:BEGIN -->';
const STATUS_END = '<!-- STATUS:END -->';
const PATTERNS_BEGIN = '<!-- PATTERNS:BEGIN -->';
const PATTERNS_END = '<!-- PATTERNS:END -->';

// ─── Project identification ───────────────────────────────────────────────────

function detectProjectName() {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.name || path.basename(REPO_ROOT);
    } catch (_) {}
  }
  return path.basename(REPO_ROOT);
}

// ─── Seed content ─────────────────────────────────────────────────────────────

function seedStatusBlock() {
  return [
    STATUS_BEGIN,
    '',
    '**Current milestone:** [fill in]',
    '',
    '**Working:** [fill in]',
    '',
    '**Scaffolded / incomplete:** [fill in]',
    '',
    '**Known technical debt:** [fill in]',
    '',
    '**Next planned work:** [fill in]',
    '',
    STATUS_END,
  ].join('\n');
}

function seedPatternsBlock() {
  return [
    PATTERNS_BEGIN,
    '',
    '- [fill in]',
    '',
    PATTERNS_END,
  ].join('\n');
}

// ─── File walking ─────────────────────────────────────────────────────────────

function walkDir(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.length;
  } catch (_) {
    return 0;
  }
}

function sortByDirThenFile(files) {
  return files.slice().sort((a, b) => {
    const dirA = path.dirname(a);
    const dirB = path.dirname(b);
    if (dirA !== dirB) return dirA.localeCompare(dirB);
    return path.basename(a).localeCompare(path.basename(b));
  });
}

// ─── Component detection ──────────────────────────────────────────────────────

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

// Extract first text line from a JSDoc block immediately before lineIndex.
function extractJsDocBefore(lines, lineIndex) {
  let i = lineIndex - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  if (i < 0) return '';

  const endLine = lines[i].trim();
  if (!endLine.endsWith('*/')) return '';

  let j = i;
  while (j >= 0 && !lines[j].trim().startsWith('/**')) j--;
  if (j < 0) return '';

  for (let k = j; k <= i; k++) {
    const text = lines[k]
      .replace(/^\s*\/\*\*/, '')
      .replace(/^\s*\*\s?/, '')
      .replace(/\*\/\s*$/, '')
      .trim();
    if (text.length > 0) return text;
  }
  return '';
}

function detectComponents(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return [];
  }
  const lines = content.split('\n');
  const components = [];
  const seen = new Set();

  const patterns = [
    // export default function Name(
    { re: /^export\s+default\s+function\s+([A-Za-z0-9_]+)\s*[(<]/, type: 'function' },
    // export function Name(
    { re: /^export\s+function\s+([A-Za-z0-9_]+)\s*[(<]/, type: 'function' },
    // bare: function Name(
    { re: /^function\s+([A-Za-z0-9_]+)\s*[(<]/, type: 'function' },
    // export const Name = ( / React.memo / forwardRef — tolerates an optional
    // TS type annotation between the name and `=` (e.g. `: React.FC<Props>`)
    { re: /^export\s+const\s+([A-Za-z0-9_]+)\s*(?::\s*.+?)?\s*=\s*(?:React\.|memo\(|forwardRef\(|\()/, type: 'function' },
    // const Name = (  — bare, same type-annotation tolerance
    { re: /^const\s+([A-Za-z0-9_]+)\s*(?::\s*.+?)?\s*=\s*(?:React\.|memo\(|forwardRef\(|\()/, type: 'function' },
    // class Name extends React.Component / Component / PureComponent
    {
      re: /^(?:export\s+(?:default\s+)?)?class\s+([A-Za-z0-9_]+)\s+extends\s+(?:React\.)?(?:Component|PureComponent)\b/,
      type: 'class',
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    for (const { re, type } of patterns) {
      const m = trimmed.match(re);
      if (m) {
        const name = m[1];
        if (!isPascalCase(name)) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        const jsDoc = extractJsDocBefore(lines, i);
        components.push({ name, type, jsDoc });
        break;
      }
    }
  }

  return components;
}

// ─── Utilities / Hooks detection ──────────────────────────────────────────────

function extractFirstJsDoc(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.startsWith('/**')) {
        const docLines = [];
        for (let j = i; j < lines.length; j++) {
          const text = lines[j]
            .replace(/^\s*\/\*\*/, '')
            .replace(/^\s*\*\s?/, '')
            .replace(/\*\/\s*$/, '')
            .trim();
          if (text.length > 0) docLines.push(text);
          if (lines[j].includes('*/')) break;
        }
        if (docLines.length > 0) return docLines[0];
        break;
      }
      if (
        t.length > 0 &&
        !t.startsWith('//') &&
        !t.startsWith('import') &&
        !t.startsWith("'use strict'") &&
        !t.startsWith('"use strict"')
      )
        break;
    }
  } catch (_) {}
  return '';
}

function detectUtilitiesAndHooks() {
  const results = [];
  const utilsDir = path.join(SRC_DIR, 'utils');
  const hooksDir = path.join(SRC_DIR, 'hooks');

  for (const dir of [utilsDir, hooksDir]) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(REPO_ROOT, fullPath);
      const description = extractFirstJsDoc(fullPath);
      results.push({ relPath, description });
    }
  }

  return results;
}

// ─── Sentinel-preserving helpers ─────────────────────────────────────────────

function extractBetweenSentinels(fileText, beginSentinel, endSentinel) {
  const start = fileText.indexOf(beginSentinel);
  const end = fileText.indexOf(endSentinel);
  if (start === -1 || end === -1 || end <= start) return null;
  return fileText.substring(start, end + endSentinel.length);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function generateOverview() {
  const projectName = detectProjectName();

  let existingContent = '';
  if (fs.existsSync(OUTPUT_FILE)) {
    existingContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
  }

  // Section 1: preserve or seed status block
  const existingStatus = extractBetweenSentinels(existingContent, STATUS_BEGIN, STATUS_END);
  const statusBlock = existingStatus !== null ? existingStatus : seedStatusBlock();

  // Section 2: file inventory
  const allFiles = walkDir(SRC_DIR);
  const sorted = sortByDirThenFile(allFiles);

  const fileRows = sorted.map(f => {
    const rel = path.relative(REPO_ROOT, f);
    const lines = countLines(f);
    return `| \`${rel}\` | ${lines} |`;
  });
  const fileInventory = ['| File | Lines |', '|------|-------|', ...fileRows].join('\n');

  // Section 3: component inventory
  const componentRows = [];
  const componentsByFile = new Map();
  for (const filePath of sorted) {
    const rel = path.relative(REPO_ROOT, filePath);
    const comps = detectComponents(filePath);
    componentsByFile.set(filePath, comps);
    for (const { name, type, jsDoc } of comps) {
      componentRows.push(`| \`${name}\` | \`${rel}\` | ${type} | ${jsDoc} |`);
    }
  }
  const componentInventory =
    componentRows.length === 0
      ? 'No components found.'
      : ['| Component | File | Type | JSDoc |', '|-----------|------|------|-------|', ...componentRows].join('\n');

  // Section 4: hooks and utilities
  const utils = detectUtilitiesAndHooks();
  const utilitySection =
    utils.length === 0
      ? 'No utilities or custom hooks found.'
      : ['| File | Description |', '|------|-------------|', ...utils.map(({ relPath, description }) => `| \`${relPath}\` | ${description} |`)].join('\n');

  // Section 5: preserve or seed key patterns
  const existingPatterns = extractBetweenSentinels(existingContent, PATTERNS_BEGIN, PATTERNS_END);
  const patternsBlock = existingPatterns !== null ? existingPatterns : seedPatternsBlock();

  // Assemble document
  const doc = [
    `# ${projectName} — Project Overview`,
    '',
    '_Edit the STATUS and KEY PATTERNS sections manually; they are preserved on re-run._',
    '',
    '---',
    '',
    '## 1. Status',
    '',
    statusBlock,
    '',
    '---',
    '',
    '## 2. File Inventory',
    '',
    fileInventory,
    '',
    '---',
    '',
    '## 3. Component Inventory',
    '',
    componentInventory,
    '',
    '---',
    '',
    '## 4. Hooks and Utilities',
    '',
    utilitySection,
    '',
    '---',
    '',
    '## 5. Key Patterns',
    '',
    patternsBlock,
    '',
  ].join('\n');

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, doc, 'utf8');
  console.log(`Wrote ${OUTPUT_FILE}`);

  // Detection summary for verification
  console.log('\nComponent detection summary:');
  let total = 0;
  for (const filePath of sorted) {
    const rel = path.relative(REPO_ROOT, filePath);
    const comps = componentsByFile.get(filePath);
    if (comps.length > 0) {
      console.log(`  ${rel}: ${comps.map(c => c.name).join(', ')}`);
      total += comps.length;
    }
  }
  console.log(`  Total components: ${total}`);
}

generateOverview();
