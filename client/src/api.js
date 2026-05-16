const runtimeBase = typeof window !== 'undefined' ? window.streetwokConfig?.apiBaseUrl : undefined;
const hasUsableRuntimeBase =
  typeof runtimeBase === 'string' &&
  runtimeBase.trim() !== '' &&
  !runtimeBase.includes('YOUR_CLOUD_SERVER_IP');
const BASE = (hasUsableRuntimeBase ? runtimeBase : undefined) || import.meta.env.VITE_API_URL || '/api';

export const setAuthToken = (token) => {
  if (token) {
    sessionStorage.setItem('auth_token', token);
  } else {
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token'); // Clear any legacy token
  }
};

export const getAuthToken = () => sessionStorage.getItem('auth_token');

export const clearAuthToken = () => {
  sessionStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token');
};

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Connection timed out while reaching ${BASE}`);
    }
    throw new Error(`Failed to fetch from ${BASE}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth
export const getSession = () => request('/session');
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
export const getMonthlyReport = () => request('/reports/monthly');
export const getTodayItems = () => request('/reports/today-items');
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

// Tables
export const getTables = () => request('/tables');
export const openTable = (table_number) => request('/tables', { method: 'POST', body: JSON.stringify({ table_number }) });
export const updateTable = (tableNumber, data) => request(`/tables/${tableNumber}`, { method: 'PUT', body: JSON.stringify(data) });
export const closeTable = (tableNumber) => request(`/tables/${tableNumber}`, { method: 'DELETE' });
