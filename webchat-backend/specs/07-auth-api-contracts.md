# 07 - Auth API Contracts & DTOs

## API Endpoints Summary

| Method | Endpoint                    | Auth Required | Purpose                  |
| ------ | --------------------------- | ------------- | ------------------------ |
| POST   | /auth/signup                | No            | Register new user        |
| POST   | /auth/login                 | No            | Login, get JWT           |
| GET    | /auth/me                    | Yes (JWT)     | Get current user profile |
| GET    | /auth/username-availability | No            | Check username available |

## Signup Endpoint

**Request**:

```json
POST /auth/signup
Content-Type: application/json

{
  "username": "alice",
  "password": "SecurePass123!@"
}
```

**Validation**:

- username: 3-64 chars, required
- password: 8-128 chars, required (uppercase + lowercase + digit + special)

**Response (201 Created)**:

```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "alice",
    "created_at": "2026-05-12T10:30:00Z"
  }
}
```

**Errors**:

- 400: Invalid DTO (validation failed)
- 409: Username already taken
- 429: Rate limited (too many signups)
- 500: Internal error

---

## Login Endpoint

**Request**:

```json
POST /auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "SecurePass123!@"
}
```

**Response (200 OK)**:

```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "alice",
    "created_at": "2026-05-12T10:30:00Z"
  }
}
```

**Errors**:

- 400: Invalid DTO
- 401: Wrong credentials
- 429: Rate limited (too many attempts)
- 503: Database error

---

## Get Current User (Protected)

**Request**:

```
GET /auth/me
Authorization: Bearer eyJhbGc...
```

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "created_at": "2026-05-12T10:30:00Z"
}
```

**Errors**:

- 401: Missing/invalid token
- 404: User not found

---

## Username Availability Endpoint

**Request**:

```
GET /auth/username-availability?username=alice
```

**Response (200 OK)**:

```json
{
  "username": "alice",
  "available": true
}
```

**Logic**:

- Normalize username
- Check Bloom → "no" → available: true
- Check Bloom → "yes" → query DB to be sure

**Note**: Advisory only, race condition possible

---

## JWT Token Structure

**Header**:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "iat": 1715492400,
  "exp": 1715578800
}
```

**Token TTL**: 24 hours (from .env: JWT_ACCESSTOKENTIME)

---

## DTOs

**SignupRequestDto** (`src/auth/dtos/signup-request.dto.ts`):

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

**LoginRequestDto** (`src/auth/dtos/login-request.dto.ts`):

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

**AuthResponseDto** (`src/auth/dtos/auth-response.dto.ts`):

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

---

## Exception Handling

**LocationException Classes** (`src/auth/exceptions/`):

- UsernameAlreadyExistsException (409)
- InvalidCredentialsException (401)
- InvalidUsernameException (400)
