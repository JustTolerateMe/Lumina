import { useState, useCallback } from 'react';
import { fileToBase64, validateImageFile } from '../services/imageUtils';

export interface UploadedImage {
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
  label?: string; // e.g. 'front', 'back', 'detail'
}

export function useUpload() {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [additionalImages, setAdditionalImages] = useState<UploadedImage[]>([]); // max 2
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

  const handleAdditionalFile = useCallback(async (file: File, label?: string) => {
    if (additionalImages.length >= 2) return; // max 2 additional
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
      setAdditionalImages(prev => [...prev, { file, base64, mimeType, previewUrl, label }]);
    } catch {
      setError('Failed to process additional image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [additionalImages.length]);

  const removeAdditionalImage = useCallback((index: number) => {
    setAdditionalImages(prev => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateAdditionalImageLabel = useCallback((index: number, label: string) => {
    setAdditionalImages(prev => {
      const update = [...prev];
      const item = update[index];
      if (item) {
        update[index] = { ...item, label };
      }
      return update;
    });
  }, []);

  const clear = useCallback(() => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    additionalImages.forEach(img => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
    setImage(null);
    setAdditionalImages([]);
    setError(null);
  }, [image, additionalImages]);

  return {
    image,
    additionalImages,
    error,
    loading,
    handleFile,
    handleAdditionalFile,
    removeAdditionalImage,
    updateAdditionalImageLabel,
    clear
  };
}
