const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const PDFDocument = require('pdfkit');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session middleware
app.use(session({
    secret: 'pos-kopi-secret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Ganti dengan user MySQL Anda
    password: '', // Ganti dengan password MySQL Anda
    database: 'pos_kopi'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
    initializeDatabase();
});

// Initialize database and tables
function initializeDatabase() {
    // Disable foreign key checks
    db.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
        if (err) console.error('Error disabling FK checks:', err);
    });
    // Drop tables in reverse order due to foreign keys
    const dropQueries = [
        'DROP TABLE IF EXISTS receipts',
        'DROP TABLE IF EXISTS order_items',
        'DROP TABLE IF EXISTS orders',
        'DROP TABLE IF EXISTS products',
        'DROP TABLE IF EXISTS users'
    ];
    dropQueries.forEach(query => {
        db.query(query, (err) => {
            if (err) console.error('Error dropping table:', err);
        });
    });
    // Enable foreign key checks
    db.query('SET FOREIGN_KEY_CHECKS = 1', (err) => {
        if (err) console.error('Error enabling FK checks:', err);
    });
    // Then create tables
    const sql = require('fs').readFileSync('./schema.sql', 'utf8');
    const queries = sql.split(';').filter(q => q.trim());
    queries.forEach(query => {
        if (query.trim()) {
            db.query(query, (err) => {
                if (err) console.error('Error executing query:', err);
            });
        }
    });
}

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            return res.render('login', { error: 'Terjadi kesalahan' });
        }
        if (results.length > 0) {
            req.session.user = results[0];
            res.redirect('/');
        } else {
            res.render('login', { error: 'Username atau password salah' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', requireAuth, (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            return res.status(500).send('Error mengambil produk');
        }
        res.render('index', { products: results, user: req.session.user });
    });
});

app.post('/order', (req, res) => {
    const { items, payment_method, payment_amount } = req.body;
    let total = 0;
    const orderItems = JSON.parse(items);

    // Hitung total
    orderItems.forEach(item => {
        total += item.price * item.quantity;
    });

    // Insert order
    db.query('INSERT INTO orders (total, payment_method, payment_amount) VALUES (?, ?, ?)', [total, payment_method, payment_amount || 0], function(err, result) {
        if (err) {
            return res.status(500).send('Error membuat pesanan');
        }
        const orderId = result.insertId;

        // Insert order items
        const values = orderItems.map(item => [orderId, item.id, item.quantity, item.price]);
        db.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?', [values], function(err) {
            if (err) {
                return res.status(500).send('Error menyimpan item pesanan');
            }

            // Update stock
            orderItems.forEach(item => {
                db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
            });

            // Generate receipt
            generateReceipt(orderId, orderItems, total, payment_method, payment_amount || 0, res);
        });
    });
});

function generateReceipt(orderId, items, total, paymentMethod, paymentAmount, res) {
    let receiptText = `================================\n`;
    receiptText += `         KAWULO STREET\n`;
    receiptText += `   Jl Ahmad Yani Kudus\n`;
    receiptText += ` Depan Toko Sinar Kaca\n`;
    receiptText += `================================\n\n`;
    receiptText += `No. Pesanan: ${orderId}\n`;
    receiptText += `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n`;
    receiptText += `Produk:\n`;
    items.forEach(item => {
        receiptText += `${item.name} x${item.quantity} - Rp ${formatIDR(item.price * item.quantity)}\n`;
    });
    receiptText += `\n--------------------------------\n`;
    receiptText += `Total: Rp ${formatIDR(total)}\n`;
    receiptText += `Pembayaran: ${paymentMethod}\n`;
    if (paymentMethod === 'Tunai' && paymentAmount > 0) {
        const change = paymentAmount - total;
        receiptText += `Dibayar: Rp ${formatIDR(paymentAmount)}\n`;
        receiptText += `Kembalian: Rp ${formatIDR(change)}\n`;
    }
    receiptText += `================================\n`;
    receiptText += `Terima Kasih!\n`;
    receiptText += `================================\n`;

    // Save to database
    db.query('INSERT INTO receipts (order_id, receipt_text) VALUES (?, ?)', [orderId, receiptText], function(err, result) {
        if (err) {
            return res.status(500).send('Error menyimpan struk');
        }
        res.json({ success: true, receiptId: result.insertId, receiptText });
    });
}

app.get('/receipt/:id', (req, res) => {
    const receiptId = req.params.id;
    db.query('SELECT * FROM receipts WHERE id = ?', [receiptId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Struk tidak ditemukan');
        }
        res.send(`<pre>${results[0].receipt_text}</pre><br><button onclick="window.print()">Print</button>`);
    });
});

app.get('/receipt/pdf/:id', (req, res) => {
    const receiptId = req.params.id;
    db.query('SELECT * FROM receipts WHERE id = ?', [receiptId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Struk tidak ditemukan');
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="struk.pdf"');
        doc.pipe(res);

        doc.fontSize(12).text(results[0].receipt_text);
        doc.end();
    });
});

// Admin routes
app.get('/admin', requireAuth, (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            return res.status(500).send('Error mengambil produk');
        }
        res.render('admin', { products: results, user: req.session.user });
    });
});

app.post('/admin/product', requireAuth, (req, res) => {
    const { name, price, stock, image } = req.body;
    db.query('INSERT INTO products (name, price, stock, image) VALUES (?, ?, ?, ?)', [name, parseInt(price), parseInt(stock), image || 'https://via.placeholder.com/200x150?text=No+Image'], function(err) {
        if (err) {
            return res.status(500).send('Error menambah produk');
        }
        res.redirect('/admin');
    });
});

app.post('/admin/product/:id/update', requireAuth, (req, res) => {
    const { name, price, stock, image } = req.body;
    const id = req.params.id;
    db.query('UPDATE products SET name = ?, price = ?, stock = ?, image = ? WHERE id = ?', [name, parseInt(price), parseInt(stock), image, id], function(err) {
        if (err) {
            return res.status(500).send('Error update produk');
        }
        res.redirect('/admin');
    });
});

app.post('/admin/product/:id/delete', requireAuth, (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).send('Error hapus produk');
        }
        res.redirect('/admin');
    });
});

// Reports
app.get('/reports', requireAuth, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.query(`
        SELECT o.id, o.date, o.total, o.payment_method, GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity)) as items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE DATE(o.date) = ?
        GROUP BY o.id
        ORDER BY o.date DESC
    `, [today], (err, results) => {
        if (err) {
            return res.status(500).send('Error mengambil laporan');
        }
        const totalSales = results.reduce((sum, order) => sum + order.total, 0);
        res.render('reports', { orders: results, totalSales, date: today, user: req.session.user });
    });
});

function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
}

app.listen(port, () => {
    console.log(`Aplikasi POS berjalan di http://localhost:${port}`);
});