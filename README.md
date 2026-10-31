# 🎟️  Bilet Rezervasyon Sistemi (Ticket App)

Full-Stack  sinema koltuk seçimi ve bilet satın alma uygulaması. Kullanıcıların kayıt olup giriş yapabildiği, salon düzeni üzerinden anlık dolu/boş koltukları görüntüleyip koltuk seçebildiği ve ödeme adımıyla bilet satın alabildiği bir sistemdir.

## 🌐 Canlı Demo

**Canlı Uygulamaya Gitmek İçin:** [s](s)

> **Not:** Backend sunucusu Render.com da  olduğu için ilk açılışta  **30 - 40 saniye** sürebilir.

---

## 🚀 Özellikler

- **Kullanıcı Kimlik Doğrulama:** Kayıt olma (`Register`) ve giriş yapma (`Login`) işlemleri (`bcryptjs` ile şifre hash ile saklama).
- **İnteraktif Salon & Koltuk Seçimi:** Gerçek zamanlı salon düzeni üzerinden boş, dolu ve engelli koltukların görüntülenmesi.
- **Geçici Koltuk Kilitleme & Kuyruk (Go + Redis):** Bir kullanıcı koltuk seçip ödemeye geçtiğinde koltuklar Redis üzerinde 5 dakikalığına kilitlenir. Redis kapalıysa sistem otomatik olarak devam eder.
- **Kalıcı Sipariş Kaydı (Node.js + PostgreSQL):** Ödeme tamamlandığında koltuklar PostgreSQL veritabanına kaydedilir ve referans kodu üretilir.

---

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** React , TypeScript, Vite, React Router, Tailwind CSS
- **Backend:**  Express, TypeScript, PostgreSQL , `bcryptjs`
- **Mikroservis:** Go , Gin , Redis
- **DevOps:** Docker

---

## ⚙️ Ortam Değişkenleri (`.env`)

Projeyi başlatmadan önce `.env.example` dosyasındaki değişkenlere kendi değerlerinizi girip `.env.docker.local` (veya `.env`) olarak kaydedin, ardından projeyi başlatın.

---

## 🐳 Docker ile Çalıştırma (Önerilen)

Projeyi veritabanları (PostgreSQL ve Redis) dahil tek komutla ayağa kaldırmak için ana dizinde şu komutu çalıştırmanız yeterlidir:

```bash
docker-compose up --build
```

Konteynerler başladığında servisler aşağıdaki portlarda çalışır:
- **Frontend (React):** `http://localhost:5173`
- **Backend (Node.js API):** `http://localhost:5000`
- **Go & Redis Servisi:** `http://localhost:8080`
- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`



---

## 💻 Manuel (Yerel) Çalıştırma

Docker kullanmadan ayrı terminallerde çalıştırmak isterseniz:

```bash
# 1. Node.js Backend
cd ts/backend
npm install
npm run dev

# 2. Go Servisi (Opsiyonel - Redis yoksa otomatik bypass modunda çalışır)
cd go
go run main.go

# 3. React Frontend
cd ts/frontend
npm install
npm run dev
```

---

##  Bilgilendirme

> 🎨 **Not:** Bu projedeki CSS kodları ve arayüz  tasarımları yapay zeka desteği ile yazılmıştır.

