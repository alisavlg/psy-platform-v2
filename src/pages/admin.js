// ============================================
// АДМИНКА (CRM) — роутер и сборщик (v2)
// ============================================

import '@/styles/theme.css';
import '@/styles/dashboard.css';
import '@/styles/user-menu.css';
import '@/styles/notifications.css';
import '@/styles/admin.css';
import '@/styles/messenger.css';
import '@/styles/profile-client.css';
import { initClientProfile } from '@/pages/client-profile.js';
import { supa } from '@/lib/supabase.js';
import { renderSidebar } from '@/components/Sidebar.js';
import { renderTopbar } from '@/components/Topbar.js';
import { renderUserMenu } from '@/components/UserMenu.js';
import { initNotifications, Notifications } from '@/components/Notifications.js';
import { initDashboardStats } from '@/pages/dashboard-stats.js';
import { renderMessenger } from '@/pages/messenger.js'; // Единый мессенджер

console.log('[admin] loaded');

// ============================================
// 1. ЗАЯВКИ (заглушка)
// ============================================
async function reloadApplications() {
    var listEl = document.getElementById('applicationsSection');
    if (!listEl) return;
    listEl.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Заявок нет.</div>';
}

// ============================================
// 2. ПОЛЬЗОВАТЕЛИ (заглушка)
// ============================================
async function renderUsers() {
    var container = document.getElementById('usersSection');
    if (!container) return;
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Список пользователей в разработке.</div>';
}

// ============================================
// 3. СЕКЦИИ И РОУТЕР
// ============================================
var SECTIONS = {
    dashboard: { title: 'Сводка', id: 'dashboardSection', init: initDashboardStats },
    applications: { title: 'Заявки', id: 'applicationsSection', init: reloadApplications },
    messages: { title: 'Сообщения', id: 'messagesSection', init: renderMessenger },
    users: { title: 'Пользователи', id: 'usersSection', init: renderUsers },
    // Аудит использует тот же мессенджер, но покажет все чаты (благодаря логике внутри messenger.js)
    audit: { title: 'Аудит платформы', id: 'messagesSection', init: renderMessenger },
    // Заглушки
    sales: { title: 'CRM / Продажи', id: 'dashboardSection', init: function() { document.getElementById('dashboardSection').innerHTML = 'Раздел продаж в разработке'; } },
    reports: { title: 'Бухгалтерия', id: 'dashboardSection', init: function() { document.getElementById('dashboardSection').innerHTML = 'Раздел финансов в разработке'; } },
    marketing: { title: 'Маркетинг', id: 'dashboardSection', init: function() { document.getElementById('dashboardSection').innerHTML = 'Раздел маркетинга в разработке'; } },
    tech: { title: 'Техподдержка', id: 'dashboardSection', init: function() { document.getElementById('dashboardSection').innerHTML = 'Раздел техподдержки в разработке'; } },
    profile: { title: 'Профиль', id: 'profileSection', init: initClientProfile },
};

function getSectionFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('section') || 'dashboard';
}

async function renderAdminSection() {
    var sectionKey = getSectionFromURL();
    var section = SECTIONS[sectionKey];
    if (!section) { window.location.href = '/pages/admin.html?section=dashboard'; return; }

    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = section.title;
    document.title = section.title + ' | Eupsy';

    // Определяем роль для сайдбара
    var currentRole = 'owner';
    if (window.CURRENT_USER === 'support') currentRole = 'support';
    if (window.CURRENT_USER === 'compliance') currentRole = 'compliance';

    // Рисуем меню (в зависимости от роли)
    renderSidebar(currentRole, sectionKey);

    // Переключаем видимость секций
    Object.keys(SECTIONS).forEach(function (key) {
        var el = document.getElementById(SECTIONS[key].id);
        if (el) el.style.display = (key === sectionKey) ? 'block' : 'none';
    });

    if (section.init) await section.init();
}

document.addEventListener('DOMContentLoaded', async function () {
    var user = JSON.parse(localStorage.getItem('psyhelp_user') || '{}');
    var roles = Array.isArray(user.roles) ? user.roles : [];
    
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'support') {
        window.CURRENT_USER = 'support';
    } else if (urlParams.get('view') === 'audit') {
        window.CURRENT_USER = 'compliance';
    } else {
        window.CURRENT_USER = 'owner';
    }

    if (!user.id || (!roles.includes('owner') && !roles.includes('admin') && !roles.includes('support') && !roles.includes('compliance'))) {
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