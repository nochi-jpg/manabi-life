#!/usr/bin/env node
// まなびライフ ビルド
//   node tools/build.js        … data/*.json を src/js/data.gen.js にまとめる（開発用。src/index.html をそのまま開ける）
//   node tools/build.js dist   … さらに、絵・音・フォント・CSS・JS をすべて埋め込んだ1つのHTML（dist/index.html）を作る
//                                顔グラ・背景は WebP、BGM は 64kbps に再圧縮（ffmpeg / cwebp があれば）
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const P = (...a) => path.join(ROOT, ...a);

// ---------- 1. data ----------
const data = {};
for (const f of fs.readdirSync(P('data')).filter((f) => f.endsWith('.json')).sort()) {
  data[f.replace('.json', '')] = JSON.parse(fs.readFileSync(P('data', f), 'utf8'));
}
const dataJs = `// 自動生成（node tools/build.js）。直接編集しないこと。元は data/*.json\nwindow.DATA=${JSON.stringify(data)};\n`;
fs.writeFileSync(P('src/js/data.gen.js'), dataJs);
console.log(`data.gen.js: ${Object.keys(data).length} ファイル / ${(dataJs.length / 1024).toFixed(0)}KB`);
if (require.main !== module || process.argv[2] !== 'dist') return;

// ---------- 2. 単一HTML ----------
const has = (cmd) => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true; } catch (e) { return false; } };
const CACHE = P('dist/.cache');
fs.mkdirSync(CACHE, { recursive: true });
const b64 = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const cached = (src, ext, fn) => {
  const st = fs.statSync(src);
  const out = path.join(CACHE, path.relative(ROOT, src).replace(/[\\/]/g, '_') + '.' + st.mtimeMs.toFixed(0) + ext);
  if (!fs.existsSync(out)) fn(out);
  return fs.readFileSync(out);
};
const img = (rel) => {
  const src = P(rel);
  if (has('cwebp')) return b64(cached(src, '.webp', (o) => execFileSync('cwebp', ['-quiet', '-q', rel.includes('faces') ? '88' : '78', '-alpha_q', '100', src, '-o', o])), 'image/webp');
  return b64(fs.readFileSync(src), rel.endsWith('.png') ? 'image/png' : 'image/jpeg');
};
const sound = (rel, isBgm) => {
  const src = P(rel);
  if (isBgm && has('ffmpeg')) return b64(cached(src, '.mp3', (o) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-ac', '2', '-b:a', '64k', o])), 'audio/mpeg');
  const ext = path.extname(rel).slice(1);
  return b64(fs.readFileSync(src), ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`);
};

const assets = {};
const add = (rel, v) => { assets[rel] = v; };
for (const f of fs.readdirSync(P('assets/faces')).filter((f) => f.endsWith('.png'))) add('assets/faces/' + f, img('assets/faces/' + f));
for (const b of data.visuals.backgrounds) add(b.file, img(b.file));
add('assets/ui/title.jpg', img('assets/ui/title.jpg'));
let soundN = 0;
if (fs.existsSync(P('sounds'))) {
  for (const [k, v] of Object.entries(data.audio.bgm)) if (v.file && fs.existsSync(P(v.file))) { add(v.file, sound(v.file, true)); soundN++; }
  for (const [k, v] of Object.entries(data.audio.se)) if (v.file && fs.existsSync(P(v.file))) { add(v.file, sound(v.file, false)); soundN++; }
} else console.log('⚠ sounds/ がない（音なしでビルド）。README の手順で manabi-life-assets をリンクする');

let html = fs.readFileSync(P('src/index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const file = path.join(P('src'), href);
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(/url\("?([^")]+\.woff)"?\)/g, (m2, u) => `url("${b64(fs.readFileSync(path.join(path.dirname(file), u)), 'font/woff')}")`);
  return `<style>${css}</style>`;
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  if (src.includes('data.gen.js')) return `<script>${dataJs}</script>`;
  return `<script>${fs.readFileSync(path.join(P('src'), src), 'utf8')}</script>`;
});
html = html.replace('<!--ASSETS-->', `<script>window.ASSETS=${JSON.stringify(assets)};</script>`);
fs.writeFileSync(P('dist/index.html'), html);
console.log(`dist/index.html: ${(html.length / 1024 / 1024).toFixed(1)}MB（音 ${soundN} 個）`);
