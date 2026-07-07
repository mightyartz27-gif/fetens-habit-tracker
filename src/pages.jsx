import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, Check } from 'lucide-react'
import { todayKey, prettyDate, daysUntil, mondayDow, WEEK_LABELS_FULL, haptic, ICONS, isDone, currentStreak, scheduledOn } from './helpers'
import { CountdownRow, GoalCard, WishRow, TodoCard, useLongPress } from './features'

/* ============================================================
   PLANNER — Google-Calendar-style day timeline
   ============================================================ */
export function PlannerTimeline({ planner, date, setDate, onAdd, onEditEvent, onLongEvent }) {
  const dayKey = todayKey(date)
  const events = (planner || []).filter(e => e.date === dayKey).sort((a, b) => a.start.localeCompare(b.start))

  const shift = (n) => { const d = new Date(date); d.setDate(d.getDate() + n); setDate(d); haptic() }
  const isToday = dayKey === todayKey()
  const label = date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      <div className="row between" style={{ marginBottom: 16 }}>
        <button onClick={() => shift(-1)} style={{ padding: 6 }}><ChevronLeft size={20} color="var(--text-2)" /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="t-section" style={{ fontSize: 17 }}>{label}</div>
          {isToday && <div className="t-caption" style={{ color: 'var(--purple)' }}>Today</div>}
        </div>
        <button onClick={() => shift(1)} style={{ padding: 6 }}><ChevronRight size={20} color="var(--text-2)" /></button>
      </div>

      {events.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Clock size={32} color="var(--placeholder)" style={{ marginBottom: 8 }} />
            <p className="t-help">No events scheduled. Tap + to plan your day.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '12px 8px' }}>
          {events.map((e, i) => (
            <PlannerEventRow key={e.id} e={e} first={i === 0} last={i === events.length - 1}
              onEdit={() => onEditEvent(e)} onLong={() => onLongEvent(e)} />
          ))}
        </div>
      )}

      <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onAdd}>
        <span className="row" style={{ gap: 8, justifyContent: 'center' }}><Plus size={18} /> Add event</span>
      </button>
    </div>
  )
}

function PlannerEventRow({ e, first, last, onEdit, onLong }) {
  const lp = useLongPress(onLong)
  return (
    <div className="pl-row" {...lp.handlers} onClick={(ev) => { if (!lp.suppressClick(ev)) onEdit() }}>
      {/* time gutter */}
      <div className="pl-time">{e.start}</div>
      {/* rail with hollow circle + connecting line */}
      <div className="pl-rail">
        <span className="pl-line pl-line-top" style={{ opacity: first ? 0 : 1 }} />
        <span className="pl-dot" style={{ borderColor: e.color }} />
        <span className="pl-line pl-line-bottom" style={{ opacity: last ? 0 : 1 }} />
      </div>
      {/* event body — full width, never cropped */}
      <div className="pl-body">
        <div className="t-caption" style={{ color: e.color, fontWeight: 700, marginBottom: 3 }}>{e.start} – {e.end}</div>
        <div className="pl-title">{e.title}</div>
      </div>
    </div>
  )
}

/* ============================================================
   COUNTDOWNS page
   ============================================================ */
export function CountdownsPage({ countdowns, onAdd, onLongPress, onEdit }) {
  const sorted = [...(countdowns || [])].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
  const upcoming = sorted.filter(c => daysUntil(c.date) >= 0)
  const past = sorted.filter(c => daysUntil(c.date) < 0)
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="t-screen">Countdowns</h1>
        <button className="btn-ghost" onClick={onAdd} style={{ padding: '8px 14px' }}>
          <span className="row" style={{ gap: 6 }}><Plus size={16} /> New</span>
        </button>
      </div>
      {sorted.length === 0 && <EmptyCard emoji="🎉" title="No countdowns yet" text="Count down to birthdays, trips, or paydays." />}
      {upcoming.map(cd => <CountdownRow key={cd.id} cd={cd} onLongPress={onLongPress} onEdit={onEdit} />)}
      {past.length > 0 && <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>Past</span></div>}
      {past.map(cd => <CountdownRow key={cd.id} cd={cd} onLongPress={onLongPress} onEdit={onEdit} />)}
    </div>
  )
}

/* ============================================================
   GOALS page
   ============================================================ */
export function GoalsPage({ goals, onAdd, onEdit, onLongPress }) {
  const active = (goals || []).filter(g => !g.done)
  const done = (goals || []).filter(g => g.done)
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="t-screen">Goals</h1>
        <button className="btn-ghost" onClick={onAdd} style={{ padding: '8px 14px' }}>
          <span className="row" style={{ gap: 6 }}><Plus size={16} /> New</span>
        </button>
      </div>
      {(goals || []).length === 0 && <EmptyCard emoji="🎯" title="No goals yet" text="Set a target and track your progress toward it." />}
      {active.map(g => <GoalCard key={g.id} goal={g} onEdit={onEdit} onLongPress={onLongPress} />)}
      {done.length > 0 && <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>Achieved</span></div>}
      {done.map(g => <GoalCard key={g.id} goal={g} onEdit={onEdit} onLongPress={onLongPress} />)}
    </div>
  )
}

/* ============================================================
   WISHLIST page
   ============================================================ */
export function WishlistPage({ wishlist, onAdd, onToggle, onLongPress, onEdit }) {
  const want = (wishlist || []).filter(w => !w.purchased)
  const got = (wishlist || []).filter(w => w.purchased)
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="t-screen">Wishlist</h1>
        <button className="btn-ghost" onClick={onAdd} style={{ padding: '8px 14px' }}>
          <span className="row" style={{ gap: 6 }}><Plus size={16} /> New</span>
        </button>
      </div>
      {(wishlist || []).length === 0 && <EmptyCard emoji="🛍️" title="Wishlist is empty" text="Add things you're saving up for." />}
      {want.map(w => <WishRow key={w.id} item={w} onToggle={onToggle} onLongPress={onLongPress} onEdit={onEdit} />)}
      {got.length > 0 && <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>Purchased</span></div>}
      {got.map(w => <WishRow key={w.id} item={w} onToggle={onToggle} onLongPress={onLongPress} onEdit={onEdit} />)}
    </div>
  )
}

export function EmptyCard({ emoji, title, text }) {
  return (
    <div className="card fade-in" style={{ padding: 36, textAlign: 'center', marginTop: 8 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{emoji}</div>
      <div className="t-section" style={{ marginBottom: 6 }}>{title}</div>
      <p className="t-help">{text}</p>
    </div>
  )
}

/* ============================================================
   HABITS page (all habits, completed stay visible)
   ============================================================ */
export function HabitsPage({ habits, log, onAdd, onOpen, onToggle, onLongPress }) {
  const active = (habits || []).filter(h => !h.archived)
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="t-screen">Habits</h1>
        <button className="btn-ghost" onClick={onAdd} style={{ padding: '8px 14px' }}>
          <span className="row" style={{ gap: 6 }}><Plus size={16} /> New</span>
        </button>
      </div>
      {active.length === 0 && <EmptyCard emoji="🌸" title="No habits yet" text="Create your first habit to start building a routine." />}
      {active.map(h => {
        const dn = isDone(h, log)
        const Icon = ICONS[h.icon] || ICONS.Droplets
        const lp = useLongPress(() => onLongPress(h))
        return (
          <div key={h.id} className="habit-card" {...lp.handlers}
            onClick={(e) => { if (!lp.suppressClick(e)) onOpen(h) }} role="button"
            style={{ opacity: h.paused ? 0.55 : dn ? 0.72 : 1 }}>
            <div className="habit-icon" style={{ background: h.color + '20' }}><Icon size={22} color={h.color} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-habit" style={{ textDecoration: dn ? 'line-through' : 'none' }}>{h.name}</div>
              <div className="t-caption">{h.paused ? '⏸ Paused · ' : ''}{h.repeat} · 🔥 {currentStreak(h, log)}</div>
            </div>
            {h.paused ? (
              <span className="pri-pill" style={{ background: 'var(--lavender)', color: 'var(--text-2)' }}>Paused</span>
            ) : (
              <button className={`check-btn ${dn ? 'done' : ''}`} onClick={(e) => { e.stopPropagation(); haptic(); onToggle(h) }}
                style={dn ? { background: h.color, borderColor: h.color } : {}}>
                {dn ? <Check size={18} color="#fff" strokeWidth={3} /> : <Check size={16} color="var(--placeholder)" />}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   TODO LIST page (all todos, completed stay visible)
   ============================================================ */
export function TodosPage({ todos, onAdd, onToggle, onLongPress, onEdit }) {
  const pending = (todos || []).filter(t => !t.done)
  const done = (todos || []).filter(t => t.done)
  return (
    <div className="fade-in">
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="t-screen">To-do List</h1>
        <button className="btn-ghost" onClick={onAdd} style={{ padding: '8px 14px' }}>
          <span className="row" style={{ gap: 6 }}><Plus size={16} /> New</span>
        </button>
      </div>
      {(todos || []).length === 0 && <EmptyCard emoji="✅" title="No to-dos yet" text="Add a task to get started." />}
      {pending.map(t => <TodoCard key={t.id} todo={t} onToggle={onToggle} onLongPress={onLongPress} onEdit={onEdit} />)}
      {done.length > 0 && <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>Completed</span></div>}
      {done.map(t => <TodoCard key={t.id} todo={t} onToggle={onToggle} onLongPress={onLongPress} onEdit={onEdit} />)}
    </div>
  )
}
