import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditCode } from './audit-scope.mjs';
export { auditCode } from './audit-scope.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientRoot = path.resolve(projectRoot, 'src/client');

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files = files.concat(getAllFiles(fullPath, exts));
      }
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

export function auditFile(filePath) {
  const relPath = path.relative(projectRoot, filePath).split(path.sep).join('/');
  const code = fs.readFileSync(filePath, 'utf-8');
  return auditCode(code, relPath);
}

export function auditAllFiles() {
  const files = getAllFiles(clientRoot);
  let totalErrors = 0;
  let errorDetails = [];

  for (const filePath of files) {
    const errs = auditFile(filePath);
    if (errs.length > 0) {
      totalErrors += errs.length;
      errorDetails.push(...errs);
    }
  }

  return { filesCount: files.length, totalErrors, errorDetails };
}

if (process.argv[1] && process.argv[1].includes('audit-bindings')) {
  console.log('🔍 [AST Scope Audit] Scanning client files for undeclared variables & broken bindings...');
  const res = auditAllFiles();

  if (res.totalErrors > 0) {
    console.error('\n' + '='.repeat(70));
    console.error(`🚨 AST SCOPE AUDIT FAILED: ${res.totalErrors} undeclared variable(s) found!`);
    console.error('='.repeat(70) + '\n');

    for (const err of res.errorDetails) {
      console.error(`  ❌ ${err.file}:${err.line}:${err.col}`);
      console.error(`     Issue: ${err.message}`);
      if (err.snippet) {
        console.error('     Code : ' + err.snippet);
      }
      console.error('');
    }

    console.error('🛑 BUILD ABORTED: Fix all undeclared variables before building for production.\n');
    process.exit(1);
  } else {
    console.log(`✅ [AST Scope Audit] 100% CLEAN: Verified ${res.filesCount} client files. No undeclared variables found.\n`);
    process.exit(0);
  }
}
