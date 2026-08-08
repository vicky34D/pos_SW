import { useRef, useState, useEffect } from 'react'

// Slide-to-confirm control. Press anywhere on the track and drag right to fire
// onConfirm. Works with mouse, touch and pen via Pointer Events; Enter/Space
// also confirm.
const HANDLE = 48
const PAD = 4
// Confirm once the knob is dragged past this fraction of the track (forgiving —
// you don't have to hit the very end)…
const THRESHOLD = 0.9
// …but only if the finger actually travelled at least this far, so a stray tap
// near the right edge can never fire it.
const MIN_TRAVEL = 0.35

export default function SwipeButton({ label, disabled = false, onConfirm }) {
  const trackRef = useRef(null)
  const xRef = useRef(0)
  const drag = useRef({ left: 0, max: 0, startPos: 0 })
  const confirmRef = useRef(onConfirm)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => { confirmRef.current = onConfirm }, [onConfirm])

  const setPos = (v) => { xRef.current = v; setX(v) }

  // Map a pointer x to a knob position (knob centred under the finger).
  const posFor = (clientX, left, max) =>
    Math.max(0, Math.min(clientX - left - PAD - HANDLE / 2, max))

  // Press anywhere on the track: the knob jumps under the finger, then you
  // slide it to the right edge.
  const begin = (clientX) => {
    if (disabled || confirmed) return
    const t = trackRef.current
    if (!t) return
    const rect = t.getBoundingClientRect()
    const max = Math.max(0, rect.width - HANDLE - PAD * 2)
    const pos = posFor(clientX, rect.left, max)
    drag.current = { left: rect.left, max, startPos: pos }
    setPos(pos)
    setDragging(true)
  }

  const fire = () => {
    setConfirmed(true)
    if (navigator.vibrate) navigator.vibrate(30)
    confirmRef.current && confirmRef.current()
    window.setTimeout(() => { setConfirmed(false); setPos(0) }, 800)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const { left, max } = drag.current
      setPos(posFor(e.clientX, left, max))
    }
    const onUp = () => {
      setDragging(false)
      const { max, startPos } = drag.current
      if (max > 0 && xRef.current >= max * THRESHOLD && (xRef.current - startPos) >= max * MIN_TRAVEL) {
        setPos(max); fire()
      } else setPos(0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging])

  const onKeyDown = (e) => {
    if (disabled || confirmed) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire() }
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
      <div className="swipe-fill" style={{ width: `${x + HANDLE + PAD}px`, transition: dragging ? 'none' : 'width 0.28s cubic-bezier(0.34,1.4,0.64,1)' }} />
      <span className="swipe-label">{confirmed ? 'Confirmed' : label}</span>
      <div
        className="swipe-handle"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.34,1.4,0.64,1)' }}
      >
        {confirmed ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        )}
      </div>
    </div>
  )
}
