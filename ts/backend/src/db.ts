import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// .env dosyasındaki DATABASE_URL veya tekil bağlantı bilgilerini kullanır
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "ticket_db",
      }
);

// Tabloları otomatik oluşturan başlatıcı fonksiyon
export const initDb = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(createUsersTableQuery);
    console.log('✅ PostgreSQL "users" tablosu hazır!');
  } catch (error) {
    console.error('❌ PostgreSQL bağlantı hatası:', error);
  }
};
