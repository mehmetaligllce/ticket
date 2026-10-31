import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool, initDb } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

initDb();

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ----------------------------------------------------
// REGISTER ENDPOINT
// ----------------------------------------------------
app.post("/api/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email ve şifre zorunludur." });
    return;
  }

  try {
    const userExist = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExist.rows.length > 0) {
      res.status(400).json({ error: "Bu email adresi zaten kayıtlı." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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
// LOGIN ENDPOINT
// ----------------------------------------------------
app.post("/api/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email ve şifre girilmelidir." });
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });
      return;
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Kullanıcı bulunamadı veya şifre hatalı." });
      return;
    }

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

app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu çalışıyor: http://localhost:${PORT}`);
});




// ----------------------------------------------------
// ORDERS ENDPOINT
// ----------------------------------------------------
app.post("/api/checkout", async (req: Request, res: Response) => {
  const { seats } = req.body;

  if (!seats) {
    res.status(400).json({ error: "Koltuk seçilmedi." });
    return;
  }

  try {

    const successOrders=[]
    for(const seat of seats){
      const isAlreadyTaken=await pool.query("SELECT 1 FROM orders WHERE seat=$1 ",[seat]);
      if(isAlreadyTaken.rows.length>0){
        res.status(400).json({error:"Bu koltuk zaten alınmış!"})
        return;
      }
      const newOrder=await pool.query("INSERT INTO orders (user_id,seat) VALUES ($1,$2) RETURNING id,user_id,seat,created_at",[req.body.user_id,seat || null])
      successOrders.push(newOrder.rows[0])
    }
   

    const generatedOrderNo = "TKT-" + Math.floor(100000 + Math.random() * 900000);

    res.status(201).json({
      message: "Sipariş başarılı!",
      orderNumber: generatedOrderNo,
      order: successOrders,
    });
  } catch (err) {
    console.error("Sipariş hatası:", err);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

app.get("/api/order/:seatId", async(req: Request, res: Response)=> {

  const seatId= req.params.seatId;
  const isTaken= await pool.query("SELECT * FROM orders WHERE seat=$1",[seatId])
  if(isTaken.rows.length>0){
    res.status(400).json({error:"Bu koltuk zaten alınmıştır",taken:true})
  }
  else{
    res.status(200).json({message:"Bu koltuk boştur",taken:false});
  }

})


app.get("/api/orders", async(req: Request, res: Response)=> {
  const allOrders=await pool.query("SELECT seat FROM orders ")
  res.status(200).json(allOrders.rows)

})
