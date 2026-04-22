// ===================================================================
// STREETWOK POS - The Biker's Cafe
// Point of Sale Application
// ===================================================================

// ===== CONSTANTS =====
const APP_PREFIX = 'streetwok_pos_';
const TAX_RATE_DEFAULT = 5; // 5% GST

// ===== CATEGORY DEFINITIONS =====
const categories = [
    { id: 'all', name: 'All Items', emoji: '🍽️' },
    { id: 'burgers', name: 'Burgers', emoji: '🍔' },
    { id: 'fries', name: 'Fries', emoji: '🍟' },
    { id: 'strips', name: 'Strips', emoji: '🍗' },
    { id: 'drinks', name: 'Chai & Coffee', emoji: '☕' },
    { id: 'popcorn', name: 'Popcorn', emoji: '🍿' },
    { id: 'snacks', name: 'Snacks', emoji: '🧀' },
    { id: 'wings', name: 'Wings', emoji: '🍗' },
    { id: 'momos', name: 'Momos', emoji: '🥟' },
    { id: 'combos', name: 'Combos', emoji: '🎁' }
];

// ===== DEFAULT MENU ITEMS (from Street Wok actual menu) =====
const defaultMenuItems = [
    // BURGERS
    { id: 'b1', name: 'Aloo Tikki Burger', price: 59, category: 'burgers', emoji: '🍔' },
    { id: 'b2', name: 'Smash Chicken Burger', price: 79, category: 'burgers', emoji: '🍔' },
    { id: 'b3', name: 'Momo Burger', price: 79, category: 'burgers', emoji: '🍔' },
    { id: 'b4', name: 'Zinger Burger', price: 79, category: 'burgers', emoji: '🍔' },

    // FRIES
    { id: 'f1', name: 'Regular Fries', price: 49, category: 'fries', emoji: '🍟' },
    { id: 'f2', name: 'Fries Large', price: 79, category: 'fries', emoji: '🍟' },
    { id: 'f3', name: 'Peri Peri Small', price: 79, category: 'fries', emoji: '🍟' },
    { id: 'f4', name: 'Peri Peri Large', price: 89, category: 'fries', emoji: '🍟' },
    { id: 'f5', name: 'Loaded Fries', price: 109, category: 'fries', emoji: '🍟' },
    { id: 'f6', name: 'Add Fries', price: 39, category: 'fries', emoji: '🍟' },

    // PERI PERI STRIPS
    { id: 'ps1', name: 'Peri Peri Strips (4pcs)', price: 99, category: 'strips', emoji: '🍗' },
    { id: 'ps2', name: 'Peri Peri Strips (6pcs)', price: 149, category: 'strips', emoji: '🍗' },

    // CHAI & COFFEE
    { id: 'd1', name: 'Chai Small', price: 10, category: 'drinks', emoji: '🍵' },
    { id: 'd2', name: 'Chai Large', price: 20, category: 'drinks', emoji: '🍵' },
    { id: 'd3', name: 'Hot Coffee Small', price: 30, category: 'drinks', emoji: '☕' },
    { id: 'd4', name: 'Hot Coffee Large', price: 60, category: 'drinks', emoji: '☕' },
    { id: 'd5', name: 'Black Coffee Small', price: 25, category: 'drinks', emoji: '☕' },
    { id: 'd6', name: 'Black Coffee Large', price: 50, category: 'drinks', emoji: '☕' },

    // POPCORN
    { id: 'pc1', name: 'Chicken Popcorn', price: 59, category: 'popcorn', emoji: '🍿' },
    { id: 'pc2', name: 'Saucy Popcorn', price: 79, category: 'popcorn', emoji: '🍿' },
    { id: 'pc3', name: 'Maxi Chicken Popcorn', price: 99, category: 'popcorn', emoji: '🍿' },
    { id: 'pc4', name: 'Maxi Saucy Popcorn', price: 119, category: 'popcorn', emoji: '🍿' },

    // SNACKS
    { id: 's1', name: 'Mozzarella Sticks (5pcs)', price: 59, category: 'snacks', emoji: '🧀' },
    { id: 's2', name: 'Mozzarella Sticks (10pcs)', price: 109, category: 'snacks', emoji: '🧀' },
    { id: 's3', name: 'Spring Roll (3pcs)', price: 59, category: 'snacks', emoji: '🌯' },
    { id: 's4', name: 'Spring Roll (6pcs)', price: 109, category: 'snacks', emoji: '🌯' },
    { id: 's5', name: 'Potato Nuggets Small', price: 59, category: 'snacks', emoji: '🥔' },
    { id: 's6', name: 'Potato Nuggets Large', price: 109, category: 'snacks', emoji: '🥔' },

    // FRIED WINGS
    { id: 'w1', name: 'Fried Wings (4pcs)', price: 149, category: 'wings', emoji: '🍗' },
    { id: 'w2', name: 'Fried Wings (8pcs)', price: 249, category: 'wings', emoji: '🍗' },

    // MOMOS
    { id: 'm1', name: 'Steam Chicken Momo', price: 69, category: 'momos', emoji: '🥟' },
    { id: 'm2', name: 'Fried Chicken Momo', price: 79, category: 'momos', emoji: '🥟' },
    { id: 'm3', name: 'Steam Veg Momo', price: 49, category: 'momos', emoji: '🥟' },
    { id: 'm4', name: 'Fried Veg Momo', price: 59, category: 'momos', emoji: '🥟' },
    { id: 'm5', name: 'Pan Fried Momo (5pcs)', price: 99, category: 'momos', emoji: '🥟' },

    // COMBOS
    { id: 'c1', name: 'Saver Combo', price: 129, category: 'combos', emoji: '🎁', desc: 'Veg Burger + Fries + Chai' },
    { id: 'c2', name: 'Chicken Craver Combo', price: 149, category: 'combos', emoji: '🎁', desc: 'Smash/Zinger + Fries + Chai' },
    { id: 'c3', name: 'Buddy Combo', price: 249, category: 'combos', emoji: '🎁', desc: 'Any 2 Burgers + Large Fries' },
    { id: 'c4', name: 'Family Snack Box', price: 399, category: 'combos', emoji: '🎁', desc: 'Strips + Popcorn + Wings + Fries' },
    { id: 'c5', name: 'StreetWok Signature', price: 199, category: 'combos', emoji: '🎁', desc: 'Peri Peri Strips + Loaded Fries' },
    { id: 'c6', name: 'Momo Lover Combo', price: 129, category: 'combos', emoji: '🎁', desc: 'Steam Momo + Fries + Chai' },
    { id: 'c7', name: 'Crunchy Chicken Box', price: 149, category: 'combos', emoji: '🎁', desc: 'Popcorn + Wings + Fries' },
    { id: 'c8', name: 'Veggie Snack Box', price: 149, category: 'combos', emoji: '🎁', desc: 'Cheese Sticks + Nuggets + Fries' }
];

// ===== DEFAULT INVENTORY =====
const defaultInventory = {
    'Chicken Breast': { qty: 20, unit: 'kg', alert: 5 },
    'Burger Patty (Veg)': { qty: 50, unit: 'pcs', alert: 10 },
    'Burger Patty (Chicken)': { qty: 50, unit: 'pcs', alert: 10 },
    'Burger Buns': { qty: 100, unit: 'pcs', alert: 20 },
    'French Fries (Frozen)': { qty: 30, unit: 'kg', alert: 8 },
    'Cooking Oil': { qty: 20, unit: 'litre', alert: 5 },
    'Momo Sheets': { qty: 200, unit: 'pcs', alert: 50 },
    'Chicken Mince': { qty: 15, unit: 'kg', alert: 5 },
    'Vegetables Mix': { qty: 10, unit: 'kg', alert: 3 },
    'Cheese Slices': { qty: 80, unit: 'pcs', alert: 20 },
    'Mozzarella Cheese': { qty: 5, unit: 'kg', alert: 2 },
    'Tea Leaves': { qty: 3, unit: 'kg', alert: 1 },
    'Milk': { qty: 15, unit: 'litre', alert: 5 },
    'Coffee Powder': { qty: 2, unit: 'kg', alert: 0.5 },
    'Sugar': { qty: 5, unit: 'kg', alert: 2 },
    'Spring Roll Sheets': { qty: 100, unit: 'pcs', alert: 30 },
    'Peri Peri Seasoning': { qty: 3, unit: 'kg', alert: 1 },
    'Sauces (Assorted)': { qty: 15, unit: 'packs', alert: 5 },
    'Soft Drink Cans': { qty: 48, unit: 'pcs', alert: 12 },
    'Packaging Boxes': { qty: 200, unit: 'pcs', alert: 50 },
    'Paper Bags': { qty: 150, unit: 'pcs', alert: 40 },
    'Napkins': { qty: 300, unit: 'pcs', alert: 100 }
};

// ===== APPLICATION STATE =====
let menuItems = [];
let inventory = {};
let transactions = [];
let currentOrder = [];
let lastOrderNumber = 0;
let activeCategory = 'all';
let orderType = 'dine-in';
let editingMenuItemId = null;

// ===== SETTINGS =====
let settings = {
    shopName: 'StreetWok',
    tagline: "The Biker's Cafe",
    phone: '',
    address: '',
    taxRate: TAX_RATE_DEFAULT
};

// ===== DOM REFERENCES =====
let orderListEl, subtotalEl, taxEl, totalEl, checkoutTotalEl, emptyCartEl;
let menuGridEl, categoryScrollEl, searchEl;
let payBtn, clearOrderBtn, printOrderBtn;

// ===================================================================
// INITIALIZATION
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM references
    orderListEl = document.getElementById('order-list');
    subtotalEl = document.getElementById('subtotal');
    taxEl = document.getElementById('tax');
    totalEl = document.getElementById('total');
    checkoutTotalEl = document.getElementById('checkout-total');
    emptyCartEl = document.getElementById('empty-cart');
    menuGridEl = document.getElementById('menu-grid');
    categoryScrollEl = document.getElementById('category-scroll');
    searchEl = document.getElementById('menu-search');
    payBtn = document.getElementById('btn-pay');
    clearOrderBtn = document.getElementById('btn-clear-order');
    printOrderBtn = document.getElementById('btn-print-order');

    // Load data
    loadFromLocalStorage();

    // Setup date display
    updateDateDisplay();

    // Render UI
    renderCategories();
    renderMenuGrid();
    updateOrderDisplay();
    updateOrderIdDisplay();
    updateTaxRateDisplay();

    // Setup event listeners
    setupEventListeners();
});

// ===================================================================
// DATA PERSISTENCE
// ===================================================================

function loadFromLocalStorage() {
    // Load Menu Items with merge
    const savedMenu = localStorage.getItem(APP_PREFIX + 'menu_items');
    if (savedMenu) {
        menuItems = JSON.parse(savedMenu);
        // Merge new default items
        defaultMenuItems.forEach(defItem => {
            if (!menuItems.find(i => i.id === defItem.id)) {
                menuItems.push(defItem);
            }
        });
    } else {
        menuItems = JSON.parse(JSON.stringify(defaultMenuItems));
    }

    // Load Inventory with merge
    const savedInventory = localStorage.getItem(APP_PREFIX + 'inventory');
    if (savedInventory) {
        inventory = JSON.parse(savedInventory);
        for (const [key, val] of Object.entries(defaultInventory)) {
            if (!inventory[key]) {
                inventory[key] = val;
            }
        }
    } else {
        inventory = JSON.parse(JSON.stringify(defaultInventory));
    }

    // Load Transactions
    const savedTx = localStorage.getItem(APP_PREFIX + 'transactions');
    if (savedTx) {
        transactions = JSON.parse(savedTx);
    }

    // Load Order Number
    const savedOrderNum = localStorage.getItem(APP_PREFIX + 'last_order_number');
    if (savedOrderNum) {
        lastOrderNumber = parseInt(savedOrderNum, 10);
    }

    // Load Settings
    const savedSettings = localStorage.getItem(APP_PREFIX + 'settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
}

function saveAllData() {
    localStorage.setItem(APP_PREFIX + 'menu_items', JSON.stringify(menuItems));
    localStorage.setItem(APP_PREFIX + 'inventory', JSON.stringify(inventory));
    localStorage.setItem(APP_PREFIX + 'transactions', JSON.stringify(transactions));
    localStorage.setItem(APP_PREFIX + 'last_order_number', lastOrderNumber.toString());
    localStorage.setItem(APP_PREFIX + 'settings', JSON.stringify(settings));
}

function saveBasicData() {
    localStorage.setItem(APP_PREFIX + 'transactions', JSON.stringify(transactions));
    localStorage.setItem(APP_PREFIX + 'last_order_number', lastOrderNumber.toString());
}

// ===================================================================
// EVENT LISTENERS
// ===================================================================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
            const viewId = this.dataset.view;
            if (viewId) showView(viewId);
        });
    });

    // Search
    searchEl.addEventListener('input', renderMenuGrid);

    // Order actions
    clearOrderBtn.addEventListener('click', clearOrder);
    payBtn.addEventListener('click', () => openModal('payment-modal'));
    printOrderBtn.addEventListener('click', printCurrentOrder);

    // Order type toggle
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            orderType = this.dataset.type;
        });
    });

    // Inventory
    document.getElementById('btn-add-new-stock').addEventListener('click', () => openModal('add-stock-modal'));
    document.getElementById('btn-create-stock').addEventListener('click', createNewStockItem);
    document.getElementById('btn-save-stock').addEventListener('click', saveStockUpdate);

    // Menu Management
    document.getElementById('btn-add-new-menu-item').addEventListener('click', () => {
        editingMenuItemId = null;
        document.getElementById('menu-modal-title').textContent = 'Add New Menu Item';
        document.getElementById('new-menu-name').value = '';
        document.getElementById('new-menu-price').value = '';
        document.getElementById('new-menu-category').value = 'burgers';
        openModal('add-menu-modal');
    });
    document.getElementById('btn-create-menu-item').addEventListener('click', createOrUpdateMenuItem);

    // Settings
    document.getElementById('setting-tax-rate').addEventListener('change', function () {
        settings.taxRate = parseFloat(this.value) || 0;
        updateTaxRateDisplay();
        updateOrderDisplay();
        saveAllData();
        showToast('Tax rate updated', 'success');
    });

    document.getElementById('setting-shop-name').addEventListener('change', function () {
        settings.shopName = this.value;
        saveAllData();
    });

    document.getElementById('setting-tagline').addEventListener('change', function () {
        settings.tagline = this.value;
        saveAllData();
    });

    document.getElementById('setting-phone').addEventListener('change', function () {
        settings.phone = this.value;
        saveAllData();
    });

    document.getElementById('setting-address').addEventListener('change', function () {
        settings.address = this.value;
        saveAllData();
    });

    document.getElementById('btn-clear-transactions').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all transactions? This cannot be undone!')) {
            transactions = [];
            saveBasicData();
            updateReportsView();
            showToast('Transactions cleared', 'info');
        }
    });

    document.getElementById('btn-reset-all').addEventListener('click', () => {
        if (confirm('⚠️ This will reset ALL data (menu, inventory, transactions, settings) to defaults. Are you sure?')) {
            localStorage.clear();
            location.reload();
        }
    });

    // Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });
}

// ===================================================================
// VIEW SWITCHING
// ===================================================================

function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));

    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target view
    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) targetView.classList.remove('hidden');

    // Set active nav
    const targetNav = document.getElementById(`nav-${viewId}`);
    if (targetNav) targetNav.classList.add('active');

    // Refresh view data
    if (viewId === 'pos') renderMenuGrid();
    if (viewId === 'inventory') updateInventoryView();
    if (viewId === 'reports') updateReportsView();
    if (viewId === 'menu') updateMenuMgmtView();
    if (viewId === 'settings') loadSettingsView();
}

// ===================================================================
// POS - CATEGORIES
// ===================================================================

function renderCategories() {
    categoryScrollEl.innerHTML = '';
    categories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = `category-chip${cat.id === activeCategory ? ' active' : ''}`;
        chip.dataset.category = cat.id;
        chip.innerHTML = `<span class="cat-emoji">${cat.emoji}</span>${cat.name}`;
        chip.addEventListener('click', () => {
            activeCategory = cat.id;
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderMenuGrid();
        });
        categoryScrollEl.appendChild(chip);
    });
}

// ===================================================================
// POS - MENU GRID
// ===================================================================

function renderMenuGrid() {
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    menuGridEl.innerHTML = '';

    let filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    if (filteredItems.length === 0) {
        menuGridEl.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🔍</div>
                <p>No items found</p>
            </div>
        `;
        return;
    }

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.dataset.itemId = item.id;

        card.innerHTML = `
            <span class="menu-card-emoji">${item.emoji || '🍽️'}</span>
            <h5 title="${item.name}">${item.name}</h5>
            ${item.desc ? `<div class="item-variant">${item.desc}</div>` : ''}
            <span class="price">₹${item.price}</span>
            <button class="card-add-btn">Add +</button>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('card-add-btn')) {
                addToOrder(item.id, item.name, item.price, item.emoji);
            }
        });

        card.querySelector('.card-add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToOrder(item.id, item.name, item.price, item.emoji);
        });

        menuGridEl.appendChild(card);
    });
}

// ===================================================================
// POS - ORDER MANAGEMENT
// ===================================================================

function addToOrder(itemId, itemName, itemPrice, emoji) {
    const existing = currentOrder.find(item => item.id === itemId);

    if (existing) {
        existing.qty++;
    } else {
        currentOrder.push({
            id: itemId,
            name: itemName,
            price: itemPrice,
            emoji: emoji || '🍽️',
            qty: 1
        });
    }

    updateOrderDisplay();
    showToast(`${itemName} added`, 'success');
}

function updateQuantity(itemId, delta) {
    const item = currentOrder.find(i => i.id === itemId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        currentOrder = currentOrder.filter(i => i.id !== itemId);
    }

    updateOrderDisplay();
}

function removeFromOrder(itemId) {
    currentOrder = currentOrder.filter(i => i.id !== itemId);
    updateOrderDisplay();
}

function clearOrder() {
    currentOrder = [];
    const customerInput = document.getElementById('customer-name');
    if (customerInput) customerInput.value = '';
    updateOrderDisplay();
}

function updateOrderDisplay() {
    // Remove existing items (keep empty cart)
    const existingItems = orderListEl.querySelectorAll('.order-item');
    existingItems.forEach(item => item.remove());

    let subtotal = 0;

    if (currentOrder.length === 0) {
        emptyCartEl.classList.remove('hidden');
        payBtn.disabled = true;
    } else {
        emptyCartEl.classList.add('hidden');
        payBtn.disabled = false;

        currentOrder.forEach(item => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;

            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `
                <span class="order-item-emoji">${item.emoji}</span>
                <div class="order-item-details">
                    <div class="order-item-title">${item.name}</div>
                    <div class="order-item-price">₹${item.price} × ${item.qty} = ₹${itemTotal}</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn ${item.qty === 1 ? 'delete-btn' : ''}" onclick="updateQuantity('${item.id}', -1)">
                        ${item.qty === 1 ? '<i class="bi bi-trash3"></i>' : '−'}
                    </button>
                    <span class="qty-display">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            `;
            orderListEl.appendChild(div);
        });
    }

    const taxRate = settings.taxRate / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    taxEl.textContent = `₹${tax.toFixed(2)}`;
    totalEl.textContent = `₹${total.toFixed(2)}`;
    checkoutTotalEl.textContent = `₹${total.toFixed(2)}`;

    // Update payment modal total
    const paymentTotal = document.getElementById('payment-total');
    if (paymentTotal) paymentTotal.textContent = `₹${total.toFixed(2)}`;
}

// ===================================================================
// PAYMENT & CHECKOUT
// ===================================================================

function processPayment(method) {
    if (currentOrder.length === 0) return;

    const subtotal = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxRate = settings.taxRate / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    lastOrderNumber++;
    const customerName = document.getElementById('customer-name').value || 'Walk-in';

    const transaction = {
        id: `SW-${Date.now()}`,
        orderNumber: lastOrderNumber,
        customerName: customerName,
        timestamp: new Date().toISOString(),
        items: currentOrder.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty
        })),
        method: method,
        type: orderType,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100
    };

    transactions.push(transaction);
    saveBasicData();

    // Close payment modal
    closeModal('payment-modal');

    // Show receipt
    showReceipt(transaction);

    // Clear order
    currentOrder = [];
    document.getElementById('customer-name').value = '';
    updateOrderDisplay();
    updateOrderIdDisplay();

    showToast(`Order #${lastOrderNumber} completed — ${method}`, 'success');
}

function showReceipt(tx) {
    const receiptContent = document.getElementById('receipt-content');
    const orderDate = new Date(tx.timestamp);

    let itemsHtml = tx.items.map(item => `
        <div class="receipt-item">
            <span>${item.name} ×${item.qty}</span>
            <span>₹${(item.price * item.qty).toFixed(2)}</span>
        </div>
    `).join('');

    receiptContent.innerHTML = `
        <div class="receipt-header">
            <div class="receipt-brand">${settings.shopName}</div>
            <div class="receipt-tagline">${settings.tagline}</div>
            ${settings.phone ? `<div style="font-size: 0.75rem; color: #999; margin-top: 4px;">📞 ${settings.phone}</div>` : ''}
            ${settings.address ? `<div style="font-size: 0.7rem; color: #bbb; margin-top: 2px;">${settings.address}</div>` : ''}
        </div>
        <div class="receipt-info">
            <div>Order #${tx.orderNumber} | ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
            <div>${orderDate.toLocaleDateString('en-IN')} ${orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            <div>Customer: ${tx.customerName}</div>
            <div>Payment: ${tx.method}</div>
        </div>
        <div class="receipt-items">
            ${itemsHtml}
        </div>
        <div class="receipt-totals">
            <div class="receipt-total-row">
                <span>Subtotal</span>
                <span>₹${tx.subtotal.toFixed(2)}</span>
            </div>
            <div class="receipt-total-row">
                <span>GST (${settings.taxRate}%)</span>
                <span>₹${tx.tax.toFixed(2)}</span>
            </div>
            <div class="receipt-total-row grand-total">
                <span>TOTAL</span>
                <span>₹${tx.total.toFixed(2)}</span>
            </div>
        </div>
        <div class="receipt-footer">
            Thank you for visiting ${settings.shopName}!<br>
            See you again! 🏍️
        </div>
    `;

    openModal('receipt-modal');
}

function printCurrentOrder() {
    if (currentOrder.length === 0) {
        showToast('No items in order to print', 'error');
        return;
    }

    const subtotal = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxRate = settings.taxRate / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const tempTx = {
        orderNumber: lastOrderNumber + 1,
        customerName: document.getElementById('customer-name').value || 'Walk-in',
        timestamp: new Date().toISOString(),
        items: currentOrder,
        type: orderType,
        method: 'Pending',
        subtotal, tax, total
    };
    showReceipt(tempTx);
}

// ===================================================================
// INVENTORY MANAGEMENT
// ===================================================================

function updateInventoryView() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    const sortedKeys = Object.keys(inventory).sort();

    sortedKeys.forEach(key => {
        const item = inventory[key];
        let badgeClass = 'in-stock';
        let badgeText = 'In Stock';

        if (item.qty <= 0) {
            badgeClass = 'out-of-stock';
            badgeText = 'Out of Stock';
        } else if (item.qty <= item.alert) {
            badgeClass = 'low-stock';
            badgeText = 'Low Stock';
        }

        const card = document.createElement('div');
        card.className = 'stock-card';
        card.innerHTML = `
            <div class="stock-card-header">
                <span class="stock-name">${key}</span>
                <span class="stock-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="stock-qty">
                <label>Qty:</label>
                <input type="number" value="${item.qty}" min="0" step="0.5" data-stock-key="${key}">
                <span class="stock-unit">${item.unit}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function saveStockUpdate() {
    const inputs = document.querySelectorAll('[data-stock-key]');
    inputs.forEach(input => {
        const key = input.dataset.stockKey;
        if (inventory[key]) {
            inventory[key].qty = parseFloat(input.value) || 0;
        }
    });

    localStorage.setItem(APP_PREFIX + 'inventory', JSON.stringify(inventory));
    updateInventoryView();
    showToast('Inventory saved successfully', 'success');
}

function createNewStockItem() {
    const name = document.getElementById('new-stock-name').value.trim();
    const qty = parseFloat(document.getElementById('new-stock-qty').value) || 0;
    const unit = document.getElementById('new-stock-unit').value;
    const alert = parseFloat(document.getElementById('new-stock-alert').value) || 5;

    if (!name) {
        showToast('Please enter item name', 'error');
        return;
    }

    if (inventory[name]) {
        showToast('Item already exists', 'error');
        return;
    }

    inventory[name] = { qty, unit, alert };
    localStorage.setItem(APP_PREFIX + 'inventory', JSON.stringify(inventory));

    closeModal('add-stock-modal');
    updateInventoryView();
    showToast(`${name} added to inventory`, 'success');

    // Clear form
    document.getElementById('new-stock-name').value = '';
    document.getElementById('new-stock-qty').value = '0';
}

// ===================================================================
// REPORTS & ANALYTICS
// ===================================================================

function updateReportsView() {
    const dailySalesBody = document.getElementById('daily-sales-body');
    const transactionsBody = document.getElementById('transactions-table-body');

    if (!dailySalesBody || !transactionsBody) return;

    dailySalesBody.innerHTML = '';
    transactionsBody.innerHTML = '';

    const dailyStats = {};
    let totalRevenue = 0;
    let todayRevenue = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    if (transactions.length === 0) {
        dailySalesBody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No sales data yet</td></tr>
        `;
        transactionsBody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No transactions yet</td></tr>
        `;
    } else {
        [...transactions].reverse().forEach(tx => {
            totalRevenue += tx.total;

            const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = { date: dateKey, orders: 0, cash: 0, upi: 0, card: 0, total: 0 };
            }
            dailyStats[dateKey].orders++;
            dailyStats[dateKey].total += tx.total;

            if (tx.method === 'Cash') dailyStats[dateKey].cash += tx.total;
            else if (tx.method === 'UPI') dailyStats[dateKey].upi += tx.total;
            else dailyStats[dateKey].card += tx.total;

            if (dateKey === todayStr) todayRevenue += tx.total;

            // Transaction row
            const itemsSummary = tx.items.map(i => `${i.name} ×${i.qty}`).join(', ');
            const txTime = new Date(tx.timestamp);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">#${tx.orderNumber}</td>
                <td>${txTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${tx.customerName}</td>
                <td title="${itemsSummary}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemsSummary}</td>
                <td><span class="stock-badge ${tx.method === 'Cash' ? 'in-stock' : tx.method === 'UPI' ? 'low-stock' : ''}" style="background: ${tx.method === 'Cash' ? 'var(--success-bg)' : tx.method === 'UPI' ? 'var(--info-bg)' : 'var(--warning-bg)'}; color: ${tx.method === 'Cash' ? 'var(--success)' : tx.method === 'UPI' ? 'var(--info)' : 'var(--warning)'};">${tx.method}</span></td>
                <td class="fw-bold text-primary">₹${tx.total.toFixed(2)}</td>
            `;
            transactionsBody.appendChild(tr);
        });
    }

    // Update stat cards
    document.getElementById('total-revenue').textContent = `₹${totalRevenue.toFixed(0)}`;
    document.getElementById('today-revenue').textContent = `₹${todayRevenue.toFixed(0)}`;
    document.getElementById('total-transactions').textContent = transactions.length;
    document.getElementById('avg-order-value').textContent = transactions.length > 0
        ? `₹${(totalRevenue / transactions.length).toFixed(0)}`
        : '₹0';

    // Daily breakdown
    const sortedDates = Object.keys(dailyStats).sort((a, b) => new Date(b) - new Date(a));
    sortedDates.forEach(date => {
        const stat = dailyStats[date];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td>${stat.orders}</td>
            <td class="text-success">₹${stat.cash.toFixed(0)}</td>
            <td class="text-info">₹${stat.upi.toFixed(0)}</td>
            <td class="text-warning">₹${stat.card.toFixed(0)}</td>
            <td class="fw-bold text-primary">₹${stat.total.toFixed(0)}</td>
        `;
        dailySalesBody.appendChild(tr);
    });
}

function exportToCSV() {
    if (transactions.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    const csvRows = [
        ['Order #', 'Date', 'Time', 'Customer', 'Items', 'Payment', 'Type', 'Subtotal', 'Tax', 'Total']
    ];

    transactions.forEach(tx => {
        const txDate = new Date(tx.timestamp);
        const items = tx.items.map(i => `${i.name} x${i.qty}`).join('; ');
        csvRows.push([
            tx.orderNumber,
            txDate.toLocaleDateString('en-IN'),
            txDate.toLocaleTimeString('en-IN'),
            tx.customerName,
            `"${items}"`,
            tx.method,
            tx.type,
            tx.subtotal.toFixed(2),
            tx.tax.toFixed(2),
            tx.total.toFixed(2)
        ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `streetwok-sales-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Sales report exported', 'success');
}

// ===================================================================
// MENU MANAGEMENT
// ===================================================================

function updateMenuMgmtView() {
    const grid = document.getElementById('menu-mgmt-grid');
    grid.innerHTML = '';

    const grouped = {};
    menuItems.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    });

    // Sort by category
    const categoryOrder = categories.filter(c => c.id !== 'all').map(c => c.id);
    categoryOrder.forEach(catId => {
        if (!grouped[catId]) return;
        grouped[catId].forEach(item => {
            const catInfo = categories.find(c => c.id === catId);
            const card = document.createElement('div');
            card.className = 'menu-mgmt-card';
            card.innerHTML = `
                <div class="mgmt-card-header">
                    <span class="mgmt-item-name">${item.emoji || '🍽️'} ${item.name}</span>
                    <span class="mgmt-item-price">₹${item.price}</span>
                </div>
                <span class="mgmt-item-category">${catInfo ? catInfo.name : item.category}</span>
                ${item.desc ? `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">${item.desc}</div>` : ''}
                <div class="mgmt-actions">
                    <button class="mgmt-btn mgmt-btn-edit" onclick="editMenuItem('${item.id}')">Edit</button>
                    <button class="mgmt-btn mgmt-btn-delete" onclick="deleteMenuItem('${item.id}')">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

function editMenuItem(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    editingMenuItemId = itemId;
    document.getElementById('menu-modal-title').textContent = 'Edit Menu Item';
    document.getElementById('new-menu-name').value = item.name;
    document.getElementById('new-menu-price').value = item.price;
    document.getElementById('new-menu-category').value = item.category;
    openModal('add-menu-modal');
}

function createOrUpdateMenuItem() {
    const name = document.getElementById('new-menu-name').value.trim();
    const price = parseFloat(document.getElementById('new-menu-price').value) || 0;
    const category = document.getElementById('new-menu-category').value;

    if (!name) {
        showToast('Please enter item name', 'error');
        return;
    }

    if (price <= 0) {
        showToast('Please enter a valid price', 'error');
        return;
    }

    const catInfo = categories.find(c => c.id === category);
    const emoji = catInfo ? catInfo.emoji : '🍽️';

    if (editingMenuItemId) {
        // Update existing
        const item = menuItems.find(i => i.id === editingMenuItemId);
        if (item) {
            item.name = name;
            item.price = price;
            item.category = category;
            item.emoji = emoji;
            showToast(`${name} updated`, 'success');
        }
    } else {
        // Create new
        const newId = 'custom_' + Date.now();
        menuItems.push({
            id: newId,
            name: name,
            price: price,
            category: category,
            emoji: emoji
        });
        showToast(`${name} added to menu`, 'success');
    }

    localStorage.setItem(APP_PREFIX + 'menu_items', JSON.stringify(menuItems));
    closeModal('add-menu-modal');
    editingMenuItemId = null;
    renderMenuGrid();
    updateMenuMgmtView();
}

function deleteMenuItem(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`Delete "${item.name}" from menu?`)) {
        menuItems = menuItems.filter(i => i.id !== itemId);
        localStorage.setItem(APP_PREFIX + 'menu_items', JSON.stringify(menuItems));
        renderMenuGrid();
        updateMenuMgmtView();
        showToast(`${item.name} removed`, 'info');
    }
}

// ===================================================================
// SETTINGS
// ===================================================================

function loadSettingsView() {
    document.getElementById('setting-shop-name').value = settings.shopName;
    document.getElementById('setting-tagline').value = settings.tagline;
    document.getElementById('setting-phone').value = settings.phone;
    document.getElementById('setting-address').value = settings.address;
    document.getElementById('setting-tax-rate').value = settings.taxRate;
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function updateDateDisplay() {
    const dateEl = document.getElementById('current-date-display');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function updateOrderIdDisplay() {
    const display = document.getElementById('order-id-display');
    if (display) {
        display.textContent = `#${String(lastOrderNumber + 1).padStart(3, '0')}`;
    }
}

function updateTaxRateDisplay() {
    const display = document.getElementById('tax-rate-display');
    if (display) display.textContent = settings.taxRate;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
