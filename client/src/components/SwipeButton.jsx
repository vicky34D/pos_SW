import { useRef, useState, useEffect } from 'react'

// Slide-to-confirm control. Drag the knob to the right edge to fire onConfirm.
// Works with mouse, touch and pen via Pointer Events; Enter/Space also confirm.
const HANDLE = 46
const PAD = 4

export default function SwipeButton({ label, disabled = false, onConfirm }) {
  const trackRef = useRef(null)
  const xRef = useRef(0)
  const drag = useRef({ start: 0, base: 0, max: 0 })
  const confirmRef = useRef(onConfirm)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => { confirmRef.current = onConfirm }, [onConfirm])

  const setPos = (v) => { xRef.current = v; setX(v) }

  const maxTravel = () => {
    const t = trackRef.current
    return t ? Math.max(0, t.clientWidth - HANDLE - PAD * 2) : 0
  }

  const begin = (clientX) => {
    if (disabled || confirmed) return
    drag.current = { start: clientX, base: xRef.current, max: maxTravel() }
    setDragging(true)
  }

  const fire = () => {
    setConfirmed(true)
    confirmRef.current && confirmRef.current()
    window.setTimeout(() => { setConfirmed(false); setPos(0) }, 800)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const { start, base, max } = drag.current
      const nx = Math.max(0, Math.min(base + (e.clientX - start), max))
      setPos(nx)
    }
    const onUp = () => {
      setDragging(false)
      const { max } = drag.current
      if (max > 0 && xRef.current >= max - 6) { setPos(max); fire() }
      else setPos(0)
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
    >
      <div className="swipe-fill" style={{ width: `${x + HANDLE + PAD}px`, transition: dragging ? 'none' : 'width 0.25s ease' }} />
      <span className="swipe-label">{confirmed ? 'Confirmed' : label}</span>
      <div
        className="swipe-handle"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : 'transform 0.25s ease' }}
        onPointerDown={(e) => { e.preventDefault(); begin(e.clientX) }}
      >
        {confirmed ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        )}
      </div>
    </div>
  )
}
