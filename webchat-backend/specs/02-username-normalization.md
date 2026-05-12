# 02 - Username Normalization

## Normalization Rules

**Input**: Raw username from user

**Process**:

1. Trim whitespace from start/end
2. Lowercase entire string
3. Collapse multiple spaces into single space
4. Remove leading/trailing internal spaces
5. Validate length: 3-64 characters
6. Allowed characters: a-z, 0-9, underscore, hyphen, period

**Examples**:

```
"  JohnDoe_123  " → "johndoe_123"
"ALICE.smith" → "alice.smith"
"User  Name" → "user name"
"@Invalid#User" → REJECT (invalid characters)
"ab" → REJECT (too short)
```

## Implementation

Location: `src/shared/services/username.service.ts`

```typescript
export class UsernameService {
  readonly MIN_LENGTH = 3;
  readonly MAX_LENGTH = 64;
  readonly ALLOWED_REGEX = /^[a-z0-9_.-]+$/;

  normalize(username: string): string {
    if (!username || typeof username !== "string") {
      throw new InvalidUsernameException("Username must be a non-empty string");
    }

    let normalized = username.trim().toLowerCase();
    normalized = normalized.replace(/\s+/g, " ").trim();

    if (
      normalized.length < this.MIN_LENGTH ||
      normalized.length > this.MAX_LENGTH
    ) {
      throw new InvalidUsernameException(
        `Username must be ${this.MIN_LENGTH}-${this.MAX_LENGTH} characters`,
      );
    }

    if (!this.ALLOWED_REGEX.test(normalized)) {
      throw new InvalidUsernameException(
        "Username can only contain letters, numbers, underscore, hyphen, and period",
      );
    }

    return normalized;
  }

  isValid(username: string): boolean {
    try {
      this.normalize(username);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Edge Cases

**Case Sensitivity**: "Alice" and "ALICE" → "alice" (conflict resolved by DB unique constraint)

**Spaces in Usernames**: "john doe" is valid, spaces collapsed and trimmed

**Unicode**: Currently ASCII only (safest, no locale issues)

## Performance

- O(n) where n = username length
- ~<0.1ms for typical usernames
- CPU-only (no I/O)

## Storage Pattern

- `username_normalized`: used in all queries (indexed)
- `username_original`: display/analytics
