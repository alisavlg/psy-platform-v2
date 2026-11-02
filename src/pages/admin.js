// ============================================
// АДМИНКА (CRM) — роутер и сборщик (v2)
// ============================================

import '@/styles/theme.css';
import '@/styles/dashboard.css';
import '@/styles/user-menu.css';
import '@/styles/notifications.css';
import '@/styles/admin.css';

import { supa } from '@/lib/supabase.js';

import { renderSidebar } from '@/components/Sidebar.js';
import { renderTopbar } from '@/components/Topbar.js';
import { renderUserMenu } from '@/components/UserMenu.js';
import { initNotifications } from '@/components/Notifications.js';

// Импортируем модуль сводки
import { initDashboardStats } from '@/pages/dashboard-stats.js';

console.log('[admin] loaded');

// Секции
var SECTIONS = {
    dashboard: { title: 'Сводка', id: 'dashboardSection', init: initDashboardStats },
    applications: { title: 'Заявки', id: 'applicationsSection', init: null },
    users: { title: 'Пользователи', id: 'usersSection', init: null }
};

function getSectionFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('section') || 'dashboard';
}

async function renderAdminSection() {
    var sectionKey = getSectionFromURL();
    var section = SECTIONS[sectionKey];

    if (!section) {
        window.location.href = '/pages/admin.html?section=dashboard';
        return;
    }

    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = section.title;
    document.title = section.title + ' | Eupsy';

    renderSidebar('owner', sectionKey);

    Object.keys(SECTIONS).forEach(function (key) {
        var el = document.getElementById(SECTIONS[key].id);
        if (el) el.style.display = (key === sectionKey) ? 'block' : 'none';
    });

    if (section.init) {
        await section.init();
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    window.CURRENT_USER = 'owner';
    
    var user = JSON.parse(localStorage.getItem('psyhelp_user') || '{}');
    var roles = Array.isArray(user.roles) ? user.roles : [];
    if (!user.id || (roles.indexOf('owner') === -1 && roles.indexOf('admin') === -1)) {
        window.location.href = '/pages/client.html?section=catalog';
        return;
    }

    var section = getSectionFromURL();
    var sectionConf = SECTIONS[section] || SECTIONS.dashboard;

    renderTopbar(sectionConf.title);
    await renderUserMenu();
    await initNotifications();

    await renderAdminSection();
});