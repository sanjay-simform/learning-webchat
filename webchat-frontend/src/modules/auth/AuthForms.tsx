import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLogin,
  useSignup,
} from "../../api-client/services/auth/auth.service";
import type {
  LoginRequestDto,
  SignupRequestDto,
} from "../../api-client/services/auth/auth.service.dto";
import {
  generateCryptoData,
  calculatePasswordEntropy,
} from "../../utils/crypto-utils";

interface LoginFormState {
  username: string;
  password: string;
  error: string | null;
}

interface SignupFormState {
  username: string;
  password: string;
  confirmPassword: string;
  error: string | null;
  passwordEntropy: number;
}

/**
 * Login Component
 * Type-safe login with error handling
 */
export function LoginForm() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
    error: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value, error: null }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      setForm((prev) => ({
        ...prev,
        error: "Username and password are required",
      }));
      return;
    }

    const payload: LoginRequestDto = {
      username: form.username,
      password: form.password,
    };

    const response = await loginMutation.mutateAsync(payload);

    // Type-safe error handling
    if (response.error) {
      let errorMessage = response.error.message;

      if (response.error.status === 401) {
        errorMessage = "Invalid username or password";
      } else if (response.error.status === 429) {
        errorMessage = "Too many login attempts. Please try again later.";
      }

      setForm((prev) => ({ ...prev, error: errorMessage }));
      return;
    }

    // Type-safe success handling
    if (response.data) {
      // Token is automatically stored by the service
      // Query is automatically invalidated, triggering useCurrentUser refetch
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        {form.error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {form.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              disabled={loginMutation.isPending}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={loginMutation.isPending}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="text-blue-500 hover:underline font-medium"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Signup Component
 * Type-safe signup with crypto data generation
 */
export function SignupForm() {
  const navigate = useNavigate();
  const signupMutation = useSignup();
  const [form, setForm] = useState<SignupFormState>({
    username: "",
    password: "",
    confirmPassword: "",
    error: null,
    passwordEntropy: 0,
  });
  const [isGeneratingCrypto, setIsGeneratingCrypto] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "password") {
      const entropy = calculatePasswordEntropy(value);
      setForm((prev) => ({
        ...prev,
        [name]: value,
        passwordEntropy: entropy,
        error: null,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value, error: null }));
    }
  };

  const validateForm = (): boolean => {
    if (!form.username.trim()) {
      setForm((prev) => ({ ...prev, error: "Username is required" }));
      return false;
    }

    if (form.username.length < 3) {
      setForm((prev) => ({
        ...prev,
        error: "Username must be at least 3 characters",
      }));
      return false;
    }

    if (form.password.length < 8) {
      setForm((prev) => ({
        ...prev,
        error: "Password must be at least 8 characters",
      }));
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setForm((prev) => ({ ...prev, error: "Passwords do not match" }));
      return false;
    }

    // Password strength check
    const hasUpper = /[A-Z]/.test(form.password);
    const hasLower = /[a-z]/.test(form.password);
    const hasNumber = /[0-9]/.test(form.password);
    const hasSpecial = /[@$!%*?&]/.test(form.password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setForm((prev) => ({
        ...prev,
        error:
          "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
      }));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsGeneratingCrypto(true);

    try {
      // Generate crypto data for encryption
      const cryptoData = await generateCryptoData(form.password);

      const payload: SignupRequestDto = {
        username: form.username,
        password: form.password,
        cryptoData,
      };

      const response = await signupMutation.mutateAsync(payload);

      // Type-safe error handling
      if (response.error) {
        let errorMessage = response.error.message;

        if (response.error.status === 409) {
          errorMessage = "Username already exists";
        } else if (response.error.status === 400) {
          errorMessage = "Invalid input. Please check your information.";
        } else if (response.error.status === 429) {
          errorMessage = "Too many signup attempts. Please try again later.";
        }

        setForm((prev) => ({ ...prev, error: errorMessage }));
        return;
      }

      // Type-safe success handling
      if (response.data) {
        // Token is automatically stored by the service
        navigate("/dashboard");
      }
    } finally {
      setIsGeneratingCrypto(false);
    }
  };

  const isPasswordStrong = form.passwordEntropy >= 60;
  const isFormValid =
    form.username.trim().length >= 3 &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword &&
    isPasswordStrong;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>

        {form.error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {form.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
              disabled={signupMutation.isPending || isGeneratingCrypto}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              3-64 characters, alphanumeric and underscores
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              disabled={signupMutation.isPending || isGeneratingCrypto}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="mt-2">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-600">Password strength</span>
                <span
                  className={
                    isPasswordStrong ? "text-green-600" : "text-red-600"
                  }
                >
                  Entropy: {form.passwordEntropy.toFixed(0)} bits
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    form.passwordEntropy >= 60 ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min((form.passwordEntropy / 100) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Must contain: uppercase, lowercase, number, and special
                character
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={signupMutation.isPending || isGeneratingCrypto}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={
              !isFormValid || signupMutation.isPending || isGeneratingCrypto
            }
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isGeneratingCrypto
              ? "Generating encryption keys..."
              : signupMutation.isPending
                ? "Creating account..."
                : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-blue-500 hover:underline font-medium"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
