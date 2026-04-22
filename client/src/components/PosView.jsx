import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const categories = [
  { id: 'all', name: 'All Items', emoji: '🍽️' },
  { id: 'burgers', name: 'Burgers', emoji: '🍔' },
  { id: 'fries', name: 'Fries', emoji: '🍟' },
  { id: 'strips', name: 'Strips', emoji: '🍗' },
  { id: 'drinks', name: 'Chai & Coffee', emoji: '☕' },
  { id: 'popcorn', name: 'Popcorn', emoji: '🍿' },
  { id: 'snacks', name: 'Snacks', emoji: '🧀' },
  { id: 'wings', name: 'Wings', emoji: '🍗' },
  { id: 'momos', name: 'Momos', emoji: '🥟' },
  { id: 'combos', name: 'Combos', emoji: '🎁' },
]

export default function PosView({ onAddToOrder }) {
  const [menuItems, setMenuItems] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const fetchMenu = useCallback(async () => {
    try {
      const items = await api.getMenu(activeCategory, search)
      setMenuItems(items)
    } catch (e) {
      console.error('Failed to load menu:', e)
    }
  }, [activeCategory, search])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Point of Sale</div>
          <div className="header-subtitle">{today}</div>
        </div>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="category-section">
        <div className="section-label">Categories</div>
        <div className="category-scroll">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`category-chip${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="cat-emoji">{cat.emoji}</span>
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      <div className="menu-grid-container">
        <div className="menu-grid">
          {menuItems.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">🔍</div>
              <p>No items found</p>
            </div>
          ) : (
            menuItems.map(item => (
              <div
                key={item.id}
                className="menu-card"
                onClick={() => onAddToOrder(item)}
              >
                <span className="menu-card-emoji">{item.emoji || '🍽️'}</span>
                <h5 title={item.name}>{item.name}</h5>
                {item.description && <div className="item-variant">{item.description}</div>}
                <span className="price">₹{item.price}</span>
                <button
                  className="card-add-btn"
                  onClick={e => { e.stopPropagation(); onAddToOrder(item) }}
                >
                  Add +
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
