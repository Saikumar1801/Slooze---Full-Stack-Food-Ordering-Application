# Slooze - Full-Stack Food Ordering Application

Slooze is a role-based food ordering platform built as a take-home challenge. It features a robust Role-Based Access Control (RBAC) system and country-specific data isolation.

## 🚀 Getting Started

Follow these steps to run the application on your local machine.

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher

### Installation

1. **Clone the repository** (or download the source code).
2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```
2. **Open your browser**:
   Navigate to `http://localhost:3000`

The application uses an SQLite database (`slooze.db`) which is automatically initialized and seeded with demo data on the first run.

## 🔑 Demo Accounts

Use these accounts to test the different roles and country restrictions. All accounts use the password: `password`

| Role | Email | Country |
| :--- | :--- | :--- |
| **Admin** | `admin@slooze.com` | India |
| **Manager** | `manager_in@slooze.com` | India |
| **Member** | `member_in@slooze.com` | India |
| **Member** | `member_us@slooze.com` | America |

## ✨ Features & RBAC

| Feature | Admin | Manager | Member |
| :--- | :---: | :---: | :---: |
| View restaurants & menu items | ✅ | ✅ | ✅ |
| Create an order (Place Order) | ✅ | ✅ | ✅ |
| Checkout & Pay | ✅ | ✅ | ❌ |
| Cancel an order | ✅ | ✅ | ❌ |
| Add / Modify payment methods | ✅ | ❌ | ❌ |

### Extension: Country-Based Restrictions
- Users can only view restaurants located in their assigned country.
- Managers and Admins can only approve (pay) or cancel orders placed within their assigned country.
- Currency symbols (₹ vs $) automatically switch based on the user's country.

## 🛠 Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Motion, Lucide Icons
- **Backend**: Node.js, Express
- **Database**: SQLite (via `better-sqlite3`)
- **Language**: TypeScript
