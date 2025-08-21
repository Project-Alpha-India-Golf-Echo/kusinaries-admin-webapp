import {
  FileUpload, FileUploadDropzone, FileUploadItem, FileUploadItemDelete,
  FileUploadItemMetadata, FileUploadItemPreview, FileUploadList, FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { updateImageInStorage, uploadImageToStorage } from '../lib/storageUtils';
import { createCondiment, updateCondiment } from '../lib/supabaseQueries';
import type { Condiment, CondimentUnitType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface CreateEditCondimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCondimentSaved: () => void;
  editingCondiment?: Condiment | null;
}

export const CreateEditCondimentModal: React.FC<CreateEditCondimentModalProps> = ({
  isOpen,
  onClose,
  onCondimentSaved,
  editingCondiment
}) => {
  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'ml' as CondimentUnitType,
    package_price: '', // total price of the package
    package_quantity: '' // quantity amount corresponding to that price
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!editingCondiment;

  // Initialize form data when modal opens or editing condiment changes
  useEffect(() => {
    if (isOpen) {
      if (editingCondiment) {
        // We don't know the original package quantity; default to 1 unit so edits preserve existing per-unit price.
        setFormData({
          name: editingCondiment.name,
          unit_type: editingCondiment.unit_type,
          package_price: editingCondiment.price_per_unit.toString(),
          package_quantity: '1'
        });
      } else {
        setFormData({
          name: '',
          unit_type: 'ml',
          package_price: '',
          package_quantity: ''
        });
      }
      setSelectedImage(null);
    }
  }, [isOpen, editingCondiment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const packagePrice = parseFloat(formData.package_price);
      const packageQuantity = parseFloat(formData.package_quantity);
      if (isNaN(packagePrice) || packagePrice <= 0) {
        toast.error('Enter a valid package price');
        return;
      }
      if (isNaN(packageQuantity) || packageQuantity <= 0) {
        toast.error('Enter a valid package quantity');
        return;
      }
      const pricePerUnit = packagePrice / packageQuantity;

      let imageUrl = isEditing ? editingCondiment?.image_url : undefined;

      // Handle image upload/update if a new image was selected
      if (selectedImage) {
        if (isEditing && editingCondiment?.image_url) {
          // Update existing image
          const updateResult = await updateImageInStorage(
            selectedImage,
            editingCondiment.image_url,
            'condiments'
          );
          if (updateResult.success) {
            imageUrl = updateResult.url;
          } else {
            toast.error(updateResult.error || 'Failed to update image');
            return;
          }
        } else {
          // Upload new image
          const uploadResult = await uploadImageToStorage(selectedImage, 'condiments');
          if (uploadResult.success) {
            imageUrl = uploadResult.url;
          } else {
            toast.error(uploadResult.error || 'Failed to upload image');
            return;
          }
        }
      }

      const condimentData = {
        name: formData.name.trim(),
        unit_type: formData.unit_type,
        price_per_unit: pricePerUnit,
        package_price: packagePrice,
        package_quantity: packageQuantity,
        image_url: imageUrl,
        is_archived: false
      };

      if (isEditing) {
        const result = await updateCondiment(editingCondiment!.condiment_id, condimentData);
        if (result.success) {
          toast.success('Condiment updated successfully');
          onCondimentSaved();
          onClose();
        } else {
          toast.error(result.error || 'Failed to update condiment');
        }
      } else {
        const result = await createCondiment(condimentData);
        if (result.success) {
          toast.success('Condiment created successfully');
          onCondimentSaved();
          onClose();
        } else {
          toast.error(result.error || 'Failed to create condiment');
        }
      }
    } catch (error) {
      console.error('Error saving condiment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? 'Edit Condiment' : 'Create New Condiment'}
            </h2>
            <p className="text-sm text-gray-600">
              {isEditing ? 'Update condiment details' : 'Add a new condiment for meal enhancement'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-white/70">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Condiment Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Soy Sauce, Vinegar, Salt"
                required
                className="w-full"
              />
            </div>

            {/* Unit Type */}
            <div className="space-y-2">
              <Label htmlFor="unit_type" className="text-sm font-medium text-gray-700">
                Unit Type *
              </Label>
              <Select
                value={formData.unit_type}
                onValueChange={(value: CondimentUnitType) => setFormData(prev => ({ ...prev, unit_type: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">ml (milliliters)</SelectItem>
                  <SelectItem value="g">g (grams)</SelectItem>
                  <SelectItem value="tbsp">tbsp (tablespoons)</SelectItem>
                  <SelectItem value="tsp">tsp (teaspoons)</SelectItem>
                  {/* Removed piece & bottle for precision */}
                </SelectContent>
              </Select>
            </div>

            {/* Package Price & Quantity (derive per-unit price) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="package_price" className="text-sm font-medium text-gray-700">
                  Package Price (₱) *
                </Label>
                <Input
                  id="package_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.package_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, package_price: e.target.value }))}
                  placeholder="e.g., 40"
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="package_quantity" className="text-sm font-medium text-gray-700">
                  Package Quantity ({formData.unit_type}) *
                </Label>
                <Input
                  id="package_quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.package_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, package_quantity: e.target.value }))}
                  placeholder={`e.g., 100`}
                  required
                  className="w-full"
                />
              </div>
            </div>
            {(() => {
              const p = parseFloat(formData.package_price);
              const q = parseFloat(formData.package_quantity);
              if (!isNaN(p) && p > 0 && !isNaN(q) && q > 0) {
                const per = p / q;
                return (
                  <div className="text-xs text-gray-600 bg-gray-50 border rounded-md p-3">
                    Computed price per {formData.unit_type}: <span className="font-semibold text-gray-800">₱{per.toFixed(4)}</span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Condiment Image
              </Label>
              <FileUpload
                maxFiles={1}
                maxSize={5 * 1024 * 1024}
                className="w-full h-48"
                value={selectedImage ? [selectedImage] : []}
                onValueChange={(files) => setSelectedImage(files[0] ?? null)}
                onFileReject={(_file: File, message: string) => {
                  if (message.includes('size')) {
                    toast.error('File size must be less than 5MB');
                  } else if (message.includes('type')) {
                    toast.error('Only image files are allowed');
                  } else {
                    toast.error(message || 'Invalid file');
                  }
                }}
              >
                <FileUploadDropzone className="border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-lg p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-purple-500" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-700">Drop image here or click to browse</p>
                      <p className="text-gray-500">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                  <FileUploadTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="mt-3">
                      Choose File
                    </Button>
                  </FileUploadTrigger>
                </FileUploadDropzone>

                <FileUploadList className="mt-4">
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
          </form>
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex gap-3 bg-gray-50/50">
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
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Condiment' : 'Create Condiment'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
