// Сборка: src/ → dist/. JS и CSS бандлятся и минифицируются esbuild,
// имена получают хэш содержимого (можно кэшировать навсегда), HTML ужимается.
// Сжатие (brotli/gzip) делает сам Cloudflare при отдаче — заранее жать не нужно.
import * as esbuild from 'esbuild';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'src', OUT = 'dist';
const watch = process.argv.includes('--watch');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const options = {
  entryPoints: { app: `${SRC}/js/main.js`, style: `${SRC}/style.css` },
  outdir: `${OUT}/assets`,
  entryNames: '[name]-[hash]',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2022', 'chrome100', 'firefox100', 'safari16'],
  metafile: true,
  legalComments: 'none',
  logLevel: 'info',
};

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')      // пробелы между тегами
    .replace(/\s{2,}/g, ' ')      // остальные серии пробелов
    .trim();
}

async function writeHtml(metafile) {
  const out = Object.entries(metafile.outputs);
  const find = entry => {
    const hit = out.find(([, o]) => o.entryPoint === entry);
    if (!hit) throw new Error(`нет выхода для ${entry}`);
    return path.relative(OUT, hit[0]).split(path.sep).join('/');
  };
  const js = find(`${SRC}/js/main.js`), css = find(`${SRC}/style.css`);
  let html = await readFile(`${SRC}/index.html`, 'utf8');
  html = html
    .replace('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="/${css}">`)
    .replace('<script type="module" src="js/main.js"></script>', `<script type="module" src="/${js}"></script>`);
  if (!html.includes(js) || !html.includes(css)) throw new Error('не удалось подставить ассеты в index.html');
  await writeFile(`${OUT}/index.html`, minifyHtml(html));
  await writeFile(`${OUT}/_headers`, await readFile(`${SRC}/_headers`, 'utf8'));
}

if (watch) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: 'html', setup(b) { b.onEnd(r => r.metafile && writeHtml(r.metafile)); } }],
  });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: OUT, port: 8000 });
  console.log(`dev: http://localhost:${port}`);
} else {
  const result = await esbuild.build(options);
  await writeHtml(result.metafile);
}
