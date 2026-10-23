// ============================================
// ГЛАВНАЯ — ТОЧКА ВХОДА (модуль v2)
// ============================================

import '@/styles/theme.css';
import '@/styles/index.css';
import '@/styles/catalog.css'; // <-- Единые стили каталога
import '@/styles/user-menu.css';
import '@/styles/notifications.css';

import { renderUserMenu } from '@/components/UserMenu.js';
import { initNotifications } from '@/components/Notifications.js';
import { initCatalog } from '@/pages/catalog.js'; // <-- Единая логика каталога

console.log('[index] loaded');

function getUser() {
    try { return JSON.parse(localStorage.getItem('psyhelp_user')) || {}; } catch (e) { return {}; }
}

function isLoggedIn() {
    return !!getUser().id;
}

async function renderHeader() {
    var actionsEl = document.getElementById('indexHeaderActions');
    if (!actionsEl) return;

    if (isLoggedIn()) {
        window.CURRENT_USER = getUser().activeRole === 'psychologist' ? 'psychologist' : 'client';
        await renderUserMenu();
        await initNotifications();
    } else {
        actionsEl.innerHTML =
            '<a href="/pages/login.html" class="index-auth-link">Войти</a>' +
            '<a href="/pages/register.html" class="index-auth-btn">Регистрация</a>';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    await renderHeader();
    initCatalog(); // <-- Запускает единый каталог
});