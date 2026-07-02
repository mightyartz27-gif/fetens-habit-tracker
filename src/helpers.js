import {
  Droplets, BookOpen, Dumbbell, Flower2, NotebookPen, MoonStar, Footprints,
  GraduationCap, Music4, Coffee, Apple, Sparkles, Wallet, ShoppingBag, Plane,
  PawPrint, Heart,
} from 'lucide-react'

// Habit icon library (spec-recommended Lucide icons)
export const ICONS = {
  Droplets, BookOpen, Dumbbell, Flower2, NotebookPen, MoonStar, Footprints,
  GraduationCap, Music4, Coffee, Apple, Sparkles, Wallet, ShoppingBag, Plane,
  PawPrint, Heart,
}
export const ICON_LIST = Object.keys(ICONS)

// Soft palette (spec)
export const COLORS = [
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Lavender', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Peach', hex: '#FB923C' },
  { name: 'Sky', hex: '#38BDF8' },
]

export const REPEATS = ['Daily', 'Weekdays', 'Weekends', 'Specific Days']
export const GOAL_TYPES = ['Simple Check', 'Counter', 'Timer']

export function todayKey(d = new Date()) {
  // Use LOCAL date, not UTC — otherwise evening completions in +1 timezones
  // land on the wrong day.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Monday-first day-of-week: returns 0=Mon .. 6=Sun
export function mondayDow(date) {
  return (date.getDay() + 6) % 7
}

// Weekday labels, Monday first
export const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export const WEEK_LABELS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function tint(hex, alpha = '20') {
  return hex + alpha
}

// Is this habit scheduled for the given weekday (0=Sun..6=Sat)?
export function scheduledOn(habit, date) {
  const dow = date.getDay()
  switch (habit.repeat) {
    case 'Weekdays': return dow >= 1 && dow <= 5
    case 'Weekends': return dow === 0 || dow === 6
    case 'Specific Days': return (habit.days || []).includes(dow)
    default: return true // Daily
  }
}

// Current streak: count back from today over scheduled days
export function currentStreak(habit, log) {
  const days = log[habit.id] || {}
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 400; i++) {
    if (scheduledOn(habit, d)) {
      const k = todayKey(d)
      const v = days[k]
      const done = v === 'done' || (typeof v === 'number' && v > 0)
      if (done) streak++
      else if (i > 0) break // today not done yet is ok; a past miss breaks it
      else if (!done && i === 0) { /* today pending, keep going */ }
    }
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function longestStreak(habit, log) {
  const days = log[habit.id] || {}
  const keys = Object.keys(days).filter(k => {
    const v = days[k]
    return v === 'done' || (typeof v === 'number' && v > 0)
  }).sort()
  let best = 0, run = 0, prev = null
  keys.forEach(k => {
    const cur = new Date(k)
    if (prev && (cur - prev) === 86400000) run++
    else run = 1
    best = Math.max(best, run)
    prev = cur
  })
  return best
}

export function isDone(habit, log, dateK = todayKey()) {
  const v = (log[habit.id] || {})[dateK]
  if (habit.goalType === 'Simple Check') return v === 'done'
  return typeof v === 'number' && v >= (habit.goalTarget || 1)
}

export function progressValue(habit, log, dateK = todayKey()) {
  const v = (log[habit.id] || {})[dateK]
  if (typeof v === 'number') return v
  return v === 'done' ? (habit.goalTarget || 1) : 0
}

// Light + safe haptic (works on iOS PWA where supported)
export function haptic() {
  if (navigator.vibrate) navigator.vibrate(12)
}

export function fireConfetti() {
  const colors = ['#7C3AED', '#A855F7', '#EC4899', '#E9D5FF', '#22C55E']
  const wrap = document.createElement('div')
  wrap.className = 'confetti'
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement('i')
    piece.style.left = (40 + Math.random() * 20) + '%'
    piece.style.top = '40%'
    piece.style.background = colors[i % colors.length]
    piece.style.animationDelay = (Math.random() * 120) + 'ms'
    piece.style.transform = `translateX(${(Math.random() - 0.5) * 240}px)`
    wrap.appendChild(piece)
  }
  document.body.appendChild(wrap)
  setTimeout(() => wrap.remove(), 1100)
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

// ---------- New-feature helpers ----------

// Icons for countdowns, priorities, etc.
export const PRIORITIES = ['Low', 'Medium', 'High']
export const PRIORITY_COLOR = { Low: '#38BDF8', Medium: '#F59E0B', High: '#EF4444' }
export const TODO_REPEATS = ['None', 'Daily', 'Weekly', 'Monthly']

export const COUNTDOWN_ICONS = ['🎂', '🏖️', '💰', '📚', '❤️', '🔁', '✈️', '🎉', '💍', '🏠']
export const GOAL_CATEGORIES = ['Yearly', 'Monthly', 'Personal', 'Health', 'Financial', 'Study']

// Days between today and a date string (YYYY-MM-DD). Positive = future.
export function daysUntil(dateStr) {
  if (!dateStr) return 0
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - midnight) / 86400000)
}

// Does a todo fall on a given date? Handles repeats.
export function todoOnDate(todo, date) {
  if (!todo.due) return false
  const dueKey = todo.due
  const dKey = todayKey(date)
  if (todo.repeat === 'None' || !todo.repeat) return dueKey === dKey
  const due = new Date(dueKey + 'T00:00:00')
  if (date < new Date(due.getFullYear(), due.getMonth(), due.getDate())) return false
  if (todo.repeat === 'Daily') return true
  if (todo.repeat === 'Weekly') return date.getDay() === due.getDay()
  if (todo.repeat === 'Monthly') return date.getDate() === due.getDate()
  return dueKey === dKey
}

// Format a date string nicely
export function prettyDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })
}
