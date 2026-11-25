// Menu categories: built-in defaults + custom ones the user adds in Menu Management.
// Custom categories are kept in localStorage on this device.
export const DEFAULT_CATEGORIES = [
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
  { id: 'biryani', name: 'Biryani', emoji: '🍛' },
]

const KEY = 'sw_custom_categories'

export function getCustomCategories() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

export function getCategories() {
  const custom = getCustomCategories().filter(c => !DEFAULT_CATEGORIES.some(d => d.id === c.id))
  return [...DEFAULT_CATEGORIES, ...custom]
}

// Returns the new category, or throws if the name is empty/duplicate.
export function addCategory(name, emoji) {
  const clean = (name || '').trim()
  if (!clean) throw new Error('Enter a category name')
  const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!id) throw new Error('Enter a valid category name')
  if (getCategories().some(c => c.id === id || c.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Category already exists')
  }
  const cat = { id, name: clean, emoji: (emoji || '').trim() || '🍽️' }
  localStorage.setItem(KEY, JSON.stringify([...getCustomCategories(), cat]))
  return cat
}
