import { useState, useRef, useEffect } from 'react'
import {
  X, Plus, Check, Trash2, Calendar as CalIcon, Clock, Flag, Target,
  Gift, ShoppingCart, ChevronRight, TrendingUp,
} from 'lucide-react'
import {
  PRIORITIES, PRIORITY_COLOR, TODO_REPEATS, COUNTDOWN_ICONS, GOAL_CATEGORIES,
  daysUntil, prettyDate, uid, haptic, todayKey,
} from './helpers'

/* ============================================================
   Shared: long-press to delete (with confirm dialog in App)
   ============================================================ */
export function useLongPress(onLong, ms = 500) {
  const timer = useRef(null)
  const fired = useRef(false)

  const start = () => {
    fired.current = false
    timer.current = setTimeout(() => { fired.current = true; haptic(); onLong() }, ms)
  }
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }

  // Called by the element's onClick — returns true if the click should be
  // ignored because a long-press already fired.
  const suppressClick = (e) => {
    if (fired.current) { e.preventDefault(); e.stopPropagation(); fired.current = false; return true }
    return false
  }

  return {
    handlers: {
      onTouchStart: start, onTouchEnd: clear, onTouchMove: clear,
      onMouseDown: start, onMouseUp: clear, onMouseLeave: clear,
    },
    suppressClick,
  }
}

/* ============================================================
   TO-DO
   ============================================================ */
export function TodoCard({ todo, onToggle, onLongPress, onEdit }) {
  const lp = useLongPress(() => onLongPress(todo))
  const overdue = todo.due && daysUntil(todo.due) < 0 && !todo.done
  return (
    <div className="habit-card" {...lp.handlers} style={{ opacity: todo.done ? 0.6 : 1 }}>
      <button className={`check-btn ${todo.done ? 'done' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(todo) }}
        style={todo.done ? { background: 'var(--purple)', borderColor: 'var(--purple)' } : {}}>
        {todo.done ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
      </button>
      <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => { if (onEdit && !lp.suppressClick(e)) onEdit(todo) }}>
        <div className="t-habit" style={{ marginBottom: 2, textDecoration: todo.done ? 'line-through' : 'none' }}>
          {todo.title}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {todo.due && (
            <span className="t-caption" style={{ color: overdue ? 'var(--error)' : 'var(--text-2)' }}>
              {prettyDate(todo.due)}{todo.time ? ` · ${todo.time}` : ''}
            </span>
          )}
          {todo.repeat && todo.repeat !== 'None' && <span className="t-caption">· {todo.repeat}</span>}
        </div>
      </div>
      <span className="pri-pill" style={{ background: PRIORITY_COLOR[todo.priority] + '22', color: PRIORITY_COLOR[todo.priority] }}>
        {todo.priority}
      </span>
    </div>
  )
}

export function CreateTodo({ onClose, onSave, editing }) {
  const [title, setTitle] = useState(editing?.title || '')
  const [desc, setDesc] = useState(editing?.desc || '')
  const [due, setDue] = useState(editing?.due || todayKey())
  const [time, setTime] = useState(editing?.time || '')
  const [priority, setPriority] = useState(editing?.priority || 'Medium')
  const [repeat, setRepeat] = useState(editing?.repeat || 'None')

  const save = () => {
    if (!title.trim()) return
    onSave({
      id: editing?.id || uid(), title: title.trim(), desc: desc.trim(),
      due, time, priority, repeat, done: editing?.done || false,
      createdAt: editing?.createdAt || new Date().toISOString(),
    })
  }

  return (
    <Sheet onClose={onClose} title={editing ? 'Edit To-do' : 'New To-do'}>
      <Field label="Title">
        <input className="input" autoFocus placeholder="e.g. Call the dentist" value={title}
          onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Description (optional)">
        <textarea className="input" rows={2} placeholder="Any details…" value={desc}
          onChange={e => setDesc(e.target.value)} />
      </Field>
      <div className="row" style={{ gap: 12 }}>
        <Field label="Due date" style={{ flex: 1 }}>
          <input type="date" className="input" value={due} onChange={e => setDue(e.target.value)} />
        </Field>
        <Field label="Time (optional)" style={{ flex: 1 }}>
          <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Priority">
        <div className="row" style={{ gap: 10 }}>
          {PRIORITIES.map(p => (
            <button key={p} onClick={() => { setPriority(p); haptic() }}
              className={`chip ${priority === p ? 'active' : ''}`} style={{ flex: 1 }}>{p}</button>
          ))}
        </div>
      </Field>
      <Field label="Repeat">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {TODO_REPEATS.map(r => (
            <button key={r} onClick={() => { setRepeat(r); haptic() }}
              className={`chip ${repeat === r ? 'active' : ''}`}>{r}</button>
          ))}
        </div>
      </Field>
      <button className="btn-primary" disabled={!title.trim()} onClick={save} style={{ marginTop: 8 }}>
        {editing ? 'Save changes' : 'Add To-do'}
      </button>
    </Sheet>
  )
}

/* ============================================================
   COUNTDOWN
   ============================================================ */
export function CountdownRow({ cd, onLongPress, onEdit }) {
  const lp = useLongPress(() => onLongPress(cd))
  const d = daysUntil(cd.date)
  const future = d >= 0
  return (
    <div className="habit-card" {...lp.handlers} onClick={(e) => { if (onEdit && !lp.suppressClick(e)) onEdit(cd) }}>
      <div className="habit-icon" style={{ background: 'var(--lavender)', fontSize: 24 }}>{cd.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-habit">{cd.title}</div>
        <div className="t-caption">{prettyDate(cd.date)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="cd-num" style={{ color: future ? 'var(--purple)' : 'var(--success)' }}>
          {Math.abs(d)}
        </div>
        <div className="t-caption">{future ? (d === 0 ? 'Today!' : 'days until') : 'days since'}</div>
      </div>
    </div>
  )
}

export function CreateCountdown({ onClose, onSave, editing }) {
  const [title, setTitle] = useState(editing?.title || '')
  const [icon, setIcon] = useState(editing?.icon || '🎂')
  const [date, setDate] = useState(editing?.date || todayKey())

  const save = () => {
    if (!title.trim()) return
    onSave({ id: editing?.id || uid(), title: title.trim(), icon, date, createdAt: editing?.createdAt || new Date().toISOString() })
  }
  return (
    <Sheet onClose={onClose} title={editing ? 'Edit Countdown' : 'New Countdown'}>
      <Field label="What are you counting down to?">
        <input className="input" autoFocus placeholder="e.g. Birthday" value={title}
          onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Icon">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          {COUNTDOWN_ICONS.map(ic => (
            <button key={ic} onClick={() => { setIcon(ic); haptic() }}
              className={`icon-pick ${icon === ic ? 'active' : ''}`} style={{ fontSize: 24 }}>{ic}</button>
          ))}
        </div>
      </Field>
      <Field label="Date">
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <button className="btn-primary" disabled={!title.trim()} onClick={save} style={{ marginTop: 8 }}>
        {editing ? 'Save changes' : 'Add Countdown'}
      </button>
    </Sheet>
  )
}

/* ============================================================
   GOALS
   ============================================================ */
export function GoalCard({ goal, onEdit, onLongPress }) {
  const lp = useLongPress(() => onLongPress(goal))
  const pct = Math.max(0, Math.min(100, goal.progress || 0))
  return (
    <div className="card" {...lp.handlers} onClick={(e) => { if (!lp.suppressClick(e)) onEdit(goal) }} style={{ padding: 16, marginBottom: 12 }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="chip" style={{ padding: '3px 10px', fontSize: 11, background: 'var(--lavender)', color: 'var(--purple)', border: 'none' }}>{goal.category}</span>
          {goal.done && <span className="pri-pill" style={{ background: 'var(--success)22', color: 'var(--success)' }}>Done</span>}
        </div>
        <span className="t-caption">{goal.target ? prettyDate(goal.target) : ''}</span>
      </div>
      <div className="t-habit" style={{ marginBottom: 10 }}>{goal.title}</div>
      <div className="row" style={{ gap: 10 }}>
        <div className="pbar" style={{ flex: 1 }}>
          <i style={{ width: pct + '%', background: goal.done ? 'var(--success)' : 'var(--purple)' }} />
        </div>
        <span className="t-label" style={{ minWidth: 38, textAlign: 'right' }}>{pct}%</span>
      </div>
      {goal.notes ? <p className="t-help" style={{ marginTop: 10 }}>{goal.notes}</p> : null}
    </div>
  )
}

export function CreateGoal({ onClose, onSave, editing }) {
  const [title, setTitle] = useState(editing?.title || '')
  const [category, setCategory] = useState(editing?.category || 'Personal')
  const [progress, setProgress] = useState(editing?.progress ?? 0)
  const [target, setTarget] = useState(editing?.target || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [done, setDone] = useState(editing?.done || false)

  const save = () => {
    if (!title.trim()) return
    onSave({
      id: editing?.id || uid(), title: title.trim(), category,
      progress: Number(progress), target, notes: notes.trim(), done,
      createdAt: editing?.createdAt || new Date().toISOString(),
    })
  }
  return (
    <Sheet onClose={onClose} title={editing ? 'Edit Goal' : 'New Goal'}>
      <Field label="Goal">
        <input className="input" autoFocus placeholder="e.g. Read 24 books this year" value={title}
          onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Category">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {GOAL_CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCategory(c); haptic() }}
              className={`chip ${category === c ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
      </Field>
      <Field label={`Progress — ${progress}%`}>
        <input type="range" min={0} max={100} step={5} value={progress}
          onChange={e => setProgress(e.target.value)} style={{ width: '100%', accentColor: 'var(--purple)' }} />
      </Field>
      <Field label="Target date (optional)">
        <input type="date" className="input" value={target} onChange={e => setTarget(e.target.value)} />
      </Field>
      <Field label="Notes (optional)">
        <textarea className="input" rows={2} placeholder="Why this matters…" value={notes}
          onChange={e => setNotes(e.target.value)} />
      </Field>
      <button onClick={() => { setDone(!done); haptic() }} className="row between" style={{
        width: '100%', padding: 14, borderRadius: 'var(--r-btn)', marginBottom: 16,
        background: done ? 'var(--success)18' : 'var(--lavender)',
        border: `1.5px solid ${done ? 'var(--success)' : 'var(--border)'}`,
      }}>
        <span className="t-card" style={{ fontWeight: 600 }}>Mark as achieved</span>
        <div className="check-btn" style={done ? { background: 'var(--success)', borderColor: 'var(--success)', width: 28, height: 28 } : { width: 28, height: 28 }}>
          {done ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
        </div>
      </button>
      <button className="btn-primary" disabled={!title.trim()} onClick={save}>
        {editing ? 'Save changes' : 'Add Goal'}
      </button>
    </Sheet>
  )
}

/* ============================================================
   WISHLIST
   ============================================================ */
export function WishRow({ item, onToggle, onLongPress, onEdit }) {
  const lp = useLongPress(() => onLongPress(item))
  return (
    <div className="habit-card" {...lp.handlers} style={{ opacity: item.purchased ? 0.6 : 1 }}>
      <button className={`check-btn ${item.purchased ? 'done' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(item) }}
        style={item.purchased ? { background: 'var(--success)', borderColor: 'var(--success)' } : {}}>
        {item.purchased ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
      </button>
      <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => { if (onEdit && !lp.suppressClick(e)) onEdit(item) }}>
        <div className="t-habit" style={{ textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.title}</div>
        {item.note ? <div className="t-caption">{item.note}</div> : null}
      </div>
      {item.price ? <span className="t-habit" style={{ color: 'var(--purple)' }}>{item.price}</span> : null}
    </div>
  )
}

export function CreateWish({ onClose, onSave, editing }) {
  const [title, setTitle] = useState(editing?.title || '')
  const [price, setPrice] = useState(editing?.price || '')
  const [note, setNote] = useState(editing?.note || '')

  const save = () => {
    if (!title.trim()) return
    onSave({ id: editing?.id || uid(), title: title.trim(), price: price.trim(), note: note.trim(),
      purchased: editing?.purchased || false, createdAt: editing?.createdAt || new Date().toISOString() })
  }
  return (
    <Sheet onClose={onClose} title={editing ? 'Edit Wish' : 'New Wish'}>
      <Field label="Item">
        <input className="input" autoFocus placeholder="e.g. MacBook Air" value={title}
          onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Estimated price (optional)">
        <input className="input" placeholder="e.g. $1200" value={price} onChange={e => setPrice(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <input className="input" placeholder="Color, model, link…" value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <button className="btn-primary" disabled={!title.trim()} onClick={save} style={{ marginTop: 8 }}>
        {editing ? 'Save changes' : 'Add to Wishlist'}
      </button>
    </Sheet>
  )
}

/* ============================================================
   PLANNER — timeline event
   ============================================================ */
export function CreatePlannerEvent({ onClose, onSave, editing, defaultDate, onDelete }) {
  const [title, setTitle] = useState(editing?.title || '')
  const [date, setDate] = useState(editing?.date || defaultDate || todayKey())
  const [start, setStart] = useState(editing?.start || '09:00')
  const [end, setEnd] = useState(editing?.end || '10:00')
  const [color, setColor] = useState(editing?.color || '#7C3AED')

  const save = () => {
    if (!title.trim()) return
    onSave({ id: editing?.id || uid(), title: title.trim(), date, start, end, color,
      createdAt: editing?.createdAt || new Date().toISOString() })
  }
  const swatches = ['#7C3AED', '#EC4899', '#3B82F6', '#22C55E', '#FB923C', '#38BDF8']
  return (
    <Sheet onClose={onClose} title={editing ? 'Edit event' : 'New event'}>
      <Field label="What's happening?">
        <input className="input" autoFocus placeholder="e.g. Gym" value={title} onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Date">
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <div className="row" style={{ gap: 12 }}>
        <Field label="Start" style={{ flex: 1 }}>
          <input type="time" className="input" value={start} onChange={e => setStart(e.target.value)} />
        </Field>
        <Field label="End" style={{ flex: 1 }}>
          <input type="time" className="input" value={end} onChange={e => setEnd(e.target.value)} />
        </Field>
      </div>
      <Field label="Color">
        <div className="row" style={{ gap: 12 }}>
          {swatches.map(s => (
            <button key={s} onClick={() => { setColor(s); haptic() }}
              className={`swatch ${color === s ? 'active' : ''}`} style={{ background: s }} />
          ))}
        </div>
      </Field>
      <button className="btn-primary" disabled={!title.trim()} onClick={save} style={{ marginTop: 8 }}>
        {editing ? 'Save changes' : 'Add event'}
      </button>
      {editing && onDelete && (
        <button className="btn-ghost" style={{ width: '100%', marginTop: 12, color: 'var(--error)' }}
          onClick={() => onDelete(editing)}>Delete event</button>
      )}
    </Sheet>
  )
}

/* ============================================================
   Shared Sheet + Field primitives (keyboard-friendly)
   ============================================================ */
export function Sheet({ onClose, title, children }) {
  const sheetRef = useRef(null)

  // iOS keyboard fix: a position:fixed;bottom:0 sheet stays pinned to the
  // layout viewport, so the on-screen keyboard covers it. We watch the
  // visualViewport and lift the sheet by the keyboard's height so inputs
  // stay visible. Tapping outside / closing the keyboard resets it.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const el = sheetRef.current
      if (!el) return
      // keyboard height = layout height - visual viewport height - offsetTop
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      el.style.transform = `translateX(-50%) translateY(-${keyboard}px)`
      // if a focused input would still be hidden, nudge it into view
      const active = document.activeElement
      if (keyboard > 0 && active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize) }
  }, [])

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" ref={sheetRef}>
        <div className="sheet-grab" />
        <div className="row between" style={{ marginBottom: 20 }}>
          <span className="t-section">{title}</span>
          <button onClick={onClose} style={{ padding: 8 }}><X size={22} color="var(--text-2)" /></button>
        </div>
        {children}
      </div>
    </>
  )
}

export function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  )
}

/* ============================================================
   Create-type chooser (the "+" modal)
   ============================================================ */
export function CreateChooser({ onClose, onPick }) {
  const opts = [
    { id: 'habit', label: 'Habit', icon: TrendingUp, color: '#7C3AED', desc: 'Build a routine' },
    { id: 'todo', label: 'To-do', icon: Check, color: '#3B82F6', desc: 'One-off task' },
    { id: 'countdown', label: 'Countdown', icon: Gift, color: '#EC4899', desc: 'Count to a date' },
    { id: 'goal', label: 'Goal', icon: Target, color: '#22C55E', desc: 'Track progress' },
    { id: 'wish', label: 'Wishlist', icon: ShoppingCart, color: '#FB923C', desc: 'Something to buy' },
    { id: 'event', label: 'Schedule', icon: Clock, color: '#38BDF8', desc: 'Plan your day' },
  ]
  return (
    <Sheet onClose={onClose} title="What would you like to create?">
      <div className="chooser-grid">
        {opts.map(o => {
          const I = o.icon
          return (
            <button key={o.id} className="chooser-btn" onClick={() => { haptic(); onPick(o.id) }}>
              <div className="chooser-ic" style={{ background: o.color + '20' }}>
                <I size={24} color={o.color} />
              </div>
              <div>
                <div className="t-card" style={{ fontWeight: 700 }}>{o.label}</div>
                <div className="t-caption">{o.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/* ============================================================
   Generic delete confirmation
   ============================================================ */
export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <Sheet onClose={onCancel} title={title}>
      <p className="t-help" style={{ marginBottom: 24 }}>{message}</p>
      <button className="btn-primary" style={{ background: 'var(--error)', marginBottom: 12 }} onClick={onConfirm}>
        {confirmLabel || 'Delete'}
      </button>
      <button className="btn-ghost" style={{ width: '100%' }} onClick={onCancel}>Cancel</button>
    </Sheet>
  )
}
