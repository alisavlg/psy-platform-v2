# Eupsy — Архитектура проекта

**Версия:** 6.1
**Последнее обновление:** 30 октября 2026

**Проект:** Eupsy
**Домен:** eupsy.ru (работает на VPS)

## 1. Структура проекта (v2)
psy-platform-v2/
├── pages/                 ← HTML страницы (в корне)
├── src/
│   ├── components/        ← Единые UI-компоненты (Sidebar, Topbar, UserMenu, Notifications)
│   ├── lib/               ← Конфиг и Supabase клиент
│   ├── pages/             ← JS-логика страниц (модули Vite)
│   └── styles/            ← CSS-стили (catalog.css, dashboard.css и т.д.)
├── public/                ← Статические файлы (картинки, favicon)
├── docs/
├── index.html             ← Главная (публичный каталог)
├── vite.config.js
├── package.json
└── .gitignore

## 2. Технологический стек
- **Фронтенд:** HTML, Vanilla JS (ES Modules), CSS. Сборщик — Vite.
- **Бэкенд:** Supabase (Auth, PostgreSQL, Storage).
- **Хостинг:** VPS в Serv-Tech (IP `185.170.10.206`).
- **Веб-сервер:** Nginx (раздача статики из `/var/www/eupsy/dist/`).
- **Видеосвязь:** WebRTC + собственный TURN-сервер (Coturn) на VPS.
- **SSL:** Let's Encrypt (Certbot).

## 3. Ключевые сценарии

### Видеосвязь (WebRTC)
1. Психолог заходит в комнату. Создает `RTCPeerConnection`, отправляет `offer` в таблицу `webrtc_signals` (получатель — `psychologist_user_id` или `client_id`).
2. Клиент заходит в комнату. Polling каждые 2 секунды проверяет `webrtc_signals`.
3. Клиент получает `offer`, создает `answer`, отправляет обратно.
4. Оба обмениваются `ice-candidate`.
5. Соединение устанавливается через TURN-сервер (`turn:185.170.10.206:3478`).

### Бронирование
`catalog.js` → `psychologist.js` → confirmBooking()
→ DELETE free → INSERT sessions (с `psychologist_user_id`) → INSERT events (психологу и клиенту) → INSERT notifications

### Отмена
`sessions.js` / `psychologist-sessions.js` → status=cancelled
→ возврат free-слота → удаление events → уведомление

### Заявка на психолога
`become-psychologist.js` → загрузка в Storage
→ INSERT applications → триггер пишет в application_events

### Модерация
`admin.js` → RPC (approve / reject / attention)
→ копирование данных в `psychologist_profiles` → отправка уведомления.

## 4. Технический долг и подготовка к коммерции
1. **Оплата:** Нет интеграции с ЮKassa.
2. **Юридические документы:** Страницы `terms.html`, `consent.html` — заглушки. Нужны для 152-ФЗ.
3. **Почта:** Нет кастомного SMTP.
4. **Отчёты:** Работают на демо-данных.

## 5. Документация
- `state.md`
- `architecture.md` (этот файл)
- `theme-guide.md`
- `changelog.md`