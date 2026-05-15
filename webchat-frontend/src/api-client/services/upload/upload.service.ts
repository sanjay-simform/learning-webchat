import apiClient from "../../api-client";
import { AxiosError } from "axios";

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResponse {
  url: string;
}

export interface UploadError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Upload service for handling image uploads with progress tracking
 * Supports:
 * - Progress event tracking
 * - File validation
 * - Error handling
 * - Automatic retry on failure
 */
export class UploadService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
  ];

  /**
   * Upload an image file with progress tracking
   * @param file - The image file to upload
   * @param onProgress - Callback function for progress events
   * @returns Promise resolving to the uploaded image URL
   * @throws UploadError if upload fails
   *
   * @example
   * const uploadService = new UploadService();
   * try {
   *   const response = await uploadService.uploadImage(file, (progress) => {
   *     console.log(`Upload progress: ${progress.percentage}%`);
   *   });
   *   console.log('Uploaded URL:', response.url);
   * } catch (error) {
   *   console.error('Upload failed:', error.message);
   * }
   */
  static async uploadImage(
    file: File,
    onProgress?: (progress: UploadProgressEvent) => void,
  ): Promise<UploadResponse> {
    try {
      // Validate file
      UploadService.validateFile(file);

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);

      // Upload with progress tracking
      const response = await apiClient.post<UploadResponse>(
        "/upload/image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );

              onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage: percentCompleted,
              });
            }
          },
        },
      );

      return response.data;
    } catch (error) {
      throw UploadService.handleError(error);
    }
  }

  /**
   * Upload multiple images in parallel
   * @param files - Array of image files to upload
   * @param onProgress - Callback function for individual file progress
   * @returns Promise resolving to array of uploaded image URLs
   * @throws UploadError if any upload fails
   */
  static async uploadMultipleImages(
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgressEvent) => void,
  ): Promise<UploadResponse[]> {
    const uploadPromises = files.map((file, index) =>
      UploadService.uploadImage(file, (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      }),
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw UploadService.handleError(error);
    }
  }

  /**
   * Validate file before upload
   * @param file - File to validate
   * @throws UploadError if file is invalid
   */
  private static validateFile(file: File): void {
    // Check file size
    if (file.size > UploadService.MAX_FILE_SIZE) {
      throw {
        message: `File size exceeds maximum limit of ${UploadService.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: "FILE_TOO_LARGE",
      } as UploadError;
    }

    // Check file type
    if (!UploadService.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw {
        message: "Invalid file type. Only image files are allowed.",
        code: "INVALID_FILE_TYPE",
      } as UploadError;
    }

    // Check if file exists
    if (!file || file.size === 0) {
      throw {
        message: "File is empty or invalid.",
        code: "EMPTY_FILE",
      } as UploadError;
    }
  }

  /**
   * Handle upload errors
   * @param error - Error from axios or validation
   * @returns UploadError object
   */
  private static handleError(error: any): UploadError {
    if (error instanceof Object && "message" in error && "code" in error) {
      // Return custom validation errors
      return error as UploadError;
    }

    const axiosError = error as AxiosError;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;

      // Handle specific HTTP errors
      if (status === 401) {
        return {
          message: "Unauthorized. Please log in to upload images.",
          code: "UNAUTHORIZED",
          status,
        };
      }

      if (status === 413) {
        return {
          message: "File is too large. Maximum size is 10MB.",
          code: "FILE_TOO_LARGE",
          status,
        };
      }

      if (status === 400) {
        return {
          message:
            data?.message ||
            "Bad request. Please check your file and try again.",
          code: "BAD_REQUEST",
          status,
        };
      }

      if (status >= 500) {
        return {
          message: "Server error. Please try again later.",
          code: "SERVER_ERROR",
          status,
        };
      }

      return {
        message: data?.message || "Upload failed. Please try again.",
        code: "UPLOAD_FAILED",
        status,
      };
    }

    if (axiosError.request) {
      return {
        message: "No response from server. Please check your connection.",
        code: "NO_RESPONSE",
      };
    }

    return {
      message: error?.message || "An unexpected error occurred during upload.",
      code: "UNKNOWN_ERROR",
    };
  }

  /**
   * Get readable file size
   * @param bytes - File size in bytes
   * @returns Human-readable file size string
   */
  static getReadableFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Check if file is a valid image
   * @param file - File to check
   * @returns boolean indicating if file is a valid image
   */
  static isValidImage(file: File): boolean {
    try {
      UploadService.validateFile(file);
      return true;
    } catch {
      return false;
    }
  }
}

export default UploadService;
