// ============================================
// Notifications — уведомления (модуль)
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[Notifications] loaded');

var cachedList = [];

function getUserId() {
    try {
        var u = JSON.parse(localStorage.getItem('psyhelp_user')) || {};
        return u.id || null;
    } catch (e) { return null; }
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function timeAgo(ts) {
    var diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    if (diff < 604800) return Math.floor(diff / 86400) + ' дн назад';
    return new Date(ts).toLocaleDateString('ru-RU');
}

function iconFor(type) {
    var icons = {
        application_approved: '✅',
        application_rejected: '❌',
        application_attention: '⚠️',
        session_booked: '📅',
        session_cancelled: '🚫',
        session_reminder_24: '⏰',
        session_reminder_1: '🔔'
    };
    return icons[type] || '🔔';
}

async function loadAll() {
    var userId = getUserId();
    if (!userId || !supa) return [];
    try {
        var result = await supa.from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
        if (result.error) return [];
        return result.data || [];
    } catch (err) { return []; }
}

async function markAllReadDb() {
    var userId = getUserId();
    if (!userId || !supa) return;
    await supa.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
}

async function markReadDb(id) {
    if (!supa) return;
    await supa.from('notifications').update({ is_read: true }).eq('id', id);
}

async function createNotification(userId, data) {
    if (!userId || !supa) return null;
    try {
        var result = await supa.from('notifications').insert({
            user_id: userId,
            type: data.type || 'info',
            title: data.title || 'Уведомление',
            text: data.text || '',
            link: data.link || ''
        }).select().single();
        if (result.error) return null;
        return result.data;
    } catch (err) { return null; }
}

function mountWidget() {
    var actionsEl = document.querySelector('.topbar-actions');
    if (!actionsEl) return;

    var old = actionsEl.querySelector('.notif-widget');
    if (old) old.remove();

    var oldBtn = actionsEl.querySelector('.icon-btn[aria-label="Уведомления"]');
    if (oldBtn) oldBtn.remove();

    var html =
        '<div class="notif-widget" id="notifWidget">' +
            '<button class="icon-btn notif-trigger" id="notifTrigger" type="button" aria-label="Уведомления">' +
                '🔔' +
                '<span class="notif-badge" id="notifBadge" style="display:none;"></span>' +
            '</button>' +
            '<div class="notif-dropdown" id="notifDropdown">' +
                '<div class="notif-header">' +
                    '<span>Уведомления</span>' +
                    '<button type="button" class="notif-mark-all" id="notifMarkAll">Прочитать все</button>' +
                '</div>' +
                '<div class="notif-list" id="notifList"></div>' +
            '</div>' +
        '</div>';

    actionsEl.insertAdjacentHTML('afterbegin', html);

    var trigger = document.getElementById('notifTrigger');
    var widget = document.getElementById('notifWidget');
    var markAllBtn = document.getElementById('notifMarkAll');

    if (trigger && widget) {
        trigger.addEventListener('click', async function (e) {
            e.stopPropagation();
            var willOpen = !widget.classList.contains('open');
            widget.classList.toggle('open');
            if (willOpen) await refresh();
        });
    }

    document.addEventListener('click', function (e) {
        if (widget && !widget.contains(e.target)) widget.classList.remove('open');
    });

    if (markAllBtn) {
        markAllBtn.addEventListener('click', async function (e) {
            e.stopPropagation();
            await markAllReadDb();
            await refresh();
        });
    }
}

function render() {
    var badge = document.getElementById('notifBadge');
    var listEl = document.getElementById('notifList');
    if (!badge || !listEl) return;

    var unread = cachedList.filter(function (n) { return !n.is_read; }).length;
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? '' : 'none';

    if (cachedList.length === 0) {
        listEl.innerHTML = '<div class="notif-empty">Уведомлений пока нет</div>';
        return;
    }

    var html = '';
    cachedList.forEach(function (n) {
        var cls = 'notif-item' + (n.is_read ? '' : ' notif-unread');
        html += '<div class="' + cls + '" data-id="' + escapeHtml(n.id) + '" data-link="' + escapeHtml(n.link || '') + '">' +
            '<div class="notif-icon">' + iconFor(n.type) + '</div>' +
            '<div class="notif-body">' +
                '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
                (n.text ? '<div class="notif-text">' + escapeHtml(n.text) + '</div>' : '') +
                '<div class="notif-time">' + timeAgo(n.created_at) + '</div>' +
            '</div>' +
        '</div>';
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll('.notif-item').forEach(function (item) {
        item.addEventListener('click', async function () {
            await markReadDb(item.dataset.id);
            if (item.dataset.link) window.location.href = item.dataset.link;
            else await refresh();
        });
    });
}

async function refresh() {
    cachedList = await loadAll();
    render();
}

async function checkReminders() {
    var userId = getUserId();
    if (!userId || !supa) return;

    var myPsyProfileId = null;
    try {
        var profResult = await supa.from('psychologist_profiles').select('id').eq('user_id', userId).limit(1);
        if (profResult.data && profResult.data.length > 0) myPsyProfileId = profResult.data[0].id;
    } catch (e) {}

    var query = supa.from('sessions').select('*').eq('status', 'confirmed');
    if (myPsyProfileId) query = query.or('client_id.eq.' + userId + ',psychologist_id.eq.' + myPsyProfileId);
    else query = query.eq('client_id', userId);

    var result = await query;
    if (result.error || !result.data) return;

    var now = Date.now();

    for (var i = 0; i < result.data.length; i++) {
        var s = result.data[i];
        var parts = s.date.split('-');
        var sessionTs = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), s.hour, 0, 0).getTime();
        var hoursLeft = (sessionTs - now) / 3600000;

        var iAmClient = s.client_id === userId;
        var iAmPsy = myPsyProfileId && s.psychologist_id === myPsyProfileId;

        if (iAmClient) {
            if (hoursLeft <= 24 && hoursLeft > 1 && !s.remind_24_sent) {
                await createNotification(userId, {
                    type: 'session_reminder_24',
                    title: 'Напоминание: сессия завтра',
                    text: 'Сессия с ' + (s.psychologist_name || 'психологом') + ' — ' + s.date + ' в ' + String(s.hour).padStart(2, '0') + ':00. Отмена менее чем за 24 часа — возврат 50%.',
                    link: '/pages/client.html?section=sessions&highlight=' + s.id
                });
                await supa.from('sessions').update({ remind_24_sent: true }).eq('id', s.id);
            }
            if (hoursLeft <= 1 && hoursLeft > -1 && !s.remind_1_sent) {
                await createNotification(userId, {
                    type: 'session_reminder_1',
                    title: 'Сессия через час',
                    text: s.date + ' в ' + String(s.hour).padStart(2, '0') + ':00.',
                    link: '/pages/client.html?section=sessions&highlight=' + s.id
                });
                await supa.from('sessions').update({ remind_1_sent: true }).eq('id', s.id);
            }
        }

        if (iAmPsy) {
            if (hoursLeft <= 24 && hoursLeft > 1 && !s.remind_24_sent_psy) {
                await createNotification(userId, {
                    type: 'session_reminder_24',
                    title: 'Напоминание: сессия завтра',
                    text: 'Сессия с ' + (s.client_name || 'клиентом') + ' — ' + s.date + ' в ' + String(s.hour).padStart(2, '0') + ':00.',
                    link: '/pages/dashboard.html?section=sessions&highlight=' + s.id
                });
                await supa.from('sessions').update({ remind_24_sent_psy: true }).eq('id', s.id);
            }
            if (hoursLeft <= 1 && hoursLeft > -1 && !s.remind_1_sent_psy) {
                await createNotification(userId, {
                    type: 'session_reminder_1',
                    title: 'Сессия через час',
                    text: 'С ' + (s.client_name || 'клиентом') + ' — ' + s.date + ' в ' + String(s.hour).padStart(2, '0') + ':00.',
                    link: '/pages/dashboard.html?section=sessions&highlight=' + s.id
                });
                await supa.from('sessions').update({ remind_1_sent_psy: true }).eq('id', s.id);
            }
        }
    }

    await refresh();
}

export async function initNotifications() {
    mountWidget();
    await refresh();
    await checkReminders();

    setInterval(function () { refresh(); }, 10000);
    setInterval(function () { checkReminders(); }, 60000);

    window.addEventListener('pageshow', function () { refresh(); });
    window.addEventListener('focus', function () { refresh(); });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') refresh();
    });
}

export const Notifications = {
    add: function (data) {
        var userId = getUserId();
        if (!userId) return Promise.resolve(null);
        return createNotification(userId, data);
    },
    addFor: function (userId, data) { return createNotification(userId, data); },
    refresh: refresh,
    checkReminders: checkReminders
};

if (typeof window !== 'undefined') {
    window.Notifications = Notifications;
}