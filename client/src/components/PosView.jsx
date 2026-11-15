import { useState, useEffect, useMemo, useRef } from 'react'
import * as api from '../api'

// Display name + emoji for the categories we know about. Any other category
// found on a menu item still gets its own pill (see buildCategories).
const KNOWN_CATEGORIES = [
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

const MENU_CACHE_KEY = 'sw_menu_cache'

const readCachedMenu = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(MENU_CACHE_KEY) || 'null')
    return Array.isArray(cached) ? cached : []
  } catch {
    return []
  }
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Deduplicate by name+category (server may have duplicate seeds)
const dedupe = (items) => {
  const seen = new Set()
  return items.filter(item => {
    const key = `${item.name}|${item.category}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Only show categories that actually have items, in the known order, followed
// by any category created later that this file doesn't know about.
function buildCategories(menuItems) {
  const present = new Set(menuItems.map(i => i.category || 'other'))
  const known = KNOWN_CATEGORIES.filter(c => present.has(c.id))
  const knownIds = new Set(KNOWN_CATEGORIES.map(c => c.id))
  const extra = [...present]
    .filter(id => !knownIds.has(id))
    .sort()
    .map(id => ({
      id,
      name: titleCase(id),
      emoji: menuItems.find(i => (i.category || 'other') === id)?.emoji || '🍽️',
    }))
  return [...known, ...extra]
}

export default function PosView({ onAddToOrder, cartItems = [] }) {
  const [menuItems, setMenuItems] = useState(readCachedMenu)
  const [topItems, setTopItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  // Load the whole menu once; category and search then filter instantly on
  // the device instead of waiting on the network for every tap/keystroke.
  useEffect(() => {
    let cancelled = false
    api.getMenu()
      .then(items => {
        if (cancelled) return
        const unique = dedupe(items)
        setMenuItems(unique)
        setLoadError(false)
        try { localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(unique)) } catch { /* storage full/unavailable */ }
      })
      .catch(e => {
        console.error('Failed to load menu:', e)
        if (!cancelled) setLoadError(true)
      })
      .finally(() => { if (!cancelled) setLoaded(true) })
    api.getTopItems()
      .then(rows => { if (!cancelled) setTopItems(rows || []) })
      .catch(() => {}) // best-sellers are a nice-to-have
    return () => { cancelled = true }
  }, [])

  // "/" jumps to search from anywhere on the POS screen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const categories = useMemo(() => buildCategories(menuItems), [menuItems])
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id, c])),
    [categories]
  )

  // Best sellers, in rank order, matched back to live menu items
  const popularItems = useMemo(() => {
    const out = []
    topItems.forEach(top => {
      const match = menuItems.find(i => i.id === top.id) || menuItems.find(i => i.name === top.name)
      if (match && !out.includes(match)) out.push(match)
    })
    return out.slice(0, 8)
  }, [topItems, menuItems])

  const qtyById = useMemo(() => {
    const map = {}
    cartItems.forEach(i => { map[i.id] = i.qty })
    return map
  }, [cartItems])

  const query = search.trim().toLowerCase()

  // Sections to render: [{ id, title, items }]
  const sections = useMemo(() => {
    const inCategoryOrder = (items) => categories
      .map(c => ({
        id: c.id,
        title: `${c.emoji} ${c.name}`,
        items: items.filter(i => (i.category || 'other') === c.id),
      }))
      .filter(s => s.items.length > 0)

    if (query) {
      // Search always looks across the whole menu, whatever pill is active
      const words = query.split(/\s+/)
      const matches = menuItems.filter(i => {
        const hay = `${i.name} ${i.description || ''} ${categoryById[i.category]?.name || i.category || ''}`.toLowerCase()
        return words.every(w => hay.includes(w))
      })
      return inCategoryOrder(matches)
    }
    if (activeCategory === 'popular') {
      return popularItems.length ? [{ id: 'popular', title: '', items: popularItems }] : []
    }
    if (activeCategory !== 'all') {
      const items = menuItems.filter(i => (i.category || 'other') === activeCategory)
      return items.length ? [{ id: activeCategory, title: '', items }] : []
    }
    const all = inCategoryOrder(menuItems)
    return popularItems.length
      ? [{ id: 'popular', title: '⭐ Most ordered', items: popularItems }, ...all]
      : all
  }, [query, activeCategory, menuItems, popularItems, categories, categoryById])

  const visibleCount = sections.reduce((n, s) => n + s.items.length, 0)
  const firstMatch = query && sections[0]?.items[0]

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && firstMatch) {
      onAddToOrder(firstMatch)
      setSearch('')
    } else if (e.key === 'Escape') {
      setSearch('')
      e.currentTarget.blur()
    }
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  })

  const pills = [
    { id: 'all', name: 'All', emoji: '🍽️' },
    ...(popularItems.length ? [{ id: 'popular', name: 'Popular', emoji: '⭐' }] : []),
    ...categories,
  ]

  return (
    <div className="pos-view">
      {/* Top Bar */}
      <div className="pos-topbar">
        <div className="pos-search">
          <svg className="pos-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            ref={searchRef}
            type="text"
            inputMode="search"
            enterKeyHint="done"
            autoComplete="off"
            aria-label="Search menu"
            placeholder="Search the menu"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          {search && (
            <button className="pos-search-clear" aria-label="Clear search" onClick={() => { setSearch(''); searchRef.current?.focus() }}>✕</button>
          )}
        </div>
        <span className="pos-date-badge">{today}</span>
      </div>

      {query && visibleCount > 0 && (
        <div className="pos-search-hint">
          {visibleCount} match{visibleCount !== 1 ? 'es' : ''} · press <kbd>Enter</kbd> to add <strong>{firstMatch.name}</strong>
        </div>
      )}

      {loadError && (
        <div className="pos-load-warning">
          {menuItems.length
            ? 'Could not refresh the menu — showing the last saved copy.'
            : 'Could not load the menu. Check the connection and reopen this screen.'}
        </div>
      )}

      {/* Category Pills */}
      {!query && (
        <div className="pos-categories">
          {pills.map(cat => (
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
      )}

      {/* Menu Grid */}
      <div className="pos-menu-scroll">
        {visibleCount === 0 ? (
          <div className="pos-empty">
            {!loaded ? (
              <p>Loading menu…</p>
            ) : (
              <>
                <div className="pos-empty-icon">🔍</div>
                <p>{query ? `Nothing matches “${search.trim()}”` : 'No items here yet'}</p>
                <span>{query ? 'Check the spelling or clear the search' : 'Add items in Menu Management'}</span>
              </>
            )}
          </div>
        ) : (
          sections.map(section => (
            <section key={section.id} className="pos-menu-section">
              {section.title && <h2 className="pos-section-title">{section.title}</h2>}
              <div className="pos-menu-grid">
                {section.items.map(item => {
                  const qty = qtyById[item.id] || 0
                  return (
                    <button
                      key={item.id}
                      className={`pos-item-card${qty ? ' in-cart' : ''}`}
                      onClick={() => onAddToOrder(item)}
                    >
                      {qty > 0 && <span className="pos-item-qty" aria-label={`${qty} in order`}>{qty}</span>}
                      <div className="pos-item-emoji">{item.emoji || '🍽️'}</div>
                      <div className="pos-item-info">
                        <div className="pos-item-name" title={item.name}>{item.name}</div>
                        {item.description && <div className="pos-item-desc">{item.description}</div>}
                      </div>
                      <div className="pos-item-bottom">
                        <span className="pos-item-price"><span className="cur">₹</span>{item.price}</span>
                        <span className="pos-item-add">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
