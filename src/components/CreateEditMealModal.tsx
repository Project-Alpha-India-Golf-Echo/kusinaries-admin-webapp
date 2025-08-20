import {
  FileUpload, FileUploadDropzone, FileUploadItem, FileUploadItemDelete,
  FileUploadItemMetadata, FileUploadItemPreview, FileUploadList, FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from "sonner";
import { updateImageInStorage, uploadImageToStorage, validateImageFileForStorage } from '../lib/storageUtils';
import { createMeal, getAllDietaryTags, getAllIngredients, updateMeal } from '../lib/supabaseQueries';
import type { CreateMealData, DietaryTag, Ingredient, Meal, MealCategory } from '../types';
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

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
    if (!formData.category) errors.push('Category is required');
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
        dietary_tag_ids: selectedDietaryTags
      };

      const result = editingMeal
        ? await updateMeal(editingMeal.meal_id.toString(), mealData)
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
      setShowConfirm(false);
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
                {selectedIngredients.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calculator className="w-4 h-4 mr-1" />
                    Estimated Price: ₱{estimatedPrice.toFixed(2)}
                  </div>
                )}
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
                    <p className="font-medium">₱{estimatedPrice.toFixed(2)}</p>
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
    </div>
  );
};
