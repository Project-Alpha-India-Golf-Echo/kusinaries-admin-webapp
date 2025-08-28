import {
  FileUpload, FileUploadDropzone, FileUploadItem, FileUploadItemDelete,
  FileUploadItemMetadata, FileUploadItemPreview, FileUploadList, FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Loader2, Settings, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from "sonner";
import { useModal } from '../contexts/ModalContext';
import { updateImageInStorage, uploadImageToStorage, validateImageFileForStorage } from '../lib/storageUtils';
import { createMeal, getAllCondiments, getAllDietaryTags, getAllIngredients, updateMeal } from '../lib/supabaseQueries';
import type { Condiment, CreateMealData, DietaryTag, Ingredient, Meal, MealCategory } from '../types';
import { CondimentSection } from './CondimentSection';
import { IngredientSection } from './IngredientSection';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
    category: [] as MealCategory[], // Changed to array for multiple categories
    recipe: ''
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<{ ingredient_id: number; quantity: string }[]>([]);
  const [selectedCondiments, setSelectedCondiments] = useState<{ condiment_id: number; quantity: string }[]>([]);
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<number[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [allCondiments, setAllCondiments] = useState<Condiment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastPopulatedMealId, setLastPopulatedMealId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { openIngredientManagementModal, openCondimentManagementModal } = useModal();

  // Cache key for localStorage
  const CACHE_KEY = 'meal-form-cache';

  // Save form data to cache
  const saveToCache = () => {
    if (editingMeal) return; // Don't cache when editing existing meals
    
    const cacheData = {
      formData,
      selectedIngredients,
      selectedCondiments,
      selectedDietaryTags,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save form data to cache:', error);
    }
  };

  // Load form data from cache
  const loadFromCache = () => {
    if (editingMeal) return false; // Don't load cache when editing existing meals
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;
      
      const cacheData = JSON.parse(cached);
      const isRecent = Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000; // 24 hours
      
      if (!isRecent) {
        localStorage.removeItem(CACHE_KEY);
        return false;
      }
      
      // Only restore if there's meaningful data
      const hasData = cacheData.formData?.name?.trim() || 
                     cacheData.selectedIngredients?.length > 0 || 
                     cacheData.selectedCondiments?.length > 0 || 
                     cacheData.selectedDietaryTags?.length > 0;
      
      if (hasData) {
        setFormData(cacheData.formData || { name: '', category: [], recipe: '' });
        setSelectedIngredients(cacheData.selectedIngredients || []);
        setSelectedCondiments(cacheData.selectedCondiments || []);
        setSelectedDietaryTags(cacheData.selectedDietaryTags || []);
        return true;
      }
    } catch (error) {
      console.warn('Failed to load form data from cache:', error);
      localStorage.removeItem(CACHE_KEY);
    }
    
    return false;
  };

  // Clear cache
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  };

  // Clear all form data
  const clearAllData = () => {
    setFormData({ name: '', category: [], recipe: '' });
    setSelectedIngredients([]);
    setSelectedCondiments([]);
    setSelectedDietaryTags([]);
    setSelectedImage(null);
    setValidationErrors([]);
    clearCache();
    setShowClearConfirm(false);
  };

  // Check if form has any data
  const hasFormData = () => {
    return formData.name.trim() || 
           formData.recipe.trim() || 
           formData.category.length > 0 ||
           selectedIngredients.length > 0 || 
           selectedCondiments.length > 0 || 
           selectedDietaryTags.length > 0 ||
           selectedImage !== null;
  };

  // Load dietary tags and ingredients and populate form if editing
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dietaryTagsResponse, ingredientsResponse, condimentsResponse] = await Promise.all([
          getAllDietaryTags(),
          getAllIngredients(),
          getAllCondiments()
        ]);
        if (dietaryTagsResponse.success && dietaryTagsResponse.data) {
          setDietaryTags(dietaryTagsResponse.data);
        }
        if (ingredientsResponse.success && ingredientsResponse.data) {
          setAllIngredients(ingredientsResponse.data);
        }
        if (condimentsResponse.success && condimentsResponse.data) {
          setAllCondiments(condimentsResponse.data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Listen for ingredient updates from the management modal
  useEffect(() => {
    const handleIngredientUpdate = async () => {
      const ingredientsResult = await getAllIngredients();
      if (ingredientsResult.success && ingredientsResult.data) {
        setAllIngredients(ingredientsResult.data);
      }
    };

    window.addEventListener('ingredientSaved', handleIngredientUpdate);
    window.addEventListener('ingredientAdded', handleIngredientUpdate);
    
    return () => {
      window.removeEventListener('ingredientSaved', handleIngredientUpdate);
      window.removeEventListener('ingredientAdded', handleIngredientUpdate);
    };
  }, []);

  // Listen for condiment updates from the management modal
  useEffect(() => {
    const handleCondimentUpdate = () => {
      // Trigger refresh for condiment sections by dispatching an event
      window.dispatchEvent(new CustomEvent('condimentSaved'));
    };

    window.addEventListener('condimentSaved', handleCondimentUpdate);
    window.addEventListener('condimentAdded', handleCondimentUpdate);
    
    return () => {
      window.removeEventListener('condimentSaved', handleCondimentUpdate);
      window.removeEventListener('condimentAdded', handleCondimentUpdate);
    };
  }, []);

  // Calculate estimated price whenever ingredients or condiments change
  useEffect(() => {
    const calculatePrice = () => {
      let total = 0;
      
      // Helper function to calculate ingredient cost with proper unit conversion
      const calculateIngredientCost = (ingredient: Ingredient, quantityStr: string): number => {
        const quantity = quantityStr.toLowerCase().trim();
        let quantityInBaseUnit = 0;
        
        // Parse quantity and convert to ingredient's base unit
        if (ingredient.unit_type === 'kg') {
          // Ingredient priced per kg
          if (quantity.includes('kg')) {
            quantityInBaseUnit = parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0;
          } else if (quantity.includes('g')) {
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) / 1000;
          } else if (quantity.includes('cup')) {
            // Rough estimate: 1 cup ≈ 240g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.24;
          } else if (quantity.includes('piece')) {
            // Rough estimate: 1 piece ≈ 100g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.1;
          } else if (quantity.includes('tbsp') || quantity.includes('tablespoon')) {
            // 1 tablespoon ≈ 15g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.015;
          } else if (quantity.includes('tsp') || quantity.includes('teaspoon')) {
            // 1 teaspoon ≈ 5g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.005;
          } else {
            // If no unit specified, assume grams
            const numValue = parseFloat(quantity.replace(/[^0-9.]/g, ''));
            if (!isNaN(numValue)) {
              quantityInBaseUnit = numValue / 1000;
            }
          }
        } else {
          // Ingredient priced per gram
          if (quantity.includes('g')) {
            quantityInBaseUnit = parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0;
          } else if (quantity.includes('kg')) {
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 1000;
          } else if (quantity.includes('cup')) {
            // Rough estimate: 1 cup ≈ 240g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 240;
          } else if (quantity.includes('piece')) {
            // Rough estimate: 1 piece ≈ 100g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 100;
          } else if (quantity.includes('tbsp') || quantity.includes('tablespoon')) {
            // 1 tablespoon ≈ 15g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 15;
          } else if (quantity.includes('tsp') || quantity.includes('teaspoon')) {
            // 1 teaspoon ≈ 5g
            quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 5;
          } else {
            // If no unit specified, assume grams
            const numValue = parseFloat(quantity.replace(/[^0-9.]/g, ''));
            if (!isNaN(numValue)) {
              quantityInBaseUnit = numValue;
            }
          }
        }
        
        return quantityInBaseUnit * ingredient.price_per_unit;
      };
      
      // Calculate ingredient costs with new pricing structure
      selectedIngredients.forEach(item => {
        const ingredient = allIngredients.find((ing: Ingredient) => ing.ingredient_id === item.ingredient_id);
        if (!ingredient) return;
        
        // Use new price_per_unit system if available, fallback to price_per_kilo for backward compatibility
        if (ingredient.price_per_unit !== undefined && ingredient.unit_type !== undefined) {
          total += calculateIngredientCost(ingredient, item.quantity);
        } else {
          // Backward compatibility: use old calculation method
          const quantityStr = item.quantity.toLowerCase().trim();
          let quantityInKg = 0;

          if (quantityStr.includes('kg')) {
            quantityInKg = parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0;
          } else if (quantityStr.includes('g')) {
            quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) / 1000;
          } else if (quantityStr.includes('cup')) {
            quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.24;
          } else if (quantityStr.includes('piece')) {
            quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.1;
          } else if (quantityStr.includes('tbsp') || quantityStr.includes('tablespoon')) {
            quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.015;
          } else if (quantityStr.includes('tsp') || quantityStr.includes('teaspoon')) {
            quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.005;
          } else {
            const numValue = parseFloat(quantityStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(numValue)) {
              quantityInKg = numValue / 1000;
            }
          }

          total += quantityInKg * ingredient.price_per_kilo;
        }
      });

      // Calculate condiment costs (convert to condiment.unit_type)
      const convertCondimentQuantity = (raw: string, baseUnit: string): number => {
        const q = raw.toLowerCase().trim();
        const value = parseFloat(q.replace(/[^0-9.]/g, '')) || 0;
        if (value === 0) return 0;
        const has = (u: string) => q.includes(u);
        // Volume conversions
        if (baseUnit === 'ml') {
          if (has('ml')) return value;
          if (has('tbsp')) return value * 15; // 1 tbsp = 15 ml
          if (has('tsp')) return value * 5;  // 1 tsp = 5 ml
          return 0;
        }
        if (baseUnit === 'g') {
          if (has('g')) return value;
          if (has('tbsp')) return value * 15; // assume 1 tbsp ~15g (rough)
          if (has('tsp')) return value * 5;  // assume 1 tsp ~5g
          return 0;
        }
        if (baseUnit === 'tbsp') {
          if (has('tbsp')) return value;
          if (has('tsp')) return value / 3; // 1 tbsp = 3 tsp
          if (has('ml')) return value / 15; // inverse of 15ml per tbsp
          return 0;
        }
        if (baseUnit === 'tsp') {
          if (has('tsp')) return value;
            if (has('tbsp')) return value * 3;
          if (has('ml')) return value / 5; // 5ml per tsp
          return 0;
        }
  // piece & bottle removed from allowed units
        return 0;
      };
      selectedCondiments.forEach(item => {
        if (!item.quantity.trim()) return;
        const condiment = allCondiments.find((cond: Condiment) => cond.condiment_id === item.condiment_id);
        if (!condiment) return;
        const converted = convertCondimentQuantity(item.quantity, condiment.unit_type);
        total += converted * condiment.price_per_unit;
      });
      
      setEstimatedPrice(total);
    };

    calculatePrice();
    
    // Save to cache whenever form data changes (but not when editing existing meal)
    if (!editingMeal && isOpen) {
      const timeoutId = setTimeout(saveToCache, 500); // Debounce cache saves
      return () => clearTimeout(timeoutId);
    }
  }, [selectedIngredients, selectedCondiments, allIngredients, allCondiments, formData, selectedDietaryTags, editingMeal, isOpen]);

  // Handle modal open/close and basic form reset
  useEffect(() => {
    if (!editingMeal && isOpen) {
      // Try to load cached data first, then reset if no cache
      const loadedFromCache = loadFromCache();
      if (!loadedFromCache) {
        console.log('Resetting form for new meal');
        setFormData({
          name: '',
          category: [],
          recipe: ''
        });
        setSelectedIngredients([]);
        setSelectedCondiments([]);
        setSelectedDietaryTags([]);
        setSelectedImage(null);
      }
      setValidationErrors([]);
      setShowConfirm(false);
      setLastPopulatedMealId(null);
    } else if (editingMeal && isOpen) {
      // Clear validation errors when opening for edit
      setValidationErrors([]);
      setShowConfirm(false);
    }
  }, [editingMeal, isOpen]);

  // Sync form data when external data loads and we have an editing meal that needs to be populated
  useEffect(() => {
    if (editingMeal && isOpen && lastPopulatedMealId !== editingMeal.meal_id) {
      // Check if all required data is loaded
      const dataLoaded = dietaryTags.length > 0 && allIngredients.length > 0 && allCondiments.length > 0;
      
      if (dataLoaded) {
        console.log('All data loaded, populating form with editing meal:', editingMeal);
        
        // Populate form data
        setFormData({
          name: editingMeal.name || '',
          category: editingMeal.category || [],
          recipe: editingMeal.recipe || ''
        });

        // Populate ingredients
        if (editingMeal.meal_ingredients && editingMeal.meal_ingredients.length > 0) {
          const ingredients = editingMeal.meal_ingredients.map(mi => ({
            ingredient_id: mi.ingredient_id,
            quantity: mi.quantity
          }));
          setSelectedIngredients(ingredients);
        } else {
          setSelectedIngredients([]);
        }

        // Populate condiments
        if (editingMeal.meal_condiments && editingMeal.meal_condiments.length > 0) {
          const condiments = editingMeal.meal_condiments.map(mc => ({
            condiment_id: mc.condiment_id,
            quantity: mc.quantity
          }));
          setSelectedCondiments(condiments);
        } else {
          setSelectedCondiments([]);
        }

        // Populate dietary tags
        if (editingMeal.dietary_tags && editingMeal.dietary_tags.length > 0) {
          const tagIds = editingMeal.dietary_tags.map(dt => dt.tag_id);
          setSelectedDietaryTags(tagIds);
        } else {
          setSelectedDietaryTags([]);
        }

        setSelectedImage(null);
        setValidationErrors([]);
        setShowConfirm(false);
        setLastPopulatedMealId(editingMeal.meal_id);
      }
    }
  }, [dietaryTags.length, allIngredients.length, allCondiments.length, editingMeal?.meal_id, isOpen, lastPopulatedMealId]);

  // Derived ingredient categories present
  const ingredientCategoryCoverage = useMemo(() => {
    const categories = new Set<string>();
    // track glow subcategories
    let hasGlowVegetable = false;
    let hasGlowFruit = false;
    selectedIngredients.forEach(sel => {
      const ing = allIngredients.find(i => i.ingredient_id === sel.ingredient_id);
      if (ing) {
        categories.add(ing.category);
        if (ing.category === 'Glow') {
          if (ing.glow_subcategory === 'Vegetables') hasGlowVegetable = true;
          if (ing.glow_subcategory === 'Fruits') hasGlowFruit = true;
        }
      }
    });
    return { categories, hasGlowVegetable, hasGlowFruit };
  }, [selectedIngredients, allIngredients]);

  const allCategoriesPresent = ['Go', 'Grow', 'Glow'].every(cat => ingredientCategoryCoverage.categories.has(cat));
  const glowSubcategoriesPresent = ingredientCategoryCoverage.hasGlowVegetable && ingredientCategoryCoverage.hasGlowFruit;

  // Counts per category (and glow subcategories) for quick UI indicators
  const categoryCounts = useMemo(() => {
    let go = 0, grow = 0, glow = 0, glowVegetables = 0, glowFruits = 0;
    selectedIngredients.forEach(sel => {
      if (!sel.quantity.trim()) return; // only count when quantity provided
      const ing = allIngredients.find(i => i.ingredient_id === sel.ingredient_id);
      if (!ing) return;
      if (ing.category === 'Go') go++;
      if (ing.category === 'Grow') grow++;
      if (ing.category === 'Glow') {
        glow++;
        if (ing.glow_subcategory === 'Vegetables') glowVegetables++;
        if (ing.glow_subcategory === 'Fruits') glowFruits++;
      }
    });
    return { go, grow, glow, glowVegetables, glowFruits };
  }, [selectedIngredients, allIngredients]);

  // Validate quantities format: number with optional decimal + optional unit
  const quantityPattern = /^(?=\S)(?=.*\d)(?:\d+\.?\d*|\d*\.\d+)?\s*(g|kg|cup|cups|piece|pieces|tbsp|tsp)?$/i;

  const computeValidationErrors = () => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Meal name is required');
    if (!formData.category || formData.category.length === 0) errors.push('At least one category is required');
    if (selectedIngredients.length === 0) errors.push('At least one ingredient is required');
  if (!allCategoriesPresent) errors.push('Include at least one Go, one Grow, and one Glow ingredient');
  if (allCategoriesPresent && !glowSubcategoriesPresent) errors.push('For Glow, include at least one Vegetable and one Fruit');
    const missingQty = selectedIngredients.filter(i => !i.quantity.trim());
    if (missingQty.length) errors.push('Provide quantity for every selected ingredient');
    const badFormat = selectedIngredients.filter(i => i.quantity && !quantityPattern.test(i.quantity.trim()));
    if (badFormat.length) errors.push('Use valid quantity format (e.g., 250g, 0.5kg, 1 cup, 2 pieces, 1 tbsp)');
    return errors;
  };

  const canSubmit = useMemo(() => computeValidationErrors().length === 0, [formData, selectedIngredients, allCategoriesPresent, glowSubcategoriesPresent]);

  // First stage: validation then open confirmation dialog
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = computeValidationErrors();
    setValidationErrors(errors);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setShowConfirm(true);
  };

  // Second stage: confirmed create/update
  const handleConfirmSubmit = async () => {
    setIsLoading(true);
    try {
      let imageUrl = undefined;
      if (selectedImage) {
        if (editingMeal && editingMeal.image_url) {
          const uploadResult = await updateImageInStorage(selectedImage, editingMeal.image_url, 'meals');
          if (!uploadResult.success) {
            toast.error(uploadResult.error || 'Failed to upload image');
            return;
          }
          imageUrl = uploadResult.url;
        } else {
          const uploadResult = await uploadImageToStorage(selectedImage, 'meals');
          if (!uploadResult.success) {
            toast.error(uploadResult.error || 'Failed to upload image');
            return;
          }
          imageUrl = uploadResult.url;
        }
      } else if (editingMeal && editingMeal.image_url) {
        imageUrl = editingMeal.image_url;
      }

      const mealData: CreateMealData = {
        name: formData.name.trim(),
        category: formData.category,
        recipe: formData.recipe.trim() || undefined,
        image_url: imageUrl,
        ingredients: selectedIngredients.filter(item => item.quantity.trim()),
        condiments: selectedCondiments.filter(item => item.quantity.trim()),
        dietary_tag_ids: selectedDietaryTags
      };

      const result = editingMeal
        ? await updateMeal(editingMeal.meal_id.toString(), mealData)
        : await createMeal(mealData);

      if (result.success) {
        toast.success(`Meal ${editingMeal ? 'updated' : 'created'} successfully!`);
        clearCache(); // Clear cache on successful save
        onMealSaved();
        onClose();
      } else {
        toast.error(result.error || `Failed to ${editingMeal ? 'update' : 'create'} meal`);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  const handleInputChange = (field: string, value: string | MealCategory[]) => {
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

  const handleCondimentSelect = (condiment: Condiment) => {
    if (!selectedCondiments.some(item => item.condiment_id === condiment.condiment_id)) {
      setSelectedCondiments(prev => [...prev, { condiment_id: condiment.condiment_id, quantity: '' }]);
    }
  };

  const handleCondimentQuantityChange = (condimentId: number, quantity: string) => {
    setSelectedCondiments(prev =>
      prev.map(item =>
        item.condiment_id === condimentId ? { ...item, quantity } : item
      )
    );
  };

  const handleCondimentRemove = (condimentId: number) => {
    setSelectedCondiments(prev => prev.filter(item => item.condiment_id !== condimentId));
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
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingMeal ? 'Edit Meal' : 'Create New Meal'}
            </h2>
            {/* Enhanced Pricing Indicator */}
            <div className="flex items-center gap-3">
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                <Calculator className="w-5 h-5 text-green-600" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                    Total Cost
                  </span>
                  <span className="text-xl font-bold text-green-700">
                    ₱{estimatedPrice.toFixed(2)}
                  </span>
                </div>
                {(selectedIngredients.length > 0 || selectedCondiments.length > 0) && (
                  <div className="text-xs text-gray-500 border-l border-gray-300 pl-3 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span>Ingredients: {selectedIngredients.filter(i => i.quantity.trim()).length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span>Condiments: {selectedCondiments.filter(c => c.quantity.trim()).length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editingMeal && hasFormData() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guidelines / Disclaimer */}
            <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 text-sm leading-relaxed space-y-2">
              <p className="font-semibold text-amber-900">Meal Curation Guidelines</p>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>Portions must reflect a single serving (roughly one standard plate).</li>
                <li>Include ALL three Pinggang Pinoy groups: at least one <strong>Go</strong> (energy), one <strong>Grow</strong> (protein), and one <strong>Glow</strong> (fruits/vegetables).</li>
                <li>Quantities should approximate realistic consumption and keep total cost reasonable.</li>
                <li>Recipe / instructions (optional) should be concise and safe (no unsafe cooking steps).</li>
              </ul>
              {validationErrors.length > 0 && (
                <div className="mt-2 text-red-700">
                  <p className="font-medium">Please fix before submitting:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationErrors.slice(0, 4).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {validationErrors.length > 4 && <li>+ {validationErrors.length - 4} more…</li>}
                  </ul>
                </div>
              )}
            </div>
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
                  <Label htmlFor="category">Categories *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Best for Breakfast', 'Best for Lunch', 'Best for Dinner', 'Best for Snacks'] as MealCategory[]).map((category) => (
                      <label key={category} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.category.includes(category)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const currentCategories = formData.category;
                            const newCategories = checked
                              ? [...currentCategories, category]
                              : currentCategories.filter(c => c !== category);
                            handleInputChange('category', newCategories);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
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
                    className="h-32 overflow-y-auto resize-none"
                  />

                </div>
              </div>

              {/* RECIPE MODULE */}
              <div className="space-y-2">
                <Label htmlFor="picture">Meal Picture </Label>
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
              <Label>Dietary Tags</Label>
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
              <div className="border border-red-300 bg-red-50 rounded-lg p-4 text-sm leading-relaxed space-y-2 mb-2">
                <p className="font-semibold text-red-900">Ingredient Guidelines</p>
                <ul className="list-disc pl-5 space-y-1 text-red-800">
                  <li><strong>Price Disclaimer:</strong> Ingredient prices shown are rough estimates based on sample data and may not reflect current market prices. They are intended for capstone simulation only.</li>
                  <li>If creating a new ingredient, assign the correct category (Go / Grow / Glow) before using it.</li>
                  <li>Provide clear quantities with units (e.g., 150g, 1 cup, 2 pieces, 1 tbsp). Avoid vague terms like &quot;some&quot; or &quot;few&quot;.</li>
                </ul>
              </div>
              <div className="flex items-center justify-between mb-4">

                <h3 className="text-lg font-semibold text-gray-900">Pinggang Pinoy Ingredients</h3>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openIngredientManagementModal}
                    className="text-sm"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage Ingredients
                  </Button>
                </div>
              </div>

              {/* Category Coverage & Counts Indicator */}
              <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className={`rounded-lg border p-3 flex flex-col gap-1 ${categoryCounts.go ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                  <span className="text-xs font-medium text-gray-500">Go Foods</span>
                  <span className="text-lg font-semibold text-gray-800">{categoryCounts.go}</span>
                  <span className="text-[11px] text-gray-500">Energy (rice, bread, etc.)</span>
                </div>
                <div className={`rounded-lg border p-3 flex flex-col gap-1 ${categoryCounts.grow ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <span className="text-xs font-medium text-gray-500">Grow Foods</span>
                  <span className="text-lg font-semibold text-gray-800">{categoryCounts.grow}</span>
                  <span className="text-[11px] text-gray-500">Protein sources</span>
                </div>
                <div className={`rounded-lg border p-3 flex flex-col gap-2 ${categoryCounts.glow ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Glow Foods</span>
                    <span className="text-lg font-semibold text-gray-800">{categoryCounts.glow}</span>
                  </div>
                  <div className="flex gap-4 text-[11px]">
                    <div className={`flex items-center gap-1 ${categoryCounts.glowVegetables ? 'text-green-700' : 'text-gray-400'}`}>
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Veg {categoryCounts.glowVegetables}
                    </div>
                    <div className={`flex items-center gap-1 ${categoryCounts.glowFruits ? 'text-green-700' : 'text-gray-400'}`}>
                      <span className="inline-block h-2 w-2 rounded-full bg-orange-400" /> Fruit {categoryCounts.glowFruits}
                    </div>
                  </div>
                  <span className={`text-[11px] ${allCategoriesPresent ? (glowSubcategoriesPresent ? 'text-green-600' : 'text-amber-600') : 'text-gray-500'}`}>
                    {allCategoriesPresent ? (glowSubcategoriesPresent ? 'Balanced coverage achieved' : 'Add a missing Fruit or Vegetable') : 'Need Go / Grow / Glow'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <IngredientSection
                  category="Go"
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  onQuantityChange={handleQuantityChange}
                />
                <IngredientSection
                  category="Grow"
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  onQuantityChange={handleQuantityChange}
                />
                <IngredientSection
                  category="Glow"
                  selectedIngredients={selectedIngredients}
                  onIngredientSelect={handleIngredientSelect}
                  onQuantityChange={handleQuantityChange}
                />
              </div>

              {/* Condiments Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Optional Condiments</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openCondimentManagementModal}
                    className="text-sm"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Manage Condiments
                  </Button>
                </div>
                <CondimentSection
                  selectedCondiments={selectedCondiments}
                  onCondimentSelect={handleCondimentSelect}
                  onQuantityChange={handleCondimentQuantityChange}
                />
              </div>

              {/* Selected Ingredients Overview */}
              {selectedIngredients.some(si => si.quantity.trim()) && (() => {
                const groups = (['Go','Grow','Glow'] as const).map(cat => {
                  const items = selectedIngredients
                    .map(sel => {
                      const ing = allIngredients.find(i => i.ingredient_id === sel.ingredient_id && i.category === cat);
                      return ing ? { ing, quantity: sel.quantity } : null;
                    })
                    .filter(Boolean)
                    .filter(item => item!.quantity.trim()) as { ing: Ingredient; quantity: string }[];
                  return { cat, items };
                });
                const totalConfirmed = groups.reduce((sum,g) => sum + g.items.length,0);
                const chipColors: Record<string,string> = {
                  Go: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  Grow: 'bg-red-100 text-red-800 border-red-200',
                  Glow: 'bg-green-100 text-green-800 border-green-200'
                };
                return (
                  <div className="mt-6 border rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b bg-white/70 backdrop-blur rounded-t-xl">
                      <h4 className="font-semibold text-gray-800 text-sm tracking-wide flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white text-[11px] font-bold">{totalConfirmed}</span>
                        Confirmed Ingredients
                      </h4>
                      <div className="flex gap-2 text-[11px]">
                        {groups.map(g => (
                          <span key={g.cat} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium ${chipColors[g.cat]}`}> {g.cat} <span className="text-[10px] font-semibold">{g.items.length}</span></span>
                        ))}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-5 p-5">
                      {groups.map(g => (
                        <div key={g.cat} className="relative flex flex-col rounded-lg border bg-white/60 backdrop-blur-sm p-3 shadow-inner">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm tracking-wide text-gray-700 flex items-center gap-2">
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${g.cat==='Go'?'bg-yellow-400':g.cat==='Grow'?'bg-red-400':'bg-green-400'}`} />
                              {g.cat}
                              <span className="text-xs font-normal text-gray-400">{g.items.length}</span>
                            </p>
                          </div>
                          {g.items.length === 0 ? (
                            <p className="text-xs italic text-gray-400">None selected</p>
                          ) : (
                            <ul className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scroll">
                              {g.items.map(item => (
                                <li key={item.ing.ingredient_id} className="group flex items-center gap-2 rounded-md border border-transparent hover:border-gray-200 bg-white/70 px-2 py-1 text-xs transition-colors">
                                  <span className="flex-1 truncate font-medium text-gray-700" title={item.ing.name}>{item.ing.name}</span>
                                  <span className="text-gray-500 font-mono text-[11px] px-1 rounded bg-gray-100">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleIngredientRemove(item.ing.ingredient_id)}
                                    className="opacity-60 hover:opacity-100 text-red-500 hover:text-red-600 transition-colors"
                                    aria-label={`Remove ${item.ing.name}`}
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Selected Condiments Overview */}
              {selectedCondiments.some(sc => sc.quantity.trim()) && (
                <div className="mt-6 border rounded-xl bg-gradient-to-br from-purple-50 to-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b bg-white/70 backdrop-blur rounded-t-xl">
                    <h4 className="font-semibold text-gray-800 text-sm tracking-wide flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[11px] font-bold">
                        {selectedCondiments.filter(sc => sc.quantity.trim()).length}
                      </span>
                      Selected Condiments
                    </h4>
                    <span className="text-xs text-gray-500">Optional seasonings</span>
                  </div>
                  <div className="p-5">
                    <div className="rounded-lg border bg-white/60 backdrop-blur-sm p-3 shadow-inner">
                      <ul className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scroll">
                        {selectedCondiments.filter(sc => sc.quantity.trim()).map(condimentItem => {
                          const condimentDetails = allCondiments.find(c => c.condiment_id === condimentItem.condiment_id);
                          const condimentName = condimentDetails?.name || `Condiment ${condimentItem.condiment_id}`;
                          return (
                            <li key={condimentItem.condiment_id} className="group flex items-center gap-2 rounded-md border border-transparent hover:border-gray-200 bg-white/70 px-2 py-1 text-xs transition-colors">
                              <span className="flex-1 truncate font-medium text-gray-700" title={condimentName}>{condimentName}</span>
                              <span className="text-gray-500 font-mono text-[11px] px-1 rounded bg-gray-100">
                                {condimentItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCondimentRemove(condimentItem.condiment_id)}
                                className="opacity-60 hover:opacity-100 text-red-500 hover:text-red-600 transition-colors"
                                aria-label={`Remove ${condimentName}`}
                              >
                                ×
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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
            onClick={(e) => handleSubmit(e as any)}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !canSubmit}
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
      {showConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Confirm {editingMeal ? 'Update' : 'New Meal'}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)} className="hover:bg-gray-100"><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Meal Name</p>
                    <p className="font-semibold text-gray-800">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Category</p>
                    <p className="font-medium">{formData.category}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Dietary Tags</p>
                    {selectedDietaryTags.length === 0 ? (
                      <p className="text-gray-400 italic">None</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {dietaryTags.filter(dt => selectedDietaryTags.includes(dt.tag_id)).map(tag => (
                          <span key={tag.tag_id} className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">{tag.tag_name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Estimated Price</p>
                    <div className="space-y-1">
                      <p className="font-medium text-lg">₱{estimatedPrice.toFixed(2)}</p>
                      {/* Price Breakdown */}
                      {(selectedIngredients.length > 0 || selectedCondiments.length > 0) && (() => {
                        let ingredientCost = 0;
                        let condimentCost = 0;
                        
                        // Calculate ingredient costs with new pricing structure
                        selectedIngredients.forEach(item => {
                          const ingredient = allIngredients.find((ing: Ingredient) => ing.ingredient_id === item.ingredient_id);
                          if (!ingredient) return;
                          
                          // Use new price_per_unit system if available, fallback to price_per_kilo for backward compatibility
                          if (ingredient.price_per_unit !== undefined && ingredient.unit_type !== undefined) {
                            const calculateIngredientCost = (ingredient: Ingredient, quantityStr: string): number => {
                              const quantity = quantityStr.toLowerCase().trim();
                              let quantityInBaseUnit = 0;
                              
                              if (ingredient.unit_type === 'kg') {
                                // Ingredient priced per kg
                                if (quantity.includes('kg')) {
                                  quantityInBaseUnit = parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0;
                                } else if (quantity.includes('g')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) / 1000;
                                } else if (quantity.includes('cup')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.24;
                                } else if (quantity.includes('piece')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.1;
                                } else if (quantity.includes('tbsp') || quantity.includes('tablespoon')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.015;
                                } else if (quantity.includes('tsp') || quantity.includes('teaspoon')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 0.005;
                                } else {
                                  const numValue = parseFloat(quantity.replace(/[^0-9.]/g, ''));
                                  if (!isNaN(numValue)) {
                                    quantityInBaseUnit = numValue / 1000;
                                  }
                                }
                              } else {
                                // Ingredient priced per gram
                                if (quantity.includes('g')) {
                                  quantityInBaseUnit = parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0;
                                } else if (quantity.includes('kg')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 1000;
                                } else if (quantity.includes('cup')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 240;
                                } else if (quantity.includes('piece')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 100;
                                } else if (quantity.includes('tbsp') || quantity.includes('tablespoon')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 15;
                                } else if (quantity.includes('tsp') || quantity.includes('teaspoon')) {
                                  quantityInBaseUnit = (parseFloat(quantity.replace(/[^0-9.]/g, '')) || 0) * 5;
                                } else {
                                  const numValue = parseFloat(quantity.replace(/[^0-9.]/g, ''));
                                  if (!isNaN(numValue)) {
                                    quantityInBaseUnit = numValue;
                                  }
                                }
                              }
                              
                              return quantityInBaseUnit * ingredient.price_per_unit;
                            };
                            
                            ingredientCost += calculateIngredientCost(ingredient, item.quantity);
                          } else {
                            // Backward compatibility: use old calculation method
                            const quantityStr = item.quantity.toLowerCase().trim();
                            let quantityInKg = 0;

                            if (quantityStr.includes('kg')) {
                              quantityInKg = parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0;
                            } else if (quantityStr.includes('g')) {
                              quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) / 1000;
                            } else if (quantityStr.includes('cup')) {
                              quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.24;
                            } else if (quantityStr.includes('piece')) {
                              quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.1;
                            } else if (quantityStr.includes('tbsp') || quantityStr.includes('tablespoon')) {
                              quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.015;
                            } else if (quantityStr.includes('tsp') || quantityStr.includes('teaspoon')) {
                              quantityInKg = (parseFloat(quantityStr.replace(/[^0-9.]/g, '')) || 0) * 0.005;
                            } else {
                              const numValue = parseFloat(quantityStr.replace(/[^0-9.]/g, ''));
                              if (!isNaN(numValue)) {
                                quantityInKg = numValue / 1000;
                              }
                            }

                            ingredientCost += quantityInKg * ingredient.price_per_kilo;
                          }
                        });

                        // Calculate condiment costs with conversion
                        const convertCondimentQuantity = (raw: string, baseUnit: string): number => {
                          const q = raw.toLowerCase().trim();
                          const value = parseFloat(q.replace(/[^0-9.]/g, '')) || 0;
                          if (value === 0) return 0;
                          const has = (u: string) => q.includes(u);
                          switch (baseUnit) {
                            case 'ml':
                              if (has('ml')) return value;
                              if (has('tbsp')) return value * 15;
                              if (has('tsp')) return value * 5;
                              return 0;
                            case 'g':
                              if (has('g')) return value;
                              if (has('tbsp')) return value * 15;
                              if (has('tsp')) return value * 5;
                              return 0;
                            case 'tbsp':
                              if (has('tbsp')) return value;
                              if (has('tsp')) return value / 3;
                              if (has('ml')) return value / 15;
                              return 0;
                            case 'tsp':
                              if (has('tsp')) return value;
                              if (has('tbsp')) return value * 3;
                              if (has('ml')) return value / 5;
                              return 0;
                            // piece & bottle removed
                            default:
                              return 0;
                          }
                        };
                        selectedCondiments.forEach(item => {
                          if (!item.quantity.trim()) return;
                          const condiment = allCondiments.find((cond: Condiment) => cond.condiment_id === item.condiment_id);
                          if (!condiment) return;
                          condimentCost += convertCondimentQuantity(item.quantity, condiment.unit_type) * condiment.price_per_unit;
                        });

                        return (
                          <div className="flex gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                              <span>Ingredients: ₱{ingredientCost.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                              <span>Condiments: ₱{condimentCost.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {formData.recipe && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Recipe / Instructions</p>
                      <div className="rounded-md border bg-gray-50 p-3 max-h-40 overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed">
                        {formData.recipe}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Image Preview</p>
                  <div className="rounded-lg border bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                    {(selectedImage || editingMeal?.image_url) ? (
                      <img
                        src={selectedImage ? URL.createObjectURL(selectedImage) : editingMeal?.image_url}
                        alt={formData.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No image provided</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Ingredient Summary</p>
                    <div className="space-y-2">
                      {(['Go','Grow','Glow'] as const).map(cat => {
                        const group = selectedIngredients
                          .map(sel => {
                            const ing = allIngredients.find(i => i.ingredient_id === sel.ingredient_id && i.category === cat);
                            return ing ? { ing, quantity: sel.quantity } : null;
                          })
                          .filter(Boolean)
                          .filter(item => item!.quantity.trim()) as { ing: Ingredient; quantity: string }[];
                        if (group.length === 0) return null;
                        return (
                          <div key={cat} className="rounded-md border bg-white/60 backdrop-blur px-3 py-2">
                            <p className="text-xs font-semibold tracking-wide mb-1 flex items-center gap-1">{cat} <span className="text-[10px] text-gray-400 font-medium">{group.length}</span></p>
                            <ul className="divide-y text-[12px]">
                              {group.map(item => (
                                <li key={item.ing.ingredient_id} className="py-1 flex justify-between gap-3">
                                  <span className="truncate" title={item.ing.name}>{item.ing.name}</span>
                                  <span className="text-gray-500 font-mono">{item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Condiments Summary */}
                  {selectedCondiments.some(sc => sc.quantity.trim()) && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Condiments</p>
                      <div className="rounded-md border bg-purple-50/60 backdrop-blur px-3 py-2">
                        <p className="text-xs font-semibold tracking-wide mb-1 flex items-center gap-1 text-purple-700">
                          Optional Seasonings 
                          <span className="text-[10px] text-gray-400 font-medium">
                            {selectedCondiments.filter(sc => sc.quantity.trim()).length}
                          </span>
                        </p>
                        <ul className="divide-y text-[12px]">
                          {selectedCondiments.filter(sc => sc.quantity.trim()).map(condimentItem => {
                            // Find condiment details from the loaded condiments data
                            const condimentDetails = allCondiments.find(c => c.condiment_id === condimentItem.condiment_id);
                            const condimentName = condimentDetails?.name || `Condiment ${condimentItem.condiment_id}`;
                            
                            // Calculate individual condiment cost
                            let itemCost = 0;
                              if (condimentDetails && condimentItem.quantity.trim()) {
                                const conv = (raw: string, baseUnit: string): number => {
                                  const q = raw.toLowerCase().trim();
                                  const value = parseFloat(q.replace(/[^0-9.]/g, '')) || 0;
                                  if (value === 0) return 0;
                                  const has = (u: string) => q.includes(u);
                                  switch (baseUnit) {
                                    case 'ml':
                                      if (has('ml')) return value;
                                      if (has('tbsp')) return value * 15;
                                      if (has('tsp')) return value * 5;
                                      return 0;
                                    case 'g':
                                      if (has('g')) return value;
                                      if (has('tbsp')) return value * 15;
                                      if (has('tsp')) return value * 5;
                                      return 0;
                                    case 'tbsp':
                                      if (has('tbsp')) return value;
                                      if (has('tsp')) return value / 3;
                                      if (has('ml')) return value / 15;
                                      return 0;
                                    case 'tsp':
                                      if (has('tsp')) return value;
                                      if (has('tbsp')) return value * 3;
                                      if (has('ml')) return value / 5;
                                      return 0;
                                    // piece & bottle removed
                                    default:
                                      return 0;
                                  }
                                };
                                itemCost = conv(condimentItem.quantity, condimentDetails.unit_type) * condimentDetails.price_per_unit;
                              }
                            
                            return (
                              <li key={condimentItem.condiment_id} className="py-1 flex justify-between gap-3">
                                <span className="truncate">{condimentName}</span>
                                <div className="flex items-center gap-2 text-right">
                                  <span className="text-gray-500 font-mono">
                                    {condimentItem.quantity}
                                  </span>
                                  <span className="text-purple-600 font-medium text-xs">
                                    ₱{itemCost.toFixed(2)}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Coverage Status */}
              <div className="rounded-lg border bg-gray-50 p-4 flex flex-wrap gap-4 text-xs">
                <span className={`px-2 py-1 rounded-full font-medium ${categoryCounts.go ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-500'}`}>Go {categoryCounts.go}</span>
                <span className={`px-2 py-1 rounded-full font-medium ${categoryCounts.grow ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-500'}`}>Grow {categoryCounts.grow}</span>
                <span className={`px-2 py-1 rounded-full font-medium ${categoryCounts.glow ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>Glow {categoryCounts.glow} (Veg {categoryCounts.glowVegetables} / Fruit {categoryCounts.glowFruits})</span>
                <span className={`px-2 py-1 rounded-full font-medium ${allCategoriesPresent ? (glowSubcategoriesPresent ? 'bg-green-600 text-white' : 'bg-amber-500 text-white') : 'bg-gray-400 text-white'}`}>
                  {allCategoriesPresent ? (glowSubcategoriesPresent ? 'Balanced' : 'Add Fruit or Veg') : 'Incomplete'}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-white flex gap-3">
              <Button
                variant="outline"
                type="button"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
              >
                Go Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingMeal ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  editingMeal ? 'Confirm Update' : 'Confirm Create'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Clear All Data</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to clear all form data? This will remove all ingredients, condiments, 
                meal details, and any cached data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={clearAllData}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
