import { useState, useEffect, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import {
  FileUpload, FileUploadDropzone, FileUploadItem, FileUploadItemDelete,
  FileUploadItemMetadata, FileUploadItemPreview, FileUploadList, FileUploadTrigger,
} from "@/components/ui/file-upload";
import { toast } from "sonner";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createIngredient, updateIngredient } from '../lib/supabaseQueries';
import { uploadImageToStorage, updateImageInStorage, validateImageFileForStorage } from '../lib/storageUtils';
import type { Ingredient, IngredientCategory } from '../types';

interface CreateEditIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngredientSaved: () => void;
  editingIngredient?: Ingredient | null;
  initialCategory?: IngredientCategory;
}

export const CreateEditIngredientModal: React.FC<CreateEditIngredientModalProps> = ({
  isOpen,
  onClose,
  onIngredientSaved,
  editingIngredient,
  initialCategory
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Go' as IngredientCategory,
    price_per_kilo: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!editingIngredient;

  // Initialize form data when modal opens or editing ingredient changes
  useEffect(() => {
    if (isOpen) {
      if (editingIngredient) {
        setFormData({
          name: editingIngredient.name,
          category: editingIngredient.category,
          price_per_kilo: editingIngredient.price_per_kilo.toString()
        });
      } else {
        setFormData({
          name: '',
          category: initialCategory || 'Go',
          price_per_kilo: ''
        });
      }
      setSelectedImage(null);
    }
  }, [isOpen, editingIngredient, initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const pricePerKilo = parseFloat(formData.price_per_kilo);
      if (isNaN(pricePerKilo) || pricePerKilo < 0) {
        toast.error('Please enter a valid price per kilo');
        return;
      }

      let imageUrl = isEditing ? editingIngredient?.image_url : undefined;

      // Handle image upload/update if a new image was selected
      if (selectedImage) {
        if (isEditing && editingIngredient?.image_url) {
          // Update existing image
          const updateResult = await updateImageInStorage(
            selectedImage,
            editingIngredient.image_url,
            'ingredients'
          );
          if (updateResult.success) {
            imageUrl = updateResult.url;
          } else {
            toast.error(updateResult.error || 'Failed to update image');
            return;
          }
        } else {
          // Upload new image
          const uploadResult = await uploadImageToStorage(
            selectedImage,
            'ingredients'
          );
          if (uploadResult.success) {
            imageUrl = uploadResult.url;
          } else {
            toast.error(uploadResult.error || 'Failed to upload image');
            return;
          }
        }
      }

      let result;
      if (isEditing) {
        result = await updateIngredient(editingIngredient!.ingredient_id, {
          name: formData.name.trim(),
          category: formData.category,
          price_per_kilo: pricePerKilo,
          image_url: imageUrl
        });
      } else {
        result = await createIngredient({
          name: formData.name.trim(),
          category: formData.category,
          price_per_kilo: pricePerKilo,
          image_url: imageUrl
        });
      }

      if (result.success) {
        setFormData({ name: '', category: 'Go', price_per_kilo: '' });
        setSelectedImage(null);
        toast.success(`Ingredient ${isEditing ? 'updated' : 'created'} successfully!`);
        onIngredientSaved();
        onClose();
      } else {
        toast.error(result.error || `Failed to ${isEditing ? 'update' : 'create'} ingredient`);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileReject = useCallback((file: File, message: string) => {
    const validation = validateImageFileForStorage(file);
    const errorMessage = validation.error || message;

    const truncatedFileName = file.name.length > 20
      ? `${file.name.slice(0, 20)}...`
      : file.name;

    toast.error(errorMessage, {
      description: `"${truncatedFileName}" has been rejected`,
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 animate-in fade-in duration-200 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className='space-y-2'>
            <Label htmlFor="name">Ingredient Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Chicken Breast"
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor="category">Pinggang Pinoy Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value as IngredientCategory)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Go">Go (Energy - Carbohydrates)</SelectItem>
                <SelectItem value="Grow">Grow (Build - Proteins)</SelectItem>
                <SelectItem value="Glow">Glow (Protect - Vitamins & Minerals)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor="price">Price per Kilo (₱) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price_per_kilo}
              onChange={(e) => handleInputChange('price_per_kilo', e.target.value)}
              placeholder="e.g., 280.00"
              required
            />
          </div>

          <div className='space-y-2 pb-20'>
            <Label htmlFor="image">Ingredient Image (Optional)</Label>
            <div className="mt-1">
              <FileUpload
                maxFiles={1}
                maxSize={5 * 1024 * 1024}
                className="w-full h-48"
                value={selectedImage ? [selectedImage] : []}
                onValueChange={(files) => setSelectedImage(files[0] ?? null)}
                onFileReject={handleFileReject}
              >
                <FileUploadDropzone>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex items-center justify-center rounded-full border p-2.5">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm">Drag & drop files here</p>
                    <p className="text-muted-foreground text-xs">
                      Or click to browse (max 1 files, up to 5MB each)
                    </p>
                  </div>
                  <FileUploadTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 w-fit">
                      Browse files
                    </Button>
                  </FileUploadTrigger>
                </FileUploadDropzone>
                <FileUploadList>
                  {selectedImage && (
                    <FileUploadItem value={selectedImage}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <X />
                        </Button>
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  )}
                </FileUploadList>
              </FileUpload>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                isEditing ? 'Update Ingredient' : 'Add Ingredient'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
