import { API_BASE_URL } from "../api-client/api-client";
import {
  UploadService,
  type UploadProgressEvent,
} from "../api-client/services/upload";
import { useState, forwardRef, useImperativeHandle } from "react";
import { encryptImage } from "../utils/image-enc.util";

/**
 * Example component demonstrating image upload with progress tracking
 *
 * Features:
 * - Drag and drop support
 * - Progress bar visualization
 * - Error handling
 * - File validation feedback
 */
export interface ImageUploadExampleProps {
  encryptionKey: string;
  children?: React.ReactNode;
  onUploadProgress?: (percentage: number) => void;
  onUploadSuccess?: (
    file: File,
    imageData: {
      url: string;
      fileName: string;
      iv: string;
      authTag: string;
      type: string;
    },
  ) => void;
  onUploadError?: (error: string) => void;
}

export interface ImageUploadExampleHandle {
  handleUpload: (file: File) => Promise<void>;
}

export const ImageUploadExample = forwardRef<
  ImageUploadExampleHandle,
  ImageUploadExampleProps
>(
  (
    {
      children,
      onUploadSuccess,
      onUploadProgress,
      onUploadError,
      encryptionKey,
    },
    ref,
  ) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleUpload = async (file: File) => {
      // Validate file before upload
      if (!UploadService.isValidImage(file)) {
        const error =
          "Invalid file. Please upload a valid image file (max 10MB).";
        setError(error);
        onUploadError?.(error);
        return;
      }

      setIsUploading(true);
      setError(null);
      setFileName(file.name);

      try {
        const unencryptedFile = file;
        const {
          file: encryptedFile,
          metadata: { iv, authTag },
        } = await encryptImage(file, encryptionKey);
        const response = await UploadService.uploadImage(
          encryptedFile,
          (progress: UploadProgressEvent) => {
            onUploadProgress?.(progress.percentage);
          },
        );

        setUploadedUrl(response.url);
        onUploadProgress?.(100);
        if (onUploadSuccess) {
          onUploadSuccess(unencryptedFile, {
            url: response.url,
            fileName: file.name,
            iv,
            authTag,
            type: file.type,
          });
        }
      } catch (err: any) {
        const errorMsg = err.message || "Upload failed. Please try again.";
        setError(errorMsg);
        onUploadError?.(errorMsg);
        console.error("Upload error:", err);
      } finally {
        setIsUploading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleUpload,
    }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.style.filter = "blur(2px)";
      e.currentTarget.style.opacity = "0.6";
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.style.filter = "none";
      e.currentTarget.style.opacity = "1";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.style.filter = "none";
      e.currentTarget.style.opacity = "1";

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleUpload(file);
      }
    };

    return (
      <div className="flex flex-col h-full">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <input
            type="file"
            id="file-input"
            onChange={handleFileChange}
            disabled={isUploading}
            accept="image/*"
            className="hidden"
          />
          {children ?? (
            <>
              <h2 className="text-xl font-bold mb-4">Upload Image</h2>

              <label htmlFor="file-input" className="cursor-pointer block">
                <p className="text-gray-600">
                  {isUploading
                    ? `Uploading ${fileName}...`
                    : "Drag and drop your image here, or click to select"}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Max file size: 10MB (JPG, PNG, GIF, WebP, AVIF)
                </p>
              </label>
            </>
          )}
        </div>
      </div>
    );
  },
);

ImageUploadExample.displayName = "ImageUploadExample";

export default ImageUploadExample;
