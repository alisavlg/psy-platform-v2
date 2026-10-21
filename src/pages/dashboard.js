// ============================================
// Кабинет психолога — роутер и сборщик (v2)
// ============================================

// Стили
import '@/styles/theme.css';
import '@/styles/dashboard.css';
import '@/styles/calendar.css';
import '@/styles/messenger.css';
import '@/styles/sessions.css';
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
import { renderCalendar } from '@/pages/calendar.js';
import { renderMessenger, initMessenger } from '@/pages/messenger.js';
import { initPsySessions } from '@/pages/psychologist-sessions.js';
import { initPsyProfile } from '@/pages/psychologist-profile.js';
import { initReports } from '@/pages/reports.js';

console.log('[dashboard] loaded');

// ============================================
// Конфигурация секций
// ============================================

var SECTIONS = {
    calendar: { title: 'Календарь',       id: 'calendarSection', init: renderCalendar },
    sessions: { title: 'Мои сессии',      id: 'sessionsSection', init: initPsySessions },
    messages: { title: 'Сообщения',       id: 'messagesSection', init: renderMessenger },
    profile:  { title: 'Личная страница', id: 'profileSection',  init: initPsyProfile },
    reports:  { title: 'Отчёты',          id: 'reportsSection',  init: initReports }
};

function getSectionFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('section') || 'calendar';
}

// ============================================
// Проверка доступа
// ============================================

function checkAccess() {
    var raw = localStorage.getItem('psyhelp_user');
    if (!raw) {
        window.location.href = '/pages/login.html';
        return false;
    }
    try {
        var user = JSON.parse(raw);
        var roles = Array.isArray(user.roles) ? user.roles : [];
        if (roles.indexOf('psychologist') === -1) {
            window.location.href = '/pages/client.html?section=catalog';
            return false;
        }
    } catch (e) {
        window.location.href = '/pages/login.html';
        return false;
    }
    return true;
}

// ============================================
// Роутер
// ============================================

async function renderDashboardSection() {
    var sectionKey = getSectionFromURL();
    var section = SECTIONS[sectionKey];

    if (!section) {
        window.location.href = '/pages/dashboard.html?section=calendar';
        return;
    }

    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = section.title;
    document.title = section.title + ' | Eupsy';

    renderSidebar('psychologist', sectionKey);

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
    window.CURRENT_USER = 'psychologist';

    if (!checkAccess()) return;

    var section = getSectionFromURL();
    var sectionConf = SECTIONS[section] || SECTIONS.calendar;

    renderTopbar(sectionConf.title);
    await renderUserMenu();
    await initNotifications();
    await initMessenger();

    await renderDashboardSection();
});