const DICT = {
  ru: {
    title: 'Pills — генератор обоев',
    description: 'Генератор минималистичных обоев из «таблеток» — оттенки, градиенты, PNG и SVG прямо в браузере.',
    tagline: 'генератор обоев', language: 'Язык',
    resolution: 'Разрешение', resPreset: 'Пресет разрешения', width: 'Ширина', height: 'Высота',
    phone: 'телефон', custom: 'своё…', myScreen: 'мой экран',
    colors: 'Цвета', colorMode: 'Режим цвета', auto: 'Авто', gradient: 'Градиент', raw: 'Как есть',
    hintAuto: 'Один цвет → шкала оттенков от светлого к тёмному.',
    hintGradient: 'Плавный переход через все цвета, кол-во задаётся ниже.',
    hintRaw: 'Каждый цвет — один элемент, без интерполяции.',
    bg: 'Фон', reverse: 'Развернуть порядок', light: 'Светлый край', dark: 'Тёмный край', random: 'Случайные цвета',
    color: 'Цвет', remove: 'Удалить', addColor: 'Добавить цвет',
    elements: 'Элементы', count: 'Кол-во', fit: 'Ширина ряда', gap: 'Расстояние',
    gapHint: 'Расстояние в долях ширины элемента; меньше нуля — нахлёст.',
    radius: 'Скругление', angle: 'Поворот', shadow: 'Тень',
    onTop: 'Сверху', onTopAria: 'Какие элементы сверху', left: 'левые', right: 'правые',
    preset: 'Пресет', save: 'Сохранить', load: 'Загрузить',
    presetHint: 'Настройки в JSON-файле. Файл можно и просто перетащить на страницу.',
    reset: 'Сбросить настройки', preview: 'Предпросмотр обоев',
    png: 'Скачать PNG', link: 'Ссылка', preparing: 'Готовлю…', copyHex: 'Копировать',
    copied: 'Скопировано', copyFailed: 'Не удалось скопировать', linkCopied: 'Ссылка скопирована',
    presetLoaded: 'Пресет загружен', presetFailed: 'Не удалось прочитать пресет',
    drop: 'Отпусти, чтобы загрузить пресет',
    pngFailed: 'Браузер не смог создать PNG такого размера — попробуй SVG',
  },
  en: {
    title: 'Pills — wallpaper generator',
    description: 'Minimalist "pill" wallpaper generator — shades, gradients, PNG and SVG right in your browser.',
    tagline: 'wallpaper generator', language: 'Language',
    resolution: 'Resolution', resPreset: 'Resolution preset', width: 'Width', height: 'Height',
    phone: 'phone', custom: 'custom…', myScreen: 'my screen',
    colors: 'Colors', colorMode: 'Color mode', auto: 'Auto', gradient: 'Gradient', raw: 'As is',
    hintAuto: 'One color → a scale of shades from light to dark.',
    hintGradient: 'A smooth blend through all colors; count is set below.',
    hintRaw: 'Each color is one element, no interpolation.',
    bg: 'Background', reverse: 'Reverse order', light: 'Light end', dark: 'Dark end', random: 'Random colors',
    color: 'Color', remove: 'Remove', addColor: 'Add color',
    elements: 'Elements', count: 'Count', fit: 'Row width', gap: 'Spacing',
    gapHint: 'Spacing as a fraction of element width; below zero means overlap.',
    radius: 'Roundness', angle: 'Rotation', shadow: 'Shadow',
    onTop: 'On top', onTopAria: 'Which elements are on top', left: 'left', right: 'right',
    preset: 'Preset', save: 'Save', load: 'Load',
    presetHint: 'Settings in a JSON file. You can also just drop the file onto the page.',
    reset: 'Reset settings', preview: 'Wallpaper preview',
    png: 'Download PNG', link: 'Link', preparing: 'Preparing…', copyHex: 'Copy',
    copied: 'Copied', copyFailed: 'Could not copy', linkCopied: 'Link copied',
    presetLoaded: 'Preset loaded', presetFailed: 'Could not read the preset',
    drop: 'Drop to load the preset',
    pngFailed: 'The browser could not create a PNG this large — try SVG',
  },
};

export const LANGS = Object.keys(DICT);

const stored = () => { try { return localStorage.getItem('lang'); } catch { return null; } };
export let lang = LANGS.includes(stored()) ? stored() : /^ru\b/i.test(navigator.language) ? 'ru' : 'en';

export const t = key => DICT[lang][key] ?? key;

export function setLang(l) {
  lang = l;
  try { localStorage.setItem('lang', l); } catch {}
  document.documentElement.lang = l;
  document.title = t('title');
  document.body.dataset.drop = t('drop');
  document.querySelector('meta[name=description]').content = t('description');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-suffix]'))
    el.textContent = `${el.value.replace('x', '×')} (${t(el.dataset.i18nSuffix)})`;
  for (const el of document.querySelectorAll('[data-lang]')) el.setAttribute('aria-pressed', el.dataset.lang === l);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
}
