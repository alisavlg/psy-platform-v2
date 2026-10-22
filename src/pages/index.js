// ============================================
// ГЛАВНАЯ — ПУБЛИЧНЫЙ КАТАЛОГ
// ============================================

import '@/styles/theme.css';
import '@/styles/index.css';
import '@/styles/user-menu.css';
import '@/styles/notifications.css';

import { supa } from '@/lib/supabase.js';
import { renderUserMenu } from '@/components/UserMenu.js';
import { initNotifications } from '@/components/Notifications.js';

console.log('[index] loaded');

// ============================================
// Состояние
// ============================================

let allPsychologists = [];
let filters = {
    search: '',
    specialty: '',
    method: '',
    experience: '',
    language: '',
    price: 0
};

// ============================================
// Пользователь
// ============================================

function getUser() {
    try { return JSON.parse(localStorage.getItem('psyhelp_user')) || {}; } catch (e) { return {}; }
}

function isLoggedIn() {
    return !!getUser().id;
}

function getCabinetUrl() {
    var user = getUser();
    var roles = Array.isArray(user.roles) ? user.roles : [];
    var activeRole = user.activeRole || 'client';
    if (activeRole === 'psychologist' && roles.indexOf('psychologist') !== -1) {
        return '/pages/dashboard.html?section=calendar';
    }
    return '/pages/client.html?section=catalog';
}

// ============================================
// Шапка
// ============================================

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

// ============================================
// Загрузка
// ============================================

function normalizePsychologist(row) {
    return {
        id: row.id,
        userId: row.user_id || null,
        firstName: row.first_name || '',
        middleName: row.middle_name || '',
        specialty: row.specialty || '',
        description: row.description || '',
        experience: row.experience || 0,
        price: row.price || 0,
        rating: Number(row.rating) || 0,
        reviewsCount: row.reviews_count || 0,
        isVerified: row.is_verified === true,
        avatarUrl: row.avatar_url || '',
        method: Array.isArray(row.method) ? row.method : [],
        languages: Array.isArray(row.languages) ? row.languages : []
    };
}

async function loadPsychologists() {
    if (!supa) return [];

    try {
        var result = await supa
            .from('psychologist_profiles')
            .select('*')
            .order('created_at', { ascending: true });

        if (result.error) {
            console.error('[index] ошибка загрузки каталога:', result.error);
            return [];
        }

        return (result.data || []).map(normalizePsychologist);
    } catch (err) {
        console.error('[index] исключение:', err);
        return [];
    }
}

// ============================================
// Фильтрация
// ============================================

function matchesExperience(exp, range) {
    if (!range) return true;
    if (range === 'none') return exp === 0;
    if (range === '1-5') return exp >= 1 && exp <= 5;
    if (range === '6-10') return exp >= 6 && exp <= 10;
    if (range === '10+') return exp > 10;
    return true;
}

function applyFilters() {
    return allPsychologists.filter(function (p) {
        if (filters.search) {
            var q = filters.search.toLowerCase();
            var hay = (p.firstName + ' ' + p.middleName + ' ' + p.specialty).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }

        if (filters.specialty && p.specialty.indexOf(filters.specialty) === -1) return false;

        if (filters.method && p.method.indexOf(filters.method) === -1) return false;

        if (filters.experience && !matchesExperience(p.experience, filters.experience)) return false;

        if (filters.language && p.languages.indexOf(filters.language) === -1) return false;

        if (filters.price && p.price > filters.price) return false;

        return true;
    });
}

// ============================================
// Отрисовка
// ============================================

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
        .filter(function (w) { return w.length > 0; })
        .map(function (w) { return w[0]; })
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function renderCatalog() {
    var listEl = document.getElementById('indexCatalog');
    var countEl = document.getElementById('indexCount');
    if (!listEl) return;

    var filtered = applyFilters();

    if (countEl) countEl.textContent = 'Найдено: ' + filtered.length;

    if (filtered.length === 0) {
        listEl.innerHTML =
            '<div class="index-empty">' +
                '<div class="index-empty-icon">🔍</div>' +
                '<p>Ничего не найдено. Попробуйте изменить фильтры.</p>' +
            '</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (psy) {
        var card = document.createElement('div');
        card.className = 'index-card';

        var initials = getInitials(psy.firstName + ' ' + psy.middleName);
        var fullName = (psy.firstName + ' ' + psy.middleName).trim();
        var stars = '★'.repeat(Math.round(psy.rating)) + '☆'.repeat(5 - Math.round(psy.rating));

        var avatarHtml;
        if (psy.avatarUrl) {
            avatarHtml = '<div class="index-card-avatar" style="background-image:url(' + psy.avatarUrl + ');background-size:cover;background-position:center;"></div>';
        } else {
            avatarHtml = '<div class="index-card-avatar">' + initials + '</div>';
        }

        var tagsHtml = '';
        if (psy.method.length > 0) {
            psy.method.forEach(function (m) {
                tagsHtml += '<span class="index-card-tag">' + escapeHtml(m) + '</span>';
            });
        }
        if (psy.languages.length > 0) {
            psy.languages.forEach(function (l) {
                tagsHtml += '<span class="index-card-tag">🌐 ' + escapeHtml(l) + '</span>';
            });
        }

        card.innerHTML =
            avatarHtml +
            '<div class="index-card-body">' +
                '<div class="index-card-header">' +
                    '<h3 class="index-card-name">' + escapeHtml(fullName) + '</h3>' +
                    (psy.isVerified ? '<span class="index-card-badge">✓ Проверен</span>' : '') +
                '</div>' +
                '<div class="index-card-specialty">' + escapeHtml(psy.specialty) + '</div>' +
                '<div class="index-card-description">' + escapeHtml(psy.description) + '</div>' +
                '<div class="index-card-meta">' +
                    '<span>Стаж: <strong>' + psy.experience + ' лет</strong></span>' +
                    '<span>Сессия: <strong>' + psy.price.toLocaleString('ru-RU') + ' ₽</strong></span>' +
                '</div>' +
                (tagsHtml ? '<div class="index-card-tags">' + tagsHtml + '</div>' : '') +
                '<div class="index-card-rating">' +
                    '<span class="index-card-stars">' + stars + '</span>' +
                    '<span>' + psy.rating + ' · ' + psy.reviewsCount + ' отзывов</span>' +
                '</div>' +
                '<button class="index-card-btn" data-psy-id="' + psy.id + '">Записаться</button>' +
            '</div>';

        card.querySelector('.index-card-btn').addEventListener('click', function () {
            if (!isLoggedIn()) {
                window.location.href = '/pages/login.html';
                return;
            }
            window.location.href = '/pages/psychologist.html?id=' + psy.id;
        });

        listEl.appendChild(card);
    });
}

// ============================================
// Фильтры
// ============================================

function bindFilters() {
    var search = document.getElementById('indexSearch');
    if (search) {
        search.addEventListener('input', function (e) {
            filters.search = e.target.value.trim();
            renderCatalog();
        });
    }

    var spec = document.getElementById('indexFilterSpecialty');
    if (spec) {
        spec.addEventListener('change', function (e) {
            filters.specialty = e.target.value;
            renderCatalog();
        });
    }

    var method = document.getElementById('indexFilterMethod');
    if (method) {
        method.addEventListener('change', function (e) {
            filters.method = e.target.value;
            renderCatalog();
        });
    }

    var exp = document.getElementById('indexFilterExperience');
    if (exp) {
        exp.addEventListener('change', function (e) {
            filters.experience = e.target.value;
            renderCatalog();
        });
    }

    var lang = document.getElementById('indexFilterLanguage');
    if (lang) {
        lang.addEventListener('change', function (e) {
            filters.language = e.target.value;
            renderCatalog();
        });
    }

    var price = document.getElementById('indexFilterPrice');
    if (price) {
        price.addEventListener('change', function (e) {
            filters.price = parseInt(e.target.value) || 0;
            renderCatalog();
        });
    }
}

// ============================================
// Инициализация
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    await renderHeader();
    bindFilters();

    allPsychologists = await loadPsychologists();
    renderCatalog();
});