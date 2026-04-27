// When running as desktop app, VITE_API_URL points to the cloud server.
// When running as web app on OCI, it defaults to relative '/api'.
const BASE = import.meta.env.VITE_API_URL || '/api';

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = () => localStorage.getItem('auth_token');

export const clearAuthToken = () => localStorage.removeItem('auth_token');

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth
export const googleLogin = (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
export const setupProfile = (data) => request('/auth/setup-profile', { method: 'POST', body: JSON.stringify(data) });
export const login = (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) });

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

// Users / Team
export const getUsers = () => request('/users');
export const createUser = (data) => request('/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUserRole = (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id) => request(`/users/${id}`, { method: 'DELETE' });

