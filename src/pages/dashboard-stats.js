// ============================================
// СВОДКА (Dashboard) — модуль v2
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[dashboard-stats] loaded');

export async function initDashboardStats() {
    var container = document.getElementById('dashboardSection');
    if (!container) return;

    // Показываем загрузку
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Загрузка статистики...</div>';

    try {
        // 1. Считаем клиентов (роль client)
        var clientsRes = await supa.from('profiles').select('*', { count: 'exact', head: true }).contains('roles', ['client']);
        
        // 2. Считаем психологов (роль psychologist)
        var psyRes = await supa.from('profiles').select('*', { count: 'exact', head: true }).contains('roles', ['psychologist']);
        
        // 3. Считаем общее количество сессий
        var sessionsRes = await supa.from('sessions').select('*', { count: 'exact', head: true });

        // 4. Считаем сумму всех проведенных сессий (status = 'completed')
        var completedRes = await supa.from('sessions').select('price').eq('status', 'completed');
        var totalRevenue = 0;
        if (completedRes.data) {
            totalRevenue = completedRes.data.reduce(function (sum, s) { return sum + (s.price || 0); }, 0);
        }

        var clientsCount = clientsRes.count || 0;
        var psyCount = psyRes.count || 0;
        var sessionsCount = sessionsRes.count || 0;

        // Рисуем карточки
        container.innerHTML = 
            '<div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:20px;margin-top:20px;">' +
                
                '<div class="stat-card" style="background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">' +
                    '<div style="font-size:14px;color:#888;margin-bottom:8px;">Клиенты</div>' +
                    '<div style="font-size:32px;font-weight:700;color:#333;">' + clientsCount + '</div>' +
                '</div>' +

                '<div class="stat-card" style="background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">' +
                    '<div style="font-size:14px;color:#888;margin-bottom:8px;">Психологи</div>' +
                    '<div style="font-size:32px;font-weight:700;color:#4a90e2;">' + psyCount + '</div>' +
                '</div>' +

                '<div class="stat-card" style="background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">' +
                    '<div style="font-size:14px;color:#888;margin-bottom:8px;">Всего сессий</div>' +
                    '<div style="font-size:32px;font-weight:700;color:#333;">' + sessionsCount + '</div>' +
                '</div>' +

                '<div class="stat-card" style="background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">' +
                    '<div style="font-size:14px;color:#888;margin-bottom:8px;">Оборот (проведено)</div>' +
                    '<div style="font-size:32px;font-weight:700;color:#2ecc71;">' + totalRevenue.toLocaleString('ru-RU') + ' ₽</div>' +
                '</div>' +

            '</div>' +
            
            '<div style="margin-top:40px;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">' +
                '<h3 style="margin-top:0;">Быстрые действия</h3>' +
                '<p style="color:#666;font-size:14px;margin-bottom:16px;">Управляйте платформой в один клик.</p>' +
                '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
                    '<a href="/pages/admin.html?section=applications" style="background:#4a90e2;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Проверить заявки</a>' +
                    '<a href="/pages/admin.html?section=users" style="background:#f0f4fa;color:#4a90e2;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Все пользователи</a>' +
                    '<a href="/pages/admin.html?section=reports" style="background:#f0f4fa;color:#4a90e2;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Отчёты</a>' +
                '</div>' +
            '</div>';

    } catch (err) {
        console.error('[dashboard-stats] error:', err);
        container.innerHTML = '<div style="color:red;padding:20px;">Ошибка загрузки статистики.</div>';
    }
}