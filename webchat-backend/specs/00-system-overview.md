# 00 - System Architecture Overview

## Architecture Diagram

```
User Login Request
  ↓
[NestJS Auth Controller]
  ↓ (normalize username)
  ├─→ [Redis Bloom Filter] → "definitely not exists" → reject (NO DB)
  │
  └─→ [Redis Cache] → "found" → validate password (NO DB)
       OR
       [PostgreSQL] → unique index lookup (fast) → validate password
  ↓
[JWT Token Response]
```

## Signup Flow

```
Signup Request (username, password)
  ↓
[Validate DTO] → username format, password strength
  ↓
[Normalize Username] → lowercase, trim, deduplicate spaces
  ↓
[Check Bloom Filter] → "maybe exists?" → check DB
  ↓
[INSERT INTO users] → unique index constraint
  ├─ SUCCESS → Add to Bloom, cache user, return JWT
  └─ DUPLICATE KEY ERROR → Catch, return 409 Conflict
```

## Login Flow

```
Login Request (username, password)
  ↓
[Normalize Username]
  ↓
[Bloom Filter Check]
  ├─ FALSE (definitely not in DB)
  │  └─ Return 401 Unauthorized (NO DB query)
  │
  └─ POSSIBLY exists
     ├─ [Redis Cache Check]
     │  ├─ HIT → Verify bcrypt password
     │  └─ MISS → Query DB (on cache miss)
     │
     └─ [PostgreSQL Lookup]
        ├─ FOUND → Cache it, verify password
        └─ NOT FOUND → Check Bloom false positive, update Bloom if needed
```

## Consistency Guarantees

**During Signup**:

- PostgreSQL unique index on `username_normalized` prevents races
- Bloom filter is eventually consistent (rebuilt periodically)
- Cache invalidation is immediate (write-through on signup)

**During Login**:

- Redis cache is advisory only (stale is safe)
- Bloom false positives are handled via DB fallback
- Password verification always from source (DB or cache)

## Key Optimizations

**Hot Path (invalid username login)**:

- Bloom Filter: O(1) lookups, <1ms latency
- If not in Bloom → return 401 immediately (zero DB queries)
- Typical: 99%+ of invalid logins hit Bloom

**Warm Path (valid cached user)**:

- Redis cache hit → O(1), ~1-2ms
- Bcrypt verify in-process → ~50-100ms total

**Cold Path (cache miss)**:

- PostgreSQL index-only scan → ~5-15ms
- Bcrypt verify + cache write → ~50-150ms total

## Horizontal Scalability

- Stateless API servers (no session store)
- PostgreSQL connection pool: 5-20 per instance
- Redis is single-threaded (cluster mode for HA)
- Bloom filter rebuilt in background (all replicas eventually consistent)

## Module Boundaries

```
[Auth Module]
  ├─ auth.service (signup/login logic)
  ├─ auth.controller (HTTP routes)
  ├─ jwt.service (token generation)
  ├─ auth-exception.filter
  ├─ dtos/ (SignupRequest, LoginRequest, AuthResponse)
  └─ guards/ (AuthGuard, OptionalAuthGuard)

[Shared Services]
  ├─ user.service (user queries, not exposed to HTTP)
  ├─ redis.service (cache, Bloom wrapper)
  ├─ password.service (bcrypt hashing/verify)
  └─ username.service (normalization)

[Database Module] (existing)
  └─ User entity + index strategy
```

## Key Principles

- Bloom filter is optimization only, never authoritative
- PostgreSQL unique index guarantees correctness
- Bloom false positives handled correctly via DB fallback
- Username normalization is deterministic (application layer)
- Strong consistency during signup via DB constraints
