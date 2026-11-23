// Свой выбор цвета: квадрат насыщенность×яркость (HSV), полоса оттенка, hex, пипетка, недавние.
import { t } from './i18n.js';
import { pickColor } from './eyedropper.js';

const cl = v => Math.min(1, Math.max(0, v));
const toHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const hsvToRgb = (h, s, v) => [5, 3, 1].map(n => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; });
function hexToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, max ? d / max : 0, max];
}
export function parseHex(str) {
  let m = String(str).trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(m)) m = [...m].map(c => c + c).join('');
  return /^[0-9a-f]{6}$/.test(m) ? '#' + m : null;
}

const RECENT = 'recentColors', MAX_RECENT = 10;
const loadRecent = () => { try { const a = JSON.parse(localStorage.getItem(RECENT)); return Array.isArray(a) ? a.filter(parseHex) : []; } catch { return []; } };
const saveRecent = a => { try { localStorage.setItem(RECENT, JSON.stringify(a)); } catch {} };

let el, sv, thumb, hue, hexIn, cur, drop, recent;
let anchor = null, onChange = null, start = '', h = 0, s = 0, v = 0;

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5 3 3M4 20l1-4 9.5-9.5 3 3L8 19l-4 1Z"/><path d="m13 5 2.6-2.6a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L19 11"/></svg>';

function build() {
  el = document.createElement('div'); el.className = 'picker'; el.hidden = true; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="sv" tabindex="0" role="slider"><i></i></div>
    <input type="range" class="hue" min="0" max="359" step="1">
    <div class="picker-row"><span class="picker-cur"></span><input class="hex" type="text" maxlength="7" spellcheck="false" autocomplete="off">
    <button class="btn icon" type="button">${ICON}</button></div><div class="recent"></div>`;
  document.body.append(el);
  [sv, hue, hexIn, cur, drop, recent] = ['.sv', '.hue', '.hex', '.picker-cur', '.btn', '.recent'].map(q => el.querySelector(q));
  thumb = sv.firstChild;

  const move = e => { const r = sv.getBoundingClientRect(); s = cl((e.clientX - r.left) / r.width); v = 1 - cl((e.clientY - r.top) / r.height); emit(); };
  sv.onpointerdown = e => { sv.setPointerCapture(e.pointerId); sv.focus(); move(e); };
  sv.onpointermove = e => { if (sv.hasPointerCapture(e.pointerId)) move(e); };
  sv.onkeydown = e => {
    const d = e.shiftKey ? .1 : .01, k = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (!k) return; e.preventDefault(); s = cl(s + k[0]); v = cl(v + k[1]); emit();
  };
  hue.oninput = () => { h = +hue.value; emit(); };
  hexIn.oninput = () => { const c = parseHex(hexIn.value); if (c) set(c, false); };
  hexIn.onblur = () => { hexIn.value = value(); };
  hexIn.onkeydown = e => { if (e.key === 'Enter') close(true); };
  drop.onclick = async () => { const c = await pickColor(); if (c && anchor) set(c); };
  recent.onclick = e => { const b = e.target.closest('button'); if (b) set(b.dataset.c); };

  document.addEventListener('pointerdown', e => {
    if (anchor && !el.contains(e.target) && !anchor.contains(e.target) && !e.target.closest('.eyedrop')) close();
  }, true);
  document.addEventListener('keydown', e => { if (anchor && e.key === 'Escape') close(true); });
  addEventListener('resize', place);
  addEventListener('scroll', place, true);
}

const value = () => toHex(hsvToRgb(h, s, v));

function render(syncHex = true) {
  const c = value();
  el.style.setProperty('--hue', h);
  thumb.style.left = s * 100 + '%'; thumb.style.top = (1 - v) * 100 + '%';
  sv.setAttribute('aria-valuetext', c);
  hue.value = Math.round(h);
  if (syncHex) hexIn.value = c;
  cur.style.background = c;
}
function emit(syncHex = true) { render(syncHex); onChange?.(value()); }
function set(hex, syncHex = true) { const [nh, ns, nv] = hexToHsv(hex); if (ns && nv) h = nh; s = ns; v = nv; emit(syncHex); }

function place() {
  if (!anchor || matchMedia('(max-width: 800px)').matches) return el && (el.style.left = el.style.top = '');
  const r = anchor.getBoundingClientRect(), pw = el.offsetWidth, ph = el.offsetHeight;
  let top = r.bottom + 8;
  if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 8);
  el.style.left = Math.min(Math.max(8, r.left), innerWidth - pw - 8) + 'px';
  el.style.top = top + 'px';
}

function renderRecent() {
  recent.replaceChildren(...loadRecent().map(c => {
    const b = Object.assign(document.createElement('button'), { type: 'button', title: c });
    b.dataset.c = c; b.style.background = c; return b;
  }));
}

export function openPicker(btn, hex, cb) {
  if (!el) build();
  if (anchor === btn) return close();
  if (anchor) close();
  anchor = btn; onChange = cb; start = hex;
  [h, s, v] = hexToHsv(hex);
  el.setAttribute('aria-label', t('picker'));
  sv.setAttribute('aria-label', t('svLabel'));
  hue.setAttribute('aria-label', t('hue'));
  hexIn.setAttribute('aria-label', t('hex'));
  drop.title = t('eyedrop'); drop.setAttribute('aria-label', t('eyedrop'));
  renderRecent(); render();
  el.hidden = false; btn.setAttribute('aria-expanded', 'true');
  place();
  if (!matchMedia('(pointer: coarse)').matches) sv.focus({ preventScroll: true });
}

export function closePicker(refocus = false) { close(refocus); }

function close(refocus = false) {
  if (!anchor) return;
  const c = value();
  if (c !== start) saveRecent([c, ...loadRecent().filter(x => x !== c)].slice(0, MAX_RECENT));
  el.hidden = true; anchor.setAttribute('aria-expanded', 'false');
  if (refocus) anchor.focus();
  anchor = onChange = null;
}
