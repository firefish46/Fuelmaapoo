# NationalFuel — Supply Monitoring System

A full-stack fuel rationing & monitoring system built with **Next.js 14 (App Router)**, **MongoDB / Mongoose**, and **pure CSS Modules** (no Tailwind).

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | Next.js 14 (App Router), React 18       |
| Styling    | CSS Modules (no Tailwind, no UI libs)   |
| Backend    | Next.js API Routes (Route Handlers)     |
| Database   | MongoDB via Mongoose                    |
| Auth       | JWT (jose) + HttpOnly cookies           |
| Password   | bcryptjs                                |

---

## Features

### Both Roles
- ✅ Check vehicle eligibility by registration number
- ✅ Auto-detect vehicle class from history
- ✅ Fuel usage bar with remaining allowance
- ✅ View transaction records with filters

### Pump Operator
- ✅ Record fuel dispensing (auto-validated against daily limit)
- ✅ Restricted to their assigned pump station
- ✅ Sees only their pump's transactions

### Government Admin
- ✅ Set/update daily fuel limits per vehicle class (10 classes)
- ✅ Add / toggle pump stations online/offline
- ✅ Create & manage pump operator accounts
- ✅ Full dashboard with live stats
- ✅ Full access to all transaction records

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/fuelmonitor
JWT_SECRET=your-long-random-secret-here
```

### 3. Seed the database
```bash
npm run seed
```
This creates pump stations, vehicle class limits, users, and sample transactions.

### 4. Run development server
```bash
npm run dev
```
Visit: http://localhost:3000

---

## Demo Credentials

| Role            | Username    | Password  |
|-----------------|-------------|-----------|
| Govt Admin      | govt_admin  | admin123  |
| Pump Operator 1 | pump_op1    | pump123   |
| Pump Operator 2 | pump_op2    | pump123   |
| Pump Operator 3 | pump_op3    | pump123   |

---

## Vehicle Classes & Default Daily Limits

| Class        | Daily Limit |
|--------------|-------------|
| Motorcycle   | 5 L         |
| Private Car  | 20 L        |
| Pickup / SUV | 30 L        |
| Microbus     | 40 L        |
| Minibus      | 50 L        |
| Bus          | 80 L        |
| Light Truck  | 60 L        |
| Heavy Truck  | 120 L       |
| Agricultural | 100 L       |
| Emergency    | 999 L       |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login|logout|me/
│   │   ├── employees/[id]/
│   │   ├── limits/
│   │   ├── pumps/[id]/
│   │   ├── transactions/stats/
│   │   └── vehicles/check/
│   ├── check/          — Vehicle eligibility check
│   ├── dashboard/      — Live stats dashboard
│   ├── dispense/       — Record fuel dispensing
│   ├── employees/      — Employee management (Govt)
│   ├── limits/         — Fuel limit settings (Govt)
│   ├── pumps/          — Pump station management (Govt)
│   ├── records/        — Transaction log
│   └── login/          — Login page
├── components/layout/AppShell.js
├── lib/
│   ├── AuthContext.js
│   ├── ToastContext.js
│   ├── auth.js         — JWT helpers
│   ├── db.js           — MongoDB connection
│   └── models/         — Mongoose models
├── middleware.js        — Route protection
└── styles/             — CSS Modules
```
