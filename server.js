require('dotenv').config();
const express = require('express');
const { createClient } = require('@libsql/client');
const bodyParser = require('body-parser');
const path = require('path');
const PDFDocument = require('pdfkit');
const session = require('express-session');
const fs = require('fs');

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

// Turso libSQL connection
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

// Initialize database and tables
async function initializeDatabase() {
    try {
        // Enable foreign keys
        await db.execute('PRAGMA foreign_keys = ON');

        // Create tables
        const sql = fs.readFileSync('./schema.sql', 'utf8');
        const queries = sql.split(';').filter(q => q.trim());
        for (const query of queries) {
            if (query.trim()) {
                await db.execute(query);
            }
        }
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Call initialize
initializeDatabase();

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

// Routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (result.rows.length > 0) {
            req.session.user = result.rows[0];
            res.redirect('/');
        } else {
            res.render('login', { error: 'Username atau password salah' });
        }
    } catch (err) {
        res.render('login', { error: 'Terjadi kesalahan' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', requireAuth, async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM products');
        res.render('index', { products: result.rows, user: req.session.user });
    } catch (err) {
        res.status(500).send('Error mengambil produk');
    }
});

app.post('/order', async (req, res) => {
    const { items, payment_method, payment_amount } = req.body;
    let total = 0;
    const orderItems = JSON.parse(items);

    // Hitung total
    orderItems.forEach(item => {
        total += item.price * item.quantity;
    });

    try {
        // Insert order
        const orderResult = await db.execute('INSERT INTO orders (total, payment_method, payment_amount) VALUES (?, ?, ?)', [total, payment_method, payment_amount || 0]);
        const orderId = orderResult.lastInsertRowid;

        // Insert order items
        for (const item of orderItems) {
            await db.execute('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.id, item.quantity, item.price]);
        }

        // Update stock
        for (const item of orderItems) {
            await db.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
        }

        // Generate receipt
        await generateReceipt(orderId, orderItems, total, payment_method, payment_amount || 0, res);
    } catch (err) {
        res.status(500).send('Error membuat pesanan');
    }
});

async function generateReceipt(orderId, items, total, paymentMethod, paymentAmount, res) {
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

    try {
        // Save to database
        await db.execute('INSERT INTO receipts (order_id, receipt_text) VALUES (?, ?)', [orderId, receiptText]);
        res.json({ success: true, receiptId: orderId, receiptText });
    } catch (err) {
        res.status(500).send('Error menyimpan struk');
    }
}

app.get('/receipt/:id', async (req, res) => {
    const receiptId = req.params.id;
    try {
        const result = await db.execute('SELECT * FROM receipts WHERE id = ?', [receiptId]);
        if (result.rows.length === 0) {
            return res.status(404).send('Struk tidak ditemukan');
        }
        res.send(`<pre>${result.rows[0].receipt_text}</pre><br><button onclick="window.print()">Print</button>`);
    } catch (err) {
        res.status(404).send('Struk tidak ditemukan');
    }
});

app.get('/receipt/pdf/:id', async (req, res) => {
    const receiptId = req.params.id;
    try {
        const result = await db.execute('SELECT * FROM receipts WHERE id = ?', [receiptId]);
        if (result.rows.length === 0) {
            return res.status(404).send('Struk tidak ditemukan');
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="struk.pdf"');
        doc.pipe(res);

        doc.fontSize(12).text(result.rows[0].receipt_text);
        doc.end();
    } catch (err) {
        res.status(404).send('Struk tidak ditemukan');
    }
});

// Admin routes
app.get('/admin', requireAuth, async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM products');
        res.render('admin', { products: result.rows, user: req.session.user });
    } catch (err) {
        res.status(500).send('Error mengambil produk');
    }
});

app.post('/admin/product', requireAuth, async (req, res) => {
    const { name, price, stock, image } = req.body;
    try {
        await db.execute('INSERT INTO products (name, price, stock, image) VALUES (?, ?, ?, ?)', [name, parseInt(price), parseInt(stock), image || 'https://via.placeholder.com/200x150?text=No+Image']);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error menambah produk');
    }
});

app.post('/admin/product/:id/update', requireAuth, async (req, res) => {
    const { name, price, stock, image } = req.body;
    const id = req.params.id;
    try {
        await db.execute('UPDATE products SET name = ?, price = ?, stock = ?, image = ? WHERE id = ?', [name, parseInt(price), parseInt(stock), image, id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error update produk');
    }
});

app.post('/admin/product/:id/delete', requireAuth, async (req, res) => {
    const id = req.params.id;
    try {
        await db.execute('DELETE FROM products WHERE id = ?', [id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Error hapus produk');
    }
});

// Reports
app.get('/reports', requireAuth, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const result = await db.execute(`
            SELECT o.id, o.date, o.total, o.payment_method, GROUP_CONCAT(p.name || ' x' || oi.quantity) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE DATE(o.date) = ?
            GROUP BY o.id
            ORDER BY o.date DESC
        `, [today]);
        const totalSales = result.rows.reduce((sum, order) => sum + order.total, 0);
        res.render('reports', { orders: result.rows, totalSales, date: today, user: req.session.user });
    } catch (err) {
        res.status(500).send('Error mengambil laporan');
    }
});

function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
}

app.listen(port, () => {
    console.log(`Aplikasi POS berjalan di http://localhost:${port}`);
});