import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const categories = [
  { id: 'all', name: 'All', emoji: '🍽️' },
  { id: 'burgers', name: 'Burgers', emoji: '🍔' },
  { id: 'fries', name: 'Fries', emoji: '🍟' },
  { id: 'strips', name: 'Strips', emoji: '🍗' },
  { id: 'drinks', name: 'Chai & Coffee', emoji: '☕' },
  { id: 'popcorn', name: 'Popcorn', emoji: '🍿' },
  { id: 'snacks', name: 'Snacks', emoji: '🧀' },
  { id: 'wings', name: 'Wings', emoji: '🍗' },
  { id: 'momos', name: 'Momos', emoji: '🥟' },
  { id: 'combos', name: 'Combos', emoji: '🎁' },
  { id: 'cigarettes', name: 'Cigarettes', emoji: '🚬' },
]

export default function PosView({ onAddToOrder, activeTable }) {
  const [menuItems, setMenuItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const fetchMenu = useCallback(async () => {
    try {
      const items = await api.getMenu(activeCategory, search)
      // Deduplicate by name+category (server may have duplicate seeds)
      const seen = new Set()
      const unique = items.filter(item => {
        const key = `${item.name}|${item.category}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setMenuItems(unique)
    } catch (e) {
      console.error('Failed to load menu:', e)
    }
  }, [activeCategory, search])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  })

  const grouped = {}
  menuItems.forEach(item => {
    const cat = item.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })

  return (
    <div className="pos-view">
      {/* Top Bar */}
      <div className="pos-topbar">
        <div className="pos-topbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <span style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center' }}>🏍️</span>
            <div>
              <h1 className="pos-page-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>StreetWok POS</h1>
              <span className="pos-date-badge" style={{ fontSize: '0.68rem', opacity: 0.75, display: 'block', marginTop: '1px' }}>{today}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: 'min(640px, 100%)', justifyContent: 'flex-end' }}>
          <div className="pos-search" style={{ flex: 1, margin: 0 }}>
            <svg className="pos-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              placeholder="Search menu items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="pos-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <div className="pos-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.35rem 0.65rem' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Status</span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Table {activeTable !== null ? activeTable : 'Takeaway'}</span>
            </div>
            <div style={{ background: 'var(--accent)', color: 'white', borderRadius: '8px', padding: '0.2rem 0.5rem', fontWeight: 800, fontSize: '0.78rem' }}>
              {activeTable !== null ? `T${activeTable}` : '🥡'}
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="pos-categories" style={{ marginTop: '0.5rem' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`pos-cat-pill${activeCategory === cat.id ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <div className="pos-cat-emoji-wrapper">
              <span className="pos-cat-emoji">{cat.emoji}</span>
            </div>
            <span className="pos-cat-name">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="pos-menu-scroll">
        {menuItems.length === 0 ? (
          <div className="pos-empty">
            <div className="pos-empty-icon">🔍</div>
            <p>No items found</p>
            <span>Try a different category or search term</span>
          </div>
        ) : (
          <div className="pos-menu-grid">
            {menuItems.map(item => (
              <button
                key={item.id}
                className="pos-item-card"
                onClick={() => onAddToOrder(item)}
              >
                <div className="pos-item-emoji">{item.emoji || '🍽️'}</div>
                <div className="pos-item-info">
                  <div className="pos-item-name" title={item.name}>{item.name}</div>
                  {item.description && <div className="pos-item-desc">{item.description}</div>}
                </div>
                <div className="pos-item-bottom">
                  <span className="pos-item-price">₹{item.price}</span>
                  <span className="pos-item-add">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
