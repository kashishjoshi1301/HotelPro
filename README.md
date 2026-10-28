# HotelPro — Complete Hotel Booking & Management Solution

A modern, full-stack luxury hotel reservation and management platform built with React, Vite, Bootstrap 5, Express.js, and MongoDB.

---

## 🔗 Project Evaluation Links

| Item | URL / Details |
|---|---|
| **GitHub Repository** | [https://github.com/Arnav2306/HotelPro](https://github.com/Arnav2306/HotelPro) |
| **Frontend Live Demo** | [https://hotelpro.vercel.app](https://hotelpro.vercel.app) *(or your deployed Vercel URL)* |
| **Backend Live API** | [https://hotelpro-api.onrender.com/api](https://hotelpro-api.onrender.com/api) *(or your deployed Render URL)* |
| **API Health Check** | `GET /api/health` → `{"status":"OK","message":"HotelPro API is active and healthy"}` |

---

## 🔑 Pre-Configured Test Credentials

Run `npm run seed` inside the `server/` directory to automatically populate the database with rooms and test users:

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Administrator** | `admin@hotelpro.com` | `Admin@123` | Admin Analytics Dashboard, Total Revenue, Occupancy Rate, Full Room Management |
| **Staff** | `staff@hotelpro.com` | `Staff@123` | Staff Panel, Guest Check-In & Check-Out, Room Status Transitions (cleaning, maintenance) |
| **Guest** | `guest@hotelpro.com` | `Guest@123` | Room Search, Booking Flow, Demo & Razorpay Payments, Invoices, My Stays Dashboard |

*Note: Public registration via the UI assigns the `guest` role by design for security.*

---

## 🛠️ Tech Stack & Skills

- **Frontend:** React 19, Vite, Bootstrap 5, Bootstrap Icons, Axios, Context API
- **Backend:** Node.js (v18+), Express.js, RESTful APIs, JSON Web Tokens (JWT), bcryptjs, cookie-parser, CORS
- **Database:** MongoDB & Mongoose ODM
- **Payments:** Razorpay Test Mode + Built-in Demo Payment Simulation with HMAC-SHA256 signature verification
- **Testing:** Native Node.js test runner (`node:test`, `node:assert`)
- **Deployment:** Render (Backend API), Vercel (Frontend SPA)

---

## 📂 Project Structure

```
HotelPro/
├── client/                     # React / Vite SPA frontend
│   ├── src/
│   │   ├── api/                # Axios API service modules (auth, rooms, bookings, payments, dashboard)
│   │   ├── components/         # UI components (Navbar, Hero, RoomList, BookingModal, Dashboards, InvoiceModal)
│   │   ├── context/            # AuthContext (state, login, register, logout, session persistence)
│   │   ├── data/               # Mock fallback rooms
│   │   └── utils/              # INR currency formatting (₹)
│   ├── .env.example
│   └── vercel.json
├── server/                     # Express.js / Node.js backend
│   ├── src/
│   │   ├── middleware/         # JWT cookie auth & role authorization middleware
│   │   ├── models/             # Mongoose schemas: User, Room, Booking, Payment
│   │   ├── routes/             # REST endpoints (auth, rooms, bookings, payments, dashboard)
│   │   ├── db.js               # MongoDB connection handler
│   │   ├── seed.js             # One-click database seeder for test users & rooms
│   │   └── index.js            # Express app entry point
│   ├── test/                   # Automated unit & integration tests
│   │   └── suite.test.js
│   ├── .env.example
│   └── package.json
├── render.yaml                 # Infrastructure as Code deployment blueprint
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js** ≥ 18.x (tested on v24)
- **npm** ≥ 8.x
- **MongoDB** (Local instance on `mongodb://localhost:27017/hotelpro` or a free [MongoDB Atlas](https://cloud.mongodb.com) URI)

### 1. Clone the Repository
```bash
git clone https://github.com/Arnav2306/HotelPro.git
cd HotelPro
```

### 2. Configure & Run Backend Server
```bash
cd server
cp .env.example .env          # Edit .env with your MongoDB URI & JWT secret
npm install
npm run seed                  # Seeds database with admin, staff, guest & 6 luxury rooms
npm run dev                   # Starts backend server on http://localhost:5000
```

### 3. Configure & Run Frontend Client
Open a second terminal window:
```bash
cd client
cp .env.example .env          # Defaults to VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # Starts Vite dev server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Comprehensive Testing Guide

Follow these step-by-step instructions to test all features in your IDE or browser:

### Step 1: Run Automated Backend Tests
HotelPro includes an automated test suite verifying User model hashing, JWT authentication, Room schema validations, Payment idempotency, and price calculations:
```bash
cd server
npm test
```
*Expected Result:* All 12 automated unit tests pass.

---

### Step 2: Seed the Database
Populate the database with all room categories and test users:
```bash
cd server
npm run seed
```

---

### Step 3: Test Guest Booking & Demo Payment Workflow
1. Open [http://localhost:5173](http://localhost:5173).
2. Click **Sign In** in the navbar.
3. Login using the guest account:
   - Email: `guest@hotelpro.com`
   - Password: `Guest@123`
4. The navbar will display **JOHN DOE** with a `GUEST` badge and **My Stays** button.
5. Browse the available rooms (Presidential Ocean Suite, Deluxe Garden Villa, etc.).
6. Click **Book Now** on any room card.
7. Select Check-In and Check-Out dates (e.g. tomorrow to 3 days later).
8. Observe the real-time night calculation and total price in Indian Rupees (₹).
9. Click **Confirm Reservation**.
10. Navigate to **My Stays** or **My Dashboard**:
    - View your reservation in `confirmed` status with `Payment: Pending`.
    - Click **Pay Now**.
    - Complete the payment via the built-in **Demo Payment** mode (or test card if Razorpay keys are configured).
    - Status immediately updates to `Paid`.
    - Click **View / Print Invoice** to see a formatted luxury hotel invoice with booking ID, transaction ID, and stay summary.

---

### Step 4: Test Front Desk Staff Workflow
1. Click **Logout** from the guest account.
2. Sign in using the staff account:
   - Email: `staff@hotelpro.com`
   - Password: `Staff@123`
3. The navbar will display a `STAFF` badge and **Staff Panel**.
4. Open **Staff Panel**:
   - View all incoming and active guest reservations.
   - Filter by status (`confirmed`, `checked-in`, `checked-out`).
   - Click **Check-In Guest** when a guest arrives → Status changes to `checked-in`.
   - Update room status directly between `available`, `cleaning`, and `maintenance`.
   - Click **Check-Out Guest** when departure occurs → Status changes to `checked-out`.

---

### Step 5: Test Hotel Administrator Workflow
1. Click **Logout** and sign in with the admin account:
   - Email: `admin@hotelpro.com`
   - Password: `Admin@123`
3. The navbar will show an `ADMIN` badge and **Admin Panel**.
4. Open **Admin Panel**:
   - Inspect **Total Revenue** calculated dynamically from paid reservations.
   - Check **Occupancy Rate (%)** and total room inventory stats.
   - Review the complete revenue breakdown and operational analytics.

---

### Step 6: Test API Endpoints via Postman / cURL
You can test the RESTful API directly:

#### Health Check:
```bash
curl -X GET http://localhost:5000/api/health
```

#### Get Available Rooms:
```bash
curl -X GET "http://localhost:5000/api/rooms?category=Villa"
```

#### User Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"guest@hotelpro.com","password":"Guest@123"}'
```

---

## 🔒 Security & Architecture Highlights

- **Password Security:** Passwords hashed with `bcryptjs` using 10 salt rounds.
- **JWT Protection:** Stored in HTTP-only, `sameSite`, and secure cookies to protect against XSS and CSRF.
- **Server-Side Pricing:** Room rates and reservation totals are strictly computed server-side from database records.
- **Overlap Prevention:** Double-booking prevention logic rejects overlapping reservations for the same room.
- **HMAC SHA-256:** Razorpay payments and webhooks verified with timing-attack resistant signatures.
- **Demo Mode Isolation:** Demo payments are permitted in development and strictly blocked in production (`NODE_ENV=production`).

---

## 🌐 Production Deployment

### Backend (Render)
1. Push your repository to GitHub.
2. In Render, create a new **Web Service** pointing to your repository.
3. Set **Root Directory** to `server`.
4. Set **Build Command:** `npm install` and **Start Command:** `npm start`.
5. Set environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`.

### Frontend (Vercel)
1. In Vercel, import your repository.
2. Set **Root Directory** to `client`.
3. Set environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`.
4. Deploy. The included `vercel.json` ensures all SPA routes redirect cleanly to `index.html`.
