// UI: связывает контролы, состояние и превью.
import { clamp, randomPalette } from './color.js';
import { DEFAULTS, MAX_COLORS, freshState, ensureColors, parseState, serializeState, presetToJson, presetFromJson } from './state.js';
import { build, toSvg, toCanvas } from './render.js';

const $ = id => document.getElementById(id);
const limits = k => { const el = $(k); return el && el.min !== '' ? [+el.min, +el.max] : null; };
const loadState = () => parseState(location.hash, limits);

let S = loadState();

const pct = v => Math.round(v * 100) + '%';
const sliders = { count: v => v, fit: pct, height: pct, gap: pct, radius: pct, shadow: pct,
                  angle: v => v + '°', light: v => v.toFixed(2), dark: v => v.toFixed(2) };

/* ---------- мелкие помощники ---------- */
let toastT;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600);
}

async function copy(text, msg = 'Скопировано') {
  try {
    if (navigator.clipboard && isSecureContext) await navigator.clipboard.writeText(text);
    else { const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast(msg + ' ✓');
  } catch { toast('Не удалось скопировать'); }
}

function download(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name }); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fname = ext => `pills-${S.w}x${S.h}.${ext}`;

function randomize() {
  S.colors = randomPalette(S.mode, S.colors.length >= 3 ? S.colors.length : S.count);
  update();
}

/* ---------- рендер UI ---------- */
const HINTS = { auto: 'Один цвет → шкала оттенков от светлого к тёмному.',
  gradient: 'Плавный переход через все цвета, кол-во задаётся ниже.', raw: 'Каждый цвет — один элемент, без интерполяции.' };

function renderColors() {
  const box = $('colors'); box.replaceChildren();
  const shown = S.mode === 'auto' ? S.colors.slice(0, 1) : S.colors;
  shown.forEach((c, i) => {
    const chip = document.createElement('div'); chip.className = 'chip';
    const inp = Object.assign(document.createElement('input'), { type: 'color', value: c, title: c });
    inp.setAttribute('aria-label', `Цвет ${i + 1}`);
    inp.oninput = () => { S.colors[i] = inp.value; inp.title = inp.value; update(false); };
    chip.append(inp);
    if (shown.length > (S.mode === 'gradient' ? 2 : 1)) {
      const x = Object.assign(document.createElement('button'), { textContent: '×', title: 'Удалить' });
      x.onclick = () => { S.colors.splice(i, 1); update(); }; chip.append(x);
    }
    box.append(chip);
  });
  if (S.mode !== 'auto' && S.colors.length < MAX_COLORS) {
    const add = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: '+', title: 'Добавить цвет' });
    add.onclick = () => { S.colors.push(S.colors.at(-1)); update(); }; box.append(add);
  }
  $('modeHint').textContent = HINTS[S.mode];
  $('lightDark').hidden = S.mode !== 'auto';
  $('count').disabled = S.mode === 'raw';
}

function syncInputs() {
  $('w').value = S.w; $('h').value = S.h;
  const p = `${S.w}x${S.h}`; $('preset').value = [...$('preset').options].some(o => o.value === p) ? p : 'custom';
  document.querySelector(`input[name=mode][value=${S.mode}]`).checked = true;
  document.querySelector(`input[name=stack][value=${S.stack}]`).checked = true;
  $('bg').value = S.bg; $('reverse').checked = S.reverse;
  for (const k in sliders) $(k).value = S[k];
}

let raf;
function update(rebuildColors = true) {
  if (rebuildColors) renderColors();
  for (const k in sliders) {
    const el = $(k);
    $(k + 'V').textContent = sliders[k](S[k]);
    el.style.setProperty('--p', ((S[k] - el.min) / (el.max - el.min) * 100) + '%');
  }
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const g = build(S);
    $('preview').innerHTML = toSvg(g);
    $('preview').style.setProperty('--ar', `${g.W}/${g.H}`);
    $('palette').replaceChildren(...g.colors.map(c => {
      const b = document.createElement('button'); b.title = 'Копировать'; b.dataset.c = c;
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
$('bg').oninput = e => { S.bg = e.target.value; update(false); };
$('reverse').onchange = e => { S.reverse = e.target.checked; update(false); };
$('random').onclick = randomize;
$('reset').onclick = () => { S = freshState(); syncInputs(); update(); };
$('palette').onclick = e => { const b = e.target.closest('button'); if (b) copy(b.dataset.c, b.dataset.c); };
$('share').onclick = () => copy(location.href, 'Ссылка скопирована');

addEventListener('hashchange', () => { S = loadState(); syncInputs(); update(); });
addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (key !== 'r' && key !== 'к') return; // «к» — та же клавиша в русской раскладке
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches('input[type=number], select')) return;
  randomize();
});

/* ---------- пресеты ---------- */
$('presetSave').onclick = () =>
  download(new Blob([presetToJson(S)], { type: 'application/json' }), `pills-preset-${S.mode}-${S.w}x${S.h}.json`);

async function importPreset(file) {
  if (!file) return;
  try {
    if (file.size > 100_000) throw new Error('too big');
    S = presetFromJson(await file.text(), limits);
    syncInputs(); update();
    toast('Пресет загружен ✓');
  } catch { toast('Не удалось прочитать пресет'); }
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
  const btn = $('dlPng'), label = btn.querySelector('span'); btn.disabled = true; label.textContent = 'Готовлю…';
  setTimeout(() => toCanvas(build(S)).toBlob(b => {
    btn.disabled = false; label.textContent = 'Скачать PNG';
    b ? download(b, fname('png')) : toast('Браузер не смог создать PNG такого размера — попробуй SVG');
  }, 'image/png'), 20);
};

/* разрешение текущего экрана как пресет */
{
  const dpr = devicePixelRatio || 1, sw = Math.round(screen.width * dpr), sh = Math.round(screen.height * dpr);
  if (sw >= 100 && sh >= 100 && ![...$('preset').options].some(o => o.value === `${sw}x${sh}`))
    $('preset').prepend(new Option(`${sw}×${sh} (мой экран)`, `${sw}x${sh}`));
}

syncInputs(); update();
