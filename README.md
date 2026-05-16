# 🏍️ Street Wok POS

![Street Wok POS](https://img.shields.io/badge/Status-Active_Production-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![Version](https://img.shields.io/badge/Version-2.0.0-purple)

A modern, full-stack, cloud-integrated Point of Sale (POS) system custom-built for **Street Wok - The Biker's Cafe**. This application streamlines cafe operations by handling multi-table concurrent order management, real-time raw ingredient tracking, dynamic menu management, and comprehensive financial reporting.

---

## ✨ Key Features

### 🪑 Persistent Multi-Table Management
- **Concurrent Sessions:** Manage up to 10 active dine-in tables alongside a "Quick Order" (takeaway) mode.
- **State Persistence:** Table orders persist securely to the server. Staff can switch between tables, refresh browsers, or log in from different devices without losing active cart data.
- **Visual Cues:** Dynamic table chips show green badges for tables with active items, ensuring waitstaff know exactly which tables are occupied.

### 📦 Deep Inventory & Menu System
- **Comprehensive Menu:** Hosts a 43-item menu across 10 distinct categories (Burgers, Fries, Wings, Popcorn, Combos, etc.), completely aligned with the physical cafe menu.
- **Raw Material Tracking:** Tracks 30 raw inventory ingredients (e.g., Burger Buns, Cooking Oil, Popcorn Mix, Packaging).
- **Custom Business Logic:** Includes custom logic for item unit measurement (e.g., Momos are automatically calculated as 5 pieces per plate).

### 📊 Advanced Financial Reporting
- **Today's Performance:** Real-time itemized breakdown of the day's sales.
- **Revenue Breakdowns:** Daily and Monthly revenue aggregations separated by payment method (Cash, UPI, Card).
- **Analytics:** "Top Items" leaderboards help identify best-selling products, and detailed historical transaction logs ensure perfect auditing.

### 📱 Premium, Mobile-First UI/UX
- **Light Theme:** A professional, sleek light-themed UI utilizing warm whites, soft shadows, and vibrant accent colors.
- **Fully Responsive:** Tailored CSS grid breaks down seamlessly for tablet and mobile devices.
- **Touch-Optimized:** Mobile views include a sticky bottom navigation bar designed specifically for fast-paced touch inputs by waitstaff on the floor.

---

## 🛠️ Technology Stack

**Frontend Architecture:**
- **React 19:** Component-based UI rendering.
- **Vite:** High-performance frontend build tooling.
- **Vanilla CSS:** Strict usage of raw CSS (Grid, Flexbox, CSS Variables) for pixel-perfect, highly customized aesthetics without framework bloat.

**Backend Architecture:**
- **Node.js & Express:** Lightweight, fast RESTful API.
- **SQLite (`better-sqlite3`):** High-performance, zero-configuration SQL database perfectly suited for embedded POS operations.

**Cloud Infrastructure (OCI):**
- **Oracle Cloud Infrastructure (OCI):** Application is hosted on an Ubuntu compute instance.
- **Nginx:** Acts as a reverse proxy, routing incoming traffic on port 80 to the Node application.
- **PM2:** Advanced process manager ensuring the application runs continuously with zero-downtime restarts upon deployment.

---

## ☁️ Cloud Integration & Deployment Pipeline (OCI)

This project features a secure, scriptable deployment pipeline integrated seamlessly with Oracle Cloud Infrastructure:

1. **Thin-Client Architecture:** While the frontend can be packaged as a desktop app (via Electron) or loaded via browser, it acts purely as a thin client. All business logic, routing, and database interactions occur securely on the OCI server.
2. **Automated Provisioning:** Deployment is handled via secure SSH/SCP transfers of pre-built source code. 
3. **Database Safety:** Deployments exclude `.db` files ensuring production sales and inventory history remain completely untouched during codebase updates.
4. **PM2 Lifecycle:** Post-transfer, PM2 automatically installs updated dependencies and restarts the `pos-app` process.

### Deployment Command Flow (Overview)
```bash
# 1. Archive local repository (excluding heavy folders and DBs)
tar czf pos_update.tar.gz --exclude=node_modules --exclude=dist --exclude=".git" --exclude="*.db*" .

# 2. SCP to Oracle Cloud
scp -i <auth-key> pos_update.tar.gz ubuntu@<oci-ip>:~/pos_update.tar.gz

# 3. Remote build and PM2 restart
ssh -i <auth-key> ubuntu@<oci-ip> "tar xzf pos_update.tar.gz -C ~/pos_SW && cd ~/pos_SW && npm install && cd client && npm run build && pm2 restart pos-app"
```

---

## 🚀 Getting Started Locally

If you want to run the project in a local development environment:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vicky34D/pos_SW.git
   cd pos_SW
   ```

2. **Setup the Backend:**
   ```bash
   cd server
   npm install
   # The database (streetwok.db) will self-seed the menu and inventory on first boot.
   node index.js
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../client
   npm install
   # Ensure .env points to VITE_API_URL=http://localhost:5001/api
   npm run dev
   ```

4. **Access the App:** Open `http://localhost:3000` in your browser.

---

*Designed and engineered for efficiency, speed, and beautiful aesthetics.*
