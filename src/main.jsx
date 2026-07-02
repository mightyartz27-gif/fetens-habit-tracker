import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Keyboard fix: when an input/textarea is focused (mobile keyboard opens),
// scroll it into view so it's never hidden behind the keyboard.
document.addEventListener('focusin', (e) => {
  const el = e.target
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 300)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
