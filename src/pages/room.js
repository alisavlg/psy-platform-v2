// ============================================
// КОМНАТА — WebRTC + Polling (самый надежный способ)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';

console.log('[room] loaded (WebRTC + Polling)');

let currentSession = null;
let currentRole = 'client';
let peerConnection = null;
let localStream = null;
let pollTimer = null;
let pendingCandidates = [];
let isRemoteDescriptionSet = false;
let isCallInitialized = false;
let processedSignalIds = new Set(); // Чтобы не обрабатывать одни и те же сигналы дважды

// Конфигурация TURN (ваш сервер)
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { 
            urls: 'turn:185.170.10.206:3478', 
            username: 'eupsy', 
            credential: 'EupsyVideo2026!' 
        }
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
// Отправка и получение сигналов
// ============================================

async function sendSignal(type, payload) {
    const myUserId = getMyUser().id;
    // Для клиента получатель — психолог, для психолога — клиент
    const peerUserId = currentRole === 'client' 
        ? currentSession.psychologist_user_id 
        : currentSession.client_id;

    console.log('[WebRTC] Отправка сигнала:', type, 'от', myUserId, 'кому', peerUserId);

    await supa.from('webrtc_signals').insert({
        session_id: currentSession.id,
        sender_id: myUserId,
        receiver_id: peerUserId,
        type: type,
        payload: payload
    });
}

async function processSignal(signal) {
    const myUserId = getMyUser().id;
    if (signal.sender_id === myUserId) return;
    if (processedSignalIds.has(signal.id)) return; // Уже обработали

    processedSignalIds.add(signal.id);
    await supa.from('webrtc_signals').delete().eq('id', signal.id);
    console.log('[WebRTC] Обработка сигнала:', signal.type);

    try {
        if (signal.type === 'offer' && currentRole === 'client') {
            if (isCallInitialized) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            isRemoteDescriptionSet = true;
            isCallInitialized = true;
            await drainPendingCandidates();

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await sendSignal('answer', answer);
            setStatus('Отправка ответа...', false);
        } 
        else if (signal.type === 'answer' && currentRole === 'psychologist') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            isRemoteDescriptionSet = true;
            await drainPendingCandidates();
            setStatus('Установка соединения...', false);
        } 
        else if (signal.type === 'ice-candidate') {
            if (isRemoteDescriptionSet) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload));
            } else {
                pendingCandidates.push(signal.payload);
            }
        }
        
        // Удаляем обработанный сигнал, чтобы не копился мусор
        await supa.from('webrtc_signals').delete().eq('id', signal.id);

    } catch (err) {
        console.error('[WebRTC] Ошибка обработки сигнала:', err);
    }
}

async function drainPendingCandidates() {
    if (pendingCandidates.length > 0) {
        for (const candidate of pendingCandidates) {
            try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
        }
        pendingCandidates = [];
    }
}

// ============================================
// Polling: проверяем новые сигналы каждые 2 секунды
// ============================================

async function pollSignals() {
    const myUserId = getMyUser().id;
    const { data, error } = await supa
        .from('webrtc_signals')
        .select('*')
        .eq('session_id', currentSession.id)
        .eq('receiver_id', myUserId)
        .order('created_at', { ascending: true });

    if (error) return;
    if (data && data.length > 0) {
        for (const signal of data) {
            await processSignal(signal);
        }
    }
}

// ============================================
// WebRTC
// ============================================

async function initWebRTC() {
    // Очищаем старые сигналы
    await supa.from('webrtc_signals').delete().eq('session_id', currentSession.id);

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) {
            localVideo.srcObject = localStream;
            localVideo.play().catch(e => console.warn(e));
        }
    } catch (err) {
        console.error('[WebRTC] Ошибка камеры:', err);
        setStatus('Нет доступа к камере', false);
        return;
    }

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        if (remoteVideo && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.play().catch(e => console.warn(e));
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) sendSignal('ice-candidate', event.candidate);
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTC] Состояние:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            hideLoading();
            setStatus('Подключено', true);
        }
    };

    if (currentRole === 'psychologist') {
        setStatus('Создание предложения...', false);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendSignal('offer', offer);
        setStatus('Ожидание ответа...', false);
    } else {
        setStatus('Ожидание звонка...', false);
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

    const peer = getPeerInfo(currentSession);
    document.getElementById('roomPeerName').textContent = peer.name;
    document.getElementById('roomPeerRole').textContent = peer.role;
    document.getElementById('roomMyName').textContent = 'Вы: ' + getMyDisplayName();
    document.title = 'Сессия с ' + peer.name + ' | Eupsy';

    setStatus('Подключение...', false);

    await initWebRTC();

    // Запускаем polling каждые 2 секунды
    pollSignals();
    pollTimer = setInterval(pollSignals, 2000);

    const leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Завершить сессию?')) {
                if (localStream) localStream.getTracks().forEach(t => t.stop());
                if (peerConnection) peerConnection.close();
                if (pollTimer) clearInterval(pollTimer);
                window.location.href = currentRole === 'psychologist' 
                    ? '/pages/dashboard.html?section=sessions' 
                    : '/pages/client.html?section=sessions';
            }
        });
    }
});