-- Schema untuk aplikasi POS Kopi (SQLite/Turso)

-- Tabel produk
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL, -- Harga dalam IDR (tanpa desimal)
    stock INTEGER NOT NULL DEFAULT 0,
    image TEXT DEFAULT 'https://via.placeholder.com/200x150?text=No+Image'
);

-- Tabel pesanan
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total INTEGER NOT NULL, -- Total dalam IDR
    payment_method TEXT NOT NULL,
    payment_amount INTEGER DEFAULT 0 -- Uang diberikan untuk tunai
);

-- Tabel item pesanan
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL, -- Harga per item saat pesan
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabel struk
CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    receipt_text TEXT NOT NULL,
    printed INTEGER DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Tabel pengguna
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
);

-- Insert user default
INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin');

-- Insert data produk awal (kopi)
INSERT OR IGNORE INTO products (name, price, stock, image) VALUES
('Kopi Hitam', 15000, 100, 'https://via.placeholder.com/200x150?text=Kopi+Hitam'),
('Kopi Susu', 20000, 100, 'https://via.placeholder.com/200x150?text=Kopi+Susu'),
('Kopi Latte', 25000, 100, 'https://via.placeholder.com/200x150?text=Kopi+Latte'),
('Cappuccino', 22000, 100, 'https://via.placeholder.com/200x150?text=Cappuccino'),
('Espresso', 18000, 100, 'https://via.placeholder.com/200x150?text=Espresso');