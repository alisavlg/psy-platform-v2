// ============================================
// КОМНАТА — Voximplant (v4, автоматический рендеринг видео)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';
import * as VoxImplant from 'voximplant-websdk';

console.log('[room] loaded (Voximplant v4)');

const VOXIMPLANT_ACCOUNT_ID = '11753063';
const VOXIMPLANT_APP_NAME = 'eupsy';
const VOXIMPLANT_NODE = 'node3';

const PASSWORDS = {
    client: '130972',
    psychologist: '130972'
};

let sdk = null;
let currentCall = null;
let currentSession = null;
let currentRole = 'client';

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

async function initVoximplant() {
    sdk = VoxImplant.getInstance();
    
    // Указываем ID контейнеров для видео — SDK отрисует всё сам
    await sdk.init({
        micRequired: true,
        videoSupport: true,
        remoteVideoContainerId: 'remoteVideo',
        localVideoContainerId: 'localVideo',
        showLocalVideo: true
    });
    
    await sdk.connect(false); // v4: connect принимает boolean, а не объект
    
    const user = currentRole;
    const password = PASSWORDS[user];
    const fullLogin = `${user}@${VOXIMPLANT_APP_NAME}.${VOXIMPLANT_ACCOUNT_ID}.voximplant.com`;
    
    await sdk.login(fullLogin, password);
    console.log(`[Voximplant] Вход как ${user}`);

    sdk.on(VoxImplant.Events.IncomingCall, (event) => {
        currentCall = event.call;
        currentCall.answer('', {}, { sendVideo: true, receiveVideo: true });
        setupCallEvents();
    });
}

function setupCallEvents() {
    if (!currentCall) return;

    // Никаких ручных renderer.render() — только события статуса
    currentCall.on(VoxImplant.CallEvents.Connected, () => {
        hideLoading();
        setStatus('Подключено', true);
    });

    currentCall.on(VoxImplant.CallEvents.Disconnected, () => {
        leaveRoom(true);
    });

    currentCall.on(VoxImplant.CallEvents.Failed, (e) => {
        console.error('[Voximplant] Ошибка звонка:', e);
        setStatus('Ошибка соединения', false);
        hideLoading();
    });
}

async function startCall(peerUsername) {
    const callSettings = {
        number: peerUsername,
        video: { sendVideo: true, receiveVideo: true }
    };

    try {
        currentCall = await sdk.call(callSettings);
        setupCallEvents();
    } catch (err) {
        console.error('[Voximplant] Ошибка при создании звонка:', err);
        setStatus('Не удалось начать звонок', false);
        hideLoading();
    }
}

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