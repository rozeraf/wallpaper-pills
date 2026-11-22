// Сборка: src/ → dist/ встроенным бандлером Bun. JS и CSS бандлятся и минифицируются,
// имена получают хэш содержимого (можно кэшировать навсегда), HTML ужимается.
// Сжатие (brotli/gzip) делает сам Cloudflare при отдаче — заранее жать не нужно.
//   bun run build.mjs          — сборка
//   bun run build.mjs --watch  — dev-сервер на :8000 с пересборкой при изменениях
import { rm, mkdir, watch } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'src', OUT = 'dist';
const JS = `${SRC}/js/main.js`, CSS = `${SRC}/style.css`;

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')      // пробелы между тегами
    .replace(/\s{2,}/g, ' ')      // остальные серии пробелов
    .trim();
}

async function build() {
  const t0 = performance.now();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const result = await Bun.build({
    entrypoints: [JS, CSS],
    outdir: `${OUT}/assets`,
    naming: '[name]-[hash].[ext]',
    target: 'browser',
    format: 'esm',
    minify: true,
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error('сборка не удалась');
  }

  // CSS-вход Bun помечает не как entry-point, поэтому ищем по расширению среди всех выходов
  const entries = result.outputs.filter(o => o.kind !== 'sourcemap');
  const find = ext => {
    const o = entries.find(o => o.path.endsWith(ext));
    if (!o) throw new Error(`нет выхода *${ext}`);
    return '/' + path.relative(OUT, o.path).split(path.sep).join('/');
  };
  const js = find('.js'), css = find('.css');

  let html = await Bun.file(`${SRC}/index.html`).text();
  html = html
    .replace('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="${css}">`)
    .replace('<script type="module" src="js/main.js"></script>', `<script type="module" src="${js}"></script>`);
  if (!html.includes(js) || !html.includes(css)) throw new Error('не удалось подставить ассеты в index.html');
  await Bun.write(`${OUT}/index.html`, minifyHtml(html));
  await Bun.write(`${OUT}/_headers`, Bun.file(`${SRC}/_headers`));

  for (const o of entries) console.log(`  ${path.relative('.', o.path).padEnd(32)} ${(o.size / 1024).toFixed(1)} KB`);
  console.log(`  готово за ${(performance.now() - t0).toFixed(0)} мс`);
}

if (!process.argv.includes('--watch')) {
  await build();
} else {
  await build();
  const server = Bun.serve({
    port: 8000,
    async fetch(req) {
      const { pathname } = new URL(req.url);
      const rel = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\]|\.\.)+/, '');
      const file = Bun.file(path.join(OUT, rel || 'index.html'));
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 });
    },
  });
  console.log(`dev: http://localhost:${server.port}`);

  let timer;
  for await (const _ of watch(SRC, { recursive: true })) {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch(e => console.error(e.message)), 50);
  }
}
