
import { useState, useEffect } from 'react';
import { Plus, Loader2, Utensils, Archive } from 'lucide-react';
import { Button } from '../components/ui/button';
import { MealCard } from '../components/MealCard';
import { MealFiltersComponent } from '../components/MealFiltersComponent';
import { useModal } from '../contexts/ModalContext';
import { 
  getMealsWithFilters, 
  getArchivedMeals, 
  getAllDietaryTags, 
  archiveMeal, 
  restoreMeal 
} from '../lib/supabaseQueries';
import type { Meal, MealFilters, DietaryTag } from '../types';

export const MealCurationPage = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [filters, setFilters] = useState<MealFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');

  // Get modal functions from context
  const { openCreateMealModal, openEditMealModal } = useModal();

  // Load initial data
  useEffect(() => {
    loadDietaryTags();
  }, []);

  // Load meals when filters or showArchived changes
  useEffect(() => {
    loadMeals();
  }, [filters, showArchived]);

  // Listen for meal saved events
  useEffect(() => {
    const handleMealSaved = () => {
      loadMeals();
    };

    window.addEventListener('mealSaved', handleMealSaved);
    return () => window.removeEventListener('mealSaved', handleMealSaved);
  }, []);

  const loadDietaryTags = async () => {
    const result = await getAllDietaryTags();
    if (result.success && result.data) {
      setDietaryTags(result.data);
    }
  };

  const loadMeals = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = showArchived 
        ? await getArchivedMeals()
        : await getMealsWithFilters(filters);

      if (result.success && result.data) {
        setMeals(result.data);
      } else {
        setError(result.error || 'Failed to load meals');
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
      loadMeals();
    } else {
      setError(result.error || 'Failed to archive meal');
    }
  };

  const handleRestoreMeal = async (mealId: number) => {
    const result = await restoreMeal(mealId);
    if (result.success) {
      loadMeals();
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
        ) : meals.length === 0 ? (
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
            {meals.map((meal) => (
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
        {meals.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-800">{meals.length}</div>
                <div className="text-sm text-green-600">
                  {showArchived ? 'Archived Meals' : 'Total Meals'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {meals.filter(m => m.category === 'Best for Breakfast').length}
                </div>
                <div className="text-sm text-green-600">Breakfast Meals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {meals.filter(m => m.category === 'Best for Lunch').length}
                </div>
                <div className="text-sm text-green-600">Lunch Meals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {meals.filter(m => m.category === 'Best for Dinner').length}
                </div>
                <div className="text-sm text-green-600">Dinner Meals</div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
