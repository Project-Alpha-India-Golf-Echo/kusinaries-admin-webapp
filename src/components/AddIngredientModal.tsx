import { useState, useRef } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { createIngredient } from '../lib/supabaseQueries';
import { validateImageFileForStorage } from '../lib/storageUtils';
import type { IngredientCategory } from '../types';

interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngredientAdded: () => void;
  initialCategory?: IngredientCategory;
}

export const AddIngredientModal: React.FC<AddIngredientModalProps> = ({
  isOpen,
  onClose,
  onIngredientAdded,
  initialCategory
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: initialCategory || 'Go' as IngredientCategory,
    price_per_kilo: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const pricePerKilo = parseFloat(formData.price_per_kilo);
      if (isNaN(pricePerKilo) || pricePerKilo < 0) {
        setError('Please enter a valid price per kilo');
        return;
      }

      const result = await createIngredient(
        formData.name.trim(),
        formData.category,
        pricePerKilo,
        selectedImage || undefined
      );

      if (result.success) {
        setFormData({ name: '', category: 'Go', price_per_kilo: '' });
        setSelectedImage(null);
        setImagePreview(null);
        onIngredientAdded();
        onClose();
      } else {
        setError(result.error || 'Failed to create ingredient');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFileForStorage(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    if (error) setError('');
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 animate-in fade-in duration-200 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Add New Ingredient</h2>
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
          <div>
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

          <div>
            <Label htmlFor="category">Pinggang Pinoy Category *</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="Go">Go (Energy - Carbohydrates)</option>
              <option value="Grow">Grow (Build - Proteins)</option>
              <option value="Glow">Glow (Protect - Vitamins & Minerals)</option>
            </select>
          </div>

          <div>
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

          <div>
            <Label htmlFor="image">Ingredient Image (Optional)</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="mt-1 text-xs text-gray-500">
                Supported: JPEG, PNG, GIF, WebP (max 5MB)
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

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
                  Adding...
                </>
              ) : (
                'Add Ingredient'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
