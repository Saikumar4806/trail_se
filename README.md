# Subscription Delivery System (Web-Based)

Role-based subscription delivery system with a Node/Express + MySQL backend and a plain HTML/CSS/JS frontend. Authentication is email/password based and users are routed to dashboards by role.

## Tech Stack

- **Backend**: Node.js, Express, MySQL (`mysql2`)
- **Frontend**: HTML, CSS, Vanilla JS
- **DB**: MySQL 8+

## Project Structure

- `backend/`: Express API (auth + dashboards)
- `frontend/`: Static frontend (use Live Server)
- `database/`: SQL scripts (test users)
- `setup.md`: Sprint-1 setup notes

## Prerequisites

- **Node.js** (v18+ recommended)
- **MySQL Server** (8.0+)
- (Recommended) **VS Code** + **Live Server** extension (Ritwick Dey)

## Environment Variables (`.env`)

This project expects a root-level `.env` file at `./.env` (same folder as this `README.md`).

Example:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=subscription_db

```

Notes:
- `.env` is ignored by git (see `.gitignore`).
- The backend loads it from `backend/server.js` using `../.env`.

## Database Setup

### 1) Create DB + `users` table

From the project root:

```bash
node backend/db_init.js
```

This creates:
- Database: `subscription_db`
- Table: `users`

### 2) (Optional) Seed test users

Run the SQL in `database/test_users.sql` inside MySQL.

Example (MySQL CLI):

```bash
mysql -u root -p -D subscription_db < database/test_users.sql
```

## Install Dependencies

Backend dependencies live in `backend/`:

```bash
cd backend
npm install
```

## Run the Project

### 1) Start Backend (API)

From `backend/`:

```bash
cd backend
npm run test
```

Expected output:
- `Server started on port 5000`

API base URL:
- `http://localhost:5000`

### 2) Run Frontend

Do **not** double-click the HTML files (CORS/security issues). Use a local dev server.

With VS Code Live Server:
- Open `frontend/pages/start/login.html`
- Right-click → **Open with Live Server**

## Pages

- **Login**: `frontend/pages/start/login.html`
- **Register**: `frontend/pages/start/reg.html`
- **Dashboards**:
  - `frontend/pages/admin/dashboard.html`
  - `frontend/pages/customer/dashboard.html`
  - `frontend/pages/delivery/dashboard.html`

## API Endpoints

### Auth

- **POST** `/api/auth/register`
- **POST** `/api/auth/login`

### Dashboards

Endpoints:
- **GET** `/api/dashboard/admin`
- **GET** `/api/dashboard/customer`
- **GET** `/api/dashboard/partner`

## Default Test Accounts (from `database/test_users.sql`)

- **Admin**
  - Email: `admin@gmail.com`
  - Password: `admin123`
- **Customer**
  - Email: `cus1@gmail.com`
  - Password: `cus123`
- **Delivery Partner**
  - Email: `del1@example.com`
  - Password: `del123`

## Troubleshooting

### Login works but dashboard sagenerys “Unauthorized”

Most common causes:
- Backend not running on `http://localhost:5000`
- Missing DB connection vars in `.env`
- Stale browser storage: clear `localStorage` (or click Logout) and login again

### Database connection errors

Check:
- MySQL service is running
- `.env` has correct `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`
- Database exists: `subscription_db`

### Port 5000 already in use

Either stop the process using port 5000, or change:
- `PORT` in `.env`
- Update frontend API URLs (in `frontend/assets/js/...`) if you change the port

## Notes / Security

This is a student/demo project:
- Passwords are stored/checked as plain text in the current implementation.
- For a production-ready app, use `bcrypt` hashing and proper session/token handling.
