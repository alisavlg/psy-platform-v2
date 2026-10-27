// ============================================
// КОМНАТА — WebRTC (Шаг 2: Инициализация и Оффер)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';

console.log('[room] loaded (WebRTC Step 2)');

let currentSession = null;
let currentRole = 'client';
let peerConnection = null;
let localStream = null;
let currentChannel = null;

// Конфигурация ICE-серверов (STUN) для обхода NAT
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

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

// ============================================
// Инициализация WebRTC
// ============================================

async function initWebRTC() {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    try {
        // 1. Запрашиваем камеру и микрофон
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) {
            localVideo.srcObject = localStream;
            localVideo.play();
        }
    } catch (err) {
        console.error('[WebRTC] Ошибка доступа к камере:', err);
        setStatus('Нет доступа к камере', false);
        return;
    }

    // 2. Создаем PeerConnection
    peerConnection = new RTCPeerConnection(rtcConfig);

    // 3. Добавляем локальные треки в соединение
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // 4. Обработка входящего удаленного видеопотока
    peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Получен удаленный поток');
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.play();
        }
    };

    // 5. Отправка ICE-кандидатов в Supabase
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal('ice-candidate', event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTC] Состояние соединения:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            hideLoading();
            setStatus('Подключено', true);
        }
    };

    // 6. Если мы Психолог — создаем оффер и отправляем
    if (currentRole === 'psychologist') {
        setStatus('Создание предложения...', false);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        await sendSignal('offer', offer);
        setStatus('Ожидание ответа клиента...', false);
    } else {
        setStatus('Ожидание звонка от психолога...', false);
    }
}

// ============================================
// Отправка сигналов в Supabase
// ============================================

async function sendSignal(type, payload) {
    const myUserId = getMyUser().id;
    const peerUserId = currentRole === 'client' 
        ? currentSession.psychologist_id 
        : currentSession.client_id;

    const { error } = await supa.from('webrtc_signals').insert({
        session_id: currentSession.id,
        sender_id: myUserId,
        receiver_id: peerUserId,
        type: type,
        payload: payload
    });

    if (error) console.error('[WebRTC] Ошибка отправки сигнала:', error);
    else console.log('[WebRTC] Отправлен сигнал:', type);
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

    const peer = getPeerInfo(currentSession);
    document.getElementById('roomPeerName').textContent = peer.name;
    document.getElementById('roomPeerRole').textContent = peer.role;
    document.getElementById('roomMyName').textContent = 'Вы: ' + getMyDisplayName();
    document.title = 'Сессия с ' + peer.name + ' | Eupsy';

    setStatus('Подключение...', false);

    // Запускаем WebRTC
    await initWebRTC();

    const leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Завершить сессию?')) {
                if (localStream) localStream.getTracks().forEach(t => t.stop());
                if (peerConnection) peerConnection.close();
                window.location.href = currentRole === 'psychologist' 
                    ? '/pages/dashboard.html?section=sessions' 
                    : '/pages/client.html?section=sessions';
            }
        });
    }
});