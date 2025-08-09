// Utility functions for Supabase storage operations

import { supabase } from './supabase';

// Private bucket configuration
const BUCKET = 'images';
const DEFAULT_TTL = 60 * 15; // 15 minutes

// In-memory cache for signed URLs to reduce churn on re-renders
const signedUrlCache: Map<string, { url: string; expiresAt: number }> = new Map();

/**
 * Normalizes an input image reference to a storage object path within the bucket.
 * Accepts:
 * - Raw path like "meals/123.png"
 * - Public URL (from when bucket was public)
 * - Signed URL (object/sign)
 */
export const toObjectPath = (imageRef: string): string => {
  if (!imageRef) return imageRef;
  try {
    // If it already looks like a key (no protocol), return as-is
    if (!/^https?:\/\//i.test(imageRef)) return imageRef.replace(/^\/*/, '');

    // Handle public object URL pattern: /object/public/<bucket>/<path>
    const publicMarker = '/storage/v1/object/public/';
    const signMarker = '/storage/v1/object/sign/';
    const renderMarker = '/storage/v1/render/image/public/';

    let idx = imageRef.indexOf(publicMarker);
    if (idx >= 0) {
      const after = imageRef.substring(idx + publicMarker.length);
      // after starts with `${bucket}/path...`
      const parts = after.split('/');
      parts.shift(); // drop bucket
      return parts.join('/');
    }

    // Handle signed URL pattern: /object/sign/<bucket>/<path>?token=...
    idx = imageRef.indexOf(signMarker);
    if (idx >= 0) {
      const after = imageRef.substring(idx + signMarker.length);
      const [withBucket] = after.split('?');
      const parts = withBucket.split('/');
      parts.shift();
      return parts.join('/');
    }

    // Handle render image URL pattern
    idx = imageRef.indexOf(renderMarker);
    if (idx >= 0) {
      const after = imageRef.substring(idx + renderMarker.length);
      const parts = after.split('/');
      parts.shift();
      return parts.join('/');
    }

    // Fallback: try to find "/<bucket>/" segment and take rest
    const bucketSeg = `/${BUCKET}/`;
    idx = imageRef.indexOf(bucketSeg);
    if (idx >= 0) {
      return imageRef.substring(idx + bucketSeg.length);
    }
  } catch (e) {
    // noop
  }
  return imageRef;
};

/**
 * Create a signed URL for a single object path.
 */
export const getSignedUrl = async (objectPath: string, ttlSeconds: number = DEFAULT_TTL): Promise<string | null> => {
  const key = toObjectPath(objectPath);
  if (!key) return null;

  // Serve from cache if valid
  const cached = signedUrlCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 5_000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, ttlSeconds);

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  // Cache with a slight safety margin
  signedUrlCache.set(key, { url: data.signedUrl, expiresAt: now + ttlSeconds * 1000 });
  return data.signedUrl;
};

/**
 * Batch create signed URLs for multiple object paths.
 */
export const getSignedUrls = async (objectPaths: string[], ttlSeconds: number = DEFAULT_TTL): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  const toFetch: string[] = [];
  const now = Date.now();

  for (const path of objectPaths) {
    const key = toObjectPath(path);
    if (!key) continue;
    const cached = signedUrlCache.get(key);
    if (cached && cached.expiresAt > now + 5_000) {
      result[key] = cached.url;
    } else {
      toFetch.push(key);
    }
  }

  // Supabase JS v2 has createSignedUrls; fall back to Promise.all per key if unavailable
  if (toFetch.length > 0) {
    // @ts-ignore - not all types expose createSignedUrls; try and catch
    const batch = (supabase.storage.from(BUCKET) as any).createSignedUrls;
    if (typeof batch === 'function') {
      const { data, error } = await (supabase.storage.from(BUCKET) as any).createSignedUrls(toFetch, ttlSeconds);
      if (error) {
        console.warn('Batch signing failed, falling back to per-key:', error?.message || error);
      } else if (Array.isArray(data)) {
        data.forEach((row: any, idx: number) => {
          const key = toFetch[idx];
          if (row?.signedUrl) {
            signedUrlCache.set(key, { url: row.signedUrl, expiresAt: now + ttlSeconds * 1000 });
            result[key] = row.signedUrl;
          }
        });
      }
    }

    // Any keys not resolved via batch, do individually
    const unresolved = toFetch.filter(k => !result[k]);
    if (unresolved.length) {
      await Promise.all(
        unresolved.map(async (key) => {
          const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, ttlSeconds);
          if (!error && data?.signedUrl) {
            signedUrlCache.set(key, { url: data.signedUrl, expiresAt: now + ttlSeconds * 1000 });
            result[key] = data.signedUrl;
          }
        })
      );
    }
  }

  return result;
};

/**
 * Uploads an image file to Supabase storage bucket 'images'
 * @param file The image file to upload
 * @param folder Optional folder name within the bucket (e.g., 'meals', 'ingredients')
 * @returns Promise with upload result containing the public URL
 */
export const uploadImageToStorage = async (
  file: File, 
  folder?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Upload auth check:', { user: user?.id, authError });

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    console.log('Attempting to upload to path:', filePath);

    // Upload file to storage (private bucket)
    const { error } = await supabase
      .storage
      .from(BUCKET)
        .upload(filePath, file);

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

  // Return the object path; callers should sign when needed
  return { success: true, url: filePath };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload image' 
    };
  }
};

/**
 * Deletes an image from Supabase storage
 * @param imageUrl The full public URL of the image to delete
 * @returns Promise with deletion result
 */
export const deleteImageFromStorage = async (
  imageUrlOrPath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extract file path from URL or accept raw path
    const filePath = toObjectPath(imageUrlOrPath);
    if (!filePath) return { success: false, error: 'Invalid image reference' };

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete image' 
    };
  }
};

/**
 * Updates an image in storage (uploads new image and optionally deletes old one)
 * @param newFile The new image file to upload
 * @param oldImageUrl Optional URL of the old image to delete
 * @param folder Optional folder name within the bucket
 * @returns Promise with update result containing the new public URL
 */
export const updateImageInStorage = async (
  newFile: File,
  oldImageUrlOrPath?: string,
  folder?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Upload new image
    const uploadResult = await uploadImageToStorage(newFile, folder);
    
    if (!uploadResult.success) {
      return uploadResult;
    }

    // Delete old image if provided (don't fail the operation if this fails)
    if (oldImageUrlOrPath) {
      const deleteResult = await deleteImageFromStorage(oldImageUrlOrPath);
      if (!deleteResult.success) {
        console.warn('Failed to delete old image:', deleteResult.error);
        // Continue anyway since the upload was successful
      }
    }

    return { success: true, url: uploadResult.url };
  } catch (error) {
    console.error('Error updating image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update image' 
    };
  }
};

/**
 * Validates if a file is a valid image for storage
 * @param file The file to validate
 * @returns Validation result
 */
export const validateImageFileForStorage = (file: File): { isValid: boolean; error?: string } => {
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
