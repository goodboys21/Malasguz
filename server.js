const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Database
const db = new sqlite3.Database("./database/db.sqlite", (err) => {
    if (err) console.error(err);
    db.run(`CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, filename TEXT, url TEXT)`);
});

// Setup Storage
const upload = multer({
    dest: "public/uploads/",
    limits: { fileSize: 100 * 1024 * 1024 }, // Max 100MB
});

// Konfigurasi Telegram
const TELEGRAM_BOT_TOKEN = "7588173239:AAFIFwsZ8TbGGFQ1L7L0siJJW0LK-KExNr8";  // Ganti dengan token bot
const TELEGRAM_CHAT_ID = "7081489041"; // Ganti dengan ID pemilik web

// Fungsi kirim notifikasi Telegram
async function sendTelegramNotification(fileUrl, filename, count) {
    const caption = `⛈️Uploader  Baru Icibos ⛈️
    
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
    }).catch(err => console.error("Gagal kirim Telegram:", err));
}

// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));

// Halaman utama
app.get("/", (req, res) => {
    db.all("SELECT * FROM files ORDER BY id DESC", (err, files) => {
        if (err) return res.status(500).send(err);
        res.render("index", { files });
    });
});

// Upload file
app.post("/upload", upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send("File tidak ditemukan!");

    const fileUrl = `https://cdn-bagus.vercel.app/uploads/${file.filename}`;

    db.run("INSERT INTO files (filename, url) VALUES (?, ?)", [file.filename, fileUrl], function(err) {
        if (err) return res.status(500).send(err);

        db.get("SELECT COUNT(*) as count FROM files", async (err, row) => {
            if (err) return console.error("Gagal hitung file:", err);

            const fileCount = row.count;
            await sendTelegramNotification(fileUrl, file.filename, fileCount);
            res.redirect("/");
        });
    });
});

// Jalankan server
app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));