import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Home as House, CalendarDays, BarChart3 as ChartColumn, CircleUserRound, Plus, Check, Minus,
  CircleCheckBig, Flame, Trophy, Cloud, CloudOff, RefreshCw, Pencil, Trash2,
  Pause, Play, ChevronLeft, ChevronRight, Award, Sparkles, TrendingUp,
} from 'lucide-react'
import {
  ICONS, todayKey, scheduledOn, currentStreak, longestStreak, isDone,
  progressValue, haptic, fireConfetti,
} from './helpers'
import { loadLocal, saveLocal, syncEnabled, pushToCloud, pullFromCloud } from './store'
import CreateHabit from './CreateHabit'
import HabitDetail from './HabitDetail'
import Lockscreen from './Lockscreen'

const USER = 'Feten'

// ---------- Progress Ring ----------
function Ring({ done, total, size = 120 }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--purple-light)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--purple)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="ring-center">
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--purple)' }}>{done}/{total}</div>
        <div className="t-caption">completed</div>
      </div>
    </div>
  )
}

// ---------- Habit Card ----------
function HabitCard({ habit, log, onComplete, onUndo, onIncrement, onOpen }) {
  const [completing, setCompleting] = useState(false)
  const [glow, setGlow] = useState(false)
  const Icon = ICONS[habit.icon] || ICONS.Droplets
  const done = isDone(habit, log)
  const val = progressValue(habit, log)
  const isCounter = habit.goalType !== 'Simple Check'

  const complete = (e) => {
    e.stopPropagation()
    if (done) { haptic(); onUndo(habit); return }
    haptic()
    if (isCounter && val + 1 < habit.goalTarget) {
      onIncrement(habit)
      return
    }
    setGlow(true)
    fireConfetti()
    setTimeout(() => { setCompleting(true) }, 300)
    setTimeout(() => { onComplete(habit) }, 520)
  }

  return (
    <div className={`habit-card ${completing ? 'completing' : ''} ${glow ? 'glow' : ''}`}
      onClick={() => onOpen(habit)} role="button">
      <div className="habit-icon" style={{ background: habit.color + '20' }}>
        <Icon size={24} color={habit.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-habit" style={{ marginBottom: 2 }}>{habit.name}</div>
        <div className="t-caption">
          {habit.reminderOn ? habit.time + ' · ' : ''}{habit.repeat}
          {isCounter ? ` · ${val}/${habit.goalTarget} ${habit.goalUnit}` : ''}
        </div>
        {isCounter && (
          <div style={{ height: 6, borderRadius: 999, background: 'var(--purple-light)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (val / habit.goalTarget) * 100)}%`,
              background: habit.color, transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
        )}
      </div>
      <button className={`check-btn ${done ? 'done' : ''}`} onClick={complete} aria-label={done ? 'Undo' : 'Complete habit'}
        style={done ? { background: habit.color, borderColor: habit.color } : {}}>
        {done ? <Check size={18} color="#fff" strokeWidth={3} />
          : isCounter ? <Plus size={16} color="var(--placeholder)" />
          : <Check size={16} color="var(--placeholder)" />}
      </button>
    </div>
  )
}

// ---------- Delete confirmation ----------
function ConfirmDelete({ habit, onClose, onConfirm }) {
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
        <div className="sheet-grab" />
        <div className="t-section" style={{ marginBottom: 8 }}>Delete "{habit.name}"?</div>
        <p className="t-help" style={{ marginBottom: 24 }}>
          This removes the habit and all its history. This can't be undone.
        </p>
        <button className="btn-primary" style={{ background: 'var(--error)', marginBottom: 12 }}
          onClick={() => onConfirm(habit)}>Delete habit</button>
        <button className="btn-ghost" style={{ width: '100%' }} onClick={onClose}>Keep it</button>
      </div>
    </>
  )
}

export default function App() {
  const [locked, setLocked] = useState(() => sessionStorage.getItem('feten_unlocked') !== '1')
  const [tab, setTab] = useState('home')
  const [{ habits, log, entries }, setState] = useState({ habits: [], log: {}, entries: {} })
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailHabit, setDetailHabit] = useState(null)
  const [confirmHabit, setConfirmHabit] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  // Load once
  useEffect(() => {
    const local = loadLocal()
    setState({ habits: local.habits, log: local.log, entries: local.entries || {} })
    setLastSync(local.meta?.lastSync || null)
  }, [])

  // Persist on change
  useEffect(() => { saveLocal({ habits, log, entries }) }, [habits, log, entries])

  // Online/offline listeners
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const doSync = useCallback(async () => {
    if (!syncEnabled || !online) return
    setSyncing(true)
    let userId = localStorage.getItem('callen_uid')
    if (!userId) { userId = 'user-' + Math.random().toString(36).slice(2); localStorage.setItem('callen_uid', userId) }
    const cloud = await pullFromCloud(userId)
    let merged = { habits, log, entries }
    if (cloud) {
      const byId = Object.fromEntries(habits.map(h => [h.id, h]))
      cloud.habits.forEach(h => { if (!byId[h.id]) byId[h.id] = h })
      const mergedLog = { ...cloud.log }
      Object.entries(log).forEach(([hid, days]) => {
        mergedLog[hid] = { ...(mergedLog[hid] || {}), ...days }
      })
      const mergedEntries = { ...(cloud.entries || {}) }
      Object.entries(entries).forEach(([hid, days]) => {
        mergedEntries[hid] = { ...(mergedEntries[hid] || {}), ...days }
      })
      merged = { habits: Object.values(byId), log: mergedLog, entries: mergedEntries }
      setState(merged)
    }
    await pushToCloud(userId, merged)
    const now = new Date().toISOString()
    setLastSync(now); saveLocal({ meta: { lastSync: now } })
    setSyncing(false)
  }, [habits, log, entries, online])

  useEffect(() => { if (online && syncEnabled) doSync() /* eslint-disable-next-line */ }, [online])

  // ----- mutations -----
  const setLog = (fn) => setState(s => ({ ...s, log: fn(s.log) }))

  const doneValue = (habit) => habit.goalType === 'Simple Check' ? 'done' : (habit.goalTarget || 1)

  const completeHabit = (habit) => {
    setLog(l => ({ ...l, [habit.id]: { ...(l[habit.id] || {}), [todayKey()]: doneValue(habit) } }))
  }
  const undoHabit = (habit, dateK = todayKey()) => {
    setLog(l => {
      const days = { ...(l[habit.id] || {}) }
      delete days[dateK]
      return { ...l, [habit.id]: days }
    })
  }
  // Toggle done for any date (used by the detail page)
  const toggleDoneOn = (habit, dateK) => {
    setLog(l => {
      const days = { ...(l[habit.id] || {}) }
      if (isDone(habit, { [habit.id]: days }, dateK)) delete days[dateK]
      else days[dateK] = doneValue(habit)
      return { ...l, [habit.id]: days }
    })
  }
  const incrementHabit = (habit) => {
    setLog(l => {
      const cur = progressValue(habit, l)
      return { ...l, [habit.id]: { ...(l[habit.id] || {}), [todayKey()]: cur + 1 } }
    })
  }
  const saveEntry = (habit, dateK, entry) => {
    setState(s => ({
      ...s,
      entries: { ...s.entries, [habit.id]: { ...(s.entries[habit.id] || {}), [dateK]: entry } },
    }))
  }
  const saveHabit = (habit) => {
    setState(s => {
      const exists = s.habits.some(h => h.id === habit.id)
      return { ...s, habits: exists ? s.habits.map(h => h.id === habit.id ? habit : h) : [...s.habits, habit] }
    })
    setShowCreate(false); setEditing(null)
    if (detailHabit) setDetailHabit(habit)
  }
  const deleteHabit = (habit) => {
    setState(s => ({ ...s, habits: s.habits.filter(h => h.id !== habit.id) }))
    setConfirmHabit(null); setDetailHabit(null)
  }
  const pauseHabit = (habit) => {
    const updated = { ...habit, paused: !habit.paused }
    setState(s => ({ ...s, habits: s.habits.map(h => h.id === habit.id ? updated : h) }))
    if (detailHabit) setDetailHabit(updated)
  }

  // Keep the detail page in sync with the latest habit object
  const liveDetail = detailHabit ? habits.find(h => h.id === detailHabit.id) || detailHabit : null

  // Today's active habits
  const now = new Date()
  const todays = habits.filter(h => !h.archived && !h.paused && scheduledOn(h, now))
  const pending = todays.filter(h => !isDone(h, log))
  const completed = todays.filter(h => isDone(h, log))

  // Passcode gate
  if (locked) return <Lockscreen onUnlock={() => setLocked(false)} />

  // Full-screen detail view takes over
  if (liveDetail) {
    return (
      <div className="app">
        <HabitDetail
          habit={liveDetail} log={log} entries={entries}
          onBack={() => setDetailHabit(null)}
          onEdit={(h) => { setEditing(h); setShowCreate(true) }}
          onPause={pauseHabit}
          onDelete={(h) => setConfirmHabit(h)}
          onToggleDone={toggleDoneOn}
          onSaveEntry={saveEntry}
        />
        {showCreate && <CreateHabit onClose={() => { setShowCreate(false); setEditing(null) }}
          onSave={saveHabit} editing={editing} />}
        {confirmHabit && <ConfirmDelete habit={confirmHabit}
          onClose={() => setConfirmHabit(null)} onConfirm={deleteHabit} />}
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'home' && (
        <Home user={USER} pending={pending} completed={completed} todays={todays} log={log}
          online={online} syncing={syncing} lastSync={lastSync} onSync={doSync}
          onComplete={completeHabit} onUndo={undoHabit} onIncrement={incrementHabit} onOpen={setDetailHabit} />
      )}
      {tab === 'calendar' && <Calendar habits={habits} log={log} />}
      {tab === 'insights' && <Insights habits={habits} log={log} />}
      {tab === 'profile' && <Profile user={USER} habits={habits} log={log} online={online} lastSync={lastSync} />}

      {/* FAB */}
      <button className="fab" onClick={() => { setEditing(null); setShowCreate(true); haptic() }} aria-label="New habit">
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </button>

      {/* Tab bar */}
      <nav className="tabbar">
        <Tab id="home" label="Home" icon={House} tab={tab} setTab={setTab} />
        <Tab id="calendar" label="Calendar" icon={CalendarDays} tab={tab} setTab={setTab} />
        <div style={{ width: 60 }} />
        <Tab id="insights" label="Insights" icon={ChartColumn} tab={tab} setTab={setTab} />
        <Tab id="profile" label="Profile" icon={CircleUserRound} tab={tab} setTab={setTab} />
      </nav>

      {showCreate && <CreateHabit onClose={() => { setShowCreate(false); setEditing(null) }}
        onSave={saveHabit} editing={editing} />}
      {confirmHabit && <ConfirmDelete habit={confirmHabit}
        onClose={() => setConfirmHabit(null)} onConfirm={deleteHabit} />}
    </div>
  )
}

function Tab({ id, label, icon: I, tab, setTab }) {
  return (
    <button className={`tab ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); haptic() }}>
      <I size={24} strokeWidth={tab === id ? 2.4 : 2} />
      <span>{label}</span>
    </button>
  )
}

// ---------- HOME ----------
function Home({ user, pending, completed, todays, log, online, syncing, lastSync, onSync,
  onComplete, onUndo, onIncrement, onOpen }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const todayStr = new Date().toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })
  const doneCount = completed.length
  const allDone = todays.length > 0 && pending.length === 0

  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 4 }}>
        <div>
          <div className="t-caption">{greeting},</div>
          <h1 className="t-app">{user} 🌸</h1>
        </div>
        <SyncStatus online={online} syncing={syncing} lastSync={lastSync} onSync={onSync} />
      </div>
      <p className="t-help" style={{ marginBottom: 20 }}>{todayStr}</p>

      {/* Progress ring card */}
      <div className="card row" style={{ padding: 20, gap: 20, marginBottom: 8 }}>
        <Ring done={doneCount} total={todays.length} />
        <div style={{ flex: 1 }}>
          <div className="t-section" style={{ marginBottom: 4 }}>Today's Progress</div>
          <p className="t-help">
            {todays.length === 0 ? 'No habits scheduled today.'
              : allDone ? 'Every habit done. Beautifully done, your majesty.'
              : `${pending.length} left to complete today.`}
          </p>
        </div>
      </div>

      {todays.length === 0 && <EmptyState />}

      {pending.length > 0 && (
        <>
          <div className="section-head"><span className="t-section">Today's Habits</span></div>
          {pending.map(h => (
            <HabitCard key={h.id} habit={h} log={log} onComplete={onComplete}
              onUndo={onUndo} onIncrement={onIncrement} onOpen={onOpen} />
          ))}
        </>
      )}

      {allDone && (
        <div className="card fade-in" style={{ padding: 32, textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div className="t-section" style={{ marginBottom: 4 }}>All done, Feten!</div>
          <p className="t-help">You've completed everything today. Rest easy.</p>
        </div>
      )}

      {completed.length > 0 && (
        <>
          <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>
            Completed · {completed.length}</span></div>
          {completed.map(h => {
            const Icon = ICONS[h.icon] || ICONS.Droplets
            return (
              <div key={h.id} className="row" onClick={() => onOpen(h)} role="button"
                style={{ gap: 12, padding: '10px 4px', opacity: 0.6, cursor: 'pointer' }}>
                <div className="habit-icon" style={{ background: h.color + '18', width: 38, height: 38 }}>
                  <Icon size={18} color={h.color} />
                </div>
                <span className="t-card" style={{ flex: 1, textDecoration: 'line-through' }}>{h.name}</span>
                <CircleCheckBig size={20} color="var(--success)" />
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function SyncStatus({ online, syncing, lastSync, onSync }) {
  if (!syncEnabled) {
    return (
      <div className="sync-pill" style={{ background: 'var(--lavender)', color: 'var(--text-2)' }}>
        <CloudOff size={13} /> Local
      </div>
    )
  }
  return (
    <button className="sync-pill" onClick={onSync}
      style={{ background: online ? 'var(--purple-light)' : 'var(--lavender)', color: online ? 'var(--purple)' : 'var(--text-2)' }}>
      {syncing ? <RefreshCw size={13} className="spin" /> : online ? <Cloud size={13} /> : <CloudOff size={13} />}
      {syncing ? 'Syncing' : online ? 'Synced' : 'Offline'}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="card fade-in" style={{ padding: 40, textAlign: 'center', marginTop: 8 }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🌸</div>
      <div className="t-section" style={{ marginBottom: 6 }}>Start your first habit</div>
      <p className="t-help">Tap the + button below to create one. It takes about 20 seconds.</p>
    </div>
  )
}

// ---------- CALENDAR ----------
function Calendar({ habits, log }) {
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState(null)
  const active = habits.filter(h => !h.archived)

  const year = month.getFullYear(), m = month.getMonth()
  const first = new Date(year, m, 1).getDay()
  const days = new Date(year, m + 1, 0).getDate()

  const dayStatus = (day) => {
    const d = new Date(year, m, day)
    if (d > new Date()) return 'future'
    const sched = active.filter(h => scheduledOn(h, d))
    if (sched.length === 0) return 'empty'
    const k = todayKey(d)
    const done = sched.filter(h => isDone(h, log, k)).length
    if (done === sched.length) return 'done'
    if (done > 0) return 'partial'
    return 'missed'
  }

  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' })
  // Monthly completion %
  let sched = 0, done = 0
  for (let day = 1; day <= days; day++) {
    const d = new Date(year, m, day)
    if (d > new Date()) continue
    active.forEach(h => { if (scheduledOn(h, d)) { sched++; if (isDone(h, log, todayKey(d))) done++ } })
  }
  const pct = sched ? Math.round((done / sched) * 100) : 0

  return (
    <div className="fade-in">
      <h1 className="t-screen" style={{ marginBottom: 20 }}>Calendar</h1>

      <div className="row" style={{ gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{pct}%</div>
          <div className="t-caption">This month</div>
        </div>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{active.reduce((max, h) => Math.max(max, currentStreak(h, log)), 0)}</div>
          <div className="t-caption">Best streak now</div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} style={{ padding: 6 }}>
            <ChevronLeft size={20} color="var(--text-2)" />
          </button>
          <span className="t-section">{monthName}</span>
          <button onClick={() => setMonth(new Date(year, m + 1, 1))} style={{ padding: 6 }}>
            <ChevronRight size={20} color="var(--text-2)" />
          </button>
        </div>
        <div className="cal-grid" style={{ marginBottom: 8 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="t-caption" style={{ textAlign: 'center' }}>{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: first }).map((_, i) => <div key={'e' + i} />)}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1
            const st = dayStatus(day)
            const colors = { done: 'var(--success)', partial: 'var(--warning)', missed: 'var(--border)', empty: 'transparent', future: 'transparent' }
            const isToday = todayKey(new Date(year, m, day)) === todayKey()
            return (
              <button key={day} className="cal-day" onClick={() => setSelected(day)}
                style={{ background: isToday ? 'var(--purple-light)' : 'transparent', color: st === 'future' ? 'var(--placeholder)' : 'var(--text)' }}>
                {day}
                {st !== 'empty' && st !== 'future' && <span className="cal-dot" style={{ background: colors[st] }} />}
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <DayDetail day={selected} year={year} month={m} habits={active} log={log} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function DayDetail({ day, year, month, habits, log, onClose }) {
  const d = new Date(year, month, day)
  const k = todayKey(d)
  const sched = habits.filter(h => scheduledOn(h, d))
  const done = sched.filter(h => isDone(h, log, k))
  const missed = sched.filter(h => !isDone(h, log, k) && d <= new Date())
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grab" />
        <div className="t-section" style={{ marginBottom: 16 }}>
          {d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        {sched.length === 0 && <p className="t-help">No habits scheduled this day.</p>}
        {done.length > 0 && <div className="t-label" style={{ color: 'var(--success)', marginBottom: 8 }}>Completed</div>}
        {done.map(h => <DayRow key={h.id} h={h} status="done" />)}
        {missed.length > 0 && <div className="t-label" style={{ color: 'var(--text-2)', margin: '16px 0 8px' }}>Missed</div>}
        {missed.map(h => <DayRow key={h.id} h={h} status="missed" />)}
      </div>
    </>
  )
}
function DayRow({ h, status }) {
  const Icon = ICONS[h.icon] || ICONS.Droplets
  return (
    <div className="row" style={{ gap: 12, padding: '8px 0' }}>
      <div className="habit-icon" style={{ background: h.color + '18', width: 36, height: 36 }}>
        <Icon size={17} color={h.color} />
      </div>
      <span className="t-card" style={{ flex: 1 }}>{h.name}</span>
      {status === 'done'
        ? <CircleCheckBig size={18} color="var(--success)" />
        : <span className="t-caption">—</span>}
    </div>
  )
}

// ---------- INSIGHTS ----------
function Insights({ habits, log }) {
  const [range, setRange] = useState('Week') // Week | Month | Year
  const active = habits.filter(h => !h.archived)

  const doneOn = (d) => {
    const sched = active.filter(h => scheduledOn(h, d))
    const done = sched.filter(h => isDone(h, log, todayKey(d))).length
    return { done, total: sched.length }
  }

  // Build chart buckets + range-limited completion total based on the selected range
  let bars = []
  let rangeDone = 0
  const today = new Date()

  if (range === 'Week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const { done, total } = doneOn(d)
      rangeDone += done
      bars.push({ label: d.toLocaleDateString('default', { weekday: 'narrow' }), done, total: total || 1 })
    }
  } else if (range === 'Month') {
    // Last ~30 days grouped into weekly buckets
    for (let w = 4; w >= 0; w--) {
      let done = 0, total = 0
      for (let day = 0; day < 7; day++) {
        const d = new Date(); d.setDate(d.getDate() - (w * 7 + day))
        const r = doneOn(d); done += r.done; total += r.total
      }
      rangeDone += done
      bars.push({ label: w === 0 ? 'Now' : `${w}w`, done, total: total || 1 })
    }
  } else {
    // Last 12 months, monthly buckets
    for (let m = 11; m >= 0; m--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - m, 1)
      const daysIn = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
      let done = 0, total = 0
      for (let day = 1; day <= daysIn; day++) {
        const d = new Date(ref.getFullYear(), ref.getMonth(), day)
        if (d > today) break
        const r = doneOn(d); done += r.done; total += r.total
      }
      rangeDone += done
      bars.push({ label: ref.toLocaleDateString('default', { month: 'narrow' }), done, total: total || 1 })
    }
  }
  const maxDone = Math.max(1, ...bars.map(b => b.done))

  const best = active.map(h => ({ h, s: currentStreak(h, log) })).sort((a, b) => b.s - a.s)[0]
  const totalDone = active.reduce((sum, h) => {
    return sum + Object.values(log[h.id] || {}).filter(v => v === 'done' || (typeof v === 'number' && v > 0)).length
  }, 0)

  // 7-day window still used for the Perfect Week achievement
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    last7.push(doneOn(d))
  }

  const ACHIEVEMENTS = [
    { id: 'first', label: 'First Habit', icon: Sparkles, unlocked: active.length >= 1 },
    { id: '7day', label: '7 Day Streak', icon: Flame, unlocked: active.some(h => longestStreak(h, log) >= 7) },
    { id: '30day', label: '30 Day Streak', icon: Trophy, unlocked: active.some(h => longestStreak(h, log) >= 30) },
    { id: '100', label: '100 Completions', icon: Award, unlocked: totalDone >= 100 },
    { id: 'perfectweek', label: 'Perfect Week', icon: TrendingUp, unlocked: last7.every(w => w.total > 0 && w.done >= w.total) },
  ]

  const chartTitle = range === 'Week' ? 'This Week' : range === 'Month' ? 'Last 4 Weeks' : 'Last 12 Months'
  const rangeLabel = range === 'Week' ? 'This week' : range === 'Month' ? 'This month' : 'This year'

  return (
    <div className="fade-in">
      <h1 className="t-screen" style={{ marginBottom: 6 }}>Insights</h1>
      <p className="t-help" style={{ marginBottom: 16 }}>A gentle look at your progress.</p>

      {/* Range filter */}
      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        {['Week', 'Month', 'Year'].map(r => (
          <button key={r} onClick={() => { setRange(r); haptic() }}
            className={`chip ${range === r ? 'active' : ''}`}
            style={{ flex: 1, textAlign: 'center' }}>{r}</button>
        ))}
      </div>

      <div className="row" style={{ gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{rangeDone}</div>
          <div className="t-caption">{rangeLabel}</div>
        </div>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{best ? best.s : 0}</div>
          <div className="t-caption">Best streak</div>
        </div>
      </div>

      {/* Adaptive bar chart */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="t-section" style={{ marginBottom: 16 }}>{chartTitle}</div>
        <div className="row" style={{ alignItems: 'flex-end', gap: range === 'Year' ? 5 : 10, height: 120 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 92, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%', borderRadius: 6,
                  height: `${(b.done / maxDone) * 100}%`, minHeight: b.done ? 6 : 2,
                  background: b.done ? 'var(--purple)' : 'var(--purple-light)',
                  transition: 'height 500ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <div className="t-caption" style={{ marginTop: 6, fontSize: 11 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {best && best.s > 0 && (
        <div className="card row" style={{ padding: 16, gap: 12, marginBottom: 20, background: 'var(--lavender)' }}>
          <Flame size={28} color="var(--pink)" />
          <div>
            <div className="t-habit">{best.h.name}</div>
            <div className="t-help">Your strongest streak — {best.s} days. Keep the crown.</div>
          </div>
        </div>
      )}

      <div className="section-head"><span className="t-section">Achievements</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ACHIEVEMENTS.map(a => {
          const I = a.icon
          return (
            <div key={a.id} className={`card ach ${a.unlocked ? '' : 'locked'}`}>
              <I size={28} color={a.unlocked ? 'var(--pink)' : 'var(--placeholder)'} style={{ marginBottom: 8 }} />
              <div className="t-caption" style={{ fontWeight: 600, color: a.unlocked ? 'var(--text)' : 'var(--text-2)' }}>{a.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- PROFILE ----------
function Profile({ user, habits, log, online, lastSync }) {
  const active = habits.filter(h => !h.archived)
  const totalDone = active.reduce((sum, h) =>
    sum + Object.values(log[h.id] || {}).filter(v => v === 'done' || (typeof v === 'number' && v > 0)).length, 0)
  const bestEver = active.reduce((max, h) => Math.max(max, longestStreak(h, log)), 0)

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ habits, log }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'callen-habits-backup.json'; a.click()
  }

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
        <div style={{ width: 88, height: 88, borderRadius: 999, margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--purple), var(--pink))',
          display: 'grid', placeItems: 'center', fontSize: 40 }}>👑</div>
        <h1 className="t-screen">{user}</h1>
        <p className="t-help">"Small steps, beautifully kept."</p>
      </div>

      <div className="row" style={{ gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{active.length}</div><div className="t-caption">Habits</div>
        </div>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{totalDone}</div><div className="t-caption">Completed</div>
        </div>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
          <div className="stat-num">{bestEver}</div><div className="t-caption">Best streak</div>
        </div>
      </div>

      <div className="card" style={{ padding: 4, marginBottom: 16 }}>
        <Row label="Cloud sync" value={syncEnabled ? (online ? 'On · Connected' : 'On · Offline') : 'Not set up'} />
        <Row label="Last synced" value={lastSync ? new Date(lastSync).toLocaleString() : '—'} />
        <Row label="Storage" value="On this device" last />
      </div>

      <button className="btn-ghost" style={{ width: '100%' }} onClick={exportData}>Export my data</button>

      <p className="t-caption" style={{ textAlign: 'center', marginTop: 24 }}>
        Feten's Habit Tracker · works offline, syncs when connected
      </p>
    </div>
  )
}
function Row({ label, value, last }) {
  return (
    <div className="row between" style={{ padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span className="t-card" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="t-label">{value}</span>
    </div>
  )
}
