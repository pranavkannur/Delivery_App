# 🚀 Hyper-Local Real-Time Delivery & Marketplace Platform

[![Deploy Status](https://img.shields.io/badge/deployment-AWS%20EC2%20%7C%20HTTPS-success?style=for-the-badge&logo=amazon-aws)](https://13.214.160.70.sslip.io)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-Jenkins%20Automated-blue?style=for-the-badge&logo=jenkins)](http://13.214.160.70:8080)
[![Docker](https://img.shields.io/badge/Containerized-Docker%20Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)

> A modern, enterprise-grade, hyper-local food and package delivery platform connecting **Customers**, **Store Partners**, **Delivery Drivers**, and **Super Admins** in real time. Built with a high-performance Monochrome Brutalist design system, real-world satellite GPS tracking, turn-by-turn road curves, Razorpay payment processing, and automated zero-downtime CI/CD deployment on AWS.

🌐 **Live Production URL**: [https://13.214.160.70.sslip.io](https://13.214.160.70.sslip.io)  
⚙️ **Jenkins Automation Server**: [http://13.214.160.70:8080](http://13.214.160.70:8080)

---

## 📌 System Architecture Overview

```mermaid
graph TD
    subgraph Clients ["Web & Mobile Frontend (React 18 + Vite + TailwindCSS)"]
        Customer["🛍️ Customer Portal<br/>Marketplace, Menus, Doorstep Pin, Razorpay"]
        Partner["🏬 Partner Store Hub<br/>Menu Mgmt, Locked Shop GPS, Relocation Map"]
        Driver["🛵 Driver Operations<br/>Turn-by-Turn GPS Map, Handover PIN Verification"]
        Admin["🛡️ Super Admin Hub<br/>Fleet Radar, Revenue KPIs, Relocation Approval"]
    end

    subgraph Infrastructure ["AWS EC2 Production (Ubuntu, Swap Optimized)"]
        Nginx["🌐 Nginx Reverse Proxy<br/>Port 80 (HTTP) -> 443 (HTTPS)<br/>Let's Encrypt SSL Termination"]
        
        subgraph Docker ["Multi-Container Stack"]
            FrontendApp["Frontend Container<br/>Nginx Single Page App"]
            BackendAPI["Backend API Container<br/>Node.js + Express 5 + TypeScript"]
        end

        Jenkins["🤖 Jenkins CI/CD<br/>Port 8080 - Automated Zero-Downtime Deployment"]
    end

    subgraph ExternalServices ["Cloud & External Services"]
        Postgres[("🐘 Aiven Cloud PostgreSQL<br/>Prisma ORM + Auto Migration")]
        Razorpay["💳 Razorpay Payment Gateway<br/>UPI, GPay, PhonePe, Cards, NetBanking"]
        OSRM["🗺️ OSRM Engine<br/>Turn-by-Turn Road Curvature & Distance"]
        OSM["📍 OpenStreetMap / Nominatim<br/>Satellite Reverse Geocoding"]
        SocketIO["⚡ WebSocket Server (Socket.io)<br/>Live Driver GPS & Order Handshakes"]
    end

    Customer -->|HTTPS / WSS| Nginx
    Partner -->|HTTPS / WSS| Nginx
    Driver -->|HTTPS / WSS| Nginx
    Admin -->|HTTPS / WSS| Nginx

    Nginx --> FrontendApp
    Nginx --> BackendAPI

    BackendAPI --> Postgres
    BackendAPI --> SocketIO
    BackendAPI --> Razorpay
    FrontendApp --> OSRM
    FrontendApp --> OSM
```

---

## ✨ Core Platform Capabilities

### 1. 🛍️ Customer Marketplace & Store Explorer
* **Store Browsing by Category**: Filter open partner bakeries, pizzerias, cafes, and supermarkets.
* **Store Open / Closed Indicators**: Real-time `🟢 OPEN` vs `🔴 CLOSED` badges that automatically govern customer checkout.
* **Interactive Dynamic Menus**: View dishes, product descriptions, prices, and build a real-time shopping cart.
* **Doorstep GPS Pinpoint**: Click-to-pin and draggable delivery marker with automated satellite reverse geocoding.
* **Turn-by-Turn Road Tracking**: Real road curvature (OSRM) with live moving delivery scooter marker.
* **4-Digit Handover OTP**: Cryptographically secure PIN for tamper-proof delivery verification.

### 2. 💳 Razorpay Payment Gateway & Checkout Engine
* **Full Indian Payments Stack**: Native integration with **UPI (Google Pay, PhonePe, Paytm, BHIM)**, Credit/Debit Cards, NetBanking, and Digital Wallets.
* **Cryptographic Signature Verification**: Server-side HMAC-SHA256 signature verification preventing payment tampering.
* **Flexible Payment Methods**: Seamless 1-click toggle between **💳 Razorpay Online Payment** and **💵 Cash on Delivery (COD)**.
* **Automated Order Receipt Codes**: Unique human-readable codes (`ORD-XXXXXX`) across receipts, databases, and driver manifests.

### 3. 🛵 Driver Operations & Turn-by-Turn Navigation
* **Live Road Curvature Navigation**: Real street pathing (Leaflet + OSRM) connecting driver position, store pickup, and customer doorstep.
* **Real Hardware Satellite GPS**: Broadcasts high-precision smartphone GPS (`navigator.geolocation.watchPosition`) over secure HTTPS.
* **Route Simulation Mode**: Built-in interpolation simulator for desktop testing and staging environments.
* **Payment Alert System**: Clear contextual alerts:
  * `✅ PAID ONLINE VIA RAZORPAY — DO NOT COLLECT CASH`
  * `💵 COLLECT CASH FROM CUSTOMER: ₹XX.00`
* **OTP Delivery Handshake**: Driver must enter the customer's 4-digit PIN before an order can transition to `DELIVERED`.

### 4. 🏬 Governed Partner Store Hub
* **One-Time Shop Location Lock**: Partners set their physical shop coordinates once upon onboarding; the location is permanently locked to prevent fraudulent relocation.
* **Interactive Relocation Request Modal**: Embedded Leaflet map with **"📍 MY CURRENT GPS"** button allowing partners to pinpoint new store premises and submit relocation reasons to Admins.
* **Real-Time Menu Management**: Full CRUD operations to add and remove dishes/items with immediate live propagation to customers.
* **Store Status Toggle**: 1-click `🟢 ACCEPTING ORDERS` vs `🔴 STORE CLOSED` master switch.

### 5. 🛡️ Super Admin Operations & Fleet Analytics
* **Top-Level KPI Cards**: Real-time aggregated Gross Revenue, In-Flight Deliveries, Total Orders, and Online Fleet Drivers.
* **Multi-Delivery Fleet Radar Map**: Global bird's-eye view of all active pickups, destinations, and transit paths.
* **Store Relocation Approval Workflow**: Interactive review desk to inspect partner relocation requests (old vs new location) with 1-click **Approve** or **Reject** actions.
* **Filterable Global Orders Ledger**: Searchable by Order ID, Customer Name, Destination, Driver, and Status.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 18, TypeScript, TailwindCSS, Vite, Lucide Icons |
| **Mapping & Routing** | Leaflet, React-Leaflet, OpenStreetMap, OSRM, Nominatim API |
| **Payments** | Razorpay Standard Checkout SDK, HMAC-SHA256 Verification |
| **Backend API** | Node.js 20, Express 5, TypeScript, Prisma ORM 7, Bcrypt, JWT |
| **Real-Time Layer** | Socket.io WebSockets with Order-Specific Room Multiplexing |
| **Database** | PostgreSQL on Aiven Cloud with SSL termination |
| **Web Server / SSL** | Nginx Reverse Proxy, Let's Encrypt Certbot SSL (Auto HTTPS) |
| **DevOps / Hosting** | Docker, Docker Compose, Jenkins CI/CD, AWS EC2 (Ubuntu 24.04) |

---

## 📂 Project Directory Structure

```
Delivery_App/
├── Backend/
│   ├── prisma/
│   │   └── schema.prisma           # PostgreSQL Data Models (User, Order, Store, MenuItem, etc.)
│   ├── src/
│   │   ├── config/                 # Prisma DB & Environment setup
│   │   ├── controllers/
│   │   │   ├── adminController.ts   # Platform Analytics & Relocation Review
│   │   │   ├── authController.ts    # JWT Authentication & Role Authorization
│   │   │   ├── orderController.ts   # Order Dispatch & Handover OTP Verification
│   │   │   ├── paymentController.ts # Razorpay Order Creation & HMAC Verification
│   │   │   └── storeController.ts   # Store Profile, Menus, & Location Governance
│   │   ├── middleware/             # Role guards & JWT authentication
│   │   ├── routes/                 # Express Router Endpoints
│   │   ├── services/               # Socket.io WebSocket Service
│   │   └── index.ts                # HTTP Server & WebSocket Entrypoint
│   ├── Dockerfile                  # Multi-Stage Node.js Production Container
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx   # Super Admin Analytics & Fleet Radar
│   │   │   ├── Auth.tsx             # Login / Register Modal
│   │   │   ├── CustomerDashboard.tsx# Store Explorer, Menus, Cart & Razorpay Checkout
│   │   │   ├── DriverDashboard.tsx  # GPS Broadcaster, Navigation Map & Handshake PIN
│   │   │   ├── Navbar.tsx           # Role Navigation Header
│   │   │   └── PartnerDashboard.tsx # Store Hub, Location Lock & Menu Management
│   │   ├── services/               # Axios API client & Socket.io Singleton
│   │   ├── types/                  # Shared TypeScript Interfaces
│   │   ├── App.tsx                 # Role-Based Routing
│   │   └── main.tsx
│   ├── nginx.conf                  # Nginx HTTP (80) -> HTTPS (443) Redirect & SSL Config
│   ├── Dockerfile                  # Nginx Web Server Production Container
│   └── package.json
│
├── docker-compose.yml              # Multi-container orchestration (Frontend + Backend + SSL)
├── Jenkinsfile                     # Automated Declarative CI/CD Pipeline
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
* **Node.js** >= 20.x
* **Docker & Docker Compose**
* **PostgreSQL Database** (Local or Cloud instance like Aiven / Supabase)
* **Razorpay Test Account** ([dashboard.razorpay.com](https://dashboard.razorpay.com))

### 2. Clone the Repository
```bash
git clone https://github.com/pranavkannur/Delivery_App.git
cd Delivery_App
```

### 3. Backend Setup
```bash
cd Backend

# Create local environment configuration
cat <<EOF > .env
PORT=5000
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
JWT_SECRET="super_secret_jwt_key_123"
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
NODE_ENV=development
EOF

# Install dependencies and sync Prisma schema
npm install
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### 4. Frontend Setup
```bash
cd ../Frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🐳 Production Deployment with Docker Compose

To deploy the entire production stack with Nginx and SSL certificates:

```bash
# From project root:
docker compose build --no-cache
docker compose up -d
```

Containers will run:
* **Backend API**: `http://localhost:5000`
* **Frontend Web App**: `http://localhost:80` and `https://localhost:443`

---

## 🤖 CI/CD Pipeline (Jenkins)

The project includes an automated declarative `Jenkinsfile` that performs zero-downtime deployments on AWS EC2 upon every push to `main`:

```
GitHub Push ──> Webhook ──> Jenkins Pipeline:
                             ├── 1. Checkout Code (SCM)
                             ├── 2. Build Multi-Container Docker Stack
                             ├── 3. Inject Production Credentials (Vault / Secret Text)
                             ├── 4. Zero-Downtime Container Recreate & Prune
                             └── 5. Health Check & SSL Verification
```

---

## 🔐 Security & Data Protection

* **HTTPS Enforcement**: Strict HTTP to HTTPS port 443 redirection with TLS 1.2/1.3 encryption.
* **Role-Based Access Control (RBAC)**: Fine-grained middleware authorization for `CUSTOMER`, `DRIVER`, `PARTNER`, and `ADMIN`.
* **HMAC-SHA256 Signatures**: Razorpay payment callbacks verify mathematical hashes using the secret key before marking transactions as paid.
* **Handover OTP Handshake**: Secure 4-digit numeric verification prevents drivers from falsely marking deliveries as complete without customer presence.
* **Shop Location Lockdown**: Relocations are locked to prevent spoofing and require manual Super Admin review.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
