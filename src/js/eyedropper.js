// Пипетка: EyeDropper API (Chromium), иначе кадр захвата экрана (Firefox, Safari),
// на телефонах — картинка или камера. Цвет выбирается кликом по кадру с лупой.
import { t } from './i18n.js';

const hex2 = v => v.toString(16).padStart(2, '0');

export async function pickColor() {
  if ('EyeDropper' in window) {
    try { return (await new EyeDropper().open()).sRGBHex; } catch { return null; }
  }
  const screen = navigator.mediaDevices?.getDisplayMedia && !matchMedia('(pointer: coarse)').matches;
  const src = screen ? await grabScreen() : await grabImage();
  return src ? pickFrom(src) : null;
}

async function grabScreen() {
  let stream;
  try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); } catch { return null; }
  try {
    const video = Object.assign(document.createElement('video'), { srcObject: stream, muted: true, playsInline: true });
    await video.play();
    await new Promise(r => video.requestVideoFrameCallback ? video.requestVideoFrameCallback(r) : setTimeout(r, 250));
    return toCanvas(video, video.videoWidth, video.videoHeight);
  } catch { return null; } finally { stream.getTracks().forEach(tr => tr.stop()); }
}

function grabImage() {
  return new Promise(resolve => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    inp.onchange = async () => {
      try { const bmp = await createImageBitmap(inp.files[0]); resolve(toCanvas(bmp, bmp.width, bmp.height)); }
      catch { resolve(null); }
    };
    inp.addEventListener('cancel', () => resolve(null));
    inp.click();
  });
}

function toCanvas(img, w, h) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
  return c;
}

const N = 11, Z = 12, L = N * Z; // лупа: 11×11 пикселей, каждый 12×12

function pickFrom(src) {
  return new Promise(resolve => {
    const touch = matchMedia('(pointer: coarse)').matches;
    const ov = document.createElement('div'); ov.className = 'eyedrop';
    src.className = 'eyedrop-img';
    const lens = document.createElement('div'); lens.className = 'eyedrop-lens'; lens.hidden = true;
    const loupe = Object.assign(document.createElement('canvas'), { width: L, height: L });
    const label = document.createElement('span');
    lens.append(loupe, label);
    const hint = document.createElement('div'); hint.className = 'eyedrop-hint';
    const cancel = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: t('cancel') });
    hint.append(t(touch ? 'eyedropHintTouch' : 'eyedropHint'), cancel);
    ov.append(src, lens, hint);
    document.body.append(ov);

    const sctx = src.getContext('2d', { willReadFrequently: true }), lctx = loupe.getContext('2d');
    lctx.imageSmoothingEnabled = false;
    let cur = null;

    function show(e) {
      const r = src.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / r.width * src.width), y = Math.floor((e.clientY - r.top) / r.height * src.height);
      const inside = x >= 0 && y >= 0 && x < src.width && y < src.height;
      lens.hidden = !inside; cur = null;
      if (!inside) return;
      const [R, G, B] = sctx.getImageData(x, y, 1, 1).data;
      cur = '#' + hex2(R) + hex2(G) + hex2(B);
      lctx.fillStyle = '#000'; lctx.fillRect(0, 0, L, L);
      lctx.drawImage(src, x - (N >> 1), y - (N >> 1), N, N, 0, 0, L, L);
      const c = (N >> 1) * Z;
      lctx.strokeStyle = '#000'; lctx.strokeRect(c - .5, c - .5, Z + 1, Z + 1);
      lctx.strokeStyle = '#fff'; lctx.strokeRect(c + .5, c + .5, Z - 1, Z - 1);
      label.textContent = cur;
      const w = L + 8, h = L + 34;
      let lx = e.clientX + 24, ly = e.pointerType === 'touch' ? e.clientY - h - 40 : e.clientY + 24;
      if (lx + w > innerWidth) lx = e.clientX - 24 - w;
      if (ly + h > innerHeight) ly = e.clientY - 24 - h;
      if (ly < 8) ly = e.clientY + 40;
      lens.style.transform = `translate(${Math.max(8, lx)}px, ${ly}px)`;
    }
    const done = v => { ov.remove(); removeEventListener('keydown', key, true); resolve(v); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } };
    addEventListener('keydown', key, true);
    cancel.onclick = () => done(null);
    ov.addEventListener('pointermove', show);
    ov.addEventListener('pointerdown', e => { if (!e.target.closest('button')) show(e); });
    ov.addEventListener('pointerup', e => { if (e.target.closest('button')) return; show(e); if (cur) done(cur); });
  });
}
