import type { CryptoDataDto } from "../api-client/services/auth/auth.service.dto";

export interface AuthUser {
  id: string;
  username: string;
  cryptoData?: CryptoDataDto;
  password?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  setCryptoDecryptedPassword: (
    cryptoData: CryptoDataDto,
    password: string,
  ) => Promise<void>;
  decryptedData: {
    dek: string;
    rsaPrivateKey: string;
  } | null;
}

export interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}
