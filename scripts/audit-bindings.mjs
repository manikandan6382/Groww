import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientRoot = path.resolve(projectRoot, 'src/client');

const req = createRequire(path.resolve(projectRoot, 'package.json'));
const parser = req('@babel/parser');
const traverseModule = req('@babel/traverse');
const traverse = traverseModule.default || traverseModule;

// Comprehensive Set of Valid ECMAScript, Browser, and Web Platform Globals
const ALLOWED_GLOBALS = new Set([
  'globalThis', 'window', 'document', 'console', 'process', 'undefined', 'NaN', 'Infinity',
  'Math', 'Date', 'Number', 'String', 'Boolean', 'Array', 'Object', 'Set', 'Map',
  'WeakMap', 'WeakSet', 'Promise', 'Error', 'TypeError', 'RangeError', 'ReferenceError',
  'SyntaxError', 'URIError', 'EvalError', 'JSON', 'RegExp', 'Intl', 'Symbol', 'Proxy',
  'Reflect', 'BigInt', 'ArrayBuffer', 'DataView', 'Uint8Array', 'Int8Array', 'Uint16Array',
  'Int16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'escape', 'unescape',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
  'fetch', 'Headers', 'Request', 'Response', 'WebSocket', 'EventSource', 'AbortController',
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader', 'atob', 'btoa',
  'localStorage', 'sessionStorage', 'navigator', 'location', 'history', 'performance',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'TouchEvent', 'WheelEvent',
  'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'DOMParser', 'XMLSerializer',
  'alert', 'prompt', 'confirm', 'crypto', 'Audio', 'Image', 'Option', 'React', 'BroadcastChannel'
]);

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

export function auditCode(code, relPath = '') {
  let ast;
  const errors = [];
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'objectRestSpread'
      ]
    });
  } catch (parseErr) {
    errors.push({
      file: relPath,
      line: parseErr.loc?.line || 1,
      col: parseErr.loc?.column || 1,
      message: `Syntax Error: ${parseErr.message}`
    });
    return errors;
  }

  const fileLines = code.split('\n');

  traverse(ast, {
    ReferencedIdentifier(nodePath) {
      const { name } = nodePath.node;

      // 1. Skip standard globals
      if (ALLOWED_GLOBALS.has(name)) return;

      // 2. Skip lowercase JSX opening/closing elements (<div />, <span />, etc.)
      if (nodePath.parent.type === 'JSXOpeningElement' && /^[a-z]/.test(name)) return;
      if (nodePath.parent.type === 'JSXClosingElement' && /^[a-z]/.test(name)) return;

      // 3. Verify scope binding exists
      const binding = nodePath.scope.getBinding(name);
      if (!binding) {
        const line = nodePath.node.loc?.start?.line || 0;
        const col = nodePath.node.loc?.start?.column || 0;
        const snippet = fileLines[line - 1]?.trim() || '';

        errors.push({
          file: relPath,
          line,
          col,
          name,
          snippet,
          message: `Undeclared variable: "${name}"`
        });
        return;
      }

      // 4. TDZ Verification: Ensure let/const variables in the same scope are not referenced before declaration
      if (
        (binding.kind === 'const' || binding.kind === 'let') &&
        binding.identifier &&
        nodePath.node.start < binding.identifier.start &&
        nodePath.scope === binding.scope
      ) {
        const line = nodePath.node.loc?.start?.line || 0;
        const col = nodePath.node.loc?.start?.column || 0;
        const snippet = fileLines[line - 1]?.trim() || '';

        errors.push({
          file: relPath,
          line,
          col,
          name,
          snippet,
          message: `Temporal Dead Zone (TDZ): "${name}" is referenced before initialization (declared on line ${binding.identifier.loc?.start?.line || 0})`
        });
      }
    }
  });

  return errors;
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
