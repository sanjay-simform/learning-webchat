// User DTO
export interface UserDto {
  id: string;
  username: string;
  cryptoData?: CryptoDataDto;
}

// Auth Response DTO - returned from signup/login
export interface AuthResponseDto {
  access_token: string;
  user: UserDto;
}

// Signup Request DTO
export interface CryptoDataDto {
  salt: string;
  dek: {
    cipherText: string;
    iv: string;
  };
  rsa: {
    publicKey: string;
    privateKey: {
      cipherText: string;
      iv: string;
    };
  };
}

export interface SignupRequestDto {
  username: string;
  password: string;
  cryptoData?: CryptoDataDto;
}

// Login Request DTO
export interface LoginRequestDto {
  username: string;
  password: string;
}

// API Response wrapper with type-safe error handling
// If error is null, data will be there
// If data is null, error will be there
export interface ApiResponse<T> {
  data: T | null;
  error: AxiosErrorResponse | null;
}

// Structured error response
export interface AxiosErrorResponse {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}
