// ============================================
// КАТАЛОГ ПСИХОЛОГОВ — ЕДИНЫЙ КОМПОНЕНТ
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[catalog] loaded');

var catalogSearchQuery = '';
var catalogSpecialty = '';
var catalogMethod = '';
var catalogExperience = '';
var catalogLanguage = '';
var catalogMaxPrice = 0;
var isCatalogRendered = false;

// ============================================
// HTML-разметка компонента (пишется один раз)
// ============================================

function getCatalogHTML() {
    return `
        <div class="catalog-toolbar">
            <div class="catalog-search">
                <input type="text" id="catalogSearch" placeholder="Поиск по имени или специализации...">
            </div>
            <div class="catalog-filters">
                <select id="filterSpecialty">
                    <option value="">Все специализации</option>
                    <option value="Тревога">Тревога</option>
                    <option value="Отношения">Отношения</option>
                    <option value="Самооценка">Самооценка</option>
                    <option value="Депрессия">Депрессия</option>
                    <option value="Детская психология">Детская психология</option>
                    <option value="Семейная терапия">Семейная терапия</option>
                </select>
                <select id="filterMethod">
                    <option value="">Любой метод</option>
                    <option value="КПТ">КПТ</option>
                    <option value="Гештальт">Гештальт</option>
                    <option value="Психоанализ">Психоанализ</option>
                    <option value="АСТ">АСТ</option>
                    <option value="EMDR">EMDR</option>
                    <option value="Семейная терапия">Семейная терапия</option>
                    <option value="Детская психология">Детская психология</option>
                </select>
                <select id="filterExperience">
                    <option value="">Любой опыт</option>
                    <option value="none">Нет опыта</option>
                    <option value="1-5">1–5 лет</option>
                    <option value="6-10">6–10 лет</option>
                    <option value="10+">Более 10 лет</option>
                </select>
                <select id="filterLanguage">
                    <option value="">Любой язык</option>
                    <option value="Русский">Русский</option>
                    <option value="Английский">Английский</option>
                    <option value="Немецкий">Немецкий</option>
                    <option value="Французский">Французский</option>
                    <option value="Испанский">Испанский</option>
                    <option value="Китайский">Китайский</option>
                </select>
                <select id="filterPrice">
                    <option value="">Любая цена</option>
                    <option value="1500">до 1 500 ₽</option>
                    <option value="3000">до 3 000 ₽</option>
                    <option value="5000">до 5 000 ₽</option>
                </select>
            </div>
        </div>
        <div class="catalog-count" id="catalogCount">Найдено: 0</div>
        <div class="catalog-list" id="catalogList"></div>
    `;
}

// ============================================
// Логика загрузки и фильтрации
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

async function fetchPsychologistsFromSupabase() {
    if (!supa) return [];
    try {
        var result = await supa.from('psychologist_profiles').select('*').order('created_at', { ascending: true });
        if (result.error) {
            console.error('[catalog] ошибка загрузки:', result.error);
            return [];
        }
        return (result.data || []).map(normalizePsychologist);
    } catch (err) {
        console.error('[catalog] исключение при загрузке:', err);
        return [];
    }
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(function (w) { return w.length > 0; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function matchesExperience(exp, range) {
    if (!range) return true;
    if (range === 'none') return exp === 0;
    if (range === '1-5') return exp >= 1 && exp <= 5;
    if (range === '6-10') return exp >= 6 && exp <= 10;
    if (range === '10+') return exp > 10;
    return true;
}

async function renderCatalog() {
    var listEl = document.getElementById('catalogList');
    var countEl = document.getElementById('catalogCount');
    if (!listEl) return;

    listEl.innerHTML = '<div class="catalog-empty"><p>Загрузка...</p></div>';

    var all = await fetchPsychologistsFromSupabase();

    var filtered = all.filter(function (p) {
        if (catalogSearchQuery) {
            var q = catalogSearchQuery.toLowerCase();
            var hay = (p.firstName + ' ' + p.middleName + ' ' + p.specialty).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        if (catalogSpecialty && p.specialty.indexOf(catalogSpecialty) === -1) return false;
        if (catalogMethod && p.method.indexOf(catalogMethod) === -1) return false;
        if (catalogExperience && !matchesExperience(p.experience, catalogExperience)) return false;
        if (catalogLanguage && p.languages.indexOf(catalogLanguage) === -1) return false;
        if (catalogMaxPrice && p.price > catalogMaxPrice) return false;
        return true;
    });

    if (countEl) countEl.textContent = 'Найдено: ' + filtered.length;

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="catalog-empty"><div class="catalog-empty-icon">🔍</div><p>Ничего не найдено. Попробуйте изменить фильтры.</p></div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(function (psy) {
        var card = document.createElement('div');
        card.className = 'psy-card';
        
        var initials = getInitials(psy.firstName + ' ' + psy.middleName);
        var fullName = psy.firstName + ' ' + psy.middleName;
        var stars = '★'.repeat(Math.round(psy.rating)) + '☆'.repeat(5 - Math.round(psy.rating));

        var avatarHtml = psy.avatarUrl 
            ? '<div class="psy-card-avatar" style="background-image:url(' + psy.avatarUrl + ');background-size:cover;background-position:center;"></div>'
            : '<div class="psy-card-avatar">' + initials + '</div>';

        var tagsHtml = '';
        if (psy.method.length > 0) {
            psy.method.forEach(function (m) { tagsHtml += '<span class="psy-card-tag">' + escapeHtml(m) + '</span>'; });
        }
        if (psy.languages.length > 0) {
            psy.languages.forEach(function (l) { tagsHtml += '<span class="psy-card-tag">🌐 ' + escapeHtml(l) + '</span>'; });
        }

        card.innerHTML =
            avatarHtml +
            '<div class="psy-card-body">' +
                '<div class="psy-card-header">' +
                    '<h3 class="psy-card-name">' + escapeHtml(fullName) + '</h3>' +
                    (psy.isVerified ? '<span class="psy-card-badge">✓ Проверен</span>' : '') +
                '</div>' +
                '<div class="psy-card-specialty">' + escapeHtml(psy.specialty) + '</div>' +
                '<div class="psy-card-description">' + escapeHtml(psy.description) + '</div>' +
                '<div class="psy-card-meta">' +
                    '<span class="psy-card-stat">Стаж: <strong>' + psy.experience + ' лет</strong></span>' +
                    '<span class="psy-card-stat">Сессия: <strong>' + psy.price.toLocaleString('ru-RU') + ' ₽</strong></span>' +
                '</div>' +
                (tagsHtml ? '<div class="psy-card-tags">' + tagsHtml + '</div>' : '') +
                '<div class="psy-card-rating">' +
                    '<span class="psy-card-stars">' + stars + '</span>' +
                    '<span class="psy-card-reviews">' + psy.rating + ' · ' + psy.reviewsCount + ' отзывов</span>' +
                '</div>' +
                '<button class="psy-card-btn">Записаться</button>' +
            '</div>';

        card.querySelector('.psy-card-btn').addEventListener('click', function () {
            window.location.href = 'psychologist.html?id=' + psy.id;
        });

        listEl.appendChild(card);
    });
}

function bindFilters() {
    var searchInput = document.getElementById('catalogSearch');
    if (searchInput) searchInput.addEventListener('input', function (e) { catalogSearchQuery = e.target.value.trim(); renderCatalog(); });

    var specFilter = document.getElementById('filterSpecialty');
    if (specFilter) specFilter.addEventListener('change', function (e) { catalogSpecialty = e.target.value; renderCatalog(); });

    var methodFilter = document.getElementById('filterMethod');
    if (methodFilter) methodFilter.addEventListener('change', function (e) { catalogMethod = e.target.value; renderCatalog(); });

    var expFilter = document.getElementById('filterExperience');
    if (expFilter) expFilter.addEventListener('change', function (e) { catalogExperience = e.target.value; renderCatalog(); });

    var langFilter = document.getElementById('filterLanguage');
    if (langFilter) langFilter.addEventListener('change', function (e) { catalogLanguage = e.target.value; renderCatalog(); });

    var priceFilter = document.getElementById('filterPrice');
    if (priceFilter) priceFilter.addEventListener('change', function (e) { catalogMaxPrice = parseInt(e.target.value) || 0; renderCatalog(); });
}

// ============================================
// Публичная инициализация
// ============================================

export function initCatalog(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (!isCatalogRendered) {
        container.innerHTML = getCatalogHTML();
        bindFilters();
        isCatalogRendered = true;
    }
    
    renderCatalog();
}