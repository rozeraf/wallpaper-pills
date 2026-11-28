# Pills — генератор обоев

Статический сайт без фреймворков: вся генерация (оттенки, раскладка, PNG/SVG) идёт в браузере.
Исходники лежат в `src/`, сборка (встроенный бандлер [Bun](https://bun.sh)) кладёт минифицированный результат в `dist/`.
Зависимостей нет — нужен только Bun.

```
src/
  index.html      разметка
  style.css       стили
  _headers        заголовки Cloudflare Pages (кэш ассетов, CSP)
  js/
    color.js      OKLab, градиенты, оттенки, случайные палитры
    state.js      состояние ↔ hash адреса
    render.js     геометрия, SVG и canvas
    i18n.js       строки интерфейса ru/en, переключение языка
    picker.js     свой выбор цвета: HSV-квадрат, оттенок, hex, недавние
    eyedropper.js пипетка: EyeDropper API, иначе кадр захвата экрана или фото
    main.js       UI и события
build.mjs         сборка src → dist и dev-сервер (Bun.build, Bun.serve)
```

## Разработка
```bash
bun run dev       # http://localhost:8000, пересборка при изменениях
bun run build     # dist/
```
JS и CSS получают хэш в имени (`main-xxxx.js`) и кэшируются навсегда, `index.html` — нет.
Brotli/gzip Cloudflare включает сам при отдаче, заранее сжимать файлы не нужно.

## Ветки и деплой
- `dev` — рабочая ветка, push выкладывает превью на `dev.wallpaper-pills.pages.dev`.
- `main` — стабильная ветка. Продакшен (`wallpaper-pills.pages.dev`) выкладывается по тегу `vX.Y.Z`
  (SemVer) на коммите из `main`: `git tag v1.2.0 && git push origin v1.2.0`.

Деплой делает GitHub Actions (`.github/workflows/deploy.yml`): `bun run build` →
`wrangler pages deploy dist`. Секреты репозитория:
- `CLOUDFLARE_ACCOUNT_ID` — ID аккаунта Cloudflare;
- `CLOUDFLARE_API_TOKEN` — токен с правом **Account → Cloudflare Pages → Edit**.

Ручной деплой из терминала: `bunx wrangler login && bun run deploy`.

## Ссылки-рецепты
Все настройки хранятся в адресе после `#`, например:
```
https://wallpaper-pills.pages.dev/#mode=gradient&colors=FDE68A,F472B6,4C1D95&count=10&w=2560&h=1440
```
Кнопка «Копировать ссылку» копирует текущий вариант.

Параметры: `w`, `h`, `mode` (`auto` | `gradient` | `raw`), `colors`, `bg`, `reverse` (0/1),
`light`, `dark`, `count`, `fit`, `height`, `gap`, `radius`, `angle` (−90…90), `shadow` (0…1),
`stack` (`left` | `right`), `bgl` (0.06…0.35 — фон в тон палитры с этой яркостью; без него берётся `bg`). Неизвестные или некорректные значения игнорируются, числа
ограничиваются допустимым диапазоном.
В ссылку пишутся только параметры, отличные от значений по умолчанию; при настройках
по умолчанию адрес остаётся чистым.

## Пресеты
«Сохранить» в секции «Пресет» скачивает настройки в JSON, «Загрузить» (или перетаскивание файла
на страницу) применяет их. Формат:
```json
{ "app": "wallpaper-pills", "version": 1, "settings": { "mode": "gradient", "colors": ["#fde68a", "#4c1d95"], "...": "..." } }
```
Принимается и голый объект настроек; поля те же, что в ссылках-рецептах, неизвестные и некорректные игнорируются.

## Горячие клавиши
- **R** — случайная палитра (в текущем режиме цвета).

## Лицензия
MIT — см. [LICENSE](LICENSE).
