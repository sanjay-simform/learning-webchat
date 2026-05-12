# 06 - Login Flow & Implementation

## Login Request DTO

Location: `src/auth/dtos/login-request.dto.ts`

```typescript
export class LoginRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
```

## Login Endpoint

Location: `src/auth/auth.controller.ts`

```typescript
@Post('login')
@HttpCode(200)
async login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
  const { user, token } = await this.authService.login(dto);

  return {
    access_token: token,
    user: {
      id: user.id,
      username: user.username_original,
      created_at: user.created_at
    }
  };
}
```

## Login Service Logic

Location: `src/auth/services/auth.service.ts`

```typescript
async login(dto: LoginRequestDto): Promise<{ user: UserSchema; token: string }> {
  // 1. Normalize username
  const normalizedUsername = this.usernameService.normalize(dto.username);

  // 2. Check Bloom Filter (HOT PATH OPTIMIZATION)
  const mightExist = await this.bloomService.mightExist(normalizedUsername);
  if (!mightExist) {
    // Bloom says definitely NOT in DB - return 401 immediately
    throw new InvalidCredentialsException();
  }

  // 3. Try Redis cache first
  let user = await this.cacheService.getUser(normalizedUsername);
  if (!user) {
    // Cache miss, query database
    user = await this.userService.findByUsername(normalizedUsername);
    if (!user) {
      throw new InvalidCredentialsException();
    }
  }

  // 4. Verify password
  const passwordValid = await this.passwordService.verify(
    dto.password,
    user.password_hash
  );
  if (!passwordValid) {
    throw new InvalidCredentialsException();
  }

  // 5. Cache user if not cached
  if (!user.cached) {
    await this.cacheService.setUser(normalizedUsername, user);
  }

  // 6. Update last_login_at (async, non-blocking)
  this.userService.updateLastLogin(user.id).catch(err => {
    console.error('Update last_login failed:', err);
  });

  // 7. Generate JWT
  const token = await this.jwtService.sign({
    sub: user.id,
    username: normalizedUsername
  });

  return { user, token };
}
```

## Login Flow Paths

### Path 1: Invalid Username (Bloom Rejects) - HOT PATH

```
POST /auth/login { username: "nonexistent", password: "..." }
  ↓
Bloom Filter check → FALSE
  ↓
Return 401 [ZERO DB QUERIES, <1ms]
```

Frequency: ~99% of failed login attempts

### Path 2: Valid Cached User - WARM PATH

```
POST /auth/login { username: "alice", password: "secret" }
  ↓
Bloom check → TRUE
  ↓
Redis cache → HIT
  ↓
Bcrypt verify → JWT [50-100ms, no DB]
```

Frequency: ~60-75% of successful logins

### Path 3: Valid Uncached User - COLD PATH

```
POST /auth/login { username: "bob", password: "secret" }
  ↓
Bloom check → TRUE
  ↓
Cache miss → DB query [5-15ms]
  ↓
Bcrypt verify → Cache write → JWT [50-150ms total]
```

Frequency: ~25-40% of successful logins

## Performance Targets

| Scenario         | Latency  | DB Queries | Cache Hits    |
| ---------------- | -------- | ---------- | ------------- |
| Invalid username | <1ms     | 0          | N/A           |
| Valid cached     | 50-100ms | 0          | 1 Redis hit   |
| Valid uncached   | 50-150ms | 1          | 1 Redis miss  |
| Wrong password   | 50-100ms | 0-1        | 0-1 Redis hit |

## Security Principles

**Error Messages**: Always return "Invalid username or password"

- Don't distinguish between "username doesn't exist" vs "password wrong"
- Prevents username enumeration

**Timing**: Bloom fast path <1ms vs password verify ~100ms

- Timing leak exists but acceptable trade-off for performance
- Most attackers don't exploit timing info

## Login Error Responses

```
200 OK
{ "access_token": "...", "user": { "id": "...", "username": "..." } }

401 Unauthorized
{ "statusCode": 401, "message": "Invalid username or password", "error": "Unauthorized" }

503 Service Unavailable (DB error)
{ "statusCode": 503, "message": "Service temporarily unavailable" }
```
