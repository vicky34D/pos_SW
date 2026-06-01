// Standalone preview of the real OrderPanel component with mock data.
// Lets you see the new cash "change to return" flow in the browser without
// the backend or Google login. Not part of the production app.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import OrderPanel from './components/OrderPanel.jsx'

const SAMPLE_ITEMS = [
  { id: 1, name: 'Classic Veg Burger', emoji: '🍔', category: 'burgers', price: 120, qty: 1 },
  { id: 2, name: 'Peri Peri Fries', emoji: '🍟', category: 'fries', price: 85, qty: 1 },
  { id: 3, name: 'Cold Coffee', emoji: '🥤', category: 'drinks', price: 40, qty: 1 },
]

function Harness() {
  const [order, setOrder] = useState(SAMPLE_ITEMS)
  const [orderType, setOrderType] = useState('takeaway')
  const [customerName, setCustomerName] = useState('')

  const settings = { tax_rate: 5, shop_name: 'StreetWok', tagline: "The Biker's Cafe" }

  const updateQty = (id, delta) =>
    setOrder(prev =>
      prev
        .map(i => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter(i => i.qty > 0)
    )

  const clearOrder = () => setOrder([])

  const showToast = (msg, type) => console.log(`[toast:${type}] ${msg}`)

  // Mock the server checkout: return a receipt-shaped order object.
  const onCheckout = async (paymentMethod) => {
    const subtotal = order.reduce((s, i) => s + i.price * i.qty, 0)
    const tax = Math.round(subtotal * 0.05 * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100
    return {
      order_number: 7,
      customer_name: customerName || 'Walk-in',
      created_at: new Date().toISOString(),
      order_type: orderType,
      payment_method: paymentMethod,
      items: order.map(i => ({ item_name: i.name, item_price: i.price, quantity: i.qty })),
      subtotal,
      tax,
      total,
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '24px auto', height: '90vh' }}>
      <OrderPanel
        currentOrder={order}
        orderType={orderType}
        setOrderType={setOrderType}
        customerName={customerName}
        setCustomerName={setCustomerName}
        orderCounter={6}
        settings={settings}
        updateQty={updateQty}
        clearOrder={clearOrder}
        onCheckout={onCheckout}
        showToast={showToast}
        activeTable={null}
      />
    </div>
  )
}

createRoot(document.getElementById('preview-root')).render(<Harness />)
