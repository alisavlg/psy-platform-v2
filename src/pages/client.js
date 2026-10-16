// ============================================
// Кабинет клиента — сборщик (v2)
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

// Старая логика разделов — пока работает как есть, переведём по одному
import '../../assets/js/client.js';
import '../../assets/js/calendar.js';
import '../../assets/js/messenger.js';
import '../../assets/js/sessions.js';
import '../../assets/js/client-profile.js';
import '../../assets/js/become-block.js';

console.log('[client.js] loaded');

// ============================================
// Заголовки разделов
// ============================================

var SECTION_TITLES = {
    catalog:  'Найти психолога',
    sessions: 'Мои сессии',
    messages: 'Сообщения',
    planner:  'Планировщик',
    profile:  'Профиль'
};

function getSectionFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('section') || 'catalog';
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    window.CURRENT_USER = 'client';

    var section = getSectionFromURL();
    var title = SECTION_TITLES[section] || 'Кабинет';

    // 1. Каркас: боковое меню и шапка
    renderSidebar('client', section);
    renderTopbar(title);

    // 2. Меню пользователя и уведомления — после Topbar (он создаёт .topbar-actions)
    await renderUserMenu();
    await initNotifications();
});