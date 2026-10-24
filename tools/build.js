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
const PY_WEBP = `import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]);im.save(sys.argv[2],'WEBP',quality=int(sys.argv[3]),method=6)`;
const img = (rel) => {
  const src = P(rel);
  const q = rel.includes('faces') ? '88' : '78';
  if (!has('cwebp') && has('python3')) {
    try { return b64(cached(src, '.webp', (o) => execFileSync('python3', ['-c', PY_WEBP, src, o, q])), 'image/webp'); } catch (e) { /* PIL がないときはそのまま */ }
  }
  if (has('cwebp')) return b64(cached(src, '.webp', (o) => execFileSync('cwebp', ['-quiet', '-q', rel.includes('faces') ? '88' : '78', '-alpha_q', '100', src, '-o', o])), 'image/webp');
  return b64(fs.readFileSync(src), rel.endsWith('.png') ? 'image/png' : 'image/jpeg');
};
const sound = (rel, isBgm) => {
  const src = P(rel);
  if (isBgm && has('ffmpeg')) return b64(cached(src, '.48k.mp3', (o) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-ac', '2', '-ar', '32000', '-b:a', '48k', o])), 'audio/mpeg');
  if (!isBgm && has('ffmpeg')) {
    const max = (Object.values(data.audio.se).find((x) => x.file === rel) || {}).maxMs;
    return b64(cached(src, '.se.mp3', (o) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, ...(max ? ['-t', String(max / 1000 + 0.3)] : []), '-ac', '1', '-b:a', '64k', o])), 'audio/mpeg');
  }
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

// フォントは使う文字だけにしぼる（pyftsubset があれば）。かな・英数字・記号はぜんぶ入れる
const usedText = (() => {
  let t = '';
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) { if (f !== 'lib') walk(q); } else if (/\.(js|json|html|css)$/.test(f)) t += fs.readFileSync(q, 'utf8'); } };
  walk(P('src')); walk(P('data'));
  for (let c = 0x20; c < 0x7f; c++) t += String.fromCharCode(c);
  for (let c = 0x3000; c < 0x3100; c++) t += String.fromCharCode(c); // 記号・ひらがな・カタカナ
  for (let c = 0xff01; c < 0xff5f; c++) t += String.fromCharCode(c); // 全角英数
  return [...new Set(t)].join('');
})();
const font = (file) => {
  // 名前（人名漢字）のために、フォントは間引かずにそのまま入れる
  if (true || !has('pyftsubset')) return fs.readFileSync(file);
  const txt = path.join(CACHE, 'chars.txt'); fs.writeFileSync(txt, usedText);
  const key = require('crypto').createHash('md5').update(usedText).digest('hex').slice(0, 8);
  const out = path.join(CACHE, path.basename(file) + '.' + key + '.woff');
  if (!fs.existsSync(out)) execFileSync('pyftsubset', [file, `--text-file=${txt}`, '--flavor=woff', `--output-file=${out}`, '--layout-features=*']);
  return fs.readFileSync(out);
};
let html = fs.readFileSync(P('src/index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const file = path.join(P('src'), href);
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(/url\("?([^")]+\.woff)"?\)/g, (m2, u) => `url("${b64(font(path.join(path.dirname(file), u)), 'font/woff')}")`);
  return `<style>${css}</style>`;
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  if (src.includes('data.gen.js')) return `<script>${dataJs}</script>`;
  return `<script>${fs.readFileSync(path.join(P('src'), src), 'utf8')}</script>`;
});
html = html.replace('<!--ASSETS-->', `<script>window.ASSETS=${JSON.stringify(assets)};</script>`);
fs.writeFileSync(P('dist/index.html'), html);
console.log(`dist/index.html: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)}MB（音 ${soundN} 個）`);
// GitHub Pages のテスト用（play/index.html）。中身は dist と同じ
fs.mkdirSync(P('play'), { recursive: true });
fs.writeFileSync(P('play/index.html'), html);
