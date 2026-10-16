// ============================================
// AUTH GUARD — проверка сессии (модуль)
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[auth-guard] запуск проверки сессии');

export async function checkAuth() {
    try {
        const sessionResult = await supa.auth.getSession();

        if (sessionResult.error) {
            console.error('[auth-guard] ошибка getSession:', sessionResult.error);
            window.location.href = '/pages/login.html';
            return null;
        }

        const session = sessionResult.data.session;

        if (!session || !session.user) {
            console.warn('[auth-guard] сессии нет → login.html');
            window.location.href = '/pages/login.html';
            return null;
        }

        // Восстанавливаем psyhelp_user из Supabase
        var userRaw = localStorage.getItem('psyhelp_user');
        var user = null;
        try {
            user = userRaw ? JSON.parse(userRaw) : null;
        } catch (e) { user = null; }

        if (!user || user.id !== session.user.id) {
            console.log('[auth-guard] восстанавливаем psyhelp_user');
            user = await restoreUserFromSupabase(session.user);
        } else {
            console.log('[auth-guard] сессия валидна:', session.user.email);
        }

        // Проверка роли для админки
        checkAdminAccess();

        return user;

    } catch (err) {
        console.error('[auth-guard] исключение:', err);
        window.location.href = '/pages/login.html';
        return null;
    }
}

async function restoreUserFromSupabase(authUser) {
    var profileResult = await supa
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (profileResult.error || !profileResult.data) {
        console.error('[auth-guard] профиль не найден:', profileResult.error);
        return null;
    }

    var p = profileResult.data;
    var userData = {
        id: authUser.id,
        code: p.code || '',
        email: authUser.email,
        realFirstName: p.real_first_name || '',
        realMiddleName: p.real_middle_name || '',
        realLastName: p.real_last_name || '',
        displayFirstName: p.display_first_name || '',
        displayMiddleName: p.display_middle_name || '',
        phone: p.phone || '',
        timezone: p.timezone || 'Europe/Moscow',
        avatarUrl: p.avatar_url || '',
        roles: Array.isArray(p.roles) ? p.roles : ['client'],
        activeRole: (Array.isArray(p.roles) && p.roles.indexOf('psychologist') !== -1) ? 'psychologist' : 'client',
        psychologistStatus: p.psychologist_status || 'none',
        isVerified: false,
        registeredAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        passwordChangedAt: Date.now()
    };
    localStorage.setItem('psyhelp_user', JSON.stringify(userData));
    return userData;
}

function checkAdminAccess() {
    var page = window.location.pathname.split('/').pop();
    if (page !== 'admin.html') return true;

    var userRaw = localStorage.getItem('psyhelp_user');
    var userData = null;
    try { userData = userRaw ? JSON.parse(userRaw) : null; } catch (e) {}

    var roles = (userData && Array.isArray(userData.roles)) ? userData.roles : [];
    var hasAccess = roles.indexOf('owner') !== -1
                 || roles.indexOf('moderator') !== -1
                 || roles.indexOf('admin') !== -1;

    if (!hasAccess) {
        console.warn('[auth-guard] нет доступа к админке → client.html');
        window.location.href = '/pages/client.html?section=catalog';
        return false;
    }
    return true;
}