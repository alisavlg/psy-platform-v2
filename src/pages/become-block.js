// ============================================
// БЛОК «СТАТЬ ПСИХОЛОГОМ» — модуль v2
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[become-block] loaded');

var cachedApp = null;
var loaded = false;

function getUser() {
    try { return JSON.parse(localStorage.getItem('psyhelp_user')) || {}; } catch (e) { return {}; }
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

async function loadActiveApp() {
    var user = getUser();
    if (!user.id || !supa) return null;

    try {
        var result = await supa
            .from('applications')
            .select('id, status, moderator_comment, specialty, experience, price, created_at')
            .eq('user_id', user.id)
            .maybeSingle();

        if (result.error) {
            console.error('[become-block] ошибка загрузки:', result.error);
            return null;
        }
        return result.data || null;
    } catch (err) {
        console.error('[become-block] исключение:', err);
        return null;
    }
}

function bind() {
    var block = document.getElementById('becomePsychologistBlock');
    if (!block) return;

    var btn = block.querySelector('[data-become-go]');
    if (btn) {
        btn.onclick = function () { window.location.href = 'application-history.html'; };
    }
}

function render() {
    var block = document.getElementById('becomePsychologistBlock');
    if (!block) return;

    block.style.display = '';

    if (!loaded || !cachedApp) {
        block.innerHTML =
            '<div class="become-psy-content">' +
                '<h3>Хотите помогать другим?</h3>' +
                '<p>Подайте заявку на роль психолога. Мы проверим данные и проведём собеседование.</p>' +
                '<button type="button" class="btn-become-psy" data-become-go="1">Стать психологом →</button>' +
            '</div>';
        bind();
        return;
    }

    var status = cachedApp.status;

    if (status === 'pending') {
        block.innerHTML =
            '<div class="become-psy-content">' +
                '<h3>⏳ Заявка на проверке</h3>' +
                '<p>Мы проверяем данные. Это занимает 1–3 рабочих дня.</p>' +
                '<button type="button" class="btn-become-psy" data-become-go="1">История заявки →</button>' +
            '</div>';
    } else if (status === 'attention') {
        block.innerHTML =
            '<div class="become-psy-content">' +
                '<h3>⚠️ Требует внимания</h3>' +
                (cachedApp.moderator_comment
                    ? '<div class="become-reason">' + escapeHtml(cachedApp.moderator_comment) + '</div>'
                    : '<p>Посмотрите комментарий модератора.</p>') +
                '<button type="button" class="btn-become-psy" data-become-go="1">История заявки →</button>' +
            '</div>';
    } else if (status === 'rejected') {
        block.innerHTML =
            '<div class="become-psy-content">' +
                '<h3>❌ Заявка отклонена</h3>' +
                (cachedApp.moderator_comment
                    ? '<div class="become-reason">' + escapeHtml(cachedApp.moderator_comment) + '</div>'
                    : '<p>Посмотрите комментарий модератора.</p>') +
                '<button type="button" class="btn-become-psy" data-become-go="1">История заявки →</button>' +
            '</div>';
    } else if (status === 'approved') {
        block.innerHTML =
            '<div class="become-psy-content">' +
                '<h3>✅ Заявка одобрена</h3>' +
                '<p>Перезайдите в аккаунт, чтобы увидеть кабинет психолога.</p>' +
                '<button type="button" class="btn-become-psy" data-become-go="1" style="margin-top:12px;">История заявки →</button>' +
            '</div>';
    }

    bind();
}

export async function initBecomeBlock() {
    if (!loaded) {
        cachedApp = await loadActiveApp();
        loaded = true;
    }
    render();
}