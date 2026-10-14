package main

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func RateLimiterMiddleware(rdb *redis.Client, limit int64, window time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
       ip := c.ClientIP()
       key := fmt.Sprintf("rate_limit:%s", ip)
       now:=time.Now().UnixNano()
	   windowStart :=now- window.Nanoseconds()
	   

	   pipe:=rdb.Pipeline()
	   pipe.ZRemRangeByScore(c,key,"0",strconv.FormatInt(windowStart,10))
	   pipe.ZAdd(c,key,redis.Z{Score:float64(now),Member:now})
	   countCmd:=pipe.ZCard(c,key)
	   pipe.Expire(c,key,window)

	   _,err:=pipe.Exec(c)
	   if err != nil {
            c.AbortWithStatusJSON(500, gin.H{"error": "Rate limit hatası"})
            return
        }

        if countCmd.Val() > limit {
            c.AbortWithStatusJSON(429, gin.H{"error": "Çok fazla istek, lütfen bekleyin"})
            return
        }
        c.Next()

    }
}


func EnterQueue(ctx context.Context, rdb *redis.Client, eventID, userID string) error {
    key := fmt.Sprintf("bekleme:%s", eventID)
    now := float64(time.Now().UnixMilli())
    // ZADD bekleme:{event_id} {timestamp} {user_id}
    return rdb.ZAdd(ctx, key, redis.Z{Score: now, Member: userID}).Err()
}

func GetQueuePosition(ctx context.Context, rdb *redis.Client, eventID, userID string) (int64, error) {
    key := fmt.Sprintf("bekleme:%s", eventID)
    // ZRANK sıfır tabanlıdır (0 = 1. sırada)
    rank, err := rdb.ZRank(ctx, key, userID).Result()
    if err == redis.Nil {
        return -1, fmt.Errorf("kullanıcı sırada değil")
    }
    return rank + 1, err // 1-tabanlı kullanıcı dostu sıra no
}

func LockSeat(ctx context.Context, rdb *redis.Client, eventID, seatID, userID string) (bool, error) {
    key := fmt.Sprintf("koltuk:%s:%s", eventID, seatID)
    ttl := 5 * time.Minute

    // SET key value NX EX 300
    // SetNX başarıyla kilitlerse true, koltuk zaten kilitliyse false döner
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