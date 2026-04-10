#!/usr/bin/env node
/**
 * Build a single-file offline.html from dist/
 * All CSS, JS, fonts, and libs inlined — works from file:// protocol.
 *
 * IMPORTANT: Any </script> or </style> inside inlined content must be escaped
 * to prevent the browser from closing the tag prematurely.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');

// Escape sequences that would break out of <script> or <style> blocks
function escapeForScript(js) {
  // Browser interprets </script> inside <script> as closing tag
  // Split it so the parser doesn't match it
  return js.replace(/<\/script/gi, '<\\/script');
}

function escapeForStyle(css) {
  return css.replace(/<\/style/gi, '<\\/style');
}

// Read dist/index.html line by line
const lines = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').split('\n');
const out = [];

for (const line of lines) {
  // Skip PWA manifest and registerSW
  if (line.includes('rel="manifest"') || line.includes('registerSW')) continue;

  // Inline lib scripts: <script src="lib/xxx.js"></script>
  const libMatch = line.match(/^\s*<script src="lib\/([^"]+)"><\/script>\s*$/);
  if (libMatch) {
    const libPath = path.join(DIST, 'lib', libMatch[1]);
    if (fs.existsSync(libPath)) {
      let js = fs.readFileSync(libPath, 'utf8');
      js = escapeForScript(js);
      out.push(`<script>/* ${libMatch[1]} */`);
      out.push(js);
      out.push('</script>');
      console.log(`  ✓ lib/${libMatch[1]} (${Math.round(js.length/1024)}KB)`);
      continue;
    }
  }

  // Inline module JS: <script type="module" ...>
  const jsMatch = line.match(/^\s*<script type="module"[^>]*src="\.\/assets\/([^"]+)"[^>]*><\/script>\s*$/);
  if (jsMatch) {
    const jsPath = path.join(DIST, 'assets', jsMatch[1]);
    if (fs.existsSync(jsPath)) {
      let js = fs.readFileSync(jsPath, 'utf8');
      js = escapeForScript(js);
      // No type="module" — Vite already outputs IIFE, works as regular script
      // Keep type="module" — inline modules work from file://, they just can't import external files
      out.push('<script type="module">/* app */');
      out.push(js);
      out.push('</script>');
      console.log(`  ✓ assets/${jsMatch[1]} (${Math.round(js.length/1024)}KB)`);
      continue;
    }
  }

  // Inline CSS: <link rel="stylesheet" ...>
  const cssMatch = line.match(/^\s*<link rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>\s*$/);
  if (cssMatch) {
    const cssPath = path.join(DIST, 'assets', cssMatch[1]);
    if (fs.existsSync(cssPath)) {
      let css = fs.readFileSync(cssPath, 'utf8');

      // Inline fonts as base64
      const fontDir = path.join(DIST, 'fonts');
      if (fs.existsSync(fontDir)) {
        for (const f of fs.readdirSync(fontDir)) {
          const b64 = fs.readFileSync(path.join(fontDir, f)).toString('base64');
          const placeholder = `url(fonts/${f})`;
          while (css.includes(placeholder)) {
            css = css.replace(placeholder, `url(data:font/woff2;base64,${b64})`);
          }
        }
      }

      css = escapeForStyle(css);
      out.push('<style>');
      out.push(css);
      out.push('</style>');
      console.log(`  ✓ assets/${cssMatch[1]} (${Math.round(css.length/1024)}KB)`);
      continue;
    }
  }

  // Pass through everything else unchanged
  out.push(line);
}

const result = out.join('\n');
const outPath = path.join(__dirname, 'offline.html');
fs.writeFileSync(outPath, result);

// ── Verification ──
console.log(`\n  → offline.html: ${Math.round(result.length/1024)}KB`);

// Count REAL <script> open/close tags (at HTML level, not inside strings)
// The file should have: 5 libs + 1 app = 6 script blocks
const scriptOpens = (result.match(/<script>/g) || []).length;
const scriptCloses = (result.match(/<\/script>/g) || []).length;
console.log(`  <script> tags: ${scriptOpens} open, ${scriptCloses} close ${scriptOpens === scriptCloses ? '✓' : '⚠ MISMATCH'}`);

const styleOpens = (result.match(/<style>/g) || []).length;
const styleCloses = (result.match(/<\/style>/g) || []).length;
console.log(`  <style> tags: ${styleOpens} open, ${styleCloses} close ${styleOpens === styleCloses ? '✓' : '⚠ MISMATCH'}`);

console.log(`  type="module": ${result.includes('type="module"') ? '⚠ FOUND' : '✓ none'}`);

// Check body has real content
const realBodyStart = result.lastIndexOf('<body>');
const realBodyEnd = result.lastIndexOf('</body>');
const bodySize = realBodyEnd - realBodyStart;
console.log(`  <body> size: ${Math.round(bodySize/1024)}KB ${bodySize > 1000 ? '✓' : '⚠ TOO SMALL'}`);
