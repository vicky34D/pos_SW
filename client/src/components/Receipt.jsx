// Shared receipt/bill render used by the live checkout confirmation and by
// the Order History reprint. Reads a normalized order object.
export default function Receipt({ receipt, settings = {} }) {
  const taxRate = settings.tax_rate || 5
  const discount = Number(receipt.discount) || 0
  return (
    <div className="receipt-box">
      <div className="receipt-header">
        <div className="receipt-brand">{settings.shop_name || 'StreetWok'}</div>
        <div className="receipt-tagline">{settings.tagline || "The Biker's Cafe"}</div>
      </div>
      <div className="receipt-info">
        <div>Order #{receipt.order_number} | {receipt.order_type}</div>
        <div>
          {new Date(receipt.created_at).toLocaleDateString('en-IN')}{' '}
          {new Date(receipt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div>Customer: {receipt.customer_name}</div>
        <div>Payment: {receipt.payment_method}</div>
      </div>
      <div className="receipt-items">
        {receipt.items.map((item, i) => {
          const name = item.item_name ?? item.name
          const price = item.item_price ?? item.price
          const qty = item.quantity ?? item.qty
          const note = item.notes ?? item.note
          return (
            <div key={i} className="receipt-item-block">
              <div className="receipt-item">
                <span>{name} ×{qty}</span>
                <span>₹{(price * qty).toFixed(2)}</span>
              </div>
              {note ? <div className="receipt-item-note">↳ {note}</div> : null}
            </div>
          )
        })}
      </div>
      <div>
        <div className="receipt-total-row"><span>Subtotal</span><span>₹{Number(receipt.subtotal).toFixed(2)}</span></div>
        {discount > 0 && (
          <div className="receipt-total-row"><span>Discount</span><span>−₹{discount.toFixed(2)}</span></div>
        )}
        <div className="receipt-total-row"><span>GST ({taxRate}%)</span><span>₹{Number(receipt.tax).toFixed(2)}</span></div>
        <div className="receipt-total-row grand-total"><span>TOTAL</span><span>₹{Number(receipt.total).toFixed(2)}</span></div>
        {receipt.cash_received != null && (
          <>
            <div className="receipt-total-row"><span>Cash Received</span><span>₹{Number(receipt.cash_received).toFixed(2)}</span></div>
            <div className="receipt-total-row"><span>Change Returned</span><span>₹{Number(receipt.change_due).toFixed(2)}</span></div>
          </>
        )}
      </div>
      <div className="receipt-footer">Thank you for visiting {settings.shop_name || 'StreetWok'}! 🏍️</div>
    </div>
  )
}
