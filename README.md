# Beverly Manuals WebApp

Статический docs-shell для Telegram WebApp в стиле Material 3 Expressive.

Что внутри:
- `index.html` — оболочка приложения.
- `styles.css` — color roles, surface stack, shape system и motion tokens.
- `manuals.js` — база статей и мануалов.
- `app.js` — фильтры, поиск, article navigation, TOC, темы и Telegram WebApp hooks.

## Быстрый запуск

Из папки `webapp`:

```bat
start_webapp.bat
```

Или вручную:

```bash
python -m http.server 8090
```

После этого откройте:

```text
http://127.0.0.1:8090
```

## Как добавлять новые мануалы

Редактируйте `manuals.js`. Один manual состоит из:

```js
{
  id: "manual-id",
  category: "Категория",
  icon: "menu_book",
  readingTime: "5 мин",
  updatedAt: "15 марта 2026",
  title: "Заголовок",
  lead: "Короткий лид",
  summary: "Краткое описание",
  quickTip: "Короткая мысль",
  sections: [
    {
      id: "section-id",
      title: "Название секции",
      body: [
        { type: "paragraph", text: "Текст" },
        { type: "list", items: ["Пункт 1", "Пункт 2"] },
        { type: "steps", items: ["Шаг 1", "Шаг 2"] },
        { type: "checklist", items: ["Проверка 1", "Проверка 2"] },
        { type: "callout", tone: "info", icon: "info", text: "Важный блок" },
        { type: "quote", text: "Цитата" },
        { type: "code", label: "Example", code: "const ok = true;" }
      ]
    }
  ]
}
```

## Дизайн-ориентиры

- Иконки: Material Symbols / Material 3 icons.
- Цвета: role-based system (`primary`, `secondary`, `tertiary`, `surface`, `outline`).
- Motion: короткие state transitions, decelerate для входа контента, accelerated curve для ухода панели.
- Формы: крупные скругления, layered surfaces, выразительная типографика.
