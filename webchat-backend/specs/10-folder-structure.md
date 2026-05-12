# 10 - Folder Structure & Module Organization

## Complete Folder Structure

```
src/
├── app.module.ts                   # Root module
├── app.controller.ts               # Root controller (health check)
├── app.service.ts                  # Root service
├── main.ts                         # Bootstrap
│
├── auth/                           # Auth module (isolated)
│   ├── auth.module.ts              # Module definition + imports
│   ├── auth.controller.ts          # HTTP endpoints
│   ├── services/
│   │   └── auth.service.ts         # Business logic (signup/login)
│   ├── dtos/
│   │   ├── signup-request.dto.ts
│   │   ├── login-request.dto.ts
│   │   └── auth-response.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── optional-jwt-auth.guard.ts
│   ├── exceptions/
│   │   ├── username-already-exists.exception.ts
│   │   ├── invalid-credentials.exception.ts
│   │   └── invalid-username.exception.ts
│   ├── filters/
│   │   └── auth-exception.filter.ts
│   └── __tests__/
│       ├── auth.controller.spec.ts
│       └── auth.service.spec.ts
│
├── user/                           # User domain
│   ├── user.module.ts
│   ├── services/
│   │   └── user.service.ts         # User queries (used by auth)
│   └── __tests__/
│       └── user.service.spec.ts
│
├── shared/                         # Shared utilities
│   ├── services/
│   │   ├── password.service.ts     # Bcrypt hashing
│   │   ├── username.service.ts     # Normalization
│   │   └── jwt.service.ts          # Token generation (jose)
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── __tests__/
│       ├── password.service.spec.ts
│       └── username.service.spec.ts
│
├── config/                         # Configuration (existing)
│   └── env.ts
│
├── database/                       # Database module (existing)
│   ├── database.module.ts
│   ├── database.provider.ts
│   ├── schemas/
│   │   └── user.schema.ts          # TypeORM entity
│   ├── migrations/
│   │   └── 1000-create-users-table.ts
│   └── seeds/
│
├── redis/                          # Redis module (existing)
│   ├── redis.module.ts
│   ├── redis.connection.ts         # Connection factory
│   ├── services/
│   │   ├── redis.service.ts        # Core operations
│   │   ├── cache.service.ts        # Cache-aside pattern
│   │   └── bloom-filter.service.ts # Bloom filter wrapper
│   └── constants.ts
│
└── specs/                          # Specifications (10 files)
    ├── 00-system-overview.md
    ├── 01-database-schema.md
    ├── 02-username-normalization.md
    ├── 03-redis-bloom-filter.md
    ├── 04-cache-strategy.md
    ├── 05-signup-flow.md
    ├── 06-login-flow.md
    ├── 07-auth-api-contracts.md
    ├── 08-security.md
    ├── 09-rate-limiting.md
    └── 10-folder-structure.md
```

## Module Boundaries

### **Auth Module** (Isolated)

**Responsibilities**:

- User registration (signup)
- User authentication (login)
- JWT token management
- Rate limiting

**Imports**:

- UserService (from user module)
- PasswordService, UsernameService, JwtService (from shared)
- CacheService, BloomFilterService (from redis)
- ThrottlerModule (from @nestjs/throttler)

**Exports**:

- JwtAuthGuard (for other modules)

**HTTP Routes**:

- POST /auth/signup
- POST /auth/login
- GET /auth/me
- GET /auth/username-availability

---

### **User Module** (Entity Management)

**Responsibilities**:

- User CRUD operations
- User entity business logic

**Exports**:

- UserService (to AuthModule)

**No HTTP routes** (used by auth internally)

---

### **Shared Module** (Cross-Cutting Utilities)

**Responsibilities**:

- Password hashing/verification (bcrypt)
- Username normalization
- JWT token generation
- Exception handling
- Validation pipes

**Exports**:

- PasswordService
- UsernameService
- JwtService

**No HTTP routes**

---

### **Redis Module** (Cache & Real-Time Data)

**Responsibilities**:

- Redis connection management
- Cache operations (cache-aside)
- Bloom filter operations

**Exports**:

- CacheService
- BloomFilterService
- Redis client

**No HTTP routes**

---

### **Database Module** (Persistence)

**Responsibilities**:

- TypeORM configuration
- Entity registration
- Migration execution

**Exports**:

- DataSource (for repositories)
- User entity

---

## File Naming Conventions

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Entities**: `*.schema.ts` or `*.entity.ts`
- **DTOs**: `*.dto.ts`
- **Guards**: `*.guard.ts`
- **Exceptions**: `*.exception.ts`
- **Tests**: `*.spec.ts`
- **Filters**: `*.filter.ts`

## Dependency Injection Flow

```
AuthController
  ↓
AuthService
  ├─ UserService
  ├─ PasswordService
  ├─ UsernameService
  ├─ JwtService
  ├─ CacheService
  └─ BloomFilterService
    ↓
[PostgreSQL + Redis]
```

## Module Imports (app.module.ts)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
```

## Circular Dependency Prevention

**Rule**: Modules should not import each other circularly

**Example (Good)**:

- auth.module imports user.module (one-way)
- user.module doesn't import auth.module

## Testing Module Structure

```typescript
describe("Auth Module", () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule, DatabaseModule, RedisModule],
    }).compile();
  });

  it("should compile", () => {
    expect(module).toBeDefined();
  });
});
```
