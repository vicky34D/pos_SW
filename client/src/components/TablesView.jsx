import React from 'react'

export default function TablesView({ tables, activeTable, onSelectTable }) {
  const TOTAL_TABLES = 10;
  
  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Tables Dashboard</div>
          <div className="header-subtitle">Manage dine-in tables and view current orders</div>
        </div>
      </div>
      
      <div className="tables-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
        {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map(num => {
          const tableData = tables[num] || { items: [], customerName: '', orderType: 'dine-in' };
          const hasItems = tableData.items.length > 0;
          const total = tableData.items.reduce((s, item) => s + (item.price * item.qty), 0);
          const itemCount = tableData.items.reduce((s, item) => s + item.qty, 0);

          return (
            <div key={num} className="report-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderTop: hasItems ? '4px solid var(--primary)' : '4px solid #cbd5e1' }}>
              <div className="report-card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <h5 style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Table {num}</span>
                  {hasItems ? (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '1rem', fontWeight: 600 }}>
                      Engaged ({itemCount} items)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: '#64748b', borderRadius: '1rem', fontWeight: 600 }}>
                      Empty
                    </span>
                  )}
                </h5>
                {tableData.customerName && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    👤 {tableData.customerName}
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '180px', paddingRight: '0.5rem' }}>
                {hasItems ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                    {tableData.items.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ display: 'flex', gap: '0.4rem' }}>
                          <span style={{color: 'var(--text-muted)', fontWeight: 600}}>{item.qty}x</span> 
                          <span>{item.name}</span>
                        </span>
                        <span style={{fontWeight: 600}}>₹{item.price * item.qty}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                    No active order for this table
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                {hasItems ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>₹{total}</span>
                  </div>
                ) : null}
                
                <button 
                  className={hasItems ? "pastel-btn-primary" : "pastel-btn-secondary"} 
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                  onClick={() => onSelectTable(num)}
                >
                  {hasItems ? '✏️ Edit Order / Add Items' : '🍽️ Start New Order'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
