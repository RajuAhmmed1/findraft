# FinDraft — Financial Tracking SaaS

A full-stack SaaS application for freelancers and multi-org workers to track income, expenses, work hours, savings, and family transfers with analytics.

**Stack:** React 18 + Vite · Node.js + Express · MongoDB Atlas · JWT · Chart.js

---

## Folder Structure

```
findraft/
├── backend/
│   ├── middleware/auth.js          # JWT verification middleware
│   ├── models/                     # Mongoose schemas
│   │   ├── User.js                 # bcrypt password hashing, toPublic()
│   │   ├── Income.js               # optional org link
│   │   ├── Expense.js
│   │   ├── FamilyTransfer.js
│   │   ├── Organization.js         # hourlyRate, taxPercent, color
│   │   └── WorkLog.js              # earnings virtuals, rate snapshot
│   ├── routes/                     # Express route handlers
│   │   ├── auth.js                 # signup, login, /me, profile update
│   │   ├── income.js               # CRUD + org/month/date filter
│   │   ├── expenses.js             # CRUD + category/month/date filter
│   │   ├── family.js               # CRUD + month/date filter
│   │   ├── organizations.js        # CRUD, deletes associated worklogs
│   │   ├── worklogs.js             # CRUD + org/month/date filter, snapshots rate
│   │   └── reports.js              # summary, expenses-by-category, work-by-org, analytics
│   ├── utils/crud.js               # Generic CRUD factory with safe populate
│   ├── server.js                   # Entry point, rate limiting, CORS
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx         # Marketing landing page
│   │   │   ├── Login.jsx           # JWT login
│   │   │   ├── Signup.jsx          # Registration
│   │   │   ├── Dashboard.jsx       # 4 charts + analytics insights + stats
│   │   │   ├── IncomePage.jsx      # Income CRUD with org filter & link
│   │   │   ├── ExpensePage.jsx     # Expense CRUD with category filter
│   │   │   ├── FamilyPage.jsx      # Family transfer tracking
│   │   │   ├── OrgsPage.jsx        # Organization management cards
│   │   │   ├── WorkPage.jsx        # Work hour logging with live preview
│   │   │   ├── ReportsPage.jsx     # Annual report, 2 charts, CSV export
│   │   │   └── Settings.jsx        # Profile, password, theme, currency
│   │   ├── components/
│   │   │   ├── AppShell.jsx        # Sidebar + topbar layout
│   │   │   ├── Modal.jsx           # Reusable modal with ESC close
│   │   │   ├── StatCard.jsx        # Metric card with change indicator
│   │   │   └── EntryForm.jsx       # Reusable income/expense form
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Login, signup, logout, token persist
│   │   │   ├── ThemeContext.jsx    # Light/dark with localStorage persist
│   │   │   └── ToastContext.jsx    # Global toast notifications
│   │   ├── hooks/useApi.js         # useApi (fetch) + useCrud (mutations)
│   │   └── utils/
│   │       ├── api.js              # Axios instance with JWT interceptor
│   │       └── format.js           # fmt, fmtDate, initials, deltaLabel…
│   ├── styles/globals.css          # Full design system, dark mode, responsive
│   ├── index.html
│   ├── vite.config.js              # Dev proxy /api → localhost:5000
│   ├── vercel.json                 # SPA rewrite rule
│   └── .env.example
│
├── render.yaml                     # Render.com deployment config
├── package.json                    # Root convenience scripts
└── README.md
```

---

## Local Development

### Prerequisites
- **Node.js 18+**
- **A free MongoDB Atlas account** — https://cloud.mongodb.com

### Step 1 — Get your MongoDB connection string

1. Sign up at https://cloud.mongodb.com (free)
2. Create a **free M0 cluster** (any region)
3. Click **Database Access** → Add a new user with a password. Save it.
4. Click **Network Access** → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)
5. Click **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://username:password@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password and add `findraft` as the database name:
   ```
   mongodb+srv://username:password@cluster0.abc123.mongodb.net/findraft?retryWrites=true&w=majority
   ```

### Step 2 — Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster0.abc123.mongodb.net/findraft?retryWrites=true&w=majority
JWT_SECRET=pick_any_random_string_at_least_32_characters_long
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_oauth_web_client_id_here
```

> **JWT_SECRET**: generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 3 — Install & run

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
# ✅ MongoDB connected
# 🚀 Server running on port 5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 — create an account and start using the app.

---

## Deployment

### Backend → Render.com (free tier)

1. Push your code to a GitHub repository
2. Go to https://render.com → **New** → **Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** to `backend`
5. Set **Build Command**: `npm install`
6. Set **Start Command**: `npm start`
7. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Your random secret (32+ chars) |
| `JWT_EXPIRE` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your Vercel URL (set after frontend deploy) |

8. Click **Create Web Service**
9. Note your backend URL: `https://findraft-api.onrender.com`

> **Note:** Free Render instances spin down after 15 mins of inactivity. The first request after spin-down takes ~30s. Upgrade to a paid plan ($7/mo) for always-on.

### Frontend → Vercel (free)

1. Go to https://vercel.com → **New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework: **Vite** (auto-detected)
5. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://findraft-api.onrender.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Web Client ID |

6. Click **Deploy**
7. Note your frontend URL: `https://findraft.vercel.app`

8. Go back to Render → your backend service → Environment → update `FRONTEND_URL` to your Vercel URL → **Save Changes**

---

## API Reference

All routes except auth require the header:
```
Authorization: Bearer <token>
```

### Auth
| Method | Endpoint | Body / Query | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{name, email, password}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |
| POST | `/api/auth/google` | `{credential}` | Google Sign-In with ID token |
| GET | `/api/auth/me` | — | Get current user |
| PUT | `/api/auth/profile` | `{name?, email?, defaultCurrency?, theme?, currentPassword?, newPassword?}` | Update profile |

### Income
| Method | Endpoint | Query Params | Description |
|--------|----------|------|-------------|
| GET | `/api/income` | `month, year, orgId, startDate, endDate, category` | List with filters |
| POST | `/api/income` | — | `{amount, category, date, notes?, currency, organization?}` |
| PUT | `/api/income/:id` | — | Update entry |
| DELETE | `/api/income/:id` | — | Delete entry |

### Expenses
| Method | Endpoint | Query Params | Description |
|--------|----------|------|-------------|
| GET | `/api/expenses` | `month, year, category, startDate, endDate` | List with filters |
| POST | `/api/expenses` | — | `{amount, category, date, notes?, currency}` |
| PUT | `/api/expenses/:id` | — | Update entry |
| DELETE | `/api/expenses/:id` | — | Delete entry |

### Family Transfers
| Method | Endpoint | Query Params |
|--------|----------|------|
| GET | `/api/family` | `month, year, startDate, endDate` |
| POST/PUT/DELETE | `/api/family/:id?` | `{amount, date, recipient?, notes?, currency}` |

### Organizations
| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/organizations` | — |
| POST | `/api/organizations` | `{name, location?, hourlyRate, currency, taxPercent, color?}` |
| PUT | `/api/organizations/:id` | any of above fields |
| DELETE | `/api/organizations/:id` | — (also deletes work logs) |

### Work Logs
| Method | Endpoint | Query / Body |
|--------|----------|------|
| GET | `/api/worklogs` | `month, year, orgId, startDate, endDate` |
| POST | `/api/worklogs` | `{organization, date, hours, notes?}` |
| PUT | `/api/worklogs/:id` | same |
| DELETE | `/api/worklogs/:id` | — |

### Reports
| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/reports/summary` | `year` | Full year, 12 month breakdown |
| GET | `/api/reports/expenses-by-category` | `month, year` | Expense pie data |
| GET | `/api/reports/work-by-org` | `month, year` | Earnings by org |
| GET | `/api/reports/analytics` | `year` | Insights: top org, top expense, trend |

---

## Features Checklist

### Backend
- [x] JWT authentication (signup, login, token refresh on load)
- [x] bcrypt password hashing (cost factor 12)
- [x] Input validation via `express-validator`
- [x] Rate limiting (200 req/15min global, 20 req/15min on auth)
- [x] CORS configured for production
- [x] All 6 Mongoose models with indexes
- [x] Income → Organization optional link
- [x] WorkLog earnings virtuals (grossEarnings, netEarnings)
- [x] Rate/tax snapshot on WorkLog create (historical accuracy)
- [x] MongoDB aggregation pipelines for reports
- [x] ObjectId casting fixed for aggregation queries
- [x] Analytics endpoint: top org, top expense category, savings trend

### Frontend
- [x] JWT token stored in localStorage, sent on every request
- [x] Auto-logout on 401
- [x] Protected routes (redirect to /login if unauthenticated)
- [x] React Router v6 with nested routes
- [x] Dark mode (persisted to localStorage)
- [x] Collapsible sidebar (mobile-first)
- [x] Toast notifications
- [x] Dashboard: 4 charts (bar, line, 2× doughnut) + analytics insights
- [x] Income page: org filter, org link in form, totals footer
- [x] Expense page: category filter, totals footer  
- [x] Family page: monthly totals, recipient tracking
- [x] Organizations: color-coded cards, this-month earnings
- [x] Work Tracker: live earnings preview, gross/net columns, org filter
- [x] Reports: annual summary, trend chart, savings rate chart, CSV export
- [x] Settings: profile, password change, currency, theme
