import { useState, useCallback } from 'react';
import { fileToBase64, validateImageFile } from '../services/imageUtils';

export interface UploadedImage {
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export function useUpload() {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { base64, mimeType } = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setImage({ file, base64, mimeType, previewUrl });
    } catch {
      setError('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setError(null);
  }, [image]);

  return { image, error, loading, handleFile, clear };
}
