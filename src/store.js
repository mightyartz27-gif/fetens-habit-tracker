import { createClient } from '@supabase/supabase-js'

// Supabase is OPTIONAL. The app works fully offline using localStorage.
// When these env vars are set (see .env), sync turns on automatically.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (url && key) ? createClient(url, key) : null
export const syncEnabled = !!supabase

const KEY = 'callen_habits_v1'
const LOG_KEY = 'callen_log_v1'   // completion log: { habitId: { 'YYYY-MM-DD': 'done' | 'skip' | count } }
const META_KEY = 'callen_meta_v1'

export function loadLocal() {
  try {
    return {
      habits: JSON.parse(localStorage.getItem(KEY) || '[]'),
      log: JSON.parse(localStorage.getItem(LOG_KEY) || '{}'),
      meta: JSON.parse(localStorage.getItem(META_KEY) || '{}'),
    }
  } catch {
    return { habits: [], log: {}, meta: {} }
  }
}

export function saveLocal({ habits, log, meta }) {
  if (habits) localStorage.setItem(KEY, JSON.stringify(habits))
  if (log) localStorage.setItem(LOG_KEY, JSON.stringify(log))
  if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta))
}

// --- Supabase sync (only runs when connected + configured) ---
// Table schema is provided in the setup instructions.

export async function pushToCloud(userId, { habits, log }) {
  if (!supabase || !userId) return { ok: false, reason: 'no-sync' }
  try {
    const { error: e1 } = await supabase
      .from('habits')
      .upsert(habits.map(h => ({ ...h, user_id: userId })), { onConflict: 'id' })
    const { error: e2 } = await supabase
      .from('habit_log')
      .upsert(
        Object.entries(log).flatMap(([habitId, days]) =>
          Object.entries(days).map(([date, value]) => ({
            id: `${habitId}_${date}`, habit_id: habitId, user_id: userId, date, value: String(value),
          }))
        ),
        { onConflict: 'id' }
      )
    if (e1 || e2) return { ok: false, reason: (e1 || e2).message }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}

export async function pullFromCloud(userId) {
  if (!supabase || !userId) return null
  try {
    const { data: habits } = await supabase.from('habits').select('*').eq('user_id', userId)
    const { data: rows } = await supabase.from('habit_log').select('*').eq('user_id', userId)
    const log = {}
    ;(rows || []).forEach(r => {
      log[r.habit_id] = log[r.habit_id] || {}
      log[r.habit_id][r.date] = isNaN(+r.value) ? r.value : +r.value
    })
    return { habits: habits || [], log }
  } catch {
    return null
  }
}
