# 03 - Redis Bloom Filter Integration

## Bloom Filter Strategy

**Purpose**: O(1) probabilistic set membership test for usernames

- Question: "Is this username possibly in the database?"
- Answer: "Definitely not" OR "Probably yes"
- False positive rate: 1-2% acceptable (DB fallback handles it)
- False negative rate: 0% (never miss a user)

## Redis Bloom Filter Keys

**Configuration**:

```
BLOOM_KEY = "auth:usernames:bloom"
BLOOM_REBUILD_KEY = "auth:usernames:bloom:rebuild"
BLOOM_INIT_SIZE = 1_000_000
BLOOM_ERROR_RATE = 0.01  -- 1% error rate
```

**Memory Estimate**: For 1M elements at 1% error rate ≈ 1.2MB

## Implementation

Location: `src/redis/services/bloom-filter.service.ts`

```typescript
export class BloomFilterService {
  constructor(private redis: Redis) {}

  /**
   * Check if username is in Bloom filter
   * Returns false = "definitely not in DB"
   * Returns true = "probably in DB, check further"
   */
  async mightExist(username: string): Promise<boolean> {
    try {
      const result = await this.redis.call(
        "BF.EXISTS",
        "auth:usernames:bloom",
        username,
      );
      return result === 1;
    } catch (error) {
      // If Bloom check fails, assume it exists (safe fallback to DB)
      return true;
    }
  }

  /**
   * Add username to Bloom filter (on successful signup)
   */
  async add(username: string): Promise<void> {
    try {
      await this.redis.call("BF.ADD", "auth:usernames:bloom", username);
    } catch (error) {
      // Bloom add failure is non-blocking (log but don't fail signup)
      console.error("Bloom filter add failed:", error);
    }
  }

  /**
   * Clear and rebuild from database
   * Called periodically or on deployment
   */
  async rebuild(usernames: string[]): Promise<void> {
    const lockKey = "auth:usernames:bloom:rebuild-lock";
    const acquired = await this.redis.set(lockKey, "1", "EX", 300, "NX");

    if (!acquired) return; // Rebuild in progress

    try {
      await this.redis.del("auth:usernames:bloom");

      for (const username of usernames) {
        await this.redis.call("BF.ADD", "auth:usernames:bloom", username);
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Get Bloom filter info for monitoring
   */
  async getInfo(): Promise<any> {
    try {
      return await this.redis.call("BF.INFO", "auth:usernames:bloom");
    } catch (error) {
      return null;
    }
  }
}
```

## Signup Bloom Flow

```
User signs up with username "johndoe"
  ↓
[Normalize] → "johndoe"
  ↓
[Insert into DB]
  ├─ SUCCESS
  │  └─ Add "johndoe" to Bloom filter [IMMEDIATE]
  │
  └─ UNIQUE CONSTRAINT ERROR
     └─ Username already exists
```

## Login Bloom Flow

```
User logs in with username "johndoe"
  ↓
[Normalize] → "johndoe"
  ↓
[Check Bloom Filter]
  ├─ FALSE (definitely not)
  │  └─ Return 401 immediately [ZERO DB QUERIES]
  │
  └─ TRUE (maybe exists)
     ├─ Check Redis cache
     ├─ If miss → Query DB
     ├─ Verify bcrypt password
```

## Bloom Filter Maintenance

**On Startup**:

- Check if Bloom filter exists
- If not, trigger rebuild from DB (async)

**Periodic Rebuild**: Every 24 hours (rebuilds from current DB state)

**False Positive Handling**: Handled by DB fallback check

## Redis Key Strategies

```
auth:usernames:bloom              -- Main filter
auth:usernames:bloom:rebuild-lock -- Prevents concurrent rebuilds
```

**Expiration**: None (Bloom is permanent until rebuild)
