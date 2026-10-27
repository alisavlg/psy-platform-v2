// ============================================
// КОМНАТА — Voximplant v5 (официальный API)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';
import { Core } from '@voximplant/websdk';
import { streamToken, StreamLoader, StreamHelper } from '@voximplant/websdk/modules/stream';
import { callToken, CallLoader } from '@voximplant/websdk/modules/call-manager';

console.log('[room] loaded (Voximplant v5 Modular)');

const VOXIMPLANT_ACCOUNT_ID = '11753063';
const VOXIMPLANT_APP_NAME = 'eupsy';
const VOXIMPLANT_NODE = 'node3';

const PASSWORDS = {
    client: '130972',
    psychologist: '130972'
};

let core = null;
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
    if (result.error || !result.data) return null;
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
// Инициализация Voximplant v5
// ============================================

async function initVoximplant() {
    core = Core.init({
        remoteVideoContainerId: 'remoteVideo',
        localVideoContainerId: 'localVideo',
        showLocalVideo: true
    });

    core.registerModules([StreamLoader(), CallLoader()]);

    const { client } = core;
    await client.connect({ node: VOXIMPLANT_NODE });

    const user = currentRole;
    const password = PASSWORDS[user];
    const username = `${user}@${VOXIMPLANT_APP_NAME}.${VOXIMPLANT_ACCOUNT_ID}.voximplant.com`;

    await client.login({ username, password });
    console.log(`[Voximplant] Вход как ${user}`);

    client.on('incomingCall', (call) => {
        currentCall = call;
        currentCall.answer();
        setupCallEvents();
    });
}

function setupCallEvents() {
    if (!currentCall) return;

    currentCall.on('connected', () => {
        hideLoading();
        setStatus('Подключено', true);
    });

    currentCall.on('disconnected', () => {
        leaveRoom(true);
    });

    currentCall.on('failed', (e) => {
        console.error('[Voximplant] Ошибка:', e);
        setStatus('Ошибка соединения', false);
        hideLoading();
    });
}

// ============================================
// Совершение звонка
// ============================================

async function startCall(peerUsername) {
    try {
        const callManager = core.getModule(callToken);
        const streamModule = core.getModule(streamToken);

        if (!callManager || !streamModule) {
            throw new Error('Модули Voximplant не инициализированы');
        }

        const tracker = streamModule.createHelper(StreamHelper.DeviceTracker);
        const call = callManager.createCall(peerUsername);

        tracker.enableTracker();
        tracker.attachCall(call);

        await call.start();
        currentCall = call;
        setupCallEvents();
    } catch (err) {
        console.error('[Voximplant] Ошибка вызова:', err);
        setStatus('Не удалось начать звонок', false);
        hideLoading();
    }
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
    try { if (currentCall) currentCall.hangup(); } catch (e) {}
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

    const peer = getPeerInfo(currentSession);
    document.getElementById('roomPeerName').textContent = peer.name;
    document.getElementById('roomPeerRole').textContent = peer.role;
    document.getElementById('roomMyName').textContent = 'Вы: ' + getMyDisplayName();
    document.title = 'Сессия с ' + peer.name + ' | Eupsy';

    setStatus('Подключение...', false);
    await initVoximplant();

    if (currentRole === 'psychologist') {
        setStatus('Звоним клиенту...', false);
        await startCall('client');
    } else {
        setStatus('Ожидание звонка от психолога...', false);
    }

    const leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            leaveRoom(false);
        });
    }
});