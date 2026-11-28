#!/usr/bin/env bun
// Восстанавливает пресет (JSON) по PNG-обоям с ровным рядом таблеток: цвета, фон, геометрия.
import { inflateSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { freshState, presetToJson } from '../src/js/state.js';

const HELP = `Usage: bun scripts/img2preset.mjs [--stdout] <image.png>...

Reads PNG wallpapers made of a single row of overlapping pills and writes a preset
next to each image (same name, .json) that can be loaded with "Load" in the app.

  --stdout   print presets to stdout instead of writing files
  -h, --help show this help

Colors are stored as-is (mode "raw"); shadow and rotation are assumed to be 0.
Only 8-bit RGB/RGBA non-interlaced PNG is supported.`;

function png(path) {
  const b = readFileSync(path);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG');
  let o = 8, w, h, ct, idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9];
      if (d[8] !== 8 || (ct !== 2 && ct !== 6) || d[12]) throw new Error('only 8-bit RGB/RGBA non-interlaced PNG is supported');
    }
    if (type === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, ul = y && x >= bpp ? px[(y - 1) * stride + x - bpp] : 0;
      const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul);
      px[y * stride + x] = (line[x] + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : ul][f]) & 255;
    }
  }
  const rgb = (x, y) => [0, 1, 2].map(i => px[y * stride + x * bpp + i]);
  return { w, h, rgb, hex: (x, y) => '#' + rgb(x, y).map(v => v.toString(16).padStart(2, '0')).join('') };
}

const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

function analyze(path) {
  const im = png(path), { w: W, h: H } = im, my = H >> 1, bg = im.rgb(5, 5);
  // отрезки одного цвета в средней строке; сглаженные пиксели на стыках отбрасываются
  const runs = []; let start = 0;
  for (let x = 1; x <= W; x++) if (x === W || diff(im.rgb(x, my), im.rgb(start, my)) > 2) { runs.push([start, x, im.rgb(start, my)]); start = x; }
  const segs = runs.filter(([a, b, c]) => b - a > 3 && diff(c, bg) > 2);
  if (segs.length < 3) throw new Error('could not find a row of at least 3 pills in the middle of the image');
  // край ряда с субпиксельной точностью: доля заливки сглаженного пикселя рядом с отрезком
  const cov = (x, c) => { const p = im.rgb(x, my), k = c.findIndex((v, i) => Math.abs(v - bg[i]) === diff(c, bg)); return (p[k] - bg[k]) / (c[k] - bg[k]); };
  const x0 = segs[0][0] - cov(segs[0][0] - 1, segs[0][2]), x1 = segs.at(-1)[1] + cov(segs.at(-1)[1], segs.at(-1)[2]);
  const n = segs.length, stack = segs[0][1] - segs[0][0] >= segs.at(-1)[1] - segs.at(-1)[0] ? 'left' : 'right';
  // шаг — по внутренним границам (точнее ширин отрезков), ширина таблетки — из общей длины ряда
  const total = x1 - x0, step = (segs.at(-1)[0] - segs[1][0]) / (n - 2), pw = total - step * (n - 1), gap = step / pw - 1;
  const cx = Math.round(stack === 'left' ? x0 + pw / 2 : x1 - pw / 2);
  let yt = my; while (yt > 0 && diff(im.rgb(cx, yt - 1), bg) > 2) yt--;
  let yb = my; while (yb < H - 1 && diff(im.rgb(cx, yb + 1), bg) > 2) yb++;
  const ph = yb - yt + 1, rmax = Math.min(pw, ph) / 2;
  // радиус подбирается по профилю края верхней таблетки: по одному столбцу он сильно занижается
  const edge = dx => { const x = Math.round(stack === 'left' ? x0 + dx : x1 - 1 - dx); let y = yt; while (y < my && diff(im.rgb(x, y), bg) <= 2) y++; return y - yt; };
  const prof = [1, 3, 6, 10, 15, 25, 40, 60].filter(dx => dx < rmax).map(dx => [dx + .5, edge(dx)]);
  let r = 0, best = Infinity;
  for (let c = 1; c <= rmax; c += .5) {
    const e = prof.reduce((sum, [dx, dy]) => sum + (dx < c ? c - Math.sqrt(c * c - (c - dx) ** 2) - dy : -dy) ** 2, 0);
    if (e < best) { best = e; r = c; }
  }
  const r2 = v => Math.round(v * 100) / 100, r4 = v => Math.round(v * 1e4) / 1e4;
  const radius = r / rmax >= .95 ? 1 : r2(r / rmax); // полукруглые торцы меряются с погрешностью в пару процентов
  return { ...freshState(), w: W, h: H, mode: 'raw', colors: segs.map(([a, b]) => im.hex((a + b) >> 1, my)), bg: im.hex(5, 5),
    fit: r4(total / W), height: r4(ph / H), gap: r2(gap), radius, stack };
}

const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('-'));
if (args.includes('-h') || args.includes('--help') || !files.length) { console.log(HELP); process.exit(files.length || args.length ? 0 : 1); }
let failed = 0;
for (const f of files) {
  try {
    const json = presetToJson(analyze(f)) + '\n';
    if (args.includes('--stdout')) process.stdout.write(json);
    else { const out = f.replace(/\.png$/i, '') + '.json'; writeFileSync(out, json); console.error(`${f} → ${out}`); }
  } catch (e) { failed++; console.error(`${f}: ${e.message}`); }
}
process.exit(failed ? 1 : 0);
