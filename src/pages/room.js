// ============================================
// КОМНАТА — WebRTC (Шаг 3: Полная связь)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';

console.log('[room] loaded (WebRTC Step 3)');

let currentSession = null;
let currentRole = 'client';
let peerConnection = null;
let localStream = null;
let realtimeChannel = null;

// Конфигурация ICE-серверов (STUN)
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

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Получен удаленный поток');
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.play();
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal('ice-candidate', event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTC] Состояние:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            hideLoading();
            setStatus('Подключено', true);
        }
    };

    // Если мы Психолог — создаем оффер и отправляем
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
// Отправка и получение сигналов
// ============================================

async function sendSignal(type, payload) {
    const myUserId = getMyUser().id;
    const peerUserId = currentRole === 'client' 
        ? currentSession.psychologist_id 
        : currentSession.client_id;

    await supa.from('webrtc_signals').insert({
        session_id: currentSession.id,
        sender_id: myUserId,
        receiver_id: peerUserId,
        type: type,
        payload: payload
    });
}

// Слушаем сигналы от партнера
function listenForSignals() {
    const myUserId = getMyUser().id;

    realtimeChannel = supa.channel('room-' + currentSession.id)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'webrtc_signals',
            filter: `session_id=eq.${currentSession.id}`
        }, async (payload) => {
            const signal = payload.new;
            
            // Игнорируем свои же сообщения
            if (signal.sender_id === myUserId) return;

            console.log('[WebRTC] Получен сигнал:', signal.type);

            try {
                if (signal.type === 'offer' && currentRole === 'client') {
                    // Клиент получил оффер
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    await sendSignal('answer', answer);
                    setStatus('Отправка ответа...', false);
                } 
                else if (signal.type === 'answer' && currentRole === 'psychologist') {
                    // Психолог получил ответ
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
                    setStatus('Установка соединения...', false);
                } 
                else if (signal.type === 'ice-candidate') {
                    // Оба получают ICE-кандидатов
                    await peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload));
                }
            } catch (err) {
                console.error('[WebRTC] Ошибка обработки сигнала:', err);
            }
        })
        .subscribe((status) => {
            console.log('[WebRTC] Realtime статус:', status);
        });
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
    listenForSignals(); // Начинаем слушать сигналы после инициализации

    const leaveBtn = document.getElementById('leaveBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Завершить сессию?')) {
                if (localStream) localStream.getTracks().forEach(t => t.stop());
                if (peerConnection) peerConnection.close();
                if (realtimeChannel) realtimeChannel.unsubscribe();
                window.location.href = currentRole === 'psychologist' 
                    ? '/pages/dashboard.html?section=sessions' 
                    : '/pages/client.html?section=sessions';
            }
        });
    }
});