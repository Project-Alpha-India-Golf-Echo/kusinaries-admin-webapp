
import { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2, Utensils, Archive } from 'lucide-react';
import { Button } from '../components/ui/button';
import { MealCard } from '../components/MealCard';
import { MealFiltersComponent } from '../components/MealFiltersComponent';
import { useModal } from '../contexts/ModalContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { 
  getAllMeals, 
  getArchivedMeals, 
  getAllDietaryTags, 
  archiveMeal, 
  restoreMeal 
} from '../lib/supabaseQueries';
import type { Meal, MealFilters, DietaryTag } from '../types';

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Helper function to calculate meal price from ingredients
const calculateMealPrice = (meal: Meal): number => {
  if (!meal.meal_ingredients) return 0;
  
  return meal.meal_ingredients.reduce((total, mealIngredient) => {
    // Handle both nested and flat ingredient data structures
    const ingredient = mealIngredient.ingredient || (mealIngredient as any).ingredients;
    if (!ingredient) return total;

    // Parse quantity (assuming it's in grams or as a decimal for kilos)
    const quantity = parseFloat(mealIngredient.quantity) || 0;
    const pricePerKilo = ingredient.price_per_kilo || 0;
    
    // Convert quantity to kilos if it seems to be in grams (> 10)
    const quantityInKilos = quantity > 10 ? quantity / 1000 : quantity;
    
    return total + (quantityInKilos * pricePerKilo);
  }, 0);
};

export const MealCurationPage = () => {
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [allArchivedMeals, setAllArchivedMeals] = useState<Meal[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [filters, setFilters] = useState<MealFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');

  useDocumentTitle('Meal Curation');

  // Debounce the search term to avoid excessive filtering
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Get modal functions from context
  const { openCreateMealModal, openEditMealModal } = useModal();

  // Filter meals locally for better performance
  const filteredMeals = useMemo(() => {
    const sourceData = showArchived ? allArchivedMeals : allMeals;
    let filtered = [...sourceData];

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(meal =>
        meal.name.toLowerCase().includes(searchLower) ||
        (meal.recipe && meal.recipe.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(meal => meal.category === filters.category);
    }

    // Apply dietary tags filter
    if (filters.dietary_tags && filters.dietary_tags.length > 0) {
      filtered = filtered.filter(meal => {
        // Check both possible property names due to Supabase join structure
        const dietaryTags = (meal as any).meal_dietary_tags || meal.dietary_tags || [];
        if (!dietaryTags || dietaryTags.length === 0) return false;
        
        // Extract tag IDs from the dietary tags structure
        const mealTagIds = dietaryTags.map((tagData: any) => {
          // Handle different possible structures from Supabase joins
          if (typeof tagData === 'number') return tagData;
          if (tagData && typeof tagData === 'object') {
            // Direct tag_id from meal_dietary_tags
            if (tagData.tag_id) return tagData.tag_id;
            // Nested dietary_tags object
            if (tagData.dietary_tags && tagData.dietary_tags.tag_id) {
              return tagData.dietary_tags.tag_id;
            }
          }
          return null;
        }).filter((id: any) => id !== null);
        
        return filters.dietary_tags!.some(tagId => mealTagIds.includes(tagId));
      });
    }

    // Apply sorting
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'estimated_price':
          // Calculate price for sorting if not available
          aValue = a.estimated_price || calculateMealPrice(a);
          bValue = b.estimated_price || calculateMealPrice(b);
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allMeals, allArchivedMeals, debouncedSearch, filters, showArchived]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Listen for meal saved events
  useEffect(() => {
    const handleMealSaved = () => {
      loadInitialData();
    };

    window.addEventListener('mealSaved', handleMealSaved);
    return () => window.removeEventListener('mealSaved', handleMealSaved);
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Load all data in parallel
      const [mealsResult, archivedResult, tagsResult] = await Promise.all([
        getAllMeals(),
        getArchivedMeals(),
        getAllDietaryTags()
      ]);

      if (mealsResult.success && mealsResult.data) {
        setAllMeals(mealsResult.data);
      } else {
        setError(mealsResult.error || 'Failed to load meals');
      }

      if (archivedResult.success && archivedResult.data) {
        setAllArchivedMeals(archivedResult.data);
      }

      if (tagsResult.success && tagsResult.data) {
        setDietaryTags(tagsResult.data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMeal = (meal: Meal) => {
    openEditMealModal(meal);
  };

  const handleArchiveMeal = async (mealId: number) => {
    const result = await archiveMeal(mealId);
    if (result.success) {
      loadInitialData();
    } else {
      setError(result.error || 'Failed to archive meal');
    }
  };

  const handleRestoreMeal = async (mealId: number) => {
    const result = await restoreMeal(mealId);
    if (result.success) {
      loadInitialData();
    } else {
      setError(result.error || 'Failed to restore meal');
    }
  };

  const handleToggleArchived = () => {
    setShowArchived(!showArchived);
    setFilters({}); // Reset filters when switching views
  };

  return (
    <div className="min-h-screen animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900">
                Meal Curation {showArchived && '- Archived Meals'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {showArchived 
                  ? 'Manage archived meals using the Pinggang Pinoy framework'
                  : 'Create and manage balanced meals using the Pinggang Pinoy framework'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {!showArchived && (
                <Button
                  onClick={openCreateMealModal}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Meal</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <MealFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          dietaryTags={dietaryTags}
          showArchived={showArchived}
          onToggleArchived={handleToggleArchived}
        />

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-gray-400 mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading meals...</h3>
              <p className="text-gray-600">Please wait while we fetch your meal library.</p>
            </div>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto text-gray-400 mb-6">
                {showArchived ? (
                  <Archive className="w-full h-full" />
                ) : (
                  <Utensils className="w-full h-full" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {showArchived ? 'No Archived Meals' : 'No Meals Found'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {showArchived 
                  ? 'You haven\'t archived any meals yet. Archived meals will appear here.'
                  : Object.keys(filters).length > 0 
                    ? 'No meals match your current filters. Try adjusting your search criteria.'
                    : 'Start building your meal library by creating your first balanced meal using the Pinggang Pinoy framework.'
                }
              </p>
              {!showArchived && Object.keys(filters).length === 0 && (
                <Button
                  onClick={openCreateMealModal}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Meal
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMeals.map((meal: Meal) => (
              <MealCard
                key={meal.meal_id}
                meal={meal}
                onEdit={handleEditMeal}
                onArchive={handleArchiveMeal}
                onRestore={showArchived ? handleRestoreMeal : undefined}
                isArchived={showArchived}
              />
            ))}
          </div>
        )}

        {/* Meal Stats Footer */}
        {filteredMeals.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-800">{filteredMeals.length}</div>
                <div className="text-sm text-green-600">
                  {showArchived ? 'Archived Meals' : 'Total Meals'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {filteredMeals.filter((m: Meal) => m.category === 'Best for Breakfast').length}
                </div>
                <div className="text-sm text-green-600">Breakfast Meals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {filteredMeals.filter((m: Meal) => m.category === 'Best for Lunch').length}
                </div>
                <div className="text-sm text-green-600">Lunch Meals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {filteredMeals.filter((m: Meal) => m.category === 'Best for Dinner').length}
                </div>
                <div className="text-sm text-green-600">Dinner Meals</div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
