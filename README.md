# Pills — генератор обоев

Статический сайт: одна страница `index.html`, без сборки и зависимостей.
Вся генерация (оттенки, раскладка, PNG/SVG) идёт в браузере.

## Деплой на Cloudflare Pages

### Вариант A — через Git (автодеплой при каждом push)
1. Залей папку в репозиторий на GitHub/GitLab.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Выбери репозиторий. Framework preset: **None**, Build command: **пусто**,
   Build output directory: **/** (или папка, где лежит index.html).
4. Deploy → сайт будет на `<project>.pages.dev`.

### Вариант B — из терминала через wrangler
```bash
npm i -g wrangler        # или: npx wrangler ...
wrangler login
wrangler pages deploy . --project-name=pills
```

### Вариант C — drag & drop
Workers & Pages → Create → Pages → Upload assets → перетащи папку.

## Ссылки-рецепты
Все настройки хранятся в адресе после `#`, например:
```
https://pills.pages.dev/#mode=gradient&colors=FDE68A,F472B6,4C1D95&count=10&w=2560&h=1440
```
Кнопка «Копировать ссылку» копирует текущий вариант.

Параметры: `w`, `h`, `mode` (`auto` | `gradient` | `raw`), `colors`, `bg`, `reverse` (0/1),
`light`, `dark`, `count`, `fit`, `height`, `gap`, `radius`, `angle` (−90…90), `shadow` (0…1),
`stack` (`left` | `right`). Неизвестные или некорректные значения игнорируются, числа
ограничиваются допустимым диапазоном.

## Горячие клавиши
- **R** — случайная палитра (в текущем режиме цвета).
