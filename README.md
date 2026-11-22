# Pills — генератор обоев

Статический сайт без фреймворков: вся генерация (оттенки, раскладка, PNG/SVG) идёт в браузере.
Исходники лежат в `src/`, сборка (esbuild) кладёт минифицированный результат в `dist/`.

```
src/
  index.html      разметка
  style.css       стили
  _headers        заголовки Cloudflare Pages (кэш ассетов, CSP)
  js/
    color.js      OKLab, градиенты, оттенки, случайные палитры
    state.js      состояние ↔ hash адреса
    render.js     геометрия, SVG и canvas
    main.js       UI и события
build.mjs         сборка src → dist
```

## Разработка
```bash
npm install
npm run dev       # http://localhost:8000, пересборка при изменениях
npm run build     # dist/
```
JS и CSS получают хэш в имени (`app-XXXX.js`) и кэшируются навсегда, `index.html` — нет.
Brotli/gzip Cloudflare включает сам при отдаче, заранее сжимать файлы не нужно.

## Ветки и деплой
- `dev` — рабочая ветка, push выкладывает превью на `dev.wallpaper-pills.pages.dev`.
- `main` — продакшен, push выкладывает `wallpaper-pills.pages.dev`.

Деплой делает GitHub Actions (`.github/workflows/deploy.yml`): `npm ci` → `npm run build` →
`wrangler pages deploy dist`. Секреты репозитория:
- `CLOUDFLARE_ACCOUNT_ID` — ID аккаунта Cloudflare;
- `CLOUDFLARE_API_TOKEN` — токен с правом **Account → Cloudflare Pages → Edit**.

Ручной деплой из терминала: `npx wrangler login && npm run deploy`.

## Ссылки-рецепты
Все настройки хранятся в адресе после `#`, например:
```
https://wallpaper-pills.pages.dev/#mode=gradient&colors=FDE68A,F472B6,4C1D95&count=10&w=2560&h=1440
```
Кнопка «Копировать ссылку» копирует текущий вариант.

Параметры: `w`, `h`, `mode` (`auto` | `gradient` | `raw`), `colors`, `bg`, `reverse` (0/1),
`light`, `dark`, `count`, `fit`, `height`, `gap`, `radius`, `angle` (−90…90), `shadow` (0…1),
`stack` (`left` | `right`). Неизвестные или некорректные значения игнорируются, числа
ограничиваются допустимым диапазоном.

## Горячие клавиши
- **R** — случайная палитра (в текущем режиме цвета).

## Лицензия
MIT — см. [LICENSE](LICENSE).
