// Стили
import '@/styles/theme.css';
import '@/styles/auth.css';
import '@/styles/dashboard.css';
import '@/styles/user-menu.css';
import '@/styles/notifications.css';

// Логика
import { supa } from '@/lib/supabase.js';

// ============================================
// Вход через Supabase
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('loginForm');
    if (!form) return;

    var togglePassword = document.getElementById('togglePassword');
    var passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            var type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    function showError(fieldId, message) {
        var errorEl = document.getElementById(fieldId + 'Error');
        var inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = message;
        if (inputEl) {
            var group = inputEl.closest('.form-group');
            if (group) group.classList.add('has-error');
        }
    }

    function clearError(fieldId) {
        var errorEl = document.getElementById(fieldId + 'Error');
        var inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = '';
        if (inputEl) {
            var group = inputEl.closest('.form-group');
            if (group) group.classList.remove('has-error');
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateForm() {
        var isValid = true;

        var email = document.getElementById('email').value.trim();
        if (!email) {
            showError('email', 'Введите email');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('email', 'Неверный формат email');
            isValid = false;
        } else clearError('email');

        var password = document.getElementById('password').value;
        if (!password) {
            showError('password', 'Введите пароль');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Пароль должен быть минимум 8 символов');
            isValid = false;
        } else clearError('password');

        return isValid;
    }

    function getRedirectURL(user) {
        var roles = Array.isArray(user.roles) ? user.roles : [];

        if (roles.length === 0) {
            roles = ['client'];
            user.roles = roles;
            user.activeRole = 'client';
            localStorage.setItem('psyhelp_user', JSON.stringify(user));
        }

        if (roles.length === 1) {
            return roles[0] === 'psychologist'
                ? 'dashboard.html?section=calendar'
                : 'client.html?section=catalog';
        }

        var activeRole = user.activeRole || 'client';
        if (roles.indexOf(activeRole) === -1) activeRole = roles[0];

        return activeRole === 'psychologist'
            ? 'dashboard.html?section=calendar'
            : 'client.html?section=catalog';
    }

    

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateForm()) return;

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Входим...';
        messageEl.className = 'form-message';
        messageEl.textContent = '';

        

        var email = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;

        try {
            console.log('[login] signIn...');
            var signInResult = await supa.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (signInResult.error) {
                console.error('[login] error:', signInResult.error);
                var msg = signInResult.error.message || 'Неверный email или пароль';
                if (msg.toLowerCase().indexOf('invalid') !== -1) {
                    msg = 'Неверный email или пароль';
                }
                messageEl.className = 'form-message error';
                messageEl.textContent = msg;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти';
                return;
            }

            var authUser = signInResult.data.user;
            console.log('[login] авторизован:', authUser.id);

                        // Загружаем профиль
            var profileResult = await supa
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            var profile = profileResult.data;

            // Если профиля нет (пользователь только что подтвердил почту), создаем его
            if (profileResult.error || !profile) {
                console.log('[login] профиля нет, создаем из метаданных...');
                
                var meta = authUser.user_metadata || {};
                // Генерируем случайный код пользователя
                var randomCode = 'U-' + Math.floor(1000 + Math.random() * 9000);

                var insertResult = await supa.from('profiles').insert({
                    id: authUser.id,
                    email: authUser.email,
                    code: randomCode,
                    real_first_name: meta.firstName || '',
                    real_middle_name: meta.middleName || '',
                    real_last_name: meta.lastName || '',
                    display_first_name: '',
                    display_middle_name: '',
                    phone: meta.phone || '',
                    timezone: meta.timezone || 'Europe/Moscow',
                    avatar_url: '',
                    psychologist_status: 'none',
                    roles: ['client']
                }).select().single();

                if (insertResult.error) {
                    console.error('[login] profile insert error:', insertResult.error);
                    messageEl.className = 'form-message error';
                    messageEl.textContent = 'Ошибка создания профиля: ' + insertResult.error.message;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Войти';
                    return;
                }

                profile = insertResult.data;
                console.log('[login] профиль успешно создан:', profile);
            }

            // Собираем psyhelp_user для совместимости с остальными скриптами
            var userData = {
                id: authUser.id,
                code: profile.code || '',
                email: authUser.email,
                realFirstName: profile.real_first_name || '',
                realMiddleName: profile.real_middle_name || '',
                realLastName: profile.real_last_name || '',
                displayFirstName: profile.display_first_name || '',
                displayMiddleName: profile.display_middle_name || '',
                phone: profile.phone || '',
                timezone: profile.timezone || 'Europe/Moscow',
                avatarUrl: profile.avatar_url || '',
                roles: Array.isArray(profile.roles) ? profile.roles : ['client'],
                activeRole: (Array.isArray(profile.roles) && profile.roles.indexOf('psychologist') !== -1) ? 'psychologist' : 'client',
                psychologistStatus: profile.psychologist_status || 'none',
                isVerified: false,
                registeredAt: profile.created_at ? new Date(profile.created_at).getTime() : Date.now(),
                passwordChangedAt: Date.now()
            };

            localStorage.setItem('psyhelp_user', JSON.stringify(userData));

            messageEl.className = 'form-message success';
            messageEl.textContent = '✓ Вход выполнен. Перенаправляем...';

            var redirectURL = getRedirectURL(userData);
            console.log('[login] редирект в:', redirectURL);

            setTimeout(function () {
                window.location.href = redirectURL;
            }, 1200);

        } catch (err) {
            console.error('[login] exception:', err);
            messageEl.className = 'form-message error';
            messageEl.textContent = 'Ошибка: ' + (err.message || 'попробуйте ещё раз');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    });
});