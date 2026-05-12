# 01 - PostgreSQL Schema & Indexes

## User Entity Definition

Location: `src/database/schemas/user.schema.ts`

```typescript
@Entity("users")
export class UserSchema {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "varchar",
    length: 64,
    unique: true,
    nullable: false,
    comment: "Normalized username (lowercase, trimmed)",
  })
  username_normalized: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: false,
    comment: "Original username as provided by user",
  })
  username_original: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: false,
    comment: "Bcrypt hash of password",
  })
  password_hash: string;

  @Column({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
    nullable: false,
  })
  created_at: Date;

  @Column({
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
    nullable: false,
  })
  updated_at: Date;

  @Column({
    type: "boolean",
    default: false,
    nullable: false,
    comment: "Soft delete flag",
  })
  is_deleted: boolean;

  @Column({
    type: "timestamptz",
    nullable: true,
    comment: "Last login timestamp (for analytics)",
  })
  last_login_at: Date | null;
}
```

## Migration

Initial migration: `src/database/migrations/1000-create-users-table.ts`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username_normalized VARCHAR(64) NOT NULL UNIQUE,
  username_original VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  CONSTRAINT username_normalized_length CHECK (LENGTH(username_normalized) >= 3 AND LENGTH(username_normalized) <= 64)
);

-- Index strategy
CREATE INDEX idx_users_username_normalized ON users(username_normalized)
  WHERE is_deleted = FALSE;

CREATE INDEX idx_users_created_at ON users(created_at DESC)
  WHERE is_deleted = FALSE;

CREATE INDEX idx_users_last_login_at ON users(last_login_at DESC)
  WHERE is_deleted = FALSE;
```

## Index Strategy

**Primary Lookup (Hot Path)**: `idx_users_username_normalized`

- Used for login queries
- Partial index (only non-deleted users) → smaller, faster scans

**Unique Constraint**: Prevents duplicate usernames during concurrent inserts

**Sizing**:

- Per user: ~500 bytes
- At 1M users: ~500MB table + ~100MB indexes

## Query Strategy

**Signup (write)**:

```sql
INSERT INTO users (username_normalized, username_original, password_hash)
VALUES ($1, $2, $3)
RETURNING id;
```

**Login (read)**:

```sql
SELECT id, password_hash FROM users
WHERE username_normalized = $1 AND is_deleted = FALSE
LIMIT 1;
```

## Performance Notes

- All auth queries use index (no full table scans)
- Connection pool: 5-20 connections
- Username normalization deterministic (application layer)
