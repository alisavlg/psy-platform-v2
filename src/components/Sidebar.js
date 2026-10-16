// ============================================
// Sidebar — единый компонент
// ============================================

import { BRAND, MENU } from '@/lib/config.js';

export function renderSidebar(role, activeSection) {
    const container = document.getElementById('appSidebar');
    if (!container) return;

    const items = MENU[role] || MENU.client;

    var navHtml = '';
    items.forEach(function (item) {
        var isActive = (item.section === activeSection) ? ' active' : '';
        var badge = item.badge ? '<span class="nav-badge"></span>' : '';
        navHtml +=
            '<a href="' + item.href + '" class="nav-item' + isActive + '" data-section="' + item.section + '">' +
                item.icon +
                item.label +
                badge +
            '</a>';
    });

    container.innerHTML =
        '<div class="logo">' + BRAND.name + '</div>' +
        '<nav class="sidebar-nav">' + navHtml + '</nav>';
}