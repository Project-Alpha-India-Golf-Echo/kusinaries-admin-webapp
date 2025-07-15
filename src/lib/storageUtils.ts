// Utility functions for Supabase storage operations

import { supabase } from './supabase';

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

    // Upload file to storage
    const { error } = await supabase
      .storage
      .from('images')
        .upload(filePath, file);

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
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
  imageUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extract file path from URL
    // URL format: https://qmgsxgtkwfuawrufvysc.supabase.co/storage/v1/object/public/images/filename.png
    const urlParts = imageUrl.split('/storage/v1/object/public/images/');
    if (urlParts.length !== 2) {
      return { success: false, error: 'Invalid image URL format' };
    }
    
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('images')
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
  oldImageUrl?: string,
  folder?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Upload new image
    const uploadResult = await uploadImageToStorage(newFile, folder);
    
    if (!uploadResult.success) {
      return uploadResult;
    }

    // Delete old image if provided (don't fail the operation if this fails)
    if (oldImageUrl) {
      const deleteResult = await deleteImageFromStorage(oldImageUrl);
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
