const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Menu
export const getMenu = (category, search) => {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();
  return request(`/menu${qs ? '?' + qs : ''}`);
};
export const createMenuItem = (data) => request('/menu', { method: 'POST', body: JSON.stringify(data) });
export const updateMenuItem = (id, data) => request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMenuItem = (id) => request(`/menu/${id}`, { method: 'DELETE' });

// Orders
export const getOrders = (params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/orders${qs}`);
};
export const createOrder = (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) });
export const clearAllOrders = () => request('/orders/all', { method: 'DELETE' });

// Inventory
export const getInventory = () => request('/inventory');
export const createInventoryItem = (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) });
export const updateInventoryItem = (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const bulkUpdateInventory = (updates) => request('/inventory', { method: 'PUT', body: JSON.stringify({ updates }) });
export const deleteInventoryItem = (id) => request(`/inventory/${id}`, { method: 'DELETE' });

// Reports
export const getReportSummary = () => request('/reports/summary');
export const getDailyReport = () => request('/reports/daily');
export const getTopItems = () => request('/reports/top-items');
export const getOrderCounter = () => request('/reports/counter');

// Settings
export const getSettings = () => request('/settings');
export const updateSettings = (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) });
