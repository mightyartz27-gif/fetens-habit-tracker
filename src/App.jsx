import { useState, useEffect, useCallback } from 'react'
import {
  Home as House, CalendarDays, BarChart3 as ChartColumn, Plus, Check,
  Flame, Cloud, CloudOff, RefreshCw, ChevronLeft, ChevronRight,
  Award, Sparkles, TrendingUp, Trophy, LayoutGrid,
} from 'lucide-react'
import {
  ICONS, todayKey, scheduledOn, currentStreak, longestStreak, isDone,
  progressValue, haptic, fireConfetti, mondayDow, WEEK_LABELS, daysUntil,
  todoOnDate,
} from './helpers'
import { loadLocal, saveLocal, syncEnabled, pushToCloud, pullFromCloud, deleteFromCloud } from './store'
import CreateHabit from './CreateHabit'
import HabitDetail from './HabitDetail'
import Lockscreen from './Lockscreen'
import {
  TodoCard, CreateTodo, CreateCountdown, CreateGoal,
  CreateWish, CreatePlannerEvent, CreateChooser, ConfirmDialog, useLongPress, WishRow,
} from './features'
import {
  PlannerTimeline, CountdownsPage, GoalsPage, WishlistPage, EmptyCard,
} from './pages'

const USER = 'Feten'

/* ---------- Progress Ring ---------- */
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

/* ---------- Habit Card (completed stays visible; long-press to delete) ---------- */
function HabitCard({ habit, log, onComplete, onUndo, onIncrement, onOpen, onLongPress }) {
  const [glow, setGlow] = useState(false)
  const Icon = ICONS[habit.icon] || ICONS.Droplets
  const done = isDone(habit, log)
  const val = progressValue(habit, log)
  const isCounter = habit.goalType !== 'Simple Check'
  const lp = useLongPress(() => onLongPress(habit))

  const complete = (e) => {
    e.stopPropagation()
    if (done) { haptic(); onUndo(habit); return }
    haptic()
    if (isCounter && val + 1 < habit.goalTarget) { onIncrement(habit); return }
    setGlow(true); fireConfetti()
    setTimeout(() => setGlow(false), 400)
    onComplete(habit)
  }

  return (
    <div className={`habit-card ${glow ? 'glow' : ''}`} {...lp.handlers} onClick={(e) => { if (!lp.suppressClick(e)) onOpen(habit) }} role="button"
      style={{ opacity: done ? 0.72 : 1 }}>
      <div className="habit-icon" style={{ background: habit.color + '20' }}>
        <Icon size={24} color={habit.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-habit" style={{ marginBottom: 2, textDecoration: done && !isCounter ? 'line-through' : 'none' }}>{habit.name}</div>
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
      <button className={`check-btn ${done ? 'done' : ''}`} onClick={complete} aria-label={done ? 'Undo' : 'Complete'}
        style={done ? { background: habit.color, borderColor: habit.color } : {}}>
        {done ? <Check size={18} color="#fff" strokeWidth={3} />
          : isCounter ? <Plus size={16} color="var(--placeholder)" />
          : <Check size={16} color="var(--placeholder)" />}
      </button>
    </div>
  )
}

export default function App() {
  const [locked, setLocked] = useState(() => sessionStorage.getItem('feten_unlocked') !== '1')
  const [tab, setTab] = useState('home')
  const [data, setData] = useState({
    habits: [], log: {}, entries: {}, todos: [], countdowns: [], goals: [], wishlist: [], planner: [],
  })
  const { habits, log, entries, todos, countdowns, goals, wishlist, planner } = data

  const [chooser, setChooser] = useState(false)
  const [creating, setCreating] = useState(null)
  const [editing, setEditing] = useState(null)
  const [detailHabit, setDetailHabit] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [plannerDate, setPlannerDate] = useState(new Date())

  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    const local = loadLocal()
    setData({
      habits: local.habits, log: local.log, entries: local.entries,
      todos: local.todos, countdowns: local.countdowns, goals: local.goals,
      wishlist: local.wishlist, planner: local.planner,
    })
    setLastSync(local.meta?.lastSync || null)
  }, [])

  useEffect(() => { saveLocal(data) }, [data])

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const doSync = useCallback(async () => {
    if (!syncEnabled || !online) return
    setSyncing(true)
    let userId = localStorage.getItem('callen_uid')
    if (!userId) { userId = 'user-' + Math.random().toString(36).slice(2); localStorage.setItem('callen_uid', userId) }
    const cloud = await pullFromCloud(userId)

    const mergeList = (localArr, cloudArr) => {
      // Local wins on id conflicts, so freshly-created local items are never
      // clobbered by an older cloud copy.
      const byId = Object.fromEntries((cloudArr || []).map(x => [x.id, x]))
      ;(localArr || []).forEach(x => { byId[x.id] = x })
      return Object.values(byId)
    }
    const mergeMap = (localMap, cloudMap) => {
      const out = { ...(cloudMap || {}) }
      Object.entries(localMap || {}).forEach(([k, v]) => { out[k] = { ...(out[k] || {}), ...v } })
      return out
    }

    // Build the merged result from the LATEST state (functional update),
    // not from a stale closure. This prevents a sync that started before a
    // create/edit from overwriting the new item.
    let pushPayload = null
    setData(cur => {
      if (!cloud) { pushPayload = cur; return cur }
      const merged = {
        habits: mergeList(cur.habits, cloud.habits),
        log: mergeMap(cur.log, cloud.log),
        entries: mergeMap(cur.entries, cloud.entries),
        todos: mergeList(cur.todos, cloud.todos),
        countdowns: mergeList(cur.countdowns, cloud.countdowns),
        goals: mergeList(cur.goals, cloud.goals),
        wishlist: mergeList(cur.wishlist, cloud.wishlist),
        planner: mergeList(cur.planner, cloud.planner),
      }
      pushPayload = merged
      return merged
    })
    await new Promise(r => setTimeout(r, 0))
    if (pushPayload) await pushToCloud(userId, pushPayload)
    const nowIso = new Date().toISOString()
    setLastSync(nowIso); saveLocal({ meta: { lastSync: nowIso } })
    setSyncing(false)
  }, [online]) // eslint-disable-line

  useEffect(() => { if (online && syncEnabled) doSync() }, [online]) // eslint-disable-line

  /* ---------- mutations ---------- */
  const patch = (p) => setData(d => ({ ...d, ...p }))
  const doneValue = (habit) => habit.goalType === 'Simple Check' ? 'done' : (habit.goalTarget || 1)

  const completeHabit = (habit) => patch({ log: { ...log, [habit.id]: { ...(log[habit.id] || {}), [todayKey()]: doneValue(habit) } } })
  const undoHabit = (habit, dateK = todayKey()) => {
    const days = { ...(log[habit.id] || {}) }; delete days[dateK]
    patch({ log: { ...log, [habit.id]: days } })
  }
  const toggleDoneOn = (habit, dateK) => {
    const days = { ...(log[habit.id] || {}) }
    if (isDone(habit, { [habit.id]: days }, dateK)) delete days[dateK]
    else days[dateK] = doneValue(habit)
    patch({ log: { ...log, [habit.id]: days } })
  }
  const incrementHabit = (habit) => {
    const cur = progressValue(habit, log)
    patch({ log: { ...log, [habit.id]: { ...(log[habit.id] || {}), [todayKey()]: cur + 1 } } })
  }
  const saveEntry = (habit, dateK, entry) =>
    patch({ entries: { ...entries, [habit.id]: { ...(entries[habit.id] || {}), [dateK]: entry } } })

  const saveHabit = (habit) => {
    const exists = habits.some(h => h.id === habit.id)
    patch({ habits: exists ? habits.map(h => h.id === habit.id ? habit : h) : [...habits, habit] })
    setCreating(null); setEditing(null)
    if (detailHabit) setDetailHabit(habit)
  }

  const saveInto = (key) => (item) => {
    const arr = data[key]
    const exists = arr.some(x => x.id === item.id)
    patch({ [key]: exists ? arr.map(x => x.id === item.id ? item : x) : [...arr, item] })
    setCreating(null); setEditing(null)
  }
  const toggleField = (key, field) => (item) =>
    patch({ [key]: data[key].map(x => x.id === item.id ? { ...x, [field]: !x[field] } : x) })

  const askDelete = (kind, item) => setConfirm({ kind, item })
  const doDelete = () => {
    if (!confirm) return
    const { kind, item } = confirm
    const map = { habit: 'habits', todo: 'todos', countdown: 'countdowns', goal: 'goals', wish: 'wishlist', event: 'planner' }
    const key = map[kind]
    patch({ [key]: data[key].filter(x => x.id !== item.id) })
    if (syncEnabled) deleteFromCloud(key, item.id)
    setConfirm(null); setDetailHabit(null)
  }

  const pauseHabit = (habit) => {
    const updated = { ...habit, paused: !habit.paused }
    patch({ habits: habits.map(h => h.id === habit.id ? updated : h) })
    if (detailHabit) setDetailHabit(updated)
  }

  /* ---------- derived: today ---------- */
  const now = new Date()
  const tKey = todayKey()
  const todayHabits = habits.filter(h => !h.archived && !h.paused && scheduledOn(h, now))
  const habitsDone = todayHabits.filter(h => isDone(h, log)).length
  const todayTodos = todos.filter(t => !t.due || todoOnDate(t, now) || (!t.done && daysUntil(t.due) < 0))
  const todayEvents = planner.filter(e => e.date === tKey).sort((a, b) => a.start.localeCompare(b.start))
  const upcomingCountdowns = [...countdowns].filter(c => daysUntil(c.date) >= 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date)).slice(0, 3)
  const activeGoals = goals.filter(g => !g.done).slice(0, 3)
  const wishlistPreview = wishlist.filter(w => !w.purchased).slice(0, 3)

  const liveDetail = detailHabit ? habits.find(h => h.id === detailHabit.id) || detailHabit : null

  const pick = (id) => { setChooser(false); setEditing(null); setCreating(id) }

  if (locked) return <Lockscreen onUnlock={() => setLocked(false)} />

  if (liveDetail) {
    return (
      <div className="app">
        <HabitDetail habit={liveDetail} log={log} entries={entries}
          onBack={() => setDetailHabit(null)}
          onEdit={(h) => { setEditing(h); setCreating('habit') }}
          onPause={pauseHabit}
          onDelete={(h) => askDelete('habit', h)}
          onToggleDone={toggleDoneOn} onSaveEntry={saveEntry} />
        {creating === 'habit' && <CreateHabit onClose={() => { setCreating(null); setEditing(null) }} onSave={saveHabit} editing={editing} />}
        {confirm && <ConfirmDialog title={`Are you sure you want to delete this ${confirm.kind}?`}
          message="This can't be undone." confirmLabel="Delete"
          onCancel={() => setConfirm(null)} onConfirm={doDelete} />}
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'home' && (
        <HomeDashboard
          user={USER} now={now}
          todayHabits={todayHabits} habitsDone={habitsDone} log={log}
          todayTodos={todayTodos} todayEvents={todayEvents}
          countdowns={upcomingCountdowns} goals={activeGoals} wishlist={wishlistPreview}
          online={online} syncing={syncing} lastSync={lastSync} onSync={doSync}
          onCompleteHabit={completeHabit} onUndoHabit={undoHabit} onIncHabit={incrementHabit}
          onOpenHabit={setDetailHabit} onLongHabit={(h) => askDelete('habit', h)}
          onToggleTodo={toggleField('todos', 'done')} onLongTodo={(t) => askDelete('todo', t)}
          onEditTodo={(t) => { setEditing(t); setCreating('todo') }}
          onToggleWish={toggleField('wishlist', 'purchased')} onLongWish={(w) => askDelete('wish', w)}
          onEditWish={(w) => { setEditing(w); setCreating('wish') }}
          goTo={setTab}
        />
      )}
      {tab === 'calendar' && (
        <CalendarPage habits={habits} log={log} planner={planner}
          plannerDate={plannerDate} setPlannerDate={setPlannerDate}
          onAddEvent={() => { setEditing(null); setCreating('event') }}
          onEditEvent={(e) => { setEditing(e); setCreating('event') }}
          onLongEvent={(e) => askDelete('event', e)} />
      )}
      {tab === 'insights' && <Insights habits={habits} log={log} todos={todos} />}
      {tab === 'more' && (
        <MorePage
          countdowns={countdowns} goals={goals} wishlist={wishlist}
          onAdd={pick}
          onEditGoal={(g) => { setEditing(g); setCreating('goal') }}
          onEditCountdown={(c) => { setEditing(c); setCreating('countdown') }}
          onEditWish={(w) => { setEditing(w); setCreating('wish') }}
          onToggleWish={toggleField('wishlist', 'purchased')}
          onLongCountdown={(c) => askDelete('countdown', c)}
          onLongGoal={(g) => askDelete('goal', g)}
          onLongWish={(w) => askDelete('wish', w)}
          onOpenProfile={() => setTab('profile')}
        />
      )}
      {tab === 'profile' && <Profile user={USER} habits={habits} log={log} todos={todos} goals={goals} online={online} lastSync={lastSync} />}

      <button className="fab" onClick={() => { setChooser(true); haptic() }} aria-label="Create"><Plus size={28} color="#fff" strokeWidth={2.5} /></button>

      <nav className="tabbar">
        <Tab id="home" label="Home" icon={House} tab={tab} setTab={setTab} />
        <Tab id="calendar" label="Calendar" icon={CalendarDays} tab={tab} setTab={setTab} />
        <div style={{ width: 60 }} />
        <Tab id="insights" label="Reports" icon={ChartColumn} tab={tab} setTab={setTab} />
        <Tab id="more" label="More" icon={LayoutGrid} tab={tab} setTab={setTab} />
      </nav>

      {chooser && <CreateChooser onClose={() => setChooser(false)} onPick={pick} />}
      {creating === 'habit' && <CreateHabit onClose={() => { setCreating(null); setEditing(null) }} onSave={saveHabit} editing={editing} />}
      {creating === 'todo' && <CreateTodo onClose={() => { setCreating(null); setEditing(null) }} onSave={saveInto('todos')} editing={editing} />}
      {creating === 'countdown' && <CreateCountdown onClose={() => { setCreating(null); setEditing(null) }} onSave={saveInto('countdowns')} editing={editing} />}
      {creating === 'goal' && <CreateGoal onClose={() => { setCreating(null); setEditing(null) }} onSave={saveInto('goals')} editing={editing} />}
      {creating === 'wish' && <CreateWish onClose={() => { setCreating(null); setEditing(null) }} onSave={saveInto('wishlist')} editing={editing} />}
      {creating === 'event' && <CreatePlannerEvent onClose={() => { setCreating(null); setEditing(null) }} onSave={saveInto('planner')} editing={editing} defaultDate={todayKey(plannerDate)} onDelete={(e) => { setCreating(null); askDelete('event', e) }} />}

      {confirm && <ConfirmDialog
        title={`Are you sure you want to delete this ${confirm.kind === 'wish' ? 'item' : confirm.kind}?`}
        message="This can't be undone." confirmLabel="Delete"
        onCancel={() => setConfirm(null)} onConfirm={doDelete} />}
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

/* ============================================================ HOME ============================================================ */
function HomeDashboard({
  user, now, todayHabits, habitsDone, log, todayTodos, todayEvents, countdowns, goals, wishlist,
  online, syncing, lastSync, onSync,
  onCompleteHabit, onUndoHabit, onIncHabit, onOpenHabit, onLongHabit,
  onToggleTodo, onLongTodo, onEditTodo, onToggleWish, onLongWish, onEditWish, goTo,
}) {
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const todayStr = now.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })
  const totalToday = todayHabits.length + todayTodos.length
  const doneToday = habitsDone + todayTodos.filter(t => t.done).length
  const pct = totalToday ? Math.round((doneToday / totalToday) * 100) : 0
  const pendingTodos = todayTodos.filter(t => !t.done)
  const doneTodos = todayTodos.filter(t => t.done)

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

      <div className="card row" style={{ padding: 20, gap: 20, marginBottom: 20 }}>
        <Ring done={doneToday} total={totalToday} />
        <div style={{ flex: 1 }}>
          <div className="t-section" style={{ marginBottom: 4 }}>Today</div>
          <p className="t-help">
            {totalToday === 0 ? 'Nothing scheduled yet. Tap + to begin.'
              : pct === 100 ? 'Everything done. Beautifully done, your majesty. 👑'
              : `${totalToday - doneToday} thing${totalToday - doneToday === 1 ? '' : 's'} left today.`}
          </p>
        </div>
      </div>

      {countdowns.length > 0 && (
        <>
          <SectionHead title="Countdowns" onMore={() => goTo('more')} />
          <div className="row" style={{ gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
            {countdowns.map(cd => {
              const d = daysUntil(cd.date)
              return (
                <div key={cd.id} className="card" style={{ padding: 14, minWidth: 118, flexShrink: 0 }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{cd.icon}</div>
                  <div className="cd-num" style={{ color: 'var(--purple)' }}>{d === 0 ? 'Today' : d}</div>
                  <div className="t-caption">{d === 0 ? '🎉' : 'days left'}</div>
                  <div className="t-label" style={{ marginTop: 4 }}>{cd.title}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {todayEvents.length > 0 && (
        <>
          <SectionHead title="Today's Schedule" onMore={() => goTo('calendar')} />
          <div className="card" style={{ padding: 12, marginBottom: 8 }}>
            {todayEvents.slice(0, 4).map(e => (
              <div key={e.id} className="row" style={{ gap: 12, padding: '8px 4px' }}>
                <span className="t-label" style={{ color: 'var(--text-2)', minWidth: 44 }}>{e.start}</span>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: e.color }} />
                <span className="t-card" style={{ flex: 1 }}>{e.title}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead title="Today's Habits" />
      {todayHabits.length === 0 && <EmptyCard emoji="🌸" title="No habits today" text="Tap + to create your first habit." />}
      {todayHabits.map(h => (
        <HabitCard key={h.id} habit={h} log={log}
          onComplete={onCompleteHabit} onUndo={onUndoHabit} onIncrement={onIncHabit}
          onOpen={onOpenHabit} onLongPress={onLongHabit} />
      ))}

      {(pendingTodos.length > 0 || doneTodos.length > 0) && <SectionHead title="Today's To-dos" onMore={() => goTo('more')} />}
      {pendingTodos.map(t => <TodoCard key={t.id} todo={t} onToggle={onToggleTodo} onLongPress={onLongTodo} onEdit={onEditTodo} />)}
      {doneTodos.map(t => <TodoCard key={t.id} todo={t} onToggle={onToggleTodo} onLongPress={onLongTodo} onEdit={onEditTodo} />)}

      {goals.length > 0 && (
        <>
          <SectionHead title="Goals" onMore={() => goTo('more')} />
          {goals.map(g => (
            <div key={g.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="t-card" style={{ fontWeight: 600 }}>{g.title}</span>
                <span className="t-label">{g.progress || 0}%</span>
              </div>
              <div className="pbar"><i style={{ width: (g.progress || 0) + '%', background: 'var(--purple)' }} /></div>
            </div>
          ))}
        </>
      )}

      {wishlist && wishlist.length > 0 && (
        <>
          <SectionHead title="Wishlist" onMore={() => goTo('more')} />
          {wishlist.map(w => (
            <WishRow key={w.id} item={w} onToggle={onToggleWish} onLongPress={onLongWish} onEdit={onEditWish} />
          ))}
        </>
      )}
    </div>
  )
}

function SectionHead({ title, onMore }) {
  return (
    <div className="section-head">
      <span className="t-section">{title}</span>
      {onMore && <button onClick={onMore} className="t-label" style={{ color: 'var(--purple)' }}>See all</button>}
    </div>
  )
}

function SyncStatus({ online, syncing, onSync }) {
  if (!syncEnabled) return <div className="sync-pill" style={{ background: 'var(--lavender)', color: 'var(--text-2)' }}><CloudOff size={13} /> Local</div>
  return (
    <button className="sync-pill" onClick={onSync}
      style={{ background: online ? 'var(--purple-light)' : 'var(--lavender)', color: online ? 'var(--purple)' : 'var(--text-2)' }}>
      {syncing ? <RefreshCw size={13} className="spin" /> : online ? <Cloud size={13} /> : <CloudOff size={13} />}
      {syncing ? 'Syncing' : online ? 'Synced' : 'Offline'}
    </button>
  )
}

/* ============================================================ CALENDAR ============================================================ */
function CalendarPage({ habits, log, planner, plannerDate, setPlannerDate, onAddEvent, onEditEvent, onLongEvent }) {
  const [view, setView] = useState('month')
  const [month, setMonth] = useState(new Date())
  const active = habits.filter(h => !h.archived)

  const year = month.getFullYear(), m = month.getMonth()
  const firstDow = mondayDow(new Date(year, m, 1))
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' })

  const dayStatus = (day) => {
    const d = new Date(year, m, day)
    if (d > new Date()) return 'future'
    const sched = active.filter(h => scheduledOn(h, d))
    if (!sched.length) return 'empty'
    const done = sched.filter(h => isDone(h, log, todayKey(d))).length
    if (done === sched.length) return 'done'
    if (done > 0) return 'partial'
    return 'missed'
  }

  let sched = 0, done = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, m, day)
    if (d > new Date()) continue
    active.forEach(h => { if (scheduledOn(h, d)) { sched++; if (isDone(h, log, todayKey(d))) done++ } })
  }
  const pct = sched ? Math.round((done / sched) * 100) : 0

  return (
    <div className="fade-in">
      <h1 className="t-screen" style={{ marginBottom: 16 }}>Calendar</h1>

      <div className="seg" style={{ marginBottom: 20 }}>
        <button className={view === 'month' ? 'active' : ''} onClick={() => { setView('month'); haptic() }}>Month</button>
        <button className={view === 'day' ? 'active' : ''} onClick={() => { setView('day'); haptic() }}>Day Planner</button>
      </div>

      {view === 'month' ? (
        <>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div className="stat-num">{pct}%</div><div className="t-caption">This month</div>
            </div>
            <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div className="stat-num">{active.reduce((mx, h) => Math.max(mx, currentStreak(h, log)), 0)}</div>
              <div className="t-caption">Best streak now</div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <button onClick={() => setMonth(new Date(year, m - 1, 1))} style={{ padding: 6 }}><ChevronLeft size={20} color="var(--text-2)" /></button>
              <span className="t-section">{monthName}</span>
              <button onClick={() => setMonth(new Date(year, m + 1, 1))} style={{ padding: 6 }}><ChevronRight size={20} color="var(--text-2)" /></button>
            </div>
            <div className="cal-grid" style={{ marginBottom: 8 }}>
              {WEEK_LABELS.map((d, i) => <div key={i} className="t-caption" style={{ textAlign: 'center' }}>{d}</div>)}
            </div>
            <div className="cal-grid">
              {Array.from({ length: firstDow }).map((_, i) => <div key={'e' + i} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const st = dayStatus(day)
                const colors = { done: 'var(--success)', partial: 'var(--warning)', missed: 'var(--border)', empty: 'transparent', future: 'transparent' }
                const isToday = todayKey(new Date(year, m, day)) === todayKey()
                return (
                  <div key={day} className="cal-day"
                    style={{ background: isToday ? 'var(--purple-light)' : 'transparent', color: st === 'future' ? 'var(--placeholder)' : 'var(--text)' }}>
                    {day}
                    {st !== 'empty' && st !== 'future' && <span className="cal-dot" style={{ background: colors[st] }} />}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <PlannerTimeline planner={planner} date={plannerDate} setDate={setPlannerDate}
          onAdd={onAddEvent} onEditEvent={onEditEvent} onLongEvent={onLongEvent} />
      )}
    </div>
  )
}

/* ============================================================ MORE ============================================================ */
function MorePage({ countdowns, goals, wishlist, onAdd, onEditGoal, onEditCountdown, onEditWish, onToggleWish, onLongCountdown, onLongGoal, onLongWish, onOpenProfile }) {
  const [section, setSection] = useState('countdowns')
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 16 }}>
        <h1 className="t-screen">More</h1>
        <button className="sync-pill" style={{ background: 'var(--lavender)', color: 'var(--purple)' }} onClick={onOpenProfile}>👑 Profile</button>
      </div>
      <div className="seg" style={{ marginBottom: 20 }}>
        <button className={section === 'countdowns' ? 'active' : ''} onClick={() => { setSection('countdowns'); haptic() }}>Countdowns</button>
        <button className={section === 'goals' ? 'active' : ''} onClick={() => { setSection('goals'); haptic() }}>Goals</button>
        <button className={section === 'wishlist' ? 'active' : ''} onClick={() => { setSection('wishlist'); haptic() }}>Wishlist</button>
      </div>
      {section === 'countdowns' && <CountdownsPage countdowns={countdowns} onAdd={() => onAdd('countdown')} onLongPress={onLongCountdown} onEdit={onEditCountdown} />}
      {section === 'goals' && <GoalsPage goals={goals} onAdd={() => onAdd('goal')} onEdit={onEditGoal} onLongPress={onLongGoal} />}
      {section === 'wishlist' && <WishlistPage wishlist={wishlist} onAdd={() => onAdd('wish')} onToggle={onToggleWish} onLongPress={onLongWish} onEdit={onEditWish} />}
    </div>
  )
}

/* ============================================================ REPORTS ============================================================ */
function Insights({ habits, log, todos }) {
  const [range, setRange] = useState('Week')
  const active = habits.filter(h => !h.archived)

  const doneOn = (d) => {
    const sched = active.filter(h => scheduledOn(h, d))
    return { done: sched.filter(h => isDone(h, log, todayKey(d))).length, total: sched.length }
  }

  let bars = [], rangeDone = 0, rangeSched = 0
  const today = new Date()
  if (range === 'Week') {
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const r = doneOn(d); rangeDone += r.done; rangeSched += r.total; bars.push({ label: WEEK_LABELS[mondayDow(d)], done: r.done, total: r.total || 1 }) }
  } else if (range === 'Month') {
    for (let w = 4; w >= 0; w--) { let dn = 0, tt = 0; for (let day = 0; day < 7; day++) { const d = new Date(); d.setDate(d.getDate() - (w * 7 + day)); const r = doneOn(d); dn += r.done; tt += r.total } rangeDone += dn; rangeSched += tt; bars.push({ label: w === 0 ? 'Now' : `${w}w`, done: dn, total: tt || 1 }) }
  } else {
    for (let mo = 11; mo >= 0; mo--) { const ref = new Date(today.getFullYear(), today.getMonth() - mo, 1); const di = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(); let dn = 0, tt = 0; for (let day = 1; day <= di; day++) { const d = new Date(ref.getFullYear(), ref.getMonth(), day); if (d > today) break; const r = doneOn(d); dn += r.done; tt += r.total } rangeDone += dn; rangeSched += tt; bars.push({ label: ref.toLocaleDateString('default', { month: 'narrow' }), done: dn, total: tt || 1 }) }
  }
  const maxDone = Math.max(1, ...bars.map(b => b.done))
  const successRate = rangeSched ? Math.round((rangeDone / rangeSched) * 100) : 0

  const best = active.map(h => ({ h, s: currentStreak(h, log) })).sort((a, b) => b.s - a.s)[0]
  const longestEver = active.reduce((mx, h) => Math.max(mx, longestStreak(h, log)), 0)
  const totalDone = active.reduce((sum, h) => sum + Object.values(log[h.id] || {}).filter(v => v === 'done' || (typeof v === 'number' && v > 0)).length, 0)
  const todosDone = (todos || []).filter(t => t.done).length

  const last7 = []
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(doneOn(d)) }
  const ACH = [
    { id: 'first', label: 'First Habit', icon: Sparkles, unlocked: active.length >= 1 },
    { id: '7', label: '7 Day Streak', icon: Flame, unlocked: longestEver >= 7 },
    { id: '30', label: '30 Day Streak', icon: Trophy, unlocked: longestEver >= 30 },
    { id: '100', label: '100 Done', icon: Award, unlocked: totalDone >= 100 },
    { id: 'pw', label: 'Perfect Week', icon: TrendingUp, unlocked: last7.every(w => w.total > 0 && w.done >= w.total) },
  ]

  const chartTitle = range === 'Week' ? 'This Week' : range === 'Month' ? 'Last 4 Weeks' : 'Last 12 Months'

  return (
    <div className="fade-in">
      <h1 className="t-screen" style={{ marginBottom: 6 }}>Reports</h1>
      <p className="t-help" style={{ marginBottom: 16 }}>A gentle look at your progress.</p>

      <div className="seg" style={{ marginBottom: 20 }}>
        {['Week', 'Month', 'Year'].map(r => (
          <button key={r} className={range === r ? 'active' : ''} onClick={() => { setRange(r); haptic() }}>{r}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard value={successRate + '%'} label="Success rate" />
        <StatCard value={rangeDone} label="Completed" />
        <StatCard value={best ? best.s : 0} label="Current streak" />
        <StatCard value={longestEver} label="Longest streak" />
        <StatCard value={totalDone} label="Total habits done" />
        <StatCard value={todosDone} label="To-dos done" />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="t-section" style={{ marginBottom: 16 }}>{chartTitle}</div>
        <div className="row" style={{ alignItems: 'flex-end', gap: range === 'Year' ? 5 : 10, height: 120 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 92, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: 6, height: `${(b.done / maxDone) * 100}%`, minHeight: b.done ? 6 : 2, background: b.done ? 'var(--purple)' : 'var(--purple-light)', transition: 'height 500ms cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <div className="t-caption" style={{ marginTop: 6, fontSize: 11 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {best && best.s > 0 && (
        <div className="card row" style={{ padding: 16, gap: 12, marginBottom: 20, background: 'var(--lavender)' }}>
          <Flame size={28} color="var(--pink)" />
          <div><div className="t-habit">{best.h.name}</div><div className="t-help">Strongest streak — {best.s} days. Keep the crown.</div></div>
        </div>
      )}

      <div className="section-head"><span className="t-section">Achievements</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ACH.map(a => { const I = a.icon; return (
          <div key={a.id} className={`card ach ${a.unlocked ? '' : 'locked'}`}>
            <I size={28} color={a.unlocked ? 'var(--pink)' : 'var(--placeholder)'} style={{ marginBottom: 8 }} />
            <div className="t-caption" style={{ fontWeight: 600, color: a.unlocked ? 'var(--text)' : 'var(--text-2)' }}>{a.label}</div>
          </div>
        )})}
      </div>
    </div>
  )
}

function StatCard({ value, label }) {
  return (
    <div className="card" style={{ padding: 16, textAlign: 'center' }}>
      <div className="stat-num">{value}</div>
      <div className="t-caption">{label}</div>
    </div>
  )
}

/* ============================================================ PROFILE ============================================================ */
function Profile({ user, habits, log, todos, goals, online, lastSync }) {
  const active = habits.filter(h => !h.archived)
  const totalDone = active.reduce((sum, h) => sum + Object.values(log[h.id] || {}).filter(v => v === 'done' || (typeof v === 'number' && v > 0)).length, 0)
  const bestEver = active.reduce((mx, h) => Math.max(mx, longestStreak(h, log)), 0)

  const exportData = () => {
    const payload = { habits, log, todos, goals }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'feten-backup.json'; a.click()
  }

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
        <div style={{ width: 88, height: 88, borderRadius: 999, margin: '0 auto 12px', background: 'linear-gradient(135deg, var(--purple), var(--pink))', display: 'grid', placeItems: 'center', fontSize: 40 }}>👑</div>
        <h1 className="t-screen">{user}</h1>
        <p className="t-help">"Small steps, beautifully kept."</p>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}><div className="stat-num">{active.length}</div><div className="t-caption">Habits</div></div>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}><div className="stat-num">{totalDone}</div><div className="t-caption">Completed</div></div>
        <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}><div className="stat-num">{bestEver}</div><div className="t-caption">Best streak</div></div>
      </div>
      <div className="card" style={{ padding: 4, marginBottom: 16 }}>
        <Row label="Cloud sync" value={syncEnabled ? (online ? 'On · Connected' : 'On · Offline') : 'Not set up'} />
        <Row label="Last synced" value={lastSync ? new Date(lastSync).toLocaleString() : '—'} />
        <Row label="Storage" value="On this device" last />
      </div>
      <button className="btn-ghost" style={{ width: '100%' }} onClick={exportData}>Export my data</button>
      <p className="t-caption" style={{ textAlign: 'center', marginTop: 24 }}>Feten's Habit Tracker · works offline, syncs when connected</p>
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
