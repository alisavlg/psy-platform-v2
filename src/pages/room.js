// ============================================
// КОМНАТА — WebRTC (Финальная версия с очередью ICE)
// ============================================

import '@/styles/theme.css';
import '@/styles/room.css';
import { supa } from '@/lib/supabase.js';

console.log('[room] loaded (WebRTC Final)');

let currentSession = null;
let currentRole = 'client';
let peerConnection = null;
let localStream = null;
let realtimeChannel = null;

// Очередь для ICE-кандидатов, пришедших до установки remote description
let pendingCandidates = [];
let isRemoteDescriptionSet = false;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ... (функции getMyUser, getMyDisplayName, loadSession, getPeerInfo, hideLoading, setStatus остаются без изменений) ...

// ============================================
// WebRTC
// ============================================

async function initWebRTC() {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideo) {
            localVideo.srcObject = localStream;
            // Оборачиваем play() в try-catch, чтобы избежать необработанных ошибок
            localVideo.play().catch(e => console.warn('[WebRTC] Ошибка play localVideo:', e));
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
        if (remoteVideo && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            // Оборачиваем play() в try-catch
            remoteVideo.play().catch(e => console.warn('[WebRTC] Ошибка play remoteVideo:', e));
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
// Отправка, получение и проверка сигналов
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

async function processSignal(signal) {
    const myUserId = getMyUser().id;
    if (signal.sender_id === myUserId) return;

    console.log('[WebRTC] Обработка сигнала:', signal.type);

    try {
        if (signal.type === 'offer' && currentRole === 'client') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            isRemoteDescriptionSet = true; // Отмечаем, что описание установлено
            await drainPendingCandidates(); // Применяем накопившиеся кандидаты

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await sendSignal('answer', answer);
            setStatus('Отправка ответа...', false);
        } 
        else if (signal.type === 'answer' && currentRole === 'psychologist') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
            isRemoteDescriptionSet = true; // Отмечаем, что описание установлено
            await drainPendingCandidates(); // Применяем накопившиеся кандидаты
            setStatus('Установка соединения...', false);
        } 
        else if (signal.type === 'ice-candidate') {
            if (isRemoteDescriptionSet) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload));
            } else {
                // Если описание еще не установлено, сохраняем кандидата в очередь
                console.log('[WebRTC] Кандидат добавлен в очередь (ожидание remote description)');
                pendingCandidates.push(signal.payload);
            }
        }
    } catch (err) {
        console.error('[WebRTC] Ошибка обработки сигнала:', err);
    }
}

// Функция для применения накопившихся ICE-кандидатов
async function drainPendingCandidates() {
    if (pendingCandidates.length > 0) {
        console.log(`[WebRTC] Применяем ${pendingCandidates.length} отложенных ICE-кандидатов`);
        for (const candidate of pendingCandidates) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('[WebRTC] Ошибка применения отложенного кандидата:', e);
            }
        }
        pendingCandidates = []; // Очищаем очередь
    }
}

// ... (функции checkExistingSignals, listenForSignals, обработчик DOMContentLoaded остаются без изменений) ...