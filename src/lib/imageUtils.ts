// Utility functions for handling image binary data

/**
 * Converts a File object to binary data for database storage
 */
export const fileToImageData = async (file: File): Promise<{ data: Uint8Array; mimeType: string }> => {
  const arrayBuffer = await file.arrayBuffer();
  return {
    data: new Uint8Array(arrayBuffer),
    mimeType: file.type
  };
};

/**
 * Converts binary image data from database to a data URL for display
 */
export const imageDataToDataURL = (imageData: Uint8Array, mimeType: string): string => {
  const blob = new Blob([imageData], { type: mimeType });
  return URL.createObjectURL(blob);
};

/**
 * Converts binary image data to base64 data URL
 */
export const imageDataToBase64 = (imageData: Uint8Array, mimeType: string): string => {
  const base64String = btoa(String.fromCharCode(...imageData));
  return `data:${mimeType};base64,${base64String}`;
};

/**
 * Creates a temporary object URL from binary data for image display
 */
export const createImageObjectURL = (imageData: Uint8Array, mimeType: string): string => {
  const blob = new Blob([imageData], { type: mimeType });
  return URL.createObjectURL(blob);
};

/**
 * Validates if a file is a valid image
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }

  // Check file size (limit to 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image must be smaller than 5MB' };
  }

  // Check for supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, GIF, WebP' };
  }

  return { isValid: true };
};

/**
 * Resizes an image file before upload (optional optimization)
 */
export const resizeImage = async (
  file: File, 
  maxWidth: number = 800, 
  maxHeight: number = 600, 
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file); // Return original if resize fails
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
