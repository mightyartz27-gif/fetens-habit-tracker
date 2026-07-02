import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { todayKey, prettyDate, daysUntil, mondayDow, WEEK_LABELS_FULL, haptic } from './helpers'
import { CountdownRow, GoalCard, WishRow } from './features'

/* ============================================================
   PLANNER — Google-Calendar-style day timeline
   ============================================================ */
export function PlannerTimeline({ planner, date, setDate, onAdd, onEditEvent }) {
  const dayKey = todayKey(date)
  const events = (planner || []).filter(e => e.date === dayKey).sort((a, b) => a.start.localeCompare(b.start))
  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6:00 → 23:00

  const shift = (n) => { const d = new Date(date); d.setDate(d.getDate() + n); setDate(d); haptic() }
  const isToday = dayKey === todayKey()
  const label = date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })

  const eventsAt = (h) => events.filter(e => parseInt(e.start.split(':')[0], 10) === h)

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

      <div className="card" style={{ padding: 16 }}>
        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Clock size={32} color="var(--placeholder)" style={{ marginBottom: 8 }} />
            <p className="t-help">No events scheduled. Tap + to plan your day.</p>
          </div>
        )}
        {events.length > 0 && hours.map(h => {
          const hEvents = eventsAt(h)
          return (
            <div key={h} className="tl-row">
              <div className="tl-time">{String(h).padStart(2, '0')}:00</div>
              <div className="tl-track">
                {hEvents.map(e => (
                  <div key={e.id} className="tl-event" onClick={() => onEditEvent(e)}
                    style={{ background: e.color + '18', borderLeft: `3px solid ${e.color}` }}>
                    <div className="t-card" style={{ fontWeight: 600 }}>{e.title}</div>
                    <div className="t-caption">{e.start} – {e.end}</div>
                  </div>
                ))}
                <span className="tl-dot" style={{ background: hEvents.length ? hEvents[0].color : 'var(--border)' }} />
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onAdd}>
        <span className="row" style={{ gap: 8, justifyContent: 'center' }}><Plus size={18} /> Add event</span>
      </button>
    </div>
  )
}

/* ============================================================
   COUNTDOWNS page
   ============================================================ */
export function CountdownsPage({ countdowns, onAdd, onLongPress }) {
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
      {upcoming.map(cd => <CountdownRow key={cd.id} cd={cd} onLongPress={onLongPress} />)}
      {past.length > 0 && <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>Past</span></div>}
      {past.map(cd => <CountdownRow key={cd.id} cd={cd} onLongPress={onLongPress} />)}
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
export function WishlistPage({ wishlist, onAdd, onToggle, onLongPress }) {
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
      {want.map(w => <WishRow key={w.id} item={w} onToggle={onToggle} onLongPress={onLongPress} />)}
      {got.length > 0 && <div className="section-head"><span className="t-section" style={{ color: 'var(--text-2)' }}>Purchased</span></div>}
      {got.map(w => <WishRow key={w.id} item={w} onToggle={onToggle} onLongPress={onLongPress} />)}
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
