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
import TablesView from './components/TablesView'
import SuppliersView from './components/SuppliersView'
import PurchaseBillsView from './components/PurchaseBillsView'
import ExpensesView from './components/ExpensesView'
import StockLedgerView from './components/StockLedgerView'
import * as api from './api'

const TOTAL_TABLES = 10

export default function App() {
  const [activeView, setActiveView] = useState('loading')
  const [startupError, setStartupError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isCartOpen, setIsCartOpen] = useState(false)

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

  const saveTimer = useRef(null)

  // Derived current order based on active table or quick order
  const currentOrder = activeTable !== null
    ? (tables[activeTable]?.items || [])
    : quickOrder

  const orderType = activeTable !== null
    ? (tables[activeTable]?.orderType || 'dine-in')
    : quickOrderType

  const customerName = activeTable !== null
    ? (tables[activeTable]?.customerName || '')
    : quickCustomerName

  const totalItems = currentOrder.reduce((sum, item) => sum + item.qty, 0)

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
    setActiveView('pos')
    return Promise.allSettled([
      api.getSettings().then(setSettings),
      api.getOrderCounter().then(data => setOrderCounter(data.last_number)),
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

  const clearOrder = useCallback(() => {
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
  }, [activeTable, saveTableToServer])

  const handleCheckout = useCallback(async (paymentMethod) => {
    const taxRate = parseFloat(settings.tax_rate) / 100
    const subtotal = currentOrder.reduce((s, i) => s + i.price * i.qty, 0)
    const tax = Math.round(subtotal * taxRate * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100

    try {
      const order = await api.createOrder({
        customer_name: customerName || (activeTable !== null ? `Table ${activeTable}` : 'Walk-in'),
        order_type: orderType,
        payment_method: paymentMethod,
        items: currentOrder,
        subtotal, tax, total,
        table_number: activeTable
      })
      setOrderCounter(order.order_number)

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
  }, [currentOrder, customerName, orderType, activeTable, settings, showToast])

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
    <div className={`app-container${activeView === 'pos' ? ' pos-mode' : ''}`}>
      <Sidebar
        activeView={activeView} 
        onViewChange={(view) => {
          if (view === 'logout') {
            handleLogout()
          } else {
            setActiveView(view)
          }
        }} 
        currentUser={currentUser}
      />

      <main className="main-content">
        {activeView === 'pos' && (
          <>
            {/* Table Selector Bar */}
            <div className="table-bar">
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
          <InventoryView showToast={showToast} />
        )}
        {activeView === 'reports' && (
          <ReportsView currentUser={currentUser} showToast={showToast} />
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
        <button className="mobile-cart-btn" onClick={() => setIsCartOpen(true)}>
          🛒 {activeTable !== null ? `T${activeTable}` : 'Cart'} {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
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
          clearOrder={clearOrder}
          onCheckout={handleCheckout}
          showToast={showToast}
          activeTable={activeTable}
        />
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
