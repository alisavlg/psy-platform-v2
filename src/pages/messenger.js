// ============================================
// СООБЩЕНИЯ — единый модуль (финал)
// ============================================

import { supa } from '@/lib/supabase.js';

console.log('[messenger] loaded');

var m_myUser = null;
var m_cachedChats = [];
var m_unreadCounts = {};
var m_currentChatId = null;
var m_currentMessages = [];
var m_pollTimer = null;

const SUPPORT_ID = '00000000-0000-0000-0000-000000000000';
const SUPPORT_PSY_ID = '6e90ecbe-8d79-4a59-88ce-b7ee2c4fe8a4';

function m_escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function m_getInitials(name) {
    if (!name) return '?';
    if (typeof name !== 'string') name = String(name);
    return name.split(' ').filter(function (w) { return w.length > 0; }).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
}

function m_formatChatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()];
    return d.getDate() + ' ' + ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()];
}

async function m_loadMyUser() {
    var raw = localStorage.getItem('psyhelp_user');
    if (!raw) return null;
    try {
        var u = JSON.parse(raw);
        if (!u.id) return null;
        
        var res = await supa.from('profiles').select('support_display_name, support_avatar_url, display_first_name, display_middle_name').eq('id', u.id).single();
        var profile = res.data || {};

        return { 
            id: u.id, 
            role: window.CURRENT_USER || 'client', 
            userData: u,
            supportName: profile.support_display_name || 'Ваша служба поддержки',
            supportAvatar: profile.support_avatar_url || ''
        };
    } catch (e) { return null; }
}

async function m_ensureSupportChat() {
    if (!m_myUser) return;
    if (m_myUser.role === 'support' || m_myUser.role === 'owner' || m_myUser.role === 'admin') return;

    var partnerId = null;
    if (m_myUser.role === 'psychologist') {
        partnerId = SUPPORT_PSY_ID; // Поддержка психологов
    } else {
        partnerId = SUPPORT_ID; // Поддержка клиентов
    }

    var existRes = await supa.from('chats').select('*').eq('client_id', m_myUser.id).eq('partner_id', partnerId).limit(1);
    if (existRes.data && existRes.data.length > 0) return existRes.data[0];

    var me = m_myUser.userData;
    var c1 = (me.displayFirstName || me.realFirstName || '').trim();
    var c2 = (me.displayMiddleName || me.realMiddleName || '').trim();
    var displayName = (c1 + ' ' + c2).trim() || (m_myUser.role === 'psychologist' ? 'Психолог' : 'Клиент');

    var supportName = (m_myUser.role === 'psychologist') ? 'Поддержка психологов' : 'Поддержка клиентов';

    var insertRes = await supa.from('chats').insert({
        client_id: m_myUser.id,
        partner_id: partnerId,
        client_display_name: displayName,
        psychologist_display_name: supportName,
        last_message_at: new Date().toISOString()
    }).select().single();

    if (insertRes.error) {
        console.error('[messenger] ошибка создания чата с поддержкой:', insertRes.error);
        return null;
    }
    return insertRes.data;
}

async function m_loadChats(viewMode) {
    if (!m_myUser) return [];

    var isSupportClient = (viewMode === 'support');
    var isSupportPsy = (viewMode === 'support_psy');

    if (isSupportClient) {
        var res = await supa.from('chats').select('*').eq('partner_id', SUPPORT_ID).order('last_message_at', { ascending: false });
        return res.data || [];
    }

    if (isSupportPsy) {
        var res = await supa.from('chats').select('*').eq('partner_id', SUPPORT_PSY_ID).order('last_message_at', { ascending: false });
        return res.data || [];
    }

    await m_ensureSupportChat();

    var query = supa.from('chats').select('*');
    query = query.or('client_id.eq.' + m_myUser.id + ',partner_id.eq.' + m_myUser.id);
    var result = await query.order('last_message_at', { ascending: false });
    if (result.error) return [];

    var chats = result.data || [];
    chats.sort(function(a, b) {
        var aSupp = (a.partner_id === SUPPORT_ID || a.partner_id === SUPPORT_PSY_ID);
        var bSupp = (b.partner_id === SUPPORT_ID || b.partner_id === SUPPORT_PSY_ID);
        if (aSupp && !bSupp) return -1;
        if (!aSupp && bSupp) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
    return chats;
}

async function m_loadUnreadCounts() {
    m_unreadCounts = {};
    if (!m_myUser) return;
    var result = await supa.from('messages').select('chat_id, author_id').eq('is_read', false).neq('author_id', m_myUser.id);
    if (result.error || !result.data) return;
    result.data.forEach(function (m) { m_unreadCounts[m.chat_id] = (m_unreadCounts[m.chat_id] || 0) + 1; });
}

async function m_loadMessages(chatId) {
    if (!chatId) return [];
    var result = await supa.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }).limit(200);
    if (result.error) return [];
    return result.data || [];
}

async function m_markChatRead(chatId) {
    if (!chatId || !m_myUser) return;
    await supa.from('messages').update({ is_read: true }).eq('chat_id', chatId).eq('is_read', false).neq('author_id', m_myUser.id);
    m_unreadCounts[chatId] = 0;
}

function m_avatarHtml(avatarUrl, initials, extraClass) {
    var cls = extraClass || 'chat-avatar';
    if (avatarUrl) return '<div class="' + cls + '" style="background-image:url(' + avatarUrl + ');background-size:cover;background-position:center;"></div>';
    return '<div class="' + cls + '">' + initials + '</div>';
}

function m_renderChatsList() {
    var listEl = document.getElementById('chatsList') || document.getElementById('chatsListSupport') || document.getElementById('chatsListAdmin');
    if (!listEl) return;
    if (!m_cachedChats.length) {
        listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:14px;">Пока нет диалогов.</div>';
        return;
    }
    listEl.innerHTML = '';
    
    var isSupportView = (m_myUser.role === 'support' || m_myUser.role === 'compliance');

    m_cachedChats.forEach(function (chat) {
        var isSupport = (chat.partner_id === SUPPORT_ID);
        var name = '';
        
        if (isSupportView) {
            name = chat.client_display_name || 'Клиент';
        } else if (isSupport) {
            name = 'Поддержка Eupsy';
        } else if (chat.client_id === m_myUser.id) {
            name = chat.psychologist_display_name || 'Психолог';
        } else {
            name = chat.client_display_name || 'Клиент';
        }

        var initials = isSupport ? '🛟' : m_getInitials(name);
        var preview = chat.last_message_text || 'Нет сообщений';
        var timeStr = m_formatChatTime(chat.last_message_at);
        var unread = m_unreadCounts[chat.id] || 0;
        var avatarUrl = isSupport ? '' : (isSupportView || chat.client_id === m_myUser.id ? (chat.psychologist_avatar || '') : (chat.client_avatar || ''));

        var item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === m_currentChatId ? ' active' : '');
        if (isSupport && !isSupportView) item.style.borderLeft = '3px solid #4a90e2';
        
        item.innerHTML =
            m_avatarHtml(avatarUrl, initials, 'chat-avatar') +
            '<div class="chat-item-info"><div class="chat-item-name">' + m_escapeHtml(name) + '</div>' +
            '<div class="chat-item-preview">' + m_escapeHtml(preview) + '</div></div>' +
            '<div class="chat-item-time">' + timeStr + (unread > 0 ? '<span class="chat-item-unread">' + unread + '</span>' : '') + '</div>';

        item.addEventListener('click', function () { m_openChat(chat.id); });
        listEl.appendChild(item);
    });
}

function m_renderChatWindow() {
    var windowEl = document.getElementById('chatWindow') || document.getElementById('chatWindowSupport') || document.getElementById('chatWindowAdmin');
    if (!windowEl) return;
    if (!m_currentChatId) {
        windowEl.innerHTML = '<div class="chat-empty"><div class="chat-empty-icon">💬</div><p>Выберите чат слева, чтобы начать общение</p></div>';
        return;
    }
    var chat = m_cachedChats.find(function (c) { return c.id === m_currentChatId; });
    if (!chat) { m_currentChatId = null; return m_renderChatWindow(); }

    var isSupportView = (m_myUser.role === 'support' || m_myUser.role === 'compliance');
    var isSupport = (chat.partner_id === SUPPORT_ID);
    var name = '';

    if (isSupportView) {
        name = chat.client_display_name || 'Клиент';
    } else if (isSupport) {
        name = 'Поддержка Eupsy';
    } else if (chat.client_id === m_myUser.id) {
        name = chat.psychologist_display_name || 'Психолог';
    } else {
        name = chat.client_display_name || 'Клиент';
    }

    var roleLabel = isSupport ? 'Служба заботы' : (isSupportView ? 'Клиент' : (chat.client_id === m_myUser.id ? 'Психолог' : 'Клиент'));
    var initials = isSupport ? '🛟' : m_getInitials(name);
    var isEmpty = m_currentMessages.length === 0;
    var messagesHtml = '';

    if (isEmpty) {
        messagesHtml = '<div class="chat-start-hint"><div class="chat-start-title">Это начало вашего диалога.</div><div class="chat-start-text">Напишите первое сообщение.</div></div>';
    } else {
        m_currentMessages.forEach(function (m) {
            var isMine = (m.author_id === m_myUser.id);
            var cls = isMine ? 'me' : 'them';
            messagesHtml += '<div class="message ' + cls + '">' + m_escapeHtml(m.text) + '<span class="message-time">' + m_formatChatTime(m.created_at) + '</span></div>';
        });
    }
    
    var placeholder = 'Напишите сообщение...';

    windowEl.innerHTML =
        '<div class="chat-window-header">' + m_avatarHtml('', initials, 'chat-window-avatar') +
            '<div><div class="chat-window-name">' + m_escapeHtml(name) + '</div><div class="chat-window-role">' + roleLabel + '</div></div></div>' +
        '<div class="chat-messages" id="chatMessages">' + messagesHtml + '</div>' +
        '<div class="chat-input-area"><input type="text" class="chat-input" id="chatInput" placeholder="' + m_escapeHtml(placeholder) + '" autocomplete="off"><button class="btn-send" id="btnSend">Отправить</button></div>';

    var messagesEl = document.getElementById('chatMessages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    var input = document.getElementById('chatInput');
    var sendBtn = document.getElementById('btnSend');
    if (sendBtn) sendBtn.addEventListener('click', m_sendMessage);
    if (input) {
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); m_sendMessage(); } });
        if (isEmpty) input.focus();
    }
}

async function m_openChat(chatId) {
    m_currentChatId = chatId;
    m_currentMessages = await m_loadMessages(chatId);
    await m_markChatRead(chatId);
    m_renderChatsList();
    m_renderChatWindow();
    m_updateSidebarBadge();
    if (m_pollTimer) clearInterval(m_pollTimer);
    m_pollTimer = setInterval(m_pollCurrentChat, 5000);
}

async function m_pollCurrentChat() {
    if (!m_currentChatId) return;
    var fresh = await m_loadMessages(m_currentChatId);
    if (fresh.length !== m_currentMessages.length) {
        m_currentMessages = fresh;
        await m_markChatRead(m_currentChatId);
        m_renderChatWindow();
        m_renderChatsList();
        m_updateSidebarBadge();
    }
}

async function m_sendMessage() {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text || !m_currentChatId || !m_myUser) return;

    input.value = '';
    input.disabled = true;

    var chat = m_cachedChats.find(function(c) { return c.id === m_currentChatId; });
    var isSupportChat = chat && (chat.partner_id === SUPPORT_ID);
    var isSupportView = (m_myUser.role === 'support' || m_myUser.role === 'compliance');

    var authorId = m_myUser.id;
    if (isSupportView && isSupportChat) {
        authorId = SUPPORT_ID;
    }

    try {
        await supa.from('messages').insert({ 
            chat_id: m_currentChatId, 
            author_id: authorId, 
            author_role: m_myUser.role, 
            text: text 
        });

        await supa.from('chats').update({ last_message_text: text, last_message_at: new Date().toISOString() }).eq('id', m_currentChatId);
        
        m_currentMessages = await m_loadMessages(m_currentChatId);
        m_renderChatWindow();
        m_cachedChats = await m_loadChats();
        m_renderChatsList();
    } catch (err) { 
        console.error('[messenger] ошибка:', err); 
    } finally { 
        input.disabled = false; 
        input.focus(); 
    }
}

async function m_updateSidebarBadge() {
    var navMsg = document.querySelector('.nav-item[data-section="messages"]');
    if (!navMsg) return;
    var iconEl = navMsg.querySelector('.nav-icon');
    if (!iconEl) return;
    var wrapEl = iconEl.parentNode;
    if (!wrapEl.classList.contains('nav-icon-wrap')) {
        var wrapper = document.createElement('div');
        wrapper.className = 'nav-icon-wrap';
        wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;flex-shrink:0;';
        iconEl.parentNode.insertBefore(wrapper, iconEl);
        wrapper.appendChild(iconEl);
        wrapEl = wrapper;
    }
    var badge = wrapEl.querySelector('.nav-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        wrapEl.appendChild(badge);
    }
    if (!m_myUser) m_myUser = await m_loadMyUser();
    if (!m_myUser) return;
    await m_loadUnreadCounts();
    var total = 0;
    Object.keys(m_unreadCounts).forEach(function (k) { total += m_unreadCounts[k]; });
    if (total > 0) {
        badge.textContent = total > 9 ? '9+' : total;
        badge.style.cssText = 'position:absolute;top:-6px;right:-8px;background:#e74c3c;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;line-height:16px;border-radius:8px;text-align:center;padding:0 4px;box-sizing:border-box;pointer-events:none;font-family:inherit;';
    } else {
        badge.textContent = '';
        badge.style.cssText = 'display:none;';
    }
}

export async function renderMessenger(viewMode) {
    var isSupportClient = (viewMode === 'support');
    var isSupportPsy = (viewMode === 'support_psy');
    
    var layoutId, listId, windowId;

    if (isSupportClient) {
        layoutId = 'messengerLayoutSupport';
        listId = 'chatsListSupport';
        windowId = 'chatWindowSupport';
    } else if (isSupportPsy) {
        layoutId = 'messengerLayoutSupportPsy';
        listId = 'chatsListSupportPsy';
        windowId = 'chatWindowSupportPsy';
    } else {
        layoutId = 'messengerLayout';
        listId = 'chatsList';
        windowId = 'chatWindow';
    }

    var layoutEl = document.getElementById(layoutId);
    if (!layoutEl) return;

    window._messengerListId = listId;
    window._messengerWindowId = windowId;

    if (!m_myUser) m_myUser = await m_loadMyUser();
    if (!m_myUser) return;

    m_cachedChats = await m_loadChats(viewMode);
    await m_loadUnreadCounts();

    var params = new URLSearchParams(window.location.search);
    var psyId = params.get('psyId');
    var chatId = params.get('chat');

    if (psyId && !m_currentChatId) {
        var exist = m_cachedChats.find(function(c) { return c.partner_id === psyId || c.id === psyId; });
        if (exist) { m_currentChatId = exist.id; }
        var url = new URL(window.location.href);
        url.searchParams.delete('psyId');
        window.history.replaceState({}, '', url);
    } else if (chatId && !m_currentChatId) {
        m_currentChatId = chatId;
    }

    if (m_currentChatId) {
        m_currentMessages = await m_loadMessages(m_currentChatId);
        await m_markChatRead(m_currentChatId);
    }

    m_renderChatsList();
    m_renderChatWindow();
    if (m_pollTimer) clearInterval(m_pollTimer);
    m_pollTimer = setInterval(m_pollCurrentChat, 5000);
}

export async function initMessenger() {
    if (!m_myUser) m_myUser = await m_loadMyUser();
    await m_updateSidebarBadge();
    setInterval(m_updateSidebarBadge, 30000);
    window.addEventListener('focus', m_updateSidebarBadge);
}