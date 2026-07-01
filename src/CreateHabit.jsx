import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { ICONS, ICON_LIST, COLORS, REPEATS, GOAL_TYPES, uid, haptic } from './helpers'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CreateHabit({ onClose, onSave, editing }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState(editing?.name || '')
  const [icon, setIcon] = useState(editing?.icon || 'Droplets')
  const [color, setColor] = useState(editing?.color || COLORS[0].hex)
  const [repeat, setRepeat] = useState(editing?.repeat || 'Daily')
  const [days, setDays] = useState(editing?.days || [1, 2, 3, 4, 5])
  const [reminderOn, setReminderOn] = useState(editing?.reminderOn || false)
  const [time, setTime] = useState(editing?.time || '08:00')
  const [message, setMessage] = useState(editing?.message || '')
  const [goalType, setGoalType] = useState(editing?.goalType || 'Simple Check')
  const [goalTarget, setGoalTarget] = useState(editing?.goalTarget || 8)
  const [goalUnit, setGoalUnit] = useState(editing?.goalUnit || 'glasses')

  const Icon = ICONS[icon]
  const canNext = step !== 1 || name.trim().length > 0

  const next = () => { haptic(); step < 6 ? setStep(step + 1) : save() }
  const back = () => step > 1 && setStep(step - 1)

  const save = () => {
    const habit = {
      id: editing?.id || uid(),
      name: name.trim(), icon, color, repeat, days,
      reminderOn, time, message,
      goalType, goalTarget: goalType === 'Simple Check' ? 1 : Number(goalTarget), goalUnit,
      createdAt: editing?.createdAt || new Date().toISOString(),
      archived: false, paused: false,
    }
    onSave(habit)
  }

  const toggleDay = (i) => setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i])

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grab" />
        <div className="row between" style={{ marginBottom: 8 }}>
          <button onClick={step === 1 ? onClose : back} style={{ padding: 8 }}>
            {step === 1 ? <X size={22} color="var(--text-2)" /> : <ChevronLeft size={22} color="var(--text-2)" />}
          </button>
          <span className="t-label" style={{ color: 'var(--text-2)' }}>Step {step} of 6</span>
          <div style={{ width: 38 }} />
        </div>

        {/* Progress dots */}
        <div className="row" style={{ gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} style={{
              height: 5, borderRadius: 999, flex: s === step ? 3 : 1,
              background: s <= step ? 'var(--purple)' : 'var(--border)',
              transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
            }} />
          ))}
        </div>

        <div style={{ minHeight: 260 }}>
          {step === 1 && (
            <div className="fade-in">
              <h2 className="t-screen" style={{ marginBottom: 8 }}>What's the habit?</h2>
              <p className="t-help" style={{ marginBottom: 20 }}>Give it a name you'll recognize at a glance.</p>
              <input className="input" autoFocus placeholder="e.g. Drink Water" value={name}
                onChange={e => setName(e.target.value)} maxLength={40} />
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                {['Drink Water', 'Meditate', 'Read', 'Walk', 'Study'].map(s => (
                  <button key={s} className="chip" onClick={() => setName(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h2 className="t-screen" style={{ marginBottom: 8 }}>Pick an icon</h2>
              <p className="t-help" style={{ marginBottom: 20 }}>Choose one that feels right.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {ICON_LIST.map(k => {
                  const I = ICONS[k]
                  return (
                    <button key={k} className={`icon-pick ${icon === k ? 'active' : ''}`}
                      onClick={() => { setIcon(k); haptic() }}>
                      <I size={26} color={icon === k ? 'var(--purple)' : 'var(--text-2)'} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in">
              <h2 className="t-screen" style={{ marginBottom: 8 }}>Choose a color</h2>
              <p className="t-help" style={{ marginBottom: 20 }}>A soft shade to make it yours.</p>
              <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c.hex} className={`swatch ${color === c.hex ? 'active' : ''}`}
                    style={{ background: c.hex }} onClick={() => { setColor(c.hex); haptic() }} aria-label={c.name} />
                ))}
              </div>
              <div className="row" style={{ gap: 12, marginTop: 28 }}>
                <div className="habit-icon" style={{ background: color + '20' }}>
                  <Icon size={24} color={color} />
                </div>
                <div>
                  <div className="t-habit">{name || 'Your habit'}</div>
                  <div className="t-caption">Preview</div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <h2 className="t-screen" style={{ marginBottom: 8 }}>How often?</h2>
              <p className="t-help" style={{ marginBottom: 20 }}>Pick a rhythm that fits your life.</p>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                {REPEATS.map(r => (
                  <button key={r} className={`chip ${repeat === r ? 'active' : ''}`}
                    onClick={() => { setRepeat(r); haptic() }}>{r}</button>
                ))}
              </div>
              {repeat === 'Specific Days' && (
                <div className="row" style={{ gap: 8, marginTop: 20, justifyContent: 'space-between' }}>
                  {DOW.map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                      style={{
                        width: 42, height: 42, borderRadius: 999, fontWeight: 600,
                        background: days.includes(i) ? 'var(--purple)' : 'var(--card)',
                        color: days.includes(i) ? '#fff' : 'var(--text-2)',
                        border: '1.5px solid var(--border)',
                      }}>{d}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="fade-in">
              <h2 className="t-screen" style={{ marginBottom: 8 }}>Reminder</h2>
              <p className="t-help" style={{ marginBottom: 20 }}>A gentle nudge, only if you want one.</p>
              <div className="card row between" style={{ padding: 16, marginBottom: 16 }}>
                <div className="row" style={{ gap: 12 }}>
                  <Bell size={20} color="var(--purple)" />
                  <span className="t-card" style={{ fontWeight: 500 }}>Remind me</span>
                </div>
                <button onClick={() => { setReminderOn(!reminderOn); haptic() }}
                  style={{
                    width: 52, height: 30, borderRadius: 999, position: 'relative',
                    background: reminderOn ? 'var(--purple)' : 'var(--border)', transition: 'background 220ms',
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, left: reminderOn ? 25 : 3, width: 24, height: 24,
                    borderRadius: 999, background: '#fff', transition: 'left 220ms cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </button>
              </div>
              {reminderOn && (
                <div className="fade-in">
                  <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Time</label>
                  <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 16 }} />
                  <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Message (optional)</label>
                  <input className="input" placeholder="Time to drink water 💧" value={message} onChange={e => setMessage(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="fade-in">
              <h2 className="t-screen" style={{ marginBottom: 8 }}>How do you track it?</h2>
              <p className="t-help" style={{ marginBottom: 20 }}>Simple check, or count toward a goal.</p>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                {GOAL_TYPES.map(g => (
                  <button key={g} className={`chip ${goalType === g ? 'active' : ''}`}
                    onClick={() => { setGoalType(g); haptic() }}>{g}</button>
                ))}
              </div>
              {goalType !== 'Simple Check' && (
                <div className="fade-in row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Target</label>
                    <input type="number" className="input" value={goalTarget} min={1}
                      onChange={e => setGoalTarget(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Unit</label>
                    <input className="input" value={goalUnit} placeholder={goalType === 'Timer' ? 'minutes' : 'glasses'}
                      onChange={e => setGoalUnit(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="btn-primary" disabled={!canNext} onClick={next} style={{ marginTop: 24 }}>
          {step === 6 ? (editing ? 'Save Changes' : 'Save Habit') : (
            <span className="row" style={{ gap: 6, justifyContent: 'center' }}>
              Continue <ChevronRight size={18} />
            </span>
          )}
        </button>
      </div>
    </>
  )
}
