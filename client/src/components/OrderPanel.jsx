import { useState, useMemo } from 'react'

export default function OrderPanel({
  currentOrder, orderType, setOrderType, customerName, setCustomerName,
  orderCounter, settings, updateQty, clearOrder, onCheckout, showToast
}) {
  const [showPayModal, setShowPayModal] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const taxRate = parseFloat(settings.tax_rate || 5) / 100
  const subtotal = useMemo(() => currentOrder.reduce((s, i) => s + i.price * i.qty, 0), [currentOrder])
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  const handlePay = async (method) => {
    const order = await onCheckout(method)
    if (order) {
      setShowPayModal(false)
      setReceipt(order)
    }
  }

  const printOrder = () => {
    if (currentOrder.length === 0) {
      showToast('No items in order to print', 'error')
      return
    }
    setReceipt({
      order_number: orderCounter + 1,
      customer_name: customerName || 'Walk-in',
      created_at: new Date().toISOString(),
      items: currentOrder.map(i => ({ item_name: i.name, item_price: i.price, quantity: i.qty })),
      order_type: orderType,
      payment_method: 'Pending',
      subtotal, tax, total
    })
  }

  return (
    <aside className="order-panel">
      <div className="order-header">
        <div className="order-header-top">
          <h4>Current Order</h4>
          <span className="order-number">#{String(orderCounter + 1).padStart(3, '0')}</span>
        </div>
        <div className="order-type-toggle">
          {['dine-in', 'takeaway', 'delivery'].map(type => (
            <button
              key={type}
              className={`order-type-btn${orderType === type ? ' active' : ''}`}
              onClick={() => setOrderType(type)}
            >
              {type === 'dine-in' ? 'Dine In' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="customer-input"
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
        />
      </div>

      <div className="order-list-area">
        {currentOrder.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <p>Add items to start an order</p>
          </div>
        ) : (
          currentOrder.map(item => (
            <div key={item.id} className="order-item">
              <span className="order-item-emoji">{item.emoji}</span>
              <div className="order-item-details">
                <div className="order-item-title">{item.name}</div>
                <div className="order-item-price">₹{item.price} × {item.qty} = ₹{item.price * item.qty}</div>
              </div>
              <div className="qty-controls">
                <button
                  className={`qty-btn${item.qty === 1 ? ' delete-btn' : ''}`}
                  onClick={() => updateQty(item.id, -1)}
                >
                  {item.qty === 1 ? '🗑' : '−'}
                </button>
                <span className="qty-display">{item.qty}</span>
                <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="billing-section">
        <div className="bill-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
        <div className="bill-row"><span>GST ({settings.tax_rate || 5}%)</span><span>₹{tax.toFixed(2)}</span></div>
        <div className="bill-row total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
      </div>

      <div className="action-section">
        <div className="action-grid">
          <button className="btn-action btn-clear" onClick={clearOrder}>🗑 Clear</button>
          <button className="btn-action btn-print" onClick={printOrder}>🖨 Print</button>
          <button
            className="btn-action btn-checkout"
            disabled={currentOrder.length === 0}
            onClick={() => setShowPayModal(true)}
          >
            💳 Checkout — ₹{total.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Select Payment Method</div>
            <div className="modal-total">
              <div className="modal-total-label">Amount to Pay</div>
              <div className="modal-total-value">₹{total.toFixed(2)}</div>
            </div>
            <div className="payment-methods">
              <button className="payment-btn" onClick={() => handlePay('Cash')}>
                <span className="pay-icon">💵</span>Cash
              </button>
              <button className="payment-btn" onClick={() => handlePay('UPI')}>
                <span className="pay-icon">📱</span>UPI
              </button>
              <button className="payment-btn" onClick={() => handlePay('Card')}>
                <span className="pay-icon">💳</span>Card
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-modal-cancel" onClick={() => setShowPayModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="receipt-box">
              <div className="receipt-header">
                <div className="receipt-brand">{settings.shop_name || 'StreetWok'}</div>
                <div className="receipt-tagline">{settings.tagline || "The Biker's Cafe"}</div>
              </div>
              <div className="receipt-info">
                <div>Order #{receipt.order_number} | {receipt.order_type || orderType}</div>
                <div>{new Date(receipt.created_at).toLocaleDateString('en-IN')} {new Date(receipt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                <div>Customer: {receipt.customer_name}</div>
                <div>Payment: {receipt.payment_method}</div>
              </div>
              <div className="receipt-items">
                {receipt.items.map((item, i) => (
                  <div key={i} className="receipt-item">
                    <span>{item.item_name} ×{item.quantity}</span>
                    <span>₹{(item.item_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="receipt-total-row"><span>Subtotal</span><span>₹{receipt.subtotal.toFixed(2)}</span></div>
                <div className="receipt-total-row"><span>GST ({settings.tax_rate || 5}%)</span><span>₹{receipt.tax.toFixed(2)}</span></div>
                <div className="receipt-total-row grand-total"><span>TOTAL</span><span>₹{receipt.total.toFixed(2)}</span></div>
              </div>
              <div className="receipt-footer">Thank you for visiting {settings.shop_name || 'StreetWok'}! 🏍️</div>
            </div>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-modal btn-modal-cancel" onClick={() => setReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
