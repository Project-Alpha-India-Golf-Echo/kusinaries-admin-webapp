import React from 'react';
import { Edit, Archive, RotateCcw, Clock, Tag, Utensils } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onArchive: (mealId: number) => void;
  onRestore?: (mealId: number) => void;
  isArchived?: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Best for Breakfast':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Best for Lunch':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Best for Dinner':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Best for Snacks':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onEdit,
  onArchive,
  onRestore,
  isArchived = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getIngredientCounts = () => {
    if (!meal.meal_ingredients) return { go: 0, grow: 0, glow: 0 };
    
    return meal.meal_ingredients.reduce((counts, mealIngredient) => {
      // Handle both nested and flat ingredient data structures
      const ingredient = mealIngredient.ingredient || mealIngredient.ingredients;
      if (!ingredient) {
        console.warn('No ingredient data found for:', mealIngredient);
        return counts;
      }
      
      const category = ingredient.category;
      if (category === 'Go') counts.go++;
      else if (category === 'Grow') counts.grow++;
      else if (category === 'Glow') counts.glow++;
      return counts;
    }, { go: 0, grow: 0, glow: 0 });
  };

  const calculateEstimatedPrice = () => {
    if (!meal.meal_ingredients) return 0;
    
    return meal.meal_ingredients.reduce((total, mealIngredient) => {
      // Handle both nested and flat ingredient data structures
      const ingredient = mealIngredient.ingredient || mealIngredient.ingredients;
      if (!ingredient) {
        console.warn('No ingredient data found for price calculation:', mealIngredient);
        return total;
      }

      // Parse quantity (assuming it's in grams or as a decimal for kilos)
      const quantity = parseFloat(mealIngredient.quantity) || 0;
      const pricePerKilo = ingredient.price_per_kilo || 0;
      
      // Convert quantity to kilos if it seems to be in grams (> 10)
      const quantityInKilos = quantity > 10 ? quantity / 1000 : quantity;
      
      return total + (quantityInKilos * pricePerKilo);
    }, 0);
  };

  const ingredientCounts = getIngredientCounts();
  const estimatedPrice = meal.estimated_price || calculateEstimatedPrice();

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
      isArchived ? 'border-gray-200 opacity-75' : 'border-gray-200'
    }`}>
      {/* Image */}
      <div className="h-48 bg-gray-100 relative overflow-hidden">
        {meal.image_url ? (
          <img
            src={meal.image_url}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Utensils className="w-12 h-12" />
          </div>
        )}
        
        {/* Category Badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(meal.category)}`}>
          {meal.category}
        </div>

        {isArchived && (
          <div className="absolute top-3 right-3 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium border border-red-200">
            Archived
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
          {meal.name}
        </h3>

        {/* Pinggang Pinoy Summary */}
        <div className="flex items-center space-x-4 mb-3 text-sm">
          <div className="flex items-center text-yellow-600">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></div>
            Go: {ingredientCounts.go}
          </div>
          <div className="flex items-center text-red-600">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-1"></div>
            Grow: {ingredientCounts.grow}
          </div>
          <div className="flex items-center text-green-600">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
            Glow: {ingredientCounts.glow}
          </div>
        </div>

        {/* Price and Date */}
        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="text-lg font-medium mr-1">₱</span>
            {estimatedPrice.toFixed(2)}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatDate(meal.created_at)}
          </div>
        </div>

        {/* Dietary Tags */}
        {((meal as any).meal_dietary_tags || meal.dietary_tags) && ((meal as any).meal_dietary_tags || meal.dietary_tags).length > 0 && (
          <div className="mb-3">
            <div className="flex items-center mb-1">
              <Tag className="w-3 h-3 mr-1 text-gray-400" />
              <span className="text-xs text-gray-500">Tags:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {((meal as any).meal_dietary_tags || meal.dietary_tags).slice(0, 3).map((tagData: any, index: number) => {
                // Handle different possible structures from Supabase joins
                const tag = tagData.dietary_tags || tagData;
                const tagId = tag.tag_id || tag.id || index;
                const tagName = tag.tag_name || tag.name || 'Unknown';
                
                return (
                  <span
                    key={tagId}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tagName}
                  </span>
                );
              })}
              {((meal as any).meal_dietary_tags || meal.dietary_tags).length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{((meal as any).meal_dietary_tags || meal.dietary_tags).length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recipe Preview */}
        {meal.recipe && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {meal.recipe}
          </p>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(meal)}
            className="flex-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          
          {isArchived ? (
            onRestore && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore Meal</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to restore "{meal.name}"? The meal will be moved back to the active meals section.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onRestore(meal.meal_id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Restore Meal
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Meal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to archive "{meal.name}"? The meal will be moved to the archived section and can be restored later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onArchive(meal.meal_id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Archive Meal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};
