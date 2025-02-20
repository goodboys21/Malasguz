const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔗 Setup Database (PostgreSQL Neon.tech)
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_ceX6ROk3izuI@ep-plain-recipe-a8068fa1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

// Cek koneksi ke database
pool.connect()
    .then(() => console.log("✅ Connected to Neon.tech"))
    .catch(err => console.error("❌ Connection error:", err));

// Buat tabel jika belum ada
pool.query(`
    CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        url TEXT NOT NULL
    )
`);

// 📂 Setup Storage
const upload = multer({
    dest: "public/uploads/",
    limits: { fileSize: 100 * 1024 * 1024 } // Max 100MB
});

// 🔔 Konfigurasi Telegram
const TELEGRAM_BOT_TOKEN = "7588173239:AAFIFwsZ8TbGGFQ1L7L0siJJW0LK-KExNr8";  // Ganti dengan token bot
const TELEGRAM_CHAT_ID = "7081489041"; // Ganti dengan ID pemilik web

// 📨 Fungsi kirim notifikasi Telegram
async function sendTelegramNotification(fileUrl, filename, count) {
    const caption = `⛈️Uploader Baru Icibos ⛈️
    
🔗 Result: ${fileUrl}
📁 Urutan: ${count}

from : cdn.baguss.web.id`;

    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHAT_ID);
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");
    formData.append("document", fs.createReadStream(`public/uploads/${filename}`));

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, formData, {
        headers: { ...formData.getHeaders() }
    }).catch(err => console.error("❌ Gagal kirim Telegram:", err));
}

// 🌍 Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));

// 🏠 Halaman utama
app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM files ORDER BY id DESC");
        res.render("index", { files: result.rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

// 📤 Upload file
app.post("/upload", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send("❌ File tidak ditemukan!");

    const fileUrl = `https://cdn-bagus.vercel.app/uploads/${file.filename}`;

    try {
        await pool.query("INSERT INTO files (filename, url) VALUES ($1, $2)", [file.filename, fileUrl]);

        const countResult = await pool.query("SELECT COUNT(*) as count FROM files");
        const fileCount = countResult.rows[0].count;

        await sendTelegramNotification(fileUrl, file.filename, fileCount);
        res.redirect("/");
    } catch (err) {
        res.status(500).send(err);
    }
});

// 🚀 Jalankan server
app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));
