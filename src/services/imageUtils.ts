import imageCompression from 'browser-image-compression';

export async function fileToBase64(file: File): Promise<{
  base64: string;
  mimeType: string;
}> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]!;
      resolve({ base64, mimeType: compressed.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mimeType });
}

export function downloadImage(base64: string, mimeType: string, filename: string) {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateImageFile(file: File): string | null {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WebP image.';
  }
  if (file.size > 20 * 1024 * 1024) {
    return 'Image must be under 20MB.';
  }
  return null;
}
