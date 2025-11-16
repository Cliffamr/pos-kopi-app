# Aplikasi POS Penjualan Kopi

Aplikasi Point of Sale (POS) sederhana untuk penjualan kopi dengan bahasa Indonesia dan harga dalam Rupiah (IDR).

## Fitur

- **Login Sistem**: Autentikasi pengguna dengan session.
- **Penjualan Produk**: Pilih produk, tambah ke keranjang, proses pembayaran.
- **Pencarian Produk**: Search bar untuk mencari produk berdasarkan nama saat memilih produk.
- **Gambar Produk**: Setiap produk memiliki gambar yang ditampilkan.
- **Badge Keranjang**: Menampilkan jumlah total item di keranjang.
- **Struk Pembelian**: Generate struk tersimpan di database, bisa di-print sebagai PDF.
- **Kelola Produk**: Tambah, edit, hapus produk (halaman admin).
- **Laporan Penjualan**: Lihat pesanan harian dan total penjualan.
- **Bahasa Indonesia**: UI dan pesan dalam bahasa Indonesia.
- **Harga IDR**: Format mata uang Rupiah.

## Cara Menggunakan

1. Login dengan username: `admin`, password: `admin123`.
2. Di halaman POS, pilih produk dan checkout.
3. Akses `/admin` untuk kelola produk.
4. Akses `/reports` untuk lihat laporan harian.
5. Logout untuk keluar.

## Teknologi

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: Vue.js 3, Bootstrap 5, FontAwesome Icons, HTML, CSS
- **Print**: PDFKit untuk generate PDF struk

## UI Modern Features

- Gradient backgrounds dan glassmorphism effects
- Smooth animations dan hover effects
- Responsive design dengan cards dan shadows
- FontAwesome icons untuk navigasi dan buttons
- Modern typography dan color schemes

## Setup MySQL

1. Install MySQL server.
2. Buat database `pos_kopi`.
3. Update config di `server.js`:
   - host: 'localhost'
   - user: 'your_mysql_user'
   - password: 'your_mysql_password'
   - database: 'pos_kopi'

## Instalasi

1. Pastikan Node.js terinstall.
2. Clone atau download project ini.
3. Jalankan `npm install` di folder project.
4. Jalankan `node server.js`.
5. Buka browser ke `http://localhost:3000`.

## Database Schema

Schema SQL tersedia di `schema.sql`. Tabel:
- `products`: Produk kopi (nama, harga, stok)
- `orders`: Pesanan (tanggal, total, metode pembayaran)
- `order_items`: Item dalam pesanan
- `receipts`: Struk pembelian (teks struk)

## Penggunaan

1. Pilih produk dan jumlah.
2. Klik "Tambah ke Keranjang".
3. Pilih metode pembayaran.
4. Klik "Checkout" untuk proses pesanan.
5. Struk akan terbuka di tab baru, bisa di-print.

## Print Struk

- Struk tersimpan di database sebagai teks.
- Bisa diakses via `/receipt/:id` untuk view HTML.
- Download PDF via `/receipt/pdf/:id`.