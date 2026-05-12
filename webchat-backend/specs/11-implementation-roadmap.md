# 11 - Implementation Roadmap, Risks & Checklists

## Implementation Order

### Phase 1: Foundation (Database & Entities)

1. Create User entity: `src/database/schemas/user.schema.ts`
2. Create migration: `src/database/migrations/1000-create-users-table.ts`
3. Register User schema in DatabaseModule

### Phase 2: Shared Services

4. Create UsernameService: `src/shared/services/username.service.ts`
5. Create PasswordService: `src/shared/services/password.service.ts`
6. Create JwtService: `src/shared/services/jwt.service.ts`
7. Create SharedModule with these providers

### Phase 3: Redis Services

8. Create CacheService: `src/redis/services/cache.service.ts`
9. Create BloomFilterService: `src/redis/services/bloom-filter.service.ts`
10. Export these services from RedisModule

### Phase 4: Auth Module (Core)

11. Create exception classes: `src/auth/exceptions/*.exception.ts`
12. Create DTOs: `src/auth/dtos/*.dto.ts`
13. Create AuthService: `src/auth/services/auth.service.ts`
14. Create AuthController: `src/auth/auth.controller.ts`
15. Create JWT/Auth Guards: `src/auth/guards/*.guard.ts`
16. Assemble AuthModule: `src/auth/auth.module.ts`

### Phase 5: User Module (Support)

17. Create UserService: `src/user/services/user.service.ts`
18. Assemble UserModule: `src/user/user.module.ts`

### Phase 6: Integration

19. Update app.module.ts to import all modules
20. Update main.ts with CORS and middleware

### Phase 7: Testing

21. Write unit tests for services
22. Write integration tests for auth flow
23. Write E2E tests

---

## Risk Assessment

### High Risk - MITIGATED

**1. Race Condition on Signup**

- Risk: Two concurrent signups with same username
- Mitigation: PostgreSQL unique index constraint
- Verification: Run concurrent signup load tests
- Status: ✅ Mitigated

**2. Bloom Filter Inconsistency**

- Risk: Bloom filter out of sync with DB
- Mitigation: Periodic rebuild + false positive DB fallback
- Verification: Monitor false positive rate <2%
- Status: ✅ Mitigated

**3. Bcrypt Performance**

- Risk: 100ms password verification feels slow
- Mitigation: Acceptable for security; cache reduces repeats
- Verification: Total latency <200ms with cache hits
- Status: ✅ Mitigated

### Medium Risk - ADDRESSED

**4. Redis Dependency**

- Risk: Redis down breaks login performance
- Mitigation: Cache advisory only; fallback to DB (slower)
- Verification: Test with Redis offline
- Status: ✅ Addressed

**5. JWT Token Expiration**

- Risk: No refresh mechanism (24h hard logout)
- Mitigation: Acceptable for MVP; refresh tokens future work
- Future: Implement refresh tokens
- Status: 🔜 Future

**6. SQL Injection**

- Risk: Raw SQL with unsanitized input
- Mitigation: Only use TypeORM parameterized queries
- Verification: Code review for raw SQL
- Status: ✅ Addressed

---

## Common Implementation Mistakes

| Mistake                     | Problem                                   | Solution                                        |
| --------------------------- | ----------------------------------------- | ----------------------------------------------- |
| **Trust Bloom filter**      | Treating false positives as authoritative | Always check DB on Bloom hit                    |
| **Skip normalization**      | "Alice" ≠ "alice" in DB                   | Normalize before ALL queries                    |
| **Cache password in plain** | Password exposed in Redis                 | Never cache plain password (only hash)          |
| **No rate limiting**        | Brute force attacks                       | Implement @nestjs/throttler                     |
| **SQL injection**           | Concatenate username into SQL             | Use TypeORM params only                         |
| **Weak JWT secret**         | Token forging                             | Require >32 chars, validate at startup          |
| **Timing leaks**            | Side-channel attacks                      | Accept Bloom fast path; bcrypt handles password |
| **Store plain passwords**   | Data breach nightmare                     | Never; always bcrypt                            |

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit + integration + e2e)
- [ ] Load tests completed, latency acceptable
- [ ] Code review completed
- [ ] Security scan passed (no SQL injection, weak crypto, etc.)
- [ ] Environment variables configured locally
  - [ ] JWT_SECRET (>32 chars)
  - [ ] BCRYPT_SALT (10-12)
  - [ ] DB credentials
  - [ ] Redis credentials
  - [ ] FRONTEND_URL for CORS

### Database Setup

- [ ] PostgreSQL available (SSL configured if prod)
- [ ] Migrations tested (create-users-table)
- [ ] Connection pool tuned (5-20 per instance)
- [ ] Backup strategy in place
- [ ] User table indexes created

### Redis Setup

- [ ] Redis available (with RedisBloom module)
- [ ] `redis-cli module list` confirms BF module loaded
- [ ] Persistence disabled (or configured)
- [ ] Clustering configured (if HA required)
- [ ] Memory limits set (maxmemory policy)

### API Setup

- [ ] HTTPS enforced (nginx reverse proxy)
- [ ] CORS configured (only frontend URL)
- [ ] Rate limiting active
- [ ] Logging configured
- [ ] Error tracking configured (Sentry, etc.)

### Deployment

- [ ] Docker image built and tested
- [ ] Environment secrets injected (not in .env file)
- [ ] Health check endpoint working (`GET /`)
- [ ] Graceful shutdown configured
- [ ] Monitoring/alerting set up

### Post-Deployment

- [ ] Smoke tests: Can signup/login?
- [ ] Metrics: Latencies at expected levels?
- [ ] Logs: Any errors or warnings?
- [ ] Rate limiting: Working as expected?
- [ ] Cache: Hit rate increasing?
- [ ] Bloom filter: False positives <2%?

---

## Load Testing Checklist

### Test 1: Invalid Username Login (Bloom Hot Path)

```
Scenario: 1000 concurrent users, non-existent username
Expected: <1ms latency, 0 DB queries
Success: Bloom filter rejects 99%+ of attempts
```

### Test 2: Valid Cached User (Warm Path)

```
Scenario: Signup 100, then 1000 concurrent logins
Expected: 50-100ms latency, ~70% cache hits
Success: Cache hit rate visible in metrics
```

### Test 3: Rate Limiting

```
Scenario: 100 users × 20 login attempts in 1 minute
Expected: First 10 succeed, rest get 429
Success: Rate limiter enforces per IP
```

### Test 4: Signup Stress

```
Scenario: 100 concurrent signups with unique usernames
Expected: All succeed, race handled correctly
Success: Unique constraint prevents duplicates
```

### Test 5: Redis Failover

```
Scenario: Kill Redis, retry logins
Expected: Fallback to DB, slower but functional
Success: No 500 errors, just latency increase
```

---

## Observability & Metrics Checklist

### Key Metrics

**Authentication**:

- `auth_signup_total` (success, conflict, error)
- `auth_login_total` (success, invalid, rate_limited)
- `auth_signup_duration_ms` (histogram)
- `auth_login_duration_ms` (histogram)

**Performance**:

- `bloom_filter_checks` (counter: yes/no)
- `cache_hits` (counter)
- `cache_misses` (counter)
- `db_queries` (counter)
- `bcrypt_duration_ms` (histogram)

**System Health**:

- `redis_connection_errors` (counter)
- `postgres_connection_errors` (counter)
- `rate_limit_exceeded` (counter)

### Alerting Thresholds

- `signup_error_rate > 5%` for 5 min
- `login_duration_p99 > 500ms`
- `rate_limit_hit_rate > 10%`
- `bloom_false_positive_rate > 5%`
- `redis_connection_errors > 0` in 5 min
- `bcrypt_duration_p99 > 150ms`

---

## Common Pitfalls During Implementation

1. **Not validating .env values at startup**
   - Solution: Check JWT_SECRET length in JwtService constructor

2. **Mixing async/await with fire-and-forget**
   - Solution: Use `.catch()` on non-critical async operations (Bloom add, last_login update)

3. **Caching too much data**
   - Solution: Only cache id, username_normalized, password_hash (not email, profile, etc.)

4. **Forgetting to handle Bloom cache miss**
   - Solution: Set TTL with getex() to extend expiration on hit

5. **Not testing with Redis offline**
   - Solution: Create integration test that kills Redis and validates fallback behavior

6. **Timing out database queries**
   - Solution: Add query timeout (e.g., 5 seconds) to prevent hanging requests

---

## Future Improvements Roadmap

**Phase 2: Refresh Tokens** (Month 2)

- Implement refresh token endpoint
- Store refresh tokens in Redis (revocable)
- Rotate on use

**Phase 3: Multi-Factor Auth** (Month 3)

- Email/SMS verification on signup
- TOTP authenticator
- Recovery codes

**Phase 4: OAuth** (Month 4)

- Google login
- GitHub login
- Discord login

**Phase 5: Session Management** (Month 5)

- JWT blacklist on logout
- Device tracking
- Concurrent session limits

**Phase 6: Advanced Security** (Month 6)

- Replace bcrypt with Argon2
- Hardware security key support
- Geolocation-based anomaly detection

---

## Scaling Considerations

### Horizontal Scaling (Add More Servers)

- Stateless API servers ✓
- Shared PostgreSQL (connection pooling)
- Shared Redis (cluster for HA)
- Bloom filter eventually consistent across instances

### Vertical Scaling (Increase Resources)

- CPU: Bcrypt verification is CPU-bound (~2x speedup max)
- Memory: Cache more users in Redis (diminishing returns)
- Disk: Monitor DB query latency, add indexes as needed

### Database Optimization

- Username index covers all auth queries
- Partial indexes reduce scan size
- Connection pool: 5-20 per instance

### Redis Optimization

- Bloom: 1.2MB per 1M users, no degradation
- Cache: 500B per cached user, 70-80% hit rate typical
- TTL: 1 hour (tune based on metrics)

---

## Security Hardening Checklist

- [ ] JWT_SECRET ≥ 32 characters
- [ ] BCRYPT_SALT 10-12 rounds
- [ ] HTTPS enforced in production
- [ ] CORS limited to frontend URL only
- [ ] Rate limiting active
- [ ] No raw SQL queries (TypeORM params only)
- [ ] Passwords never logged
- [ ] Tokens never logged
- [ ] Errors don't leak sensitive info (e.g., "user not found" vs "password wrong")

---

## Estimated Implementation Time

- Phase 1 (Database): 2-4 hours
- Phase 2 (Shared): 3-5 hours
- Phase 3 (Redis): 2-4 hours
- Phase 4 (Auth): 4-6 hours
- Phase 5 (User): 1-2 hours
- Phase 6 (Integration): 1-2 hours
- Phase 7 (Testing): 4-6 hours

**Total**: 17-29 hours for one engineer
