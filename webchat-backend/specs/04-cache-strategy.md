# 04 - Redis Cache Strategy

## Cache Architecture

**Type**: Cache-aside (lazy loading)

- Load on miss: DB → Cache → Return
- Update on write: Write to DB first, then cache
- Invalidate: TTL-based expiration

**Cache Key Format**:

```
user:username:{username}           -- Username-based lookup
```

## Cached User Object

```typescript
interface CachedUser {
  id: string;
  username_normalized: string;
  password_hash: string;
  cached_at: number;
}
```

**TTL**: 1 hour (3600s)

## Cache Write Path (Signup)

```
POST /auth/signup
  ↓
[Hash password]
  ↓
[Insert into DB → Get user.id]
  ↓
[Write to Cache]
  - Key: user:username:{normalized_username}
  - TTL: 3600s
  ↓
[Return JWT]
```

## Cache Read Path (Login)

```
POST /auth/login
  ↓
[Check Bloom]
  ├─ FALSE → return 401
  └─ TRUE → continue
  ↓
[Check Redis Cache]
  ├─ HIT
  │  └─ Verify bcrypt
  │
  └─ MISS
     ├─ Query DB
     ├─ Verify bcrypt
     ├─ Write to cache
```

## Implementation

Location: `src/redis/services/cache.service.ts`

```typescript
export class CacheService {
  private readonly TTL_USER = 3600; // 1 hour

  constructor(private redis: Redis) {}

  async getUser(username: string): Promise<any | null> {
    try {
      const key = `user:username:${username}`;
      const cached = await this.redis.getex(key, "EX", this.TTL_USER);

      if (!cached) return null;
      return JSON.parse(cached);
    } catch {
      return null; // Treat cache errors as misses
    }
  }

  async setUser(username: string, user: any): Promise<void> {
    try {
      const key = `user:username:${username}`;
      await this.redis.setex(key, this.TTL_USER, JSON.stringify(user));
    } catch (error) {
      console.error("Cache set failed:", error);
    }
  }

  async invalidateUser(username: string): Promise<void> {
    try {
      const key = `user:username:${username}`;
      await this.redis.del(key);
    } catch (error) {
      console.error("Cache invalidate failed:", error);
    }
  }
}
```

## Cache Hit Rate Targets

**Expected Performance**:

- Warm system (>1 hour runtime): 70-80% cache hit rate
- Peak hours: 60-75% hit rate

## Redis Memory Management

**Estimation**:

- Per cached user: ~500 bytes
- 10K concurrent users: ~5MB
- At 1M users: ~500MB for all caches

**Policy**: LRU eviction if memory limit exceeded

## Cache Invalidation Scenarios

**On Password Change**: Invalidate cache immediately

**On Delete**: Invalidate cache

**On Admin Operations**: Bulk invalidate as needed

## Performance Characteristics

- Cache hit: ~1-2ms (Redis + deserialization)
- Cache miss + DB: ~5-15ms (DB query) + ~1-2ms (cache write)
- Bcrypt verify: ~50-100ms (constant)
- Total auth latency: 50-150ms (bcrypt dominates)
