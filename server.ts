import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use in-memory database for Vercel to avoid filesystem issues
// For local dev, we still use the file for persistence
const db = new Database(process.env.NODE_ENV === 'production' ? ':memory:' : 'slooze.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('Admin', 'Manager', 'Member')),
    country TEXT CHECK(country IN ('India', 'America'))
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    country TEXT CHECK(country IN ('India', 'America'))
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    name TEXT,
    price REAL,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT CHECK(status IN ('Pending', 'Paid', 'Cancelled')),
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    menu_item_id INTEGER,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    details TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Data
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (email, password, role, country) VALUES (?, ?, ?, ?)");
  insertUser.run("admin@slooze.com", "password", "Admin", "India");
  insertUser.run("manager_in@slooze.com", "password", "Manager", "India");
  insertUser.run("member_in@slooze.com", "password", "Member", "India");
  insertUser.run("manager_us@slooze.com", "password", "Manager", "America");
  insertUser.run("member_us@slooze.com", "password", "Member", "America");

  const insertRestaurant = db.prepare("INSERT INTO restaurants (name, country) VALUES (?, ?)");
  insertRestaurant.run("Spice Garden", "India");
  insertRestaurant.run("Burger Joint", "America");
  insertRestaurant.run("Tandoori Nights", "India");
  insertRestaurant.run("Pizza Palace", "America");

  const insertMenu = db.prepare("INSERT INTO menu_items (restaurant_id, name, price) VALUES (?, ?, ?)");
  insertMenu.run(1, "Paneer Tikka", 250);
  insertMenu.run(1, "Butter Chicken", 350);
  insertMenu.run(2, "Classic Cheeseburger", 12.99);
  insertMenu.run(2, "Bacon Burger", 14.99);
  insertMenu.run(3, "Chicken Biryani", 300);
  insertMenu.run(3, "Dal Makhani", 200);
  insertMenu.run(4, "Pepperoni Pizza", 18.99);
  insertMenu.run(4, "Veggie Pizza", 16.99);
}

const app = express();
app.use(express.json());

// Middleware to get user from header
app.use((req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (userId) {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      (req as any).user = user;
    } catch (e) {
      console.error("DB Error:", e);
    }
  }
  next();
});

// API Routes
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/restaurants", (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const restaurants = db.prepare("SELECT * FROM restaurants WHERE country = ?").all(user.country);
  res.json(restaurants);
});

app.get("/api/restaurants/:id/menu", (req, res) => {
  const menu = db.prepare("SELECT * FROM menu_items WHERE restaurant_id = ?").all(req.params.id);
  res.json(menu);
});

app.post("/api/orders", (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { items, totalAmount, status } = req.body;
  const initialStatus = (status === 'Paid' && (user.role === 'Admin' || user.role === 'Manager')) ? 'Paid' : 'Pending';
  const info = db.prepare("INSERT INTO orders (user_id, status, total_amount) VALUES (?, ?, ?)")
    .run(user.id, initialStatus, totalAmount);
  const orderId = info.lastInsertRowid;
  const insertItem = db.prepare("INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)");
  for (const item of items) {
    insertItem.run(orderId, item.id, item.quantity, item.price);
  }
  res.json({ id: orderId, status: initialStatus });
});

app.get("/api/orders", (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  let orders;
  if (user.role === 'Admin' || user.role === 'Manager') {
    orders = db.prepare(`
      SELECT o.*, u.email as user_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE u.country = ? 
      ORDER BY o.created_at DESC
    `).all(user.country);
  } else {
    orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
  }
  res.json(orders);
});

app.post("/api/orders/:id/pay", (req, res) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) return res.status(403).json({ error: "Forbidden" });
  const order = db.prepare("SELECT o.*, u.country FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?").get(req.params.id) as any;
  if (!order || order.country !== user.country) return res.status(403).json({ error: "Forbidden" });
  db.prepare("UPDATE orders SET status = 'Paid' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/orders/:id/cancel", (req, res) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'Admin' && user.role !== 'Manager')) return res.status(403).json({ error: "Forbidden" });
  const order = db.prepare("SELECT o.*, u.country FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?").get(req.params.id) as any;
  if (!order || order.country !== user.country) return res.status(403).json({ error: "Forbidden" });
  db.prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/payment-methods", (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
  const methods = db.prepare("SELECT * FROM payment_methods WHERE user_id = ?").all(user.id);
  res.json(methods);
});

app.post("/api/payment-methods", (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
  const { type, details } = req.body;
  db.prepare("INSERT INTO payment_methods (user_id, type, details) VALUES (?, ?, ?)")
    .run(user.id, type, details);
  res.json({ success: true });
});

// Vite / Static Serving
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

// Start server only in local development
if (process.env.NODE_ENV !== "production") {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
