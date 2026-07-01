import { useState } from 'react'
import { Lock } from 'lucide-react'
import { haptic } from './helpers'

// Casual lock for a personal app. This is NOT strong security — the passcode
// lives in the app code — but it stops the app opening for anyone who picks
// up the phone. Once unlocked, it stays unlocked for the session.
const PASSCODE = 'azizfeten27'

export default function Lockscreen({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = (e) => {
    e?.preventDefault?.()
    if (value === PASSCODE) {
      haptic()
      sessionStorage.setItem('feten_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      haptic()
      setValue('')
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: 999, marginBottom: 24,
        background: 'linear-gradient(135deg, var(--purple), var(--pink))',
        display: 'grid', placeItems: 'center',
      }}>
        <Lock size={38} color="#fff" />
      </div>
      <h1 className="t-screen" style={{ marginBottom: 6 }}>Welcome back, Feten 🌸</h1>
      <p className="t-help" style={{ marginBottom: 28 }}>Enter your passcode to open the app.</p>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 320 }}>
        <input
          className="input"
          type="password"
          inputMode="text"
          autoFocus
          placeholder="Passcode"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{
            textAlign: 'center', marginBottom: 16,
            borderColor: error ? 'var(--error)' : undefined,
          }}
        />
        {error && <p className="t-help" style={{ color: 'var(--error)', marginBottom: 16 }}>
          That passcode isn't right. Try again.
        </p>}
        <button type="submit" className="btn-primary" disabled={!value}>Unlock</button>
      </form>
    </div>
  )
}
