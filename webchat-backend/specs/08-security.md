# 08 - Security Architecture

## JWT Token Generation & Validation

Location: `src/shared/services/jwt.service.ts`

Using `jose` library (not @nestjs/jwt):

```typescript
import { SignJWT, jwtVerify } from "jose";

@Injectable()
export class JwtService {
  private readonly secret: Uint8Array;
  private readonly algorithm = "HS256";
  private readonly ttl = "24h";

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get("JWT_SECRET");
    if (!secretKey || secretKey.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters");
    }
    this.secret = new TextEncoder().encode(secretKey);
  }

  async sign(payload: { sub: string; username: string }): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setExpirationTime(this.ttl)
      .sign(this.secret);
  }

  async verify(token: string): Promise<any> {
    try {
      const verified = await jwtVerify(token, this.secret);
      return verified.payload;
    } catch (error) {
      throw new InvalidTokenException("Invalid or expired token");
    }
  }
}
```

**Security**:

- HS256: HMAC with SHA-256
- Secret validation: >32 characters at startup
- No token refresh (24h expiry, re-login required)

---

## Auth Guards

**JwtAuthGuard** (`src/auth/guards/jwt-auth.guard.ts`):

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization header");
    }

    const token = authHeader.substring(7);
    try {
      const payload = await this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
```

**Usage**:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getCurrentUser(@Request() req) {
  return req.user;
}
```

---

## Optional JWT Guard

**OptionalJwtAuthGuard** (`src/auth/guards/optional-jwt-auth.guard.ts`):

```typescript
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      request.user = null;
      return true;
    }

    const token = authHeader.substring(7);
    try {
      const payload = await this.jwtService.verify(token);
      request.user = payload;
    } catch {
      request.user = null;
    }

    return true;
  }
}
```

---

## Password Hashing

Location: `src/shared/services/password.service.ts`

```typescript
import * as bcrypt from "bcrypt";

@Injectable()
export class PasswordService {
  constructor(private configService: ConfigService) {}

  async hash(password: string): Promise<string> {
    const saltRounds = this.configService.get("BCRYPT_SALT") || 10;
    return bcrypt.hash(password, saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

**Security**:

- Bcrypt: adaptive hashing, resistant to rainbow tables
- Salt rounds: 10 (from .env, ~100ms per verify)
- Never store plain passwords

---

## HTTPS & Transport

**Environment**:

- Production: HTTPS enforced (nginx)
- Staging: HTTPS required
- Development: HTTP allowed

**CORS Configuration** (in `src/main.ts`):

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST"],
});
```

---

## Rate Limiting

Purpose: Prevent brute force, abuse, DDoS

Configuration (in `src/auth/auth.module.ts`):

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 3600000, // 1 hour
        limit: 10, // 10 signups
        keyPrefix: "auth:signup",
      },
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 login attempts
        keyPrefix: "auth:login",
      },
    ]),
  ],
})
export class AuthModule {}
```

**Applied to endpoints**:

```typescript
@Post('signup')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 3600000 } })
async signup(@Body() dto: SignupRequestDto) { ... }

@Post('login')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
async login(@Body() dto: LoginRequestDto) { ... }
```

---

## Password Requirements

**Strength**:

- Minimum 8 characters
- Require uppercase letter
- Require lowercase letter
- Require digit
- Require special character (@$!%\*?&)

**Pattern**:

```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
```

---

## SQL Injection Prevention

**TypeORM** (parameterized queries):

```typescript
// Safe
const user = await repo.findOne({
  where: { username_normalized: username },
});

// Never use raw SQL
// const user = await repo.query(`SELECT * FROM users WHERE username = '${username}'`);
```

---

## Sensitive Data Handling

**Cached Data**:

- Include password_hash in cache (for verification)
- Never cache email, phone, or other PII
- Cache only auth-essential fields

**Logs**:

- Never log passwords, tokens, or hashes
- Log only auth events (signup, login, failures)

---

## Secret Management

**JWT_SECRET**:

- > = 32 characters
- Stored in .env (never commit)
- Rotate on security incident

**BCRYPT_SALT**:

- Default: 10
- Increase to 12+ for high-security (slower)

---

## Monitoring & Alerting

```
Metrics:
- failed_login_attempts (counter)
- signup_failures (counter)
- rate_limit_exceeded (counter)
- jwt_validation_failures (counter)

Alerts:
- 100+ failed logins in 5 minutes
- 50+ rate limit hits in 5 minutes
- JWT signature mismatch
```
