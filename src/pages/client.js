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
import { renderMessenger, initMessenger } from '@/pages/messenger.js';
import { initBecomeBlock } from '@/pages/become-block.js';

console.log('[client.js] loaded');

// ============================================
// Обёртка для профиля
// ============================================

async function initProfile() {
    await initClientProfile();
    await initBecomeBlock();
}

// ============================================
// Конфигурация секций
// ============================================

var SECTIONS = {
    catalog:  { title: 'Найти психолога', id: 'catalogSection',  init: function() { initCatalog('catalogSection'); } },
    sessions: { title: 'Мои сессии',      id: 'sessionsSection', init: initSessions },
    messages: { title: 'Сообщения',       id: 'messagesSection', init: renderMessenger },
    planner:  { title: 'Планировщик',     id: 'plannerSection',  init: renderCalendar },
    profile:  { title: 'Профиль',         id: 'profileSection',  init: initProfile }
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

    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = section.title;
    document.title = section.title + ' | Eupsy';

    renderSidebar('client', sectionKey);

    Object.keys(SECTIONS).forEach(function (key) {
        var el = document.getElementById(SECTIONS[key].id);
        if (el) el.style.display = (key === sectionKey) ? 'block' : 'none';
    });

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

    renderTopbar(sectionConf.title);
    await renderUserMenu();
    await initNotifications();
    await initMessenger();

    await renderClientSection();
});