// UI: связывает контролы, состояние и превью.
import { clamp, toLab, randomPalette, colorName } from './color.js';
import { DEFAULTS, MAX_COLORS, freshState, ensureColors, parseState, serializeState, presetToJson, presetFromJson } from './state.js';
import { build, toSvg, toCanvas } from './render.js';
import { lang, t, setLang } from './i18n.js';
import { openPicker, closePicker } from './picker.js';

const $ = id => document.getElementById(id);
const limits = k => { const el = $(k); return el && el.min !== '' ? [+el.min, +el.max] : null; };
const loadState = () => parseState(location.hash, limits);

let S = loadState();

const pct = v => Math.round(v * 100) + '%';
const sliders = { count: v => v, fit: pct, height: pct, gap: pct, radius: pct, shadow: pct, bgl: pct,
                  angle: v => v + '°', light: v => v.toFixed(2), dark: v => v.toFixed(2) };

/* ---------- мелкие помощники ---------- */
let toastT;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600);
}

async function copy(text, msg = t('copied')) {
  try {
    if (navigator.clipboard && isSecureContext) await navigator.clipboard.writeText(text);
    else { const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast(msg + ' ✓');
  } catch { toast(t('copyFailed')); }
}

function download(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name }); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const hash36 = str => { let h = 0x811c9dc5; for (const c of str) h = Math.imul(h ^ c.codePointAt(0), 16777619); return (h >>> 0).toString(36); };
const fname = ext => {
  const names = [...new Set([S.colors[0], S.colors.at(-1)].map(colorName))].join('-');
  return `pills-${S.w}x${S.h}-${names}-${hash36(serializeState(S))}.${ext}`;
};

function randomize() {
  S.colors = randomPalette(S.mode, S.colors.length >= 3 ? S.colors.length : S.count);
  update();
}

/* ---------- рендер UI ---------- */
const HINTS = { auto: 'hintAuto', gradient: 'hintGradient', raw: 'hintRaw' };

function swatch(btn, hex, label) {
  btn.style.background = hex;
  btn.setAttribute('aria-label', `${label}: ${hex}`);
}

function renderColors() {
  closePicker();
  const box = $('colors'); box.replaceChildren();
  const shown = S.mode === 'auto' ? S.colors.slice(0, 1) : S.colors;
  shown.forEach((c, i) => {
    const chip = document.createElement('div'); chip.className = 'chip';
    const sw = Object.assign(document.createElement('button'), { className: 'swatch', type: 'button' });
    sw.setAttribute('aria-haspopup', 'dialog'); swatch(sw, c, `${t('color')} ${i + 1}`);
    sw.onclick = () => openPicker(sw, S.colors[i], hex => { S.colors[i] = hex; swatch(sw, hex, `${t('color')} ${i + 1}`); update(false); });
    chip.append(sw);
    if (shown.length > (S.mode === 'gradient' ? 2 : 1)) {
      const x = Object.assign(document.createElement('button'), { className: 'del', textContent: '×', title: t('remove') });
      x.onclick = () => { S.colors.splice(i, 1); update(); }; chip.append(x);
    }
    box.append(chip);
  });
  if (S.mode !== 'auto' && S.colors.length < MAX_COLORS) {
    const add = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: '+', title: t('addColor') });
    add.onclick = () => { S.colors.push(S.colors.at(-1)); update(); }; box.append(add);
  }
  $('modeHint').textContent = t(HINTS[S.mode]);
  $('lightDark').hidden = S.mode !== 'auto';
  $('count').disabled = S.mode === 'raw';
}

function syncInputs() {
  $('w').value = S.w; $('h').value = S.h;
  const p = `${S.w}x${S.h}`; $('preset').value = [...$('preset').options].some(o => o.value === p) ? p : 'custom';
  document.querySelector(`input[name=mode][value=${S.mode}]`).checked = true;
  document.querySelector(`input[name=stack][value=${S.stack}]`).checked = true;
  $('reverse').checked = S.reverse;
  $('bgAuto').checked = S.bgl > 0; $('bglRow').hidden = !S.bgl;
  for (const k in sliders) $(k).value = S[k];
}

// акцент интерфейса — оттенок основного цвета обоев; почти серый цвет даёт нейтральный акцент
function setAccent(hex) {
  const [, a, b] = toLab(hex), c = Math.hypot(a, b), root = document.documentElement;
  const neutral = c < .04;
  root.classList.toggle('neutral', neutral);
  root.style.setProperty('--ah', (Math.atan2(b, a) * 180 / Math.PI).toFixed(1));
  root.style.setProperty('--ac', neutral ? 0 : clamp(c, .08, .16).toFixed(3));
}

let raf;
function update(rebuildColors = true) {
  if (rebuildColors) renderColors();
  setAccent(S.colors[0]);
  for (const k in sliders) {
    const el = $(k);
    $(k + 'V').textContent = sliders[k](S[k]);
    el.style.setProperty('--p', ((S[k] - el.min) / (el.max - el.min) * 100) + '%');
  }
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const g = build(S);
    $('preview').innerHTML = toSvg(g);
    swatch($('bg'), g.bg, t('bgColor'));
    $('preview').style.setProperty('--ar', `${g.W}/${g.H}`);
    $('palette').replaceChildren(...g.colors.map(c => {
      const b = document.createElement('button'); b.title = t('copyHex'); b.dataset.c = c;
      b.innerHTML = `<i style="background:${c}"></i>${c}`; return b;
    }));
    const hash = serializeState(S); // при настройках по умолчанию — чистый адрес без «#»
    history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
  });
}

/* ---------- события ---------- */
for (const k in sliders) $(k).addEventListener('input', e => { S[k] = +e.target.value; update(false); });

$('preset').onchange = e => {
  if (e.target.value === 'custom') return;
  [S.w, S.h] = e.target.value.split('x').map(Number); syncInputs(); update(false);
};
for (const k of ['w', 'h']) $(k).addEventListener('change', e => {
  S[k] = Math.round(clamp(+e.target.value || DEFAULTS[k], 100, 10000)); syncInputs(); update(false);
});
document.querySelectorAll('input[name=mode]').forEach(r => r.onchange = () => { S.mode = r.value; ensureColors(S); update(); });
document.querySelectorAll('input[name=stack]').forEach(r => r.onchange = () => { S.stack = r.value; update(false); });
let lastBgl = .18;
$('bg').onclick = () => openPicker($('bg'), build(S).bg, hex => {
  if (S.bgl) lastBgl = S.bgl;
  S.bg = hex; S.bgl = 0; syncInputs(); update(false); // ручной выбор отключает автоподбор
});
$('bgAuto').onchange = e => {
  if (S.bgl) lastBgl = S.bgl;
  S.bgl = e.target.checked ? lastBgl : 0; syncInputs(); update(false);
};
$('reverse').onchange = e => { S.reverse = e.target.checked; update(false); };
$('random').onclick = randomize;
$('reset').onclick = () => { S = freshState(); syncInputs(); update(); };
$('palette').onclick = e => { const b = e.target.closest('button'); if (b) copy(b.dataset.c, b.dataset.c); };
$('share').onclick = () => copy(location.href, t('linkCopied'));

addEventListener('hashchange', () => { S = loadState(); syncInputs(); update(); });
addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (key !== 'r' && key !== 'к') return; // «к» — та же клавиша в русской раскладке
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches('input[type=number], input[type=text], select') || e.target.closest('.picker, .eyedrop')) return;
  randomize();
});

/* ---------- пресеты ---------- */
$('presetSave').onclick = () =>
  download(new Blob([presetToJson(S)], { type: 'application/json' }), fname('json'));

async function importPreset(file) {
  if (!file) return;
  try {
    if (file.size > 100_000) throw new Error('too big');
    S = presetFromJson(await file.text(), limits);
    syncInputs(); update();
    toast(t('presetLoaded') + ' ✓');
  } catch { toast(t('presetFailed')); }
}
$('presetLoad').onclick = () => $('presetFile').click();
$('presetFile').onchange = e => { importPreset(e.target.files[0]); e.target.value = ''; };

// перетаскивание файла на страницу
let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
addEventListener('dragenter', e => { if (hasFiles(e)) { dragDepth++; document.body.classList.add('dropping'); } });
addEventListener('dragleave', e => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dropping'); } });
addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; document.body.classList.remove('dropping');
  importPreset(e.dataTransfer.files[0]);
});

$('dlSvg').onclick = () => download(new Blob([toSvg(build(S))], { type: 'image/svg+xml' }), fname('svg'));
$('dlPng').onclick = () => {
  const btn = $('dlPng'), label = btn.querySelector('span'); btn.disabled = true; label.textContent = t('preparing');
  setTimeout(() => toCanvas(build(S)).toBlob(b => {
    btn.disabled = false; label.textContent = t('png');
    b ? download(b, fname('png')) : toast(t('pngFailed'));
  }, 'image/png'), 20);
};

/* разрешение текущего экрана как пресет */
{
  const dpr = devicePixelRatio || 1, sw = Math.round(screen.width * dpr), sh = Math.round(screen.height * dpr);
  if (sw >= 100 && sh >= 100 && ![...$('preset').options].some(o => o.value === `${sw}x${sh}`))
  {
    const o = new Option('', `${sw}x${sh}`); o.dataset.i18nSuffix = 'myScreen'; $('preset').prepend(o);
  }
}

document.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { setLang(b.dataset.lang); syncInputs(); update(); });
setLang(lang); syncInputs(); update();
