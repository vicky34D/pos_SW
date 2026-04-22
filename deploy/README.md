# StreetWok POS — OCI Deployment Guide

## Prerequisites
- Oracle Cloud account (Free Tier works)
- SSH key pair generated

## Step 1: Create OCI Compute Instance

1. Go to **OCI Console** → **Compute** → **Instances** → **Create Instance**
2. Choose:
   - **Image**: Oracle Linux 8 or Ubuntu 22.04
   - **Shape**: VM.Standard.E2.1.Micro (Free Tier)
   - **Networking**: Create a new VCN or use existing
   - Add your SSH public key
3. Click **Create**

## Step 2: Configure Security List

Open ports in your VCN's Security List:
- **Port 80** (HTTP)
- **Port 443** (HTTPS, optional)
- **Port 5001** (API, only if not using Nginx)

Go to: **Networking** → **VCN** → **Security Lists** → Add Ingress Rules:
```
Source CIDR: 0.0.0.0/0
Destination Port: 80
Protocol: TCP
```

## Step 3: SSH Into Your Instance

```bash
ssh -i ~/.ssh/your_key opc@<YOUR_INSTANCE_PUBLIC_IP>
```

## Step 4: Install Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify
node --version
npm --version
```

## Step 5: Upload Your Project

From your local machine:
```bash
# Create a tarball (excluding node_modules and database)
cd "/Users/sudipagharami/Desktop/STREET WOK NEW POS "
tar czf streetwok-pos.tar.gz --exclude='node_modules' --exclude='*.db' --exclude='dist' server/ client/ .gitignore

# Upload to OCI
scp -i ~/.ssh/your_key streetwok-pos.tar.gz opc@<IP>:~/
```

## Step 6: Setup on Server

```bash
# SSH into server
ssh -i ~/.ssh/your_key opc@<IP>

# Extract and setup
mkdir -p ~/streetwok-pos
cd ~/streetwok-pos
tar xzf ~/streetwok-pos.tar.gz

# Install server dependencies
cd server
npm install

# Install client dependencies and build
cd ../client
npm install
npm run build

# The build output goes to client/dist/
# Express will serve these static files automatically
```

## Step 7: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start the server
cd ~/streetwok-pos/server
PORT=5001 pm2 start index.js --name streetwok-pos

# Auto-start on reboot
pm2 startup
pm2 save
```

## Step 8: Setup Nginx (Reverse Proxy)

```bash
sudo yum install -y nginx   # Oracle Linux
# or: sudo apt install -y nginx  # Ubuntu

sudo systemctl enable nginx
sudo systemctl start nginx
```

Create config:
```bash
sudo tee /etc/nginx/conf.d/streetwok.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx
```

## Step 9: Open Firewall

```bash
# Oracle Linux firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Step 10: Access Your App

Open in browser: `http://<YOUR_INSTANCE_PUBLIC_IP>`

## Updating the App

```bash
# On your local machine - rebuild and upload
cd "/Users/sudipagharami/Desktop/STREET WOK NEW POS /client"
npm run build
tar czf update.tar.gz --exclude='node_modules' server/ client/

scp -i ~/.ssh/your_key update.tar.gz opc@<IP>:~/streetwok-pos/

# On the server
cd ~/streetwok-pos
tar xzf update.tar.gz
cd client && npm install && npm run build
pm2 restart streetwok-pos
```

## Optional: Free SSL with Let's Encrypt

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
