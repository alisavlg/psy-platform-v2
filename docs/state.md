Начало файла:
markdown

# Eupsy — Текущее состояние проекта

**Дата обновления:** 16 октября 2026

Конец файла (последняя строка):
markdown

- `start-chat.txt`

Полный текст файла 1 — вот он:
Eupsy — Текущее состояние проекта

Дата обновления: 16 октября 2026
Текущий этап: Переезд на v2 (рефакторинг структуры)
Что происходит сейчас

Проект переписывается в новую папку psy-platform-v2 — правильная структура, Vite, модули.

Старый проект psy-platform — работает на Vercel (eupsy.ru), но структура плохая. Новый проект psy-platform-v2 — правильный: Vite, модули, компоненты.

Цель: перевести все страницы в v2. Потом — переключить eupsy.ru на v2.
Философия проекта

Eupsy — от греческого εὐψυχία — «благая душа». Маслоу использовал это слово для «Хорошего Общества».

    Общество не может быть здоровым, если его души больны.
    Благое общество состоит из благих душ.

Как работает Vite в v2

    HTML — в public/.

    JS и CSS — в src/.

    HTML подключает JS: <script type="module" src="/src/pages/имя.js"></script>.

    В JS вверху — import '@/styles/theme.css'; и import { supa } from '@/lib/supabase.js';.

Что уже переведено

    public/pages/login.html

    src/pages/login.js

    src/lib/supabase.js

    vite.config.js

    package.json

Что осталось

    register.html

    client.html

    dashboard.html

    psychologist.html

    become-psychologist.html

    application-history.html

    admin.html

    room.html

    index.html

Технический долг

    Сайдбар — в Sidebar.js.

    Шапка — в Topbar.js.

    Логотип — в Logo.js.

    PsyHelp → Eupsy.

    Старые JS — в модули.

Команды
text

npm run dev
npm run build
git add .
git commit -m "сообщение"
git push

Документация

    architecture.md

    state.md

    theme-guide.md

    start-chat.txt