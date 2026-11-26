import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'
import Sidebar from './components/Sidebar'
import PosView from './components/PosView'
import OrderPanel from './components/OrderPanel'
import InventoryView from './components/InventoryView'
import ReportsView from './components/ReportsView'
import MenuManagement from './components/MenuManagement'
import SettingsView from './components/SettingsView'
import UserManagement from './components/UserManagement'
import Toast from './components/Toast'
import WelcomePage from './components/WelcomePage'
import { userPages, firstPage } from './lib/pages'
import TablesView from './components/TablesView'
import SuppliersView from './components/SuppliersView'
import PurchaseBillsView from './components/PurchaseBillsView'
import ExpensesView from './components/ExpensesView'
import StockLedgerView from './components/StockLedgerView'
import OrderHistoryView from './components/OrderHistoryView'
import * as api from './api'
import { computeTotals } from './lib/totals'

const TOTAL_TABLES = 10

export default function App() {
  const [activeView, setActiveView] = useState('loading')
  const [startupError, setStartupError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  // Keep people on pages they may open (access can change while signed in).
  useEffect(() => {
    if (!currentUser || activeView === 'loading' || activeView === 'login') return
    const pages = userPages(currentUser)
    const ok = pages.includes(activeView) || (activeView === 'pos' && pages.includes('tables'))
    if (!ok) setActiveView(firstPage(currentUser))
  }, [currentUser, activeView])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Table system
  const [activeTable, setActiveTable] = useState(null) // null = takeaway/quick order
  const [tables, setTables] = useState({}) // { tableNumber: { items, customerName, orderType } }

  // Current order state (derived from active table or quick order)
  const [quickOrder, setQuickOrder] = useState([])
  const [quickCustomerName, setQuickCustomerName] = useState('')
  const [quickOrderType, setQuickOrderType] = useState('takeaway')

  const [orderCounter, setOrderCounter] = useState(0)
  const [settings, setSettings] = useState({ shop_name: 'StreetWok', tagline: "The Biker's Cafe", tax_rate: '5' })
  const [toasts, setToasts] = useState([])

  // Discount per cart context ('quick' or a table number): { mode, value }
  const [discounts, setDiscounts] = useState({})
  // Parked (held) orders + the recall modal
  const [parkedOrders, setParkedOrders] = useState([])
  const [showParkedModal, setShowParkedModal] = useState(false)

  const saveTimer = useRef(null)

  // Derived current order based on active table or quick order
  const currentOrder = activeTable !== null
    ? (tables[activeTable]?.items || [])
    : quickOrder

  const discountKey = activeTable !== null ? activeTable : 'quick'
  const discount = discounts[discountKey] || { mode: 'flat', value: 0 }
  const setDiscount = useCallback((next) => {
    setDiscounts(prev => ({ ...prev, [discountKey]: next }))
  }, [discountKey])

  const orderType = activeTable !== null
    ? (tables[activeTable]?.orderType || 'dine-in')
    : quickOrderType

  const customerName = activeTable !== null
    ? (tables[activeTable]?.customerName || '')
    : quickCustomerName

  const totalItems = currentOrder.reduce((sum, item) => sum + item.qty, 0)
  const cartSubtotal = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0)

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  // Save table to server (debounced)
  const saveTableToServer = useCallback((tableNum, tableData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.updateTable(tableNum, {
        items: tableData.items,
        customer_name: tableData.customerName,
        order_type: tableData.orderType
      }).catch(() => {}) // silent fail, data is in local state
    }, 800)
  }, [])

  const loadInitialData = useCallback((user) => {
    setCurrentUser(user)
    setActiveView(firstPage(user))
    return Promise.allSettled([
      api.getSettings().then(setSettings),
      api.getOrderCounter().then(data => setOrderCounter(data.last_number)),
      api.getParkedOrders().then(setParkedOrders).catch(() => {}),
      api.getTables().then(serverTables => {
        const tablesMap = {}
        serverTables.forEach(t => {
          tablesMap[t.table_number] = {
            items: t.items || [],
            customerName: t.customer_name || '',
            orderType: t.order_type || 'dine-in'
          }
        })
        setTables(tablesMap)
      })
    ])
  }, [])

  // Load session + tables on startup
  useEffect(() => {
    api.getSession()
      .then(({ user }) => loadInitialData(user))
      .catch(err => {
        // Show login page if not authenticated
        setActiveView('login')
      })
  }, [loadInitialData])

  // Select a table
  const selectTable = useCallback((tableNum) => {
    if (tableNum === null) {
      setActiveTable(null)
      return
    }
    setActiveTable(tableNum)
    // If table doesn't exist yet, create it
    if (!tables[tableNum]) {
      setTables(prev => ({
        ...prev,
        [tableNum]: { items: [], customerName: '', orderType: 'dine-in' }
      }))
      api.openTable(tableNum).catch(() => {})
    }
  }, [tables])

  const handleSelectTableFromDashboard = useCallback((num) => {
    selectTable(num)
    setActiveView('pos')
  }, [selectTable])

  const addToOrder = useCallback((item) => {
    if (activeTable !== null) {
      setTables(prev => {
        const tableData = prev[activeTable] || { items: [], customerName: '', orderType: 'dine-in' }
        const existing = tableData.items.find(i => i.id === item.id)
        let newItems
        if (existing) {
          newItems = tableData.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
        } else {
          newItems = [...tableData.items, { id: item.id, name: item.name, price: item.price, emoji: item.emoji, category: item.category, description: item.description, qty: 1 }]
        }
        const newTableData = { ...tableData, items: newItems }
        saveTableToServer(activeTable, newTableData)
        return { ...prev, [activeTable]: newTableData }
      })
    } else {
      setQuickOrder(prev => {
        const existing = prev.find(i => i.id === item.id)
        if (existing) {
          return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
        }
        return [...prev, { id: item.id, name: item.name, price: item.price, emoji: item.emoji, category: item.category, description: item.description, qty: 1 }]
      })
    }
    showToast(`${item.name} added`, 'success')
  }, [activeTable, showToast, saveTableToServer])

  const updateQty = useCallback((itemId, delta) => {
    if (activeTable !== null) {
      setTables(prev => {
        const tableData = prev[activeTable] || { items: [], customerName: '', orderType: 'dine-in' }
        const updated = tableData.items.map(i => i.id === itemId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
        const newTableData = { ...tableData, items: updated }
        saveTableToServer(activeTable, newTableData)
        return { ...prev, [activeTable]: newTableData }
      })
    } else {
      setQuickOrder(prev => {
        const updated = prev.map(i => i.id === itemId ? { ...i, qty: i.qty + delta } : i)
        return updated.filter(i => i.qty > 0)
      })
    }
  }, [activeTable, saveTableToServer])

  const setItemNote = useCallback((itemId, note) => {
    if (activeTable !== null) {
      setTables(prev => {
        const tableData = prev[activeTable] || { items: [], customerName: '', orderType: 'dine-in' }
        const updated = tableData.items.map(i => i.id === itemId ? { ...i, note } : i)
        const newTableData = { ...tableData, items: updated }
        saveTableToServer(activeTable, newTableData)
        return { ...prev, [activeTable]: newTableData }
      })
    } else {
      setQuickOrder(prev => prev.map(i => i.id === itemId ? { ...i, note } : i))
    }
  }, [activeTable, saveTableToServer])

  const setOrderType = useCallback((type) => {
    if (activeTable !== null) {
      setTables(prev => {
        const tableData = prev[activeTable] || { items: [], customerName: '', orderType: 'dine-in' }
        const newTableData = { ...tableData, orderType: type }
        saveTableToServer(activeTable, newTableData)
        return { ...prev, [activeTable]: newTableData }
      })
    } else {
      setQuickOrderType(type)
    }
  }, [activeTable, saveTableToServer])

  const setCustomerName = useCallback((name) => {
    if (activeTable !== null) {
      setTables(prev => {
        const tableData = prev[activeTable] || { items: [], customerName: '', orderType: 'dine-in' }
        const newTableData = { ...tableData, customerName: name }
        saveTableToServer(activeTable, newTableData)
        return { ...prev, [activeTable]: newTableData }
      })
    } else {
      setQuickCustomerName(name)
    }
  }, [activeTable, saveTableToServer])

  const clearDiscount = useCallback(() => {
    setDiscounts(prev => {
      if (!(discountKey in prev)) return prev
      const next = { ...prev }
      delete next[discountKey]
      return next
    })
  }, [discountKey])

  const clearOrder = useCallback(() => {
    clearDiscount()
    if (activeTable !== null) {
      setTables(prev => {
        const newTableData = { items: [], customerName: '', orderType: 'dine-in' }
        saveTableToServer(activeTable, newTableData)
        return { ...prev, [activeTable]: newTableData }
      })
    } else {
      setQuickOrder([])
      setQuickCustomerName('')
    }
  }, [activeTable, saveTableToServer, clearDiscount])

  const handleCheckout = useCallback(async (paymentMethod) => {
    const { subtotal, discountAmount, tax, total } = computeTotals(currentOrder, settings.tax_rate, discount)

    try {
      const order = await api.createOrder({
        customer_name: customerName || (activeTable !== null ? `Table ${activeTable}` : 'Walk-in'),
        order_type: orderType,
        payment_method: paymentMethod,
        items: currentOrder,
        subtotal, tax, total, discount: discountAmount,
        table_number: activeTable
      })
      setOrderCounter(order.order_number)
      clearDiscount()

      // If it's a table order, close the table on server
      if (activeTable !== null) {
        api.closeTable(activeTable).catch(() => {})
        setTables(prev => {
          const next = { ...prev }
          delete next[activeTable]
          return next
        })
        setActiveTable(null)
      } else {
        setQuickOrder([])
        setQuickCustomerName('')
      }

      showToast(`Order #${order.order_number} completed — ${paymentMethod}`, 'success')

      // Warn if any ingredient dropped to/below its alert level after this sale.
      if (order.low_stock?.length) {
        const names = order.low_stock.map(s => `${s.name} (${s.qty})`).join(', ')
        showToast(`Low stock: ${names}`, 'error')
      }
      return order
    } catch (err) {
      showToast(err.message, 'error')
      return null
    }
  }, [currentOrder, customerName, orderType, activeTable, settings, discount, clearDiscount, showToast])

  // Hold the current quick order for later, then reset the cart.
  const holdOrder = useCallback(async () => {
    if (activeTable !== null || quickOrder.length === 0) return
    try {
      await api.parkOrder({
        label: quickCustomerName || '',
        customer_name: quickCustomerName || '',
        order_type: quickOrderType,
        items: quickOrder,
        discount: discounts['quick'] || null,
      })
      const list = await api.getParkedOrders()
      setParkedOrders(list)
      setQuickOrder([])
      setQuickCustomerName('')
      clearDiscount()
      showToast('Order held', 'success')
    } catch (err) {
      showToast(err.message || 'Could not hold order', 'error')
    }
  }, [activeTable, quickOrder, quickCustomerName, quickOrderType, discounts, clearDiscount, showToast])

  // Recall a parked order into the quick cart and remove it from the held list.
  const recallParked = useCallback(async (parked) => {
    setActiveTable(null)
    setQuickOrder(parked.items || [])
    setQuickCustomerName(parked.customer_name || '')
    setQuickOrderType(parked.order_type || 'takeaway')
    setDiscounts(prev => ({ ...prev, quick: parked.discount || { mode: 'flat', value: 0 } }))
    setShowParkedModal(false)
    setActiveView('pos')
    try {
      await api.deleteParkedOrder(parked.id)
      setParkedOrders(prev => prev.filter(p => p.id !== parked.id))
    } catch { /* keep it in the list if the delete failed */ }
  }, [])

  const deleteParked = useCallback(async (id) => {
    try {
      await api.deleteParkedOrder(id)
      setParkedOrders(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      showToast(err.message || 'Could not remove held order', 'error')
    }
  }, [showToast])

  // Count active tables (tables with items)
  const activeTables = Object.entries(tables).filter(([, t]) => t.items.length > 0)

  if (activeView === 'loading') {
    return (
      <div className="pastel-welcome-container">
        <div className="pastel-login-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 className="pastel-title">Loading POS...</h2>
        </div>
      </div>
    )
  }

  if (activeView === 'login') {
    return <WelcomePage onGetStarted={loadInitialData} />
  }

  const handleLogout = async () => {
    try {
      const summary = await api.getReportSummary()
      const todayTotal = summary.today_revenue || 0
      const confirmed = window.confirm(`Today's Total Sale is ₹${todayTotal}.\n\nAre you sure you want to log out?`)
      if (!confirmed) return
    } catch (err) {
      if (!window.confirm("Could not fetch today's sales.\n\nAre you sure you want to log out?")) return
    }
    
    api.clearAuthToken()
    setCurrentUser(null)
    setActiveView('login')
  }

  return (
    <div className={`app-container${activeView === 'pos' ? ' pos-mode' : ''}${isSidebarOpen ? ' sidebar-open' : ''}`}>
      {/* Mobile Top Header (Mockup Screen 1) */}
      <header className="mobile-app-header">
        <button className="mobile-hamburger" onClick={() => setIsSidebarOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="mobile-location">
          <span className="mobile-brand-mark">D</span>
          <span style={{ verticalAlign: 'middle' }}>DHARS</span>
        </div>
        {userPages(currentUser).includes('settings') ? <button className="mobile-settings-gear" onClick={() => {
          setActiveView('settings');
          setIsSidebarOpen(false);
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button> : <span style={{ width: 40 }} />}
      </header>

      {isSidebarOpen && <div className="sidebar-mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`sidebar-wrapper ${isSidebarOpen ? 'drawer-open' : ''}`}>
        <Sidebar
          activeView={activeView} 
          onViewChange={(view) => {
            setIsSidebarOpen(false);
            if (view === 'logout') {
              handleLogout()
            } else if (userPages(currentUser).includes(view)) {
              setActiveView(view)
            }
          }} 
          currentUser={currentUser}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="main-content">
        {activeView === 'pos' && (
          <>
            {/* Table Selector Bar */}
            <div className="table-bar">
              {parkedOrders.length > 0 && (
                <button
                  className="table-chip held-chip"
                  onClick={() => setShowParkedModal(true)}
                  title="Recall a held order"
                >
                  <span className="table-chip-icon">⏸️</span>
                  <span className="table-chip-label">Held</span>
                  <span className="table-chip-badge">{parkedOrders.length}</span>
                </button>
              )}
              <button
                className={`table-chip${activeTable === null ? ' active' : ''}${quickOrder.length > 0 ? ' has-items' : ''}`}
                onClick={() => selectTable(null)}
              >
                <span className="table-chip-icon">🥡</span>
                <span className="table-chip-label">Quick</span>
                {quickOrder.length > 0 && (
                  <span className="table-chip-badge">{quickOrder.reduce((s, i) => s + i.qty, 0)}</span>
                )}
              </button>
              {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map(num => {
                const tableData = tables[num]
                const hasItems = tableData && tableData.items.length > 0
                const itemCount = hasItems ? tableData.items.reduce((s, i) => s + i.qty, 0) : 0
                return (
                  <button
                    key={num}
                    className={`table-chip${activeTable === num ? ' active' : ''}${hasItems ? ' has-items' : ''}`}
                    onClick={() => selectTable(num)}
                  >
                    <span className="table-chip-icon">🪑</span>
                    <span className="table-chip-label">T{num}</span>
                    {hasItems && <span className="table-chip-badge">{itemCount}</span>}
                  </button>
                )
              })}
            </div>

            <PosView onAddToOrder={addToOrder} activeTable={activeTable} />
          </>
        )}
        {activeView === 'tables' && (
          <TablesView 
            tables={tables} 
            activeTable={activeTable} 
            onSelectTable={handleSelectTableFromDashboard} 
          />
        )}
        {activeView === 'inventory' && (
          <InventoryView showToast={showToast} currentUser={currentUser} />
        )}
        {activeView === 'reports' && (
          <ReportsView currentUser={currentUser} showToast={showToast} />
        )}
        {activeView === 'orders' && (
          <OrderHistoryView settings={settings} showToast={showToast} />
        )}
        {activeView === 'menu' && (
          <MenuManagement showToast={showToast} />
        )}
        {activeView === 'settings' && (
          <SettingsView settings={settings} setSettings={setSettings} showToast={showToast} />
        )}
        {activeView === 'team' && (
          <UserManagement showToast={showToast} currentUser={currentUser} />
        )}
        {activeView === 'suppliers' && (
          <SuppliersView showToast={showToast} />
        )}
        {activeView === 'purchase' && (
          <PurchaseBillsView showToast={showToast} />
        )}
        {activeView === 'expenses' && (
          <ExpensesView showToast={showToast} />
        )}
        {activeView === 'stockledger' && (
          <StockLedgerView showToast={showToast} />
        )}
      </main>

      {activeView === 'pos' && (
        <button
          className={`mobile-cart-btn${totalItems > 0 ? ' has-items' : ''}`}
          onClick={() => setIsCartOpen(true)}
        >
          <span className="mcb-label">
            {totalItems > 0
              ? `${totalItems} item${totalItems !== 1 ? 's' : ''} selected`
              : (activeTable !== null ? `Table ${activeTable} · cart` : 'Your cart')}
          </span>
          <span className="mcb-right">
            {totalItems > 0 && <span className="mcb-total">₹{cartSubtotal.toFixed(0)}</span>}
            <span className="mcb-bag" key={totalItems}>🛍️</span>
          </span>
        </button>
      )}

      {isCartOpen && <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>}

      <div className={`order-panel-container ${isCartOpen ? 'open' : ''}`}>
        <button className="mobile-close-cart" onClick={() => setIsCartOpen(false)}>✕</button>
        <OrderPanel
          currentOrder={currentOrder}
          orderType={orderType}
          setOrderType={setOrderType}
          customerName={customerName}
          setCustomerName={setCustomerName}
          orderCounter={orderCounter}
          settings={settings}
          updateQty={updateQty}
          setItemNote={setItemNote}
          discount={discount}
          setDiscount={setDiscount}
          clearOrder={clearOrder}
          onCheckout={handleCheckout}
          onHold={holdOrder}
          showToast={showToast}
          activeTable={activeTable}
        />
      </div>

      {showParkedModal && (
        <div className="modal-overlay" onClick={() => setShowParkedModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Held Orders</div>
            {parkedOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No held orders.</p>
            ) : (
              <div className="parked-list">
                {parkedOrders.map(p => {
                  const count = (p.items || []).reduce((s, i) => s + i.qty, 0)
                  const value = (p.items || []).reduce((s, i) => s + i.price * i.qty, 0)
                  return (
                    <div key={p.id} className="parked-row">
                      <div className="parked-row-main">
                        <div className="parked-row-name">{p.customer_name || 'Walk-in'}</div>
                        <div className="parked-row-meta">
                          {count} item{count !== 1 ? 's' : ''} · ₹{value.toFixed(0)} · {p.order_type}
                        </div>
                      </div>
                      <div className="parked-row-actions">
                        <button className="btn-modal btn-modal-confirm" onClick={() => recallParked(p)}>Recall</button>
                        <button className="parked-del" title="Discard" onClick={() => deleteParked(p.id)}>🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-modal btn-modal-cancel" onClick={() => setShowParkedModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
