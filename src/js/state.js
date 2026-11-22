// Состояние и его (де)сериализация в hash адреса.
import { clamp } from './color.js';

export const DEFAULTS = Object.freeze({ w:1920, h:1080, mode:'auto', colors:['#7b3fd0'], bg:'#000000', reverse:false,
  light:.95, dark:.2, count:8, fit:.69, height:.56, gap:-.3, radius:1, angle:0, shadow:0, stack:'left' });

const ENUMS = { mode: ['auto', 'gradient', 'raw'], stack: ['left', 'right'] };
const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;
export const MAX_COLORS = 30;

const normHex = c => { c = c.replace('#', '').toLowerCase(); if (c.length === 3) c = [...c].map(x => x + x).join(''); return '#' + c; };

export const freshState = () => ({ ...DEFAULTS, colors: [...DEFAULTS.colors] });

/** Режимам кроме «авто» нужно минимум два цвета. */
export function ensureColors(s) {
  if (s.mode !== 'auto' && s.colors.length < 2) s.colors.push('#1f0044');
  return s;
}

/**
 * Разбирает hash. Некорректные значения игнорируются.
 * @param {string} hash
 * @param {(key: string) => [number, number] | null} limits — допустимый диапазон числового параметра
 */
export function parseState(hash, limits) {
  const s = freshState();
  let q; try { q = new URLSearchParams(hash.replace(/^#/, '')); } catch { return s; }
  for (const [k, v] of q) {
    if (k === 'colors') { const cs = v.split(',').filter(c => HEX.test(c)).map(normHex); if (cs.length) s.colors = cs.slice(0, MAX_COLORS); }
    else if (k === 'bg') { if (HEX.test(v)) s.bg = normHex(v); }
    else if (k === 'reverse') s.reverse = v === '1';
    else if (k in ENUMS) { if (ENUMS[k].includes(v)) s[k] = v; }
    else if (typeof DEFAULTS[k] === 'number') {
      const n = parseFloat(v), lim = limits(k);
      if (Number.isFinite(n)) s[k] = lim ? clamp(n, lim[0], lim[1]) : n;
    }
  }
  return ensureColors(s);
}

export const serializeState = S => new URLSearchParams({ ...S, colors: S.colors.map(c => c.slice(1)).join(','),
  bg: S.bg.slice(1), reverse: S.reverse ? 1 : 0 }).toString().replaceAll('%2C', ',');
