import type { AxiosErrorResponse } from "../auth/auth.service.dto";

// User Profile DTO - returned from GET /profile
export interface UserProfileDto {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Update Profile Request DTO - sent to PATCH /profile
export interface UpdateProfileRequestDto {
  displayName?: string;
  avatarUrl?: string;
  status?: string;
}

// API Response wrapper with type-safe error handling
// If error is null, data will be there
// If data is null, error will be there
export interface ApiResponse<T> {
  data: T | null;
  error: AxiosErrorResponse | null;
}
