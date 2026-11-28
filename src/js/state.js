// Состояние и его (де)сериализация в hash адреса.
import { clamp } from './color.js';

export const DEFAULTS = Object.freeze({ w:1920, h:1080, mode:'auto', colors:['#7b3fd0'], bg:'#000000', reverse:false,
  light:.95, dark:.2, count:8, fit:.69, height:.56, gap:-.3, radius:1, angle:0, shadow:0, stack:'left', bgl:0 });

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

/** @typedef {(key: string) => [number, number] | null} Limits — допустимый диапазон числового параметра */

/**
 * Собирает корректное состояние из пар ключ–значение (из hash или JSON).
 * Значения могут быть строками или «родными» типами JSON. Некорректные игнорируются.
 * @param {Iterable<[string, unknown]>} entries
 * @param {Limits} limits
 */
function normalize(entries, limits) {
  const s = freshState();
  for (const [k, v] of entries) {
    if (k === 'colors') {
      const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
      const cs = list.filter(c => typeof c === 'string' && HEX.test(c)).map(normHex);
      if (cs.length) s.colors = cs.slice(0, MAX_COLORS);
    }
    else if (k === 'bg') { if (typeof v === 'string' && HEX.test(v)) s.bg = normHex(v); }
    else if (k === 'reverse') s.reverse = v === true || v === '1' || v === 1;
    else if (k in ENUMS) { if (ENUMS[k].includes(v)) s[k] = v; }
    else if (typeof DEFAULTS[k] === 'number') {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN, lim = limits(k);
      // bgl = 0 — автоподбор фона выключен, хотя у слайдера минимум больше нуля
      if (Number.isFinite(n)) s[k] = lim && !(k === 'bgl' && n === 0) ? clamp(n, lim[0], lim[1]) : n;
    }
  }
  return ensureColors(s);
}

/** Разбирает hash адреса. */
export function parseState(hash, limits) {
  let q; try { q = new URLSearchParams(hash.replace(/^#/, '')); } catch { return freshState(); }
  return normalize(q, limits);
}

/* ---------- пресеты в JSON ---------- */
const PRESET_APP = 'wallpaper-pills', PRESET_VERSION = 1;

export const presetToJson = S => JSON.stringify({ app: PRESET_APP, version: PRESET_VERSION, settings: S }, null, 2);

/**
 * Разбирает JSON пресета. Принимает и обёртку { app, version, settings }, и голый объект настроек.
 * @throws {Error} если это не JSON или в нём нет ни одной известной настройки
 */
export function presetFromJson(text, limits) {
  const data = JSON.parse(text);
  const settings = data && typeof data === 'object' && data.settings && typeof data.settings === 'object' ? data.settings : data;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('not an object');
  const known = Object.keys(settings).filter(k => k in DEFAULTS);
  if (!known.length) throw new Error('no known settings');
  return normalize(Object.entries(settings), limits);
}

/**
 * Состояние → hash. Пишутся только параметры, отличные от DEFAULTS, поэтому
 * значения в DEFAULTS менять нельзя: старые короткие ссылки начнут открываться иначе.
 */
export function serializeState(S) {
  const out = {};
  for (const k in DEFAULTS) {
    const v = S[k], d = DEFAULTS[k];
    if (k === 'colors') { if (v.join() !== d.join()) out.colors = v.map(c => c.slice(1)).join(','); }
    else if (v !== d) out[k] = k === 'bg' ? v.slice(1) : k === 'reverse' ? (v ? 1 : 0) : v;
  }
  return new URLSearchParams(out).toString().replaceAll('%2C', ',');
}
