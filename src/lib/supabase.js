// ============================================
// Supabase — единый клиент для всего проекта
// ============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://ubbzkxxmgfvvyvfjfcmo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_miE5iopycXLfLa_XPektzQ_c-GanKnt';

export const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('[supabase] клиент создан');