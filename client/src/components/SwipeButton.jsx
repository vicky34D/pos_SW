import { useRef, useState, useEffect, useCallback } from 'react'

// Slide-to-confirm control. Press anywhere on the track and drag right to fire
// onConfirm. Works with mouse, touch and pen via Pointer Events; Enter/Space
// also confirm.
//
// Motion notes: while dragging we write the knob position straight to the DOM
// (inside requestAnimationFrame) instead of re-rendering React on every
// pointermove, which is what made the old knob stutter. Progress is exposed as
// the --p CSS variable (0 → 1) so the fill, label fade and arrow all follow the
// finger in perfect sync.
const HANDLE = 48
const PAD = 4
// Confirm once the knob is dragged past this fraction of the track (forgiving —
// you don't have to hit the very end)…
const THRESHOLD = 0.85
// …but only if the finger actually travelled at least this far, so a stray tap
// near the right edge can never fire it.
const MIN_TRAVEL = 0.35

export default function SwipeButton({ label, disabled = false, onConfirm }) {
  const trackRef = useRef(null)
  const xRef = useRef(0)
  const rafRef = useRef(0)
  const drag = useRef({ left: 0, max: 0, startPos: 0, grab: HANDLE / 2 })
  const confirmRef = useRef(onConfirm)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => { confirmRef.current = onConfirm }, [onConfirm])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Write position to the DOM without a React render.
  const paint = useCallback((v) => {
    xRef.current = v
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const t = trackRef.current
      if (!t) return
      const max = drag.current.max || Math.max(1, t.clientWidth - HANDLE - PAD * 2)
      t.style.setProperty('--x', `${v}px`)
      t.style.setProperty('--p', String(Math.min(1, v / max)))
    })
  }, [])

  const begin = (clientX) => {
    if (disabled || confirmed) return
    const t = trackRef.current
    if (!t) return
    const rect = t.getBoundingClientRect()
    const max = Math.max(0, rect.width - HANDLE - PAD * 2)
    const knobLeft = rect.left + PAD + xRef.current
    const onKnob = clientX >= knobLeft && clientX <= knobLeft + HANDLE
    // Grabbing the knob keeps the finger where it touched it (no jump);
    // pressing elsewhere glides the knob under the finger.
    const grab = onKnob ? clientX - knobLeft : HANDLE / 2
    const pos = Math.max(0, Math.min(clientX - rect.left - PAD - grab, max))
    drag.current = { left: rect.left, max, startPos: onKnob ? xRef.current : 0, grab }
    setDragging(true)
    paint(pos)
  }

  const reset = useCallback(() => paint(0), [paint])

  const fire = useCallback(() => {
    setConfirmed(true)
    paint(drag.current.max || 0)
    if (navigator.vibrate) navigator.vibrate([12, 40, 18])
    // Let the success state register visually before the modal covers it.
    window.setTimeout(() => { confirmRef.current && confirmRef.current() }, 220)
    window.setTimeout(() => { setConfirmed(false); reset() }, 900)
  }, [paint, reset])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const { left, max, grab } = drag.current
      paint(Math.max(0, Math.min(e.clientX - left - PAD - grab, max)))
    }
    const onUp = () => {
      setDragging(false)
      const { max, startPos } = drag.current
      if (max > 0 && xRef.current >= max * THRESHOLD && (xRef.current - startPos) >= max * MIN_TRAVEL) {
        fire()
      } else reset()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, paint, fire, reset])

  const onKeyDown = (e) => {
    if (disabled || confirmed) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const t = trackRef.current
      drag.current.max = t ? Math.max(0, t.clientWidth - HANDLE - PAD * 2) : 0
      fire()
    }
  }

  return (
    <div
      ref={trackRef}
      className={`swipe-track${disabled ? ' is-disabled' : ''}${dragging ? ' is-dragging' : ''}${confirmed ? ' is-confirmed' : ''}`}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (disabled || confirmed) return
        e.preventDefault()
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* older browsers */ }
        begin(e.clientX)
      }}
    >
      <div className="swipe-fill" />
      <span className="swipe-label">
        <span className="swipe-label-text">{confirmed ? 'Payment ready' : label}</span>
      </span>
      <div className="swipe-handle">
        {confirmed ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="swipe-check" d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        )}
      </div>
    </div>
  )
}
