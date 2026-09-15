import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const req = createRequire(path.resolve(projectRoot, 'package.json'));
const parser = req('@babel/parser');
const traverseModule = req('@babel/traverse');
const traverse = traverseModule.default || traverseModule;

// Comprehensive Set of Valid ECMAScript, Browser, and Web Platform Globals
export const ALLOWED_GLOBALS = new Set([
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
      if (ALLOWED_GLOBALS.has(name)) return;
      if (nodePath.parent.type === 'JSXOpeningElement' && /^[a-z]/.test(name)) return;
      if (nodePath.parent.type === 'JSXClosingElement' && /^[a-z]/.test(name)) return;

      const binding = nodePath.scope.getBinding(name);
      if (!binding) {
        const line = nodePath.node.loc?.start?.line || 0;
        const col = nodePath.node.loc?.start?.column || 0;
        const snippet = fileLines[line - 1]?.trim() || '';
        errors.push({ file: relPath, line, col, name, snippet, message: `Undeclared variable: "${name}"` });
        return;
      }

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
