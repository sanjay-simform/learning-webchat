# 05 - Signup Flow & Implementation

## Signup Request DTO

Location: `src/auth/dtos/signup-request.dto.ts`

```typescript
export class SignupRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;
}
```

**Validation**:

- Username: 3-64 chars
- Password: 8-128 chars, uppercase, lowercase, digit, special char

## Signup Response DTO

Location: `src/auth/dtos/auth-response.dto.ts`

```typescript
export class AuthResponseDto {
  @Expose()
  access_token: string;

  @Expose()
  user: UserDto;
}

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  created_at: Date;
}
```

## Signup Endpoint

Location: `src/auth/auth.controller.ts`

```typescript
@Controller("auth")
export class AuthController {
  @Post("signup")
  @HttpCode(201)
  async signup(@Body() dto: SignupRequestDto): Promise<AuthResponseDto> {
    const { user, token } = await this.authService.signup(dto);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username_original,
        created_at: user.created_at,
      },
    };
  }
}
```

## Signup Service Logic

Location: `src/auth/services/auth.service.ts`

```typescript
async signup(dto: SignupRequestDto): Promise<{ user: UserSchema; token: string }> {
  // 1. Normalize username
  const normalizedUsername = this.usernameService.normalize(dto.username);

  // 2. Hash password
  const passwordHash = await this.passwordService.hash(dto.password);

  // 3. Insert into DB
  let user: UserSchema;
  try {
    user = await this.userService.create({
      username_normalized: normalizedUsername,
      username_original: dto.username,
      password_hash: passwordHash,
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint
      throw new UsernameAlreadyExistsException();
    }
    throw error;
  }

  // 4. Add to Bloom filter (non-blocking)
  this.bloomService.add(normalizedUsername).catch(err => {
    console.error('Bloom add failed:', err);
  });

  // 5. Cache user
  await this.cacheService.setUser(normalizedUsername, {
    id: user.id,
    username_normalized: normalizedUsername,
    password_hash: passwordHash,
  });

  // 6. Generate JWT
  const token = await this.jwtService.sign({ sub: user.id, username: normalizedUsername });

  return { user, token };
}
```

## Race Condition Handling

**Scenario**: Two users signup with "alice" simultaneously

```
User A: INSERT ... VALUES ('alice', ...)  [WAITING]
User B: INSERT ... VALUES ('alice', ...)  [WAITING]
  ↓
User A commits first → SUCCESS
User B unique constraint violation → CATCH → 409 Conflict
```

Result: User A succeeds, User B gets 409 (correct behavior)

## Signup Error Responses

```
201 Created
{ "access_token": "...", "user": { "id": "...", "username": "..." } }

400 Bad Request (validation)
{ "statusCode": 400, "message": [...], "error": "Bad Request" }

409 Conflict (username taken)
{ "statusCode": 409, "message": "Username already taken", "error": "Conflict" }
```

## Performance Target

- Happy path: <200ms (bcrypt dominates: 100-150ms)
