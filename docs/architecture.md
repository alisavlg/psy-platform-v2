# Eupsy — Архитектура проекта

**Версия:** 6.0
**Последнее обновление:** 24 октября 2026

**Проект:** Eupsy (бывшее рабочее название — PsyHelp)


##  Технологический стек
- **Фронтенд:** HTML, Vanilla JS (ES Modules), CSS. Сборщик — Vite.
- **Бэкенд:** Supabase (Auth, PostgreSQL, Storage).
- **Хостинг:** Yandex Object Storage (РФ).
- **Домен:** eupsy.ru (HTTPS).
- **Видео:** Jitsi Meet (планируется JaaS).

## 1. Структура проекта (v2)
psy-platform-v2/
├── pages/                 ← HTML страницы (в корне)
├── src/
│   ├── components/        ← Единые UI-компоненты (Sidebar, Topbar, UserMenu, Notifications)
│   ├── lib/               ← Конфиг и Supabase клиент
│   ├── pages/             ← JS-логика страниц (модули Vite)
│   └── styles/            ← CSS-стили (catalog.css, dashboard.css и т.д.)
├── public/                ← Статические файлы (картинки, favicon)
├── docs/                  ← Документация
├── index.html             ← Главная (публичный каталог)
├── vite.config.js         ← Конфиг сборщика
├── package.json
└── .gitignore

---

## 2. Страницы (`pages/`)

| Файл | Защита |
|------|--------|
| `login.html`, `register.html` | публичные |
| `client.html` | auth-guard (роль client) |
| `dashboard.html` | auth-guard (роль psychologist) |
| `admin.html` | auth-guard (owner / admin / moderator) |
| `application-history.html` | auth-guard |
| `become-psychologist.html` | auth-guard |
| `psychologist.html` | публичная |
| `room.html` | публичная (по sessionId) |
| `rules-cancel.html` | публичная |

**Секции `client.html`:** catalog / sessions / messages / planner / profile.
**Секции `dashboard.html`:** calendar / sessions / messages / profile / reports.

---

## 3. Модули (`src/`)

### Компоненты (`src/components/`)
| Файл | Что |
|------|-----|
| `Sidebar.js` | Единое боковое меню (зависит от роли) |
| `Topbar.js` | Единая верхняя шапка |
| `UserMenu.js` | Меню аватара, переключение кабинетов |
| `Notifications.js` | Виджет уведомлений + напоминания |

### Логика страниц (`src/pages/`)
| Файл | Что |
|------|-----|
| `index.js` | Точка входа главной. Инициализация шапки и каталога. |
| `client.js` | Роутер секций кабинета клиента. |
| `dashboard.js` | Роутер секций кабинета психолога. |
| `catalog.js` | **Единый компонент каталога** (HTML + логика + фильтры). Используется и на главной, и в кабинете. |
| `psychologist.js` | Профиль психолога (для клиента), бронирование, отзывы. |
| `sessions.js` | Сессии клиента (отмена, комната). |
| `psychologist-sessions.js` | Сессии психолога. |
| `client-profile.js` | Профиль клиента. |
| `psychologist-profile.js` | Личная страница психолога (настройки). |
| `messenger.js` | Мессенджер (polling). |
| `calendar.js` | Календарь (слоты, события). |
| `become-block.js` | Блок заявки в профиле. |
| `become-psychologist.js` | Форма заявки + документы. |
| `application-history.js` | История заявки. |
| `admin.js` | Админка (модерация). |
| `room.js` | Видеокомната (Jitsi). |
| `reports.js` | Отчёты (демо-данные). |

---

## 4. Хранилище

### Supabase
**Auth:** `auth.users`

**Таблицы:**
- `profiles` — пользователи (роли, ФИО, транслируемое имя, код, статус, аватар, часовой пояс)
- `psychologist_profiles` — психологи (специализация, стаж, цена, рейтинг, аватар, method[], languages[])
- `events` — календарь (free / session / personal / work / health / study)
- `sessions` — бронирования
- `reviews` — отзывы
- `notifications` — уведомления
- `chats` + `messages` — мессенджер
- `applications` — заявки на психолога (+ documents jsonb, qualifications, method[], languages[])
- `application_events` — история заявки (+ snapshot jsonb)
- `client_notes` — заметки психолога о клиенте

**Storage:** `avatars` (public), `documents` (public).

**Триггеры:**
- `trg_reviews_update_rating`
- `trg_application_events`
- `trg_sync_client_avatar`
- `trg_sync_psychologist_avatar`

**RPC:**
- `approve_application`, `reject_application`, `request_attention`
- `resubmit_application`

### localStorage
- `psyhelp_user` — кеш профиля пользователя.

---

## 5. Роли

| Роль | Что |
|------|-----|
| client | Каталог, сессии, чаты |
| psychologist | Календарь, сессии, отчёты |
| moderator | Модерация (в разработке) |
| admin | Управление (в разработке) |
| owner | Всё (Админка) |

`profiles.roles` — jsonb массив.

---

## 6. Ключевые сценарии

### Бронирование
`catalog.js` → `psychologist.js` → confirmBooking()
→ DELETE free → INSERT sessions → INSERT events (психологу и клиенту) → INSERT notifications

### Отмена
`sessions.js` / `psychologist-sessions.js` → status=cancelled
→ возврат free-слота → удаление events → уведомление

### Заявка на психолога
`become-psychologist.js` → загрузка в Storage
→ INSERT applications → триггер пишет в application_events
*(Поля method и languages сохраняются в JSON и в колонки)*

### Модерация
`admin.js` → RPC (approve / reject / attention)
→ копирование данных в `psychologist_profiles` (включая method и languages) → отправка уведомления.

---

## 7. Тема оформления и UI

- `theme.css` — переменные (цвета, шрифты).
- `dashboard.css` — общий каркас (сайдбар, топбар, скролл).
- `catalog.css` — **единые стили каталога** (плашка фильтров, карточки). Применяется на главной и в кабинете.
- Шапки (`topbar`, `catalog-toolbar`) закреплены через `position: sticky` и `overflow: hidden` на обертках.

---

## 8. Технический долг и подготовка к коммерции

1. **Оплата:** Нет интеграции с ЮKassa (сессии сейчас бесплатные).
2. **Видео:** Публичный Jitsi Meet (лимит 5 минут). Требуется JaaS от 8x8.
3. **Юридические документы:** Страницы `terms.html`, `consent.html` — заглушки. Нужны для 152-ФЗ.
4. **Почта:** Нет кастомного SMTP (только стандартные письма Supabase).
5. **Отчёты:** Работают на демо-данных (`localStorage`).

---

## 9. Документация
- `state.md`
- `architecture.md` (этот файл)
- `theme-guide.md`
- `changelog.md`