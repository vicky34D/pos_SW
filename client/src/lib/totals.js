// Single source of truth for order money math so the cart, checkout, and the
// server-persisted order all agree. Discount applies to the subtotal; tax is
// charged on the discounted (taxable) amount.
export function computeTotals(order, taxRatePercent, discount) {
  const subtotal = order.reduce((s, i) => s + i.price * i.qty, 0);
  const rate = (parseFloat(taxRatePercent) || 0) / 100;

  let discountAmount = 0;
  if (discount && discount.value) {
    const val = parseFloat(discount.value) || 0;
    discountAmount = discount.mode === 'percent' ? subtotal * (val / 100) : val;
  }
  // Never discount below zero or above the subtotal.
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  const taxable = Math.round((subtotal - discountAmount) * 100) / 100;
  const tax = Math.round(taxable * rate * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  return { subtotal, discountAmount, taxable, tax, total };
}
