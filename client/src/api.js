const runtimeBase = typeof window !== 'undefined' ? window.streetwokConfig?.apiBaseUrl : undefined;
const hasUsableRuntimeBase =
  typeof runtimeBase === 'string' &&
  runtimeBase.trim() !== '' &&
  !runtimeBase.includes('YOUR_CLOUD_SERVER_IP');
const BASE = (hasUsableRuntimeBase ? runtimeBase : undefined) || import.meta.env.VITE_API_URL || '/api';

let memoryToken = null;

export const setAuthToken = (token) => {
  if (token) {
    memoryToken = token;
  } else {
    memoryToken = null;
  }
  // Clear any legacy tokens to enforce strict login
  sessionStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token');
};

export const getAuthToken = () => memoryToken;

export const clearAuthToken = () => {
  memoryToken = null;
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
export const deleteOrder = (id) => request(`/orders/${id}`, { method: 'DELETE' });
export const clearAllOrders = () => request('/orders/all', { method: 'DELETE' });

// Inventory
export const getInventory = () => request('/inventory');
export const createInventoryItem = (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) });
export const updateInventoryItem = (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const bulkUpdateInventory = (updates) => request('/inventory', { method: 'PUT', body: JSON.stringify({ updates }) });
export const deleteInventoryItem = (id) => request(`/inventory/${id}`, { method: 'DELETE' });

// Recipes (menu item -> inventory ingredient mapping)
export const getRecipe = (menuItemId) => request(`/recipes/${menuItemId}`);
export const updateRecipe = (menuItemId, ingredients) =>
  request(`/recipes/${menuItemId}`, { method: 'PUT', body: JSON.stringify({ ingredients }) });

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

// Warehouses
export const getWarehouses = () => request('/warehouses');
export const createWarehouse = (data) => request('/warehouses', { method: 'POST', body: JSON.stringify(data) });
export const updateWarehouse = (id, data) => request(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteWarehouse = (id) => request(`/warehouses/${id}`, { method: 'DELETE' });

// Suppliers
export const getSuppliers = (params) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/suppliers${qs}`); };
export const getSupplier = (id) => request(`/suppliers/${id}`);
export const createSupplier = (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) });
export const updateSupplier = (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSupplier = (id) => request(`/suppliers/${id}`, { method: 'DELETE' });

// Purchase Bills
export const getPurchaseBills = (params) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/purchase-bills${qs}`); };
export const getPurchaseBill = (id) => request(`/purchase-bills/${id}`);
export const createPurchaseBill = (data) => request('/purchase-bills', { method: 'POST', body: JSON.stringify(data) });
export const updatePurchaseBill = (id, data) => request(`/purchase-bills/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const submitPurchaseBill = (id) => request(`/purchase-bills/${id}/submit`, { method: 'POST' });
export const cancelPurchaseBill = (id) => request(`/purchase-bills/${id}/cancel`, { method: 'POST' });

// Expense Bills
export const getExpenses = (params) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/expenses${qs}`); };
export const getExpense = (id) => request(`/expenses/${id}`);
export const createExpense = (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) });
export const updateExpense = (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteExpense = (id) => request(`/expenses/${id}`, { method: 'DELETE' });

// Payments
export const getPayments = (params) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/payments${qs}`); };
export const createPayment = (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) });
export const deletePayment = (id) => request(`/payments/${id}`, { method: 'DELETE' });

// Stock Ledger
export const getStockLedgerEntries = (params) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/stock/entries${qs}`); };
export const getStockBalance = (params) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/stock/balance${qs}`); };
export const getStockValuation = () => request('/stock/valuation');
export const getReorderItems = () => request('/stock/reorder');
export const postStockAdjustment = (data) => request('/stock/adjustment', { method: 'POST', body: JSON.stringify(data) });

// Tables
export const getTables = () => request('/tables');
export const openTable = (table_number) => request('/tables', { method: 'POST', body: JSON.stringify({ table_number }) });
export const updateTable = (tableNumber, data) => request(`/tables/${tableNumber}`, { method: 'PUT', body: JSON.stringify(data) });
export const closeTable = (tableNumber) => request(`/tables/${tableNumber}`, { method: 'DELETE' });
