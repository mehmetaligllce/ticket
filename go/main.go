package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// Dışarıdan gelecek JSON verileri için struct'lar
type LockRequest struct {
	UserID  string `json:"userID" binding:"required"`
	Seat    string `json:"seat" binding:"required"`
	EventID string `json:"eventID"`
}

type ReleaseRequest struct {
	UserID  string `json:"userID" binding:"required"`
	Seat    string `json:"seat" binding:"required"`
	EventID string `json:"eventID"`
}

type QueueRequest struct {
	UserID  string `json:"userID" binding:"required"`
	EventID string `json:"eventID"`
}

// Redis'in o an ayakta olup olmadığını tutan thread-safe bayrak
var redisAvailable atomic.Bool

func checkRedisHealth(rdb *redis.Client) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()
	err := rdb.Ping(ctx).Err()
	alive := (err == nil)
	redisAvailable.Store(alive)
	return alive
}

// CORS Middleware
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		c.Next()
	}
}

func main() {
	// 1. Redis istemcisini başlat (REDIS_URL veya REDIS_ADDR veya varsayılan localhost:6379)
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	var rdb *redis.Client
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		if opt, err := redis.ParseURL(redisURL); err == nil {
			rdb = redis.NewClient(opt)
			redisAddr = opt.Addr
		}
	}
	if rdb == nil {
		rdb = redis.NewClient(&redis.Options{
			Addr: redisAddr,
		})
	}

	// İlk bağlantı kontrolü
	if checkRedisHealth(rdb) {
		fmt.Printf("✅ Redis bağlantısı başarılı (%s)!\n", redisAddr)
	} else {
		fmt.Printf("⚠️  Redis'e bağlanılamadı (%s)! Sistem 'Bypass / Boşver' modunda çalışıyor.\n", redisAddr)
		fmt.Println("ℹ️  Koltuk seçimi ve ödeme akışı kesintisiz devam edecek (Redis atlanacak).")
	}

	// Arka planda her 5 saniyede bir Redis bağlantısını sessizce kontrol et
	go func() {
		for {
			time.Sleep(5 * time.Second)
			checkRedisHealth(rdb)
		}
	}()

	r := gin.Default()

	r.Use(CORSMiddleware())
	r.Use(RateLimiterMiddleware(rdb, 120, time.Minute))

	// ----------------------------------------------------
	// 1. POST: Koltuğu 5 dakikalığına kilitle
	// ----------------------------------------------------
	r.POST("/api/seats/lock", func(c *gin.Context) {
		var req LockRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz parametreler: userID ve seat zorunludur."})
			return
		}

		eventID := req.EventID
		if eventID == "" {
			eventID = "1"
		}

		// Redis kapalıysa boşver ve işlemi onayla
		if !redisAvailable.Load() {
			c.JSON(http.StatusOK, gin.H{
				"success":  true,
				"fallback": true,
				"message":  fmt.Sprintf("%s koltuğu için kilit atlandı (Redis kapalı).", req.Seat),
				"seat":     req.Seat,
				"userID":   req.UserID,
			})
			return
		}

		success, err := LockSeat(c.Request.Context(), rdb, eventID, req.Seat, req.UserID)
		if err != nil {
			// Anlık bağlantı koptuysa sistemi çökertme, fallback yap
			redisAvailable.Store(false)
			c.JSON(http.StatusOK, gin.H{
				"success":  true,
				"fallback": true,
				"message":  "Redis bağlantı hatası, kilit kontrolü atlandı.",
				"seat":     req.Seat,
			})
			return
		}

		if !success {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Bu koltuk şu anda başka bir kullanıcı tarafından seçilmiş/kilitli.",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": fmt.Sprintf("%s koltuğu 5 dakikalığına kilitlendi.", req.Seat),
			"seat":    req.Seat,
			"userID":  req.UserID,
		})
	})

	// ----------------------------------------------------
	// 2. POST: Koltuk kilidini iptal et / serbest bırak
	// ----------------------------------------------------
	r.POST("/api/seats/release", func(c *gin.Context) {
		var req ReleaseRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz parametreler: userID ve seat zorunludur."})
			return
		}

		eventID := req.EventID
		if eventID == "" {
			eventID = "1"
		}

		if !redisAvailable.Load() {
			c.JSON(http.StatusOK, gin.H{"success": true, "fallback": true})
			return
		}

		_ = ReleaseSeatLock(c.Request.Context(), rdb, eventID, req.Seat, req.UserID)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": fmt.Sprintf("%s koltuğunun kilidi kaldırıldı.", req.Seat),
		})
	})

	// ----------------------------------------------------
	// 3. GET: Şu an kilitli olan tüm koltukları listele
	// ----------------------------------------------------
	r.GET("/api/seats/locked", func(c *gin.Context) {
		eventID := c.DefaultQuery("eventID", "1")

		// Redis kapalıysa boş liste dön, hata fırlatma
		if !redisAvailable.Load() {
			c.JSON(http.StatusOK, gin.H{
				"eventID":     eventID,
				"lockedSeats": []string{},
				"fallback":    true,
			})
			return
		}

		pattern := fmt.Sprintf("koltuk:%s:*", eventID)
		keys, err := rdb.Keys(c.Request.Context(), pattern).Result()
		if err != nil {
			redisAvailable.Store(false)
			c.JSON(http.StatusOK, gin.H{
				"eventID":     eventID,
				"lockedSeats": []string{},
				"fallback":    true,
			})
			return
		}

		prefix := fmt.Sprintf("koltuk:%s:", eventID)
		lockedSeats := make([]string, 0, len(keys))
		for _, key := range keys {
			seat := strings.TrimPrefix(key, prefix)
			lockedSeats = append(lockedSeats, seat)
		}

		c.JSON(http.StatusOK, gin.H{
			"eventID":     eventID,
			"lockedSeats": lockedSeats,
		})
	})

	// ----------------------------------------------------
	// 4. POST: Sanal kuyruğa / bekleme sırasına gir
	// ----------------------------------------------------
	r.POST("/api/queue/enter", func(c *gin.Context) {
		var req QueueRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID zorunludur."})
			return
		}

		eventID := req.EventID
		if eventID == "" {
			eventID = "1"
		}

		if !redisAvailable.Load() {
			c.JSON(http.StatusOK, gin.H{
				"message":  "Sıra sistemi devre dışı, doğrudan geçebilirsiniz",
				"userID":   req.UserID,
				"position": 1,
				"fallback": true,
			})
			return
		}

		err := EnterQueue(c.Request.Context(), rdb, eventID, req.UserID)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"message":  "Doğrudan geçebilirsiniz",
				"userID":   req.UserID,
				"position": 1,
				"fallback": true,
			})
			return
		}

		pos, _ := GetQueuePosition(c.Request.Context(), rdb, eventID, req.UserID)
		c.JSON(http.StatusOK, gin.H{
			"message":  "Sıraya başarıyla girildi",
			"userID":   req.UserID,
			"position": pos,
		})
	})

	// ----------------------------------------------------
	// 5. GET: Kullanıcının kuyruktaki anlık sırasını öğren
	// ----------------------------------------------------
	r.GET("/api/queue/position", func(c *gin.Context) {
		eventID := c.DefaultQuery("eventID", "1")
		userID := c.Query("userID")

		if userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID parametresi zorunludur"})
			return
		}

		if !redisAvailable.Load() {
			c.JSON(http.StatusOK, gin.H{
				"inQueue":  false,
				"userID":   userID,
				"position": 1,
				"fallback": true,
			})
			return
		}

		pos, err := GetQueuePosition(c.Request.Context(), rdb, eventID, userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"inQueue": false,
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"inQueue":  true,
			"userID":   userID,
			"position": pos,
		})
	})

	goPort := os.Getenv("PORT")
	if goPort == "" {
		goPort = "8080"
	}

	fmt.Printf("🚀 Go Microservice çalışıyor: http://localhost:%s\n", goPort)
	if err := r.Run(":" + goPort); err != nil {
		fmt.Printf("Sunucu başlatma hatası: %v\n", err)
	}
}

// ----------------------------------------------------
// REDİS YARDIMCI FONKSİYONLARI & RATE LIMITER
// ----------------------------------------------------

func RateLimiterMiddleware(rdb *redis.Client, limit int64, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Redis kapalıysa rate limiter'ı atla (kullanıcıyı engelleme)
		if !redisAvailable.Load() {
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", ip)
		now := time.Now().UnixNano()
		windowStart := now - window.Nanoseconds()

		pipe := rdb.Pipeline()
		pipe.ZRemRangeByScore(c.Request.Context(), key, "0", strconv.FormatInt(windowStart, 10))
		pipe.ZAdd(c.Request.Context(), key, redis.Z{Score: float64(now), Member: now})
		countCmd := pipe.ZCard(c.Request.Context(), key)
		pipe.Expire(c.Request.Context(), key, window)

		_, err := pipe.Exec(c.Request.Context())
		if err != nil {
			// Redis bağlantı hatasında kullanıcıyı 500 ile engellemek yerine akışa devam ettir
			redisAvailable.Store(false)
			c.Next()
			return
		}

		if countCmd.Val() > limit {
			c.AbortWithStatusJSON(429, gin.H{"error": "Çok fazla istek, lütfen biraz bekleyin."})
			return
		}
		c.Next()
	}
}

func EnterQueue(ctx context.Context, rdb *redis.Client, eventID, userID string) error {
	key := fmt.Sprintf("bekleme:%s", eventID)
	now := float64(time.Now().UnixMilli())
	return rdb.ZAdd(ctx, key, redis.Z{Score: now, Member: userID}).Err()
}

func GetQueuePosition(ctx context.Context, rdb *redis.Client, eventID, userID string) (int64, error) {
	key := fmt.Sprintf("bekleme:%s", eventID)
	rank, err := rdb.ZRank(ctx, key, userID).Result()
	if err == redis.Nil {
		return -1, fmt.Errorf("kullanıcı sırada değil")
	}
	return rank + 1, err
}

func LockSeat(ctx context.Context, rdb *redis.Client, eventID, seatID, userID string) (bool, error) {
	key := fmt.Sprintf("koltuk:%s:%s", eventID, seatID)
	ttl := 5 * time.Minute
	success, err := rdb.SetNX(ctx, key, userID, ttl).Result()
	if err != nil {
		return false, err
	}
	return success, nil
}

func ReleaseSeatLock(ctx context.Context, rdb *redis.Client, eventID, seatID, userID string) error {
	key := fmt.Sprintf("koltuk:%s:%s", eventID, seatID)
	res, err := releaseLockScript.Run(ctx, rdb, []string{key}, userID).Int()
	if err != nil {
		return err
	}
	if res == 0 {
		return fmt.Errorf("kilit süresi dolmuş veya koltuk artık bu kullanıcıya ait değil")
	}
	return nil
}

var releaseLockScript = redis.NewScript(`
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
`)
