import { useState } from 'react'
import {
  ChevronLeft, Flame, Trophy, Target, Pencil, Pause, Play, Trash2,
  Check, Plus, X, ChevronRight, ChevronLeft as CL, CircleCheckBig,
} from 'lucide-react'
import {
  ICONS, todayKey, scheduledOn, currentStreak, longestStreak, isDone, uid, haptic,
} from './helpers'

export default function HabitDetail({
  habit, log, entries, onBack, onEdit, onPause, onDelete,
  onToggleDone, onSaveEntry,
}) {
  const [selDate, setSelDate] = useState(null)
  const [month, setMonth] = useState(new Date())
  const Icon = ICONS[habit.icon] || ICONS.Droplets

  const streak = currentStreak(habit, log)
  const longest = longestStreak(habit, log)
  const days = log[habit.id] || {}
  // Completion rate over scheduled days since creation
  let sched = 0, done = 0
  const start = new Date(habit.createdAt || Date.now())
  const cur = new Date(start)
  const today = new Date()
  while (cur <= today) {
    if (scheduledOn(habit, cur)) {
      sched++
      if (isDone(habit, log, todayKey(cur))) done++
    }
    cur.setDate(cur.getDate() + 1)
  }
  const rate = sched ? Math.round((done / sched) * 100) : 0

  // Heatmap grid for the visible month
  const year = month.getFullYear(), m = month.getMonth()
  const firstDow = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: 8, marginLeft: -8 }}>
          <ChevronLeft size={24} color="var(--text)" />
        </button>
        <span className="t-label" style={{ color: 'var(--text-2)' }}>Habit details</span>
      </div>

      <div className="row" style={{ gap: 14, marginBottom: 24 }}>
        <div className="habit-icon" style={{ background: habit.color + '20', width: 60, height: 60 }}>
          <Icon size={30} color={habit.color} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="t-screen">{habit.name}</h1>
          <div className="t-help">
            {habit.repeat}{habit.reminderOn ? ` · ${habit.time}` : ''}
            {habit.paused ? ' · Paused' : ''}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row" style={{ gap: 10, marginBottom: 24 }}>
        <Stat icon={Flame} color="var(--pink)" value={streak} label="Current" />
        <Stat icon={Trophy} color="var(--warning)" value={longest} label="Longest" />
        <Stat icon={Target} color="var(--purple)" value={rate + '%'} label="Rate" />
      </div>

      {/* Actions row */}
      <div className="row" style={{ gap: 10, marginBottom: 28 }}>
        <ActionBtn icon={Pencil} label="Edit" onClick={() => onEdit(habit)} />
        <ActionBtn icon={habit.paused ? Play : Pause} label={habit.paused ? 'Resume' : 'Pause'} onClick={() => onPause(habit)} />
        <ActionBtn icon={Trash2} label="Delete" danger onClick={() => onDelete(habit)} />
      </div>

      {/* Heatmap calendar */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} style={{ padding: 6 }}>
            <CL size={20} color="var(--text-2)" />
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
          {Array.from({ length: firstDow }).map((_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const d = new Date(year, m, day)
            const k = todayKey(d)
            const future = d > today
            const isSched = scheduledOn(habit, d)
            const completed = isDone(habit, log, k)
            const hasEntry = entries[habit.id]?.[k] && (
              entries[habit.id][k].note || (entries[habit.id][k].checklist || []).length
            )
            const isToday = k === todayKey()
            let bg = 'transparent'
            if (completed) bg = habit.color
            else if (isSched && !future) bg = habit.color + '18'
            return (
              <button key={day} className="cal-day" onClick={() => { setSelDate(k); haptic() }}
                style={{
                  background: bg,
                  color: completed ? '#fff' : future ? 'var(--placeholder)' : 'var(--text)',
                  border: isToday ? '2px solid var(--purple)' : '2px solid transparent',
                  fontWeight: completed ? 700 : 500,
                }}>
                {day}
                {hasEntry ? <span className="cal-dot" style={{ background: completed ? '#fff' : habit.color, bottom: 4 }} /> : null}
              </button>
            )
          })}
        </div>
        <p className="t-caption" style={{ marginTop: 12, textAlign: 'center' }}>
          Tap any day to mark it done or add notes.
        </p>
      </div>

      {selDate && (
        <DayEditor
          habit={habit} dateKey={selDate}
          done={isDone(habit, log, selDate)}
          entry={entries[habit.id]?.[selDate] || { note: '', checklist: [] }}
          onClose={() => setSelDate(null)}
          onToggleDone={() => onToggleDone(habit, selDate)}
          onSaveEntry={(e) => onSaveEntry(habit, selDate, e)}
        />
      )}
    </div>
  )
}

function Stat({ icon: I, color, value, label }) {
  return (
    <div className="card" style={{ flex: 1, padding: '16px 8px', textAlign: 'center' }}>
      <I size={20} color={color} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
      <div className="t-caption">{label}</div>
    </div>
  )
}

function ActionBtn({ icon: I, label, onClick, danger }) {
  return (
    <button onClick={onClick} className="card" style={{
      flex: 1, padding: '14px 8px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 6,
    }}>
      <I size={20} color={danger ? 'var(--error)' : 'var(--purple)'} />
      <span className="t-caption" style={{ fontWeight: 600, color: danger ? 'var(--error)' : 'var(--text)' }}>{label}</span>
    </button>
  )
}

function DayEditor({ habit, dateKey, done, entry, onClose, onToggleDone, onSaveEntry }) {
  const [note, setNote] = useState(entry.note || '')
  const [checklist, setChecklist] = useState(entry.checklist || [])
  const [newItem, setNewItem] = useState('')
  const d = new Date(dateKey)
  const Icon = ICONS[habit.icon] || ICONS.Droplets

  const persist = (nextNote, nextList) => onSaveEntry({ note: nextNote, checklist: nextList })

  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    const next = [...checklist, { id: uid(), text, done: false }]
    setChecklist(next); setNewItem(''); persist(note, next); haptic()
  }
  const toggleItem = (id) => {
    const next = checklist.map(c => c.id === id ? { ...c, done: !c.done } : c)
    setChecklist(next); persist(note, next); haptic()
  }
  const removeItem = (id) => {
    const next = checklist.filter(c => c.id !== id)
    setChecklist(next); persist(note, next)
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grab" />
        <div className="row between" style={{ marginBottom: 20 }}>
          <div>
            <div className="t-section">{d.toLocaleDateString('default', { weekday: 'long' })}</div>
            <div className="t-help">{d.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <button onClick={onClose} style={{ padding: 8 }}><X size={22} color="var(--text-2)" /></button>
        </div>

        {/* Done toggle */}
        <button onClick={onToggleDone} className="row between" style={{
          width: '100%', padding: 16, borderRadius: 'var(--r-card)',
          background: done ? habit.color + '18' : 'var(--lavender)',
          border: `1.5px solid ${done ? habit.color : 'var(--border)'}`, marginBottom: 24,
        }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="habit-icon" style={{ background: habit.color + '20', width: 40, height: 40 }}>
              <Icon size={20} color={habit.color} />
            </div>
            <span className="t-habit">{done ? 'Completed' : 'Mark as done'}</span>
          </div>
          <div className="check-btn" style={done
            ? { background: habit.color, borderColor: habit.color }
            : { borderColor: 'var(--placeholder)' }}>
            {done ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
          </div>
        </button>
        {done && <p className="t-caption" style={{ marginTop: -16, marginBottom: 20, textAlign: 'center' }}>Tap again to undo.</p>}

        {/* Note */}
        <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Note</label>
        <textarea className="input" rows={2} placeholder="e.g. shop chocolate"
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={() => persist(note, checklist)}
          style={{ resize: 'none', marginBottom: 24 }} />

        {/* Checklist */}
        <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Checklist</label>
        {checklist.map(item => (
          <div key={item.id} className="row" style={{ gap: 12, padding: '8px 0' }}>
            <button className={`check-btn ${item.done ? 'done' : ''}`} onClick={() => toggleItem(item.id)}
              style={{ width: 28, height: 28, ...(item.done ? { background: habit.color, borderColor: habit.color } : {}) }}>
              {item.done ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
            </button>
            <span className="t-card" style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-2)' : 'var(--text)' }}>
              {item.text}
            </span>
            <button onClick={() => removeItem(item.id)} style={{ padding: 4 }}>
              <X size={16} color="var(--placeholder)" />
            </button>
          </div>
        ))}
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          <input className="input" placeholder="Add an item" value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem() }}
            style={{ flex: 1 }} />
          <button onClick={addItem} className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
            <Plus size={20} color="#fff" />
          </button>
        </div>
      </div>
    </>
  )
}
