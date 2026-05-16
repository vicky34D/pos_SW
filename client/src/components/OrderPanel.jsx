import { useState, useMemo } from 'react'

const categoryLabels = {
  burgers: 'Burger', fries: 'Fries', strips: 'Strips',
  drinks: 'Drink', popcorn: 'Popcorn', snacks: 'Snack',
  wings: 'Wings', momos: 'Momos', combos: 'Combo',
  cigarettes: 'Cigarette', other: 'Item'
}

export default function OrderPanel({
  currentOrder, orderType, setOrderType, customerName, setCustomerName,
  orderCounter, settings, updateQty, clearOrder, onCheckout, showToast,
  activeTable
}) {
  const [showPayModal, setShowPayModal] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const taxRate = parseFloat(settings.tax_rate || 5) / 100
  const subtotal = useMemo(() => currentOrder.reduce((s, i) => s + i.price * i.qty, 0), [currentOrder])
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100
  const totalItems = currentOrder.reduce((s, i) => s + i.qty, 0)

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
      {/* Header */}
      <div className="order-header">
        <div className="order-header-top">
          <h4>{activeTable !== null ? `🪑 Table ${activeTable}` : '🥡 Quick Order'}</h4>
          <span className="order-number">#{String(orderCounter + 1).padStart(3, '0')}</span>
        </div>
        <div className="order-type-toggle">
          {['dine-in', 'takeaway', 'delivery'].map(type => (
            <button
              key={type}
              className={`order-type-btn${orderType === type ? ' active' : ''}`}
              onClick={() => setOrderType(type)}
            >
              {type === 'dine-in' ? '🍽 Dine In' : type === 'takeaway' ? '🥡 Takeaway' : '🚴 Delivery'}
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

      {/* Items List */}
      <div className="order-list-area">
        {currentOrder.length === 0 ? (
          <div className="empty-cart">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <p>Add items to start an order</p>
          </div>
        ) : (
          <>
            <div className="order-items-count">{totalItems} item{totalItems !== 1 ? 's' : ''} in cart</div>
            {currentOrder.map(item => (
              <div key={item.id} className="order-item">
                <div className="order-item-left">
                  <span className="order-item-emoji">{item.emoji}</span>
                  <div className="order-item-details">
                    <div className="order-item-title">{item.name}</div>
                    <div className="order-item-meta">
                      {item.category && (
                        <span className="order-item-category">{categoryLabels[item.category] || item.category}</span>
                      )}
                      {item.description && (
                        <span className="order-item-desc-text">{item.description}</span>
                      )}
                    </div>
                    <div className="order-item-price">₹{item.price} × {item.qty} = <strong>₹{(item.price * item.qty).toFixed(0)}</strong></div>
                  </div>
                </div>
                <div className="order-item-right">
                  <div className="qty-controls">
                    <button
                      className={`qty-btn${item.qty === 1 ? ' delete-btn' : ''}`}
                      onClick={() => updateQty(item.id, -1)}
                    >
                      {item.qty === 1 ? '✕' : '−'}
                    </button>
                    <span className="qty-display">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Billing */}
      <div className="billing-section">
        <div className="bill-row"><span>Subtotal ({totalItems} items)</span><span>₹{subtotal.toFixed(2)}</span></div>
        <div className="bill-row"><span>GST ({settings.tax_rate || 5}%)</span><span>₹{tax.toFixed(2)}</span></div>
        <div className="bill-row total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
      </div>

      {/* Actions */}
      <div className="action-section">
        <div className="action-grid">
          <button className="btn-action btn-clear" onClick={clearOrder}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Clear
          </button>
          <button className="btn-action btn-print" onClick={printOrder}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print KOT
          </button>
          <button
            className="btn-action btn-checkout"
            disabled={currentOrder.length === 0}
            onClick={() => setShowPayModal(true)}
          >
            Checkout — ₹{total.toFixed(2)}
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} · Incl. {settings.tax_rate || 5}% GST
              </div>
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
