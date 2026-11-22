// Цвет: hex <-> OKLab, с мягким приведением к sRGB.

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const hexToRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const rgbToHex = rgb => '#' + rgb.map(c => Math.round(clamp(c, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

export function toLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  const l = Math.cbrt(.4122214708*r + .5363325363*g + .0514459929*b),
        m = Math.cbrt(.2119034982*r + .6806995451*g + .1073969566*b),
        s = Math.cbrt(.0883024619*r + .2817188376*g + .6299787005*b);
  return [.2104542553*l + .7936177850*m - .0040720468*s,
          1.9779984951*l - 2.4285922050*m + .4505937099*s,
          .0259040371*l + .7827717662*m - .8086757660*s];
}

function labToLinear([L, a, b]) {
  const l = (L + .3963377774*a + .2158037573*b) ** 3,
        m = (L - .1055613458*a - .0638541728*b) ** 3,
        s = (L - .0894841775*a - 1.2914855480*b) ** 3;
  return [ 4.0767416621*l - 3.3077115913*m + .2309699292*s,
          -1.2684380046*l + 2.6097574011*m - .3413193965*s,
          -.0041960863*l - .7034186147*m + 1.7076147010*s];
}

const inGamut = rgb => rgb.every(c => c >= -1e-4 && c <= 1 + 1e-4);

// Цвета вне sRGB не обрезаем по каналам (это сдвигает оттенок), а уменьшаем хрому при том же L и hue.
export function fromLab([L, a, b]) {
  L = clamp(L, 0, 1);
  let rgb = labToLinear([L, a, b]);
  if (!inGamut(rgb)) {
    const h = Math.atan2(b, a); let lo = 0, hi = Math.hypot(a, b);
    for (let i = 0; i < 24; i++) { const c = (lo + hi) / 2;
      inGamut(labToLinear([L, c * Math.cos(h), c * Math.sin(h)])) ? lo = c : hi = c; }
    rgb = labToLinear([L, lo * Math.cos(h), lo * Math.sin(h)]);
  }
  return rgbToHex(rgb.map(c => gam(clamp(c, 0, 1))));
}

export const fromLch = (L, C, h) => fromLab([L, C * Math.cos(h), C * Math.sin(h)]);

export function gradient(stops, n) {
  const labs = stops.map(toLab);
  if (labs.length === 1 || n === 1) return Array(n).fill(fromLab(labs[0]));
  return Array.from({ length: n }, (_, i) => {
    const pos = i / (n - 1) * (labs.length - 1), k = Math.min(Math.floor(pos), labs.length - 2), t = pos - k;
    return fromLab(labs[k].map((v, j) => v + (labs[k + 1][j] - v) * t));
  });
}

export function shades(base, n, light, dark) {
  const [L0, a0, b0] = toLab(base), C0 = Math.hypot(a0, b0), hue = Math.atan2(b0, a0);
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : .5, L = light + (dark - light) * t;
    // хрома максимальна возле исходной светлоты и плавно падает к краям
    const dist = Math.abs(L - L0) / Math.max(L0 - dark, light - L0, 1e-6);
    return fromLch(L, C0 * Math.max(.25, 1 - dist * dist * .75), hue);
  });
}

const rnd = (a, b) => a + Math.random() * (b - a);

/** Случайная гармоничная палитра для режима: auto → 1 цвет, gradient → 3 опоры, raw → n цветов. */
export function randomPalette(mode, n) {
  const h = rnd(0, Math.PI * 2);
  if (mode === 'auto') return [fromLch(rnd(.5, .7), rnd(.1, .2), h)];
  const step = rnd(.6, 2) * (Math.random() < .5 ? -1 : 1), C = rnd(.08, .18);
  const stops = [fromLch(rnd(.85, .95), C * .7, h), fromLch(rnd(.6, .7), C, h + step), fromLch(rnd(.25, .35), C * .8, h + 2 * step)];
  return mode === 'raw' ? gradient(stops, n) : stops;
}
