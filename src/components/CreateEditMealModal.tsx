import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Calculator, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { IngredientSection } from './IngredientSection';
import { createMeal, updateMeal, getAllDietaryTags, getAllIngredients } from '../lib/supabaseQueries';
import { validateImageFile, resizeImage, createImageObjectURL } from '../lib/imageUtils';
import type { Meal, MealCategory, Ingredient, DietaryTag, CreateMealData } from '../types';

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<{ ingredient_id: number; quantity: string }[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<number[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setFormData({
          name: editingMeal.name,
          category: editingMeal.category,
          recipe: editingMeal.recipe || ''
        });

        // Set image preview if editing meal has image
        if (editingMeal.picture_data && editingMeal.picture_mime_type) {
          const imageUrl = createImageObjectURL(editingMeal.picture_data, editingMeal.picture_mime_type);
          setImagePreview(imageUrl);
        }

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
        setImagePreview(null);
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
    setError('');

    try {
      if (!formData.name.trim()) {
        setError('Meal name is required');
        return;
      }

      if (selectedIngredients.length === 0) {
        setError('Please add at least one ingredient');
        return;
      }

      // Validate that all selected ingredients have quantities
      const invalidIngredients = selectedIngredients.filter(item => !item.quantity.trim());
      if (invalidIngredients.length > 0) {
        setError('Please specify quantities for all selected ingredients');
        return;
      }

      // Process image if selected
      let pictureData = undefined;
      let pictureMimeType = undefined;
      
      if (selectedImage) {
        const resizedImage = await resizeImage(selectedImage);
        const arrayBuffer = await resizedImage.arrayBuffer();
        pictureData = new Uint8Array(arrayBuffer);
        pictureMimeType = resizedImage.type;
      } else if (editingMeal && editingMeal.picture_data && !selectedImage) {
        // Keep existing image if editing and no new image selected
        pictureData = editingMeal.picture_data;
        pictureMimeType = editingMeal.picture_mime_type;
      }

      const mealData: CreateMealData = {
        name: formData.name.trim(),
        category: formData.category,
        recipe: formData.recipe.trim() || undefined,
        picture_data: pictureData,
        picture_mime_type: pictureMimeType,
        ingredients: selectedIngredients.filter(item => item.quantity.trim()),
        dietary_tag_ids: selectedDietaryTags
      };

      const result = editingMeal
        ? await updateMeal(editingMeal.meal_id, mealData)
        : await createMeal(mealData);

      if (result.success) {
        onMealSaved();
        onClose();
      } else {
        setError(result.error || `Failed to ${editingMeal ? 'update' : 'create'} meal`);
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

    const validation = validateImageFile(file);
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
                <div>
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

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value as MealCategory)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="Best for Breakfast">Best for Breakfast</option>
                    <option value="Best for Lunch">Best for Lunch</option>
                    <option value="Best for Dinner">Best for Dinner</option>
                    <option value="Best for Snacks">Best for Snacks</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="picture">Meal Picture (Optional)</Label>
                  <div className="mt-1">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Meal preview"
                          className="w-48 h-32 object-cover rounded-lg border border-gray-300"
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
                        className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
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
              </div>

              <div>
                <Label htmlFor="recipe">Recipe/Instructions</Label>
                <textarea
                  id="recipe"
                  value={formData.recipe}
                  onChange={(e) => handleInputChange('recipe', e.target.value)}
                  placeholder="Enter cooking instructions..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
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
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedDietaryTags.includes(tag.tag_id)
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
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
