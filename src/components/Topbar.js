// ============================================
// Topbar — единый компонент
// ============================================

import { BRAND } from '@/lib/config.js';

export function renderTopbar(pageTitle) {
    const container = document.getElementById('appTopbar');
    if (!container) return;

    container.innerHTML =
        '<h1 class="page-title" id="pageTitle">' + pageTitle + '</h1>' +
        '<div class="topbar-actions">' +
            '<button class="icon-btn" aria-label="Уведомления">🔔</button>' +
        '</div>';
}