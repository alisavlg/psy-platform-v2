// ============================================
// SUPABASE CLIENT
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubbzkxxmgfvvyvfjfcmo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_miE5iopycXLfLa_XPektzQ_c-GanKnt';

export const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

// Для совместимости со старыми v1-скриптами — пока их не перевели в v2
if (typeof window !== 'undefined') {
    window.supa = supa;
}

console.log('[supabase.js] клиент создан');