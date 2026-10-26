// ============================================
// КОМНАТА — Voximplant (P2P видео)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';
import * as VoxImplant from 'voximplant-websdk';

console.log('[room] loaded (Voximplant)');

// ⚠️ ВАШИ ДАННЫЕ
const VOXIMPLANT_ACCOUNT_ID = '11753063';
const VOXIMPLANT_APP_NAME = 'eupsy';

// В реальном проекте пароли нельзя хранить в коде. Для теста — можно.
// Впишите сюда пароли, которые вы задали при создании пользователей.
const PASSWORDS = {
    client: '130972',
    psychologist: '130972'
};

let sdk = null;
let currentCall = null;
let currentSession = null;
let currentRole = 'client';

// ============================================
// Утилиты
// ============================================

function getMyUser() {
    try { return JSON.parse(localStorage.getItem('psyhelp_user')) || {}; } catch (e) { return {}; }
}

function getMyDisplayName() {
    var u = getMyUser();
    if (currentRole === 'client') {
        var f = (u.displayFirstName || u.realFirstName || '').trim();
        var m = (u.displayMiddleName || u.realMiddleName || '').trim();
        return (f + ' ' + m).trim() || 'Клиент';
    } else {
        var rf = (u.realFirstName || '').trim();
        var rm = (u.realMiddleName || '').trim();
        return (rf + ' ' + rm).trim() || 'Психолог';
    }
}

async function loadSession(sessionId) {
    var result = await supa.from('sessions').select('*').eq('id', sessionId).single();
    if (result.error || !result.data) {
        console.error('[room] сессия не найдена:', result.error);
        return null;
    }
    return result.data;
}

function getPeerInfo(session) {
    if (currentRole === 'client') {
        return { name: session.psychologist_name || 'Психолог', role: 'Психолог' };
    } else {
        return { name: session.client_name || 'Клиент', role: 'Клиент' };
    }
}

// ============================================
// Инициализация Voximplant
// ============================================

async function initVoximplant() {
    sdk = VoxImplant.getInstance();
    await sdk.init();
    await sdk.connect();
    
    // Логинимся под нужным пользователем
    const user = currentRole;
    const password = PASSWORDS[user];
    const fullLogin = `${user}@${VOXIMPLANT_APP_NAME}.${VOXIMPLANT_ACCOUNT_ID}.voximplant.com`;
    
    await sdk.login(fullLogin, password);
    console.log(`[Voximplant] Успешный вход как ${user}`);

    // Обработка входящих звонков (для клиента)
    sdk.on(VoxImplant.Events.IncomingCall, (event) => {
        console.log('[Voximplant] Входящий звонок от психолога');
        currentCall = event.call;
        
        // Автоматически отвечаем на звонок с видео
        currentCall.answer('', {}, { sendVideo: true, receiveVideo: true });
        setupCallEvents();
    });
}

function setupCallEvents() {
    if (!currentCall) return;

    currentCall.on(VoxImplant.CallEvents.Connected, () => {
        console.log('[Voximplant] Звонок соединен');
        hideLoading();
        setStatus('Подключено', true);
    });

    currentCall.on(VoxImplant.CallEvents.Disconnected, () => {
        console.log('[Voximplant] Звонок завершен');
        leaveRoom(true);
    });

    currentCall.on(VoxImplant.CallEvents.Failed, (e) => {
        console.error('[Voximplant] Ошибка звонка:', e);
        setStatus('Ошибка соединения', false);
    });
}

// ============================================
// Совершение звонка (только для психолога)
// ============================================

async function startCall(peerUsername) {
    console.log('[Voximplant] Звоним пользователю:', peerUsername);

    const remoteVideo = document.getElementById('remoteVideo');
    const localVideo = document.getElementById('localVideo');

    const callSettings = {
        number: peerUsername, // Кому звоним
        video: {
            sendVideo: true,
            receiveVideo: true,
            remoteVideoElement: remoteVideo,
            localVideoElement: localVideo
        }
    };

    currentCall = await sdk.call(callSettings);
    setupCallEvents();
}

// ============================================
// Вспомогательные функции
// ============================================

function hideLoading() {
    var el = document.getElementById('roomLoading');
    if (el) el.style.display = 'none';
}

function setStatus(text, connected) {
    var dot = document.getElementById('roomStatusDot');
    var status = document.getElementById('roomStatus');
    if (status) status.textContent = text;
    if (dot) {
        if (connected) dot.classList.add('connected');
        else dot.classList.remove('connected');
    }
}

function leaveRoom(silent) {
    if (!silent && !confirm('Завершить сессию?')) return;

    try {
        if (currentCall) currentCall.hangup();
    } catch (e) {}

    if (currentRole === 'psychologist') {
        window.location.href = '/pages/dashboard.html?section=sessions';
    } else {
        window.location.href = '/pages/client.html?section=sessions';
    }
}

// ============================================
// Инициализация страницы
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const role = params.get('role');

    if (!sessionId || (role !== 'client' && role !== 'psychologist')) {
        setStatus('Не указана сессия', false);
        hideLoading();
        return;
    }

    currentRole = role;

    // Загружаем сессию
    currentSession = await loadSession(sessionId);
    if (!currentSession) {
        setStatus('Сессия не найдена', false);
        hideLoading();
        return;
    }

    if (currentSession.status === 'cancelled') {
        setStatus('Сессия отменена', false);
        hideLoading();
        return;
    }

    // Заполняем шапку
    const peer = getPeerInfo(currentSession);
    const peerNameEl = document.getElementById('roomPeerName');
    const peerRoleEl = document.getElementById('roomPeerRole');
    const myNameEl = document.getElementById('roomMyName');

    if (peerNameEl) peerNameEl.textContent = peer.name;
    if (peerRoleEl) peerRoleEl.textContent = peer.role;
    if (myNameEl) myNameEl.textContent = 'Вы: ' + getMyDisplayName();

    document.title = 'Сессия с ' + peer.name + ' | Eupsy';

    setStatus('Подключение...', false);

    // Инициализируем Voximplant
    await initVoximplant();

    // Логика: Психолог звонит клиенту
    if (currentRole === 'psychologist') {
        setStatus('Звоним клиенту...', false);
        await startCall('client');
    } else {
        // Клиент просто ждет входящего звонка
        console.log('[Voximplant] Ожидание звонка от психолога...');
        setStatus('Ожидание подключения психолога...', false);
    }

    // Кнопка «Завершить»
    const leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            leaveRoom(false);
        });
    }
});