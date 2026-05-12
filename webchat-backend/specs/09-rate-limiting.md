# 09 - Rate Limiting & Throttling

## Rate Limiting Strategy

**Tool**: @nestjs/throttler
**Storage**: Redis (distributed)
**Algorithm**: Token bucket

## Configuration

Location: `src/auth/auth.module.ts`

```typescript
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "signup",
        ttl: 3600000, // 1 hour
        limit: 10, // 10 signups per IP
      },
      {
        name: "login",
        ttl: 60000, // 1 minute
        limit: 10, // 10 attempts per minute
      },
      {
        name: "username-check",
        ttl: 60000, // 1 minute
        limit: 20, // 20 checks per minute
      },
    ]),
  ],
})
export class AuthModule {}
```

## Rate Limit Rules

### Signup

- **Limit**: 10 per hour per IP
- **TTL**: 1 hour
- **Rationale**: Prevent account creation spam
- **Key**: `throttle:signup:{ip}`

### Login

- **Limit**: 10 per minute per IP
- **TTL**: 1 minute
- **Rationale**: Brute force protection
- **Key**: `throttle:login:{ip}`

### Username Availability Check

- **Limit**: 20 per minute per IP
- **TTL**: 1 minute
- **Rationale**: Prevent username enumeration
- **Key**: `throttle:username-check:{ip}`

## Decorator Application

```typescript
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post('signup')
  @Throttle('signup')
  async signup(@Body() dto: SignupRequestDto) { ... }

  @Post('login')
  @Throttle('login')
  async login(@Body() dto: LoginRequestDto) { ... }

  @Get('username-availability')
  @Throttle('username-check')
  async checkUsername(@Query('username') username: string) { ... }
}
```

## Response When Throttled

**Status**: 429 Too Many Requests

**Headers**:

```
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1715492460
```

**Body**:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

## IP Detection

**Trusted Proxies** (from nginx):

```typescript
// In main.ts
app.set("trust proxy", 1);
```

**In nginx**:

```nginx
location /api {
  proxy_pass http://backend:3000;
  proxy_set_header X-Forwarded-For $remote_addr;
}
```

---

## Distributed Rate Limiting

All instances share same Redis:

- Throttle keys stored in Redis
- Each request increments counter atomically
- TTL-based expiration

---

## Performance Impact

**Redis Operation**: O(1) per request

- Increment counter: ~1ms
- Check limit: <1ms
- **Total overhead**: <2ms per request

---

## Testing Rate Limiting

```typescript
describe("Login Rate Limiting", () => {
  it("should allow 10 login attempts per minute", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: "test", password: "wrong" })
        .expect(401);
    }

    // 11th attempt should be throttled
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "test", password: "wrong" })
      .expect(429);
  });
});
```

---

## Monitoring

```
Metrics:
- rate_limit_exceeded (counter by endpoint)
- rate_limit_hit_rate (gauge: hits / total)

Alerts:
- rate_limit_hit_rate > 10% (possible attack)
- signup_rate_limit_exceeded > 50 in 5 min
- login_rate_limit_exceeded > 100 in 5 min
```

---

## Future Enhancements

- Exponential backoff: Increase TTL as failures increase
- User-based limits: Limit per username (account takeover protection)
- Geographic limits: Different limits by region
- ML-based detection: Anomalous patterns
