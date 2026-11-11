// Bundles src/ into a single self-contained HTML file. Usage: node build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2019' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const page = readFileSync('page.html', 'utf8').replace('/*BUNDLE*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/fragment.html', page); // body-only version for hosted preview
// standalone page: title and styles belong in <head>
const cut = page.indexOf('</style>') + 8;
const head = page.slice(0, cut).replace(/<meta name="claude:[^>]*>\n?/, '');
writeFileSync('dist/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head + '</head><body style="margin:0">' + page.slice(cut) + '</body></html>');
mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', readFileSync('dist/index.html')); // GitHub Pages serves /docs
console.log('built', (page.length / 1024).toFixed(1) + ' KB');
