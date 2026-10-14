import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool, initDb } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Veritabanını başlat
initDb();

// ----------------------------------------------------
// KAYIT OL (REGISTER) ENDPOINT
// ----------------------------------------------------
app.post("/api/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email ve şifre zorunludur." });
    return;
  }

  try {
    // 1. Kullanıcı zaten var mı kontrol et
    const userExist = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExist.rows.length > 0) {
      res.status(400).json({ error: "Bu email adresi zaten kayıtlı." });
      return;
    }

    // 2. Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Kullanıcıyı PostgreSQL'e kaydet
    const newUser = await pool.query(
      "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
      [email, hashedPassword, name || null]
    );

    res.status(201).json({
      message: "Kayıt başarıyla tamamlandı!",
      user: newUser.rows[0],
    });
  } catch (err) {
    console.error("Kayıt hatası:", err);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ----------------------------------------------------
// GİRİŞ YAP (LOGIN) ENDPOINT
// ----------------------------------------------------
app.post("/api/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email ve şifre girilmelidir." });
    return;
  }

  try {
    // 1. Kullanıcıyı veritabanında ara
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });
      return;
    }

    const user = result.rows[0];

    // 2. Şifreyi doğrula
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });
      return;
    }

    // 3. Başarılı yanıt dön (İsteğe göre JWT token eklenebilir)
    res.json({
      message: "Giriş başarılı!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("Giriş hatası:", err);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// Sunucuyu Başlat
app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu çalışıyor: http://localhost:${PORT}`);
});
