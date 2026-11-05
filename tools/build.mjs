#!/usr/bin/env node
/**
 * CappyCoder WPF — budowanie aplikacji do JEDNEGO pliku .html
 *
 * Użycie:
 *   node tools/build.mjs                 → dist/cappycoder-wpf.html (biblioteki wbudowane, działa offline)
 *   node tools/build.mjs --cdn           → biblioteki CodeMirror/JSZip ładowane z cdnjs (mniejszy plik)
 *   node tools/build.mjs --out plik.html → inna ścieżka wyniku
 *   node tools/build.mjs --no-fonts      → bez Google Fonts (tylko czcionki systemowe, w pełni offline)
 *
 * Wymaga Node.js 18+. Tryb domyślny potrzebuje pakietów z `npm install` (codemirror, jszip).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2);
const has = f => args.includes(f);
const outArg = args.indexOf('--out');
const OUT = path.resolve(ROOT, outArg >= 0 ? args[outArg + 1] : 'dist/cappycoder-wpf.html');
const USE_CDN = has('--cdn');
const FONTS = !has('--no-fonts');

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(read('package.json'));

/* Biblioteki zewnętrzne — wersje muszą być zgodne z package.json */
const CM_VER = '5.65.16';
const JSZIP_VER = '3.10.1';
const CM_FILES = [
  'lib/codemirror.js',
  'mode/clike/clike.js',
  'mode/xml/xml.js',
  'addon/edit/matchbrackets.js',
  'addon/edit/closebrackets.js',
  'addon/hint/show-hint.js',
  'addon/selection/active-line.js',
];
// Style CodeMirror są już w src/styles.css (dopasowane do motywu jasnego i ciemnego).

/* Kolejność modułów aplikacji: według numeru w nazwie pliku (01-…, 02-…, …, 10-app.js na końcu) */
const modules = fs
  .readdirSync(path.join(SRC, 'js'))
  .filter(f => /^\d+-.+\.js$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

/* Tekst wewnątrz <script> nie może zawierać „</script” */
const safe = s => s.replace(/<\/(script)/gi, '<\\/$1');

function libraries() {
  if (USE_CDN) {
    const base = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/${CM_VER}/`;
    const js = CM_FILES.map(f => `<script src="${base}${f.replace('lib/', '').replace('.js', '.min.js')}"></script>`);
    js.push(`<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/${JSZIP_VER}/jszip.min.js"></script>`);
    return { js: js.join('\n') };
  }
  const nm = p => {
    const full = path.join(ROOT, 'node_modules', p);
    if (!fs.existsSync(full)) {
      console.error(
        `\n✖ Brak ${p}. Uruchom najpierw:  npm install\n  (albo zbuduj wersję z bibliotekami z CDN:  node tools/build.mjs --cdn)\n`,
      );
      process.exit(1);
    }
    return fs.readFileSync(full, 'utf8');
  };
  const cmVer = JSON.parse(nm('codemirror/package.json')).version;
  if (cmVer !== CM_VER) console.warn(`⚠ CodeMirror ${cmVer} zamiast ${CM_VER} — sprawdź package.json`);
  const js = CM_FILES.map(f => `<script>/* codemirror/${f} */\n${safe(nm('codemirror/' + f))}</script>`);
  js.push(`<script>/* jszip */\n${safe(nm('jszip/dist/jszip.min.js'))}</script>`);
  return { js: js.join('\n') };
}

function build() {
  const t0 = Date.now();
  const logo = read('src/assets/logo.svg').trim();
  const favicon = 'data:image/svg+xml,' + encodeURIComponent(logo);
  const lib = libraries();

  const csharp = read('src/lib/csharp.js');
  const app = [`const LOGO_SVG = ${JSON.stringify(logo)};`, `const APP_VERSION = ${JSON.stringify(pkg.version)};`]
    .concat(modules.map(f => `/* ───── src/js/${f} ───── */\n` + read('src/js/' + f)))
    .join('\n\n');

  // Kontrola składni przed zapisaniem pliku (szybciej niż szukanie błędu w przeglądarce)
  for (const [name, code] of [
    ['src/lib/csharp.js', csharp],
    ['src/js/* (sklejone)', `(function(){\n${app}\n})`],
  ]) {
    try {
      new vm.Script(code, { filename: name });
    } catch (e) {
      console.error(`\n✖ Błąd składni w ${name}:\n${e.stack.split('\n').slice(0, 4).join('\n')}\n`);
      process.exit(1);
    }
  }

  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="generator" content="CappyCoder WPF ${pkg.version}">
<title>CappyCoder WPF</title>
<link rel="icon" href="${favicon}">
${FONTS ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">' : ''}
<style>
${read('src/styles.css')}
</style>
</head>
<body>
${read('src/body.html')}
<script type="text/plain" id="apidb">${read('src/data/api.txt').replace(/<\//g, '<\\/')}</script>
${lib.js}
<script>
${safe(csharp)}
</script>
<script>
(function () {
${safe(app)}
})();
</script>
</body>
</html>
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(
    `✔ ${path.relative(ROOT, OUT)}  (${kb} KB, ${modules.length} modułów, biblioteki: ${USE_CDN ? 'CDN' : 'wbudowane'}, ${Date.now() - t0} ms)`,
  );
}

build();

if (has('--watch')) {
  console.log('Obserwuję src/ … (Ctrl+C kończy)');
  let timer = null;
  fs.watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (e) {
        console.error(e.message);
      }
    }, 150);
  });
}
