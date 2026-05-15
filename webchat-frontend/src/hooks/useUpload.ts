import { useState, useCallback } from "react";
import {
  UploadService,
  type UploadProgressEvent,
  type UploadResponse,
  type UploadError,
} from "./upload.service";

export interface UseUploadState {
  isLoading: boolean;
  progress: number;
  error: UploadError | null;
  uploadedUrl: string | null;
}

/**
 * React Hook for handling image uploads with progress tracking
 *
 * @example
 * const { isLoading, progress, error, uploadedUrl, uploadImage } = useUpload();
 *
 * const handleFileSelect = async (file: File) => {
 *   const response = await uploadImage(file);
 *   if (response) {
 *     console.log('Uploaded:', response.url);
 *   }
 * };
 */
export const useUpload = () => {
  const [state, setState] = useState<UseUploadState>({
    isLoading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
  });

  const uploadImage = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setState({
        isLoading: true,
        progress: 0,
        error: null,
        uploadedUrl: null,
      });

      try {
        const response = await UploadService.uploadImage(
          file,
          (progress: UploadProgressEvent) => {
            setState((prevState) => ({
              ...prevState,
              progress: progress.percentage,
            }));
          },
        );

        setState({
          isLoading: false,
          progress: 100,
          error: null,
          uploadedUrl: response.url,
        });

        return response;
      } catch (error) {
        const uploadError = error as UploadError;
        setState({
          isLoading: false,
          progress: 0,
          error: uploadError,
          uploadedUrl: null,
        });
        return null;
      }
    },
    [],
  );

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      error: null,
      uploadedUrl: null,
    });
  }, []);

  return {
    ...state,
    uploadImage,
    resetState,
  };
};

export default useUpload;
