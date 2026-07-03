import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Self-heal a mis-entered URL. The Supabase client appends "/rest/v1/" itself,
// so if someone pasted ".../rest/v1" (or a trailing slash) into the env var we
// strip it here — otherwise every request 404s on a doubled "/rest/v1/rest/v1/".
function normalizeUrl(u) {
  if (!u) return u
  let s = u.trim().replace(/\/+$/, '')          // drop trailing slashes
  s = s.replace(/\/rest\/v1$/i, '')             // drop a stray /rest/v1 suffix
  s = s.replace(/\/auth\/v1$/i, '')             // and a few other common paste mistakes
  return s
}
const url = normalizeUrl(rawUrl)

export const supabase = (url && key) ? createClient(url, key) : null
export const syncEnabled = !!supabase

// LocalStorage keys. Original names kept so existing data survives.
const K = {
  habits: 'callen_habits_v1',
  log: 'callen_log_v1',
  entries: 'callen_entries_v1',
  todos: 'feten_todos_v1',
  countdowns: 'feten_countdowns_v1',
  goals: 'feten_goals_v1',
  wishlist: 'feten_wishlist_v1',
  planner: 'feten_planner_v1',
  settings: 'feten_settings_v1',
  meta: 'callen_meta_v1',
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

export function loadLocal() {
  return {
    habits: readJSON(K.habits, []),
    log: readJSON(K.log, {}),
    entries: readJSON(K.entries, {}),
    todos: readJSON(K.todos, []),
    countdowns: readJSON(K.countdowns, []),
    goals: readJSON(K.goals, []),
    wishlist: readJSON(K.wishlist, []),
    planner: readJSON(K.planner, []),
    settings: readJSON(K.settings, { theme: 'light', firstDay: 'Mon' }),
    meta: readJSON(K.meta, {}),
  }
}

export function saveLocal(patch) {
  for (const [name, val] of Object.entries(patch)) {
    if (val === undefined) continue
    if (K[name]) localStorage.setItem(K[name], JSON.stringify(val))
  }
}

// ---------- Supabase sync ----------
export async function pushToCloud(userId, data) {
  if (!supabase || !userId) return { ok: false, reason: 'no-sync' }
  const errors = []
  const up = async (table, rows, conflict = 'id') => {
    if (!rows || !rows.length) return
    const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict })
    if (error) errors.push(`${table}: ${error.message}`)
  }
  try {
    await up('habits', (data.habits || []).map(h => ({ ...h, user_id: userId })))
    await up('habit_log', Object.entries(data.log || {}).flatMap(([habitId, days]) =>
      Object.entries(days).map(([date, value]) => ({
        id: `${habitId}_${date}`, habit_id: habitId, user_id: userId, date, value: String(value),
      }))))
    await up('habit_entries', Object.entries(data.entries || {}).flatMap(([habitId, days]) =>
      Object.entries(days).map(([date, e]) => ({
        id: `${habitId}_${date}`, habit_id: habitId, user_id: userId, date,
        note: e.note || '', checklist: e.checklist || [],
      }))))
    await up('todos', (data.todos || []).map(t => ({ ...t, user_id: userId })))
    await up('countdowns', (data.countdowns || []).map(c => ({ ...c, user_id: userId })))
    await up('goals', (data.goals || []).map(g => ({ ...g, user_id: userId })))
    await up('wishlist', (data.wishlist || []).map(w => ({ ...w, user_id: userId })))
    await up('planner', (data.planner || []).map(p => ({ ...p, user_id: userId })))
    if (errors.length) return { ok: false, reason: errors.join('; ') }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}

export async function pullFromCloud(userId) {
  if (!supabase || !userId) return null
  // Track whether ANY request errored. Supabase does NOT throw on HTTP errors
  // (404, RLS, missing table) — it resolves with { data:null, error }. If we
  // treated that as an empty account, a later merge would wipe local data.
  // So on ANY error we return null → caller skips the destructive merge.
  let failed = false
  const get = async (table) => {
    try {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
      if (error) { failed = true; return [] }
      return data || []
    } catch {
      failed = true
      return []
    }
  }
  const [habits, logRows, entryRows, todos, countdowns, goals, wishlist, planner] = await Promise.all([
    get('habits'), get('habit_log'), get('habit_entries'), get('todos'),
    get('countdowns'), get('goals'), get('wishlist'), get('planner'),
  ])
  if (failed) return null   // unreliable pull — do not let it overwrite local

  const log = {}
  logRows.forEach(r => { (log[r.habit_id] = log[r.habit_id] || {})[r.date] = isNaN(+r.value) ? r.value : +r.value })
  const entries = {}
  entryRows.forEach(r => { (entries[r.habit_id] = entries[r.habit_id] || {})[r.date] = { note: r.note || '', checklist: r.checklist || [] } })
  const strip = (arr) => arr.map(({ user_id, ...rest }) => rest)
  return {
    habits: strip(habits), log, entries,
    todos: strip(todos), countdowns: strip(countdowns),
    goals: strip(goals), wishlist: strip(wishlist), planner: strip(planner),
  }
}

export async function deleteFromCloud(table, id) {
  if (!supabase) return
  try { await supabase.from(table).delete().eq('id', id) } catch { /* ignore */ }
}
