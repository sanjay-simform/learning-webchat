// Common utility type combinations
export type AsyncFunction<T = void> = () => Promise<T>;
export type AsyncFunctionWithArg<A, T = void> = (arg: A) => Promise<T>;

// Form utilities
export interface FormErrorState {
  [key: string]: string | undefined;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
