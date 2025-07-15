import { useState, useEffect, useCallback } from 'react';
import { Upload, X, Loader2, Calculator } from 'lucide-react';
import {
  FileUpload, FileUploadDropzone, FileUploadItem, FileUploadItemDelete,
  FileUploadItemMetadata, FileUploadItemPreview, FileUploadList, FileUploadTrigger,
} from "@/components/ui/file-upload";
import { toast } from "sonner";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { IngredientSection } from './IngredientSection';
import { createMeal, updateMeal, getAllDietaryTags, getAllIngredients } from '../lib/supabaseQueries';
import { uploadImageToStorage, updateImageInStorage, validateImageFileForStorage } from '../lib/storageUtils';
import type { Meal, MealCategory, Ingredient, DietaryTag, CreateMealData } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
interface CreateEditMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: () => void;
  editingMeal?: Meal | null;
}

export const CreateEditMealModal: React.FC<CreateEditMealModalProps> = ({
  isOpen,
  onClose,
  onMealSaved,
  editingMeal
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Best for Breakfast' as MealCategory,
    recipe: ''
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<{ ingredient_id: number; quantity: string }[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<number[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  // Load dietary tags and ingredients and populate form if editing
  useEffect(() => {
    const loadData = async () => {
      const [tagsResult, ingredientsResult] = await Promise.all([
        getAllDietaryTags(),
        getAllIngredients()
      ]);

      if (tagsResult.success && tagsResult.data) {
        setDietaryTags(tagsResult.data);
      }

      if (ingredientsResult.success && ingredientsResult.data) {
        setAllIngredients(ingredientsResult.data);
      }
    };

    if (isOpen) {
      loadData();

      if (editingMeal) {
        console.log('Setting form data for editing meal:', editingMeal.category);
        setFormData({
          name: editingMeal.name,
          category: editingMeal.category,
          recipe: editingMeal.recipe || ''
        });

        if (editingMeal.meal_ingredients) {
          setSelectedIngredients(
            editingMeal.meal_ingredients.map(mi => ({
              ingredient_id: mi.ingredient_id,
              quantity: mi.quantity
            }))
          );
        }

        if (editingMeal.dietary_tags) {
          setSelectedDietaryTags(editingMeal.dietary_tags.map(tag => tag.tag_id));
        }
      } else {
        // Reset form for new meal
        setFormData({ name: '', category: 'Best for Breakfast', recipe: '' });
        setSelectedIngredients([]);
        setSelectedDietaryTags([]);
        setSelectedImage(null);
      }
    }
  }, [isOpen, editingMeal]);

  // Calculate estimated price whenever ingredients change
  useEffect(() => {
    const calculatePrice = () => {
      let total = 0;
      selectedIngredients.forEach(item => {
        const ingredient = allIngredients.find((ing: Ingredient) => ing.ingredient_id === item.ingredient_id);
        if (!ingredient) return;

        const quantityStr = item.quantity.toLowerCase().trim();
        let quantityInKg = 0;

        if (quantityStr.includes('kg')) {
          quantityInKg = parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0;
        } else if (quantityStr.includes('g')) {
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) / 1000;
        } else if (quantityStr.includes('cup')) {
          // Rough estimate: 1 cup ≈ 240g for most ingredients
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.24;
        } else if (quantityStr.includes('piece')) {
          // Rough estimate: 1 piece ≈ 100g
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.1;
        } else if (quantityStr.includes('tbsp') || quantityStr.includes('tablespoon')) {
          // 1 tablespoon ≈ 15g
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.015;
        } else if (quantityStr.includes('tsp') || quantityStr.includes('teaspoon')) {
          // 1 teaspoon ≈ 5g
          quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.005;
        } else {
          // If no unit specified, assume grams
          const numValue = parseFloat(quantityStr.replace(/[^0-9.]/g, ''));
          if (!isNaN(numValue)) {
            quantityInKg = numValue / 1000;
          }
        }

        total += quantityInKg * ingredient.price_per_kilo;
      });
      setEstimatedPrice(total);
    };

    calculatePrice();
  }, [selectedIngredients, allIngredients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Meal name is required');
        return;
      }

      if (selectedIngredients.length === 0) {
        toast.error('Please add at least one ingredient');
        return;
      }

      // Validate that all selected ingredients have quantities
      const invalidIngredients = selectedIngredients.filter(item => !item.quantity.trim());
      if (invalidIngredients.length > 0) {
        toast.error('Please specify quantities for all selected ingredients');
        return;
      }

      // Process image if selected
      let imageUrl = undefined;

      if (selectedImage) {
        // Upload new image to storage
        if (editingMeal && editingMeal.image_url) {
          // Update existing image (upload new, delete old)
          const uploadResult = await updateImageInStorage(selectedImage, editingMeal.image_url, 'meals');

          if (!uploadResult.success) {
            toast.error(uploadResult.error || 'Failed to upload image');
            return;
          }

          imageUrl = uploadResult.url;
        } else {
          // Upload new image
          const uploadResult = await uploadImageToStorage(selectedImage, 'meals');

          if (!uploadResult.success) {
            toast.error(uploadResult.error || 'Failed to upload image');
            return;
          }

          imageUrl = uploadResult.url;
        }
      } else if (editingMeal && editingMeal.image_url) {
        // Keep existing image if editing and no new image selected
        imageUrl = editingMeal.image_url;
      }

      const mealData: CreateMealData = {
        name: formData.name.trim(),
        category: formData.category,
        recipe: formData.recipe.trim() || undefined,
        image_url: imageUrl,
        ingredients: selectedIngredients.filter(item => item.quantity.trim()),
        dietary_tag_ids: selectedDietaryTags
      };

      const result = editingMeal
        ? await updateMeal(editingMeal.meal_id, mealData)
        : await createMeal(mealData);

      if (result.success) {
        toast.success(`Meal ${editingMeal ? 'updated' : 'created'} successfully!`);
        onMealSaved();
        onClose();
      } else {
        toast.error(result.error || `Failed to ${editingMeal ? 'update' : 'create'} meal`);
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

  const handleIngredientSelect = (ingredient: Ingredient) => {
    if (!selectedIngredients.some(item => item.ingredient_id === ingredient.ingredient_id)) {
      setSelectedIngredients(prev => [...prev, { ingredient_id: ingredient.ingredient_id, quantity: '' }]);
    }
  };

  const handleIngredientRemove = (ingredientId: number) => {
    setSelectedIngredients(prev => prev.filter(item => item.ingredient_id !== ingredientId));
  };

  const handleQuantityChange = (ingredientId: number, quantity: string) => {
    setSelectedIngredients(prev =>
      prev.map(item =>
        item.ingredient_id === ingredientId ? { ...item, quantity } : item
      )
    );
  };

  const handleDietaryTagToggle = (tagId: number) => {
    setSelectedDietaryTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
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
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingMeal ? 'Edit Meal' : 'Create New Meal'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Meal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Meal Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Chicken Tinola with Malunggay"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    key={`${editingMeal?.meal_id || 'new'}-${formData.category}`}
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value as MealCategory)}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Best for Breakfast">Best for Breakfast</SelectItem>
                      <SelectItem value="Best for Lunch">Best for Lunch</SelectItem>
                      <SelectItem value="Best for Dinner">Best for Dinner</SelectItem>
                      <SelectItem value="Best for Snacks">Best for Snacks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* IMAGE UPLOAD MODULE */}
                <div className="space-y-2">
                  <Label htmlFor="recipe">Recipe/Instructions</Label>
                  <Textarea
                    id="recipe"
                    value={formData.recipe}
                    onChange={(e) => handleInputChange('recipe', e.target.value)}
                    placeholder="Enter cooking instructions..."
                    rows={4}
                    className="max-h-32 overflow-y-auto resize-none"
                  />

                </div>
              </div>

              {/* RECIPE MODULE */}
              <div className="space-y-2">
                <Label htmlFor="picture">Meal Picture (Optional)</Label>
                <FileUpload
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024}
                  className="w-full h-full min-h-[300px]"
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

            {/* Dietary Tags */}
            <div>
              <Label>Dietary Tags (Optional)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {dietaryTags.map((tag) => (
                  <button
                    key={tag.tag_id}
                    type="button"
                    onClick={() => handleDietaryTagToggle(tag.tag_id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedDietaryTags.includes(tag.tag_id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {tag.tag_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Pinggang Pinoy Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pinggang Pinoy Ingredients</h3>
                {selectedIngredients.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calculator className="w-4 h-4 mr-1" />
                    Estimated Price: ₱{estimatedPrice.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <IngredientSection
                  category="Go"
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  onIngredientRemove={handleIngredientRemove}
                  onQuantityChange={handleQuantityChange}
                />
                <IngredientSection
                  category="Grow"
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  onIngredientRemove={handleIngredientRemove}
                  onQuantityChange={handleQuantityChange}
                />
                <IngredientSection
                  category="Glow"
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  onIngredientRemove={handleIngredientRemove}
                  onQuantityChange={handleQuantityChange}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex space-x-3">
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
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editingMeal ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingMeal ? 'Update Meal' : 'Create Meal'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
