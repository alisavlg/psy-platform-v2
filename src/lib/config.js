// ============================================
// Конфиг: бренд + меню по ролям
// ============================================

export const BRAND = {
    name: 'Eupsy',
    domain: 'eupsy.ru',
    supportEmail: 'support@eupsy.ru'
};

// Иконки (SVG-строки)
const ICONS = {
    search: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    calendar: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    chat: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    planner: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
    user: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    userCheck: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>',
    chart: '<svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>'
};

export const MENU = {
    client: [
        { section: 'catalog',  href: '/pages/client.html?section=catalog',  label: 'Найти психолога', icon: ICONS.search },
        { section: 'sessions', href: '/pages/client.html?section=sessions', label: 'Мои сессии',      icon: ICONS.calendar },
        { section: 'messages', href: '/pages/client.html?section=messages', label: 'Сообщения',       icon: ICONS.chat, badge: true },
        { section: 'planner',  href: '/pages/client.html?section=planner',  label: 'Планировщик',     icon: ICONS.planner },
        { section: 'profile',  href: '/pages/client.html?section=profile',  label: 'Профиль',         icon: ICONS.user }
    ],
    psychologist: [
        { section: 'calendar', href: '/pages/dashboard.html?section=calendar', label: 'Календарь',        icon: ICONS.calendar },
        { section: 'sessions', href: '/pages/dashboard.html?section=sessions', label: 'Сессии',           icon: ICONS.userCheck },
        { section: 'messages', href: '/pages/dashboard.html?section=messages', label: 'Сообщения',        icon: ICONS.chat, badge: true },
        { section: 'profile',  href: '/pages/dashboard.html?section=profile',  label: 'Личная страница',  icon: ICONS.user },
        { section: 'reports',  href: '/pages/dashboard.html?section=reports',  label: 'Отчёты',           icon: ICONS.chart }
    ],
    admin: [
        { section: 'applications', href: '/pages/admin.html', label: 'Заявки', icon: ICONS.userCheck, badge: true }
    ]
};