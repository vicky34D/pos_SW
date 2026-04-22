import { useState, useEffect, useCallback } from 'react'
import './index.css'
import Sidebar from './components/Sidebar'
import PosView from './components/PosView'
import OrderPanel from './components/OrderPanel'
import InventoryView from './components/InventoryView'
import ReportsView from './components/ReportsView'
import MenuManagement from './components/MenuManagement'
import SettingsView from './components/SettingsView'
import Toast from './components/Toast'
import * as api from './api'

export default function App() {
  const [activeView, setActiveView] = useState('pos')
  const [currentOrder, setCurrentOrder] = useState([])
  const [orderType, setOrderType] = useState('dine-in')
  const [customerName, setCustomerName] = useState('')
  const [orderCounter, setOrderCounter] = useState(0)
  const [settings, setSettings] = useState({ shop_name: 'StreetWok', tagline: "The Biker's Cafe", tax_rate: '5' })
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {})
    api.getOrderCounter().then(data => setOrderCounter(data.last_number)).catch(() => {})
  }, [])

  const addToOrder = useCallback((item) => {
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, emoji: item.emoji, qty: 1 }]
    })
    showToast(`${item.name} added`, 'success')
  }, [showToast])

  const updateQty = useCallback((itemId, delta) => {
    setCurrentOrder(prev => {
      const updated = prev.map(i => i.id === itemId ? { ...i, qty: i.qty + delta } : i)
      return updated.filter(i => i.qty > 0)
    })
  }, [])

  const clearOrder = useCallback(() => {
    setCurrentOrder([])
    setCustomerName('')
  }, [])

  const handleCheckout = useCallback(async (paymentMethod) => {
    const taxRate = parseFloat(settings.tax_rate) / 100
    const subtotal = currentOrder.reduce((s, i) => s + i.price * i.qty, 0)
    const tax = Math.round(subtotal * taxRate * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100

    try {
      const order = await api.createOrder({
        customer_name: customerName || 'Walk-in',
        order_type: orderType,
        payment_method: paymentMethod,
        items: currentOrder,
        subtotal, tax, total
      })
      setOrderCounter(order.order_number)
      clearOrder()
      showToast(`Order #${order.order_number} completed — ${paymentMethod}`, 'success')
      return order
    } catch (err) {
      showToast(err.message, 'error')
      return null
    }
  }, [currentOrder, customerName, orderType, settings, clearOrder, showToast])

  return (
    <div className="app-container">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="main-content">
        {activeView === 'pos' && (
          <PosView onAddToOrder={addToOrder} />
        )}
        {activeView === 'inventory' && (
          <InventoryView showToast={showToast} />
        )}
        {activeView === 'reports' && (
          <ReportsView />
        )}
        {activeView === 'menu' && (
          <MenuManagement showToast={showToast} />
        )}
        {activeView === 'settings' && (
          <SettingsView settings={settings} setSettings={setSettings} showToast={showToast} />
        )}
      </main>

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
      />

      <Toast toasts={toasts} />
    </div>
  )
}
