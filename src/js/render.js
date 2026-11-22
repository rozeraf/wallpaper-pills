// Геометрия и отрисовка в SVG / canvas.
import { gradient, shades } from './color.js';

export function build(S) {
  let colors;
  if (S.mode === 'raw') colors = [...S.colors];
  else if (S.mode === 'auto') colors = shades(S.colors[0], S.count, S.light, S.dark);
  else colors = gradient(S.colors, S.count);
  if (S.reverse) colors.reverse();
  const n = colors.length, W = S.w, H = S.h;
  // ширина ряда = pw + (pw + gap·pw)·(n−1) = fit·W
  const pw = S.fit * W / (1 + (1 + S.gap) * (n - 1));
  const ph = S.height * H, gap = S.gap * pw, r = Math.min(pw, ph) / 2 * S.radius;
  const total = pw + (pw + gap) * (n - 1), x0 = (W - total) / 2, y0 = (H - ph) / 2;
  let rects = colors.map((c, i) => ({ x: x0 + i * (pw + gap), y: y0, c }));
  if (S.stack === 'left') rects = rects.reverse(); // рисуются последними → оказываются сверху
  const blur = S.shadow * Math.min(pw, ph) * .12;
  return { W, H, pw, ph, r, rects, colors, blur, alpha: .25 + S.shadow * .45, bg: S.bg, angle: S.angle };
}

export function toSvg(g) {
  const f = v => +v.toFixed(2);
  const shadow = g.blur > 0
    ? `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${f(g.blur)}" flood-color="#000" flood-opacity="${f(g.alpha)}"/></filter></defs>`
    : '';
  const attrs = [g.blur > 0 && 'filter="url(#sh)"', g.angle && `transform="rotate(${g.angle} ${f(g.W / 2)} ${f(g.H / 2)})"`]
    .filter(Boolean).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.W}" height="${g.H}" viewBox="0 0 ${g.W} ${g.H}">` + shadow +
    `<rect width="100%" height="100%" fill="${g.bg}"/><g ${attrs}>` +
    g.rects.map(p => `<rect x="${f(p.x)}" y="${f(p.y)}" width="${f(g.pw)}" height="${f(g.ph)}" rx="${f(g.r)}" fill="${p.c}"/>`).join('') +
    `</g></svg>`;
}

export function toCanvas(g) {
  const cv = document.createElement('canvas'); cv.width = g.W; cv.height = g.H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = g.bg; ctx.fillRect(0, 0, g.W, g.H);
  ctx.translate(g.W / 2, g.H / 2); ctx.rotate(g.angle * Math.PI / 180); ctx.translate(-g.W / 2, -g.H / 2);
  if (g.blur > 0) { ctx.shadowColor = `rgba(0,0,0,${g.alpha})`; ctx.shadowBlur = g.blur * 2; }
  for (const p of g.rects) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.roundRect(p.x, p.y, g.pw, g.ph, g.r); ctx.fill(); }
  return cv;
}
