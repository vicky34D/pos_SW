import { useState, useEffect } from 'react'
import * as api from '../api'

const categoryOptions = [
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

export default function MenuManagement({ showToast }) {
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', category: 'burgers', description: '' })
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')

  // Recipe (ingredient mapping) editor state
  const [inventory, setInventory] = useState([])
  const [recipeItem, setRecipeItem] = useState(null)
  const [recipeRows, setRecipeRows] = useState([]) // [{ inventory_id, qty_per_unit }]
  const [recipeBusy, setRecipeBusy] = useState(false)

  const fetchItems = async () => {
    try {
      const data = await api.getMenu()
      // Deduplicate by name+category
      const seen = new Set()
      const unique = data.filter(item => {
        const key = `${item.name}|${item.category}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setItems(unique)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  useEffect(() => { fetchItems() }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', price: '', category: 'burgers', description: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, price: item.price, category: item.category, description: item.description || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Enter item name', 'error')
    if (!form.price || parseFloat(form.price) <= 0) return showToast('Enter valid price', 'error')

    const catInfo = categoryOptions.find(c => c.id === form.category)
    const payload = { ...form, price: parseFloat(form.price), emoji: catInfo?.emoji || '🍽️' }

    try {
      if (editItem) {
        await api.updateMenuItem(editItem.id, payload)
        showToast(`${form.name} updated`, 'success')
      } else {
        await api.createMenuItem(payload)
        showToast(`${form.name} added`, 'success')
      }
      setShowModal(false)
      fetchItems()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const openRecipe = async (item) => {
    setRecipeItem(item)
    setRecipeRows([])
    setRecipeBusy(true)
    try {
      // Load inventory (for dropdowns) and the item's existing recipe in parallel.
      const [inv, recipe] = await Promise.all([
        inventory.length ? Promise.resolve(inventory) : api.getInventory(),
        api.getRecipe(item.id),
      ])
      setInventory(inv)
      setRecipeRows(
        recipe.length
          ? recipe.map(r => ({ inventory_id: String(r.inventory_id), qty_per_unit: String(r.qty_per_unit) }))
          : [{ inventory_id: '', qty_per_unit: '1' }]
      )
    } catch (e) {
      showToast(e.message, 'error')
      setRecipeItem(null)
    } finally {
      setRecipeBusy(false)
    }
  }

  const addRecipeRow = () => setRecipeRows(rows => [...rows, { inventory_id: '', qty_per_unit: '1' }])
  const removeRecipeRow = (idx) => setRecipeRows(rows => rows.filter((_, i) => i !== idx))
  const updateRecipeRow = (idx, field, value) =>
    setRecipeRows(rows => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))

  const handleRecipeSave = async () => {
    // Drop blank rows; keep only valid ingredient + positive qty.
    const ingredients = recipeRows
      .filter(r => r.inventory_id && parseFloat(r.qty_per_unit) > 0)
      .map(r => ({ inventory_id: parseInt(r.inventory_id, 10), qty_per_unit: parseFloat(r.qty_per_unit) }))

    // Guard against the same inventory item being listed twice.
    const ids = ingredients.map(i => i.inventory_id)
    if (new Set(ids).size !== ids.length) return showToast('Each ingredient can only be added once', 'error')

    setRecipeBusy(true)
    try {
      await api.updateRecipe(recipeItem.id, ingredients)
      showToast(
        ingredients.length
          ? `Recipe saved — ${recipeItem.name} will deduct ${ingredients.length} ingredient${ingredients.length > 1 ? 's' : ''} per sale`
          : `Recipe cleared — ${recipeItem.name} no longer deducts stock`,
        'success'
      )
      setRecipeItem(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setRecipeBusy(false)
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}" from menu?`)) return
    try {
      await api.deleteMenuItem(item.id)
      showToast(`${item.name} removed`, 'info')
      fetchItems()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const filtered = items.filter(item => {
    const matchesCat = filterCat === 'all' || item.category === filterCat
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const grouped = {}
  filtered.forEach(item => {
    const cat = item.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Menu Management</div>
          <div className="header-subtitle">{items.length} items across {categoryOptions.length} categories</div>
        </div>
        <button className="btn-add-stock" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="menu-mgmt-toolbar">
        <div className="search-wrapper" style={{ width: 'min(320px, 100%)' }}>
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="inventory-filter-group">
          <button className={`inventory-filter-btn${filterCat === 'all' ? ' active' : ''}`} onClick={() => setFilterCat('all')}>All</button>
          {categoryOptions.map(c => (
            <button key={c.id} className={`inventory-filter-btn${filterCat === c.id ? ' active' : ''}`} onClick={() => setFilterCat(c.id)}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="report-card" style={{ flex: 1 }}>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
          <table className="report-table menu-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No menu items found</td></tr>
              ) : (
                filtered.map(item => {
                  const catInfo = categoryOptions.find(c => c.id === item.category)
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', fontSize: '1.4rem' }}>{item.emoji}</td>
                      <td><span className="fw-bold">{item.name}</span></td>
                      <td><span className="mgmt-item-category">{catInfo?.emoji} {catInfo?.name || item.category}</span></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>₹{item.price}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="mgmt-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="mgmt-btn mgmt-btn-recipe" onClick={() => openRecipe(item)} title="Set which inventory items this deducts when sold">Recipe</button>
                          <button className="mgmt-btn mgmt-btn-edit" onClick={() => openEdit(item)}>Edit</button>
                          <button className="mgmt-btn mgmt-btn-delete" onClick={() => handleDelete(item)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editItem ? 'Edit Menu Item' : 'Add New Menu Item'}</div>
            <div className="modal-form-group">
              <label>Item Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken Burger" />
            </div>
            <div className="modal-form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
            <div className="modal-form-group">
              <label>Price (₹)</label>
              <input type="number" value={form.price} min="0" onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="modal-form-group">
              <label>Description (optional)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Combo details" />
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-modal btn-modal-confirm" onClick={handleSave}>Save Item</button>
            </div>
          </div>
        </div>
      )}

      {recipeItem && (
        <div className="modal-overlay" onClick={() => !recipeBusy && setRecipeItem(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-title">Recipe — {recipeItem.emoji} {recipeItem.name}</div>
            <p className="recipe-hint">
              Each ingredient below is deducted from inventory every time this item is sold
              (quantity = amount used per <strong>one</strong> unit). Leave empty to not track stock for this item.
            </p>

            {recipeBusy && recipeRows.length === 0 ? (
              <div className="recipe-loading">Loading…</div>
            ) : (
              <div className="recipe-rows">
                {recipeRows.map((row, idx) => {
                  const inv = inventory.find(i => String(i.id) === String(row.inventory_id))
                  return (
                    <div className="recipe-row" key={idx}>
                      <select
                        className="recipe-ingredient"
                        value={row.inventory_id}
                        onChange={e => updateRecipeRow(idx, 'inventory_id', e.target.value)}
                      >
                        <option value="">Select ingredient…</option>
                        {inventory.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.qty} {i.unit} in stock)</option>
                        ))}
                      </select>
                      <input
                        className="recipe-qty"
                        type="number"
                        min="0"
                        step="any"
                        value={row.qty_per_unit}
                        onChange={e => updateRecipeRow(idx, 'qty_per_unit', e.target.value)}
                        placeholder="Qty"
                      />
                      <span className="recipe-unit">{inv?.unit || ''}</span>
                      <button className="recipe-remove" onClick={() => removeRecipeRow(idx)} title="Remove">✕</button>
                    </div>
                  )
                })}
                <button className="recipe-add" onClick={addRecipeRow}>+ Add ingredient</button>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-modal btn-modal-cancel" onClick={() => setRecipeItem(null)} disabled={recipeBusy}>Cancel</button>
              <button className="btn-modal btn-modal-confirm" onClick={handleRecipeSave} disabled={recipeBusy}>
                {recipeBusy ? 'Saving…' : 'Save Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
