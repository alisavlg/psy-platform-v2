// ============================================
// UserMenu — меню пользователя (модуль)
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[UserMenu] loaded');

const USER_MENU_KEY = 'psyhelp_user';

function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_MENU_KEY)) || {};
    } catch (e) { return {}; }
}

function saveUser(user) {
    localStorage.setItem(USER_MENU_KEY, JSON.stringify(user));
}

function saveActiveRole(role) {
    const user = getUser();
    if (!user.id) return;
    user.activeRole = role;
    saveUser(user);
}

function getDisplayName(user) {
    var f = (user.displayFirstName || '').trim();
    var m = (user.displayMiddleName || '').trim();
    if (f && m) return f + ' ' + m;
    if (f) return f;

    var rf = (user.realFirstName || '').trim();
    var rm = (user.realMiddleName || '').trim();
    if (rf && rm) return rf + ' ' + rm;
    if (rf) return rf;
    return 'Пользователь';
}

function getInitials(user) {
    var f = (user.displayFirstName || user.realFirstName || '').charAt(0).toUpperCase();
    var m = (user.displayMiddleName || user.realMiddleName || '').charAt(0).toUpperCase();
    if (f && m) return f + m;
    if (f) return f;
    return '?';
}

function escapeHtmlUser(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

async function getAvatarFromSupabase(user) {
    if (!user.id || !supa) return '';

    var currentRole = window.CURRENT_USER || 'client';

    if (currentRole === 'psychologist') {
        try {
            var r = await supa.from('psychologist_profiles')
                .select('avatar_url')
                .eq('user_id', user.id)
                .limit(1);
            if (r.data && r.data.length > 0 && r.data[0].avatar_url) {
                return r.data[0].avatar_url;
            }
            var r2 = await supa.from('profiles').select('avatar_url').eq('id', user.id).single();
            return (r2.data && r2.data.avatar_url) || '';
        } catch (e) { return ''; }
    } else {
        try {
            var r3 = await supa.from('profiles').select('avatar_url').eq('id', user.id).single();
            return (r3.data && r3.data.avatar_url) || '';
        } catch (e) { return ''; }
    }
}

function avatarInnerHtml(avatarUrl, initials) {
    if (avatarUrl) {
        return '<div class="user-avatar" style="background-image:url(' + avatarUrl + ');background-size:cover;background-position:center;"></div>';
    }
    return '<div class="user-avatar">' + initials + '</div>';
}

export async function renderUserMenu() {
    console.log('[UserMenu] renderUserMenu, CURRENT_USER =', window.CURRENT_USER);

    const actionsEl = document.querySelector('.topbar-actions');
    if (!actionsEl) {
        console.error('[UserMenu] .topbar-actions не найден');
        return;
    }

    var user = getUser();
    if (!user.realFirstName && !user.email) {
        console.log('[UserMenu] psyhelp_user пуст');
        return;
    }

    const initials = getInitials(user);
    const displayName = getDisplayName(user);
    const code = user.code || '—';
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const currentRole = window.CURRENT_USER || 'client';

    var avatarUrl = await getAvatarFromSupabase(user);
    if (!avatarUrl) avatarUrl = user.avatarUrl || '';

    var avatarHtml = avatarInnerHtml(avatarUrl, initials);

    var oldMenu = document.getElementById('userMenu');
    if (oldMenu) oldMenu.remove();

    let roleItemsHtml = '';

    if (roles.indexOf('client') !== -1) {
        const isActive = currentRole === 'client';
        roleItemsHtml +=
            '<a href="/pages/client.html?section=catalog" class="user-menu-item' + (isActive ? ' active' : '') + '" data-role="client">' +
                '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>' +
                    '<circle cx="12" cy="7" r="4"></circle>' +
                '</svg>' +
                'Кабинет клиента' +
            '</a>';
    }

    if (roles.indexOf('psychologist') !== -1) {
        const isActive = currentRole === 'psychologist';
        roleItemsHtml +=
            '<a href="/pages/dashboard.html?section=calendar" class="user-menu-item' + (isActive ? ' active' : '') + '" data-role="psychologist">' +
                '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>' +
                    '<circle cx="12" cy="7" r="4"></circle>' +
                    '<polyline points="16 11 18 13 22 9"></polyline>' +
                '</svg>' +
                'Кабинет психолога' +
            '</a>';
    }

    const settingsHref = currentRole === 'psychologist'
        ? '/pages/dashboard.html?section=profile'
        : '/pages/client.html?section=profile';

    const menuHtml =
        '<div class="user-menu" id="userMenu">' +
            '<button class="user-menu-trigger" id="userMenuTrigger" type="button">' +
                avatarHtml +
                '<svg class="user-menu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                    '<polyline points="6 9 12 15 18 9"></polyline>' +
                '</svg>' +
            '</button>' +
            '<div class="user-menu-dropdown" id="userMenuDropdown">' +
                '<div class="user-menu-info">' +
                    avatarHtml +
                    '<div class="user-menu-info-text">' +
                        '<div class="user-menu-name">' + escapeHtmlUser(displayName) + '</div>' +
                        '<div class="user-menu-code">' + escapeHtmlUser(code) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="user-menu-divider"></div>' +
                '<div class="user-menu-section-title">Переключить кабинет</div>' +
                roleItemsHtml +
                '<div class="user-menu-divider"></div>' +
                '<a href="' + settingsHref + '" class="user-menu-item" data-action="settings">' +
                    '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<circle cx="12" cy="12" r="3"></circle>' +
                        '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
                    '</svg>' +
                    'Настройки' +
                '</a>' +
                '<a href="#" class="user-menu-item user-menu-item-danger" id="logoutBtn">' +
                    '<svg class="user-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
                        '<polyline points="16 17 21 12 16 7"></polyline>' +
                        '<line x1="21" y1="12" x2="9" y2="12"></line>' +
                    '</svg>' +
                    'Выйти' +
                '</a>' +
            '</div>' +
        '</div>';

    const oldAvatar = actionsEl.querySelector('.user-avatar');
    if (oldAvatar && !oldAvatar.closest('.user-menu')) oldAvatar.remove();

    actionsEl.insertAdjacentHTML('beforeend', menuHtml);

    const menu = document.getElementById('userMenu');
    const trigger = document.getElementById('userMenuTrigger');
    const logoutBtn = document.getElementById('logoutBtn');

    if (trigger) {
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
    }

    document.addEventListener('click', function (e) {
        if (menu && !menu.contains(e.target)) menu.classList.remove('open');
    });

    document.querySelectorAll('.user-menu-item').forEach(function (link) {
        link.addEventListener('click', function () {
            var role = link.getAttribute('data-role');
            if (role) saveActiveRole(role);
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Выйти из аккаунта?')) {
                localStorage.removeItem('psyhelp_user');
                window.location.href = '/pages/login.html';
            }
        });
    }
}