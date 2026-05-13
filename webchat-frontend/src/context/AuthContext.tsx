import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, AuthContextType } from "../types/auth";
import type { CryptoDataDto } from "../api-client/services/auth/auth.service.dto";
import {
  decryptWithBase64Key,
  generateBase64KeyFromPasswordAndSalt,
} from "../utils/crypto-utils";
import { AUTH_LOGOUT_EVENT } from "../utils/auth-session";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [decryptedData, setDecryptedData] = useState<{
    dek: string;
    rsaPrivateKey: string;
  } | null>(null);

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setDecryptedData(null);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, []);

  const setCryptoDecryptedPassword = async (
    cryptoData: CryptoDataDto,
    password: string,
  ) => {
    const userEncKey = await generateBase64KeyFromPasswordAndSalt(
      password,
      cryptoData.salt,
    );

    const userDek = await decryptWithBase64Key(userEncKey, cryptoData.dek);
    const userPrivateKey = await decryptWithBase64Key(
      userDek,
      cryptoData.rsa.privateKey,
    );
    setUser((prevUser) =>
      prevUser
        ? {
            ...prevUser,
            decryptedData: {
              dek: userDek,
              rsaPrivateKey: userPrivateKey,
            },
          }
        : null,
    );
    setDecryptedData({
      dek: userDek,
      rsaPrivateKey: userPrivateKey,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        setCryptoDecryptedPassword,
        decryptedData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
