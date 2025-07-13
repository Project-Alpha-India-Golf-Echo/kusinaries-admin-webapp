# Binary Image Storage Implementation

## Overview
The meal curation system has been updated to store images as binary data (BYTEA) directly in the PostgreSQL database instead of using URL references. This provides several advantages:

- **Data Integrity**: Images are stored with the data, eliminating broken image links
- **Security**: No external dependencies on image hosting services
- **Consistency**: All data is contained within the database
- **Backup**: Images are included in database backups automatically

## Database Schema Changes

### Tables Updated:

#### `ingredients` table:
- `image_url TEXT` → **REMOVED**
- `image_data BYTEA` → **ADDED** (stores binary image data)
- `image_mime_type VARCHAR(100)` → **ADDED** (stores MIME type like 'image/jpeg')

#### `meals` table:
- `picture_url TEXT` → **REMOVED**
- `picture_data BYTEA` → **ADDED** (stores binary image data)
- `picture_mime_type VARCHAR(100)` → **ADDED** (stores MIME type like 'image/jpeg')

## Technical Implementation

### Image Utility Functions (`/src/lib/imageUtils.ts`):

1. **`fileToImageData(file: File)`**
   - Converts File object to binary data for database storage
   - Returns Uint8Array and MIME type

2. **`imageDataToDataURL(imageData, mimeType)`**
   - Converts binary data to object URL for display
   - Used for rendering images in the UI

3. **`validateImageFile(file: File)`**
   - Validates file type and size (max 5MB)
   - Supports JPEG, PNG, GIF, WebP formats

4. **`resizeImage(file: File, maxWidth, maxHeight, quality)`**
   - Automatically resizes images before upload
   - Reduces file size and optimizes storage

### Component Updates:

#### `AddIngredientModal.tsx`:
- File input with drag-and-drop interface
- Image preview functionality
- Validation and error handling
- Automatic image resizing

#### `CreateEditMealModal.tsx`:
- File upload for meal pictures
- Image preview with remove option
- Handles both new uploads and existing images
- Maintains existing images when editing

#### `MealCard.tsx` & `IngredientSection.tsx`:
- Display images from binary data using object URLs
- Fallback to default icons when no image available
- Proper memory management for object URLs

## Usage Instructions

### Uploading Images:

1. **For Ingredients:**
   - Click "Add New" in any ingredient section
   - Click the image upload area or "Click to upload"
   - Select an image file (JPEG, PNG, GIF, WebP)
   - Image will be automatically resized and validated
   - Preview appears immediately

2. **For Meals:**
   - In the meal creation/editing modal
   - Click the image upload area
   - Select meal picture
   - Preview appears with remove option
   - Image is saved as binary data in the database

### Supported Features:

- **File Types**: JPEG, PNG, GIF, WebP
- **Size Limit**: 5MB maximum
- **Auto-Resize**: Images resized to 800x600 max dimensions
- **Quality Control**: 80% quality to balance size/quality
- **Validation**: Real-time validation with error messages
- **Preview**: Immediate preview before saving

## Storage Considerations

### Advantages:
- **Data Integrity**: No broken image links
- **Security**: Images stored securely in database
- **Backup**: Included in database backups
- **Consistency**: Single source of truth for all data

### Considerations:
- **Database Size**: Images increase database size
- **Performance**: Large images can slow queries (mitigated by auto-resize)
- **Memory**: Binary data uses memory when loaded (managed with object URLs)

### Optimization Features:
- **Automatic Resizing**: Reduces storage requirements
- **Quality Compression**: Balances file size and visual quality
- **Lazy Loading**: Images loaded only when needed
- **Object URL Management**: Proper cleanup prevents memory leaks

## Migration from URL-based Images

If you have existing data with image URLs, you can migrate using:

```sql
-- Example migration script (customize as needed)
UPDATE ingredients 
SET image_data = NULL, image_mime_type = NULL 
WHERE image_url IS NOT NULL;

UPDATE meals 
SET picture_data = NULL, picture_mime_type = NULL 
WHERE picture_url IS NOT NULL;
```

## Performance Tips

1. **Image Optimization**: The system automatically resizes images
2. **Format Selection**: Use JPEG for photos, PNG for graphics
3. **File Size**: Keep images under 1MB when possible
4. **Batch Operations**: Upload images individually for better UX

## Error Handling

The system handles common errors:
- **Invalid file types**: Clear error messages
- **File too large**: 5MB limit with warning
- **Upload failures**: Graceful fallback with retry option
- **Corrupted files**: Validation prevents database issues

This implementation provides a robust, self-contained image storage solution that eliminates external dependencies while maintaining excellent user experience.
