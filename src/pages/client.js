// ============================================
// Кабинет клиента — роутер и сборщик (v2)
// ============================================

// Стили
import '@/styles/theme.css';
import '@/styles/dashboard.css';
import '@/styles/calendar.css';
import '@/styles/messenger.css';
import '@/styles/sessions.css';
import '@/styles/profile-client.css';
import '@/styles/client.css';
import '@/styles/user-menu.css';
import '@/styles/notifications.css';

// Библиотеки
import { supa } from '@/lib/supabase.js';

// Компоненты
import { renderSidebar } from '@/components/Sidebar.js';
import { renderTopbar } from '@/components/Topbar.js';
import { renderUserMenu } from '@/components/UserMenu.js';
import { initNotifications } from '@/components/Notifications.js';

// Разделы v2
import { initCatalog } from '@/pages/catalog.js';
import { initSessions } from '@/pages/sessions.js';
import { initClientProfile } from '@/pages/client-profile.js';
import { renderCalendar } from '@/pages/calendar.js';

// Разделы v1 — ещё не переведены
import '../../assets/js/messenger.js';
import '../../assets/js/become-block.js';

console.log('[client.js] loaded');

// ============================================
// Конфигурация секций
// ============================================

var SECTIONS = {
    catalog:  { title: 'Найти психолога', id: 'catalogSection',  init: initCatalog },
    sessions: { title: 'Мои сессии',      id: 'sessionsSection', init: initSessions },
    messages: { title: 'Сообщения',       id: 'messagesSection', init: null },
    planner:  { title: 'Планировщик',     id: 'plannerSection',  init: renderCalendar },
    profile:  { title: 'Профиль',         id: 'profileSection',  init: initClientProfile }
};

function getSectionFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('section') || 'catalog';
}

// ============================================
// Роутер
// ============================================

async function renderClientSection() {
    var sectionKey = getSectionFromURL();
    var section = SECTIONS[sectionKey];

    if (!section) {
        window.location.href = 'client.html?section=catalog';
        return;
    }

    // Заголовок
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = section.title;
    document.title = section.title + ' | Eupsy';

    // Активный пункт меню
    renderSidebar('client', sectionKey);

    // Скрыть все секции, показать нужную
    Object.keys(SECTIONS).forEach(function (key) {
        var el = document.getElementById(SECTIONS[key].id);
        if (el) el.style.display = (key === sectionKey) ? 'block' : 'none';
    });

    // Инициализация раздела
    if (section.init) {
        await section.init();
    }
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    window.CURRENT_USER = 'client';

    var section = getSectionFromURL();
    var sectionConf = SECTIONS[section] || SECTIONS.catalog;

    // Каркас
    renderTopbar(sectionConf.title);
    await renderUserMenu();
    await initNotifications();

    // Раздел
    await renderClientSection();
});