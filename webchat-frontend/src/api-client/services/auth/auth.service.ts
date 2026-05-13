import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import axiosClient from "../../api-client";
import { clearAuthSession } from "../../../utils/auth-session";
import type {
  AuthResponseDto,
  SignupRequestDto,
  LoginRequestDto,
  UserDto,
  ApiResponse,
} from "./auth.service.dto";

// ============================================================================
// Raw API Functions - No throwing errors, return {data, error} pattern
// ============================================================================

/**
 * Signup API call
 * Returns {data, error} pattern for type-safe error handling
 * If error is null, data will be there
 * If data is null, error will be there
 */
async function signupApi(
  payload: SignupRequestDto,
): Promise<ApiResponse<AuthResponseDto>> {
  try {
    const response = await axiosClient.post<AuthResponseDto>(
      "/auth/signup",
      payload,
    );

    // Store token on successful signup
    if (response.data.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
    }

    return {
      data: response.data,
      error: null,
    };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        status: error.response?.status || 500,
        message: error.message || "Signup failed",
        code: error.code,
        details: error.response?.data,
      },
    };
  }
}

/**
 * Login API call
 * Returns {data, error} pattern for type-safe error handling
 */
async function loginApi(
  payload: LoginRequestDto,
): Promise<ApiResponse<AuthResponseDto>> {
  try {
    const response = await axiosClient.post<AuthResponseDto>(
      "/auth/login",
      payload,
    );

    // Store token on successful login
    if (response.data.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
    }

    return {
      data: response.data,
      error: null,
    };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        status: error.response?.status || 500,
        message: error.message || "Login failed",
        code: error.code,
        details: error.response?.data,
      },
    };
  }
}

/**
 * Get current user API call
 * Returns {data, error} pattern for type-safe error handling
 */
async function getCurrentUserApi(): Promise<ApiResponse<UserDto>> {
  try {
    const response = await axiosClient.get<UserDto>("/auth/me");
    return {
      data: response.data,
      error: null,
    };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        status: error.response?.status || 500,
        message: error.message || "Failed to fetch current user",
        code: error.code,
        details: error.response?.data,
      },
    };
  }
}

/**
 * Logout function - clears token from localStorage
 */
function logout(): void {
  clearAuthSession();
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

/**
 * Hook for signup mutation
 * Usage:
 * const { mutate, isPending, data, error } = useSignup();
 *
 * mutate({ username, password, cryptoData });
 * if (error) handle error
 * if (data) handle success
 */
export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signupApi,
    onSuccess: (response) => {
      // Invalidate user query to refetch
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    },
  });
}

/**
 * Hook for login mutation
 * Usage:
 * const { mutate, isPending, data, error } = useLogin();
 *
 * mutate({ username, password });
 * if (error) handle error
 * if (data) handle success
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (response) => {
      // Invalidate user query to refetch
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    },
  });
}

/**
 * Hook for fetching current user
 * Usage:
 * const { data, error, isPending } = useCurrentUser();
 *
 * if (error) handle error
 * if (data) use user data
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUserApi,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook for logout
 * Usage:
 * const { mutate: logout } = useLogout();
 *
 * logout();
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      logout();
    },
    onSuccess: () => {
      queryClient.setQueryData(["currentUser"], null);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// ============================================================================
// Export API functions for direct use if needed
// ============================================================================
export const authApi = {
  signup: signupApi,
  login: loginApi,
  getCurrentUser: getCurrentUserApi,
  logout,
};
