// ============================================
// ПРОФИЛЬ (Единый для всех ролей) — модуль v2
// ============================================

import { supa } from '@/lib/supabase.js';
import { renderUserMenu } from '@/components/UserMenu.js';

console.log('[client-profile] loaded');

var CLIENT_USER_KEY = 'psyhelp_user';
var PASSWORD_MAX_AGE_DAYS = 60;

function getClientUser() {
    var data = localStorage.getItem(CLIENT_USER_KEY);
    if (!data) return {};
    try { return JSON.parse(data) || {}; } catch (e) { return {}; }
}

function saveClientUser(user) {
    localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(user));
}

async function loadProfileFromSupabase() {
    try {
        var sessionResult = await supa.auth.getSession();
        if (sessionResult.error || !sessionResult.data.session) return null;

        var userId = sessionResult.data.session.user.id;
        var authEmail = sessionResult.data.session.user.email;

        var result = await supa.from('profiles').select('*').eq('id', userId).single();
        if (result.error || !result.data) return null;

        var p = result.data;

        var appStatus = null;
        try {
            var appResult = await supa.from('applications').select('status').eq('user_id', userId).in('status', ['pending', 'attention']).order('created_at', { ascending: false }).limit(1);
            if (appResult.data && appResult.data.length > 0) appStatus = appResult.data[0].status;
        } catch (e) {}

        var userData = {
            id: userId,
            code: p.code || '',
            email: p.email || authEmail,
            realFirstName: p.real_first_name || '',
            realMiddleName: p.real_middle_name || '',
            realLastName: p.real_last_name || '',
            displayFirstName: p.display_first_name || '',
            displayMiddleName: p.display_middle_name || '',
            phone: p.phone || '',
            timezone: p.timezone || 'Europe/Moscow',
            avatarUrl: p.avatar_url || '',
            roles: Array.isArray(p.roles) ? p.roles : ['client'],
            activeRole: 'client',
            psychologistStatus: (p.psychologist_status && p.psychologist_status !== 'none') ? p.psychologist_status : (appStatus || 'none'),
            isVerified: false,
            registeredAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
            passwordChangedAt: Date.now(),
            supportDisplayName: p.support_display_name || ''
        };

        saveClientUser(userData);
        return userData;

    } catch (err) {
        console.error('[client-profile] исключение:', err);
        return null;
    }
}

async function saveProfileToSupabase(data) {
    try {
        var sessionResult = await supa.auth.getSession();
        if (sessionResult.error || !sessionResult.data.session) return { success: false, error: 'Нет сессии' };

        var userId = sessionResult.data.session.user.id;
        var updateData = {
            display_first_name: data.displayFirstName || '',
            display_middle_name: data.displayMiddleName || '',
            phone: data.phone || '',
            timezone: data.timezone || 'Europe/Moscow'
        };

        if (window.CURRENT_USER === 'support') {
            updateData.support_display_name = data.displayMiddleName;
        }

        var result = await supa.from('profiles').update(updateData).eq('id', userId);
        if (result.error) return { success: false, error: result.error.message };
        return { success: true };

    } catch (err) {
        return { success: false, error: err.message || 'Ошибка' };
    }
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
    return '—';
}

export function renderClientProfile() {
    var user = getClientUser();
    var currentRole = window.CURRENT_USER || 'client';

    // --- 1. СОЗДАЕМ РАЗМЕТКУ, ЕСЛИ ЕЕ НЕТ (для админки) ---
    var container = document.getElementById('profileSection');
    if (container && container.innerHTML.trim() === '') {
        container.innerHTML = `
            <div class="profile-edit-container">
                <div class="profile-fio-block">
                    <div class="profile-fio-header">
                        <h3>Персональные данные</h3>
                        <span class="verify-badge" id="clientVerifyBadge">👤 Клиент</span>
                    </div>
                    <div class="profile-fio-row">
                        <div class="profile-fio-item"><span class="profile-fio-label">Имя</span><span class="profile-fio-value" id="clientRealFirstName">—</span></div>
                        <div class="profile-fio-item"><span class="profile-fio-label">Отчество</span><span class="profile-fio-value" id="clientRealMiddleName">—</span></div>
                    </div>
                    <div class="profile-fio-row">
                        <div class="profile-fio-item full"><span class="profile-fio-label">Фамилия</span><span class="profile-fio-value" id="clientRealLastName">—</span></div>
                    </div>
                </div>

                <div class="profile-display-block">
                    <div class="profile-display-header"><h3>Как вас видят другие</h3></div>
                    <div class="profile-display-preview">
                        <div class="profile-display-avatar" id="clientAvatarPreview">Фото</div>
                        <div class="profile-display-info">
                            <div class="profile-display-name" id="displayNamePreview">—</div>
                            <div class="profile-display-role">Клиент</div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" id="displayFirstNameGroup"><label for="displayFirstName">Имя (транслируемое)</label><input type="text" id="displayFirstName" placeholder="Например, Ирина"></div>
                        <div class="form-group" id="displayMiddleNameGroup"><label for="displayMiddleName">Отчество (транслируемое)</label><input type="text" id="displayMiddleName" placeholder="Например, Викторовна"></div>
                    </div>
                    <div class="profile-avatar-actions">
                        <input type="file" id="clientAvatarInput" accept="image/*" style="display:none;">
                        <button type="button" class="btn-photo" id="clientAvatarBtn">Загрузить фото</button>
                    </div>
                </div>

                <div class="profile-code-block">
                    <div class="profile-code-label">Ваш код на платформе</div>
                    <div class="profile-code-row">
                        <span class="profile-code-value" id="clientUserCode">—</span>
                        <button type="button" class="btn-copy-code" id="copyCodeBtn">📋 Скопировать</button>
                    </div>
                </div>

                <div class="profile-divider"><span>Контактные данные</span></div>

                <form class="profile-edit-form" id="clientProfileForm" novalidate>
                    <div class="form-group"><label for="clientEmail">Email</label><input type="email" id="clientEmail" disabled></div>
                    <div class="form-group"><label for="clientPhone">Телефон</label><input type="tel" id="clientPhone"><span class="form-error" id="clientPhoneError"></span></div>
                    <div class="form-group">
                        <label for="clientTimezone">Часовой пояс</label>
                        <select id="clientTimezone">
                            <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
                            <option value="Europe/Moscow">Москва (UTC+3)</option>
                            <option value="Europe/Samara">Самара (UTC+4)</option>
                            <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                            <option value="Asia/Omsk">Омск (UTC+6)</option>
                            <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
                            <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
                            <option value="Asia/Yakutsk">Якутск (UTC+9)</option>
                            <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
                        </select>
                    </div>
                    <div class="profile-edit-actions"><button type="submit" class="btn-save-profile" id="saveClientProfileBtn">Сохранить изменения</button></div>
                    <div class="form-message" id="clientProfileMessage"></div>
                </form>

                <div class="security-block">
                    <h3>Безопасность</h3>
                    <div class="password-status" id="clientPasswordStatus">
                        <span class="password-status-icon" id="clientPasswordStatusIcon">✓</span>
                        <div class="password-status-text">
                            <strong id="clientPasswordStatusTitle">Пароль в порядке</strong>
                            <span id="clientPasswordStatusDesc">Пароль был установлен недавно.</span>
                            <div class="password-age-bar"><div class="password-age-fill" id="clientPasswordAgeFill" style="width: 0%;"></div></div>
                            <div class="password-age-text" id="clientPasswordAgeText"></div>
                        </div>
                    </div>
                    <button type="button" class="btn-change-password" id="clientChangePasswordBtn">Сменить пароль</button>
                    <div class="change-password-form" id="clientChangePasswordForm">
                        <div class="form-group"><label for="clientCurrentPassword">Текущий пароль</label><input type="password" id="clientCurrentPassword"><span class="form-error" id="clientCurrentPasswordError"></span></div>
                        <div class="form-group"><label for="clientNewPassword">Новый пароль</label><input type="password" id="clientNewPassword"><span class="form-error" id="clientNewPasswordError"></span></div>
                        <div class="form-group"><label for="clientNewPassword2">Повторите пароль</label><input type="password" id="clientNewPassword2"><span class="form-error" id="clientNewPassword2Error"></span></div>
                        <div class="change-password-actions">
                            <button type="button" class="btn-confirm-password" id="clientConfirmPasswordBtn">Сменить</button>
                            <button type="button" class="btn-cancel-password" id="clientCancelPasswordBtn">Отмена</button>
                        </div>
                        <div class="change-password-message" id="clientChangePasswordMessage"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- 2. НАСТРАИВАЕМ ВИД В ЗАВИСИМОСТИ ОТ РОЛИ ---

    // Заполняем реальные ФИО
    var realF = document.getElementById('clientRealFirstName');
    var realM = document.getElementById('clientRealMiddleName');
    var realL = document.getElementById('clientRealLastName');

    if (realF) realF.textContent = user.realFirstName || '—';
    if (realM) realM.textContent = user.realMiddleName || '—';
    if (realL) realL.textContent = user.realLastName || '—';

    // Бейдж
    var badge = document.getElementById('clientVerifyBadge');
    if (badge) {
        if (currentRole === 'support') {
            badge.className = 'verify-badge pending';
            badge.textContent = '🛟 Сотрудник Поддержки';
        } else if (currentRole === 'owner' || currentRole === 'admin') {
            badge.className = 'verify-badge';
            badge.textContent = '🛡️ Администратор';
        } else {
            var status = user.psychologistStatus || 'none';
            if (status === 'pending') {
                badge.className = 'verify-badge pending';
                badge.textContent = '⏳ Заявка на психолога';
            } else {
                badge.className = 'verify-badge';
                badge.textContent = '👤 Клиент';
            }
        }
    }

    var dispF = document.getElementById('displayFirstName');
    var dispM = document.getElementById('displayMiddleName');
    var groupF = document.getElementById('displayFirstNameGroup');
    var groupM = document.getElementById('displayMiddleNameGroup');
    
    var safeFirstName = (user.displayFirstName || '').trim();
    var safeMiddleName = (user.displayMiddleName || '').trim();
    
    if (safeFirstName.includes('@')) safeFirstName = '';
    if (safeMiddleName.includes('@')) safeMiddleName = '';

    // Скрываем/показываем поля по таблице
    if (currentRole === 'support') {
        // Поддержка: только Псевдоним (вместо Отчества)
        if (groupF) groupF.style.display = 'none';
        if (groupM) groupM.style.display = '';
        if (dispM) {
            dispM.value = user.supportDisplayName || '';
            dispM.placeholder = 'Например: Илья';
            var labelM = dispM.previousElementSibling;
            if (labelM && labelM.tagName === 'LABEL') labelM.textContent = 'Имя в чатах (псевдоним)';
        }
    } else if (currentRole === 'psychologist') {
        // Психолог: ТОЛЬКО реальное (скрываем транслируемые)
        if (groupF) groupF.style.display = 'none';
        if (groupM) groupM.style.display = 'none';
    } else {
        // Клиент и Админ: оба поля
        if (groupF) groupF.style.display = '';
        if (groupM) groupM.style.display = '';
        if (dispF) dispF.value = safeFirstName;
        if (dispM) dispM.value = safeMiddleName;
        
        // Восстанавливаем подписи
        if (dispF) {
            var labelF2 = dispF.previousElementSibling;
            if (labelF2 && labelF2.tagName === 'LABEL') labelF2.textContent = 'Имя (транслируемое)';
        }
        if (dispM) {
            var labelM2 = dispM.previousElementSibling;
            if (labelM2 && labelM2.tagName === 'LABEL') labelM2.textContent = 'Отчество (транслируемое)';
        }
    }

    var preview = document.getElementById('displayNamePreview');
    if (preview) preview.textContent = getDisplayName(user);

    var avatarEl = document.getElementById('clientAvatarPreview');
    if (avatarEl) {
        if (user.avatarUrl) {
            avatarEl.style.backgroundImage = 'url(' + user.avatarUrl + ')';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
        } else {
            avatarEl.style.backgroundImage = '';
            avatarEl.textContent = 'Фото';
        }
    }

    var codeEl = document.getElementById('clientUserCode');
    if (codeEl) codeEl.textContent = user.code || 'CL-0000';

    var emailEl = document.getElementById('clientEmail');
    if (emailEl) emailEl.value = user.email || '';

    var phoneEl = document.getElementById('clientPhone');
    if (phoneEl) phoneEl.value = user.phone || '';

    var tzEl = document.getElementById('clientTimezone');
    if (tzEl) tzEl.value = user.timezone || 'Europe/Moscow';

    renderClientPasswordStatus(user);
}

function renderClientPasswordStatus(user) {
    var statusEl = document.getElementById('clientPasswordStatus');
    if (!statusEl) return;
    var iconEl = document.getElementById('clientPasswordStatusIcon');
    var titleEl = document.getElementById('clientPasswordStatusTitle');
    var descEl = document.getElementById('clientPasswordStatusDesc');
    var fillEl = document.getElementById('clientPasswordAgeFill');
    var textEl = document.getElementById('clientPasswordAgeText');

    var changedAt = user.passwordChangedAt || user.registeredAt || Date.now();
    var daysPassed = Math.floor((Date.now() - changedAt) / 86400000);
    var daysLeft = PASSWORD_MAX_AGE_DAYS - daysPassed;
    var percent = Math.min(100, Math.max(0, (daysPassed / PASSWORD_MAX_AGE_DAYS) * 100));

    statusEl.className = 'password-status';
    fillEl.className = 'password-age-fill';
    fillEl.style.width = percent + '%';

    if (daysLeft > 14) {
        statusEl.classList.add('ok');
        iconEl.textContent = '✓';
        titleEl.textContent = 'Пароль в порядке';
        descEl.textContent = 'Пароль был установлен ' + daysPassed + ' дн. назад.';
        textEl.textContent = 'Осталось ' + daysLeft + ' дн. до рекомендуемой смены';
    } else if (daysLeft > 0) {
        statusEl.classList.add('warning');
        fillEl.classList.add('warning');
        iconEl.textContent = '⚠️';
        titleEl.textContent = 'Скоро нужно сменить пароль';
        descEl.textContent = 'Пароль установлен ' + daysPassed + ' дн. назад.';
        textEl.textContent = 'Осталось ' + daysLeft + ' дн.';
    } else {
        statusEl.classList.add('expired');
        fillEl.classList.add('expired');
        fillEl.style.width = '100%';
        iconEl.textContent = '🚨';
        titleEl.textContent = 'Пора сменить пароль';
        descEl.textContent = 'Пароль не менялся ' + daysPassed + ' дн.';
        textEl.textContent = 'Просрочено на ' + Math.abs(daysLeft) + ' дн.';
    }
}

async function handleClientProfileSave(e) {
    e.preventDefault();
    var user = getClientUser();
    var dispF = document.getElementById('displayFirstName');
    var dispM = document.getElementById('displayMiddleName');
    var phoneEl = document.getElementById('clientPhone');
    var tzEl = document.getElementById('clientTimezone');
    var msgEl = document.getElementById('clientProfileMessage');

    var displayFirstName = dispF && dispF.parentElement.style.display !== 'none' ? dispF.value.trim() : '';
    var displayMiddleName = dispM && dispM.parentElement.style.display !== 'none' ? dispM.value.trim() : '';
    var phone = phoneEl ? phoneEl.value.trim() : '';
    var timezone = tzEl ? tzEl.value : 'Europe/Moscow';

    var isValid = true;
    var phoneError = document.getElementById('clientPhoneError');
    var cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!phone) {
        if (phoneError) phoneError.textContent = 'Введите телефон';
        isValid = false;
    } else if (!/^(\+7|8)\d{10}$/.test(cleanedPhone)) {
        if (phoneError) phoneError.textContent = 'Неверный формат телефона';
        isValid = false;
    } else if (phoneError) {
        phoneError.textContent = '';
    }

    if (!isValid) return;

    if (msgEl) {
        msgEl.className = 'form-message';
        msgEl.textContent = 'Сохранение...';
        msgEl.style.display = 'block';
    }

    var result = await saveProfileToSupabase({
        displayFirstName: displayFirstName,
        displayMiddleName: displayMiddleName,
        phone: phone,
        timezone: timezone
    });

    if (!result.success) {
        if (msgEl) {
            msgEl.className = 'form-message error';
            msgEl.textContent = 'Ошибка: ' + result.error;
        }
        return;
    }

    if (window.CURRENT_USER === 'support') {
        user.supportDisplayName = displayMiddleName;
    } else {
        user.displayFirstName = displayFirstName;
        user.displayMiddleName = displayMiddleName;
    }
    user.phone = phone;
    user.timezone = timezone;
    saveClientUser(user);

    var preview = document.getElementById('displayNamePreview');
    if (preview) preview.textContent = getDisplayName(user);

    if (msgEl) {
        msgEl.className = 'form-message success';
        msgEl.textContent = '✓ Изменения сохранены';
        setTimeout(function () {
            msgEl.className = 'form-message';
            msgEl.style.display = '';
        }, 3000);
    }

    var oldMenu = document.getElementById('userMenu');
    if (oldMenu) oldMenu.remove();
    await renderUserMenu();
}

function copyClientCode() {
    var codeEl = document.getElementById('clientUserCode');
    var btn = document.getElementById('copyCodeBtn');
    if (!codeEl || !btn) return;
    var code = codeEl.textContent;
    navigator.clipboard.writeText(code).then(function () {
        btn.classList.add('copied');
        btn.textContent = '✓ Скопировано';
        setTimeout(function () { btn.classList.remove('copied'); btn.textContent = '📋 Скопировать'; }, 2000);
    }).catch(function () { prompt('Скопируйте код:', code); });
}

async function handleAvatarUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Файл больше 5 МБ'); e.target.value = ''; return; }

    var user = getClientUser();
    if (!user.id) return;

    var ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    var path = user.id + '/avatar-' + Date.now() + '.' + ext;
    var avatarEl = document.getElementById('clientAvatarPreview');
    if (avatarEl) avatarEl.style.opacity = '0.5';

    try {
        var upRes = await supa.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
        if (upRes.error) { alert('Ошибка загрузки: ' + upRes.error.message); if (avatarEl) avatarEl.style.opacity = ''; return; }

        var urlRes = supa.storage.from('avatars').getPublicUrl(path);
        var publicUrl = urlRes.data.publicUrl;

        var updRes = await supa.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        if (updRes.error) { alert('Ошибка: ' + updRes.error.message); if (avatarEl) avatarEl.style.opacity = ''; return; }

        user.avatarUrl = publicUrl;
        saveClientUser(user);

        if (avatarEl) {
            avatarEl.style.backgroundImage = 'url(' + publicUrl + ')';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
            avatarEl.style.opacity = '';
        }

        var oldMenu = document.getElementById('userMenu');
        if (oldMenu) oldMenu.remove();
        await renderUserMenu();
    } catch (err) {
        alert('Ошибка: ' + (err.message || 'попробуйте ещё раз'));
        if (avatarEl) avatarEl.style.opacity = '';
    }
    e.target.value = '';
}

function toggleClientPasswordForm() {
    var form = document.getElementById('clientChangePasswordForm');
    if (form) form.classList.toggle('active');
}

function cancelClientPasswordChange() {
    var form = document.getElementById('clientChangePasswordForm');
    if (form) form.classList.remove('active');
    var cur = document.getElementById('clientCurrentPassword');
    var np = document.getElementById('clientNewPassword');
    var np2 = document.getElementById('clientNewPassword2');
    if (cur) cur.value = '';
    if (np) np.value = '';
    if (np2) np2.value = '';
    ['clientCurrentPassword', 'clientNewPassword', 'clientNewPassword2'].forEach(function (id) {
        var errEl = document.getElementById(id + 'Error');
        if (errEl) errEl.textContent = '';
    });
    var msg = document.getElementById('clientChangePasswordMessage');
    if (msg) msg.className = 'change-password-message';
}

async function handleClientPasswordChange() {
    var current = document.getElementById('clientCurrentPassword').value;
    var newPwd = document.getElementById('clientNewPassword').value;
    var newPwd2 = document.getElementById('clientNewPassword2').value;
    var msg = document.getElementById('clientChangePasswordMessage');
    var isValid = true;

    function showErr(id, text) { var el = document.getElementById(id + 'Error'); if (el) el.textContent = text; }
    function clearErr(id) { var el = document.getElementById(id + 'Error'); if (el) el.textContent = ''; }

    if (!current) { showErr('clientCurrentPassword', 'Введите текущий пароль'); isValid = false; } else clearErr('clientCurrentPassword');

    if (!newPwd) {
        showErr('clientNewPassword', 'Введите новый пароль'); isValid = false;
    } else if (/[а-яА-ЯёЁ]/.test(newPwd)) {
        showErr('clientNewPassword', 'Только латинские буквы'); isValid = false;
    } else if (newPwd.length < 8) {
        showErr('clientNewPassword', 'Минимум 8 символов'); isValid = false;
    } else if (!/[a-zA-Z]/.test(newPwd) || !/\d/.test(newPwd)) {
        showErr('clientNewPassword', 'Буквы и цифры'); isValid = false;
    } else if (newPwd === current) {
        showErr('clientNewPassword', 'Должен отличаться'); isValid = false;
    } else clearErr('clientNewPassword');

    if (!newPwd2) {
        showErr('clientNewPassword2', 'Повторите пароль'); isValid = false;
    } else if (newPwd2 !== newPwd) {
        showErr('clientNewPassword2', 'Не совпадают'); isValid = false;
    } else clearErr('clientNewPassword2');

    if (!isValid) return;

    try {
        var sessionResult = await supa.auth.getSession();
        if (!sessionResult.data.session) { if (msg) { msg.className = 'change-password-message error'; msg.textContent = 'Нет сессии'; } return; }

        var email = sessionResult.data.session.user.email;
        var checkResult = await supa.auth.signInWithPassword({ email: email, password: current });
        if (checkResult.error) { showErr('clientCurrentPassword', 'Неверный пароль'); return; }

        var updateResult = await supa.auth.updateUser({ password: newPwd });
        if (updateResult.error) { if (msg) { msg.className = 'change-password-message error'; msg.textContent = 'Ошибка: ' + updateResult.error.message; } return; }

        var user = getClientUser();
        user.passwordChangedAt = Date.now();
        saveClientUser(user);

        if (msg) { msg.className = 'change-password-message success'; msg.textContent = '✓ Пароль изменён.'; }
        renderClientPasswordStatus(user);
        setTimeout(function () { cancelClientPasswordChange(); }, 2000);

    } catch (err) {
        if (msg) { msg.className = 'change-password-message error'; msg.textContent = 'Ошибка: ' + (err.message || 'попробуйте ещё раз'); }
    }
}

var handlersBound = false;
function bindClientProfileHandlers() {
    if (handlersBound) return;
    handlersBound = true;
    console.log('[client-profile] bind handlers');

    var form = document.getElementById('clientProfileForm');
    if (form) form.addEventListener('submit', handleClientProfileSave);

    var copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyClientCode);

    var avatarInput = document.getElementById('clientAvatarInput');
    var avatarBtn = document.getElementById('clientAvatarBtn');
    if (avatarBtn && avatarInput) {
        avatarBtn.onclick = function (e) { e.preventDefault(); avatarInput.click(); };
        avatarInput.onchange = handleAvatarUpload;
    }

    var changeBtn = document.getElementById('clientChangePasswordBtn');
    if (changeBtn) changeBtn.addEventListener('click', toggleClientPasswordForm);

    var confirmBtn = document.getElementById('clientConfirmPasswordBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', handleClientPasswordChange);

    var cancelBtn = document.getElementById('clientCancelPasswordBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelClientPasswordChange);
}

export async function initClientProfile() {
    await loadProfileFromSupabase();
    renderClientProfile();
    bindClientProfileHandlers();
}