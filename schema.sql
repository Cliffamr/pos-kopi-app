-- Schema untuk aplikasi POS Kopi (MySQL)

-- Tabel produk
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INT NOT NULL, -- Harga dalam IDR (tanpa desimal)
    stock INT NOT NULL DEFAULT 0,
    image VARCHAR(255) DEFAULT 'https://via.placeholder.com/200x150?text=No+Image'
) ENGINE=InnoDB;

-- Tabel pesanan
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total INT NOT NULL, -- Total dalam IDR
    payment_method VARCHAR(50) NOT NULL,
    payment_amount INT DEFAULT 0 -- Uang diberikan untuk tunai
) ENGINE=InnoDB;

-- Tabel item pesanan
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price INT NOT NULL, -- Harga per item saat pesan
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Tabel struk
CREATE TABLE IF NOT EXISTS receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    receipt_text TEXT NOT NULL,
    printed BOOLEAN DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;

-- Tabel pengguna
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin'
) ENGINE=InnoDB;

-- Insert user default
INSERT IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin');

-- Insert data produk awal (kopi)
INSERT IGNORE INTO products (name, price, stock, image) VALUES
('Kopi Hitam', 15000, 100, 'https://via.placeholder.com/200x150?text=Kopi+Hitam'),
('Kopi Susu', 20000, 100, 'https://via.placeholder.com/200x150?text=Kopi+Susu'),
('Kopi Latte', 25000, 100, 'https://via.placeholder.com/200x150?text=Kopi+Latte'),
('Cappuccino', 22000, 100, 'https://via.placeholder.com/200x150?text=Cappuccino'),
('Espresso', 18000, 100, 'https://via.placeholder.com/200x150?text=Espresso');