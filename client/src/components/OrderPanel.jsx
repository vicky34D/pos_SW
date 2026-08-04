import { useState, useMemo } from 'react'
import SwipeButton from './SwipeButton'
import Receipt from './Receipt'
import { computeTotals } from '../lib/totals'

const categoryLabels = {
  burgers: 'Burger', fries: 'Fries', strips: 'Strips',
  drinks: 'Drink', popcorn: 'Popcorn', snacks: 'Snack',
  wings: 'Wings', momos: 'Momos', combos: 'Combo',
  cigarettes: 'Cigarette', other: 'Item'
}

export default function OrderPanel({
  currentOrder, orderType, setOrderType, customerName, setCustomerName,
  orderCounter, settings, updateQty, setItemNote, discount, setDiscount,
  clearOrder, onCheckout, onHold, showToast, activeTable
}) {
  const [showPayModal, setShowPayModal] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [cashMode, setCashMode] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [openNoteId, setOpenNoteId] = useState(null)

  const activeDiscount = discount || { mode: 'flat', value: 0 }
  const { subtotal, discountAmount, tax, total } = useMemo(
    () => computeTotals(currentOrder, settings.tax_rate || 5, discount || { mode: 'flat', value: 0 }),
    [currentOrder, settings.tax_rate, discount]
  )
  const totalItems = currentOrder.reduce((s, i) => s + i.qty, 0)

  // Cash tendered → change to return to the customer
  const received = parseFloat(cashReceived)
  const hasReceived = !isNaN(received) && cashReceived !== ''
  const changeDue = hasReceived ? Math.round((received - total) * 100) / 100 : 0
  const shortBy = hasReceived && changeDue < 0 ? Math.abs(changeDue) : 0

  // Keep any cash typed inline (don't wipe it just because the modal closed)
  const closePayModal = () => {
    setShowPayModal(false)
    setCashMode(false)
  }

  const handlePay = async (method, extra = {}) => {
    const order = await onCheckout(method)
    if (order) {
      closePayModal()
      setCashReceived('')
      setReceipt({ ...order, ...extra })
    }
  }

  const handleCashPay = () => {
    // Block completion if customer hasn't tendered enough
    if (hasReceived && changeDue < 0) return
    handlePay('Cash', hasReceived
      ? { cash_received: received, change_due: changeDue }
      : {})
  }

  // Clearing the order should also clear the tendered cash
  const handleClear = () => {
    setCashReceived('')
    clearOrder()
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
      items: currentOrder.map(i => ({ item_name: i.name, item_price: i.price, quantity: i.qty, notes: i.note || '' })),
      order_type: orderType,
      payment_method: 'Pending',
      subtotal, tax, total, discount: discountAmount
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
              <div key={item.id} className="order-item-wrap">
                <div className="order-item">
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
                    {setItemNote && (
                      <button
                        className={`order-item-note-btn${item.note ? ' has-note' : ''}`}
                        title={item.note ? 'Edit note' : 'Add note'}
                        onClick={() => setOpenNoteId(openNoteId === item.id ? null : item.id)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        Note
                      </button>
                    )}
                  </div>
                </div>
                {setItemNote && (openNoteId === item.id || item.note) && (
                  <div className="order-item-note-row">
                    <input
                      className="order-item-note-input"
                      placeholder="e.g. extra spicy, no onion"
                      value={item.note || ''}
                      autoFocus={openNoteId === item.id}
                      onChange={e => setItemNote(item.id, e.target.value)}
                      onBlur={() => setOpenNoteId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Billing */}
      <div className="billing-section">
        <div className="bill-row"><span>Subtotal ({totalItems} items)</span><span>₹{subtotal.toFixed(2)}</span></div>

        {currentOrder.length > 0 && setDiscount && (
          <div className="bill-discount">
            <span className="bill-discount-label">Discount</span>
            <div className="bill-discount-controls">
              <div className="discount-mode-toggle">
                <button
                  className={activeDiscount.mode === 'flat' ? 'active' : ''}
                  onClick={() => setDiscount({ mode: 'flat', value: activeDiscount.value })}
                >₹</button>
                <button
                  className={activeDiscount.mode === 'percent' ? 'active' : ''}
                  onClick={() => setDiscount({ mode: 'percent', value: activeDiscount.value })}
                >%</button>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                className="discount-input"
                placeholder="0"
                value={activeDiscount.value || ''}
                onChange={e => setDiscount({ mode: activeDiscount.mode, value: e.target.value })}
              />
            </div>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="bill-row bill-row-discount">
            <span>Discount{activeDiscount.mode === 'percent' ? ` (${activeDiscount.value}%)` : ''}</span>
            <span>−₹{discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="bill-row"><span>GST ({settings.tax_rate || 5}%)</span><span>₹{tax.toFixed(2)}</span></div>
        <div className="bill-row total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>

        {/* Cash tendered + balance — calculated before checkout */}
        {currentOrder.length > 0 && (
          <div className="bill-cash">
            <div className="bill-cash-row">
              <span>Cash received</span>
              <div className="bill-cash-input-wrap">
                <span className="bill-cash-prefix">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  className="bill-cash-input"
                  placeholder="0"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                />
              </div>
            </div>
            {hasReceived && (
              shortBy > 0 ? (
                <div className="bill-row balance short"><span>Short by</span><span>₹{shortBy.toFixed(2)}</span></div>
              ) : (
                <div className="bill-row balance"><span>Balance to return</span><span>₹{changeDue.toFixed(2)}</span></div>
              )
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="action-section">
        <div className="action-grid">
          <button className="btn-action btn-clear" onClick={handleClear}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Clear
          </button>
          <button className="btn-action btn-print" onClick={printOrder}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print KOT
          </button>
          {onHold && activeTable === null && currentOrder.length > 0 && (
            <button className="btn-action btn-hold" onClick={onHold}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              Hold order
            </button>
          )}
          <SwipeButton
            label={`Swipe to pay · ₹${total.toFixed(2)}`}
            disabled={currentOrder.length === 0}
            onConfirm={() => setShowPayModal(true)}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{cashMode ? 'Cash Payment' : 'Select Payment Method'}</div>
            <div className="modal-total">
              <div className="modal-total-label">Amount to Pay</div>
              <div className="modal-total-value">₹{total.toFixed(2)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} · Incl. {settings.tax_rate || 5}% GST
              </div>
            </div>

            {!cashMode ? (
              <>
                <div className="payment-methods">
                  <button className="payment-btn" onClick={() => setCashMode(true)}>
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
                  <button className="btn-modal btn-modal-cancel" onClick={closePayModal}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="cash-entry">
                  <label className="cash-entry-label">Cash Received from Customer</label>
                  <div className="cash-input-wrap">
                    <span className="cash-input-prefix">₹</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      className="cash-input"
                      placeholder={total.toFixed(0)}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="cash-quick-grid">
                    {[total, 100, 200, 500, 1000, 2000]
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .map(v => (
                        <button
                          key={v}
                          type="button"
                          className="cash-quick-btn"
                          onClick={() => setCashReceived(String(v === total ? total.toFixed(2) : v))}
                        >
                          {v === total ? 'Exact' : `₹${v}`}
                        </button>
                      ))}
                  </div>

                  {hasReceived && (
                    shortBy > 0 ? (
                      <div className="change-display short">
                        <span>Short by</span>
                        <strong>₹{shortBy.toFixed(2)}</strong>
                      </div>
                    ) : (
                      <div className="change-display">
                        <span>Return to Customer</span>
                        <strong>₹{changeDue.toFixed(2)}</strong>
                      </div>
                    )
                  )}
                </div>

                <div className="modal-actions">
                  <button className="btn-modal btn-modal-cancel" onClick={() => { setCashMode(false); setCashReceived('') }}>Back</button>
                  <button
                    className="btn-modal btn-modal-confirm"
                    disabled={shortBy > 0}
                    onClick={handleCashPay}
                  >
                    Complete Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <Receipt receipt={{ order_type: orderType, ...receipt }} settings={settings} />
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-modal btn-modal-cancel" onClick={() => setReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
