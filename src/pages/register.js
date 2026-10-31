// ============================================
// Регистрация — модуль v2
// ============================================

import '@/styles/theme.css';
import '@/styles/auth.css';

import { supa } from '@/lib/supabase.js';

console.log('[register] loaded');

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('registerForm');
    if (!form) return;

    var togglePassword = document.getElementById('togglePassword');
    var togglePassword2 = document.getElementById('togglePassword2');
    var passwordInput = document.getElementById('password');
    var passwordInput2 = document.getElementById('password2');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            var type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    if (togglePassword2 && passwordInput2) {
        togglePassword2.addEventListener('click', function () {
            var type = passwordInput2.type === 'password' ? 'text' : 'password';
            passwordInput2.type = type;
            togglePassword2.textContent = type === 'password' ? '👁' : '🙈';
        });
    }

    var strengthBar = document.getElementById('passwordStrength');

    function updateStrength(val) {
        if (!strengthBar) return;
        strengthBar.classList.remove('weak', 'medium', 'strong');
        if (!val) return;

        var hasLatin = /[a-zA-Z]/.test(val);
        var hasDigits = /\d/.test(val);
        var hasSymbols = /[^a-zA-Z0-9]/.test(val);
        var hasCyrillic = /[а-яА-ЯёЁ]/.test(val);
        var isLong = val.length >= 8;

        if (hasCyrillic) { strengthBar.classList.add('weak'); return; }
        if (isLong && hasLatin && hasDigits && hasSymbols) strengthBar.classList.add('strong');
        else if (isLong && hasLatin && hasDigits) strengthBar.classList.add('medium');
        else strengthBar.classList.add('weak');
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function () { updateStrength(passwordInput.value); });
    }

    var generateBtn = document.getElementById('generatePassword');
    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            var pwd = generateStrongPassword();
            passwordInput.value = pwd;
            passwordInput2.value = pwd;
            passwordInput.type = 'text';
            passwordInput2.type = 'text';
            if (togglePassword) togglePassword.textContent = '🙈';
            if (togglePassword2) togglePassword2.textContent = '🙈';
            updateStrength(pwd);
            clearError('password');
            clearError('password2');
        });
    }

    function generateStrongPassword() {
        var lower = 'abcdefghijkmnpqrstuvwxyz';
        var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        var digits = '23456789';
        var symbols = '!@#$%^&*';
        var all = lower + upper + digits + symbols;

        var pwd = '';
        pwd += lower.charAt(Math.floor(Math.random() * lower.length));
        pwd += upper.charAt(Math.floor(Math.random() * upper.length));
        pwd += digits.charAt(Math.floor(Math.random() * digits.length));
        pwd += symbols.charAt(Math.floor(Math.random() * symbols.length));
        for (var i = 4; i < 14; i++) {
            pwd += all.charAt(Math.floor(Math.random() * all.length));
        }
        return pwd.split('').sort(function () { return Math.random() - 0.5; }).join('');
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

    function validatePhone(phone) {
        var cleaned = phone.replace(/[\s\-\(\)]/g, '');
        return /^(\+7|8)\d{10}$/.test(cleaned);
    }

    function validateForm() {
        var isValid = true;

        var email = document.getElementById('email').value.trim();
        if (!email) { showError('email', 'Введите email'); isValid = false; }
        else if (!validateEmail(email)) { showError('email', 'Неверный формат email'); isValid = false; }
        else clearError('email');

        var password = passwordInput.value;
        if (!password) { showError('password', 'Введите пароль'); isValid = false; }
        else if (/[а-яА-ЯёЁ]/.test(password)) { showError('password', 'Только латинские буквы, цифры и символы'); isValid = false; }
        else if (password.length < 8) { showError('password', 'Минимум 8 символов'); isValid = false; }
        else if (!/[a-zA-Z]/.test(password)) { showError('password', 'Хотя бы одна латинская буква'); isValid = false; }
        else if (!/\d/.test(password)) { showError('password', 'Хотя бы одна цифра'); isValid = false; }
        else clearError('password');

        var password2 = passwordInput2.value;
        if (!password2) { showError('password2', 'Повторите пароль'); isValid = false; }
        else if (password2 !== password) { showError('password2', 'Пароли не совпадают'); isValid = false; }
        else clearError('password2');

        var firstName = document.getElementById('firstName').value.trim();
        if (!firstName || firstName.length < 2) { showError('firstName', 'Введите имя'); isValid = false; }
        else clearError('firstName');

        var middleName = document.getElementById('middleName').value.trim();
        if (!middleName || middleName.length < 2) { showError('middleName', 'Введите отчество'); isValid = false; }
        else clearError('middleName');

        var lastName = document.getElementById('lastName').value.trim();
        if (!lastName || lastName.length < 2) { showError('lastName', 'Введите фамилию'); isValid = false; }
        else clearError('lastName');

        var phone = document.getElementById('phone').value.trim();
        if (!phone) { showError('phone', 'Введите телефон'); isValid = false; }
        else if (!validatePhone(phone)) { showError('phone', 'Неверный формат телефона'); isValid = false; }
        else clearError('phone');

        var timezone = document.getElementById('timezone').value;
        if (!timezone) { showError('timezone', 'Выберите часовой пояс'); isValid = false; }
        else clearError('timezone');

        var agreeTerms = document.getElementById('agreeTerms').checked;
        var agreePolicy = document.getElementById('agreePolicy').checked;
        var agreeError = document.getElementById('agreeError');
        if (!agreeTerms || !agreePolicy) {
            if (agreeError) agreeError.textContent = 'Необходимо согласиться со всеми условиями';
            isValid = false;
        } else {
            if (agreeError) agreeError.textContent = '';
        }

        return isValid;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateForm()) return;

        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('formMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';
                messageEl.className = 'form-message';
        messageEl.innerHTML = '⏳ Создаем аккаунт и отправляем письмо... Пожалуйста, подождите.';
        messageEl.style.display = 'block';
        messageEl.className = 'form-message';
        messageEl.textContent = '';

        var email = document.getElementById('email').value.trim();
        var password = passwordInput.value;

        // Собираем данные формы, чтобы сохранить их и использовать после подтверждения
        var formData = {
            email: email,
            firstName: document.getElementById('firstName').value.trim(),
            middleName: document.getElementById('middleName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            timezone: document.getElementById('timezone').value
        };

        try {
            console.log('[register] signUp...');
            var signUpResult = await supa.auth.signUp({
                email: email,
                password: password,
                options: {
                    // Передаем данные в метаданные пользователя, чтобы они сохранились даже без сессии
                    data: formData
                }
            });

            if (signUpResult.error) {
                console.error('[register] signUp error:', signUpResult.error);

                var msg = signUpResult.error.message || 'Ошибка регистрации';
                if (msg.toLowerCase().indexOf('already') !== -1 ||
                    msg.toLowerCase().indexOf('exists') !== -1) {
                    msg = 'Пользователь с таким email уже зарегистрирован';
                }
                messageEl.className = 'form-message error';
                messageEl.textContent = msg;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Зарегистрироваться';
                return;
            }

            // Проверяем, требуется ли подтверждение (если сессии нет, значит, требуется)
            if (!signUpResult.data.session) {
                messageEl.className = 'form-message success';
                messageEl.innerHTML = 
                    '✓ Регистрация успешна!<br>' +
                    '<span style="font-size: 14px; opacity: 0.85; line-height: 1.5; display: inline-block; margin-top: 8px;">' +
                        'Мы отправили письмо для подтверждения на <strong>' + email + '</strong>.<br>' +
                        'Пожалуйста, проверьте вашу почту (и обязательно папку <strong>«Спам»</strong>).<br>' +
                        'Перейдите по ссылке из письма, чтобы активировать аккаунт.' +
                    '</span>';
                submitBtn.textContent = 'Ожидаем подтверждения';
                submitBtn.disabled = true;
                
                form.reset();
                return; 
            }

            // Если сессия есть (например, подтверждение отключено), то идем дальше
            var userId = signUpResult.data.user.id;
            console.log('[register] user создан (без подтверждения):', userId);

            // Если дошли сюда, значит, подтверждение не требуется, создаем профиль сразу
            var userCode = generateUserCode();
            console.log('[register] создаём профиль...');
            var profileResult = await supa.from('profiles').insert({
                id: userId,
                email: email,
                code: userCode,
                real_first_name: formData.firstName,
                real_middle_name: formData.middleName,
                real_last_name: formData.lastName,
                display_first_name: '',
                display_middle_name: '',
                phone: formData.phone,
                timezone: formData.timezone,
                avatar_url: '',
                psychologist_status: 'none',
                roles: ['client']
            });

            if (profileResult.error) {
                 console.error('[register] profile error:', profileResult.error);
                 messageEl.className = 'form-message error';
                 messageEl.textContent = 'Аккаунт создан, но профиль не сохранился. Обратитесь в поддержку.';
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'Зарегистрироваться';
                 return;
            }

            var userData = {
                id: userId,
                code: userCode,
                email: email,
                realFirstName: formData.firstName,
                realMiddleName: formData.middleName,
                realLastName: formData.lastName,
                displayFirstName: '',
                displayMiddleName: '',
                phone: formData.phone,
                timezone: formData.timezone,
                avatarUrl: '',
                roles: ['client'],
                activeRole: 'client',
                psychologistStatus: 'none',
                isVerified: false,
                registeredAt: Date.now(),
                passwordChangedAt: Date.now()
            };
            localStorage.setItem('psyhelp_user', JSON.stringify(userData));

            messageEl.className = 'form-message success';
            messageEl.innerHTML = '✓ Регистрация успешна!';
            submitBtn.textContent = 'Готово';

            setTimeout(function () {
                window.location.href = '/pages/client.html?section=catalog';
            }, 3000);

        } catch (err) {
            console.error('[register] exception:', err);
            messageEl.className = 'form-message error';
            messageEl.textContent = 'Ошибка: ' + (err.message || 'попробуйте ещё раз');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
        }
    });
});